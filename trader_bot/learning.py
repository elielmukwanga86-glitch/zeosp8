"""Apprentissage par algorithme génétique.

Une population de stratégies (génomes) est testée sur plusieurs marchés
d'entraînement. Les meilleures se reproduisent (croisement + mutation), les
moins bonnes disparaissent. À chaque génération, le champion est aussi évalué
sur des marchés de validation qu'il n'a jamais vus : on ne garde que la
stratégie qui généralise le mieux, pas celle qui a « appris par cœur ».
"""

from __future__ import annotations

import multiprocessing as mp
import os
import random
import statistics
from dataclasses import dataclass
from typing import Callable

from .backtest import Result, RiskLimits, run_backtest
from .market import Bar
from .strategy import Genome


@dataclass
class TrainConfig:
    population: int = 30
    generations: int = 15
    elite: int = 4
    tournament: int = 3
    mutation_rate: float = 0.25
    seed: int | None = None
    workers: int = 0  # processus en parallèle (0 = un par cœur du processeur)


def fitness(results: list[Result]) -> float:
    """Note d'une stratégie sur plusieurs marchés, alignée sur les critères de l'examen.

    - Sharpe médian : rendement ajusté du risque d'un marché typique ;
    - part de marchés gagnants : régularité ;
    - pénalité seulement au-delà de 15 % de drawdown : on veut limiter les
      grosses pertes sans rendre le robot timide au point de ne plus rien gagner ;
    - pénalités si la stratégie ne trade quasiment pas ou déclenche le coupe-circuit.
    """
    n = len(results)
    median_sharpe = statistics.median(r.sharpe for r in results)
    profitable = sum(r.total_return > 0 for r in results) / n
    excess_dd = statistics.mean(max(0.0, r.max_drawdown - 0.15) for r in results)
    inactive = sum(r.n_trades < 3 for r in results) / n
    halted = sum(r.halted for r in results) / n
    return median_sharpe + (profitable - 0.5) - 5.0 * excess_dd - inactive - 2.0 * halted


def evaluate(genome: Genome, markets: list[list[Bar]], risk: RiskLimits) -> tuple[float, list[Result]]:
    results = [run_backtest(m, genome, risk=risk) for m in markets]
    return fitness(results), results


# Les marchés d'entraînement sont transmis une seule fois à chaque processus.
_WORKER_MARKETS: list[list[Bar]] = []
_WORKER_RISK = RiskLimits()


def _init_worker(markets: list[list[Bar]], risk: RiskLimits) -> None:
    global _WORKER_MARKETS, _WORKER_RISK
    _WORKER_MARKETS, _WORKER_RISK = markets, risk


def _score_worker(genome: Genome) -> float:
    return evaluate(genome, _WORKER_MARKETS, _WORKER_RISK)[0]


def evolve(
    train_markets: list[list[Bar]],
    val_markets: list[list[Bar]],
    config: TrainConfig | None = None,
    risk: RiskLimits | None = None,
    seeds: list[Genome] | None = None,
    log: Callable[[str], None] = print,
) -> tuple[Genome, float]:
    """Fait évoluer une population et renvoie (meilleur génome, score de validation).

    `seeds` permet de reprendre l'apprentissage à partir de génomes déjà appris
    (apprentissage continu) au lieu de repartir de zéro.
    """
    cfg = config or TrainConfig()
    risk = risk or RiskLimits()
    rng = random.Random(cfg.seed)

    population = list(seeds or [])[: cfg.population]
    population += [Genome.random(rng) for _ in range(cfg.population - len(population))]

    workers = cfg.workers or os.cpu_count() or 1
    method = "fork" if "fork" in mp.get_all_start_methods() else "spawn"  # Windows : spawn
    pool = mp.get_context(method).Pool(workers, _init_worker, (train_markets, risk)) if workers > 1 else None
    try:
        return _evolve_loop(population, train_markets, val_markets, cfg, risk, rng, pool, log)
    finally:
        if pool:
            pool.close()
            pool.join()


def _evolve_loop(population, train_markets, val_markets, cfg, risk, rng, pool, log) -> tuple[Genome, float]:
    best_genome, best_val = population[0], float("-inf")
    known: dict[tuple, float] = {}  # les élites déjà notées ne sont pas réévaluées
    for gen in range(cfg.generations):
        todo = [g for g in population if _key(g) not in known]
        if pool:
            fits = pool.map(_score_worker, todo)
        else:
            fits = [evaluate(g, train_markets, risk)[0] for g in todo]
        known.update(zip(map(_key, todo), fits))
        scored = sorted(((known[_key(g)], g) for g in population), key=lambda x: x[0], reverse=True)
        champion_train, champion = scored[0]
        val_score, _ = evaluate(champion, val_markets, risk)
        if val_score > best_val:
            best_genome, best_val = champion, val_score
        log(
            f"génération {gen + 1:>3}/{cfg.generations} | entraînement {champion_train:+.3f} "
            f"| validation {val_score:+.3f} | meilleur {best_val:+.3f}"
        )

        elites = [g for _, g in scored[: cfg.elite]]
        children = list(elites)
        while len(children) < cfg.population:
            a = _tournament(scored, cfg.tournament, rng)
            b = _tournament(scored, cfg.tournament, rng)
            children.append(a.crossover(b, rng).mutate(rng, cfg.mutation_rate))
        population = children

    return best_genome, best_val


def _key(g: Genome) -> tuple:
    return tuple(g.to_dict().values())


def _tournament(scored: list[tuple[float, Genome]], k: int, rng: random.Random) -> Genome:
    return max(rng.sample(scored, k), key=lambda x: x[0])[1]
