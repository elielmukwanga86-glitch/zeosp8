"""Stratégie paramétrable dont les paramètres (le « génome ») sont appris par le robot.

La stratégie combine cinq signaux :
  - tendance court terme : moyenne mobile rapide vs lente
  - tendance de fond     : prix vs moyenne mobile longue (autre échelle de temps)
  - retour à la moyenne  : RSI (survente / surachat)
  - momentum             : rendement récent
  - volume               : volume anormal dans le sens du mouvement du jour
et deux mécanismes de gestion du risque :
  - filtre de volatilité : pas de nouvelle position quand le marché s'emballe
  - taille selon la volatilité : position réduite quand le marché est agité

Le robot apprend les périodes, les poids de chaque signal (qui peuvent être
négatifs), les seuils d'entrée/sortie, le stop-loss, le take-profit et la taille
de position. Un score positif pousse à acheter, un score négatif à vendre à
découvert (si c'est autorisé).
"""

from __future__ import annotations

import math
import random
from dataclasses import asdict, dataclass, fields
from functools import lru_cache

from . import indicators

# nom -> (min, max, entier ?)
GENE_SPACE: dict[str, tuple[float, float, bool]] = {
    "fast": (3, 30, True),
    "slow": (20, 150, True),
    "long_period": (100, 300, True),
    "rsi_period": (5, 30, True),
    "rsi_low": (10.0, 45.0, False),
    "rsi_high": (55.0, 90.0, False),
    "mom_lookback": (5, 60, True),
    "vol_window": (10, 60, True),
    "w_trend": (-1.0, 1.0, False),
    "w_long": (-1.0, 1.0, False),
    "w_revert": (-1.0, 1.0, False),
    "w_mom": (-1.0, 1.0, False),
    "w_volume": (-1.0, 1.0, False),
    "entry": (0.05, 0.8, False),
    "exit": (-0.8, 0.3, False),
    "vol_filter": (1.0, 4.0, False),
    "vol_target": (0.005, 0.04, False),
    "stop_loss": (0.01, 0.15, False),
    "take_profit": (0.02, 0.40, False),
    "position_size": (0.1, 1.0, False),
}


