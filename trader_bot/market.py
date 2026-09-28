"""Données de marché : générateur de marchés simulés et chargement de fichiers CSV."""

from __future__ import annotations

import csv
import math
import random
from dataclasses import dataclass


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


def generate_market(n_bars: int = 1000, seed: int = 0, start_price: float = 100.0) -> list[Bar]:
    """Génère un marché synthétique à changements de régime.

    Chaque graine (seed) produit un marché différent mais reproductible : le robot
    peut ainsi s'entraîner sur des milliers de marchés distincts, puis être évalué
    sur des marchés qu'il n'a jamais vus.
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


def load_csv(path: str) -> list[Bar]:
    """Charge des données OHLC depuis un CSV (format Yahoo Finance, Binance export, etc.).

    Colonnes attendues (insensible à la casse) : open, high, low, close et
    optionnellement volume. Les lignes incomplètes sont ignorées.
    """
    bars: list[Bar] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"{path} : fichier CSV vide")
        cols = {name.strip().lower(): name for name in reader.fieldnames}
        missing = [c for c in ("open", "high", "low", "close") if c not in cols]
        if missing:
            raise ValueError(f"{path} : colonnes manquantes {missing}")
        for row in reader:
            try:
                values = [float(row[cols[c]]) for c in ("open", "high", "low", "close")]
            except (TypeError, ValueError):
                continue
            volume = float(row[cols["volume"]] or 0) if "volume" in cols else 0.0
            bars.append(Bar(len(bars), *values, volume))
    if len(bars) < 100:
        raise ValueError(f"{path} : trop peu de données ({len(bars)} lignes, minimum 100)")
    return bars
