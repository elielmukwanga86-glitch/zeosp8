#!/usr/bin/env node
'use strict';
/**
 * Generates the static site into docs/ (published by GitHub Pages) from:
 *   src/contenu/site.js           general content
 *   src/contenu/referentiel.js    BTS SIO competencies
 *   src/contenu/projets/*.js      one file per réalisation
 *   src/assets/                   css, js, images, PDF (copied as is)
 *
 * Usage: node src/build.js   (no dependency, Node 18+)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');

const site = require('./contenu/site');
const referentiel = require('./contenu/referentiel');
const { layout } = require('./templates/layout');
const { home } = require('./templates/home');
const { projet } = require('./templates/projet');
const { synthese, erreur } = require('./templates/synthese');

// ---------- Load and check projects ----------
const projDir = path.join(SRC, 'contenu', 'projets');
const projets = fs.readdirSync(projDir)
  .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
  .map((f) => require(path.join(projDir, f)))
  .sort((a, b) => a.ordre - b.ordre);

const errors = [];
const competenceIds = new Set(referentiel.flatMap((b) => b.competences.map((c) => c.id)));
const slugs = new Set();
for (const p of projets) {
  const where = `projet « ${p.slug || '?'} »`;
  if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) errors.push(`${where} : slug manquant ou invalide (minuscules, chiffres, tirets).`);
  if (slugs.has(p.slug)) errors.push(`${where} : slug en double.`);
  slugs.add(p.slug);
  for (const key of ['ordre', 'nom', 'titre', 'cadre']) if (p[key] === undefined) errors.push(`${where} : champ « ${key} » manquant.`);
  if (!['professionnel', 'formation'].includes(p.milieu)) errors.push(`${where} : champ « milieu » à renseigner ('professionnel' ou 'formation').`);
  if (p.milieu === 'professionnel' && ![1, 2].includes(p.anneeBts)) errors.push(`${where} : champ « anneeBts » à renseigner (1 ou 2) pour une réalisation en stage.`);
  for (const id of p.competencesBts || []) if (!competenceIds.has(id)) errors.push(`${where} : compétence inconnue « ${id} » (voir contenu/referentiel.js).`);
  if (p.page) {
    for (const key of ['accroche', 'resume', 'intro', 'description', 'visuel', 'chiffres', 'technologies', 'fiche', 'sections']) {
      if (p[key] === undefined) errors.push(`${where} : champ « ${key} » manquant (requis pour une page).`);
    }
    const files = [p.visuel && p.visuel.src, ...(p.documents || []).map((d) => d.fichier),
      ...(p.sections || []).flatMap((s) => s.blocs.filter((b) => b.figure).map((b) => b.figure.src))].filter(Boolean);
    for (const f of files) if (!fs.existsSync(path.join(SRC, 'assets', f))) errors.push(`${where} : fichier introuvable src/assets/${f}`);
  } else if (!p.details) {
    errors.push(`${where} : champ « details » manquant (réalisation sans page).`);
  }
}
for (const e of site.parcours) if (e.projet && !slugs.has(e.projet)) errors.push(`parcours « ${e.titre} » : projet inconnu « ${e.projet} ».`);
for (const d of site.competences) for (const it of d.items) for (const c of it.contextes || []) {
  if (!slugs.has(c)) errors.push(`compétence « ${it.nom} » : réalisation inconnue « ${c} ».`);
}
// Never publish internal addresses: only fictitious/public ones or masked ones (x.x) are allowed in content.
const ALLOWED_IP = /^(192\.168\.(10|20)\.\d+|192\.168\.1\.[12]|192\.0\.0\.\d|1\.1\.1\.1)$/;
const contentText = JSON.stringify(projets) + JSON.stringify(site);
for (const m of contentText.matchAll(/(?<![\d.])(\d{1,3}(?:\.\d{1,3}){3})(?![\d.])/g)) {
  if (!ALLOWED_IP.test(m[1].replace(/\/\d+$/, ''))) errors.push(`adresse IP non masquée dans le contenu : ${m[1]} (écrire par ex. 192.168.x.x)`);
}
if (errors.length) {
  console.error('Le site n’a pas été généré :\n- ' + errors.join('\n- '));
  process.exit(1);
}

// ---------- Output ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'projets'), { recursive: true });
fs.cpSync(path.join(SRC, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const write = (rel, html) => { fs.writeFileSync(path.join(OUT, rel), html); console.log('  docs/' + rel); };
const titreSite = `${site.nom} · Portfolio BTS SIO SISR`;

write('index.html', layout({
  site, base: '', chemin: '', page: 'home',
  titre: titreSite, description: site.description,
  scripts: ['topology', 'main'],
  contenu: home(site, projets),
}));

const pages = projets.filter((p) => p.page);
pages.forEach((p, i) => {
  write(`projets/${p.slug}.html`, layout({
    site, base: '../', chemin: `projets/${p.slug}.html`, page: 'projet', courant: 'realisations',
    titre: `${p.titre} · ${site.nom}`, description: p.description, lightbox: true,
    contenu: projet(p, { referentiel, precedent: pages[i - 1], suivant: pages[i + 1] }),
  }));
});

write('synthese.html', layout({
  site, base: '', chemin: 'synthese.html', page: 'synthese', courant: 'synthese',
  titre: `Tableau de synthèse · ${site.nom}`,
  description: `Réalisations d’${site.nom} rapportées aux compétences du référentiel BTS SIO (blocs 1 et 2, option SISR).`,
  contenu: synthese(site, projets, referentiel),
}));

// 404: GitHub Pages serves it for any unknown path, so links must resolve from the site root.
// With site.url the base path is known at build time; otherwise it is guessed on *.github.io (/<dépôt>/).
function baseFor404() {
  if (site.url) return `<base href="${new URL(site.url).pathname.replace(/\/?$/, '/')}">`;
  return `<script>(function(){if(!/\\.github\\.io$/.test(location.hostname))return;var s=location.pathname.split('/')[1];document.write('<base href="/'+(s&&s.indexOf('.')<0?s+'/':'')+'">')})()</script>`;
}
const notFound = layout({
  site, base: '', page: 'erreur', titre: `Page introuvable · ${site.nom}`,
  description: 'Page introuvable.', contenu: erreur(),
}).replace('<head>\n', `<head>\n  ${baseFor404()}\n  <meta name="robots" content="noindex">\n`);
write('404.html', notFound);

if (site.url) {
  const u = site.url.replace(/\/?$/, '/');
  const urls = ['', 'synthese.html', ...pages.map((p) => `projets/${p.slug}.html`)];
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((x) => `  <url><loc>${u}${x}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${u}sitemap.xml\n`);
  console.log('  docs/sitemap.xml, docs/robots.txt');
}

console.log(`Site généré : ${projets.length} réalisations (${pages.length} pages).`);
