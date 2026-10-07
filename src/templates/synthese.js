'use strict';
const { esc, text } = require('../lib/html');
const { ICON } = require('./layout');

/** Tableau de synthèse : compétences du référentiel (lignes) × réalisations (colonnes). */
function synthese(site, projets, referentiel) {
  const head = projets.map((p) => {
    const name = p.page ? `<a href="projets/${p.slug}.html">${text(p.nom)}</a>` : text(p.nom);
    return `<th scope="col"><span class="synth__proj">${name}</span><span class="synth__ctx">${text([p.milieu === 'professionnel' ? 'Stage' : 'Formation', p.cadre.court].filter(Boolean).join(' · '))}</span></th>`;
  }).join('');

  const blocs = referentiel.map((bloc) => {
    const rows = bloc.competences.map((c) => {
      const cells = projets.map((p) => ((p.competencesBts || []).includes(c.id)
        ? '<td class="synth__yes"><span class="synth__dot" aria-hidden="true"></span><span class="sr-only">oui</span></td>'
        : '<td><span class="sr-only">non</span></td>')).join('');
      const count = projets.filter((p) => (p.competencesBts || []).includes(c.id)).length;
      return `              <tr${count ? '' : ' class="synth__empty"'}><th scope="row">${text(c.nom)}</th>${cells}</tr>`;
    }).join('\n');
    return `        <div class="synth__bloc" data-reveal>
          <h2 class="synth__title"><span class="label label--acc">${text(bloc.titre)}</span>${text(bloc.intitule)}</h2>
          <div class="table-wrap" tabindex="0" role="region" aria-label="${esc(bloc.titre)} : compétences par réalisation">
            <table class="table synth">
              <thead><tr><th scope="col">Compétence</th>${head}</tr></thead>
              <tbody>
${rows}
              </tbody>
            </table>
          </div>
        </div>`;
  }).join('\n');

  return `    <section class="case-hero dark synth-hero" aria-labelledby="case-title">
      <div class="wrap">
        <a class="case-hero__back label" href="index.html#realisations">${ICON.arrowLeft}Accueil</a>
        <p class="case-hero__meta label"><span>Référentiel BTS SIO</span><span>Option SISR</span><span>${text(site.formation.promotion)}</span></p>
        <h1 class="case-hero__title display" id="case-title" data-lines><span class="mask"><span>Tableau de synthèse</span></span></h1>
        <p class="case-hero__text">Mes réalisations, en stage et en formation, rapportées aux compétences du référentiel du BTS SIO : bloc 1 (commun aux deux options) et bloc 2 (option SISR). Je complète ce tableau au fil de l’année, à chaque nouvelle réalisation.</p>
      </div>
    </section>

    <section class="section paper synth-page">
      <div class="wrap">
${blocs}
        <p class="synth__legend"><span class="synth__dot" aria-hidden="true"></span>Compétence mobilisée dans la réalisation. Les lignes grisées n’ont pas encore de réalisation associée.</p>
      </div>
    </section>`;
}

/** Error page, served by GitHub Pages for unknown URLs. */
function erreur() {
  return `    <section class="notfound dark" aria-labelledby="nf-title">
      <div class="wrap">
        <p class="label label--acc">Erreur 404</p>
        <h1 class="display notfound__title" id="nf-title">Hôte injoignable.</h1>
        <pre class="code"><span class="k">ping</span> cette-page
Délai d’attente dépassé pour icmp_seq 0
Délai d’attente dépassé pour icmp_seq 1
--- 2 paquets transmis, 0 reçu, <span class="k">100 % de perte</span> ---

<span class="k">ping</span> accueil
réponse de accueil : icmp_seq=0 <span class="ok">ttl=64 temps=1 ms</span></pre>
        <p class="notfound__text">La page demandée n’existe pas ou a été déplacée. L’accueil, lui, répond.</p>
        <a class="btn btn--primary" href="index.html" data-home>Revenir à l’accueil <span class="btn__icon" aria-hidden="true">${ICON.arrowRight}</span></a>
      </div>
    </section>`;
}

module.exports = { synthese, erreur };
