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
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Menu");
      document.body.classList.toggle("menu-ouvert", open);
    });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A" && nav.classList.contains("open")) toggle.click(); });
  }

  /* Apparition douce des blocs au défilement */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var cibles = document.querySelectorAll(".titre-section, .bezel, .photo, .mosaique, .grande-citation, .intro, .recit h2, .valeur, .c3d, .videos > div, .page-title h1, .page-title p");
    var vu = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("vu"); vu.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    cibles.forEach(function (el) {
      var freres = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.classList.add("rv");
      el.style.transitionDelay = Math.min(freres, 4) * 90 + "ms";
      vu.observe(el);
    });
  }

  /* Diaporama d'accueil */
  var hero = document.querySelector(".hero");
  if (hero) {
    var slides = hero.querySelectorAll(".hero-slide");
    var caps = hero.querySelectorAll(".hero-legende");
    var count = hero.querySelector(".hero-count");
    var cur = 0, timer;
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("active", k === cur); });
      caps.forEach(function (c, k) { c.hidden = k !== cur; });
      count.textContent = (cur + 1) + " / " + slides.length;
    }
    function restart() { clearInterval(timer); if (!reduceMotion) timer = setInterval(function () { show(cur + 1); }, 7000); }
    hero.querySelector("[data-prev]").addEventListener("click", function () { show(cur - 1); restart(); });
    hero.querySelector("[data-next]").addEventListener("click", function () { show(cur + 1); restart(); });
    show(0); restart();
  }

  /* Photos de la galerie (définies dans galerie/galerie-photos.js) */
  var photos = window.FLEJOM_PHOTOS || [];
  function full(p) { return "galerie/" + p.f; }
  function thumb(p) { return "galerie/thumbs/" + p.f; }
  function alt(p, i) { return p.c || "Photo " + (i + 1) + " de la Fondation FLEJOM"; }

  /* Visionneuse plein écran */
  var lb = document.querySelector(".lightbox");
  var lbIndex = 0, lastFocus = null;
  function renderLb() {
    var p = photos[lbIndex];
    var img = lb.querySelector("img");
    img.src = full(p); img.alt = alt(p, lbIndex);
    lb.querySelector(".lb-legende").textContent = p.c || "";
    lb.querySelector(".lb-count").textContent = (lbIndex + 1) + " / " + photos.length;
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    lbIndex = i; renderLb();
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb-close").focus();
  }
  function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  function lbMove(d) { lbIndex = (lbIndex + d + photos.length) % photos.length; renderLb(); }
  lb.querySelector(".lb-close").addEventListener("click", closeLb);
  lb.querySelector(".ss-prev").addEventListener("click", function () { lbMove(-1); });
  lb.querySelector(".ss-next").addEventListener("click", function () { lbMove(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") lbMove(-1);
    if (e.key === "ArrowRight") lbMove(1);
  });
  swipe(lb, function () { lbMove(1); }, function () { lbMove(-1); });

  /* Carrousel 3D */
  document.querySelectorAll(".c3d").forEach(function (box) {
    var ring = box.querySelector(".c3d-ring");
    var scene = box.querySelector(".c3d-scene");
    // Photos en format paysage, 16 au plus pour garder un cercle lisible
    var list = [];
    photos.forEach(function (p, i) { if (!p.v) list.push(i); });
    var pas = Math.max(1, Math.floor(list.length / 16));
    list = list.filter(function (_, k) { return k % pas === 0; }).slice(0, 16);
    var n = list.length, items = [], moved = 0;
    list.forEach(function (pi) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "c3d-item";
      b.setAttribute("aria-label", "Agrandir : " + alt(photos[pi], pi));
      var im = document.createElement("img");
      im.src = thumb(photos[pi]); im.alt = ""; im.draggable = false;
      b.appendChild(im);
      b.addEventListener("click", function (ev) { if (moved > 6) { ev.preventDefault(); return; } openLb(pi); });
      ring.appendChild(b); items.push(b);
    });
    var angle = 0, vel = 0, radius = 0, seg = 360 / n, hover = false, dragging = false, lastX = 0, target = null;
    var auto = reduceMotion ? 0 : -0.1;
    function layout() {
      radius = Math.round((ring.offsetWidth / 2) / Math.tan(Math.PI / n) + 24);
      items.forEach(function (it, k) { it.style.transform = "rotateY(" + (k * seg) + "deg) translateZ(" + radius + "px)"; });
    }
    function render() {
      ring.style.transform = "translateZ(" + (-radius) + "px) rotateX(-3deg) rotateY(" + angle + "deg)";
      items.forEach(function (it, k) {
        var a = ((k * seg + angle) % 360 + 360) % 360; if (a > 180) a -= 360;
        it.style.filter = "brightness(" + (0.5 + 0.5 * Math.max(Math.cos(a * Math.PI / 180), 0)) + ")";
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
    scene.addEventListener("pointerdown", function (ev) { dragging = true; moved = 0; lastX = ev.clientX; vel = 0; target = null; scene.classList.add("dragging"); });
    window.addEventListener("pointermove", function (ev) {
      if (!dragging) return;
      var dx = ev.clientX - lastX; lastX = ev.clientX; moved += Math.abs(dx);
      angle += dx * 0.25; vel = dx * 0.25;
    });
    window.addEventListener("pointerup", function () { if (dragging) { dragging = false; scene.classList.remove("dragging"); } });
    scene.addEventListener("mouseenter", function () { hover = true; });
    scene.addEventListener("mouseleave", function () { hover = false; });
    function snap(dir) { target = Math.round(angle / seg) * seg + dir * seg; vel = 0; }
    box.querySelector("[data-prev]").addEventListener("click", function () { snap(1); });
    box.querySelector("[data-next]").addEventListener("click", function () { snap(-1); });
    scene.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowLeft") { snap(1); ev.preventDefault(); }
      if (ev.key === "ArrowRight") { snap(-1); ev.preventDefault(); }
    });
    window.addEventListener("resize", layout);
    layout(); render(); requestAnimationFrame(tick);
  });

  /* Diaporama de la galerie */
  var ss = document.querySelector(".slideshow");
  if (ss && photos.length) {
    var stage = ss.querySelector(".ss-stage");
    var thumbsBox = document.querySelector(".thumbs");
    var playBtn = document.querySelector("[data-play]");
    var countEl = document.querySelector(".ss-count");
    var legende = document.querySelector(".ss-legende");
    var DELAI = 5000;
    var idx = 0, playing = !reduceMotion, sTimer, slideEls = [];
    photos.forEach(function (p, i) {
      var s = document.createElement("div");
      s.className = "slide";
      stage.appendChild(s); slideEls.push(s);
      var tb = document.createElement("button");
      tb.type = "button"; tb.setAttribute("aria-label", "Voir la photo " + (i + 1));
      var ti = document.createElement("img");
      ti.src = thumb(p); ti.alt = ""; ti.loading = "lazy";
      tb.appendChild(ti);
      tb.addEventListener("click", function () { go(i); });
      thumbsBox.appendChild(tb);
    });
    var thumbBtns = thumbsBox.querySelectorAll("button");
    function load(i) {
      i = (i + photos.length) % photos.length;
      var s = slideEls[i];
      if (s.firstChild) return;
      var im = document.createElement("img");
      im.src = full(photos[i]); im.alt = alt(photos[i], i);
      im.addEventListener("click", function () { setPlaying(false); openLb(i); });
      s.appendChild(im);
    }
    function go(i) {
      idx = (i + photos.length) % photos.length;
      load(idx); load(idx + 1);
      slideEls.forEach(function (s, k) { s.classList.toggle("active", k === idx); });
      thumbBtns.forEach(function (b, k) { b.classList.toggle("active", k === idx); });
      var tbtn = thumbBtns[idx];
      thumbsBox.scrollTo({ left: tbtn.offsetLeft - thumbsBox.clientWidth / 2 + tbtn.clientWidth / 2 });
      countEl.textContent = (idx + 1) + " / " + photos.length;
      legende.textContent = photos[idx].c || "";
      schedule();
    }
    function schedule() { clearTimeout(sTimer); if (playing) sTimer = setTimeout(function () { go(idx + 1); }, DELAI); }
    function setPlaying(v) { playing = v; playBtn.textContent = v ? "Pause" : "Lecture"; schedule(); }
    ss.querySelector(".ss-prev").addEventListener("click", function () { go(idx - 1); });
    ss.querySelector(".ss-next").addEventListener("click", function () { go(idx + 1); });
    playBtn.addEventListener("click", function () { setPlaying(!playing); });
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
  if (grid) photos.forEach(function (p, i) {
    var fig = document.createElement("figure");
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", "Agrandir : " + alt(p, i));
    var img = document.createElement("img");
    img.src = thumb(p); img.alt = ""; img.loading = "lazy";
    b.appendChild(img); fig.appendChild(b);
    if (p.c) { var fc = document.createElement("figcaption"); fc.textContent = p.c; fig.appendChild(fc); }
    b.addEventListener("click", function () { openLb(i); });
    grid.appendChild(fig);
  });

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
    var label = b.textContent;
    b.addEventListener("click", function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.getAttribute("data-copy")).then(function () {
        b.textContent = "Numéro copié";
        setTimeout(function () { b.textContent = label; }, 2000);
      });
    });
  });

  /* Formulaire de contact : ouvre la messagerie avec le message prérempli */
  var form = document.getElementById("contact-form");
  if (form) {
    var sujet = new URLSearchParams(location.search).get("sujet");
    var sujets = { benevolat: "Devenir bénévole", partenariat: "Partenariat", don: "Don" };
    if (sujet && sujets[sujet]) form.sujet.value = sujets[sujet];
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var d = new FormData(form);
      var corps = d.get("message") + "\n\n" + d.get("nom") + "\n" + d.get("email") + (d.get("tel") ? "\n" + d.get("tel") : "");
      location.href = "mailto:contact@flejom.org?subject=" + encodeURIComponent(d.get("sujet") + " — " + d.get("nom")) + "&body=" + encodeURIComponent(corps);
    });
  }
})();
