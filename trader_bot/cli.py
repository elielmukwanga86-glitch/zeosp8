"""Interface en ligne de commande : python -m trader_bot <commande>."""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys

from . import open_data
from .agent import TraderAgent
from .backtest import run_backtest
from .learning import TrainConfig
from .market import Bar, generate_market, load_csv


def _series(args) -> dict[str, list[Bar]]:
    """Historiques réels : les données open source de data/ (téléchargées si absentes) + --csv."""
    paths = list(args.csv)
    if not args.simulated_only:
        found = sorted(glob.glob(os.path.join(args.data_dir, "*.csv")))
        if not found:
            print(f"Aucune donnée dans {args.data_dir}/ : téléchargement des données open source...")
            open_data.download(args.data_dir)
            found = sorted(glob.glob(os.path.join(args.data_dir, "*.csv")))
        paths = found + paths
    return {os.path.splitext(os.path.basename(p))[0]: load_csv(p) for p in paths}


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="trader_bot", description="Robot trader qui apprend sur des données open source.")
    p.add_argument("--state", default="bot_state.json", help="fichier mémoire du robot")
    p.add_argument("--data-dir", default="data", help="dossier des données open source")
    sub = p.add_subparsers(dest="cmd", required=True)

    def add_data_args(sp):
        sp.add_argument("--csv", action="append", default=[], help="historique supplémentaire (répétable)")
        sp.add_argument(
            "--sans-donnees-reelles", action="store_true", dest="simulated_only",
            help="n'utiliser que des marchés simulés",
        )

    sub.add_parser("data", help="télécharger / mettre à jour les données open source")

    t = sub.add_parser("train", help="entraîner le robot")
    t.add_argument("--generations", type=int, default=20)
    t.add_argument("--population", type=int, default=40)
    t.add_argument("--markets", type=int, default=60, help="nombre de marchés simulés d'entraînement")
    t.add_argument("--seed", type=int, default=None, help="graine aléatoire (reproductibilité)")
    add_data_args(t)

    sub.add_parser("exam", help="examen sur des marchés inédits (simulation -> paper)")

    pa = sub.add_parser("paper", help="trading fictif sur la réserve des données réelles")
    add_data_args(pa)

    sh = sub.add_parser("short", help="autoriser / interdire la vente à découvert")
    sh.add_argument("mode", choices=["on", "off"])

    au = sub.add_parser("auto", help="enchaîner entraînement, examen et paper trading")
    au.add_argument("--rounds", type=int, default=5, help="nombre maximal d'entraînements")
    au.add_argument("--generations", type=int, default=20)
    au.add_argument("--population", type=int, default=40)
    add_data_args(au)

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
        if args.cmd == "data":
            open_data.download(args.data_dir)
        elif args.cmd == "train":
            cfg = TrainConfig(population=args.population, generations=args.generations, seed=args.seed)
            agent.train(cfg, n_train=args.markets, real_series=list(_series(args).values()))
        elif args.cmd == "exam":
            agent.exam()
        elif args.cmd == "paper":
            real = _series(args)
            if real:
                agent.paper_real(real)
            else:
                for _ in range(agent.criteria.paper_min_sessions):
                    agent.paper_session()
            ok, reasons = agent.live_eligibility()
            print("Éligible au capital réel." if ok else "Pas encore éligible : " + "; ".join(reasons))
        elif args.cmd == "short":
            agent.set_short_selling(args.mode == "on")
            print(f"Vente à découvert : {args.mode}")
        elif args.cmd == "auto":
            return _auto(agent, args)
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
    except (PermissionError, ValueError, OSError) as e:
        print(f"Refusé : {e}", file=sys.stderr)
        return 1
    return 0


def _auto(agent: TraderAgent, args) -> int:
    real = _series(args)
    if real:
        print(f"{len(real)} historiques réels : {', '.join(real)}")
    cfg = TrainConfig(population=args.population, generations=args.generations)
    passed = False
    for round_ in range(1, args.rounds + 1):
        print(f"\n##### Tour {round_}/{args.rounds} #####")
        agent.train(cfg, real_series=list(real.values()))
        if agent.exam():
            passed = True
            break
    if not passed:
        print("\nLe robot n'a pas encore réussi l'examen : relancez `auto` pour continuer l'entraînement.")
        return 0
    print("\n##### Paper trading #####")
    if real:
        agent.paper_real(real)
    else:
        for _ in range(agent.criteria.paper_min_sessions):
            agent.paper_session()
    ok, reasons = agent.live_eligibility()
    print("\nÉligible au capital réel." if ok else "\nPas encore éligible : " + "; ".join(reasons))
    return 0
