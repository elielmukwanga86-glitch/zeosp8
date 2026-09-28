# Robot Trader

Un robot qui **apprend à trader en simulation** avant qu'on lui confie de l'argent réel.
Il progresse par étapes, et chaque étape doit être méritée :

```
 SIMULATION ──(examen réussi)──▶ PAPER TRADING ──(historique + accord humain)──▶ CAPITAL RÉEL
     ▲                                  │                                            │
     └──── nouveau cerveau / réglages ──┴──────── pertes répétées / drawdown ────────┘
```

| Étape | Ce que fait le robot | Pour passer à la suite |
|---|---|---|
| **Simulation** | S'entraîne sur des données de marché open source (19 marchés réels, jusqu'à 55 ans d'historique) et sur des marchés simulés | Réussir l'examen sur 100 marchés jamais vus : Sharpe médian ≥ 0,3, ≥ 60 % de marchés gagnants, drawdown ≤ 20 % |
| **Paper trading** | Trade avec de l'argent fictif sur la **réserve** des données réelles (les 20 % les plus récents, jamais vus) | ≥ 5 sessions, ≥ 60 % gagnantes, rendement moyen positif, drawdown ≤ 20 % |
| **Capital réel** | Reçoit le capital **par tranches** : 25 % au départ, +25 % après chaque période gagnante, divisé par 2 après une perte | 3 pertes d'affilée ou un drawdown trop fort : retour en paper trading |

Python 3.10+ suffit, sans aucune dépendance ni clé d'API.

## Démarrage rapide

```bash
python -m trader_bot short on         # optionnel : autoriser les paris à la baisse
python -m trader_bot auto             # entraînement + examen + paper trading, en boucle
python -m trader_bot status           # où en est le robot, ce qui lui manque
```

Les données open source (déjà fournies dans `data/`) sont utilisées automatiquement,
et téléchargées si le dossier est vide. `python -m trader_bot data` les met à jour.

Les commandes une par une :

```bash
python -m trader_bot train            # un entraînement (~2 min)
python -m trader_bot exam             # examen sur 100 marchés inédits
python -m trader_bot paper            # trading fictif sur la réserve réelle (après l'examen)
python -m trader_bot backtest --csv data/SP500.csv
```

Une fois éligible, **vous seul** pouvez lui confier du capital :

```bash
python -m trader_bot grant-capital --amount 1000 --i-understand-the-risks
python -m trader_bot live-report --return 0.03 --drawdown 0.04   # bilan d'une période réelle
```

La mémoire du robot (son « cerveau », ses examens, ses sessions, son capital, ses
réglages) est dans `bot_state.json`. Supprimez ce fichier pour repartir de zéro.

## Données open source

Historiques journaliers publics et gratuits, récupérés sur GitHub
(`github.com/datasets`, `github.com/plotly/datasets`) par `python -m trader_bot data` :

| Fichier | Marché | Période |
|---|---|---|
| `FX_EUR`, `FX_JPY`, `FX_GBP`, `FX_CHF`, `FX_CAD`, `FX_AUD`, `FX_NZD`, `FX_SEK`, `FX_NOK`, `FX_MXN` | 10 devises face au dollar (Réserve fédérale américaine) | 1971/1993/1999 → 2026 |
| `BRENT.csv`, `WTI.csv` | Pétrole | 1986/1987 → 2026 |
| `GAZ.csv` | Gaz naturel | 1997 → 2026 |
| `SP500.csv`, `AAPL.csv`, `MSFT.csv`, `IBM.csv`, `SBUX.csv` | Actions / indice | 2007 → 2016 |
| `TSLA.csv` | Tesla (OHLC complet, ajouté à la main) | 2015 → 2018 |

Seules les devises à change flottant sont retenues : les monnaies ancrées ou très
encadrées (Hong Kong, Chine, Venezuela...) ne se comportent pas comme un marché libre.

Chaque historique est découpé ainsi :

```
|------ entraînement 48 % ------|- validation 16 % -|- test neutre 16 % -|--- RÉSERVE 20 % ---|
                                                                          paper trading uniquement
```

Tout CSV avec une colonne de clôture (`Close`, `Price`, `Adj Close`...) convient,
par exemple un export Yahoo Finance : déposez-le dans `data/`, ou passez
`--csv mon_fichier.csv`. `--sans-donnees-reelles` entraîne sur les seuls marchés simulés.

