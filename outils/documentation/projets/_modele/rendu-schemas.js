// Rend les figures de schemas.html en PNG dans img/ (lancé par generer.sh si besoin).
// Lister ici les id des éléments à capturer. Figures : 1000 px de large, rendues ×3.
// Couverture : 794 × 1123 px, rendue ×2,5. Usage manuel : node rendu-schemas.js
require('../../lib/capture-schemas')(__dirname, [
  { ids: ['schema'], viewport: { width: 1100, height: 3200 }, scale: 3 },
  { ids: ['cover'], viewport: { width: 900, height: 1200 }, scale: 2.5 },
]).catch((e) => { console.error(e.message); process.exit(1); });
