import { renderMarkdown, cleanLatex } from "./render.js";

const MODES = {
  resoudre: {
    title: "Quel exercice veux-tu résoudre ?",
    text: "Écris l'énoncé ou envoie une photo : je te donne la méthode, la solution détaillée et une vérification.",
    placeholder: "Écris ton exercice ou ta question…",
    suggestions: [
      "Résous l'équation 2x² − 3x − 5 = 0",
      "Calcule la dérivée de f(x) = x·e^(−2x) et étudie ses variations",
      "Une voiture passe de 0 à 100 km/h en 8 s. Quelle est son accélération ?",
      "Équilibre la réaction : C₃H₈ + O₂ → CO₂ + H₂O",
    ],
  },
  expliquer: {
    title: "Quelle notion veux-tu comprendre ?",
    text: "Je t'explique simplement, avec des exemples, les erreurs à éviter et un mini-quiz.",
    placeholder: "Quelle notion veux-tu que je t'explique ?",
    suggestions: [
      "Explique-moi les limites de fonctions",
      "C'est quoi la photosynthèse ?",
      "Comment fonctionne le present perfect en anglais ?",
      "Explique les causes de la Première Guerre mondiale",
    ],
  },
  latex: {
    title: "Quel cours veux-tu générer ?",
    text: "Je rédige un cours complet en LaTeX : définitions, théorèmes, exemples, exercices et corrigés. Tu peux le télécharger, le compiler en PDF ou l'ouvrir dans Overleaf.",
    placeholder: "Sujet du cours (ex. : les suites géométriques)…",
    suggestions: [
      "Cours sur les suites arithmétiques et géométriques",
      "Cours sur les nombres complexes",
      "Cours sur la loi d'Ohm et les circuits électriques",
      "Cours sur la méthode de la dissertation",
    ],
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const state = {
  mode: "resoudre",
  history: [], // { role, text, files? }
  pending: [], // pièces jointes du prochain message
  controller: null,
  latexAvailable: false,
};

const $ = (id) => document.getElementById(id);
const els = {
  messages: $("messages"),
  welcome: $("welcome"),
  welcomeTitle: $("welcome-title"),
  welcomeText: $("welcome-text"),
  suggestions: $("suggestions"),
  form: $("composer"),
  input: $("input"),
  send: $("send"),
  stop: $("stop"),
  fileInput: $("file-input"),
  attachments: $("attachments"),
  subject: $("subject"),
  level: $("level"),
  newChat: $("new-chat"),
};

fetch("/api/health")
  .then((r) => r.json())
  .then((h) => { state.latexAvailable = Boolean(h.latex); })
  .catch(() => {});

/* ---------- Modes et accueil ---------- */

function setMode(mode) {
  if (state.controller) return;
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.mode === mode));
  });
  resetChat();
}

function resetChat() {
  if (state.controller) state.controller.abort();
  state.history = [];
  state.pending = [];
  renderAttachments();
  els.messages.replaceChildren(els.welcome);
  const m = MODES[state.mode];
  els.welcomeTitle.textContent = m.title;
  els.welcomeText.textContent = m.text;
  els.input.placeholder = m.placeholder;
  els.suggestions.replaceChildren(
    ...m.suggestions.map((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = s;
      b.addEventListener("click", () => {
        els.input.value = s;
        autoResize();
        els.input.focus();
      });
      return b;
    }),
  );
  els.welcome.hidden = false;
  els.input.focus();
}

document.querySelectorAll("[data-mode]").forEach((b) =>
  b.addEventListener("click", () => setMode(b.dataset.mode)),
);
els.newChat.addEventListener("click", resetChat);

/* ---------- Pièces jointes ---------- */

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  for (const file of fileList) {
    const okType = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType) { toast(`${file.name} : format non pris en charge.`); continue; }
    if (file.size > MAX_FILE_SIZE) { toast(`${file.name} dépasse 10 Mo.`); continue; }
    if (state.pending.length >= 5) { toast("5 fichiers maximum par message."); break; }
    const data = await readFile(file);
    state.pending.push({ name: file.name || "capture.png", type: file.type, data });
  }
  renderAttachments();
}

function renderAttachments() {
  els.attachments.replaceChildren(
    ...state.pending.map((f, i) => {
      const chip = document.createElement("span");
      chip.className = "attachment";
      if (f.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = `data:${f.type};base64,${f.data}`;
        img.alt = "";
        chip.append(img);
      } else {
        const icon = document.createElement("span");
        icon.className = "pdf-icon";
        icon.textContent = "PDF";
        chip.append(icon);
      }
      const name = document.createElement("span");
      name.className = "attachment-name";
      name.textContent = f.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Retirer";
      remove.addEventListener("click", () => {
        state.pending.splice(i, 1);
        renderAttachments();
      });
      chip.append(name, remove);
      return chip;
    }),
  );
}

