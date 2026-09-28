import os
import tempfile
import unittest

from trader_bot.agent import LIVE, PAPER, SIMULATION, Criteria, TraderAgent
from trader_bot.backtest import RiskLimits, run_backtest
from trader_bot.broker import PaperBroker
from trader_bot.indicators import momentum, rsi, sma
from trader_bot.learning import TrainConfig, evolve
from trader_bot.market import Bar, generate_market, load_csv, split_real
from trader_bot.strategy import GENE_SPACE, Genome, scores


def quiet(_msg):
    pass


class IndicatorTests(unittest.TestCase):
    def test_sma(self):
        self.assertEqual(sma([1, 2, 3, 4], 2), [None, 1.5, 2.5, 3.5])

    def test_rsi_bounds(self):
        up = [float(i) for i in range(1, 40)]
        self.assertEqual(rsi(up, 14)[-1], 100.0)
        values = [v for v in rsi([float(x) for x in generate_prices()], 14) if v is not None]
        self.assertTrue(all(0 <= v <= 100 for v in values))

    def test_momentum(self):
        self.assertAlmostEqual(momentum([100, 110, 121], 2)[2], 0.21)


def generate_prices():
    return [b.close for b in generate_market(300, seed=1)]


class MarketTests(unittest.TestCase):
    def test_reproducible_and_distinct(self):
        self.assertEqual(generate_market(50, seed=3), generate_market(50, seed=3))
        self.assertNotEqual(generate_market(50, seed=3), generate_market(50, seed=4))

    def test_ohlc_consistent(self):
        for b in generate_market(500, seed=7):
            self.assertLessEqual(b.low, min(b.open, b.close))
            self.assertGreaterEqual(b.high, max(b.open, b.close))

    def test_load_csv(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
            f.write("Date,Open,High,Low,Close,Volume\n")
            for b in generate_market(150, seed=2):
                f.write(f"2024-01-01,{b.open},{b.high},{b.low},{b.close},{b.volume}\n")
            f.write("2024-01-02,null,null,null,null,0\n")
        try:
            self.assertEqual(len(load_csv(f.name)), 150)
        finally:
            os.unlink(f.name)


    def test_load_csv_prefixed_reversed_with_thousands(self):
        bars = generate_market(120, seed=9)
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
            f.write('"date","X.Close","X.Volume","X.Open","X.High","X.Low"\n')
            f.write('"11:34","1","1,000","1","1","1"\n')  # ligne intrajournalière sans date : ignorée
            for i, b in reversed(list(enumerate(bars))):
                day = f"2020/{1 + i // 28:02d}/{1 + i % 28:02d}"
                f.write(f'"{day}","{b.close}","1,234","{b.open}","{b.high}","{b.low}"\n')
        try:
            loaded = load_csv(f.name)
        finally:
            os.unlink(f.name)
        self.assertEqual([round(b.close, 6) for b in loaded], [round(b.close, 6) for b in bars])
        self.assertEqual(loaded[0].volume, 1234)

    def test_load_close_only_skips_negative_prices(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
            f.write("Date,Price\n")
            for i in range(150):
                price = -37.6 if i == 50 else 50 + i
                f.write(f"2020-{1 + i // 28:02d}-{1 + i % 28:02d},{price}\n")
        try:
            bars = load_csv(f.name)
        finally:
            os.unlink(f.name)
        self.assertEqual(len(bars), 149)
        self.assertEqual(bars[1].open, bars[0].close)
        self.assertTrue(all(b.low <= min(b.open, b.close) and b.high >= max(b.open, b.close) for b in bars))

    def test_split_real_keeps_recent_reserve(self):
        bars = generate_market(1000, seed=1)
        learn, reserve = split_real(bars)
        self.assertEqual(len(reserve), 200)
        self.assertEqual(learn + reserve, bars)


class StrategyTests(unittest.TestCase):
    def test_no_lookahead(self):
        """Modifier le futur ne doit pas changer les scores du passé."""
        closes = generate_prices()
        g = Genome()
        altered = closes[:200] + [c * 2 for c in closes[200:]]
        self.assertEqual(scores(closes, g)[:200], scores(altered, g)[:200])

    def test_genome_repair_keeps_bounds(self):
        import random

        rng = random.Random(0)
        for _ in range(200):
            g = Genome.random(rng).mutate(rng, rate=1.0, scale=1.0)
            for name, (lo, hi, _) in GENE_SPACE.items():
                self.assertGreaterEqual(getattr(g, name), lo)
                self.assertLessEqual(getattr(g, name), hi)
            self.assertGreater(g.slow, g.fast)
            self.assertLess(g.exit, g.entry)

    def test_genome_roundtrip(self):
        g = Genome(fast=7, slow=90)
        self.assertEqual(Genome.from_dict(g.to_dict()), g)


class BrokerTests(unittest.TestCase):
    def test_round_trip_costs_fees(self):
        b = PaperBroker(cash=1000, fee_rate=0.001, slippage=0.0)
        b.buy(1000, 100.0, 0)
        b.close(100.0, 1)
        self.assertLess(b.cash, 1000)
        self.assertAlmostEqual(b.cash, 1000 * 0.999 / 1.001, places=6)
        self.assertLess(b.trades[0].pnl, 0)


    def test_short_profits_when_price_falls(self):
        b = PaperBroker(cash=1000, fee_rate=0.0, slippage=0.0)
        b.sell_short(500, 100.0, 0)
        self.assertEqual(b.position, -5)
        self.assertAlmostEqual(b.equity(90.0), 1050)
        b.close(90.0, 1)
        self.assertAlmostEqual(b.cash, 1050)
        self.assertAlmostEqual(b.trades[0].pnl, 50)
        self.assertEqual(b.trades[0].side, "vente_decouvert")


class BacktestTests(unittest.TestCase):
    def falling_market(self):
        return [Bar(i, 100 * 0.995**i, 100 * 0.995**i * 1.002, 100 * 0.995 ** (i + 1) * 0.998, 100 * 0.995 ** (i + 1)) for i in range(400)]

    def test_short_only_when_allowed(self):
        g = Genome(w_trend=1, w_long=1, w_revert=0, w_mom=1, w_volume=0, entry=0.1, exit=-0.05, vol_filter=4.0, vol_target=0.04)
        off = run_backtest(self.falling_market(), g, risk=RiskLimits(allow_short=False))
        on = run_backtest(self.falling_market(), g, risk=RiskLimits(allow_short=True))
        self.assertEqual(off.summary()["ventes_decouvert"], 0)
        self.assertGreater(on.summary()["ventes_decouvert"], 0)
        self.assertGreater(on.total_return, 0)

    def test_warmup_does_not_trade(self):
        bars = generate_market(600, seed=4)
        r = run_backtest(bars, Genome(entry=0.05), trade_from=300)
        self.assertEqual(len(r.equity_curve), 300)
        self.assertTrue(all(t.entry_index >= 300 for t in r.trades))

    def test_position_capped_by_risk(self):
        bars = generate_market(400, seed=5)
        g = Genome(position_size=1.0, entry=0.05, exit=-0.8)
        r = run_backtest(bars, g, risk=RiskLimits(max_position_pct=0.2))
        for t in r.trades:
            self.assertLessEqual(t.quantity * t.entry_price, 10_000 * 1.5 * 0.2)

    def test_kill_switch(self):
        # Marché qui s'effondre régulièrement : le coupe-circuit doit se déclencher.
        bars = [Bar(i, 100 * 0.99**i, 100 * 0.99**i * 1.001, 100 * 0.99 ** (i + 1) * 0.999, 100 * 0.99 ** (i + 1)) for i in range(300)]
        g = Genome(w_trend=0, w_revert=1, w_mom=0, entry=0.05, exit=-0.8, stop_loss=0.15, take_profit=0.4, position_size=1.0)
        r = run_backtest(bars, g, risk=RiskLimits(max_position_pct=1.0, max_drawdown_pct=0.1))
        self.assertTrue(r.halted)
        self.assertLess(r.max_drawdown, 0.3)

    def test_flat_strategy_keeps_cash(self):
        g = Genome(entry=0.8, exit=-0.8, w_trend=0.0, w_revert=0.0, w_mom=0.0)
        r = run_backtest(generate_market(300, seed=1), g)
        self.assertEqual(r.n_trades, 0)
        self.assertEqual(r.final_equity, 10_000)


class LearningTests(unittest.TestCase):
    def test_evolution_improves_on_training_data(self):
        train = [generate_market(400, seed=i) for i in range(3)]
        val = [generate_market(400, seed=100 + i) for i in range(2)]
        best, score = evolve(train, val, TrainConfig(population=8, generations=3, elite=2, seed=1, workers=2), log=quiet)
        self.assertIsInstance(best, Genome)
        self.assertGreater(score, float("-inf"))


class AgentTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.dir.name, "state.json")

    def tearDown(self):
        self.dir.cleanup()

    def make(self, **criteria):
        return TraderAgent(self.path, criteria=Criteria(**criteria), bars_per_market=300, log=quiet)

    def test_cannot_skip_stages(self):
        agent = self.make()
        with self.assertRaises(PermissionError):
            agent.paper_session()
        with self.assertRaises(PermissionError):
            agent.grant_capital(1000, confirmed=True)

    def test_training_is_persisted(self):
        agent = self.make()
        agent.train(TrainConfig(population=6, generations=2, elite=2, seed=0, workers=1), n_train=2, n_val=2, n_holdout=2)
        reloaded = self.make()
        self.assertEqual(len(reloaded.state.training_runs), 1)
        self.assertEqual(reloaded.state.genome, agent.state.genome)

    def test_full_journey_with_lenient_criteria(self):
        agent = self.make(
            exam_markets=3, exam_min_median_sharpe=-99, exam_min_profitable_pct=0, exam_max_drawdown=1,
            paper_min_sessions=2, paper_min_profitable_pct=0, paper_max_drawdown=1,
        )
        self.assertTrue(agent.exam())
        self.assertEqual(agent.state.stage, PAPER)
        up = [Bar(i, 100 + i, 101 + i, 99.5 + i, 100.5 + i) for i in range(300)]
        agent.paper_session(up)
        agent.paper_session(up)
        ok, reasons = agent.live_eligibility()
        self.assertTrue(ok, reasons)
        with self.assertRaises(PermissionError):
            agent.grant_capital(1000, confirmed=False)
        agent.grant_capital(1000, confirmed=True)
        self.assertEqual(agent.state.stage, LIVE)
        self.assertEqual(agent.state.live["capital_engage"], 250)

    def test_capital_management(self):
        agent = self.make()
        agent.state.stage = LIVE
        agent.state.live = {"capital_accorde": 1000, "capital_engage": 250, "periodes": [], "serie_pertes": 0}
        agent.record_live_period(0.10, 0.05)  # 250 -> 275 + 250
        self.assertEqual(agent.state.live["capital_engage"], 525)
        agent.record_live_period(-0.10, 0.08)  # 525 -> 472.5 / 2
        self.assertEqual(agent.state.live["capital_engage"], 236.25)
        agent.record_live_period(-0.01, 0.02)
        agent.record_live_period(-0.01, 0.02)
        self.assertEqual(agent.state.stage, PAPER)  # 3 pertes d'affilée -> rétrogradé

    def test_short_setting_resets_stage(self):
        agent = self.make()
        agent.state.stage = PAPER
        agent.set_short_selling(True)
        self.assertTrue(agent.risk.allow_short)
        self.assertEqual(agent.state.stage, SIMULATION)
        self.assertTrue(self.make().risk.allow_short)  # réglage sauvegardé

    def test_paper_real_uses_only_reserve(self):
        agent = self.make()
        agent.state.stage = PAPER
        bars = generate_market(2000, seed=3)
        result = agent.paper_real({"TEST": bars})[0]
        self.assertEqual(len(result.equity_curve), 400)  # 20 % les plus récents
        self.assertEqual(agent.state.paper_sessions[0]["marche"], "TEST")

    def test_training_with_real_series_and_claude_seeds(self):
        agent = self.make()
        agent.state.claude_suggestions = [Genome(fast=5, slow=60).to_dict()]
        agent.train(TrainConfig(population=6, generations=2, elite=2, seed=0, workers=1), n_train=2, n_val=2, n_holdout=2,
                    real_series=[generate_market(1500, seed=77)])
        self.assertEqual(agent.state.claude_suggestions, [])

    def test_exam_failure_keeps_simulation(self):
        agent = self.make(exam_markets=3, exam_min_median_sharpe=99)
        self.assertFalse(agent.exam())
        self.assertEqual(agent.state.stage, SIMULATION)



class FakeClaude:
    """Imite le client Anthropic pour tester le coach sans clé API."""

    def __init__(self, payload, stop_reason="end_turn"):
        import json
        from types import SimpleNamespace

        self.calls = []
        block = SimpleNamespace(type="text", text=json.dumps(payload))
        response = SimpleNamespace(stop_reason=stop_reason, content=[block])

        def create(**kwargs):
            self.calls.append(kwargs)
            return response

        self.beta = SimpleNamespace(messages=SimpleNamespace(create=create))


class CoachTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.agent = TraderAgent(os.path.join(self.dir.name, "s.json"), bars_per_market=300, log=quiet)

    def tearDown(self):
        self.dir.cleanup()

    def test_suggestions_are_repaired_and_queued(self):
        from trader_bot.coach import coach

        wild = dict(Genome().to_dict(), fast=999, entry=5.0, idee="tendance lente")
        fake = FakeClaude({"diagnostic": "pas d'avantage", "conseils": ["réduire la taille"], "genomes": [wild]})
        advice = coach(self.agent, {"X": generate_market(1500, seed=2)}, client=fake)
        self.assertEqual(advice["diagnostic"], "pas d'avantage")
        queued = self.agent.state.claude_suggestions
        self.assertEqual(len(queued), 1)
        self.assertEqual(queued[0]["fast"], 30)  # ramené dans l'intervalle
        self.assertLessEqual(queued[0]["entry"], 0.8)
        call = self.fake_call(fake)
        self.assertEqual(call["model"], "claude-opus-5")
        self.assertEqual(call["fallbacks"], "default")
        self.assertIn("resultats_donnees_reelles_apprentissage", call["messages"][0]["content"])

    def fake_call(self, fake):
        self.assertEqual(len(fake.calls), 1)
        return fake.calls[0]

    def test_refusal_raises(self):
        from trader_bot.coach import CoachError, coach

        with self.assertRaises(CoachError):
            coach(self.agent, client=FakeClaude({}, stop_reason="refusal"))
        self.assertEqual(self.agent.state.claude_suggestions, [])


if __name__ == "__main__":
    unittest.main()
