"""Stratégie paramétrable dont les paramètres (le « génome ») sont appris par le robot.

La stratégie combine trois signaux classiques :
  - tendance       : moyenne mobile rapide vs lente
  - retour moyenne : RSI (survente / surachat)
  - momentum       : rendement récent
Le robot apprend les périodes, les poids de chaque signal (qui peuvent être
négatifs), les seuils d'entrée/sortie, le stop-loss, le take-profit et la taille
de position.
"""

from __future__ import annotations

import math
import random
from dataclasses import asdict, dataclass, fields

from .indicators import momentum, rsi, sma

# nom -> (min, max, entier ?)
GENE_SPACE: dict[str, tuple[float, float, bool]] = {
    "fast": (3, 30, True),
    "slow": (20, 150, True),
    "rsi_period": (5, 30, True),
    "rsi_low": (10.0, 45.0, False),
    "rsi_high": (55.0, 90.0, False),
    "mom_lookback": (5, 60, True),
    "w_trend": (-1.0, 1.0, False),
    "w_revert": (-1.0, 1.0, False),
    "w_mom": (-1.0, 1.0, False),
    "entry": (0.05, 0.8, False),
    "exit": (-0.8, 0.3, False),
    "stop_loss": (0.01, 0.15, False),
    "take_profit": (0.02, 0.40, False),
    "position_size": (0.1, 1.0, False),
}


@dataclass
class Genome:
    fast: int = 10
    slow: int = 50
    rsi_period: int = 14
    rsi_low: float = 30.0
    rsi_high: float = 70.0
    mom_lookback: int = 20
    w_trend: float = 1.0
    w_revert: float = 0.0
    w_mom: float = 0.5
    entry: float = 0.3
    exit: float = -0.1
    stop_loss: float = 0.05
    take_profit: float = 0.15
    position_size: float = 0.5

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Genome":
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


def _clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def scores(closes: list[float], g: Genome) -> list[float | None]:
    """Score de conviction entre -1 (vendre) et +1 (acheter) pour chaque période.

    Le score de la période i n'utilise que les prix jusqu'à i inclus.
    """
    fast, slow = sma(closes, g.fast), sma(closes, g.slow)
    r = rsi(closes, g.rsi_period)
    mom = momentum(closes, g.mom_lookback)
    mid = (g.rsi_low + g.rsi_high) / 2.0
    half = max((g.rsi_high - g.rsi_low) / 2.0, 1e-9)
    weight_sum = abs(g.w_trend) + abs(g.w_revert) + abs(g.w_mom) + 1e-9

    out: list[float | None] = [None] * len(closes)
    for i in range(len(closes)):
        if slow[i] is None or r[i] is None or mom[i] is None:
            continue
        trend = math.tanh((fast[i] / slow[i] - 1.0) * 50.0)
        revert = _clamp((mid - r[i]) / half)
        mo = math.tanh(mom[i] * 10.0)
        out[i] = (g.w_trend * trend + g.w_revert * revert + g.w_mom * mo) / weight_sum
    return out
