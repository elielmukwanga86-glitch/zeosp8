/* Cover figure: the table of contents is drawn as a star topology (index.html = switch).
   This script sends a few "pings" along the wires: an orange echo request from the switch
   to a host, then a dark reply back. Pointing at a section pings it right away.
   SVG only, no dependency; nothing moves with prefers-reduced-motion or when off screen. */
(function () {
  'use strict';
  var svg = document.querySelector('.topo');
  if (!svg || !window.requestAnimationFrame) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var links = Array.prototype.slice.call(svg.querySelectorAll('.topo__link'));
  var wires = links.map(function (a) {
    var l = a.querySelector('.topo__wire');
    return { x1: +l.getAttribute('x1'), y1: +l.getAttribute('y1'), x2: +l.getAttribute('x2'), y2: +l.getAttribute('y2') };
  });
  var layer = document.createElementNS(NS, 'g');
  layer.setAttribute('aria-hidden', 'true');
  svg.insertBefore(layer, svg.querySelector('.topo__core'));

  var packets = [], visible = true, raf = 0, last = 0, next = 600, i = 0;
  var DURATION = 900;

  function send(k) {
    var c = document.createElementNS(NS, 'rect');
    c.setAttribute('width', '6'); c.setAttribute('height', '6');
    c.setAttribute('class', 'topo__packet');
    layer.appendChild(c);
    packets.push({ el: c, w: wires[k], t: 0, back: false });
    start();
  }

  function frame(now) {
    raf = 0;
    var dt = last ? Math.min(64, now - last) : 16;
    last = now;
    next -= dt;
    if (next <= 0 && !reduceMQ.matches) { send(i % wires.length); i += 1; next = 1500; }
    for (var p = packets.length - 1; p >= 0; p--) {
      var k = packets[p];
      k.t += dt / DURATION;
      if (k.t >= 1) {
        if (!k.back) { k.back = true; k.t = 0; k.el.setAttribute('class', 'topo__packet topo__packet--reply'); }
        else { layer.removeChild(k.el); packets.splice(p, 1); continue; }
      }
      var e = k.t < 0.5 ? 2 * k.t * k.t : 1 - Math.pow(-2 * k.t + 2, 2) / 2;
      var f = k.back ? 1 - e : e;
      var x = k.w.x1 + (k.w.x2 - k.w.x1) * f, y = k.w.y1 + (k.w.y2 - k.w.y1) * f;
      k.el.setAttribute('x', (x - 3).toFixed(1)); k.el.setAttribute('y', (y - 3).toFixed(1));
    }
    if (visible && !reduceMQ.matches) start();
    else last = 0;
  }
  function start() { if (!raf && visible && !reduceMQ.matches) raf = requestAnimationFrame(frame); }

  links.forEach(function (a, k) {
    a.addEventListener('pointerenter', function () { if (!reduceMQ.matches) send(k); });
    a.addEventListener('focus', function () { if (!reduceMQ.matches) send(k); });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(svg);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; if (visible) start(); });
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', start);
  start();
})();
