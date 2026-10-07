// Rend les figures de schemas.html en PNG dans img/ (lancé par generer.sh si besoin).
// Usage manuel : node rendu-schemas.js
require('../../lib/capture-schemas')(__dirname, [
  { ids: ['apres', 'avant'], viewport: { width: 1100, height: 2600 }, scale: 3 },
  { ids: ['cover'], viewport: { width: 900, height: 1200 }, scale: 2.5 },
]).catch((e) => { console.error(e.message); process.exit(1); });
