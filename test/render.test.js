import { test } from "node:test";
import assert from "node:assert/strict";
import { extractMath, cleanLatex } from "../public/render.js";

test("extrait les formules en ligne et centrées", () => {
  const { text, math } = extractMath("Soit $x_1$ et $$\\frac{a}{b}$$ fin");
  assert.deepEqual(math, [
    { tex: "x_1", display: false },
    { tex: "\\frac{a}{b}", display: true },
  ]);
  assert.equal(text, "Soit \u0000M0\u0000 et \u0000M1\u0000 fin");
});

test("gère \\( \\) et \\[ \\]", () => {
  const { math } = extractMath("\\(a^2\\) puis \\[b_2\\]");
  assert.deepEqual(math, [{ tex: "a^2", display: false }, { tex: "b_2", display: true }]);
});

test("ne touche pas au code", () => {
  const src = "```\nprice = $5 + $6\n```\n et `$a$`";
  assert.equal(extractMath(src).math.length, 0);
});

test("ignore les montants en dollars", () => {
  assert.equal(extractMath("Ça coûte $5 et $10.").math.length, 0);
});

test("retire les balises de code autour du LaTeX", () => {
  assert.equal(cleanLatex("```latex\n\\documentclass{article}\n```"), "\\documentclass{article}");
  assert.equal(cleanLatex("\\documentclass{article}"), "\\documentclass{article}");
});
