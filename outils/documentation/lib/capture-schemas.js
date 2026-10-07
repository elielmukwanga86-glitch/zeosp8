// =====================================================================
// capture-schemas.js — rend les figures HTML/SVG d'un projet en PNG (Playwright)
// =====================================================================
// Appelé par projets/<projet>/rendu-schemas.js :
//
//   require('../../lib/capture-schemas')(__dirname, [
//     { ids: ['arch', 'snmp'], viewport: { width: 1100, height: 3200 }, scale: 3 },
//     { ids: ['cover'], viewport: { width: 900, height: 1200 }, scale: 2.5 },
//   ]);
//
// Chaque élément HTML d'id <id> de schemas.html devient img/<id>.png.
// Les polices sont chargées en local (@font-face vers ../../fonts) : aucun accès réseau.
// =====================================================================
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function loadPlaywright() {
  const candidates = ['playwright'];
  try { candidates.push(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) { /* npm absent */ }
  candidates.push('/opt/node22/lib/node_modules/playwright');
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* suivant */ }
  }
  throw new Error('Playwright est introuvable : npm install -g playwright && npx playwright install chromium');
}

module.exports = async function captureSchemas(dir, groups, { html = 'schemas.html', out = 'img' } = {}) {
  const { chromium } = loadPlaywright();
  const outDir = path.join(dir, out);
  fs.mkdirSync(outDir, { recursive: true });
  const url = 'file://' + path.join(dir, html);
  const browser = await chromium.launch();
  try {
    for (const g of groups) {
      const page = await browser.newPage({ viewport: g.viewport || { width: 1100, height: 3200 }, deviceScaleFactor: g.scale || 3 });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      for (const id of g.ids) {
        const file = path.join(outDir, `${id}.png`);
        await page.locator('#' + id).screenshot({ path: file });
        console.log('figure', path.relative(dir, file));
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
};
