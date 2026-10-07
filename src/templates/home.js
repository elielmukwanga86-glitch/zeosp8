'use strict';
const { esc, inline, text } = require('../lib/html');
const { ICON, hasVeille } = require('./layout');
const { chiffres } = require('./blocs');

const pad = (n) => String(n).padStart(2, '0');
const MILIEU = { professionnel: 'En milieu professionnel', formation: 'En formation' };

function hero(site, projets) {
  const docs = projets.flatMap((p) => p.documents || []);
  const pages = docs.reduce((s, d) => s + (d.pages || 0), 0);
  const stages = site.parcours.filter((e) => e.type === 'stage');
  const lieux = [...new Set(stages.map((s) => s.lieu.replace(/\s*\(.*\)$/, '')))];
  const facts = [
    ['Formation', `${site.formation.diplome} ${site.formation.option} · ${site.formation.ecole}`],
    ['Stages', lieux.length === 1 ? `${lieux[0]} (${stages.length})` : `${stages.length} stages`],
    ['Dossiers', docs.length ? `${docs.length} PDF · ${pages} pages` : 'À venir'],
    ['Statut', site.statut.court],
  ];
  return `    <section class="hero" id="top" aria-labelledby="hero-title">
      <canvas class="hero__canvas" aria-hidden="true"></canvas>
      <div class="hero__body">
        <div class="wrap">
          <div class="hero__grid">
            <p class="hero__eyebrow label" data-hero style="--d:.1s"><b>Portfolio</b><span>${text(site.formation.diplome)} option ${text(site.formation.option)}</span><span>${inline(site.formation.annee)} · ${text(site.formation.ecole)}</span></p>
            <h1 class="hero__title display" id="hero-title">
              <span class="mask"><span>${text(site.prenom)}</span></span>
              <span class="mask"><span>${text(site.nomFamille)}</span></span>
            </h1>
            <div class="hero__lead">
              <strong data-hero style="--d:.35s">${text(site.accroche)}</strong>
              <p data-hero style="--d:.45s">${inline(site.intro)}</p>
              <div class="hero__actions" data-hero style="--d:.55s">
                <a class="btn btn--primary" href="#realisations" data-dir="down">Voir les réalisations <span class="btn__icon" aria-hidden="true">${ICON.arrowDown}</span></a>
                <a class="btn btn--ghost" href="#contact">Me contacter <span class="btn__icon" aria-hidden="true">${ICON.arrowUpRight}</span></a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="hero__foot" data-hero style="--d:.7s">
        <div class="wrap">
          <dl>
${facts.map(([k, v]) => `            <div><dt class="label">${text(k)}</dt><dd>${text(v)}</dd></div>`).join('\n')}
          </dl>
        </div>
      </div>
    </section>`;
}

function sectionHead(index, id, titre, intro) {
  return `        <header class="section-head">
          <p class="section-head__index label label--acc">${pad(index)} — ${text(titre)}</p>
          <h2 class="section-title display" id="${id}-title" data-lines><span class="mask"><span>${text(titre)}</span></span></h2>
          ${intro ? `<p class="section-intro" data-reveal>${inline(intro)}</p>` : ''}
        </header>`;
}

function projectCard(p, i) {
  const href = `projets/${p.slug}.html`;
  const doc = (p.documents || [])[0];
  return `          <article class="project${i % 2 ? ' project--rev' : ''}" aria-labelledby="p-${p.slug}">
            <a class="project__media" href="${href}" data-tag="${esc(`${p.cadre.type} · ${p.cadre.annee}`)}" data-reveal tabindex="-1" aria-hidden="true">
              <img src="assets/${esc(p.visuel.src)}" width="${p.visuel.largeur}" height="${p.visuel.hauteur}" alt="" loading="lazy" decoding="async">
            </a>
            <div class="project__body" data-reveal style="--d:.08s">
              <p class="project__meta label"><span>${pad(p.ordre)} · ${text(p.nom)}</span><span>${text(MILIEU[p.milieu])}</span><span>${text(p.cadre.organisation)}</span><span>${text(p.cadre.court)}</span></p>
              <h3 class="project__title display" id="p-${p.slug}"><a href="${href}">${text(p.titre)}</a></h3>
              <p class="project__sub">${inline(p.accroche)}</p>
              <p class="project__text">${inline(p.resume)}</p>
              ${chiffres(p.chiffres.slice(0, 3))}
              <ul class="tags" aria-label="Technologies">${p.technologies.map((t) => `<li class="tag">${text(t)}</li>`).join('')}</ul>
              <div class="project__actions">
                <a class="btn btn--ghost" href="${href}">Étude de cas <span class="btn__icon" aria-hidden="true">${ICON.arrowUpRight}</span></a>
                ${doc ? `<a class="project__pdf" href="assets/${esc(doc.fichier)}" download>${ICON.download}<span>${text(doc.titre)} · PDF, ${doc.pages} pages</span></a>` : ''}
              </div>
            </div>
          </article>`;
}

