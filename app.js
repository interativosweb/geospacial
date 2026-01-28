// ===============================
//  UI: alternar modos
// ===============================
const mode2dBtn = document.getElementById('mode2d');
const mode3dBtn = document.getElementById('mode3d');
const panel2d = document.getElementById('panel2d');
const panel3d = document.getElementById('panel3d');
const stage2d = document.getElementById('stage2d');
const stage3d = document.getElementById('stage3d');
const status = document.getElementById('status');

function setActive(btnOn, btnOff){
  btnOn.classList.add('active');
  btnOff.classList.remove('active');
}

function setMode(mode){
  if (mode === '2d'){
    setActive(mode2dBtn, mode3dBtn);
    panel2d.classList.remove('hidden');
    stage2d.classList.remove('hidden');
    panel3d.classList.add('hidden');
    stage3d.classList.add('hidden');
    status.textContent = 'Modo 2D';
  } else {
    setActive(mode3dBtn, mode2dBtn);
    panel3d.classList.remove('hidden');
    stage3d.classList.remove('hidden');
    panel2d.classList.add('hidden');
    stage2d.classList.add('hidden');
    status.textContent = 'Modo 3D';
    requestAnimationFrame(() => window.__resize3D?.());
  }
}

mode2dBtn.addEventListener('click', () => setMode('2d'));
mode3dBtn.addEventListener('click', () => setMode('3d'));

// ===============================
//  2D (SVG) — criar e arrastar formas
// ===============================
const svg = document.getElementById('svg2d');
const clear2dBtn = document.getElementById('clear2d');

let selected2D = null;
let drag2D = { on:false, startX:0, startY:0, origX:0, origY:0, origPoints:null };

function svgPoint(evt){
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function makeShapeBase(el){
  el.setAttribute('filter', 'url(#shadow)');
  el.setAttribute('stroke', 'rgba(0,0,0,0.20)');
  el.setAttribute('stroke-width', '2');
  el.setAttribute('fill', 'rgba(0,113,227,0.12)');
  el.dataset.shape = 'true';
  el.style.cursor = 'grab';
  return el;
}

function select2D(el){
  if (selected2D) selected2D.setAttribute('stroke', 'rgba(0,0,0,0.20)');
  selected2D = el;
  if (selected2D) selected2D.setAttribute('stroke', 'rgba(0,113,227,0.65)');
}

function createRect(){
  const r = makeShapeBase(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
  r.setAttribute('x', '420');
  r.setAttribute('y', '250');
  r.setAttribute('width', '180');
  r.setAttribute('height', '140');
  r.setAttribute('rx', '14');
  svg.appendChild(r);
  select2D(r);
}

function createCircle(){
  const c = makeShapeBase(document.createElementNS('http://www.w3.org/2000/svg', 'circle'));
  c.setAttribute('cx', '520');
  c.setAttribute('cy', '320');
  c.setAttribute('r', '80');
  svg.appendChild(c);
  select2D(c);
}

function createTriangle(){
  const p = makeShapeBase(document.createElementNS('http://www.w3.org/2000/svg', 'polygon'));
  p.setAttribute('points', '520,220 640,420 400,420');
  svg.appendChild(p);
  select2D(p);
}

document.querySelectorAll('[data-2d]').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset['2d'];
    if (type === 'rect') createRect();
    if (type === 'circle') createCircle();
    if (type === 'triangle') createTriangle();
  });
});

clear2dBtn.addEventListener('click', () => {
  [...svg.querySelectorAll('[data-shape="true"]')].forEach(n => n.remove());
  selected2D = null;
});

svg.addEventListener('pointerdown', (evt) => {
  const target = evt.target;
  if (target && target.dataset && target.dataset.shape === 'true'){
    select2D(target);
    drag2D.on = true;

    const p = svgPoint(evt);

    if (target.tagName === 'rect'){
      drag2D.startX = p.x; drag2D.startY = p.y;
      drag2D.origX = parseFloat(target.getAttribute('x'));
      drag2D.origY = parseFloat(target.getAttribute('y'));
    } else if (target.tagName === 'circle'){
      drag2D.startX = p.x; drag2D.startY = p.y;
      drag2D.origX = parseFloat(target.getAttribute('cx'));
      drag2D.origY = parseFloat(target.getAttribute('cy'));
    } else if (target.tagName === 'polygon'){
      drag2D.startX = p.x; drag2D.startY = p.y;
      drag2D.origPoints = target.getAttribute('points')
        .trim().split(/\s+/).map(pair => pair.split(',').map(Number));
    }

    target.setPointerCapture(evt.pointerId);
    target.style.cursor = 'grabbing';
  } else {
    select2D(null);
  }
});

svg.addEventListener('pointermove', (evt) => {
  if (!drag2D.on || !selected2D) return;

  const p = svgPoint(evt);
  const dx = p.x - drag2D.startX;
  const dy = p.y - drag2D.startY;

  if (selected2D.tagName === 'rect'){
    selected2D.setAttribute('x', String(drag2D.origX + dx));
    selected2D.setAttribute('y', String(drag2D.origY + dy));
  } else if (selected2D.tagName === 'circle'){
    selected2D.setAttribute('cx', String(drag2D.origX + dx));
    selected2D.setAttribute('cy', String(drag2D.origY + dy));
  } else if (selected2D.tagName === 'polygon'){
    const moved = drag2D.origPoints.map(([x,y]) => [x + dx, y + dy]);
    selected2D.setAttribute('points', moved.map(([x,y]) => `${x},${y}`).join(' '));
  }
});

