'use strict';
const { esc, inline, text } = require('../lib/html');
const { ICON, hasVeille, navItems } = require('./layout');
const { chiffres } = require('./blocs');
const referentiel = require('../contenu/referentiel');

const pad = (n) => String(n).padStart(2, '0');
const MILIEU = { professionnel: 'En milieu professionnel', formation: 'En formation' };
const r1 = (n) => Math.round(n * 10) / 10;
/** « Illustration : le serveur… » → « Le serveur… » for a figure caption. */
const sansIllustration = (alt) => alt.replace(/^Illustration\s*:\s*(.)/, (_, c) => c.toUpperCase());

/**
 * Table of contents drawn as a star topology: the home page is the switch,
 * each section is a host on one of its ports. Real links (desktop only);
 * the same entries are listed as text on small screens.
 */
function topologie(entries) {
  const W = 600, H = 470, cx = 300, cy = 232, rx = 172, ry = 178;
  const k = entries.length;
  const nodes = entries.map((e, i) => {
    const a = -Math.PI / 2 + (i / k) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const x = r1(cx + c * rx), y = r1(cy + s * ry);
    let anchor = 'middle', tx = x, ty = s < 0 ? y - 34 : y + 30;
    if (c > 0.35) { anchor = 'start'; tx = x + 18; ty = y - 6; }
    if (c < -0.35) { anchor = 'end'; tx = x - 18; ty = y - 6; }
    return `      <a class="topo__link" href="${esc(e.href)}">
        <line class="topo__wire" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>
        <rect class="topo__host" x="${r1(x - 7)}" y="${r1(y - 7)}" width="14" height="14"/>
        <text class="topo__n" x="${tx}" y="${ty}" text-anchor="${anchor}">${esc(e.n)} · port ${i + 1}</text>
        <text class="topo__label" x="${tx}" y="${r1(ty + 19)}" text-anchor="${anchor}">${text(e.label)}</text>
      </a>`;
  }).join('\n');
  const ports = entries.map((_, i) => `<rect x="${r1(cx - 52 + i * (104 / Math.max(1, k - 1)) - 4)}" y="${cy + 8}" width="8" height="6"/>`).join('');
  return `<svg class="topo" viewBox="0 0 ${W} ${H}" role="group" aria-label="Sommaire du portfolio">
${nodes}
      <g class="topo__core" aria-hidden="true">
        <rect x="${cx - 66}" y="${cy - 22}" width="132" height="44"/>
        <text x="${cx}" y="${cy + 1}" text-anchor="middle">index.html</text>
        <g class="topo__ports">${ports}</g>
      </g>
    </svg>`;
}

function hero(site, projets, entries) {
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
  return `    <section class="cover" id="top" aria-labelledby="hero-title">
      <div class="wrap">
        <p class="runhead" data-hero style="--d:.05s"><span>Portfolio</span><span>${text(site.formation.diplome)} option ${text(site.formation.option)}</span><span>${inline(site.formation.annee)} · ${text(site.formation.ecole)}</span><span>Promotion ${text(site.formation.promotion)}</span></p>
        <div class="cover__grid">
          <div class="cover__main">
            <h1 class="cover__title" id="hero-title" data-hero style="--d:.1s">${text(site.prenom)}<br>${text(site.nomFamille)}</h1>
            <p class="cover__deck" data-hero style="--d:.2s">${text(site.accroche)}</p>
            <p class="cover__intro" data-hero style="--d:.28s">${inline(site.intro)}</p>
            <div class="cover__actions" data-hero style="--d:.36s">
              <a class="btn btn--primary" href="#realisations">Lire les réalisations <span class="btn__icon" aria-hidden="true">${ICON.arrowDown}</span></a>
              <a class="btn btn--line" href="#contact">Me contacter <span class="btn__icon" aria-hidden="true">${ICON.arrowRight}</span></a>
            </div>
          </div>
          <figure class="cover__fig" data-hero style="--d:.3s">
            <nav class="cover__topo" aria-label="Sommaire">
    ${topologie(entries)}
            </nav>
            <nav class="cover__bus" aria-label="Sommaire">
              <ol>
${entries.map((e) => `                <li><a href="${esc(e.href)}"><span class="cover__bus-n">${esc(e.n)}</span>${text(e.label)}</a></li>`).join('\n')}
              </ol>
            </nav>
            <figcaption><b>Fig. 0</b> — Sommaire du portfolio, dessiné comme un réseau en étoile : chaque section est un hôte relié à la page d’accueil.</figcaption>
          </figure>
        </div>
        <dl class="cover__facts" data-hero style="--d:.44s">
${facts.map(([k, v]) => `          <div><dt>${text(k)}</dt><dd>${text(v)}</dd></div>`).join('\n')}
        </dl>
      </div>
    </section>`;
}

