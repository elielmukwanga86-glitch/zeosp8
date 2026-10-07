// =====================================================================
// verifier-ip.js — refuse les adresses IPv4 complètes dans les sources d'un projet masqué
// =====================================================================
// Usage : node lib/verifier-ip.js <fichier> [<fichier>…]
//
// Le dépôt est public : masquer les IP dans le PDF ne suffit pas, les sources
// (contenu.js, schemas.html) ne doivent contenir que des adresses déjà masquées
// (192.168.x.x). Les figures PNG sont rendues depuis schemas.html sans masquage
// automatique : c'est ici qu'une adresse oubliée serait repérée.
// Sont tolérés : adresses masquées, masques de sous-réseau, 0.0.0.0, DNS publics
// connus (1.1.1.1, 8.8.8.8…), OID et numéros de version (voir maskIPv4 dans doc-lib.js).
// Code de sortie 1 si une adresse complète est trouvée.
// =====================================================================
const fs = require('fs');
const { maskIPv4, IPV4 } = require('./doc-lib');

let found = 0;
for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file)) continue;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(IPV4)) {
      if (maskIPv4(m[0]) !== m[0]) {
        found += 1;
        console.error(`${file}:${i + 1}: adresse IP complète « ${m[0]} » (écrire ${maskIPv4(m[0])})`);
      }
    }
  });
}
process.exit(found ? 1 : 0);