## Comment il apprend

1. **La stratégie** (`strategy.py`) combine cinq signaux : tendance court terme,
   tendance de fond (autre échelle de temps), retour à la moyenne (RSI),
   momentum et volume. Deux mécanismes gèrent le risque : un filtre qui évite de
   prendre position quand le marché s'emballe, et une taille de position réduite
   quand la volatilité monte. Son « cerveau » est un ensemble de 20 paramètres.
2. **L'évolution** (`learning.py`) : 40 cerveaux sont testés sur les données
   open source et 60 marchés simulés. Les meilleurs se reproduisent (croisement +
   mutation) sur 20 générations. Le calcul utilise tous les cœurs du processeur.
3. **Contre le sur-apprentissage** : le champion de chaque génération est jugé
   sur des marchés de validation, puis n'est adopté que s'il bat le cerveau
   actuel sur un **troisième jeu de marchés neutres** (60 simulés + la tranche
   « test neutre » des données réelles). Le robot ne régresse donc jamais.
4. **Tout changement repart en simulation** : un nouveau cerveau ou de nouvelles
   règles (vente à découvert) doivent repasser l'examen.

## Vente à découvert

`python -m trader_bot short on` autorise le robot à parier à la baisse : un score
négatif ouvre une position vendeuse, protégée par un stop-loss (au-dessus du prix
d'entrée), avec un coût d'emprunt d'environ 2,5 % par an. Le risque est plus
élevé : en théorie, une hausse n'a pas de limite. `short off` revient à l'achat seul.

## Garde-fous

- Décision prise à la clôture, exécutée à l'ouverture suivante (pas de triche sur le futur, vérifié par un test).
- Frais (0,1 %) et glissement (0,05 %) appliqués à chaque ordre.
- Position maximale : 50 % du capital, quel que soit ce que le robot a appris.
- Coupe-circuit : le robot arrête de trader s'il perd 25 % depuis son plus haut.
- Pas de levier. Vente à découvert seulement si vous l'autorisez.
- Chaque marché d'examen ou de paper trading est inédit ; la réserve réelle n'est jamais utilisée pour apprendre.

## Résultats actuels

Après quelques entraînements (septembre 2026) :

- **Examen (100 marchés simulés)** : Sharpe médian entre 0,07 et 0,18 selon les
  cerveaux, pour 0,3 exigé. **Le robot n'a pas encore réussi l'examen.**
- **Plafond théorique** : même un robot qui connaîtrait parfaitement le régime du
  marché chaque jour, sans frais, n'obtiendrait qu'un Sharpe médian de 0,52 (achat
  seul) ou 0,66 (avec découvert) sur ces marchés simulés. Le seuil de 0,3 exige
  donc de capter la moitié de ce qu'une connaissance parfaite rapporterait.
- **Données réelles (tranche « test neutre », jamais apprise)** : avec vente à
  découvert, Sharpe médian 0,66 et 6 marchés gagnants sur 8, avec des pertes
  maximales faibles (9 % au pire). Les gains restent modestes (+2 % à +9 %) car le
  robot n'engage qu'une petite partie du capital. Il a gagné +3,4 % sur le Brent
  quand le pétrole perdait 40 %. Attention : 5 de ces 8 marchés sont des actions
  sur la même période (2013-2014), ce n'est donc pas 8 tests indépendants.

## À savoir avant de mettre de l'argent réel

- Réussir sur des marchés simulés ou passés ne garantit rien pour l'avenir.
- **Aucun connecteur de courtier réel n'est fourni.** Pour trader réellement, il
  faut implémenter l'interface `LiveBroker` (`trader_bot/broker.py`) pour votre
  plateforme, par exemple avec la bibliothèque `ccxt` pour les cryptos.
- N'engagez que de l'argent que vous pouvez vous permettre de perdre.

## Structure

```
trader_bot/
  market.py      marchés simulés, chargement CSV, découpage réserve
  indicators.py  moyennes mobiles, RSI, momentum, volatilité
  strategy.py    la stratégie et son génome (le cerveau)
  broker.py      courtier fictif (achat, vente à découvert) + interface courtier réel
  backtest.py    moteur de simulation, garde-fous, métriques
  learning.py    algorithme génétique (parallèle)
  agent.py       le robot : mémoire, examen, paper trading, gestion du capital
  open_data.py   téléchargement des données open source
  cli.py         commandes
tests/           python -m unittest
```
