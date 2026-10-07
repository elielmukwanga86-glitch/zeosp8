'use strict';
const { esc, inline, text } = require('../lib/html');
const { ICON } = require('./layout');
const { renderBloc } = require('./blocs');

const pad = (n) => String(n).padStart(2, '0');

function projet(p, { referentiel, precedent, suivant }) {
  const base = '../';
  const doc = (p.documents || [])[0];
  const ctx = { base, figure: 0, projet: p, referentiel };

  const sections = p.sections.map((s, i) => `          <section id="${s.id}" aria-labelledby="${s.id}-titre">
            <h2 id="${s.id}-titre" data-reveal><span class="label">${pad(i + 1)} — ${text(s.label)}</span>${inline(s.titre)}</h2>
            ${s.blocs.map((b) => renderBloc(b, ctx)).filter(Boolean).join('\n            ')}
          </section>`).join('\n\n');

  const toc = p.sections.map((s, i) => `            <li><a href="#${s.id}"><span class="mono">${pad(i + 1)}</span>${text(s.label)}</a></li>`).join('\n');

  const download = doc ? `          <aside class="download" aria-label="Télécharger : ${esc(doc.titre)}">
            <div>
              <p class="label">${text(doc.titre)} · PDF, ${doc.pages} pages</p>
              <p class="download__title">${inline(doc.phrase)}</p>
              <p class="download__text">${inline(doc.description)}</p>
            </div>
            <a class="btn btn--primary" href="${base}assets/${esc(doc.fichier)}" download data-dir="down">Télécharger le PDF <span class="btn__icon" aria-hidden="true">${ICON.download}</span></a>
          </aside>` : '';

  const nav = [precedent && { p: precedent, label: 'Projet précédent', dir: 'prev' }, suivant && { p: suivant, label: 'Projet suivant', dir: 'next' }].filter(Boolean);

  return `    <section class="case-hero dark" aria-labelledby="case-title">
      <div class="wrap case-hero__grid">
        <a class="case-hero__back label" href="${base}index.html#realisations">${ICON.arrowLeft}Toutes les réalisations</a>
        <p class="case-hero__meta label"><span>${pad(p.ordre)} · ${text(p.nom)}</span><span>${p.milieu === 'professionnel' ? 'En milieu professionnel' : 'En formation'} · ${text(p.cadre.type)}</span><span>${text(p.cadre.organisation)}</span><span>${text(p.cadre.periode)}</span></p>
        <h1 class="case-hero__title display" id="case-title" data-lines><span class="mask"><span>${text(p.titre)}</span></span></h1>
        <p class="case-hero__text">${inline(p.intro)}</p>
        ${doc ? `<div class="case-hero__actions"><a class="btn btn--primary" href="${base}assets/${esc(doc.fichier)}" download data-dir="down">${text(doc.titre)} (PDF) <span class="btn__icon" aria-hidden="true">${ICON.download}</span></a></div>` : ''}
        <dl class="spec">
${p.fiche.map(([k, v]) => `          <div><dt class="label">${text(k)}</dt><dd>${text(v)}</dd></div>`).join('\n')}
        </dl>
      </div>
      <div class="case-hero__visual"><img src="${base}assets/${esc(p.visuel.src)}" width="${p.visuel.largeur}" height="${p.visuel.hauteur}" alt="${esc(p.visuel.alt)}"></div>
    </section>

    <section class="section paper">
      <div class="wrap case">
        <nav class="toc" aria-label="Sommaire de l’étude de cas">
          <p class="label toc__label">Sommaire</p>
          <ol>
${toc}
          </ol>
        </nav>
        <div class="prose">
${sections}
${download}
        </div>
      </div>
    </section>

    <nav class="dark case-nav" aria-label="Autres réalisations">
      <div class="wrap next${nav.length > 1 ? ' next--two' : ''}">
${nav.map((n) => `        <a class="next__link next__link--${n.dir}" href="${n.p.slug}.html">
          <span class="label">${n.label}</span>
          <span class="next__title">${n.dir === 'prev' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12H4M10 5l-7 7 7 7"/></svg>' : ''}${text(n.p.titre)}${n.dir === 'next' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17M14 5l7 7-7 7"/></svg>' : ''}</span>
        </a>`).join('\n')}
      </div>
    </nav>`;
}

module.exports = { projet };