svg.addEventListener('pointerup', () => {
  if (!drag2D.on) return;
  drag2D.on = false;
  if (selected2D) selected2D.style.cursor = 'grab';
});

// ===============================
//  3D (Three.js) — TransformControls funcionando (FIX)
// ===============================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const canvas3d = document.getElementById('canvas3d');
const delete3dBtn = document.getElementById('delete3d');
const reset3dBtn  = document.getElementById('reset3d');
const clear3dBtn  = document.getElementById('clear3d');

const tMove   = document.getElementById('tMove');
const tRotate = document.getElementById('tRotate');
const tScale  = document.getElementById('tScale');

let renderer, scene, camera, orbit, transform, raycaster, mouse;
let selected3D = null;
let objects3D = [];
let isTransforming = false;

init3D();
animate3D();

function init3D(){
  renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(6, 5, 9);

  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;

  transform = new TransformControls(camera, renderer.domElement);

  // Tamanho do gizmo (mais fácil de pegar)
  transform.setSize(1.15);

  transform.addEventListener('dragging-changed', (e) => {
    isTransforming = e.value;
    orbit.enabled = !e.value;
  });

  transform.addEventListener('mouseDown', () => { isTransforming = true; });
  transform.addEventListener('mouseUp',   () => { isTransforming = false; });

  scene.add(transform);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xddddff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(6, 10, 8);
  scene.add(dir);

  const grid = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
  grid.material.opacity = 0.08;
  grid.material.transparent = true;
  scene.add(grid);

  const axes = new THREE.AxesHelper(4);
  axes.material.opacity = 0.35;
  axes.material.transparent = true;
  scene.add(axes);

  renderer.domElement.addEventListener('pointerdown', onPointerDown3D);

  window.addEventListener('resize', resize3D);
  resize3D();

  setTransformMode('translate');
  // expõe pro setMode('3d') forçar resize ao abrir
  window.__resize3D = resize3D;
}

function resize3D(){
  const rect = canvas3d.getBoundingClientRect();
  const w = Math.max(2, rect.width);
  const h = Math.max(2, rect.height);

  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function animate3D(){
  requestAnimationFrame(animate3D);
  orbit.update();
  renderer.render(scene, camera);
}

function setTransformMode(mode){
  transform.setMode(mode);

  [tMove, tRotate, tScale].forEach(b => b.classList.remove('active'));
  if (mode === 'translate') tMove.classList.add('active');
  if (mode === 'rotate') tRotate.classList.add('active');
  if (mode === 'scale') tScale.classList.add('active');
}

tMove.addEventListener('click', () => setTransformMode('translate'));
tRotate.addEventListener('click', () => setTransformMode('rotate'));
tScale.addEventListener('click', () => setTransformMode('scale'));

function materialClean(){
  return new THREE.MeshStandardMaterial({
    color: 0x1b6fe3,
    metalness: 0.05,
    roughness: 0.45,
    transparent: true,
    opacity: 0.88
  });
}

function addObject3D(kind){
  let geom;

  switch (kind){
    case 'cube':     geom = new THREE.BoxGeometry(2,2,2); break;
    case 'sphere':   geom = new THREE.SphereGeometry(1.2, 32, 24); break;
    case 'cylinder': geom = new THREE.CylinderGeometry(1, 1, 2.4, 32); break;
    case 'cone':     geom = new THREE.ConeGeometry(1.2, 2.6, 32); break;
    case 'plane':    geom = new THREE.PlaneGeometry(3.2, 3.2, 1, 1); break;
    default:         geom = new THREE.BoxGeometry(2,2,2);
  }

  const mesh = new THREE.Mesh(geom, materialClean());
  mesh.position.set((Math.random() - 0.5) * 1.2, 1.5, (Math.random() - 0.5) * 1.2);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geom),
    new THREE.LineBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.28 })
  );
  mesh.add(wire);

  scene.add(mesh);
  objects3D.push(mesh);
  select3D(mesh);
}

document.querySelectorAll('[data-3d]').forEach(btn => {
  btn.addEventListener('click', () => addObject3D(btn.dataset['3d']));
});

function select3D(obj){
  selected3D = obj;
  transform.detach();
  if (selected3D) transform.attach(selected3D);
}

function onPointerDown3D(evt){
  // não mudar seleção se estiver arrastando o gizmo / eixo do gizmo ativo
  if (isTransforming || transform.axis !== null) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((evt.clientY - rect.top) / rect.height) * 2 - 1);
  mouse.set(x, y);

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(objects3D, true);

  if (hits.length){
    let o = hits[0].object;
    while (o && !objects3D.includes(o)) o = o.parent;
    select3D(o || null);
  } else {
    select3D(null);
  }
}

delete3dBtn.addEventListener('click', () => {
  if (!selected3D) return;
  objects3D = objects3D.filter(o => o !== selected3D);
  scene.remove(selected3D);
  select3D(null);
});

reset3dBtn.addEventListener('click', () => {
  camera.position.set(6, 5, 9);
  orbit.target.set(0, 1.2, 0);
  orbit.update();
});

clear3dBtn.addEventListener('click', () => {
  objects3D.forEach(o => scene.remove(o));
  objects3D = [];
  select3D(null);
});
