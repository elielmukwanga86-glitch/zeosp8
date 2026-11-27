'use strict';
const { esc, inline, text } = require('../lib/html');
const { ICON } = require('./layout');
const { renderBloc } = require('./blocs');

const pad = (n) => String(n).padStart(2, '0');

const GRILLE = [
  ['situer', 'Situer', [['contexte', 'Contexte'], ['organisation', 'Organisation'], ['problematique', 'Problématique'], ['objectifs', 'Objectifs']]],
  ['cadrer', 'Cadrer', [['besoins', 'Besoins'], ['contraintes', 'Contraintes'], ['solution', 'Solution retenue'], ['technologies', 'Technologies']]],
  ['realiser', 'Réaliser', [['etapes', 'Étapes'], ['actions', 'Ce que j’ai fait moi-même'], ['difficultes', 'Difficultés'], ['solutions', 'Solutions apportées']]],
  ['valider', 'Valider', [['tests', 'Tests réalisés'], ['resultats', 'Résultats'], ['ameliorations', 'Améliorations']]],
];

/** « Fiche de réalisation » : analyse en seize points et preuves des compétences du bloc 1. */
function ficheRealisation(p, referentiel, base) {
  if (!p.analyse) return null;
  const bloc1 = referentiel[0].competences.filter((c) => (p.competencesBts || []).includes(c.id));
  const lien = (cible) => (cible === 'pdf'
    ? `<a href="${base}assets/${esc(p.documents[0].fichier)}">${text(p.documents[0].titre)} (PDF)</a>`
    : null);
  const groupes = GRILLE.map(([cle, titre, champs]) => `              <div class="grille__col">
                <h3 class="grille__titre">${titre}</h3>
                <dl>
${champs.filter(([k]) => p.analyse[cle] && p.analyse[cle][k]).map(([k, l]) => `                  <div${k === 'actions' ? ' class="grille__moi"' : ''}><dt>${l}</dt><dd>${inline(p.analyse[cle][k])}</dd></div>`).join('\n')}
${cle === 'valider' ? `                  <div><dt>Compétences mobilisées</dt><dd>${bloc1.map((c) => c.code).join(', ') || '—'} (bloc 1)</dd></div>` : ''}
                </dl>
              </div>`).join('\n');
  const lignes = bloc1.map((c) => {
    const pr = (p.preuves || {})[c.id] || {};
    const ou = (pr.ou || []).map(([l, cible]) => lien(cible) || `<a href="#${esc(cible)}">${text(l)}</a>`).join(' · ');
    return `                  <tr><th scope="row"><span class="comp__code">${c.code}</span>${text(c.nom)}</th><td>${inline(pr.activite || '')}</td><td>${ou}</td></tr>`;
  }).join('\n');
  return {
    id: 'fiche', label: 'Fiche de réalisation',
    html: `          <section class="chapter" id="fiche" aria-labelledby="fiche-titre">
            <h2 class="chapter__head" id="fiche-titre" data-reveal><span class="chapter__n">00</span><span class="chapter__label">Fiche de réalisation</span><span class="chapter__title">La réalisation en seize points</span></h2>
            <div class="grille">
${groupes}
            </div>
            <h3 class="prose__h3">Compétences du bloc 1 et preuves</h3>
            <div class="table-wrap" tabindex="0" role="region" aria-label="Compétences du bloc 1 et preuves">
              <table class="table comp">
                <thead><tr><th scope="col">Compétence</th><th scope="col">Activité réalisée</th><th scope="col">Où le voir</th></tr></thead>
                <tbody>
${lignes}
                </tbody>
              </table>
            </div>
          </section>`,
  };
}

function projet(p, { referentiel, precedent, suivant }) {
  const base = '../';
  const doc = (p.documents || [])[0];
  const ctx = { base, figure: 0, projet: p, referentiel };

  const sections = p.sections.map((s, i) => `          <section class="chapter" id="${s.id}" aria-labelledby="${s.id}-titre">
            <h2 class="chapter__head" id="${s.id}-titre" data-reveal><span class="chapter__n">${pad(i + 1)}</span><span class="chapter__label">${text(s.label)}</span><span class="chapter__title">${inline(s.titre)}</span></h2>
            ${s.blocs.map((b) => renderBloc(b, ctx)).filter(Boolean).join('\n            ')}
          </section>`).join('\n\n');

  const fiche = ficheRealisation(p, referentiel, base);
  const toc = (fiche ? `            <li><a href="#fiche"><span class="toc__n">00</span>Fiche</a></li>\n` : '') + p.sections.map((s, i) => `            <li><a href="#${s.id}"><span class="toc__n">${pad(i + 1)}</span>${text(s.label)}</a></li>`).join('\n');

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
${fiche ? fiche.html + '\n\n' : ''}${sections}
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
