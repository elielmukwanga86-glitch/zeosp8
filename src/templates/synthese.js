'use strict';
const { esc, inline, text } = require('../lib/html');
const { ICON } = require('./layout');

/**
 * Tableau de synthèse au format de l’annexe 6-1 (épreuve E5) : une ligne par réalisation,
 * classée « en cours de formation » ou « en milieu professionnel » (1re / 2de année),
 * une colonne par compétence. Le bloc 2 (option SISR) suit la même présentation.
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
          <h2 class="synth__title"><span class="synth__kicker">${text(bloc.titre)} · ${text(bloc.epreuve)}</span>${text(bloc.intitule)}</h2>
          <p class="synth__hint" aria-hidden="true">Tableau large : faites-le défiler horizontalement →</p>
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
  return `    <header class="dochead synth-head" aria-labelledby="case-title">
      <div class="wrap">
        <a class="back" href="index.html#realisations">${ICON.arrowLeft}Accueil</a>
        <p class="runhead"><span>Annexe A</span><span>BTS SIO</span><span>Option ${text(f.option)}</span><span>Promotion ${text(f.promotion)}</span></p>
        <div class="cols dochead__grid">
          <div class="cols__margin"><p class="dochead__num" aria-hidden="true">A</p></div>
          <div class="dochead__main">
            <h1 class="dochead__title" id="case-title">Tableau de synthèse</h1>
            <p class="dochead__deck">Tableau de synthèse des réalisations professionnelles, présenté comme l’annexe VI‑1 de l’épreuve E5 : mes réalisations en cours de formation et en milieu professionnel, les compétences du référentiel mises en œuvre et, pour chacune, l’activité réalisée et ses preuves. Je le complète au fil de l’année.</p>
          </div>
        </div>
        <dl class="form-fiche">
${fiche.map(([k, v]) => `          <div><dt>${text(k)}</dt><dd>${v.startsWith('<a') ? v : text(v)}</dd></div>`).join('\n')}
        </dl>
      </div>
    </header>

    <div class="section synth-page">
      <div class="wrap">
${couverture(site, projets, referentiel[0])}${referentiel.map((b) => tableau(b, projets)).join('\n')}
        <p class="synth__legend"><span class="synth__dot" aria-hidden="true"></span>Compétence mise en œuvre dans la réalisation.</p>
      </div>
    </div>`;
}

/** Couverture des six compétences du bloc 1 : pour chacune, les réalisations, l’activité et les preuves. */
function couverture(site, projets, bloc) {
  const lien = (p, cible, label) => {
    if (cible === 'pdf') return `<a href="assets/${esc(p.documents[0].fichier)}">${text(p.documents[0].titre)} (PDF)</a>`;
    return p.page ? `<a href="projets/${p.slug}.html#${esc(cible)}">${text(label)}</a>` : text(label);
  };
  const cartes = bloc.competences.map((c) => {
    const rs = projets.filter((p) => (p.competencesBts || []).includes(c.id));
    const items = rs.map((p) => {
      const pr = (p.preuves || {})[c.id] || {};
      const ou = (pr.ou || []).map(([l, cible]) => lien(p, cible, l));
      if (!ou.length) ou.push(p.page ? `<a href="projets/${p.slug}.html#fiche">Fiche de réalisation</a>` : '<a href="index.html#realisations">Autres réalisations</a>');
      return `              <li><span class="couv__proj">${text(p.nom)}</span> ${inline(pr.activite || '')}<span class="couv__ou">${ou.join(' · ')}</span></li>`;
    }).join('\n');
    const prevu = (site.aCouvrir || {})[c.id];
    return `          <div class="couv__carte${rs.length ? '' : ' couv__carte--vide'}">
            <h3 class="couv__titre"><span class="couv__code">${c.code}</span>${text(c.nom)}</h3>
            <p class="couv__etat">${rs.length ? `${rs.length} réalisation${rs.length > 1 ? 's' : ''}` : 'Pas encore couverte'}</p>
            ${rs.length ? `<ul class="couv__liste">\n${items}\n            </ul>` : `<p class="couv__prevu">${inline(prevu || 'Aucune réalisation pour l’instant.')}</p>`}
          </div>`;
  }).join('\n');
  const n = bloc.competences.filter((c) => projets.some((p) => (p.competencesBts || []).includes(c.id))).length;
  return `        <section class="couv" aria-labelledby="couv-titre" data-reveal>
          <h2 class="synth__title" id="couv-titre"><span class="synth__kicker">${text(bloc.titre)} · ${text(bloc.epreuve)} · ${n} compétences sur ${bloc.competences.length} couvertes</span>Couverture des six compétences</h2>
          <p class="couv__intro">Pour chaque compétence : les réalisations où je l’ai mise en œuvre, l’activité réalisée et où en trouver la preuve. Une compétence n’est cochée que si une réalisation la prouve.</p>
          <div class="couv__grille">
${cartes}
          </div>
        </section>
`;
}

/** Error page, served by GitHub Pages for unknown URLs. */
function erreur() {
  return `    <section class="notfound" aria-labelledby="nf-title">
      <div class="wrap cols">
        <div class="cols__margin"><p class="dochead__num" aria-hidden="true">404</p></div>
        <div class="notfound__main">
          <p class="runhead"><span>Erreur 404</span><span>Page introuvable</span></p>
          <h1 class="dochead__title notfound__title" id="nf-title">Hôte injoignable.</h1>
          <pre class="code"><span class="k">ping</span> cette-page
Délai d’attente dépassé pour icmp_seq 0
Délai d’attente dépassé pour icmp_seq 1
--- 2 paquets transmis, 0 reçu, <span class="k">100 % de perte</span> ---

<span class="k">ping</span> accueil
réponse de accueil : icmp_seq=0 <span class="ok">ttl=64 temps=1 ms</span></pre>
          <p class="notfound__text">La page demandée n’existe pas ou a été déplacée. L’accueil, lui, répond.</p>
          <a class="btn btn--primary" href="index.html" data-home>Revenir à l’accueil <span class="btn__icon" aria-hidden="true">${ICON.arrowRight}</span></a>
        </div>
      </div>
    </section>`;
}

module.exports = { synthese, erreur };
