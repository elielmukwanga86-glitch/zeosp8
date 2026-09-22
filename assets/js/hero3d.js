/* CRESTE — scène 3D du hero : silhouette architecturale abstraite en fil d'or */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

(function(){
  var canvas = document.getElementById('hero-canvas');
  if(!canvas) return;

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a0b, 6, 23);

  var camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight || 1, 0.1, 100);
  camera.position.set(0, 5.2, 15.5);
  camera.lookAt(0, 1.6, 0);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene.add(new THREE.AmbientLight(0x40403a, 1.1));
  var keyLight = new THREE.DirectionalLight(0xfff2d9, 1.1);
  keyLight.position.set(6, 10, 6);
  scene.add(keyLight);
  var rimLight = new THREE.PointLight(0xd9b579, 6, 30, 2);
  rimLight.position.set(-6, 3, 4);
  scene.add(rimLight);

  var group = new THREE.Group();
  scene.add(group);

  var gold = 0xd9b579;
  var goldDim = 0x8a6a3f;

  // Abstract cluster of "towers" — extruded volumes with gold wireframe edges
  var seed = [
    {w:1.0,h:3.4,d:1.0,x:-3.6,z:-0.4},
    {w:0.8,h:5.2,d:0.8,x:-2.1,z:0.6},
    {w:1.3,h:2.4,d:1.1,x:-0.4,z:-0.8},
    {w:0.9,h:6.4,d:0.9,x:0.9,z:0.3},
    {w:1.1,h:3.8,d:1.0,x:2.4,z:-0.3},
    {w:0.7,h:4.6,d:0.75,x:3.6,z:0.7},
    {w:1.4,h:1.8,d:1.2,x:1.9,z:1.8},
    {w:0.6,h:2.6,d:0.6,x:-1.1,z:1.9}
  ];

  var towers = [];
  seed.forEach(function(b, i){
    var geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    var mat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.55, metalness: 0.35, transparent:true, opacity:0.9 });
    var mesh = new THREE.Mesh(geo, mat);
    var edges = new THREE.EdgesGeometry(geo);
    var lineMat = new THREE.LineBasicMaterial({ color: i % 3 === 0 ? gold : goldDim, transparent:true, opacity:0.9 });
    var lines = new THREE.LineSegments(edges, lineMat);

    var pivot = new THREE.Group();
    pivot.position.set(b.x, -1.2, b.z);
    mesh.position.y = b.h / 2;
    lines.position.y = b.h / 2;
    pivot.add(mesh, lines);
    pivot.scale.y = 0.001;
    group.add(pivot);
    towers.push({ pivot: pivot, delay: i * 0.12 });
  });

  // Ground grid — blueprint plane
  var gridHelper = new THREE.GridHelper(26, 26, goldDim, 0x1c1c1f);
  gridHelper.position.y = -1.2;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.18;
  scene.add(gridHelper);

  // Scattered point "stars" for depth
  var starGeo = new THREE.BufferGeometry();
  var starCount = 140;
  var positions = new Float32Array(starCount * 3);
  for(var i=0;i<starCount;i++){
    positions[i*3] = (Math.random()-0.5)*24;
    positions[i*3+1] = Math.random()*8;
    positions[i*3+2] = (Math.random()-0.5)*24 - 4;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var starMat = new THREE.PointsMaterial({ color: 0xd9b579, size: 0.02, transparent:true, opacity:0.5 });
  scene.add(new THREE.Points(starGeo, starMat));

  group.rotation.y = -0.35;

  var mouseX = 0, mouseY = 0, targetRotY = group.rotation.y;

  function onPointerMove(e){
    var x = (e.touches ? e.touches[0].clientX : e.clientX) / window.innerWidth;
    var y = (e.touches ? e.touches[0].clientY : e.clientY) / window.innerHeight;
    mouseX = x - 0.5;
    mouseY = y - 0.5;
  }
  window.addEventListener('mousemove', onPointerMove, {passive:true});
  window.addEventListener('touchmove', onPointerMove, {passive:true});

  var scrollFade = 1;
  function onScroll(){
    var h = canvas.closest('.hero');
    var vh = window.innerHeight || 1;
    var heroH = (h && h.offsetHeight) || vh;
    var p = Math.min(Math.max(window.scrollY / heroH, 0), 1);
    scrollFade = 1 - p;
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  function resize(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var clock = new THREE.Clock();
  var introT = 0;

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t){ var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function animate(){
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    introT = Math.min(introT + dt, 3);

    // buildings rising into place
    towers.forEach(function(t){
      var local = Math.min(Math.max((introT - 0.3 - t.delay) / 0.9, 0), 1);
      t.pivot.scale.y = prefersReduced ? 1 : Math.max(0.001, easeOutBack(local));
    });

    // camera settles from an elevated establishing shot into resting position
    var camT = easeOutCubic(Math.min(introT / 2.4, 1));
    if(!prefersReduced){
      camera.position.y = 5.2 + (2.4 - 5.2) * camT + mouseY * -0.4;
      camera.position.z = 15.5 + (11 - 15.5) * camT;
      camera.lookAt(0, 1.5, 0);

      targetRotY = -0.35 + mouseX * 0.5;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.04;
      group.rotation.y += dt * 0.03;
      group.position.y = Math.sin(clock.elapsedTime * 0.4) * 0.08;
    } else {
      camera.position.set(0, 2.4, 11);
      camera.lookAt(0, 1.5, 0);
    }

    var fadeIn = easeOutCubic(Math.min(introT / 1.4, 1));
    renderer.domElement.style.opacity = Math.max(Math.min(scrollFade, 1) * fadeIn, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
