"""Moteur de simulation : rejoue une stratégie sur un historique de prix.

Règles pour éviter de « tricher » :
  - la décision prise à la clôture de la période i est exécutée à l'ouverture de i+1 ;
  - les stop-loss / take-profit sont vérifiés sur le plus bas / plus haut de la période ;
  - frais et glissement sont appliqués à chaque ordre.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from .broker import PaperBroker, Trade
from .market import Bar
from .strategy import Genome, scores


@dataclass
class RiskLimits:
    """Garde-fous appliqués quel que soit le génome appris."""

    max_position_pct: float = 0.5  # part maximale du capital engagée sur une position
    max_drawdown_pct: float = 0.25  # coupe-circuit : arrêt du trading au-delà de cette perte depuis le plus haut


@dataclass
class Result:
    initial_equity: float
    final_equity: float
    total_return: float
    buy_hold_return: float
    sharpe: float
    max_drawdown: float
    n_trades: int
    win_rate: float
    profit_factor: float
    halted: bool
    equity_curve: list[float] = field(repr=False, default_factory=list)
    trades: list[Trade] = field(repr=False, default_factory=list)

    def summary(self) -> dict:
        return {
            "rendement": round(self.total_return, 4),
            "buy_and_hold": round(self.buy_hold_return, 4),
            "sharpe": round(self.sharpe, 2),
            "drawdown_max": round(self.max_drawdown, 4),
            "trades": self.n_trades,
            "taux_reussite": round(self.win_rate, 3),
            "profit_factor": round(self.profit_factor, 2),
            "coupe_circuit": self.halted,
        }


def run_backtest(
    bars: list[Bar],
    genome: Genome,
    initial_cash: float = 10_000.0,
    risk: RiskLimits | None = None,
    fee_rate: float = 0.001,
    slippage: float = 0.0005,
    bars_per_year: int = 252,
) -> Result:
    risk = risk or RiskLimits()
    broker = PaperBroker(cash=initial_cash, fee_rate=fee_rate, slippage=slippage)
    signal = scores([b.close for b in bars], genome)

    equity_curve: list[float] = []
    peak = initial_cash
    halted = False
    pending: str | None = None
    stop_price = take_price = 0.0

    for i, bar in enumerate(bars):
        # 1. Exécuter l'ordre décidé à la période précédente, au prix d'ouverture.
        if pending == "buy" and broker.position == 0 and not halted:
            size = min(genome.position_size, risk.max_position_pct)
            broker.buy(broker.equity(bar.open) * size, bar.open, i)
            stop_price = broker.entry_price * (1.0 - genome.stop_loss)
            take_price = broker.entry_price * (1.0 + genome.take_profit)
        elif pending == "sell":
            broker.sell_all(bar.open, i, "coupe_circuit" if halted else "signal")
        pending = None

        # 2. Stop-loss / take-profit pendant la période.
        if broker.position > 0:
            if bar.low <= stop_price:
                broker.sell_all(min(bar.open, stop_price), i, "stop_loss")
            elif bar.high >= take_price:
                broker.sell_all(max(bar.open, take_price), i, "take_profit")

        # 3. Suivi du capital et coupe-circuit.
        equity = broker.equity(bar.close)
        equity_curve.append(equity)
        peak = max(peak, equity)
        if not halted and (peak - equity) / peak >= risk.max_drawdown_pct:
            halted = True

        # 4. Décision pour la période suivante.
        s = signal[i]
        if broker.position > 0 and (halted or (s is not None and s <= genome.exit)):
            pending = "sell"
        elif broker.position == 0 and not halted and s is not None and s >= genome.entry:
            pending = "buy"

    if broker.position > 0:
        broker.sell_all(bars[-1].close, len(bars) - 1, "fin_simulation")
        equity_curve[-1] = broker.cash

    return _metrics(bars, broker, equity_curve, initial_cash, halted, bars_per_year)


def _metrics(bars, broker, curve, initial, halted, bars_per_year) -> Result:
    rets = [curve[i] / curve[i - 1] - 1.0 for i in range(1, len(curve))]
    mean = sum(rets) / len(rets) if rets else 0.0
    var = sum((r - mean) ** 2 for r in rets) / len(rets) if rets else 0.0
    std = math.sqrt(var)
    sharpe = mean / std * math.sqrt(bars_per_year) if std > 1e-12 else 0.0

    peak, max_dd = curve[0] if curve else initial, 0.0
    for e in curve:
        peak = max(peak, e)
        max_dd = max(max_dd, (peak - e) / peak)

    trades = broker.trades
    wins = [t.pnl for t in trades if t.pnl > 0]
    losses = [-t.pnl for t in trades if t.pnl <= 0]
    if losses and sum(losses) > 0:
        profit_factor = sum(wins) / sum(losses)
    else:
        profit_factor = float(len(wins) > 0) * 99.0

    final = curve[-1] if curve else initial
    return Result(
        initial_equity=initial,
        final_equity=final,
        total_return=final / initial - 1.0,
        buy_hold_return=bars[-1].close / bars[0].open - 1.0,
        sharpe=sharpe,
        max_drawdown=max_dd,
        n_trades=len(trades),
        win_rate=len(wins) / len(trades) if trades else 0.0,
        profit_factor=profit_factor,
        halted=halted,
        equity_curve=curve,
        trades=trades,
    )
