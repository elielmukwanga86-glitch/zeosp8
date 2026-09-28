"""Données de marché open source : téléchargement et mise en forme dans data/.

Sources publiques et gratuites hébergées sur GitHub :
  - github.com/datasets : pétrole, gaz naturel, taux de change (Réserve fédérale américaine)
  - github.com/plotly/datasets : actions américaines et S&P 500 (2007-2016)
"""

from __future__ import annotations

import csv
import io
import os
import urllib.request
from collections import defaultdict

RAW = "https://raw.githubusercontent.com/"

# fichier -> chemin d'un CSV « Date,Price »
COMMODITIES = {
    "BRENT.csv": "datasets/oil-prices/main/data/brent-daily.csv",
    "WTI.csv": "datasets/oil-prices/main/data/wti-daily.csv",
    "GAZ.csv": "datasets/natural-gas/main/data/daily.csv",
}

STOCKS = "plotly/datasets/master/stockdata.csv"  # colonnes MSFT, IBM, SBUX, AAPL, GSPC, Date
STOCK_NAMES = {"GSPC": "SP500"}

# Devises à change flottant (les monnaies ancrées ou très encadrées sont exclues).
FX = "datasets/exchange-rates/main/data/daily.csv"
FX_COUNTRIES = {
    "Euro": "FX_EUR",
    "Japan": "FX_JPY",
    "United Kingdom": "FX_GBP",
    "Switzerland": "FX_CHF",
    "Canada": "FX_CAD",
    "Australia": "FX_AUD",
    "New Zealand": "FX_NZD",
    "Sweden": "FX_SEK",
    "Norway": "FX_NOK",
    "Mexico": "FX_MXN",
}


def _get(path: str) -> str:
    with urllib.request.urlopen(RAW + path, timeout=120) as r:
        return r.read().decode("utf-8")


def _write(path: str, rows: list[tuple[str, str]], log) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Date", "Close"])
        w.writerows(rows)
    log(f"{path} : {len(rows)} jours ({rows[0][0]} -> {rows[-1][0]})")


def download(out_dir: str = "data", log=print) -> None:
    """Télécharge toutes les séries dans `out_dir` (un CSV Date,Close par marché)."""
    os.makedirs(out_dir, exist_ok=True)

    for name, path in COMMODITIES.items():
        reader = csv.reader(io.StringIO(_get(path)))
        next(reader)
        rows = [(r[0], r[1]) for r in reader if len(r) >= 2 and r[1].strip()]
        _write(os.path.join(out_dir, name), rows, log)

    reader = csv.DictReader(io.StringIO(_get(STOCKS)))
    tickers = [c for c in reader.fieldnames if c != "Date"]
    stocks: dict[str, list[tuple[str, str]]] = {t: [] for t in tickers}
    for row in reader:
        for t in tickers:
            if row[t].strip():
                stocks[t].append((row["Date"], row[t]))
    for t, rows in stocks.items():
        _write(os.path.join(out_dir, f"{STOCK_NAMES.get(t, t)}.csv"), rows, log)

    fx: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for row in csv.DictReader(io.StringIO(_get(FX))):
        name = FX_COUNTRIES.get(row["Country"])
        if name and row["Exchange rate"].strip():
            fx[name].append((row["Date"], row["Exchange rate"]))
    for name, rows in fx.items():
        _write(os.path.join(out_dir, f"{name}.csv"), rows, log)


if __name__ == "__main__":
    download()
