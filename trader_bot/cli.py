"""Interface en ligne de commande : python -m trader_bot <commande>."""

from __future__ import annotations

import argparse
import json
import sys

from .agent import TraderAgent
from .backtest import run_backtest
from .learning import TrainConfig
from .market import generate_market, load_csv


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="trader_bot", description="Robot trader qui apprend en simulation.")
    p.add_argument("--state", default="bot_state.json", help="fichier mémoire du robot")
    sub = p.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("train", help="entraîner le robot sur des marchés simulés")
    t.add_argument("--generations", type=int, default=20)
    t.add_argument("--population", type=int, default=40)
    t.add_argument("--markets", type=int, default=20, help="nombre de marchés d'entraînement")
    t.add_argument("--csv", action="append", default=[], help="données réelles à ajouter (répétable)")
    t.add_argument("--seed", type=int, default=None, help="graine aléatoire (reproductibilité)")

    sub.add_parser("exam", help="examen sur des marchés inédits (simulation -> paper)")

    pa = sub.add_parser("paper", help="sessions de trading fictif")
    pa.add_argument("--sessions", type=int, default=1)
    pa.add_argument("--csv", help="rejouer ces données au lieu d'un marché simulé")

    g = sub.add_parser("grant-capital", help="confier un capital réel (après accord humain)")
    g.add_argument("--amount", type=float, required=True)
    g.add_argument("--i-understand-the-risks", action="store_true", dest="confirmed")

    lr = sub.add_parser("live-report", help="déclarer le résultat d'une période de trading réel")
    lr.add_argument("--return", type=float, required=True, dest="ret", help="ex. 0.03 pour +3 %%")
    lr.add_argument("--drawdown", type=float, required=True)

    b = sub.add_parser("backtest", help="tester le cerveau actuel sur un marché")
    b.add_argument("--csv")
    b.add_argument("--seed", type=int, default=42)

    sub.add_parser("status", help="afficher l'état du robot")

    args = p.parse_args(argv)
    agent = TraderAgent(state_path=args.state)

    try:
        if args.cmd == "train":
            extra = [load_csv(path) for path in args.csv]
            cfg = TrainConfig(population=args.population, generations=args.generations, seed=args.seed)
            agent.train(cfg, n_train=args.markets, extra_markets=extra)
        elif args.cmd == "exam":
            agent.exam()
        elif args.cmd == "paper":
            bars = load_csv(args.csv) if args.csv else None
            for _ in range(args.sessions):
                agent.paper_session(bars)
            ok, reasons = agent.live_eligibility()
            print("Éligible au capital réel." if ok else "Pas encore éligible : " + "; ".join(reasons))
        elif args.cmd == "grant-capital":
            agent.grant_capital(args.amount, args.confirmed)
            print(
                "ATTENTION : aucun connecteur de courtier réel n'est branché. "
                "Implémentez trader_bot.broker.LiveBroker pour votre plateforme."
            )
        elif args.cmd == "live-report":
            agent.record_live_period(args.ret, args.drawdown)
        elif args.cmd == "backtest":
            bars = load_csv(args.csv) if args.csv else generate_market(1000, seed=args.seed)
            print(json.dumps(run_backtest(bars, agent.genome, risk=agent.risk).summary(), indent=2, ensure_ascii=False))
        elif args.cmd == "status":
            print(json.dumps(agent.status(), indent=2, ensure_ascii=False))
    except (PermissionError, ValueError) as e:
        print(f"Refusé : {e}", file=sys.stderr)
        return 1
    return 0
