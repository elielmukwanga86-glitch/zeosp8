/* Fondation FLEJOM — interactions du site */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Menu mobile */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* Apparition au défilement */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* Diaporama d'accueil */
  var hero = document.querySelector(".hero");
  if (hero) {
    var slides = hero.querySelectorAll(".hero-slide");
    var caps = hero.querySelectorAll(".hero-caption > div");
    var dotsBox = hero.querySelector(".hero-dots");
    var cur = 0, timer;
    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Diapositive " + (i + 1));
      b.addEventListener("click", function () { show(i); restart(); });
      dotsBox.appendChild(b);
    });
    var dots = dotsBox.querySelectorAll("button");
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("active", k === cur); });
      caps.forEach(function (c, k) { c.hidden = k !== cur; });
      dots.forEach(function (d, k) { d.classList.toggle("active", k === cur); });
    }
    function restart() { clearInterval(timer); if (!reduceMotion) timer = setInterval(function () { show(cur + 1); }, 6000); }
    show(0); restart();
  }

  /* Témoignages */
  var testis = document.querySelector(".testis");
  if (testis) {
    var items = testis.querySelectorAll(".testi");
    var t = 0, tt;
    function showT(i) { t = (i + items.length) % items.length; items.forEach(function (el, k) { el.classList.toggle("active", k === t); }); }
    function restartT() { clearInterval(tt); if (!reduceMotion) tt = setInterval(function () { showT(t + 1); }, 8000); }
    testis.querySelector("[data-prev]").addEventListener("click", function () { showT(t - 1); restartT(); });
    testis.querySelector("[data-next]").addEventListener("click", function () { showT(t + 1); restartT(); });
    showT(0); restartT();
  }

  /* Liste des photos (définie dans galerie-photos.js) */
  var photos = window.FLEJOM_PHOTOS || [];
  var base = document.body.getAttribute("data-base") || "";
  function full(p) { return base + "galerie/" + p; }
  function thumb(p) { return base + "galerie/thumbs/" + p; }

  /* Visionneuse plein écran */
  var lb = document.querySelector(".lightbox");
  var lbIndex = 0, lastFocus = null;
  function openLb(i) {
    if (!lb) return;
    lastFocus = document.activeElement;
    lbIndex = i;
    renderLb();
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb-close").focus();
  }
  function renderLb() {
    var img = lb.querySelector("img");
    img.src = full(photos[lbIndex]);
    img.alt = "Photo " + (lbIndex + 1) + " sur " + photos.length + " — Fondation FLEJOM sur le terrain";
    lb.querySelector(".lb-count").textContent = (lbIndex + 1) + " / " + photos.length;
  }
  function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  if (lb) {
    lb.querySelector(".lb-close").addEventListener("click", closeLb);
    lb.querySelector(".ss-prev").addEventListener("click", function () { lbIndex = (lbIndex - 1 + photos.length) % photos.length; renderLb(); });
    lb.querySelector(".ss-next").addEventListener("click", function () { lbIndex = (lbIndex + 1) % photos.length; renderLb(); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") lb.querySelector(".ss-prev").click();
      if (e.key === "ArrowRight") lb.querySelector(".ss-next").click();
    });
    swipe(lb, function () { lb.querySelector(".ss-next").click(); }, function () { lb.querySelector(".ss-prev").click(); });
  }

  function photoButton(p, i, eager) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Agrandir la photo " + (i + 1));
    var img = document.createElement("img");
    img.src = thumb(p); img.alt = ""; img.decoding = "async";
    if (!eager) img.loading = "lazy";
    b.appendChild(img);
    b.addEventListener("click", function () { openLb(i); });
    return b;
  }

  /* Bandeaux défilants (accueil) */
  document.querySelectorAll(".marquee").forEach(function (box, n) {
    var track = box.querySelector(".marquee-track");
    var half = Math.ceil(photos.length / 2);
    var list = n % 2 === 0 ? photos.slice(0, half) : photos.slice(half);
    var offset = n % 2 === 0 ? 0 : half;
    // La liste est doublée pour que le défilement boucle sans coupure
    [0, 1].forEach(function (copy) {
      list.forEach(function (p, i) {
        var b = photoButton(p, offset + i, true);
        if (copy) { b.setAttribute("aria-hidden", "true"); b.tabIndex = -1; }
        track.appendChild(b);
      });
    });
    track.style.setProperty("--marquee-duration", list.length * 4 + "s");
  });

  /* Diaporama de la galerie */
  var ss = document.querySelector(".slideshow");
  if (ss && photos.length) {
    var stage = ss.querySelector(".ss-stage");
    var thumbsBox = document.querySelector(".thumbs");
    var playBtn = ss.querySelector("[data-play]");
    var countEl = ss.querySelector(".ss-count");
    var bar = ss.querySelector(".ss-progress");
    var DELAY = 5000;
    var idx = 0, playing = !reduceMotion, sTimer, slideEls = [];

    photos.forEach(function (p, i) {
      var s = document.createElement("div");
      s.className = "slide";
      s.setAttribute("role", "group");
      s.setAttribute("aria-roledescription", "diapositive");
      s.setAttribute("aria-label", (i + 1) + " sur " + photos.length);
      stage.appendChild(s);
      slideEls.push(s);
      var tb = document.createElement("button");
      tb.type = "button";
      tb.setAttribute("aria-label", "Voir la photo " + (i + 1));
      var ti = document.createElement("img");
      ti.src = thumb(p); ti.alt = ""; ti.loading = "lazy";
      tb.appendChild(ti);
      tb.addEventListener("click", function () { go(i); });
      thumbsBox.appendChild(tb);
    });
    var thumbBtns = thumbsBox.querySelectorAll("button");

    function load(i) {
      var s = slideEls[(i + photos.length) % photos.length];
      if (s.firstChild) return;
      var src = full(photos[(i + photos.length) % photos.length]);
      var bg = document.createElement("div");
      bg.className = "bg"; bg.style.backgroundImage = "url('" + src + "')";
      var im = document.createElement("img");
      im.src = src; im.alt = "Fondation FLEJOM sur le terrain — photo " + ((i + photos.length) % photos.length + 1);
      im.addEventListener("click", function () { openLb(idx); });
      im.style.cursor = "zoom-in";
      s.appendChild(bg); s.appendChild(im);
    }
    function go(i) {
      idx = (i + photos.length) % photos.length;
      load(idx); load(idx + 1); load(idx - 1);
      slideEls.forEach(function (s, k) { s.classList.toggle("active", k === idx); });
      thumbBtns.forEach(function (b, k) { b.classList.toggle("active", k === idx); });
      var tbtn = thumbBtns[idx];
      thumbsBox.scrollTo({ left: tbtn.offsetLeft - thumbsBox.clientWidth / 2 + tbtn.clientWidth / 2 });
      countEl.textContent = (idx + 1) + " / " + photos.length;
      schedule();
    }
    function schedule() {
      clearTimeout(sTimer);
      bar.style.transition = "none"; bar.style.width = "0";
      if (!playing) return;
      void bar.offsetWidth;
      bar.style.transition = "width " + DELAY + "ms linear"; bar.style.width = "100%";
      sTimer = setTimeout(function () { go(idx + 1); }, DELAY);
    }
    function setPlaying(v) {
      playing = v;
      playBtn.innerHTML = v
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>Pause'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>Lecture';
      schedule();
    }
    ss.querySelector(".ss-prev").addEventListener("click", function () { go(idx - 1); });
    ss.querySelector(".ss-next").addEventListener("click", function () { go(idx + 1); });
    playBtn.addEventListener("click", function () { setPlaying(!playing); });
    ss.querySelector("[data-full]").addEventListener("click", function () { setPlaying(false); openLb(idx); });
    ss.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(idx - 1);
      if (e.key === "ArrowRight") go(idx + 1);
    });
    swipe(ss, function () { go(idx + 1); }, function () { go(idx - 1); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) clearTimeout(sTimer); else schedule(); });
    setPlaying(playing);
    go(0);
  }

  /* Grille de toutes les photos */
  var grid = document.querySelector(".photo-grid");
  if (grid) photos.forEach(function (p, i) { grid.appendChild(photoButton(p, i)); });

  /* Glisser du doigt (mobile) */
  function swipe(el, onLeft, onRight) {
    var x0 = null;
    el.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) (dx < 0 ? onLeft : onRight)();
      x0 = null;
    });
  }

  /* Copier le numéro M-Pesa */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var txt = b.getAttribute("data-copy");
      var label = b.textContent;
      function done() { b.textContent = "Numéro copié ✓"; setTimeout(function () { b.textContent = label; }, 2200); }
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {}); else done();
    });
  });

  /* Formulaire de contact : ouvre la messagerie avec le message prérempli */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var d = new FormData(form);
      var sujet = d.get("sujet") + " — " + d.get("nom");
      var corps = d.get("message") + "\n\n" + d.get("nom") + "\n" + d.get("email") + (d.get("tel") ? "\n" + d.get("tel") : "");
      window.location.href = "mailto:contact@flejom.org?subject=" + encodeURIComponent(sujet) + "&body=" + encodeURIComponent(corps);
    });
  }

  /* Année du pied de page */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
