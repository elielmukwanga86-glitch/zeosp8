"""Exécution des ordres.

`PaperBroker` simule un courtier avec frais et glissement (slippage) : c'est lui
qu'utilisent les simulations et le paper trading. Il gère les positions
acheteuses (position > 0) et vendeuses à découvert (position < 0).

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
    side: str  # "achat" ou "vente_decouvert"
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
    position: float = 0.0  # > 0 acheteur, < 0 vendeur à découvert
    entry_price: float = 0.0
    entry_index: int = 0
    entry_cash_flow: float = 0.0  # argent sorti (achat) ou entré (vente) à l'ouverture, frais inclus
    trades: list[Trade] = field(default_factory=list)

    def buy(self, amount: float, price: float, index: int) -> None:
        """Ouvre une position acheteuse pour `amount` de cash (frais inclus)."""
        amount = min(amount, self.cash)
        if amount <= 0 or self.position != 0:
            return
        fill = price * (1.0 + self.slippage)
        quantity = amount / (fill * (1.0 + self.fee_rate))
        cost = quantity * fill * (1.0 + self.fee_rate)
        self.cash -= cost
        self.position = quantity
        self.entry_price = fill
        self.entry_index = index
        self.entry_cash_flow = cost

    def sell_short(self, amount: float, price: float, index: int) -> None:
        """Ouvre une position vendeuse à découvert d'une valeur `amount`."""
        amount = min(amount, self.cash)
        if amount <= 0 or self.position != 0:
            return
        fill = price * (1.0 - self.slippage)
        quantity = amount / fill
        proceeds = quantity * fill * (1.0 - self.fee_rate)
        self.cash += proceeds
        self.position = -quantity
        self.entry_price = fill
        self.entry_index = index
        self.entry_cash_flow = proceeds

    def close(self, price: float, index: int, reason: str = "signal") -> None:
        """Solde la position en cours, quelle qu'elle soit."""
        if self.position > 0:
            fill = price * (1.0 - self.slippage)
            net = self.position * fill * (1.0 - self.fee_rate)
            self.cash += net
            pnl, side = net - self.entry_cash_flow, "achat"
        elif self.position < 0:
            fill = price * (1.0 + self.slippage)
            cost = -self.position * fill * (1.0 + self.fee_rate)
            self.cash -= cost
            pnl, side = self.entry_cash_flow - cost, "vente_decouvert"
        else:
            return
        self.trades.append(
            Trade(side, self.entry_index, index, self.entry_price, fill, abs(self.position), pnl, reason)
        )
        self.position = 0.0
        self.entry_cash_flow = 0.0

    def equity(self, price: float) -> float:
        return self.cash + self.position * price


class LiveBroker(Protocol):
    """Interface à implémenter pour trader avec de l'argent réel."""

    def get_cash(self) -> float: ...

    def get_position(self, symbol: str) -> float: ...

    def market_buy(self, symbol: str, amount: float) -> None: ...

    def market_sell_short(self, symbol: str, amount: float) -> None: ...

    def close_position(self, symbol: str) -> None: ...
