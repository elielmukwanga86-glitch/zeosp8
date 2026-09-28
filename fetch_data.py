"""Télécharge des historiques de prix réels (journaliers) dans data/.

Sources publiques hébergées sur GitHub (github.com/datasets, github.com/plotly).
Usage : python fetch_data.py
"""

from __future__ import annotations

import csv
import io
import os
import urllib.request

RAW = "https://raw.githubusercontent.com/"
SINGLE = {
    "BRENT.csv": "datasets/oil-prices/main/data/brent-daily.csv",
    "WTI.csv": "datasets/oil-prices/main/data/wti-daily.csv",
    "GAZ.csv": "datasets/natural-gas/main/data/daily.csv",
}
MULTI = "plotly/datasets/master/stockdata.csv"  # MSFT, IBM, SBUX, AAPL, GSPC (S&P 500), 2007-2016
MULTI_NAMES = {"GSPC": "SP500"}


def _get(path: str) -> str:
    with urllib.request.urlopen(RAW + path, timeout=60) as r:
        return r.read().decode("utf-8")


def _write(path: str, rows: list[tuple[str, str]]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Date", "Close"])
        w.writerows(rows)
    print(f"{path} : {len(rows)} jours ({rows[0][0]} -> {rows[-1][0]})")


def main(out_dir: str = "data") -> None:
    os.makedirs(out_dir, exist_ok=True)
    for name, path in SINGLE.items():
        reader = csv.reader(io.StringIO(_get(path)))
        next(reader)
        rows = [(r[0], r[1]) for r in reader if len(r) >= 2 and r[1].strip()]
        _write(os.path.join(out_dir, name), rows)

    reader = csv.DictReader(io.StringIO(_get(MULTI)))
    tickers = [c for c in reader.fieldnames if c != "Date"]
    series: dict[str, list[tuple[str, str]]] = {t: [] for t in tickers}
    for row in reader:
        for t in tickers:
            if row[t].strip():
                series[t].append((row["Date"], row[t]))
    for t, rows in series.items():
        _write(os.path.join(out_dir, f"{MULTI_NAMES.get(t, t)}.csv"), rows)


if __name__ == "__main__":
    main()