@dataclass
class Genome:
    fast: int = 10
    slow: int = 50
    long_period: int = 200
    rsi_period: int = 14
    rsi_low: float = 30.0
    rsi_high: float = 70.0
    mom_lookback: int = 20
    vol_window: int = 20
    w_trend: float = 1.0
    w_long: float = 0.5
    w_revert: float = 0.0
    w_mom: float = 0.5
    w_volume: float = 0.0
    entry: float = 0.3
    exit: float = -0.1
    vol_filter: float = 2.5
    vol_target: float = 0.015
    stop_loss: float = 0.05
    take_profit: float = 0.15
    position_size: float = 0.5

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Genome":
        # Les gènes absents (ancien fichier mémoire) prennent leur valeur par défaut.
        known = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in data.items() if k in known}).repaired()

    def repaired(self) -> "Genome":
        """Ramène chaque gène dans son intervalle et impose la cohérence entre gènes."""
        values = {}
        for name, (lo, hi, is_int) in GENE_SPACE.items():
            v = min(max(getattr(self, name), lo), hi)
            values[name] = int(round(v)) if is_int else float(v)
        if values["slow"] <= values["fast"] + 2:
            values["slow"] = min(values["fast"] + 3 + values["slow"] // 4, int(GENE_SPACE["slow"][1]))
        if values["exit"] >= values["entry"]:
            values["exit"] = values["entry"] - 0.1
        return Genome(**values)

    # --- opérateurs génétiques -------------------------------------------------

    @classmethod
    def random(cls, rng: random.Random) -> "Genome":
        values = {}
        for name, (lo, hi, is_int) in GENE_SPACE.items():
            values[name] = rng.randint(int(lo), int(hi)) if is_int else rng.uniform(lo, hi)
        return cls(**values).repaired()

    def mutate(self, rng: random.Random, rate: float = 0.2, scale: float = 0.15) -> "Genome":
        values = self.to_dict()
        for name, (lo, hi, _) in GENE_SPACE.items():
            if rng.random() < rate:
                values[name] += rng.gauss(0.0, (hi - lo) * scale)
        return Genome(**values).repaired()

    def crossover(self, other: "Genome", rng: random.Random) -> "Genome":
        a, b = self.to_dict(), other.to_dict()
        return Genome(**{k: a[k] if rng.random() < 0.5 else b[k] for k in a}).repaired()


@dataclass
class Signals:
    score: list[float | None]  # conviction entre -1 (vendre) et +1 (acheter)
    size: list[float]  # multiplicateur de taille de position entre 0 et 1


# Les indicateurs ne dépendent que des prix et de la période : on les garde en
# cache, car des centaines de génomes les réutilisent pendant l'entraînement.
@lru_cache(maxsize=8192)
def _indicator(name: str, values: tuple[float, ...], n: int) -> tuple:
    return tuple(getattr(indicators, name)(list(values), n))


def _clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def signals(closes: tuple[float, ...], volumes: tuple[float, ...], g: Genome) -> Signals:
    """Calcule score et taille pour chaque période.

    Les valeurs de la période i n'utilisent que les données jusqu'à i inclus.
    """
    closes, volumes = tuple(closes), tuple(volumes)
    fast = _indicator("sma", closes, g.fast)
    slow = _indicator("sma", closes, g.slow)
    long_ = _indicator("sma", closes, g.long_period)
    r = _indicator("rsi", closes, g.rsi_period)
    mom = _indicator("momentum", closes, g.mom_lookback)
    vol = _indicator("volatility", closes, g.vol_window)
    vol_ref = _indicator("volatility", closes, 250)
    has_volume = any(volumes)
    avg_volume = _indicator("sma", volumes, 20) if has_volume else None

    mid = (g.rsi_low + g.rsi_high) / 2.0
    half = max((g.rsi_high - g.rsi_low) / 2.0, 1e-9)
    weight_sum = abs(g.w_trend) + abs(g.w_long) + abs(g.w_revert) + abs(g.w_mom) + abs(g.w_volume) + 1e-9

    n = len(closes)
    score: list[float | None] = [None] * n
    size = [0.0] * n
    for i in range(n):
        if slow[i] is None or r[i] is None or mom[i] is None or vol[i] is None:
            continue
        trend = math.tanh((fast[i] / slow[i] - 1.0) * 50.0)
        # Tant que la moyenne longue n'existe pas encore, ce signal est neutre.
        long_trend = math.tanh((closes[i] / long_[i] - 1.0) * 10.0) if long_[i] else 0.0
        revert = _clamp((mid - r[i]) / half)
        mo = math.tanh(mom[i] * 10.0)
        volume_signal = 0.0
        if has_volume and avg_volume[i] and volumes[i] > 0 and i > 0:
            direction = 1.0 if closes[i] >= closes[i - 1] else -1.0
            volume_signal = direction * math.tanh(math.log(volumes[i] / avg_volume[i]))
        s = (
            g.w_trend * trend
            + g.w_long * long_trend
            + g.w_revert * revert
            + g.w_mom * mo
            + g.w_volume * volume_signal
        ) / weight_sum

        # Filtre : marché anormalement agité par rapport à sa volatilité habituelle.
        if vol_ref[i] and vol[i] > g.vol_filter * vol_ref[i]:
            s = 0.0
        score[i] = s
        size[i] = min(1.0, g.vol_target / vol[i]) if vol[i] > 0 else 1.0
    return Signals(score, size)


def scores(closes: list[float], g: Genome) -> list[float | None]:
    """Raccourci : scores seuls, sans volume."""
    return signals(tuple(closes), (0.0,) * len(closes), g).score
