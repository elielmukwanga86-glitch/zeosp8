"""Le robot trader et son parcours de progression.

    SIMULATION ──(examen réussi)──▶ PAPER ──(track record + accord humain)──▶ LIVE
        ▲                              │                                       │
        └──── nouveau cerveau appris ──┴────── pertes répétées / drawdown ─────┘

- SIMULATION : le robot s'entraîne sur des marchés simulés (et vos CSV) et passe
  un examen sur des marchés jamais vus.
- PAPER : il trade avec de l'argent fictif sur de nouvelles données, session
  après session, pour construire un historique de performance.
- LIVE : seulement après un accord humain explicite. Le capital est débloqué
  par tranches, augmenté si le robot gagne, réduit s'il perd, et le robot est
  rétrogradé en PAPER s'il enchaîne les pertes.

Tout l'état (cerveau, historique, capital) est sauvegardé dans un fichier JSON :
le robot garde sa mémoire d'une exécution à l'autre.
"""

from __future__ import annotations

import json
import os
import statistics
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Callable

from .backtest import Result, RiskLimits, run_backtest
from .learning import TrainConfig, evaluate, evolve
from .market import Bar, generate_market, split_real
from .strategy import Genome

SIMULATION, PAPER, LIVE = "simulation", "paper", "live"

# Plages de graines distinctes : un marché d'examen ou de paper trading n'a
# jamais été vu pendant l'entraînement.
SEED_BASE = {"train": 1_000_000, "val": 2_000_000, "exam": 3_000_000, "paper": 4_000_000}

# Nombre de périodes passées fournies avant une session sur données réelles,
# pour que les indicateurs longs (jusqu'à 300 périodes) soient disponibles.
WARMUP = 300


@dataclass
class Criteria:
    # Examen de simulation -> paper
    exam_markets: int = 100
    exam_min_median_sharpe: float = 0.3
    exam_min_profitable_pct: float = 0.6
    exam_max_drawdown: float = 0.20
    # Paper -> éligible au capital réel
    paper_min_sessions: int = 5
    paper_min_profitable_pct: float = 0.6
    paper_max_drawdown: float = 0.20
    # Gestion du capital réel
    live_first_tranche_pct: float = 0.25  # part du capital accordé engagée au départ
    live_step_pct: float = 0.25  # part supplémentaire débloquée après une période gagnante
    live_max_losing_streak: int = 3  # rétrogradation en paper au-delà


