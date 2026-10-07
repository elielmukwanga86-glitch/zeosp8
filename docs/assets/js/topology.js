/* Hero network topology: a supervision server pinging its network segments.
   Orange packets = echo requests, green packets = replies. Canvas only, no dependency. */
(function () {
  'use strict';
  var canvas = document.querySelector('.hero__canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');

  var ACC = '232, 87, 42';
  var OK = '61, 190, 139';
  var LABELS = ['srv', 'lan', 'wifi', 'voip', 'cam', 'print', 'mgmt', 'école'];

  var W = 0, H = 0, DPR = 1;
  var core, hubs = [], leaves = [], packets = [], flashes = [];
  var pointer = { x: -9999, y: -9999 };
  var visible = true, raf = 0, lastT = 0, spawnIn = 0, clock = 0;

  // Deterministic random so the layout does not jump between visits.
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  function node(x, y) { return { bx: x, by: y, x: x, y: y }; }

  function build() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    seed = 11;
    var wide = W >= 1100;
    var narrow = W < 768;
    core = node(wide ? W * 0.72 : narrow ? W * 0.7 : W * 0.68, wide ? H * 0.34 : narrow ? H * 0.12 : H * 0.24);
    var R = Math.min(W, H) * (wide ? 0.3 : narrow ? 0.36 : 0.32);
    var count = wide ? 8 : 6;
    hubs = []; leaves = []; packets = []; flashes = [];
    for (var i = 0; i < count; i++) {
      var a = -Math.PI / 2 + (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      var rr = R * (0.72 + rnd() * 0.42);
      var hub = node(core.bx + Math.cos(a) * rr * 1.15, core.by + Math.sin(a) * rr * 0.82);
      hub.label = LABELS[i % LABELS.length];
      hub.leaves = [];
      var n = 6 + Math.floor(rnd() * 7);
      for (var k = 0; k < n; k++) {
        var la = rnd() * Math.PI * 2, d = 22 + rnd() * 58;
        var leaf = node(hub.bx + Math.cos(la) * d, hub.by + Math.sin(la) * d);
        leaf.hub = hub;
        hub.leaves.push(leaf); leaves.push(leaf);
      }
      hubs.push(hub);
    }
  }

  function settle(n, strength) {
    var tx = n.bx, ty = n.by;
    var dx = pointer.x - n.bx, dy = pointer.y - n.by;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 170) {
      var f = (1 - dist / 170) * strength;
      tx += dx * f; ty += dy * f;
    }
    n.x += (tx - n.x) * 0.1;
    n.y += (ty - n.y) * 0.1;
  }

  function spawn() {
    var hub = hubs[Math.floor(Math.random() * hubs.length)];
    var leaf = hub.leaves[Math.floor(Math.random() * hub.leaves.length)];
    packets.push({ path: [core, hub, leaf], t: 0, reply: false });
  }

  function pointOn(path, t) {
    var a = path[0], b = path[1], c = path[2];
    var l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
    var s = t * (l1 + l2);
    if (s <= l1) { var u = l1 ? s / l1 : 0; return [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u]; }
    var v = l2 ? (s - l1) / l2 : 0; return [b.x + (c.x - b.x) * v, b.y + (c.y - b.y) * v];
  }

  function step(dt) {
    clock += dt;
    core.x += (core.bx - core.x) * 0.1; core.y += (core.by - core.y) * 0.1;
    for (var i = 0; i < hubs.length; i++) settle(hubs[i], 0.08);
    for (var j = 0; j < leaves.length; j++) settle(leaves[j], 0.16);

    spawnIn -= dt;
    if (spawnIn <= 0 && packets.length < 18) { spawn(); spawnIn = 0.16 + Math.random() * 0.22; }

    for (var p = packets.length - 1; p >= 0; p--) {
      var pk = packets[p];
      pk.t += dt * 0.62;
      if (pk.t >= 1) {
        var end = pk.path[2];
        flashes.push({ x: end.x, y: end.y, t: 0, reply: pk.reply });
        if (!pk.reply) packets.push({ path: [pk.path[2], pk.path[1], pk.path[0]], t: 0, reply: true });
        packets.splice(p, 1);
      }
    }
    for (var f = flashes.length - 1; f >= 0; f--) { flashes[f].t += dt / 0.7; if (flashes[f].t >= 1) flashes.splice(f, 1); }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var i, j, h, l;

    // Links
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    for (i = 0; i < hubs.length; i++) { ctx.moveTo(core.x, core.y); ctx.lineTo(hubs[i].x, hubs[i].y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    for (i = 0; i < hubs.length; i++) {
      h = hubs[i];
      for (j = 0; j < h.leaves.length; j++) { l = h.leaves[j]; ctx.moveTo(h.x, h.y); ctx.lineTo(l.x, l.y); }
    }
    ctx.stroke();

    // Rings around the core
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    [0.32, 0.62, 0.95].forEach(function (k) {
      ctx.beginPath(); ctx.arc(core.x, core.y, Math.min(W, H) * 0.33 * k, 0, Math.PI * 2); ctx.stroke();
    });

    // Leaves
    ctx.fillStyle = 'rgba(214,220,227,0.55)';
    for (i = 0; i < leaves.length; i++) { ctx.beginPath(); ctx.arc(leaves[i].x, leaves[i].y, 1.9, 0, Math.PI * 2); ctx.fill(); }

    // Flashes (arrival of a request or a reply)
    for (i = 0; i < flashes.length; i++) {
      var fl = flashes[i], e = 1 - Math.pow(1 - fl.t, 3);
      ctx.strokeStyle = 'rgba(' + (fl.reply ? OK : ACC) + ',' + (0.7 * (1 - fl.t)) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(fl.x, fl.y, 3 + e * (fl.reply ? 22 : 13), 0, Math.PI * 2); ctx.stroke();
    }

    // Packets with a short trail
    for (i = 0; i < packets.length; i++) {
      var pk = packets[i], col = pk.reply ? OK : ACC;
      for (var k = 4; k >= 0; k--) {
        var tt = pk.t - k * 0.018;
        if (tt < 0) continue;
        var pt = pointOn(pk.path, tt);
        ctx.fillStyle = 'rgba(' + col + ',' + (k === 0 ? 1 : 0.5 - k * 0.09) + ')';
        ctx.beginPath(); ctx.arc(pt[0], pt[1], k === 0 ? 2.4 : 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Hubs + labels
    ctx.font = '500 10.5px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'alphabetic';
    for (i = 0; i < hubs.length; i++) {
      h = hubs[i];
      ctx.fillStyle = '#0E1217';
      ctx.strokeStyle = 'rgba(214,220,227,0.85)';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(h.x, h.y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      var tw = ctx.measureText(h.label).width;
      ctx.fillStyle = 'rgba(14,18,23,0.85)';
      ctx.fillRect(h.x + 9, h.y - 21, tw + 8, 15);
      ctx.fillStyle = 'rgba(160,170,181,0.95)';
      ctx.fillText(h.label, h.x + 13, h.y - 10);
    }

    // Core (the supervision server)
    var pulse = 0.5 + 0.5 * Math.sin(clock * 2.1);
    ctx.fillStyle = 'rgba(' + ACC + ',' + (0.1 + pulse * 0.07) + ')';
    ctx.beginPath(); ctx.arc(core.x, core.y, 24 + pulse * 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E8572A';
    ctx.beginPath(); ctx.arc(core.x, core.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0E1217';
    ctx.beginPath(); ctx.arc(core.x, core.y, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.font = '600 10.5px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(245,154,117,0.95)';
    ctx.fillText('SUPERVISION', core.x + 18, core.y + 30);
  }

  function frame(t) {
    raf = 0;
    if (!visible || document.hidden || reduceMQ.matches) return;
    var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016;
    lastT = t;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!core) return;
    if (reduceMQ.matches) { draw(); return; }
    if (!raf) { lastT = 0; raf = requestAnimationFrame(frame); }
  }

  function init() {
    build();
    draw();
    start();
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      // Mobile browsers fire resize when the address bar moves: rebuild only if the canvas really changed size.
      var r = canvas.getBoundingClientRect();
      if (Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 80) return;
      build(); draw();
    }, 150);
  }, { passive: true });

  if (fineMQ.matches) {
    window.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', function () {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    packets = []; flashes = []; draw(); start();
  });

  // Draw once fonts are in so hub labels use IBM Plex Mono.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();
