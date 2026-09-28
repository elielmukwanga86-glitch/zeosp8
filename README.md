# Robot Trader

Un robot qui **apprend à trader en simulation** avant qu'on lui confie de l'argent réel.
Il progresse par étapes, et chaque étape doit être méritée :

```
 SIMULATION ──(examen réussi)──▶ PAPER TRADING ──(historique + accord humain)──▶ CAPITAL RÉEL
     ▲                                  │                                            │
     └────── nouveau cerveau appris ────┴──────── pertes répétées / drawdown ────────┘
```

| Étape | Ce que fait le robot | Pour passer à la suite |
|---|---|---|
| **Simulation** | S'entraîne sur des centaines de marchés simulés (haussiers, baissiers, latéraux, volatils) et sur vos données CSV | Réussir l'examen sur 40 marchés jamais vus : Sharpe médian ≥ 0,3, ≥ 60 % de marchés gagnants, drawdown ≤ 20 % |
| **Paper trading** | Trade avec de l'argent fictif sur de nouvelles données | ≥ 5 sessions, ≥ 60 % gagnantes, rendement moyen positif, drawdown ≤ 20 % |
| **Capital réel** | Reçoit le capital **par tranches** : 25 % au départ, +25 % après chaque période gagnante, divisé par 2 après une perte | 3 pertes d'affilée ou un drawdown trop fort : retour en paper trading |

Aucune dépendance : Python 3.10+ suffit.

## Démarrage rapide

```bash
python -m trader_bot train          # entraînement (~30 s), à répéter autant que voulu
python -m trader_bot exam           # examen sur des marchés inédits
python -m trader_bot paper --sessions 5   # trading fictif (après l'examen)
python -m trader_bot status         # où en est le robot, ce qui lui manque
```

Une fois éligible, **vous seul** pouvez lui confier du capital :

```bash
python -m trader_bot grant-capital --amount 1000 --i-understand-the-risks
python -m trader_bot live-report --return 0.03 --drawdown 0.04   # bilan d'une période réelle
```

La mémoire du robot (son « cerveau », ses examens, ses sessions, son capital)
est dans `bot_state.json`. Supprimez ce fichier pour repartir de zéro.

### Avec de vraies données

Tout fichier CSV avec les colonnes `Open, High, Low, Close` (export Yahoo Finance,
Binance, etc.) peut servir :

```bash
python -m trader_bot train --csv data/BTC-USD.csv --csv data/CAC40.csv
python -m trader_bot backtest --csv data/BTC-USD.csv
python -m trader_bot paper --csv data/BTC-USD-2025.csv
```

## Comment il apprend

1. **La stratégie** (`strategy.py`) combine trois signaux : tendance (moyennes
   mobiles), retour à la moyenne (RSI) et momentum. Son « cerveau » est un
   ensemble de 14 paramètres : périodes, poids de chaque signal, seuils
   d'entrée/sortie, stop-loss, take-profit et taille de position.
2. **L'évolution** (`learning.py`) : 40 cerveaux sont testés sur 20 marchés. Les
   meilleurs se reproduisent (croisement + mutation) sur 20 générations.
3. **Contre le sur-apprentissage** : le champion de chaque génération est jugé
   sur des marchés de validation. Le cerveau final n'est adopté que s'il bat
   l'actuel sur un **troisième jeu de marchés neutres**. Le robot ne régresse donc
   jamais, et chaque entraînement repart du meilleur cerveau connu.
4. **Un nouveau cerveau repart en simulation** : même s'il était en paper ou en
   réel, il doit repasser l'examen.

## Garde-fous

- Décision prise à la clôture, exécutée à l'ouverture suivante (pas de triche sur le futur, vérifié par un test).
- Frais (0,1 %) et glissement (0,05 %) appliqués à chaque ordre.
- Position maximale : 50 % du capital, quel que soit ce que le robot a appris.
- Coupe-circuit : le robot arrête de trader s'il perd 25 % depuis son plus haut.
- Achat uniquement (pas de vente à découvert ni de levier).
- Chaque marché d'examen ou de paper trading est inédit : les graines de génération ne sont jamais réutilisées.

## À savoir avant de mettre de l'argent réel

- **Le robot ne réussit pas encore l'examen.** Après quelques entraînements, il
  atteint environ 60 % de marchés gagnants et un drawdown de 10 %, mais un Sharpe
  médian d'environ 0,1 pour 0,3 exigé. Le blocage est voulu : la plupart des
  stratégies n'ont pas d'avantage réel, et le robot ne doit pas avancer tant qu'il
  n'en a pas démontré un.
- Réussir sur des marchés simulés ne garantit rien sur les vrais marchés.
  Entraînez-le et faites-lui passer le paper trading sur de **vraies données**.
- **Aucun connecteur de courtier réel n'est fourni.** Pour trader réellement, il
  faut implémenter l'interface `LiveBroker` (`trader_bot/broker.py`) pour votre
  plateforme, par exemple avec la bibliothèque `ccxt` pour les cryptos.
- N'engagez que de l'argent que vous pouvez vous permettre de perdre.

## Structure

```
trader_bot/
  market.py      marchés simulés + chargement CSV
  indicators.py  moyennes mobiles, RSI, momentum
  strategy.py    la stratégie et son génome (le cerveau)
  broker.py      courtier fictif (frais, glissement) + interface courtier réel
  backtest.py    moteur de simulation, garde-fous, métriques
  learning.py    algorithme génétique
  agent.py       le robot : mémoire, examen, paper trading, gestion du capital
  cli.py         commandes
tests/           python -m unittest
```
