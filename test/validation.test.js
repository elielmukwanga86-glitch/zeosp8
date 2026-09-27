import { test } from "node:test";
import assert from "node:assert/strict";
import { validateChatRequest, buildMessages } from "../validation.js";

const ok = { mode: "resoudre", subject: "Mathématiques", level: "Terminale", messages: [{ role: "user", text: "2+2 ?" }] };

test("accepte une requête valide", () => {
  assert.equal(validateChatRequest(ok), null);
});

test("refuse un mode inconnu", () => {
  assert.match(validateChatRequest({ ...ok, mode: "hack" }), /Mode/);
});

test("refuse des rôles qui n'alternent pas", () => {
  const messages = [{ role: "user", text: "a" }, { role: "user", text: "b" }];
  assert.ok(validateChatRequest({ ...ok, messages }));
});

test("refuse un dernier message de l'assistant", () => {
  const messages = [{ role: "user", text: "a" }, { role: "assistant", text: "b" }];
  assert.ok(validateChatRequest({ ...ok, messages }));
});

test("refuse un type de fichier non pris en charge", () => {
  const messages = [{ role: "user", text: "", files: [{ type: "text/html", data: "x" }] }];
  assert.match(validateChatRequest({ ...ok, messages }), /Type de fichier/);
});

test("accepte une image seule", () => {
  const messages = [{ role: "user", text: "", files: [{ type: "image/png", data: "iVBOR" }] }];
  assert.equal(validateChatRequest({ ...ok, messages }), null);
});

test("ajoute le contexte au premier message et convertit les fichiers", () => {
  const out = buildMessages({
    ...ok,
    messages: [
      { role: "user", text: "Exercice", files: [{ type: "application/pdf", data: "JVBER" }] },
      { role: "assistant", text: "Réponse" },
      { role: "user", text: "Et ensuite ?" },
    ],
  });
  assert.equal(out[0].content[0].type, "document");
  assert.equal(out[0].content[1].text, "Matière : Mathématiques — Niveau : Terminale\n\nExercice");
  assert.deepEqual(out[1], { role: "assistant", content: "Réponse" });
  assert.equal(out[2].content[0].text, "Et ensuite ?");
});