els.fileInput.addEventListener("change", () => {
  addFiles([...els.fileInput.files]);
  els.fileInput.value = "";
});

document.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData?.files ?? [])];
  if (files.length) {
    e.preventDefault();
    addFiles(files);
  }
});

els.form.addEventListener("dragover", (e) => { e.preventDefault(); els.form.classList.add("dragging"); });
els.form.addEventListener("dragleave", () => els.form.classList.remove("dragging"));
els.form.addEventListener("drop", (e) => {
  e.preventDefault();
  els.form.classList.remove("dragging");
  addFiles([...e.dataTransfer.files]);
});

/* ---------- Saisie ---------- */

function autoResize() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(els.input.scrollHeight, 220)}px`;
}
els.input.addEventListener("input", autoResize);
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    els.form.requestSubmit();
  }
});

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (state.controller) return;
  const text = els.input.value.trim();
  if (!text && state.pending.length === 0) return;
  const message = { role: "user", text, files: state.pending };
  state.pending = [];
  renderAttachments();
  els.input.value = "";
  autoResize();
  ask(message);
});

els.stop.addEventListener("click", () => state.controller?.abort());

/* ---------- Conversation ---------- */

function scrollToBottom(force = false) {
  const el = els.messages;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  if (force || nearBottom) el.scrollTop = el.scrollHeight;
}

function addUserBubble(message) {
  const row = document.createElement("div");
  row.className = "msg user";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  for (const f of message.files) {
    if (f.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = `data:${f.type};base64,${f.data}`;
      img.alt = f.name;
      img.className = "user-image";
      bubble.append(img);
    } else {
      const doc = document.createElement("div");
      doc.className = "user-doc";
      doc.textContent = `📄 ${f.name}`;
      bubble.append(doc);
    }
  }
  if (message.text) {
    const p = document.createElement("p");
    p.textContent = message.text;
    bubble.append(p);
  }
  row.append(bubble);
  els.messages.append(row);
}

function addAssistantBubble() {
  const row = document.createElement("div");
  row.className = "msg assistant";
  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = "∑";
  const body = document.createElement("div");
  body.className = "answer";
  body.innerHTML = '<div class="typing"><span></span><span></span><span></span><em>Réflexion en cours…</em></div>';
  row.append(avatar, body);
  els.messages.append(row);
  return body;
}

function setBusy(busy) {
  els.send.hidden = busy;
  els.stop.hidden = !busy;
  document.querySelectorAll("[data-mode]").forEach((b) => { b.disabled = busy; });
}

async function ask(message) {
  els.welcome.hidden = true;
  // « Nouvelle conversation » remplace state.history : on garde une référence
  // pour ne pas mélanger cette réponse avec la conversation suivante.
  const history = state.history;
  history.push(message);
  addUserBubble(message);
  const body = addAssistantBubble();
  scrollToBottom(true);

  const controller = new AbortController();
  state.controller = controller;
  setBusy(true);

  let answer = "";
  let failed = null;
  let frame = 0;
  const mode = state.mode;
  const paint = () => {
    frame = 0;
    if (mode === "latex") renderLatexProgress(body, answer);
    else body.innerHTML = renderMarkdown(answer);
    scrollToBottom();
  };

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        subject: els.subject.value,
        level: els.level.value,
        messages: history.map(({ role, text, files }) => ({
          role,
          text,
          ...(files?.length ? { files: files.map(({ type, data }) => ({ type, data })) } : {}),
        })),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur ${res.status}`);
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const parts = buffer.split("\n\n");
      buffer = parts.pop();
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const event = JSON.parse(part.slice(6));
        if (event.type === "text") {
          answer += event.text;
          if (!frame) frame = requestAnimationFrame(paint);
        } else if (event.type === "error") {
          failed = event.error;
        } else if (event.type === "done" && event.stop_reason === "max_tokens") {
          failed = "La réponse a été coupée car elle était trop longue.";
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") failed = err.message || "Connexion interrompue.";
  } finally {
    if (frame) cancelAnimationFrame(frame);
    state.controller = null;
    setBusy(false);
  }

  if (answer.trim()) {
    history.push({ role: "assistant", text: answer });
    if (mode === "latex") renderLatexDocument(body, answer);
    else {
      body.innerHTML = renderMarkdown(answer);
      body.append(answerActions(answer));
    }
  } else {
    // Rien reçu : on retire la question pour pouvoir la reposer.
    history.pop();
    body.innerHTML = "";
  }
  if (failed || !answer.trim()) {
    const note = document.createElement("p");
    note.className = "error";
    note.textContent = failed || "Génération arrêtée.";
    body.append(note);
  }
  scrollToBottom();
}

