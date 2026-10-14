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

  /* ---------- 3D : carrousel de photos ---------- */
  var portraits = window.FLEJOM_PORTRAITS || [];
  document.querySelectorAll(".c3d").forEach(function (box) {
    var ring = box.querySelector(".c3d-ring");
    var scene = box.querySelector(".c3d-scene");
    // Photos au format paysage uniquement, au plus 16 pour garder un cercle lisible
    var list = [];
    photos.forEach(function (p, i) { if (portraits.indexOf(p) === -1) list.push(i); });
    var step0 = Math.max(1, Math.floor(list.length / 16));
    list = list.filter(function (_, k) { return k % step0 === 0; }).slice(0, 16);
    var n = list.length, items = [];
    list.forEach(function (pi) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "c3d-item";
      b.setAttribute("aria-label", "Agrandir la photo " + (pi + 1));
      var im = document.createElement("img");
      im.src = thumb(photos[pi]); im.alt = ""; im.draggable = false; im.decoding = "async";
      b.appendChild(im);
      b.addEventListener("click", function (ev) { if (moved > 6) { ev.preventDefault(); return; } openLb(pi); });
      ring.appendChild(b); items.push(b);
    });
    var angle = 0, vel = 0, radius = 0, seg = 360 / n, hover = false, dragging = false, moved = 0, lastX = 0, target = null;
    var auto = reduceMotion ? 0 : -0.12;
    function layout() {
      var w = ring.offsetWidth;
      radius = Math.round((w / 2) / Math.tan(Math.PI / n) + 24);
      items.forEach(function (it, k) { it.style.transform = "rotateY(" + (k * seg) + "deg) translateZ(" + radius + "px)"; });
    }
    function render() {
      ring.style.transform = "translateZ(" + (-radius) + "px) rotateX(-3deg) rotateY(" + angle + "deg)";
      items.forEach(function (it, k) {
        var a = ((k * seg + angle) % 360 + 360) % 360; if (a > 180) a -= 360;
        var f = Math.cos(a * Math.PI / 180);
        it.style.filter = "brightness(" + (0.45 + 0.55 * Math.max(f, 0)) + ")";
        it.tabIndex = Math.abs(a) < seg / 2 ? 0 : -1;
      });
    }
    function tick() {
      if (target !== null) {
        var d = target - angle; angle += d * 0.12;
        if (Math.abs(d) < 0.05) { angle = target; target = null; }
      } else if (!dragging) {
        vel *= 0.94;
        angle += vel + (hover || Math.abs(vel) > 0.05 ? 0 : auto);
      }
      render();
      requestAnimationFrame(tick);
    }
    scene.addEventListener("pointerdown", function (ev) {
      dragging = true; moved = 0; lastX = ev.clientX; vel = 0; target = null;
      scene.classList.add("dragging");
    });
    window.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var dx = ev.clientX - lastX; lastX = ev.clientX; moved += Math.abs(dx);
      angle += dx * 0.25; vel = dx * 0.25;
    });
    window.addEventListener("pointerup", function () { if (!dragging) return; dragging = false; scene.classList.remove("dragging"); });
    scene.addEventListener("mouseenter", function () { hover = true; });
    scene.addEventListener("mouseleave", function () { hover = false; });
    function snap(dir) { var base = Math.round(angle / seg) * seg; target = base + dir * seg; vel = 0; }
    box.querySelector("[data-c3d-prev]").addEventListener("click", function () { snap(1); });
    box.querySelector("[data-c3d-next]").addEventListener("click", function () { snap(-1); });
    scene.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") { snap(1); ev.preventDefault(); }
      if (ev.key === "ArrowRight") { snap(-1); ev.preventDefault(); }
    });
    window.addEventListener("resize", layout);
    layout(); render(); requestAnimationFrame(tick);
  });

  /* ---------- 3D : cartes qui s'inclinent sous la souris ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".tilt").forEach(function (el) {
      var glare = document.createElement("span");
      glare.className = "tilt-glare"; el.appendChild(glare);
      var max = el.classList.contains("split-img") ? 6 : 10;
      el.addEventListener("pointermove", function (ev) {
        var r = el.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.classList.add("tilting");
        el.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * max) + "deg) rotateY(" + ((x - 0.5) * max) + "deg) scale(1.02)";
        el.style.setProperty("--gx", x * 100 + "%"); el.style.setProperty("--gy", y * 100 + "%");
      });
      el.addEventListener("pointerleave", function () { el.classList.remove("tilting"); el.style.transform = ""; });
    });
  }

  /* ---------- 3D : profondeur du diaporama d'accueil ---------- */
  if (hero && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
    var depthText = hero.querySelector("[data-depth]");
    hero.addEventListener("pointermove", function (ev) {
      var r = hero.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
      hero.querySelectorAll(".hero-slide.active img").forEach(function (im) {
        im.style.transition = "transform .6s ease-out";
        im.style.transform = "scale(1.08) translate(" + (-x * 22) + "px," + (-y * 14) + "px)";
      });
      depthText.style.transform = "perspective(1000px) rotateY(" + (x * 6) + "deg) rotateX(" + (-y * 5) + "deg) translate(" + (x * 14) + "px," + (y * 10) + "px)";
    });
    hero.addEventListener("pointerleave", function () {
      depthText.style.transform = "";
      hero.querySelectorAll(".hero-slide img").forEach(function (im) { im.style.transform = ""; im.style.transition = ""; });
    });
  }

  /* ---------- Chiffres animés ---------- */
  var nums = document.querySelectorAll(".stat-num");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        nio.unobserve(en.target);
        var el = en.target, m = el.textContent.match(/^(\d+)(.*)$/);
        if (!m) return;
        var end = +m[1], suffix = m[2], t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min((ts - t0) / 1600, 1), ease = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(end * ease) + suffix;
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { nio.observe(n); });
  }

  /* ---------- Barre de progression et retour en haut ---------- */
  var prog = document.querySelector(".scroll-progress");
  var topBtn = document.querySelector(".to-top");
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
    if (topBtn) topBtn.classList.toggle("show", scrollY > 700);
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (topBtn) topBtn.addEventListener("click", function () { scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  /* Année du pied de page */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
