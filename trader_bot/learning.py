"""Apprentissage par algorithme génétique.

Une population de stratégies (génomes) est testée sur plusieurs marchés
d'entraînement. Les meilleures se reproduisent (croisement + mutation), les
moins bonnes disparaissent. À chaque génération, le champion est aussi évalué
sur des marchés de validation qu'il n'a jamais vus : on ne garde que la
stratégie qui généralise le mieux, pas celle qui a « appris par cœur ».
"""

from __future__ import annotations

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


def fitness(results: list[Result]) -> float:
    """Note d'une stratégie sur plusieurs marchés.

    On récompense le rendement ajusté du risque (Sharpe) et on pénalise fortement
    les pertes maximales. On prend la médiane et le pire cas pour favoriser les
    stratégies robustes plutôt que chanceuses.
    """
    per_market = []
    for r in results:
        score = r.sharpe - 3.0 * r.max_drawdown
        if r.n_trades < 3:
            score -= 1.0  # une stratégie qui ne trade pas n'apprend rien
        if r.halted:
            score -= 1.0
        per_market.append(score)
    return 0.7 * statistics.median(per_market) + 0.3 * min(per_market)


def evaluate(genome: Genome, markets: list[list[Bar]], risk: RiskLimits) -> tuple[float, list[Result]]:
    results = [run_backtest(m, genome, risk=risk) for m in markets]
    return fitness(results), results


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

    best_genome, best_val = population[0], float("-inf")
    for gen in range(cfg.generations):
        scored = sorted(
            ((evaluate(g, train_markets, risk)[0], g) for g in population),
            key=lambda x: x[0],
            reverse=True,
        )
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


def _tournament(scored: list[tuple[float, Genome]], k: int, rng: random.Random) -> Genome:
    return max(rng.sample(scored, k), key=lambda x: x[0])[1]
