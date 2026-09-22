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
})();