function projectRow(p) {
  const id = `row-${p.slug}`;
  const ctx = [MILIEU[p.milieu], p.cadre.type, p.cadre.organisation, p.cadre.court].filter(Boolean).join(' · ');
  return `          <div class="row">
            <h3 class="row__heading">
              <button class="row__btn" type="button" aria-expanded="false" aria-controls="${id}">
                <span class="row__idx mono">${pad(p.ordre)}</span>
                <span><span class="row__title">${text(p.titre)}</span><span class="row__ctx">${text(ctx)}</span></span>
                <span class="row__plus" aria-hidden="true"></span>
              </button>
            </h3>
            <div class="row__panel" id="${id}">
              <div class="row__inner"><div class="row__content">
                <ul>
${p.details.map((d) => `                  <li>${inline(d)}</li>`).join('\n')}
                </ul>${p.schema ? `
                <figure class="schema">${p.schema}<figcaption>${text(p.legendeSchema || '')}</figcaption></figure>` : ''}
              </div></div>
            </div>
          </div>`;
}

function realisations(index, projets) {
  const full = projets.filter((p) => p.page);
  const short = projets.filter((p) => !p.page);
  return `    <section class="section paper" id="realisations" aria-labelledby="realisations-title">
      <div class="wrap">
${sectionHead(index, 'realisations', 'Réalisations', `Mes réalisations en milieu professionnel (stages) et en formation. ${full.length === 1 ? 'La première est documentée' : `Les ${['', '', 'deux', 'trois', 'quatre', 'cinq', 'six'][full.length] || full.length} premières sont documentées`} de bout en bout, avec un dossier PDF à télécharger.`)}
        <div class="projects">
${full.map(projectCard).join('\n')}
        </div>${short.length ? `
        <div class="others" data-reveal>
          <h3 class="others__head label">Autres réalisations</h3>
${short.map(projectRow).join('\n')}
        </div>` : ''}
      </div>
    </section>`;
}

function parcours(index, site, projets) {
  const types = { formation: 'Formation', stage: 'Stage', diplome: 'Diplôme' };
  return `    <section class="section paper" id="parcours" aria-labelledby="parcours-title">
      <div class="wrap">
${sectionHead(index, 'parcours', 'Parcours', 'Formation et stages, du plus récent au plus ancien.')}
        <ol class="log">
${site.parcours.map((e) => {
    const lien = e.projet && projets.find((p) => p.slug === e.projet && p.page);
    return `          <li class="log__item" data-reveal>
            <div class="log__time label"><span class="num">${text(e.periode)}</span><span class="log__type log__type--${e.type}">${types[e.type] || text(e.type)}</span></div>
            <div>
              <h3 class="log__title">${inline(e.titre)}</h3>
              <p class="log__place">${text(e.lieu)}</p>${e.description ? `
              <p class="log__desc">${inline(e.description)}</p>` : ''}${e.missions ? `
              <ul class="log__list">
${e.missions.map((m) => `                <li>${inline(m)}</li>`).join('\n')}
              </ul>` : ''}${lien ? `
              <p class="log__more"><a class="link-arrow" href="projets/${lien.slug}.html">Voir le ${text(lien.nom)} ${ICON.arrowUpRight}</a></p>` : ''}
            </div>
          </li>`;
  }).join('\n')}
        </ol>
      </div>
    </section>`;
}

function competences(index, site, projets) {
  const used = new Set(site.competences.flatMap((d) => d.items.flatMap((i) => i.contextes || [])));
  const chips = projets.filter((p) => used.has(p.slug));
  return `    <section class="section paper-2" id="competences" aria-labelledby="competences-title">
      <div class="wrap">
${sectionHead(index, 'competences', 'Compétences', 'Chaque compétence est reliée au stage ou au projet dans lequel je l’ai mise en pratique.')}
        <div class="filter" role="group" aria-label="Filtrer les compétences par réalisation" data-reveal>
          <p class="filter__label label">Mises en pratique dans</p>
          <button class="chip-btn" type="button" aria-pressed="true" data-filter="">Tout</button>
${chips.map((p) => `          <button class="chip-btn" type="button" aria-pressed="false" data-filter="${p.slug}">${text(p.filtre || p.nom)}</button>`).join('\n')}
        </div>
        <div class="domains" data-domains>
${site.competences.map((d, i) => `          <div class="domain" data-reveal style="--d:${(i % 3) * 0.05}s">
            <h3 class="domain__title">${text(d.domaine)}</h3>
            <ul class="skills">
${d.items.map((it) => `              <li class="skill"${it.contextes ? ` data-ctx="${it.contextes.join(' ')}"` : ''}>${text(it.nom)}</li>`).join('\n')}
            </ul>
          </div>`).join('\n')}
        </div>
        <p class="skills-status sr-only" aria-live="polite" data-skills-status></p>
        <a class="synth-teaser" href="synthese.html" data-reveal>
          <span class="label label--acc">Référentiel BTS SIO</span>
          <span class="synth-teaser__title">Tableau de synthèse des réalisations</span>
          <span class="synth-teaser__text">Mes réalisations rapportées aux compétences des blocs 1 et 2 (option SISR).</span>
          <span class="synth-teaser__arrow" aria-hidden="true">${ICON.arrowRight}</span>
        </a>
      </div>
    </section>`;
}

