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

  /* Découpe un titre en mots animables (le texte reste lisible sans JavaScript) */
  function decouperMots(el, classe) {
    if (!el) return [];
    var mots = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = "";
    return mots.map(function (m, i) {
      var w = document.createElement("span");
      w.className = classe || "mot"; w.setAttribute("aria-hidden", "true");
      w.style.setProperty("--i", i);
      var inner = document.createElement("span");
      inner.textContent = m;
      w.appendChild(inner);
      el.appendChild(w);
      el.appendChild(document.createTextNode(" "));
      return w;
    });
  }

  /* Apparition douce des blocs au défilement */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var cibles = document.querySelectorAll(".titre-section, .bezel, .photo figcaption, .intro, .recit h2, .valeur, .c3d, .videos > div, .page-title h1, .page-title p");
    var images = document.querySelectorAll(".photo img, .recit-photo img, .mosaique img, .structure img, .une-photo img");
    var vu = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("vu"); vu.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    images.forEach(function (el) { el.classList.add("rv-img"); vu.observe(el); });
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
    var barre = document.createElement("div");
    barre.className = "hero-barre"; barre.setAttribute("aria-hidden", "true");
    hero.appendChild(barre);
    if (!reduceMotion) caps.forEach(function (c) { decouperMots(c.querySelector("h1, h2")); });
    function show(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("active", k === cur); });
      caps.forEach(function (c, k) {
        c.hidden = k !== cur;
        c.classList.remove("joue");
        if (k === cur) { void c.offsetWidth; c.classList.add("joue"); }
      });
      count.textContent = (cur + 1) + " / " + slides.length;
      barre.classList.remove("court"); void barre.offsetWidth;
      if (!reduceMotion) barre.classList.add("court");
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

  /* ---------- Effets avancés ---------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Citation du fondateur : les mots s'illuminent au fil du défilement
  var citation = document.querySelector(".grande-citation p");
  var motsCitation = (!reduceMotion && citation) ? decouperMots(citation, "mot-lumiere") : [];

  // Profondeur : la mosaïque et l'image d'accueil bougent à des vitesses différentes
  var couches = reduceMotion ? [] : [
    [".mosaique .m1", -0.05], [".mosaique .m2", 0.07], [".mosaique .m3", 0.13]
  ].map(function (c) { return [document.querySelector(c[0]), c[1]]; }).filter(function (c) { return c[0]; });

  var enAttente = false;
  function surDefilement() {
    enAttente = false;
    var h = innerHeight;
    couches.forEach(function (c) {
      var r = c[0].parentNode.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return;
      c[0].style.translate = "0 " + ((r.top + r.height / 2 - h / 2) * c[1]).toFixed(1) + "px";
    });
    if (hero && !reduceMotion && scrollY < h * 1.2) {
      hero.style.setProperty("--parallaxe", (scrollY * 0.28).toFixed(1) + "px");
    }
    if (motsCitation.length) {
      var rc = citation.getBoundingClientRect();
      var prog = (h * 0.85 - rc.top) / (h * 0.5);
      var allumes = Math.round(Math.max(0, Math.min(1, prog)) * motsCitation.length);
      motsCitation.forEach(function (m, i) { m.classList.toggle("on", i < allumes); });
    }
  }
  if (couches.length || motsCitation.length || hero) {
    addEventListener("scroll", function () { if (!enAttente) { enAttente = true; requestAnimationFrame(surDefilement); } }, { passive: true });
    surDefilement();
  }

  if (finePointer && !reduceMotion) {
    // Curseur « Voir » / « Glisser » au-dessus des photos
    var bulle = document.createElement("div");
    bulle.className = "curseur"; bulle.setAttribute("aria-hidden", "true");
    document.body.appendChild(bulle);
    var cx = innerWidth / 2, cy = innerHeight / 2, bx = cx, by = cy, actif = false;
    var cibleCurseur = [
      [".c3d-scene", "Glisser"], [".photo-grid button", "Voir"], [".slideshow", "Voir"],
      [".une-photo", "Lire"], [".mosaique", "Voir"]
    ];
    cibleCurseur.forEach(function (c) {
      document.querySelectorAll(c[0]).forEach(function (el) {
        el.addEventListener("pointerenter", function () { bulle.textContent = c[1]; bulle.classList.add("on"); actif = true; });
        el.addEventListener("pointerleave", function () { bulle.classList.remove("on"); actif = false; });
      });
    });
    document.querySelector(".mosaique") && document.querySelector(".mosaique").addEventListener("click", function () { location.href = "galerie.html"; });
    document.querySelector(".une-photo") && document.querySelector(".une-photo").addEventListener("click", function () { location.href = document.querySelector(".une-texte .lire").href; });
    addEventListener("pointermove", function (e) { cx = e.clientX; cy = e.clientY; }, { passive: true });
    (function suivre() {
      bx += (cx - bx) * 0.2; by += (cy - by) * 0.2;
      if (actif || bulle.classList.contains("on")) bulle.style.transform = "translate(" + bx + "px," + by + "px)";
      requestAnimationFrame(suivre);
    })();

    // Boutons « aimantés » : ils suivent légèrement la souris
    document.querySelectorAll(".btn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px " + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px";
      });
      b.addEventListener("pointerleave", function () { b.style.translate = ""; });
    });

    // Le carrousel 3D s'incline selon la position de la souris
    document.querySelectorAll(".c3d-scene").forEach(function (sc) {
      sc.addEventListener("pointermove", function (e) {
        var r = sc.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        sc.style.perspectiveOrigin = (50 - x * 30).toFixed(1) + "% " + (40 - y * 40).toFixed(1) + "%";
      });
      sc.addEventListener("pointerleave", function () { sc.style.perspectiveOrigin = ""; });
    });
  }
})();
