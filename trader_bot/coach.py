"""Claude comme coach du robot.

Claude reçoit le bilan du robot (examens, entraînements, cerveau actuel,
résultats sur les données réelles d'apprentissage) et renvoie :
  - un diagnostic en français,
  - des conseils,
  - des stratégies (génomes) à essayer.

Les stratégies proposées ne sont PAS adoptées directement : elles sont ajoutées
à la population du prochain entraînement et doivent battre le cerveau actuel
sur des marchés neutres, puis réussir l'examen, comme n'importe quelle autre.
Claude ne voit jamais la réserve de données destinée au paper trading.

Nécessite : pip install anthropic, et une clé API (variable ANTHROPIC_API_KEY).
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from .agent import TraderAgent
from .backtest import run_backtest
from .market import Bar, split_real
from .strategy import GENE_SPACE, Genome

if TYPE_CHECKING:
    import anthropic

MODEL = "claude-opus-5"
MAX_SUGGESTIONS = 5

SYSTEM = """Tu es le coach d'un robot de trading qui apprend par algorithme génétique.
Sa stratégie combine des signaux pondérés (tendance court terme, tendance de fond,
RSI, momentum, volume), un filtre de volatilité, une taille de position ajustée à
la volatilité, un stop-loss et un take-profit. Les poids peuvent être négatifs.
Un score >= entry déclenche un achat ; <= -entry une vente à découvert si elle est
autorisée ; la position est soldée quand le score repasse le seuil exit.

Analyse le bilan fourni : identifie pourquoi le robot échoue ou réussit à
l'examen, repère le sur-apprentissage et les faiblesses de gestion du risque.
Propose ensuite des génomes concrets et variés à tester, chaque gène dans son
intervalle. Sois honnête : si les données ne montrent aucun avantage
exploitable, dis-le. Réponds en français."""


def _schema() -> dict:
    genome_props = {name: {"type": "integer" if is_int else "number"} for name, (_, _, is_int) in GENE_SPACE.items()}
    return {
        "type": "object",
        "properties": {
            "diagnostic": {"type": "string"},
            "conseils": {"type": "array", "items": {"type": "string"}},
            "genomes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "idee": {"type": "string"},
                        **genome_props,
                    },
                    "required": ["idee", *GENE_SPACE],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["diagnostic", "conseils", "genomes"],
        "additionalProperties": False,
    }


class CoachError(RuntimeError):
    pass


def build_report(agent: TraderAgent, real_series: dict[str, list[Bar]] | None = None) -> dict[str, Any]:
    """Bilan transmis à Claude (sans la réserve de paper trading)."""
    real = {}
    for name, bars in (real_series or {}).items():
        learn, _reserve = split_real(bars)
        real[name] = run_backtest(learn, agent.genome, risk=agent.risk).summary()
    return {
        "etape": agent.state.stage,
        "vente_a_decouvert_autorisee": agent.risk.allow_short,
        "criteres_examen": {
            "sharpe_median_min": agent.criteria.exam_min_median_sharpe,
            "marches_gagnants_min": agent.criteria.exam_min_profitable_pct,
            "drawdown_max": agent.criteria.exam_max_drawdown,
        },
        "derniers_examens": agent.state.exams[-5:],
        "derniers_entrainements": agent.state.training_runs[-5:],
        "cerveau_actuel": agent.state.genome,
        "intervalles_des_genes": {k: [lo, hi] for k, (lo, hi, _) in GENE_SPACE.items()},
        "resultats_donnees_reelles_apprentissage": real,
    }


def ask_claude(report: dict[str, Any], client: "anthropic.Anthropic | None" = None) -> dict[str, Any]:
    if client is None:
        try:
            import anthropic
        except ImportError as e:
            raise CoachError("Installez le SDK : pip install anthropic") from e
        client = anthropic.Anthropic()

    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM,
        thinking={"type": "adaptive"},
        output_config={"effort": "high", "format": {"type": "json_schema", "schema": _schema()}},
        # En cas de refus, l'API relance automatiquement la requête sur le modèle de repli recommandé.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[
            {
                "role": "user",
                "content": "Voici le bilan du robot. Donne ton diagnostic, tes conseils et "
                f"jusqu'à {MAX_SUGGESTIONS} génomes à essayer.\n\n"
                + json.dumps(report, ensure_ascii=False, indent=2),
            }
        ],
    )
    if response.stop_reason == "refusal":
        raise CoachError("Claude a refusé la demande.")
    if response.stop_reason == "max_tokens":
        raise CoachError("Réponse de Claude tronquée (max_tokens atteint).")
    text = next((b.text for b in response.content if b.type == "text"), None)
    if text is None:
        raise CoachError("Réponse de Claude sans texte.")
    return json.loads(text)


def coach(
    agent: TraderAgent,
    real_series: dict[str, list[Bar]] | None = None,
    client: "anthropic.Anthropic | None" = None,
) -> dict[str, Any]:
    """Demande conseil à Claude et met ses stratégies en file pour le prochain entraînement."""
    advice = ask_claude(build_report(agent, real_series), client)
    suggestions = []
    for g in advice.get("genomes", [])[:MAX_SUGGESTIONS]:
        suggestions.append(Genome.from_dict(g).to_dict())  # ramène chaque gène dans son intervalle
    agent.state.claude_suggestions = suggestions
    agent._note(f"Conseil de Claude : {advice.get('diagnostic', '')}")
    agent.save()
    return advice