function sectionHead(index, id, titre, intro) {
  return `        <header class="shead">
          <p class="shead__num" aria-hidden="true">${pad(index)}</p>
          <div class="shead__body">
            <h2 class="shead__title" id="${id}-title" data-reveal><span class="sr-only">${pad(index)}. </span>${text(titre)}</h2>
            ${intro ? `<p class="shead__intro" data-reveal>${inline(intro)}</p>` : ''}
          </div>
        </header>`;
}

function projectCard(p, i) {
  const href = `projets/${p.slug}.html`;
  const doc = (p.documents || [])[0];
  return `        <article class="story${i % 2 ? ' story--alt' : ''}" aria-labelledby="p-${p.slug}">
          <aside class="story__margin" data-reveal>
            <p class="story__num" aria-hidden="true">${pad(p.ordre)}</p>
            <dl class="notes">
              <div><dt>Réalisation</dt><dd>${text(p.nom)}</dd></div>
              <div><dt>Cadre</dt><dd>${text(MILIEU[p.milieu])} · ${text(p.cadre.type)}</dd></div>
              <div><dt>Organisation</dt><dd>${text(p.cadre.organisation)}</dd></div>
              <div><dt>Période</dt><dd>${text(p.cadre.periode || p.cadre.court)}</dd></div>
            </dl>
          </aside>
          <div class="story__main">
            <h3 class="story__title" id="p-${p.slug}" data-reveal><a href="${href}">${text(p.titre)}</a></h3>
            <p class="story__deck" data-reveal>${inline(p.accroche)}</p>
            <figure class="story__fig" data-reveal>
              <a href="${href}" tabindex="-1" aria-hidden="true"><img src="assets/${esc(p.visuel.src)}" width="${p.visuel.largeur}" height="${p.visuel.hauteur}" alt="" loading="lazy" decoding="async"></a>
              <figcaption><b>Fig. ${i + 1}</b> — ${text(sansIllustration(p.visuel.alt))}</figcaption>
            </figure>
            <div class="story__body" data-reveal>
              <div class="story__text">
                <p>${inline(p.resume)}</p>
                <p class="story__tech"><span>Technologies</span> ${p.technologies.map((t) => text(t)).join(' · ')}</p>
                <div class="story__actions">
                  <a class="btn btn--primary" href="${href}">Lire l’étude de cas <span class="btn__icon" aria-hidden="true">${ICON.arrowRight}</span></a>
                  ${doc ? `<a class="pdf-link" href="assets/${esc(doc.fichier)}" download>${ICON.download}<span>${text(doc.titre)} · PDF, ${doc.pages} pages</span></a>` : ''}
                </div>
              </div>
              <div class="story__data">
                <p class="tab-cap"><b>Tableau ${i + 1}</b> — En chiffres</p>
                ${chiffres(p.chiffres.slice(0, 3))}
              </div>
            </div>
          </div>
        </article>`;
}

