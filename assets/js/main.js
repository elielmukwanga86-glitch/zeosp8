/* CRESTE — interactions communes à toutes les pages */
(function(){
  "use strict";

  /* ---------- Header scroll state + mobile nav ---------- */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  var root = document.documentElement;

  function onScroll(){
    if(!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
    var backTop = document.querySelector('.back-to-top');
    if(backTop) backTop.classList.toggle('is-visible', window.scrollY > 700);
  }
  document.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  if(toggle){
    toggle.addEventListener('click', function(){
      root.classList.toggle('nav-open');
    });
    document.querySelectorAll('.mobile-nav a').forEach(function(a){
      a.addEventListener('click', function(){ root.classList.remove('nav-open'); });
    });
  }

  var backTop = document.querySelector('.back-to-top');
  if(backTop){
    backTop.addEventListener('click', function(){
      window.scrollTo({top:0, behavior:'smooth'});
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, {threshold:.14, rootMargin:'0px 0px -40px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll('[data-counter]');
  function animateCounter(el){
    var target = parseFloat(el.getAttribute('data-counter')) || 0;
    var dur = 1400, start = null;
    function step(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if(p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  if('IntersectionObserver' in window && counters.length){
    var io2 = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ animateCounter(e.target); io2.unobserve(e.target); }
      });
    }, {threshold:.5});
    counters.forEach(function(c){ io2.observe(c); });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if(!q || !a) return;
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('is-open');
      item.closest('.faq-list').querySelectorAll('.faq-item').forEach(function(other){
        other.classList.remove('is-open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add('is-open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Projects filter (works.html / index.html) ---------- */
  var filterBar = document.querySelector('[data-filter-bar]');
  if(filterBar){
    var cards = document.querySelectorAll('[data-project-card]');
    filterBar.addEventListener('click', function(e){
      var btn = e.target.closest('.filter-btn');
      if(!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var cat = btn.getAttribute('data-filter');
      cards.forEach(function(card){
        var match = cat === 'Tous' || card.getAttribute('data-category') === cat;
        card.classList.toggle('is-hidden', !match);
      });
    });
  }

  /* ---------- 3D tilt on project / team cards ---------- */
  var tiltEls = document.querySelectorAll('[data-tilt]');
  tiltEls.forEach(function(el){
    var rect, raf = null;
    function onMove(e){
      rect = el.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      var rx = (0.5 - y) * 10;
      var ry = (x - 0.5) * 12;
      if(raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function(){
        el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(0)';
      });
    }
    function onLeave(){
      if(raf) cancelAnimationFrame(raf);
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    }
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  });

  /* ---------- Contact form (mailto fallback, no backend) ---------- */
  var form = document.querySelector('[data-contact-form]');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get('name') || '').toString();
      var email = (data.get('email') || '').toString();
      var phone = (data.get('phone') || '').toString();
      var message = (data.get('message') || '').toString();
      var to = form.getAttribute('data-contact-to') || '';
      var subject = encodeURIComponent('Nouveau contact site web — ' + name);
      var body = encodeURIComponent(
        'Nom : ' + name + '\n' +
        'Email : ' + email + '\n' +
        'Téléphone : ' + phone + '\n\n' +
        message
      );
      window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + body;
      var note = form.querySelector('.form-note');
      if(note) note.textContent = 'Votre application de messagerie va s\'ouvrir avec votre message pré-rempli.';
    });
  }

  /* ---------- Current nav highlight ---------- */
  var path = (window.location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-desktop a, .mobile-nav a').forEach(function(a){
    var href = a.getAttribute('href');
    if(href === path || (path === '' && href === 'index.html')){
      a.classList.add('is-active');
    }
  });

  /* ---------- Preloader ---------- */
  var minPreloadTimer = new Promise(function(res){ setTimeout(res, 500); });
  var pageReady = new Promise(function(res){
    if(document.readyState === 'complete') res();
    else window.addEventListener('load', res, {once:true});
  });
  Promise.all([minPreloadTimer, pageReady]).then(function(){
    document.documentElement.classList.add('is-loaded');
    setTimeout(function(){
      var pl = document.querySelector('.preloader');
      if(pl) pl.remove();
    }, 750);
  });

  /* ---------- Scroll progress bar ---------- */
  var progress = document.querySelector('.scroll-progress');
  function updateProgress(){
    if(!progress) return;
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - doc.clientHeight;
    var pct = scrollable > 0 ? (doc.scrollTop || window.scrollY) / scrollable * 100 : 0;
    progress.style.width = pct + '%';
  }
  document.addEventListener('scroll', updateProgress, {passive:true});
  updateProgress();

  /* ---------- Custom cursor (desktop, fine pointer only) ---------- */
  if(window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    document.body.classList.add('has-custom-cursor');
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var ringX = 0, ringY = 0, mx = 0, my = 0;
    window.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    }, {passive:true});
    (function raf(){
      ringX += (mx - ringX) * 0.18;
      ringY += (my - ringY) * 0.18;
      ring.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px) translate(-50%,-50%)';
      requestAnimationFrame(raf);
    })();
    document.addEventListener('mouseover', function(e){
      var t = e.target.closest('a, button, [data-tilt], [data-lightbox-trigger]');
      ring.classList.toggle('is-hover', !!t);
    });
    document.addEventListener('mouseleave', function(){
      dot.classList.add('is-hidden'); ring.classList.add('is-hidden');
    });
    document.addEventListener('mouseenter', function(){
      dot.classList.remove('is-hidden'); ring.classList.remove('is-hidden');
    });
  }

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('[data-magnetic]').forEach(function(el){
    el.addEventListener('mousemove', function(e){
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) * 0.25;
      var y = (e.clientY - r.top - r.height / 2) * 0.4;
      el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });
    el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
  });

  /* ---------- Image shimmer removal once loaded ---------- */
  document.querySelectorAll('img[loading="lazy"]').forEach(function(img){
    if(img.complete && img.naturalWidth) img.classList.add('is-loaded');
    else {
      img.addEventListener('load', function(){ img.classList.add('is-loaded'); });
      img.addEventListener('error', function(){ img.classList.add('is-loaded'); });
    }
  });

  /* ---------- Lightbox gallery ---------- */
  var lbTriggers = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox-trigger]'));
  if(lbTriggers.length){
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML =
      '<button class="lightbox-close" aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="lightbox-prev" aria-label="Précédent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<img alt="">' +
      '<button class="lightbox-next" aria-label="Suivant"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<div class="lightbox-count"></div>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('img');
    var lbCount = lb.querySelector('.lightbox-count');
    var current = 0;

    function openLb(i){
      current = i;
      var t = lbTriggers[i];
      lbImg.src = t.getAttribute('data-full') || t.querySelector('img').src;
      lbImg.alt = t.querySelector('img').alt || '';
      lbCount.textContent = (i + 1) + ' / ' + lbTriggers.length;
      lb.classList.add('is-open');
    }
    function closeLb(){ lb.classList.remove('is-open'); }
    function step(delta){ openLb((current + delta + lbTriggers.length) % lbTriggers.length); }

    lbTriggers.forEach(function(t, i){
      t.addEventListener('click', function(e){ e.preventDefault(); openLb(i); });
    });
    lb.querySelector('.lightbox-close').addEventListener('click', closeLb);
    lb.querySelector('.lightbox-prev').addEventListener('click', function(){ step(-1); });
    lb.querySelector('.lightbox-next').addEventListener('click', function(){ step(1); });
    lb.addEventListener('click', function(e){ if(e.target === lb) closeLb(); });
    document.addEventListener('keydown', function(e){
      if(!lb.classList.contains('is-open')) return;
      if(e.key === 'Escape') closeLb();
      if(e.key === 'ArrowLeft') step(-1);
      if(e.key === 'ArrowRight') step(1);
    });
  }
})();
