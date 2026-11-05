#!/usr/bin/env node
// Hook PreToolUse (Edit, Write, MultiEdit) propre à ce portfolio.
// Inspiré des hooks « garde-fous » d’ECC (https://github.com/affaan-m/ECC), réécrit pour ce dépôt.
//  1. Refuse toute modification manuelle de docs/ : ce dossier est généré par `node src/build.js`.
//  2. Refuse d’écrire une adresse IPv4 non masquée dans src/ ou outils/ (dépôt public).
//     Même liste blanche que src/build.js (plan fictif du cas Cloison, 1.1.1.1…).
// Code de sortie 2 = l’outil est bloqué et le message est renvoyé à Claude.
const path = require('path');

const ALLOWED_IP = /^(192\.168\.(10|20)\.\d+|192\.168\.1\.[12]|192\.0\.0\.\d|1\.1\.1\.1)$/;

let brut = '';
process.stdin.on('data', (c) => (brut += c));
process.stdin.on('end', () => {
  let entree;
  try { entree = JSON.parse(brut); } catch { process.exit(0); }
  const outil = entree.tool_input || {};
  const fichier = outil.file_path;
  if (!fichier) process.exit(0);

  const racine = process.env.CLAUDE_PROJECT_DIR || entree.cwd || process.cwd();
  const relatif = path.relative(racine, path.resolve(racine, fichier)).split(path.sep).join('/');

  if (relatif === 'docs' || relatif.startsWith('docs/')) {
    console.error(`Bloqué : ${relatif} est généré. Modifier les sources dans src/ puis lancer « node src/build.js ».`);
    process.exit(2);
  }

  if (/^(src|outils)\//.test(relatif)) {
    const textes = [outil.content, outil.new_string, ...(outil.edits || []).map((e) => e.new_string)]
      .filter((t) => typeof t === 'string');
    const fautives = new Set();
    for (const t of textes) {
      for (const m of t.matchAll(/(?<![\d.])(\d{1,3}(?:\.\d{1,3}){3})(?![\d.])/g)) {
        if (!ALLOWED_IP.test(m[1])) fautives.add(m[1]);
      }
    }
    if (fautives.size) {
      console.error(`Bloqué : adresse(s) IP non masquée(s) dans ${relatif} : ${[...fautives].join(', ')}. ` +
        'Masquer les deux derniers octets (x.x) ; la plage de la mairie s’écrit 172.x.x.x (voir CLAUDE.md).');
      process.exit(2);
    }
  }
  process.exit(0);
});
