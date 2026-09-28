"""Exécution des ordres.

`PaperBroker` simule un courtier avec frais et glissement (slippage) : c'est lui
qu'utilisent les simulations et le paper trading.

`LiveBroker` décrit l'interface qu'un connecteur vers une vraie plateforme
(Binance, Kraken, Interactive Brokers...) devra implémenter. Aucune
implémentation réelle n'est fournie volontairement : brancher de l'argent réel
doit être une décision explicite, après que le robot a fait ses preuves.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class Trade:
    entry_index: int
    exit_index: int
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    reason: str


@dataclass
class PaperBroker:
    cash: float
    fee_rate: float = 0.001  # 0,1 % par ordre
    slippage: float = 0.0005  # 0,05 % de prix défavorable
    position: float = 0.0
    entry_price: float = 0.0
    entry_index: int = 0
    entry_cost: float = 0.0
    trades: list[Trade] = field(default_factory=list)

    def buy(self, amount: float, price: float, index: int) -> None:
        """Achète pour `amount` de cash (frais inclus)."""
        amount = min(amount, self.cash)
        if amount <= 0 or self.position > 0:
            return
        fill = price * (1.0 + self.slippage)
        quantity = amount / (fill * (1.0 + self.fee_rate))
        cost = quantity * fill
        fee = cost * self.fee_rate
        self.cash -= cost + fee
        self.position = quantity
        self.entry_price = fill
        self.entry_index = index
        self.entry_cost = cost + fee

    def sell_all(self, price: float, index: int, reason: str = "signal") -> None:
        if self.position <= 0:
            return
        fill = price * (1.0 - self.slippage)
        proceeds = self.position * fill
        net = proceeds - proceeds * self.fee_rate
        self.cash += net
        self.trades.append(
            Trade(self.entry_index, index, self.entry_price, fill, self.position, net - self.entry_cost, reason)
        )
        self.position = 0.0
        self.entry_cost = 0.0

    def equity(self, price: float) -> float:
        return self.cash + self.position * price


class LiveBroker(Protocol):
    """Interface à implémenter pour trader avec de l'argent réel."""

    def get_cash(self) -> float: ...

    def get_position(self, symbol: str) -> float: ...

    def market_buy(self, symbol: str, amount: float) -> None: ...

    def market_sell_all(self, symbol: str) -> None: ...
