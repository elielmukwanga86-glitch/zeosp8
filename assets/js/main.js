/* Portfolio interactions — vanilla JS, no dependency. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Load state: hero entrance once fonts are ready ---------- */
  var loaded = false;
  function markLoaded() { if (!loaded) { loaded = true; requestAnimationFrame(function () { root.classList.add('is-loaded'); }); } }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markLoaded);
  setTimeout(markLoaded, 600);

  /* ---------- Clock (Europe/Paris) and days in training ---------- */
  var fmtShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  var fmtFull = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  var clocks = $$('[data-clock]'), clocksFull = $$('[data-clock-full]');
  function tick() {
    var now = new Date();
    clocks.forEach(function (el) { el.textContent = fmtShort.format(now); });
    clocksFull.forEach(function (el) { el.textContent = fmtFull.format(now); });
  }
  if (clocks.length || clocksFull.length) { tick(); setInterval(tick, 1000); }

  var uptime = $('[data-uptime]');
  if (uptime) {
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
    var days = Math.max(0, Math.round((Date.UTC(+parts[0], +parts[1] - 1, +parts[2]) - Date.UTC(2025, 8, 1)) / 86400000));
    if (reduce) { uptime.textContent = days; }
    else {
      var t0 = 0;
      var count = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 4);
        uptime.textContent = Math.round(days * e);
        if (k < 1) requestAnimationFrame(count);
      };
      setTimeout(function () { requestAnimationFrame(count); }, 700);
    }
  }

  /* ---------- Reveal on scroll ---------- */
  // Content already on screen stays visible at rest; only what is below the fold animates in.
  var revealEls = $$('[data-reveal], [data-lines]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove('is-pending'); en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) { el.classList.add('is-pending'); io.observe(el); }
    });
  }

  /* ---------- Header: scroll progress ---------- */
  var progress = $('.progress');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Active section in navigation (home page and case-study TOC) ---------- */
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
  }
  spy($$('.nav a[href^="#"]'));
  spy($$('.toc a[href^="#"]'));

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-btn'), menu = $('#menu');
  var inertTargets = $$('main, .site-footer');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    inertTargets.forEach(function (el) { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
    if (open) { var first = $('a', menu); if (first) setTimeout(function () { first.focus(); }, 60); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Nav text scramble (desktop, motion allowed) ---------- */
  if (fine && !reduce) {
    var glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#';
    $$('[data-scramble]').forEach(function (a) {
      var node = Array.prototype.slice.call(a.childNodes).filter(function (n) { return n.nodeType === 3 && n.textContent.trim(); }).pop();
      if (!node) return;
      var span = document.createElement('span');
      span.textContent = node.textContent;
      span.setAttribute('aria-hidden', 'true');
      a.setAttribute('aria-label', node.textContent.trim());
      a.replaceChild(span, node);
      var original = span.textContent, running = 0;
      a.addEventListener('mouseenter', function () {
        cancelAnimationFrame(running);
        var t0 = performance.now();
        span.style.display = 'inline-block';
        span.style.minWidth = span.getBoundingClientRect().width + 'px';
        (function loop(t) {
          var k = Math.min(1, (t - t0) / 320), out = '';
          for (var i = 0; i < original.length; i++) {
            var c = original[i];
            out += (c === ' ' || i / original.length < k) ? c : glyphs[Math.floor(Math.random() * glyphs.length)];
          }
          span.textContent = out;
          if (k < 1) running = requestAnimationFrame(loop); else span.textContent = original;
        })(t0);
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach(function (el) {
      var cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;
      function loop() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        el.style.setProperty('--mx', cx.toFixed(2) + 'px');
        el.style.setProperty('--my', cy.toFixed(2) + 'px');
        if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) raf = requestAnimationFrame(loop); else raf = 0;
      }
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        tx = Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) * 0.18));
        ty = Math.max(-6, Math.min(6, (e.clientY - (r.top + r.height / 2)) * 0.28));
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
    });
  }

  /* ---------- Accordion rows ---------- */
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
        var ctx = (s.getAttribute('data-ctx') || '').split(' ');
        var match = !!key && ctx.indexOf(key) > -1;
        s.classList.toggle('is-match', match);
        if (match) n++;
      });
      if (key) {
        domains.setAttribute('data-filter', key);
        status.textContent = n + ' compétence' + (n > 1 ? 's' : '') + ' mise' + (n > 1 ? 's' : '') + ' en pratique dans « ' + btn.textContent + ' ».';
      } else {
        domains.removeAttribute('data-filter');
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
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2200);
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');
      var done = function () { showToast('Adresse e-mail copiée'); btn.textContent = 'Copié'; setTimeout(function () { btn.textContent = 'Copier'; }, 2000); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done, function () { showToast(value); });
      else showToast(value);
    });
  });

  /* ---------- Marquee driven by scroll velocity ---------- */
  var track = $('[data-marquee]');
  if (track && !reduce) {
    var group = track.firstElementChild;
    for (var c = 0; c < 2; c++) track.appendChild(group.cloneNode(true));
    var x = 0, speed = 0, dir = -1, lastY = window.scrollY, groupW = group.getBoundingClientRect().width, onScreen = true, mRaf = 0, mLast = 0;
    window.addEventListener('resize', function () { groupW = group.getBoundingClientRect().width; }, { passive: true });
    window.addEventListener('scroll', function () {
      var dy = window.scrollY - lastY; lastY = window.scrollY;
      if (dy) dir = dy > 0 ? -1 : 1;
      speed = Math.min(900, speed + Math.abs(dy) * 6);
    }, { passive: true });
    var mFrame = function (t) {
      mRaf = 0;
      if (!onScreen || document.hidden) return;
      var dt = mLast ? Math.min((t - mLast) / 1000, 0.05) : 0.016; mLast = t;
      speed *= 0.92;
      x += dir * (45 + speed) * dt;
      if (x <= -groupW) x += groupW;
      if (x > 0) x -= groupW;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      mRaf = requestAnimationFrame(mFrame);
    };
    var mStart = function () { if (!mRaf) { mLast = 0; mRaf = requestAnimationFrame(mFrame); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; if (onScreen) mStart(); }).observe(track);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) mStart(); });
    mStart();
  }

  /* ---------- Lightbox for figures (case studies) ---------- */
  var dialog = $('.lightbox');
  if (dialog && typeof dialog.showModal === 'function') {
    var img = $('img', dialog), cap = $('.lightbox__cap', dialog);
    $$('.figure__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var source = $('img', btn);
        img.src = btn.getAttribute('data-full') || source.currentSrc || source.src;
        img.alt = source.alt;
        cap.textContent = btn.getAttribute('data-caption') || '';
        dialog.showModal();
      });
    });
    $('.lightbox__close', dialog).addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  }
})();