function projectRow(p) {
  const id = `row-${p.slug}`;
  const ctx = [MILIEU[p.milieu], p.cadre.type, p.cadre.organisation, p.cadre.court].filter(Boolean).join(' · ');
  return `          <div class="row">
            <h4 class="row__heading">
              <button class="row__btn" type="button" aria-expanded="false" aria-controls="${id}">
                <span class="row__idx">${pad(p.ordre)}</span>
                <span class="row__txt"><span class="row__title">${text(p.titre)}</span><span class="row__ctx">${text(ctx)}</span></span>
                <span class="row__plus" aria-hidden="true"></span>
              </button>
            </h4>
            <div class="row__panel" id="${id}">
              <div class="row__inner"><div class="row__content">
                <ul class="bullets">
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
  return `    <section class="section" id="realisations" aria-labelledby="realisations-title">
      <div class="wrap">
${sectionHead(index, 'realisations', 'Réalisations', `Mes réalisations en milieu professionnel (stages) et en formation. ${full.length === 1 ? 'La première est documentée' : `Les ${['', '', 'deux', 'trois', 'quatre', 'cinq', 'six'][full.length] || full.length} premières sont documentées`} en détail, avec un dossier PDF à télécharger.`)}
        <div class="stories">
${full.map(projectCard).join('\n')}
        </div>${short.length ? `
        <div class="others cols" data-reveal>
          <div class="cols__margin"><h3 class="others__head">Autres réalisations</h3></div>
          <div class="others__list">
${short.map(projectRow).join('\n')}
          </div>
        </div>` : ''}
      </div>
    </section>`;
}

function parcours(index, site, projets) {
  const types = { formation: 'Formation', stage: 'Stage', diplome: 'Diplôme' };
  return `    <section class="section section--ruled" id="parcours" aria-labelledby="parcours-title">
      <div class="wrap">
${sectionHead(index, 'parcours', 'Parcours', 'Formation et stages, du plus récent au plus ancien.')}
        <ol class="log">
${site.parcours.map((e) => {
    const lien = e.projet && projets.find((p) => p.slug === e.projet && p.page);
    return `          <li class="log__item" data-reveal>
            <div class="log__time"><span class="log__date">${text(e.periode)}</span><span class="log__type log__type--${e.type}">${types[e.type] || text(e.type)}</span></div>
            <div class="log__body">
              <h3 class="log__title">${inline(e.titre)}</h3>
              <p class="log__place">${text(e.lieu)}</p>${e.description ? `
              <p class="log__desc">${inline(e.description)}</p>` : ''}${e.missions ? `
              <ul class="bullets log__list">
${e.missions.map((m) => `                <li>${inline(m)}</li>`).join('\n')}
              </ul>` : ''}${lien ? `
              <p class="log__more"><a class="link-arrow" href="projets/${lien.slug}.html">Voir le ${text(lien.nom)} ${ICON.arrowRight}</a></p>` : ''}
            </div>
          </li>`;
  }).join('\n')}
        </ol>
      </div>
    </section>`;
}

/** Mini matrix of the synthesis table (réalisations × compétences), drawn from the real data. */
function miniMatrice(projets) {
  const comps = referentiel.flatMap((b) => b.competences);
  const cell = 14, gap = 5, pitch = cell + gap;
  const rows = projets.map((p, r) => comps.map((c, j) => {
    const on = (p.competencesBts || []).includes(c.id);
    return `<rect x="${j * pitch + (j >= referentiel[0].competences.length ? 10 : 0)}" y="${r * pitch}" width="${cell}" height="${cell}"${on ? ' class="on"' : ''}/>`;
  }).join('')).join('');
  const w = comps.length * pitch + 10 - gap, h = projets.length * pitch - gap;
  return `<svg class="matrix" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">${rows}</svg>`;
}

function competences(index, site, projets) {
  const used = new Set(site.competences.flatMap((d) => d.items.flatMap((i) => i.contextes || [])));
  const chips = projets.filter((p) => used.has(p.slug));
  const ref = (slug) => projets.find((p) => p.slug === slug);
  return `    <section class="section section--tint" id="competences" aria-labelledby="competences-title">
      <div class="wrap">
${sectionHead(index, 'competences', 'Compétences', 'Chaque compétence est reliée au stage ou au projet dans lequel je l’ai mise en pratique.')}
        <div class="cols">
          <div class="cols__margin">
            <p class="margin-note" data-reveal>Présenté comme un index : les numéros en face de chaque compétence renvoient aux réalisations (01 à ${pad(projets.length)}).</p>
          </div>
          <div>
            <div class="filter" role="group" aria-label="Filtrer les compétences par réalisation" data-reveal>
              <p class="filter__label">Mises en pratique dans</p>
              <button class="chip-btn" type="button" aria-pressed="true" data-filter="">Tout</button>
${chips.map((p) => `              <button class="chip-btn" type="button" aria-pressed="false" data-filter="${p.slug}"><span class="chip-btn__n" aria-hidden="true">${pad(p.ordre)}</span>${text(p.filtre || p.nom)}</button>`).join('\n')}
            </div>
            <div class="domains" data-domains>
${site.competences.map((d) => `              <div class="domain" data-reveal>
                <h3 class="domain__title">${text(d.domaine)}</h3>
                <ul class="skills">
${d.items.map((it) => {
    const refs = (it.contextes || []).map(ref).filter(Boolean).sort((a, b) => a.ordre - b.ordre);
    return `                  <li class="skill"${it.contextes ? ` data-ctx="${it.contextes.join(' ')}"` : ''}><span class="skill__name">${text(it.nom)}</span>${refs.length ? `<span class="skill__refs"><span class="sr-only"> — réalisations </span>${refs.map((p) => pad(p.ordre)).join(', ')}</span>` : ''}</li>`;
  }).join('\n')}
                </ul>
              </div>`).join('\n')}
            </div>
            <p class="skills-status sr-only" aria-live="polite" data-skills-status></p>
          </div>
        </div>
        <a class="annex" href="synthese.html" data-reveal>
          <span class="annex__tag">Annexe A</span>
          <span class="annex__body">
            <span class="annex__title">Tableau de synthèse des réalisations</span>
            <span class="annex__text">Au format de l’annexe de l’épreuve E4 : mes réalisations et les compétences des blocs 1 et 2 mises en œuvre.</span>
            <span class="annex__go">Ouvrir le tableau ${ICON.arrowRight}</span>
          </span>
          <span class="annex__fig">${miniMatrice(projets)}</span>
        </a>
      </div>
    </section>`;
}

