'use strict';
const { esc, inline, text } = require('../lib/html');
const { ICON } = require('./layout');
const { renderBloc } = require('./blocs');

const pad = (n) => String(n).padStart(2, '0');

function projet(p, { referentiel, precedent, suivant }) {
  const base = '../';
  const doc = (p.documents || [])[0];
  const ctx = { base, figure: 0, projet: p, referentiel };

  const sections = p.sections.map((s, i) => `          <section class="chapter" id="${s.id}" aria-labelledby="${s.id}-titre">
            <h2 class="chapter__head" id="${s.id}-titre" data-reveal><span class="chapter__n">${pad(i + 1)}</span><span class="chapter__label">${text(s.label)}</span><span class="chapter__title">${inline(s.titre)}</span></h2>
            ${s.blocs.map((b) => renderBloc(b, ctx)).filter(Boolean).join('\n            ')}
          </section>`).join('\n\n');

  const toc = p.sections.map((s, i) => `            <li><a href="#${s.id}"><span class="toc__n">${pad(i + 1)}</span>${text(s.label)}</a></li>`).join('\n');

  const download = doc ? `          <aside class="download" aria-label="Télécharger : ${esc(doc.titre)}">
            <svg class="download__doc" viewBox="0 0 80 100" aria-hidden="true"><path d="M14 8h40l18 18v68H14z"/><path d="M54 8v18h18"/><path d="M24 44h38M24 54h38M24 64h30M24 74h34"/><path d="M8 14v86h58" class="download__back"/></svg>
            <div>
              <p class="download__meta">${text(doc.titre)} · PDF, ${doc.pages} pages</p>
              <p class="download__title">${inline(doc.phrase)}</p>
              <p class="download__text">${inline(doc.description)}</p>
              <a class="btn btn--primary" href="${base}assets/${esc(doc.fichier)}" download>Télécharger le PDF <span class="btn__icon" aria-hidden="true">${ICON.download}</span></a>
            </div>
          </aside>` : '';

  const nav = [precedent && { p: precedent, label: 'Étude de cas précédente', dir: 'prev' }, suivant && { p: suivant, label: 'Étude de cas suivante', dir: 'next' }].filter(Boolean);

  return `    <header class="dochead" aria-labelledby="case-title">
      <div class="wrap">
        <a class="back" href="${base}index.html#realisations">${ICON.arrowLeft}Toutes les réalisations</a>
        <p class="runhead"><span>${pad(p.ordre)} · ${text(p.nom)}</span><span>${p.milieu === 'professionnel' ? 'En milieu professionnel' : 'En formation'} · ${text(p.cadre.type)}</span><span>${text(p.cadre.organisation)}</span><span>${text(p.cadre.periode)}</span></p>
        <div class="cols dochead__grid">
          <div class="cols__margin"><p class="dochead__num" aria-hidden="true">${pad(p.ordre)}</p></div>
          <div class="dochead__main">
            <h1 class="dochead__title" id="case-title">${text(p.titre)}</h1>
            <p class="dochead__deck">${inline(p.intro)}</p>
            ${doc ? `<div class="dochead__actions"><a class="btn btn--primary" href="${base}assets/${esc(doc.fichier)}" download>${text(doc.titre)} (PDF, ${doc.pages} pages) <span class="btn__icon" aria-hidden="true">${ICON.download}</span></a><a class="btn btn--line" href="#${p.sections[0].id}">Commencer la lecture <span class="btn__icon" aria-hidden="true">${ICON.arrowDown}</span></a></div>` : ''}
          </div>
        </div>
        <dl class="spec">
${p.fiche.map(([k, v]) => `          <div><dt>${text(k)}</dt><dd>${text(v)}</dd></div>`).join('\n')}
        </dl>
        <figure class="dochead__fig">
          <img src="${base}assets/${esc(p.visuel.src)}" width="${p.visuel.largeur}" height="${p.visuel.hauteur}" alt="${esc(p.visuel.alt)}" fetchpriority="high">
          <figcaption aria-hidden="true"><b>Couverture</b> — ${text(p.visuel.alt.replace(/^Illustration\s*:\s*(.)/, (_, c) => c.toUpperCase()))}</figcaption>
        </figure>
      </div>
    </header>

    <div class="section doc-body">
      <div class="wrap doc">
        <nav class="toc" aria-label="Sommaire de l’étude de cas">
          <p class="toc__label">Sommaire</p>
          <ol>
${toc}
          </ol>
        </nav>
        <div class="prose">
${sections}
${download}
        </div>
      </div>
    </div>

    <nav class="case-nav" aria-label="Autres réalisations">
      <div class="wrap next${nav.length > 1 ? ' next--two' : ''}">
${nav.map((n) => `        <a class="next__link next__link--${n.dir}" href="${n.p.slug}.html">
          <span class="next__label">${n.dir === 'prev' ? '← ' : ''}${n.label}${n.dir === 'next' ? ' →' : ''}</span>
          <span class="next__title">${text(n.p.titre)}</span>
          <span class="next__meta">${pad(n.p.ordre)} · ${text(n.p.nom)} · ${text(n.p.cadre.organisation)}</span>
        </a>`).join('\n')}
      </div>
    </nav>`;
}

module.exports = { projet };
