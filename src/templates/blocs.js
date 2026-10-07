'use strict';
/**
 * Renderers for the content blocks used in case studies (contenu/projets/*.js → sections[].blocs).
 *
 *   { p: 'texte' }                          paragraph (**gras**, `code`)
 *   { titre: 'Sous-titre' }                 h3
 *   { liste: ['…', '…'] }                   bullet list
 *   { etapes: [['Titre', 'texte'], …] }     numbered steps
 *   { figure: { src, largeur, hauteur, alt, legende } }   numbered figure with zoom
 *   { code: { type: 'shell'|'logique', label, lignes: [] } }
 *   { tableau: { entetes, lignes, pied?, mono?: [col], droite?: [col] } }
 *   { encadre: { type: 'ok'|'warn'|'note', titre, texte } }
 *   { chiffres: 'projet' | [['valeur', 'libellé'], …] }
 *   { lettre: ['paragraphe', …] }
 *   { tags: ['…'] }
 *   { referentiel: true }                   BTS competencies of the project (from referentiel.js)
 */
const { esc, inline, text } = require('../lib/html');

function chiffres(items) {
  return `<div class="kpis kpis--${items.length}">
${items.map(([n, l]) => `              <div class="kpi"><div class="kpi__n">${text(n)}</div><div class="kpi__l">${text(l)}</div></div>`).join('\n')}
            </div>`;
}

function codeLine(line, type) {
  // Separate a trailing "# comment" (shell) before escaping.
  let body = line, comment = '';
  const hash = type === 'shell' ? line.search(/\s#\s/) : -1;
  if (hash > -1) { body = line.slice(0, hash); comment = line.slice(hash); }
  let html = esc(body);
  if (type === 'logique') {
    html = html.replace(/^(\s*)(SI|ET|OU|ALORS)\b/, '$1<span class="k">$2</span>').replace(/→/g, '<span class="ok">→</span>');
  } else if (type === 'shell') {
    html = html.replace(/^(\s*)([\w.-]+)/, '$1<span class="k">$2</span>');
  }
  if (comment) html += `<span class="c">${esc(comment)}</span>`;
  return html;
}

function renderBloc(b, ctx) {
  if (b.p) return `<p>${inline(b.p)}</p>`;
  if (b.titre) return `<h3>${inline(b.titre)}</h3>`;
  if (b.liste) return `<ul class="bullets">\n${b.liste.map((li) => `              <li>${inline(li)}</li>`).join('\n')}\n            </ul>`;
  if (b.etapes) {
    return `<ol class="steps">\n${b.etapes.map(([t, d]) => `              <li><div><b>${inline(t)}</b><span>${inline(d)}</span></div></li>`).join('\n')}\n            </ol>`;
  }
  if (b.figure) {
    ctx.figure += 1;
    const f = b.figure;
    const cap = `Figure ${ctx.figure} — ${f.legende}`;
    return `<figure class="figure" data-reveal>
              <button class="figure__btn" type="button" data-caption="${esc(cap)}" aria-label="Agrandir la figure ${ctx.figure}"><img src="${ctx.base}assets/${esc(f.src)}" width="${f.largeur}" height="${f.hauteur}" alt="${esc(f.alt)}" loading="lazy" decoding="async"></button>
              <figcaption><b>Figure ${ctx.figure}</b><span class="sr-only"> — </span>${text(f.legende)}</figcaption>
            </figure>`;
  }
  if (b.code) {
    const c = b.code;
    return `<pre class="code" tabindex="0"><span class="code__label">${text(c.label || '')}</span>${c.lignes.map((l) => codeLine(l, c.type)).join('\n')}</pre>`;
  }
  if (b.tableau) {
    const t = b.tableau, mono = t.mono || [], droite = t.droite || [];
    const cls = (i) => [mono.includes(i) ? 'mono' : '', droite.includes(i) ? 'r' : ''].filter(Boolean).join(' ');
    const cell = (v, i, tag) => `<${tag}${cls(i) ? ` class="${cls(i)}"` : ''}>${inline(v)}</${tag}>`;
    return `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(t.entetes.filter(Boolean).join(', '))}">
              <table class="table">
                <thead><tr>${t.entetes.map((h, i) => `<th scope="col"${droite.includes(i) ? ' class="r"' : ''}>${text(h)}</th>`).join('')}</tr></thead>
                <tbody>
${t.lignes.map((row) => `                  <tr>${row.map((v, i) => cell(v, i, i === 0 ? 'th' : 'td').replace(/^<th/, '<th scope="row"')).join('')}</tr>`).join('\n')}
                </tbody>${t.pied ? `
                <tfoot><tr>${t.pied.map((v, i) => cell(v, i, 'td')).join('')}</tr></tfoot>` : ''}
              </table>
            </div>`;
  }
  if (b.encadre) {
    const e = b.encadre;
    return `<div class="callout callout--${e.type || 'note'}"><span class="label">${text(e.titre)}</span><p>${inline(e.texte)}</p></div>`;
  }
  if (b.chiffres) return chiffres(b.chiffres === 'projet' ? ctx.projet.chiffres : b.chiffres);
  if (b.lettre) return `<div class="letter">\n${b.lettre.map((p) => `              <p>${inline(p)}</p>`).join('\n')}\n            </div>`;
  if (b.tags) return `<ul class="tags">${b.tags.map((t) => `<li class="tag">${text(t)}</li>`).join('')}</ul>`;
  if (b.referentiel) {
    const comps = ctx.referentiel.flatMap((bloc) => bloc.competences.map((c) => ({ ...c, bloc: bloc.titre })))
      .filter((c) => (ctx.projet.competencesBts || []).includes(c.id));
    if (!comps.length) return '';
    return `<h3>Compétences du référentiel BTS SIO</h3>
            <ul class="bts-list">
${comps.map((c) => `              <li><span class="label">${text(c.bloc)}</span>${text(c.nom)}</li>`).join('\n')}
            </ul>
            <p class="small"><a class="link-arrow" href="${ctx.base}synthese.html">Voir le tableau de synthèse <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M5.5 4H12v6.5"/></svg></a></p>`;
  }
  throw new Error(`Bloc inconnu dans ${ctx.projet.slug} : ${JSON.stringify(Object.keys(b))}`);
}

module.exports = { renderBloc, chiffres };