@dataclass
class State:
    stage: str = SIMULATION
    genome: dict = field(default_factory=lambda: Genome().to_dict())
    validation_score: float | None = None
    seed_counters: dict = field(default_factory=lambda: {k: 0 for k in SEED_BASE})
    training_runs: list = field(default_factory=list)
    exams: list = field(default_factory=list)
    paper_sessions: list = field(default_factory=list)
    live: dict = field(default_factory=dict)
    journal: list = field(default_factory=list)
    settings: dict = field(default_factory=lambda: {"allow_short": False})


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class TraderAgent:
    def __init__(
        self,
        state_path: str = "bot_state.json",
        criteria: Criteria | None = None,
        risk: RiskLimits | None = None,
        bars_per_market: int = 1000,
        log: Callable[[str], None] = print,
    ):
        self.state_path = state_path
        self.criteria = criteria or Criteria()
        self.bars_per_market = bars_per_market
        self.log = log
        self.state = self._load()
        self.risk = risk or RiskLimits(allow_short=self.state.settings.get("allow_short", False))

    # --- persistance -------------------------------------------------------------

    def _load(self) -> State:
        if not os.path.exists(self.state_path):
            return State()
        with open(self.state_path, encoding="utf-8") as f:
            data = json.load(f)
        state = State(**{k: v for k, v in data.items() if k in State.__dataclass_fields__})
        for k in SEED_BASE:
            state.seed_counters.setdefault(k, 0)
        return state

    def save(self) -> None:
        tmp = self.state_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(asdict(self.state), f, indent=2, ensure_ascii=False)
        os.replace(tmp, self.state_path)

    @property
    def genome(self) -> Genome:
        return Genome.from_dict(self.state.genome)

    def _note(self, message: str) -> None:
        self.state.journal.append({"date": _now(), "message": message})
        self.log(message)

    def _reset_to_simulation(self, reason: str) -> None:
        if self.state.stage != SIMULATION:
            self._note(f"{reason} : retour en SIMULATION, le robot doit repasser l'examen.")
        self.state.stage = SIMULATION
        self.state.paper_sessions = []
        self.state.live = {}

    def set_short_selling(self, enabled: bool) -> None:
        """Autorise ou interdit la vente à découvert (pari à la baisse)."""
        if self.state.settings.get("allow_short", False) == enabled:
            return
        self.state.settings["allow_short"] = enabled
        self.risk.allow_short = enabled
        self._note(f"Vente à découvert {'autorisée' if enabled else 'interdite'}.")
        self._reset_to_simulation("Règles de trading modifiées")
        self.save()

    def _fresh_markets(self, kind: str, n: int, bars: int | None = None) -> list[list[Bar]]:
        start = SEED_BASE[kind] + self.state.seed_counters[kind]
        self.state.seed_counters[kind] += n
        return [generate_market(bars or self.bars_per_market, seed=start + i) for i in range(n)]

    # --- 1. entraînement -------------------------------------------------------------

    def train(
        self,
        config: TrainConfig | None = None,
        n_train: int = 60,
        n_val: int = 12,
        n_holdout: int = 60,
        real_series: list[list[Bar]] | None = None,
    ) -> bool:
        """Entraîne le robot. Renvoie True si un meilleur cerveau a été adopté.

        `real_series` : historiques réels. Les 20 % les plus récents sont mis en
        réserve pour le paper trading ; le reste est découpé en entraînement
        (60 %), validation (20 %) et test neutre (20 %).
        """
        config = config or TrainConfig()
        train = self._fresh_markets("train", n_train)
        val = self._fresh_markets("val", n_val)
        real_holdout = []
        for series in real_series or []:
            learn, _reserve = split_real(series)
            a, b = int(len(learn) * 0.6), int(len(learn) * 0.8)
            train.append(learn[:a])
            val.append(learn[a:b])
            real_holdout.append(learn[b:])

        current = self.genome
        candidate, _ = evolve(train, val, config, self.risk, seeds=[current], log=self.log)

        # Le candidat a été choisi sur `val` : pour le comparer équitablement au
        # cerveau actuel, on utilise un troisième jeu de marchés, jamais vu par
        # aucun des deux.
        holdout = self._fresh_markets("val", n_holdout) + real_holdout
        current_score, _ = evaluate(current, holdout, self.risk)
        candidate_score, _ = evaluate(candidate, holdout, self.risk)
        self.log(f"Test final sur {len(holdout)} marchés neutres : actuel {current_score:+.3f}, candidat {candidate_score:+.3f}")
        adopted = candidate_score > current_score
        self.state.training_runs.append(
            {
                "date": _now(),
                "generations": config.generations,
                "population": config.population,
                "score_actuel": round(current_score, 4),
                "score_candidat": round(candidate_score, 4),
                "adopte": adopted,
            }
        )
        if adopted:
            self.state.genome = candidate.to_dict()
            self.state.validation_score = candidate_score
            # Un nouveau cerveau n'a pas encore fait ses preuves.
            self._reset_to_simulation("Nouveau cerveau")
            self._note(f"Nouveau cerveau adopté (score {current_score:+.3f} -> {candidate_score:+.3f}).")
        else:
            self._note("Aucun progrès sur les marchés neutres : le cerveau actuel est conservé.")
        self.save()
        return adopted

    # --- 2. examen ---------------------------------------------------------------------

    def exam(self) -> bool:
        """Évalue le robot sur des marchés inédits. En cas de succès, passage en PAPER."""
        c = self.criteria
        results = [run_backtest(m, self.genome, risk=self.risk) for m in self._fresh_markets("exam", c.exam_markets)]
        median_sharpe = statistics.median(r.sharpe for r in results)
        profitable = sum(r.total_return > 0 for r in results) / len(results)
        worst_dd = max(r.max_drawdown for r in results)
        checks = {
            f"Sharpe médian >= {c.exam_min_median_sharpe}": median_sharpe >= c.exam_min_median_sharpe,
            f"marchés gagnants >= {c.exam_min_profitable_pct:.0%}": profitable >= c.exam_min_profitable_pct,
            f"pire drawdown <= {c.exam_max_drawdown:.0%}": worst_dd <= c.exam_max_drawdown,
        }
        passed = all(checks.values())
        self.state.exams.append(
            {
                "date": _now(),
                "sharpe_median": round(median_sharpe, 3),
                "marches_gagnants": round(profitable, 3),
                "pire_drawdown": round(worst_dd, 4),
                "rendement_median": round(statistics.median(r.total_return for r in results), 4),
                "reussi": passed,
            }
        )
        self.log(
            f"Examen sur {len(results)} marchés inédits : Sharpe médian {median_sharpe:.2f}, "
            f"gagnants {profitable:.0%}, pire drawdown {worst_dd:.1%}"
        )
        for label, ok in checks.items():
            self.log(f"  [{'OK' if ok else 'ÉCHEC'}] {label}")
        if passed and self.state.stage == SIMULATION:
            self.state.stage = PAPER
            self._note("Examen réussi : passage en PAPER TRADING.")
        elif not passed:
            self._note("Examen échoué : le robot doit continuer à s'entraîner.")
        self.save()
        return passed

    # --- 3. paper trading ------------------------------------------------------------

    def paper_session(
        self, bars: list[Bar] | None = None, capital: float = 10_000.0, trade_from: int = 0, name: str = "simulé"
    ) -> Result:
        """Une session de trading fictif sur des données jamais vues."""
        if self.state.stage == SIMULATION:
            raise PermissionError("Le robot doit d'abord réussir l'examen (commande `exam`).")
        if bars is None:
            bars = self._fresh_markets("paper", 1, bars=500 + WARMUP)[0]
            trade_from = WARMUP
        result = run_backtest(bars, self.genome, initial_cash=capital, risk=self.risk, trade_from=trade_from)
        self.state.paper_sessions.append({"date": _now(), "marche": name, **result.summary()})
        self.log(f"Session paper n°{len(self.state.paper_sessions)} ({name}) : {result.summary()}")
        self.save()
        return result

    def paper_real(self, series: dict[str, list[Bar]]) -> list[Result]:
        """Paper trading sur la réserve (20 % les plus récents) de chaque historique réel."""
        results = []
        for name, bars in series.items():
            learn, reserve = split_real(bars)
            history = learn[-WARMUP:]
            results.append(self.paper_session(history + reserve, trade_from=len(history), name=name))
        return results

    def live_eligibility(self) -> tuple[bool, list[str]]:
        c = self.criteria
        sessions = self.state.paper_sessions
        reasons = []
        if self.state.stage == SIMULATION:
            reasons.append("examen de simulation non réussi")
        if len(sessions) < c.paper_min_sessions:
            reasons.append(f"{len(sessions)}/{c.paper_min_sessions} sessions paper effectuées")
        if sessions:
            profitable = sum(s["rendement"] > 0 for s in sessions) / len(sessions)
            if profitable < c.paper_min_profitable_pct:
                reasons.append(f"sessions gagnantes {profitable:.0%} < {c.paper_min_profitable_pct:.0%}")
            worst = max(s["drawdown_max"] for s in sessions)
            if worst > c.paper_max_drawdown:
                reasons.append(f"pire drawdown paper {worst:.1%} > {c.paper_max_drawdown:.0%}")
            if statistics.mean(s["rendement"] for s in sessions) <= 0:
                reasons.append("rendement moyen paper négatif")
        return not reasons, reasons

    # --- 4. capital réel -------------------------------------------------------------

    def grant_capital(self, amount: float, confirmed: bool) -> None:
        """Accord humain pour confier un capital réel au robot."""
        if not confirmed:
            raise PermissionError("L'octroi de capital réel exige une confirmation explicite.")
        eligible, reasons = self.live_eligibility()
        if not eligible:
            raise PermissionError("Robot non éligible : " + "; ".join(reasons))
        if amount <= 0:
            raise ValueError("Le montant doit être positif.")
        self.state.stage = LIVE
        self.state.live = {
            "capital_accorde": amount,
            "capital_engage": round(amount * self.criteria.live_first_tranche_pct, 2),
            "periodes": [],
            "serie_pertes": 0,
        }
        self._note(
            f"Capital accordé : {amount:.2f}. Première tranche engagée : {self.state.live['capital_engage']:.2f}."
        )
        self.save()

    def record_live_period(self, period_return: float, max_drawdown: float) -> None:
        """Ajuste le capital engagé après une période de trading réel."""
        if self.state.stage != LIVE:
            raise PermissionError("Le robot n'est pas en mode LIVE.")
        c, live = self.criteria, self.state.live
        engaged = live["capital_engage"] * (1.0 + period_return)
        live["periodes"].append({"date": _now(), "rendement": period_return, "drawdown_max": max_drawdown})

        if period_return > 0 and max_drawdown <= self.risk.max_drawdown_pct:
            live["serie_pertes"] = 0
            step = live["capital_accorde"] * c.live_step_pct
            # On débloque une tranche de plus, sans dépasser le capital accordé
            # (les gains déjà réalisés restent engagés).
            live["capital_engage"] = round(min(engaged + step, max(live["capital_accorde"], engaged)), 2)
            self._note(f"Période gagnante ({period_return:+.2%}) : capital engagé porté à {live['capital_engage']:.2f}.")
        else:
            live["serie_pertes"] += 1
            live["capital_engage"] = round(engaged * 0.5, 2)
            self._note(f"Période perdante ({period_return:+.2%}) : capital engagé réduit à {live['capital_engage']:.2f}.")
            if live["serie_pertes"] >= c.live_max_losing_streak or max_drawdown > self.risk.max_drawdown_pct:
                self.state.stage = PAPER
                self.state.paper_sessions = []
                self._note("Trop de pertes : rétrogradation en PAPER, le capital réel est retiré.")
        self.save()

    # --- rapport ---------------------------------------------------------------------

    def status(self) -> dict:
        eligible, reasons = self.live_eligibility()
        return {
            "etape": self.state.stage,
            "score_validation": self.state.validation_score,
            "entrainements": len(self.state.training_runs),
            "dernier_examen": self.state.exams[-1] if self.state.exams else None,
            "sessions_paper": len(self.state.paper_sessions),
            "vente_a_decouvert": self.risk.allow_short,
            "eligible_capital_reel": eligible,
            "manque_pour_capital_reel": reasons,
            "live": self.state.live or None,
            "cerveau": self.state.genome,
        }