function answerActions(text) {
  const bar = document.createElement("div");
  bar.className = "actions";
  bar.append(button("Copier", () => copy(text)));
  return bar;
}

function button(label, onClick, className = "ghost small") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copié !");
  } catch {
    toast("Impossible de copier.");
  }
}

/* ---------- Mode cours LaTeX ---------- */

function latexTitle(tex) {
  const m = tex.match(/\\title\{([^}]*)\}/);
  return m ? m[1].replace(/\\\\/g, " ").replace(/\\[a-zA-Z]+/g, "").trim() : "Cours";
}

function renderLatexProgress(body, answer) {
  const tex = cleanLatex(answer);
  const lines = tex.split("\n").length;
  body.innerHTML = "";
  const card = document.createElement("div");
  card.className = "doc-card";
  const head = document.createElement("div");
  head.className = "doc-head";
  head.innerHTML = '<span class="doc-badge">.tex</span>';
  const title = document.createElement("strong");
  title.textContent = `Rédaction du cours… (${lines} lignes)`;
  head.append(title);
  const pre = document.createElement("pre");
  pre.className = "tex-code";
  pre.textContent = tex.split("\n").slice(-14).join("\n");
  card.append(head, pre);
  body.append(card);
}

function renderLatexDocument(body, answer) {
  const tex = cleanLatex(answer);
  const title = latexTitle(tex);
  const filename = `${title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cours"}.tex`;

  body.innerHTML = "";
  const card = document.createElement("div");
  card.className = "doc-card";

  const head = document.createElement("div");
  head.className = "doc-head";
  head.innerHTML = '<span class="doc-badge">.tex</span>';
  const t = document.createElement("strong");
  t.textContent = title;
  const meta = document.createElement("small");
  meta.textContent = `${tex.split("\n").length} lignes`;
  head.append(t, meta);

  const tabs = document.createElement("div");
  tabs.className = "doc-tabs";
  const pre = document.createElement("pre");
  pre.className = "tex-code full";
  pre.textContent = tex;
  const preview = document.createElement("div");
  preview.className = "pdf-preview";
  preview.hidden = true;

  const codeTab = button("Code LaTeX", () => showTab("code"), "tab");
  const pdfTab = button("Aperçu PDF", () => showTab("pdf"), "tab");
  codeTab.setAttribute("aria-selected", "true");
  pdfTab.setAttribute("aria-selected", "false");
  tabs.append(codeTab, pdfTab);

  let compiled = false;
  async function showTab(which) {
    codeTab.setAttribute("aria-selected", String(which === "code"));
    pdfTab.setAttribute("aria-selected", String(which === "pdf"));
    pre.hidden = which !== "code";
    preview.hidden = which !== "pdf";
    if (which === "pdf" && !compiled) {
      compiled = true;
      await compilePdf(tex, preview, () => { compiled = false; });
    }
  }

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(
    button("⬇ Télécharger .tex", () => download(tex, filename, "application/x-tex"), "primary small"),
    button("Ouvrir dans Overleaf", () => openInOverleaf(tex)),
    button("Copier", () => copy(tex)),
  );

  card.append(head, tabs, pre, preview, actions);
  body.append(card);
}

async function compilePdf(tex, container, onFail) {
  if (!state.latexAvailable) {
    container.innerHTML = "";
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "pdflatex n'est pas installé sur ce serveur. Utilise « Ouvrir dans Overleaf » pour compiler et voir le PDF, ou télécharge le fichier .tex.";
    container.append(p);
    onFail();
    return;
  }
  container.innerHTML = '<div class="typing"><span></span><span></span><span></span><em>Compilation du PDF…</em></div>';
  try {
    const res = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tex }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`${err.error || "Échec de la compilation."}${err.log ? `\n\n${err.log}` : ""}`);
    }
    const url = URL.createObjectURL(await res.blob());
    container.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.src = url;
    frame.title = "Aperçu du cours en PDF";
    const link = document.createElement("a");
    link.href = url;
    link.download = "cours.pdf";
    link.className = "ghost small";
    link.textContent = "⬇ Télécharger le PDF";
    container.append(frame, link);
  } catch (err) {
    container.innerHTML = "";
    const p = document.createElement("pre");
    p.className = "error";
    p.textContent = err.message;
    container.append(p);
    onFail();
  }
}

function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openInOverleaf(tex) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://www.overleaf.com/docs";
  form.target = "_blank";
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "encoded_snip";
  input.value = encodeURIComponent(tex);
  form.append(input);
  document.body.append(form);
  form.submit();
  form.remove();
}

/* ---------- Notifications ---------- */

let toastTimer;
function toast(text) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

resetChat();