function veille(index, site) {
  if (!hasVeille(site)) return '';
  const v = site.veille;
  return `    <section class="section paper" id="veille" aria-labelledby="veille-title">
      <div class="wrap">
${sectionHead(index, 'veille', 'Veille', v.description || (v.theme ? `Thème : ${v.theme}` : ''))}
        ${v.theme ? `<p class="veille__theme label label--acc">Thème · ${text(v.theme)}</p>` : ''}
        <ol class="log">
${(v.articles || []).map((a) => `          <li class="log__item" data-reveal>
            <div class="log__time label"><span class="num">${text(a.date)}</span><span class="log__type">${text(a.source)}</span></div>
            <div>
              <h3 class="log__title">${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${text(a.titre)}<span class="sr-only"> (nouvel onglet)</span></a>` : text(a.titre)}</h3>
              <p class="log__desc">${inline(a.resume)}</p>
            </div>
          </li>`).join('\n')}
        </ol>
      </div>
    </section>`;
}

function aPropos(index, site) {
  const a = site.aPropos;
  const certifs = site.certifications || [];
  return `    <section class="section dark" id="a-propos" aria-labelledby="a-propos-title">
      <div class="wrap">
${sectionHead(index, 'a-propos', 'À propos')}
        <div class="about">
          <p class="about__statement" data-reveal>${inline(a.phrase).replace(/<strong>(.*?)<\/strong>/, '<em>$1</em>')}</p>
          <div class="about__text" data-reveal>
${a.paragraphes.map((p) => `            <p>${inline(p)}</p>`).join('\n')}
          </div>
          <dl class="fiche" data-reveal style="--d:.08s">
${a.fiche.map(([k, v, d]) => `            <div><dt class="label">${text(k)}</dt><dd>${inline(v)}${d ? `<small>${inline(d)}</small>` : ''}</dd></div>`).join('\n')}${certifs.map((c) => `
            <div><dt class="label">Certification</dt><dd>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${text(c.nom)}<span class="sr-only"> (nouvel onglet)</span></a>` : text(c.nom)}<small>${text([c.organisme, c.date].filter(Boolean).join(' · '))}</small></dd></div>`).join('')}
          </dl>
        </div>
      </div>
    </section>`;
}

function contact(index, site) {
  const c = site.contact;
  return `    <section class="contact dark" id="contact" aria-labelledby="contact-title">
      <div class="wrap">
        <p class="section-head__index label label--acc">${pad(index)} — Contact</p>
        <h2 class="contact__title" id="contact-title"><a class="contact__address" href="mailto:${esc(c.email)}">${esc(c.email)}</a></h2>
        <div class="contact__row" data-reveal>
          <p class="contact__lead">${inline(c.phrase)}</p>
          <button class="copy-btn" type="button" data-copy="${esc(c.email)}">Copier l’adresse</button>
        </div>
        <div class="socials" data-reveal>
          <a class="social" href="${esc(c.linkedin.url)}" target="_blank" rel="noopener">
            <span><span class="social__name">LinkedIn<span class="sr-only"> (nouvel onglet)</span></span><span class="social__handle mono">${esc(c.linkedin.libelle)}</span></span>
            <span class="social__arrow" aria-hidden="true">${ICON.arrowRight}</span>
          </a>
          <a class="social" href="${esc(c.github.url)}" target="_blank" rel="noopener">
            <span><span class="social__name">GitHub<span class="sr-only"> (nouvel onglet)</span></span><span class="social__handle mono">${esc(c.github.libelle)}</span></span>
            <span class="social__arrow" aria-hidden="true">${ICON.arrowRight}</span>
          </a>
        </div>
      </div>
    </section>`;
}

function home(site, projets) {
  let i = 0;
  const parts = [
    hero(site, projets),
    realisations(++i, projets),
    parcours(++i, site, projets),
    competences(++i, site, projets),
  ];
  if (hasVeille(site)) parts.push(veille(++i, site));
  parts.push(aPropos(++i, site), contact(++i, site));
  return parts.join('\n\n');
}

module.exports = { home };
