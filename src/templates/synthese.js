'use strict';
const { esc, text } = require('../lib/html');
const { ICON } = require('./layout');

/**
 * Tableau de synthèse au format de l’annexe 6-1 (épreuve E4) : une ligne par réalisation,
 * classée « en cours de formation » ou « en milieu professionnel » (1re / 2de année),
 * une colonne par compétence. Le bloc 2 (épreuve E5) suit la même présentation.
 */
const RUBRIQUES = [
  { id: 'formation', titre: 'Réalisations en cours de formation' },
  { id: 'pro1', titre: 'Réalisations en milieu professionnel en cours de première année' },
  { id: 'pro2', titre: 'Réalisations en milieu professionnel en cours de seconde année' },
];

function rubrique(p) {
  if (p.milieu === 'formation') return 'formation';
  return p.anneeBts === 2 ? 'pro2' : 'pro1';
}

function productions(p) {
  const items = [];
  if (p.page) items.push(`<li><a href="projets/${p.slug}.html">Étude de cas en ligne</a></li>`);
  for (const d of p.documents || []) items.push(`<li><a href="assets/${esc(d.fichier)}">${text(d.titre)} (PDF, ${d.pages} pages)</a></li>`);
  for (const x of p.productions || []) items.push(`<li>${text(x)}</li>`);
  return items.length ? `<ul class="synth__docs">${items.join('')}</ul>` : '';
}

function tableau(bloc, projets) {
  const comps = bloc.competences;
  const has = (p, c) => (p.competencesBts || []).includes(c.id);
  const concernes = projets.filter((p) => comps.some((c) => has(p, c)));
  const cols = comps.length + 2;
  const body = RUBRIQUES.map((r) => {
    const rows = concernes.filter((p) => rubrique(p) === r.id).map((p) => {
      const cells = comps.map((c) => (has(p, c)
        ? '<td class="synth__yes"><span class="synth__dot" aria-hidden="true"></span><span class="sr-only">oui</span></td>'
        : '<td><span class="sr-only">non</span></td>')).join('');
      return `              <tr><th scope="row"><span class="synth__proj">${text(p.titre)}</span><span class="synth__ctx">${text([p.nom, p.cadre.organisation].filter(Boolean).join(' · '))}</span>${productions(p)}</th><td class="synth__per">${text((p.synthese && p.synthese.periode) || p.cadre.periode || '')}</td>${cells}</tr>`;
    });
    if (!rows.length) rows.push(`              <tr class="synth__none"><td colspan="${cols}">Aucune réalisation pour l’instant.</td></tr>`);
    return `              <tr class="synth__group"><th scope="rowgroup" colspan="${cols}">${text(r.titre)}</th></tr>\n${rows.join('\n')}`;
  }).join('\n');

  const counts = comps.map((c) => concernes.filter((p) => has(p, c)).length);
  return `        <div class="synth__bloc" data-reveal>
          <h2 class="synth__title"><span class="label label--acc">${text(bloc.titre)} · ${text(bloc.epreuve)}</span>${text(bloc.intitule)}</h2>
          <div class="table-wrap" tabindex="0" role="region" aria-label="${esc(bloc.titre)} : réalisations et compétences mises en œuvre">
            <table class="table synth synth--${comps.length}">
              <thead><tr><th scope="col">Réalisations professionnelles<small>intitulé, documents et productions</small></th><th scope="col">Période</th>${comps.map((c, i) => `<th scope="col"${counts[i] ? '' : ' class="synth__zero"'}>${text(c.nom)}</th>`).join('')}</tr></thead>
              <tbody>
${body}
              </tbody>
            </table>
          </div>${comps.some((c) => c.activites) ? `
          <details class="synth__detail">
            <summary>Activités de chaque compétence (référentiel)</summary>
            <dl>
${comps.map((c) => `              <div><dt>${text(c.nom)}</dt><dd><ul>${c.activites.map((a) => `<li>${text(a)}</li>`).join('')}</ul></dd></div>`).join('\n')}
            </dl>
          </details>` : ''}
        </div>`;
}

function synthese(site, projets, referentiel) {
  const f = site.formation;
  const fiche = [
    ['Nom et prénom', `${site.nomFamille.toUpperCase()} ${site.prenom}`],
    ['Centre de formation', `${f.ecole}, ${f.ville}`],
    ['Option', `${f.option} — ${f.optionLong}`],
    ['Adresse URL du portfolio', site.url ? `<a href="${esc(site.url)}">${text(site.url.replace(/^https?:\/\//, ''))}</a>` : 'à venir'],
  ];
  return `    <section class="case-hero dark synth-hero" aria-labelledby="case-title">
      <div class="wrap">
        <a class="case-hero__back label" href="index.html#realisations">${ICON.arrowLeft}Accueil</a>
        <p class="case-hero__meta label"><span>BTS SIO</span><span>Option ${text(f.option)}</span><span>${text(f.promotion)}</span></p>
        <h1 class="case-hero__title display" id="case-title" data-lines><span class="mask"><span>Tableau de synthèse</span></span></h1>
        <p class="case-hero__text">Tableau de synthèse des réalisations professionnelles, présenté comme l’annexe 6‑1 de l’épreuve E4 : mes réalisations en cours de formation et en milieu professionnel, et les compétences du référentiel mises en œuvre. Je le complète au fil de l’année.</p>
        <dl class="spec synth-hero__fiche">
${fiche.map(([k, v]) => `          <div><dt class="label">${text(k)}</dt><dd>${v.startsWith('<a') ? v : text(v)}</dd></div>`).join('\n')}
        </dl>
      </div>
    </section>

    <section class="section paper synth-page">
      <div class="wrap">
${referentiel.map((b) => tableau(b, projets)).join('\n')}
        <p class="synth__legend"><span class="synth__dot" aria-hidden="true"></span>Compétence mise en œuvre dans la réalisation.</p>
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