function veille(index, site) {
  if (!hasVeille(site)) return '';
  const v = site.veille;
  return `    <section class="section section--ruled" id="veille" aria-labelledby="veille-title">
      <div class="wrap">
${sectionHead(index, 'veille', 'Veille', v.description || (v.theme ? `Thème : ${v.theme}` : ''))}
        ${v.theme ? `<p class="veille__theme">Thème · ${text(v.theme)}</p>` : ''}
        <ol class="log">
${(v.articles || []).map((a) => `          <li class="log__item" data-reveal>
            <div class="log__time"><span class="log__date">${text(a.date)}</span><span class="log__type">${text(a.source)}</span></div>
            <div class="log__body">
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
  return `    <section class="section section--ruled" id="a-propos" aria-labelledby="a-propos-title">
      <div class="wrap">
${sectionHead(index, 'a-propos', 'À propos')}
        <div class="cols">
          <div class="cols__margin"></div>
          <div class="about">
            <p class="about__quote" data-reveal>${inline(a.phrase).replace(/<strong>(.*?)<\/strong>/, '<em>$1</em>')}</p>
            <div class="about__grid">
              <div class="about__text" data-reveal>
${a.paragraphes.map((p) => `                <p>${inline(p)}</p>`).join('\n')}
              </div>
              <dl class="fiche" data-reveal>
${a.fiche.map(([k, v, d]) => `                <div><dt>${text(k)}</dt><dd>${inline(v)}${d ? `<small>${inline(d)}</small>` : ''}</dd></div>`).join('\n')}${certifs.map((c) => `
                <div><dt>Certification</dt><dd>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${text(c.nom)}<span class="sr-only"> (nouvel onglet)</span></a>` : text(c.nom)}<small>${text([c.organisme, c.date].filter(Boolean).join(' · '))}</small></dd></div>`).join('')}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function contact(index, site) {
  const c = site.contact;
  const refs = [
    c.cv && { href: c.cv.fichier, nom: 'Mon CV', sr: ' (PDF, nouvel onglet)', handle: c.cv.libelle },
    { href: c.linkedin.url, nom: 'LinkedIn', sr: ' (nouvel onglet)', handle: c.linkedin.libelle },
    { href: c.github.url, nom: 'GitHub', sr: ' (nouvel onglet)', handle: c.github.libelle },
  ].filter(Boolean);
  return `    <section class="contact" id="contact" aria-labelledby="contact-title">
      <div class="wrap">
        <header class="shead shead--dark">
          <p class="shead__num" aria-hidden="true">${pad(index)}</p>
          <div class="shead__body">
            <h2 class="shead__title" id="contact-title"><span class="sr-only">${pad(index)}. </span>Contact</h2>
            <p class="shead__intro">${inline(c.phrase)}</p>
          </div>
        </header>
        <div class="cols">
          <div class="cols__margin"></div>
          <div>
            <p class="contact__mail" data-reveal><a class="contact__address" href="mailto:${esc(c.email)}">${esc(c.email).replace('@', '<wbr>@')}</a></p>
            <button class="copy-btn" type="button" data-copy="${esc(c.email)}">Copier l’adresse</button>
            <ol class="refs" data-reveal>
${refs.map((r, i) => `              <li><a class="ref" href="${esc(r.href)}" target="_blank" rel="noopener"><span class="ref__n">[${i + 1}]</span><span class="ref__name">${text(r.nom)}<span class="sr-only">${r.sr}</span></span><span class="ref__handle">${esc(r.handle)}</span><span class="ref__arrow" aria-hidden="true">${ICON.arrowUpRight}</span></a></li>`).join('\n')}
            </ol>
          </div>
        </div>
      </div>
    </section>`;
}

function home(site, projets) {
  let i = 0;
  const entries = navItems(site).map((it) => ({ ...it, href: it.href.replace(/^index\.html/, '') }));
  const parts = [
    hero(site, projets, entries),
    realisations(++i, projets),
    parcours(++i, site, projets),
    competences(++i, site, projets),
  ];
  if (hasVeille(site)) parts.push(veille(++i, site));
  parts.push(aPropos(++i, site), contact(++i, site));
  return parts.join('\n\n');
}

module.exports = { home };
