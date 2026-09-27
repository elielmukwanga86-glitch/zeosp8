import { MODES } from "./prompts.js";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const PDF_TYPE = "application/pdf";

const MAX_MESSAGES = 40;
const MAX_TEXT = 20_000;
const MAX_FILES = 5;

// Vérifie la forme de la requête envoyée par le navigateur.
// Retourne un message d'erreur, ou null si tout est correct.
export function validateChatRequest(body) {
  if (!body || typeof body !== "object") return "Requête invalide.";
  const { mode, subject, level, messages } = body;

  if (!MODES.includes(mode)) return "Mode inconnu.";
  for (const [name, value] of [["subject", subject], ["level", level]]) {
    if (value !== undefined && (typeof value !== "string" || value.length > 100)) {
      return `Champ ${name} invalide.`;
    }
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return "Historique de conversation invalide.";
  }

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const expectedRole = i % 2 === 0 ? "user" : "assistant";
    if (!m || m.role !== expectedRole) return "Les messages doivent alterner élève / assistant.";
    if (typeof m.text !== "string" || m.text.length > (m.role === "assistant" ? 200_000 : MAX_TEXT)) {
      return "Message trop long ou invalide.";
    }
    if (m.role === "assistant" && m.text.trim() === "") return "Réponse précédente vide.";

    const files = m.files ?? [];
    if (!Array.isArray(files) || files.length > MAX_FILES || (m.role === "assistant" && files.length)) {
      return "Pièces jointes invalides.";
    }
    for (const f of files) {
      if (!f || typeof f.data !== "string" || !(IMAGE_TYPES.includes(f.type) || f.type === PDF_TYPE)) {
        return "Type de fichier non pris en charge (images JPEG/PNG/GIF/WebP ou PDF).";
      }
    }
    if (m.role === "user" && m.text.trim() === "" && files.length === 0) {
      return "Le message est vide.";
    }
  }
  if (messages.at(-1).role !== "user") return "Le dernier message doit venir de l'élève.";
  return null;
}

// Transforme l'historique du navigateur en messages pour l'API Claude.
// Le contexte (matière, niveau) est ajouté au premier message de l'élève pour
// garder le prompt système identique d'une requête à l'autre.
export function buildMessages({ subject, level, messages }) {
  return messages.map((m, i) => {
    if (m.role === "assistant") return { role: "assistant", content: m.text };

    const content = (m.files ?? []).map((f) =>
      f.type === PDF_TYPE
        ? { type: "document", source: { type: "base64", media_type: PDF_TYPE, data: f.data } }
        : { type: "image", source: { type: "base64", media_type: f.type, data: f.data } },
    );

    let text = m.text.trim() || "Voici l'énoncé en pièce jointe.";
    if (i === 0) {
      const context = [
        subject && `Matière : ${subject}`,
        level && `Niveau : ${level}`,
      ].filter(Boolean);
      if (context.length) text = `${context.join(" — ")}\n\n${text}`;
    }
    content.push({ type: "text", text });
    return { role: "user", content };
  });
}
