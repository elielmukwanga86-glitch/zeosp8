/* Portfolio interactions — vanilla JS, no dependency. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Hero entrance once fonts are ready ---------- */
  var loaded = false;
  function markLoaded() { if (!loaded) { loaded = true; requestAnimationFrame(function () { root.classList.add('is-loaded'); }); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markLoaded);
  setTimeout(markLoaded, 600);

  /* ---------- Reveal: content on screen at load stays visible; the rest animates in ---------- */
  var revealEls = $$('[data-reveal], [data-lines]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove('is-pending'); en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) { el.classList.add('is-pending'); io.observe(el); }
    });
  }

  /* ---------- Scroll progress in the header ---------- */
  var progress = $('.progress'), ticking = false;
  function onScroll() {
    if (ticking || !progress) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Current section in navigation (home page) and in a case-study table of contents ---------- */
  function spy(links) {
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { var id = decodeURIComponent(a.hash.slice(1)); var s = document.getElementById(id); if (s) map[id] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = map[en.target.id]; if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { obs.observe(document.getElementById(id)); });
    // Back at the top of the page (hero): no section is current.
    var top = document.getElementById('top');
    if (top) new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) links.forEach(function (a) { a.removeAttribute('aria-current'); });
    }, { rootMargin: '-45% 0px -50% 0px' }).observe(top);
  }
  spy($$('.nav a[href^="#"]'));
  spy($$('.toc a[href^="#"]'));

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-btn'), menu = $('#menu');
  var inertTargets = $$('main, .site-footer');
  function setMenu(open, returnFocus) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    inertTargets.forEach(function (el) { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
    if (open) { var first = $('a', menu); if (first) setTimeout(function () { first.focus(); }, 60); }
    else if (returnFocus) menuBtn.focus();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open'), true); });
    $$('a', menu).concat($$('.brand')).forEach(function (a) { a.addEventListener('click', function () { if (root.classList.contains('menu-open')) setMenu(false, false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false, true);
    });
    var desktop = window.matchMedia('(min-width: 1180px)');
    var onDesktop = function (m) { if (m.matches) setMenu(false, false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
  }

  /* ---------- Accordion rows (short réalisations) ---------- */
  $$('.row__btn').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      if (open) panel.setAttribute('data-open', ''); else panel.removeAttribute('data-open');
    });
  });

  /* ---------- Skills filter ---------- */
  var domains = $('[data-domains]'), status = $('[data-skills-status]');
  var filterBtns = $$('[data-filter]');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-filter');
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      var n = 0;
      $$('.skill', domains).forEach(function (s) {
        var match = !!key && (' ' + (s.getAttribute('data-ctx') || '') + ' ').indexOf(' ' + key + ' ') > -1;
        s.classList.toggle('is-match', match);
        if (match) n++;
      });
      if (key) {
        domains.setAttribute('data-filter', key);
        status.classList.remove('sr-only');
        status.textContent = n + ' compétence' + (n > 1 ? 's' : '') + ' mise' + (n > 1 ? 's' : '') + ' en pratique : ' + btn.textContent + '.';
      } else {
        domains.removeAttribute('data-filter');
        status.classList.add('sr-only');
        status.textContent = 'Toutes les compétences sont affichées.';
      }
    });
  });

  /* ---------- Copy e-mail ---------- */
  var toast = $('[data-toast]'), toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2400);
  }
  $$('[data-copy]').forEach(function (btn) {
    var initial = btn.textContent;
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');
      var done = function () { showToast('Adresse e-mail copiée'); btn.textContent = 'Copiée'; setTimeout(function () { btn.textContent = initial; }, 2000); };
      var fallback = function () {
        var sel = window.getSelection(), range = document.createRange(), target = $('.contact__address');
        if (target && sel) { range.selectNodeContents(target); sel.removeAllRanges(); sel.addRange(range); }
        showToast('Adresse sélectionnée : ' + value);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done, fallback);
        else fallback();
      } catch (e) { fallback(); }
    });
  });

  /* ---------- Lightbox for figures ---------- */
  var dialog = $('.lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    var img = $('img', dialog), cap = $('.lightbox__cap', dialog), opener = null;
    $$('.figure__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var source = $('img', btn);
        opener = btn;
        img.src = source.currentSrc || source.src;
        img.alt = source.alt;
        cap.textContent = btn.getAttribute('data-caption') || '';
        dialog.showModal();
      });
    });
    $('.lightbox__close', dialog).addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* ---------- 404 on GitHub Pages project sites: link back to the site root ---------- */
  var home = $('[data-home]');
  if (home && /\.github\.io$/.test(location.hostname)) {
    var seg = location.pathname.split('/')[1];
    if (seg && seg.indexOf('.') === -1) home.href = '/' + seg + '/';
  }
})();
