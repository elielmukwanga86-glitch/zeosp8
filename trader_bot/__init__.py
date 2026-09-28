"""Robot trader : apprend en simulation, puis en paper trading, avant tout capital réel."""

from .agent import TraderAgent
from .backtest import RiskLimits, run_backtest
from .market import generate_market, load_csv
from .strategy import Genome

__all__ = ["TraderAgent", "RiskLimits", "run_backtest", "generate_market", "load_csv", "Genome"]
