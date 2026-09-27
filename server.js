import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { PROMPTS } from "./prompts.js";
import { validateChatRequest, buildMessages } from "./validation.js";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const PORT = Number(process.env.PORT) || 3000;

const client = new Anthropic();
const app = express();

app.use(express.json({ limit: "30mb" }));
app.use(express.static(path.join(here, "public")));
// Bibliothèques du navigateur servies depuis node_modules (pas de CDN).
const vendor = (pkg, dir) => express.static(path.join(here, "node_modules", pkg, dir), { maxAge: "7d" });
app.use("/vendor/katex", vendor("katex", "dist"));
app.use("/vendor/marked", vendor("marked", "lib"));
app.use("/vendor/dompurify", vendor("dompurify", "dist"));

async function hasPdflatex() {
  try {
    await execFileAsync("pdflatex", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
const latexAvailable = hasPdflatex();

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, model: MODEL, latex: await latexAvailable });
});

app.post("/api/chat", async (req, res) => {
  const error = validateChatRequest(req.body);
  if (error) return res.status(400).json({ error });

  const { mode } = req.body;

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: { effort: mode === "latex" ? "high" : "medium" },
    // En cas de refus par un classifieur de sécurité, l'API relance la
    // requête sur le modèle de repli recommandé.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    system: PROMPTS[mode],
    messages: buildMessages(req.body),
  });

  res.on("close", () => stream.abort());

  try {
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "thinking") {
        send({ type: "status", status: "thinking" });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        send({ type: "text", text: event.delta.text });
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      send({ type: "error", error: "La demande a été refusée par le modèle. Reformule ta question." });
    } else {
      send({ type: "done", stop_reason: message.stop_reason });
    }
  } catch (err) {
    if (res.destroyed) return;
    send({ type: "error", error: describeError(err) });
  }
  res.end();
});

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Clé API invalide ou manquante. Configure ANTHROPIC_API_KEY sur le serveur.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Trop de demandes pour le moment. Réessaie dans quelques instants.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `Requête refusée par l'API : ${err.message}`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Impossible de joindre l'API Claude. Vérifie la connexion du serveur.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Erreur de l'API (${err.status ?? "?"}). Réessaie.`;
  }
  console.error(err);
  return "Erreur inattendue du serveur.";
}

// Compile un document LaTeX en PDF si pdflatex est installé sur le serveur.
app.post("/api/compile", async (req, res) => {
  const tex = req.body?.tex;
  if (typeof tex !== "string" || !tex.includes("\\documentclass") || tex.length > 500_000) {
    return res.status(400).json({ error: "Document LaTeX invalide." });
  }
  if (!(await latexAvailable)) {
    return res.status(501).json({ error: "pdflatex n'est pas installé sur ce serveur." });
  }

  const dir = await mkdtemp(path.join(tmpdir(), "prof-ia-"));
  try {
    await writeFile(path.join(dir, "cours.tex"), tex, "utf8");
    const args = ["-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "cours.tex"];
    // Deux passes pour la table des matières et les références.
    for (let pass = 0; pass < 2; pass++) {
      await execFileAsync("pdflatex", args, { cwd: dir, timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
    }
    const pdf = await readFile(path.join(dir, "cours.pdf"));
    res.type("application/pdf").send(pdf);
  } catch {
    const log = await readFile(path.join(dir, "cours.log"), "utf8").catch(() => "");
    const errors = log.split("\n").filter((l) => l.startsWith("!") || l.startsWith("l.")).slice(0, 12);
    res.status(422).json({ error: "La compilation a échoué.", log: errors.join("\n") || log.slice(-2000) });
  } finally {
    rm(dir, { recursive: true, force: true });
  }
});

app.listen(PORT, () => {
  console.log(`Prof IA en ligne sur http://localhost:${PORT} (modèle : ${MODEL})`);
});
