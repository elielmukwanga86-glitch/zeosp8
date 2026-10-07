'use strict';
const { esc, text } = require('../lib/html');

const FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';

const ICON = {
  arrowUpRight: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M5.5 4H12v6.5"/></svg>',
  arrowDown: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5"/></svg>',
  arrowRight: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
  arrowLeft: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4"/></svg>',
  download: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v9M4 8.5 8 12.5l4-4M3 14h10"/></svg>',
  mark: '<svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#1C222B"/><path d="M9 22 16 10 23 22" stroke="#848E99" stroke-width="1.6" fill="none"/><circle cx="16" cy="10" r="3.2" fill="#E8572A"/><circle cx="9" cy="22" r="2.2" fill="#E8EBEE"/><circle cx="23" cy="22" r="2.2" fill="#E8EBEE"/></svg>',
};

/** Navigation entries; anchors point to the home page sections. */
function navItems(site) {
  const items = [
    { href: 'index.html#realisations', label: 'Réalisations', id: 'realisations' },
    { href: 'index.html#parcours', label: 'Parcours', id: 'parcours' },
    { href: 'index.html#competences', label: 'Compétences', id: 'competences' },
    { href: 'synthese.html', label: 'Synthèse', id: 'synthese' },
  ];
  if (hasVeille(site)) items.push({ href: 'index.html#veille', label: 'Veille', id: 'veille' });
  items.push({ href: 'index.html#a-propos', label: 'À propos', id: 'a-propos' });
  items.push({ href: 'index.html#contact', label: 'Contact', id: 'contact' });
  return items;
}

function hasVeille(site) {
  return Boolean(site.veille && (site.veille.theme || (site.veille.articles || []).length));
}

/** On the home page, section links stay in-page (#id) so scroll spy can mark them. */
function navHref(item, ctx) {
  if (ctx.page === 'home' && item.href.startsWith('index.html#')) return item.href.slice('index.html'.length);
  return ctx.base + item.href;
}

function layout(ctx) {
  const { site, base, titre, description, page, courant, contenu, scripts = ['main'], lightbox = false, image } = ctx;
  const items = navItems(site);
  const ogImage = site.url ? site.url.replace(/\/?$/, '/') + 'assets/img/' + (image || 'og.jpg') : base + 'assets/img/' + (image || 'og.jpg');
  const canonical = site.url && ctx.chemin !== undefined ? site.url.replace(/\/?$/, '/') + ctx.chemin : '';

  const navList = items.map((it) => {
    const current = it.id === courant ? ' aria-current="page"' : '';
    return `<li><a href="${esc(navHref(it, ctx))}"${current}>${text(it.label)}</a></li>`;
  }).join('\n          ');

  const menuList = items.map((it) => `<li><a href="${esc(navHref(it, ctx))}">${text(it.label)}</a></li>`).join('\n        ');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(titre)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#0E1217">
  <meta name="author" content="${esc(site.nom)}">
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
  <link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="${page === 'projet' ? 'article' : 'website'}">
  <meta property="og:title" content="${esc(titre)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${FONTS}" rel="stylesheet">
  <link rel="stylesheet" href="${base}assets/css/style.css">
  <script>document.documentElement.classList.add('js')</script>
</head>
<body class="page-${page}">
  <a class="skip-link" href="#contenu">Aller au contenu</a>

  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="${page === 'home' ? '#top' : base + 'index.html'}" aria-label="${esc(site.nom)}, ${page === 'home' ? 'haut de page' : 'accueil du portfolio'}">
        ${ICON.mark}
        <span class="brand__name">${text(site.nom)} <span class="brand__meta label">BTS SIO SISR</span></span>
      </a>
      <nav class="nav" aria-label="Navigation principale">
        <ul>
          ${navList}
        </ul>
      </nav>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu <span class="menu-btn__icon" aria-hidden="true"></span></button>
    </div>
    <div class="progress" aria-hidden="true"></div>
  </header>

  <div class="menu" id="menu">
    <nav aria-label="Navigation mobile">
      <ul>
        ${menuList}
      </ul>
    </nav>
    <div class="menu__foot">
      <span class="label">BTS SIO option SISR · ${text(site.formation.ecole)}</span>
      <a class="menu__mail" href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>
    </div>
  </div>

  <main id="contenu">
${contenu}
  </main>

  <footer class="site-footer">
    <div class="wrap">
      <span class="label">© ${new Date().getFullYear()} ${text(site.nom)} · Portfolio BTS SIO SISR</span>
      <ul class="site-footer__links label">
        <li><a href="${base}synthese.html">Synthèse</a></li>
        <li><a href="${esc(site.contact.linkedin.url)}" target="_blank" rel="noopener">LinkedIn<span class="sr-only"> (nouvel onglet)</span></a></li>
        <li><a href="${esc(site.contact.github.url)}" target="_blank" rel="noopener">GitHub<span class="sr-only"> (nouvel onglet)</span></a></li>
        <li><a href="#contenu">Haut de page ↑</a></li>
      </ul>
    </div>
  </footer>
${lightbox ? `
  <dialog class="lightbox" aria-label="Figure agrandie">
    <div class="lightbox__bar"><button class="lightbox__close" type="button">Fermer</button></div>
    <div class="lightbox__inner">
      <img alt="">
    </div>
    <p class="lightbox__cap"></p>
  </dialog>` : ''}
  <div class="toast" role="status" aria-live="polite" data-toast></div>
${scripts.map((s) => `  <script src="${base}assets/js/${s}.js" defer></script>`).join('\n')}
</body>
</html>
`;
}

module.exports = { layout, ICON, hasVeille };
