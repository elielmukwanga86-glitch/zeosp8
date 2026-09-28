"""Données de marché : générateur de marchés simulés et chargement de fichiers CSV."""

from __future__ import annotations

import csv
import math
import random
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Bar:
    """Une bougie (période) de marché."""

    t: int
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


# Régimes de marché : (dérive par période, volatilité par période).
REGIMES = {
    "haussier": (0.0008, 0.010),
    "baissier": (-0.0008, 0.013),
    "lateral": (0.0, 0.008),
    "volatil": (0.0, 0.025),
}

# Probabilité de rester dans le même régime à chaque période.
REGIME_PERSISTENCE = 0.99


def generate_market(
    n_bars: int = 1000, seed: int = 0, start_price: float = 100.0, regimes_out: list[str] | None = None
) -> list[Bar]:
    """Génère un marché synthétique à changements de régime.

    Chaque graine (seed) produit un marché différent mais reproductible : le robot
    peut ainsi s'entraîner sur des milliers de marchés distincts, puis être évalué
    sur des marchés qu'il n'a jamais vus.

    `regimes_out` (facultatif) reçoit le régime de chaque période, pour analyse.
    """
    rng = random.Random(seed)
    names = list(REGIMES)
    regime = rng.choice(names)
    price = start_price
    bars: list[Bar] = []
    for t in range(n_bars):
        if rng.random() > REGIME_PERSISTENCE:
            regime = rng.choice(names)
        drift, vol = REGIMES[regime]
        if regimes_out is not None:
            regimes_out.append(regime)
        # Queues épaisses : de temps en temps un choc plus violent.
        shock = rng.gauss(0.0, 1.0)
        if rng.random() < 0.02:
            shock *= 3.0
        ret = drift + vol * shock
        open_ = price * (1.0 + rng.gauss(0.0, vol * 0.2))
        close = price * math.exp(ret)
        spread = abs(rng.gauss(0.0, vol * 0.6))
        high = max(open_, close) * (1.0 + spread)
        low = min(open_, close) * (1.0 - spread)
        bars.append(Bar(t, open_, high, low, close, rng.uniform(1_000, 10_000)))
        price = close
    return bars


DATE_FORMATS = ("%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S")


def _parse_date(text: str) -> datetime | None:
    text = text.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text[: len(datetime.now().strftime(fmt))], fmt)
        except ValueError:
            continue
    return None


def _number(text: str | None) -> float:
    return float((text or "").replace(",", "").strip())


def load_csv(path: str) -> list[Bar]:
    """Charge des prix journaliers depuis un CSV (Yahoo Finance, Binance, datasets GitHub...).

    Colonnes reconnues (insensible à la casse, préfixe du type « AAPL.Open »
    accepté) : open, high, low, close, volume, date. Si seule la clôture est
    disponible (colonne close, price ou value), l'ouverture est la clôture
    précédente et le plus haut / plus bas sont déduits des deux.
    Si une colonne date existe, les lignes sans date valide sont ignorées et les
    données sont remises dans l'ordre chronologique. Les lignes incomplètes ou à
    prix négatif ou nul (ex. pétrole WTI en avril 2020) sont ignorées.
    """
    rows: list[tuple[datetime | None, list[float], float]] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"{path} : fichier CSV vide")
        cols = {name.strip().lower().rsplit(".", 1)[-1]: name for name in reader.fieldnames}
        for alias in ("price", "value", "adj close"):
            if "close" not in cols and alias in cols:
                cols["close"] = cols[alias]
        if "close" not in cols:
            raise ValueError(f"{path} : colonne de prix de clôture introuvable")
        ohlc = all(c in cols for c in ("open", "high", "low"))
        date_col = cols.get("date") or cols.get("timestamp")
        for row in reader:
            try:
                if ohlc:
                    values = [_number(row[cols[c]]) for c in ("open", "high", "low", "close")]
                else:
                    values = [_number(row[cols["close"]])]
            except (TypeError, ValueError):
                continue
            if min(values) <= 0:
                continue
            try:
                volume = _number(row[cols["volume"]]) if "volume" in cols else 0.0
            except (TypeError, ValueError):
                volume = 0.0
            date = None
            if date_col:
                date = _parse_date(row[date_col] or "")
                if date is None:
                    continue
            rows.append((date, values, volume))
    if date_col:
        rows.sort(key=lambda r: r[0])
    bars = []
    for i, (_, values, volume) in enumerate(rows):
        if not ohlc:
            close = values[0]
            open_ = rows[i - 1][1][0] if i else close
            values = [open_, max(open_, close), min(open_, close), close]
        bars.append(Bar(i, *values, volume))
    if len(bars) < 100:
        raise ValueError(f"{path} : trop peu de données ({len(bars)} lignes, minimum 100)")
    return bars


def split_real(bars: list[Bar], reserve: float = 0.2) -> tuple[list[Bar], list[Bar]]:
    """Sépare un historique réel en (apprentissage, réserve).

    La réserve (les données les plus récentes) n'est jamais utilisée pour
    l'entraînement : elle sert uniquement au paper trading.
    """
    cut = int(len(bars) * (1.0 - reserve))
    return bars[:cut], bars[cut:]
