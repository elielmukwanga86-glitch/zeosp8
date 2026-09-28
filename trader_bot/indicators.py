"""Indicateurs techniques. Chaque fonction renvoie une liste alignée sur l'entrée,
avec None tant qu'il n'y a pas assez d'historique (aucune fuite du futur)."""

from __future__ import annotations

from typing import Optional

Series = list[Optional[float]]


def sma(values: list[float], n: int) -> Series:
    """Moyenne mobile simple sur n périodes."""
    out: Series = [None] * len(values)
    total = 0.0
    for i, v in enumerate(values):
        total += v
        if i >= n:
            total -= values[i - n]
        if i >= n - 1:
            out[i] = total / n
    return out


def rsi(values: list[float], n: int) -> Series:
    """Relative Strength Index (lissage de Wilder), entre 0 et 100."""
    out: Series = [None] * len(values)
    if len(values) <= n:
        return out
    gains = losses = 0.0
    for i in range(1, n + 1):
        d = values[i] - values[i - 1]
        gains += max(d, 0.0)
        losses += max(-d, 0.0)
    avg_gain, avg_loss = gains / n, losses / n
    out[n] = _rsi_value(avg_gain, avg_loss)
    for i in range(n + 1, len(values)):
        d = values[i] - values[i - 1]
        avg_gain = (avg_gain * (n - 1) + max(d, 0.0)) / n
        avg_loss = (avg_loss * (n - 1) + max(-d, 0.0)) / n
        out[i] = _rsi_value(avg_gain, avg_loss)
    return out


def _rsi_value(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0:
        return 100.0 if avg_gain > 0 else 50.0
    return 100.0 - 100.0 / (1.0 + avg_gain / avg_loss)


def momentum(values: list[float], n: int) -> Series:
    """Rendement sur les n dernières périodes."""
    out: Series = [None] * len(values)
    for i in range(n, len(values)):
        out[i] = values[i] / values[i - n] - 1.0
    return out
