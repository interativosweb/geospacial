import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

/* =========================
   UI / Modos
========================= */
const layer2d = document.getElementById('layer2d');
const layer3d = document.getElementById('layer3d');

const btnMode3D = document.getElementById('btnMode3D');
const btnMode2D = document.getElementById('btnMode2D');
const statusEl = document.getElementById('status');

const toolbox = document.getElementById('toolbox');
const btnToggleTools = document.getElementById('btnToggleTools');
const btnResetView = document.getElementById('btnResetView');

let mode = '3d';
let activeTool = 'select3d';

function setMode(next){
  mode = next;

  if (mode === '3d'){
    layer3d.classList.remove('hidden');
    layer2d.classList.add('hidden');
    btnMode3D.classList.add('active');
    btnMode2D.classList.remove('active');
    resize3D();
    setStatus();
  } else {
    layer2d.classList.remove('hidden');
    layer3d.classList.add('hidden');
    btnMode2D.classList.add('active');
    btnMode3D.classList.remove('active');
    setStatus();
  }

  // destaca ferramentas compatíveis (não desabilita, só informa por "mode" nos data attrs)
  refreshToolHighlights();
}

btnMode3D.addEventListener('click', () => setMode('3d'));
btnMode2D.addEventListener('click', () => setMode('2d'));

btnToggleTools.addEventListener('click', () => {
  toolbox.classList.toggle('compact');
});

btnResetView.addEventListener('click', () => {
  if (mode !== '3d') return;
  resetCamera();
});

function setActiveTool(tool){
  activeTool = tool;
  document.querySelectorAll('.toolbtn').forEach(b => b.classList.remove('active'));

  // marca ativo apenas se existir botão correspondente
  const btn = document.querySelector(`.toolbtn[data-tool="${tool}"]`);
  if (btn) btn.classList.add('active');

  // se for transform tool, sincroniza transform controls
  if (tool === 'tMove') setTransformMode('translate');
  if (tool === 'tRotate') setTransformMode('rotate');
  if (tool === 'tScale') setTransformMode('scale');

  setStatus();
}

function setStatus(){
  const pretty = (t) => ({
    select3d: 'Selecionar',
    orbit3d: 'Rotacionar Vista',
    pan3d: 'Mover Vista',
    zoom3d: 'Zoom',
    tMove: 'Mover Objeto',
    tRotate: 'Rotacionar Objeto',
    tScale: 'Escalar Objeto'
  }[t] || t);

  statusEl.textContent = `${mode.toUpperCase()} • ${pretty(activeTool)}`;
}

function refreshToolHighlights(){
  document.querySelectorAll('.toolbtn[data-mode]').forEach(btn => {
    const m = btn.getAttribute('data-mode');
    // Botão aparece sempre, mas se não for do modo atual, deixa “menos forte”
    btn.style.opacity = (m === mode) ? '1' : '0.55';
  });
}

/* Expand/collapse dos grupos */
document.querySelectorAll('.groupbtn').forEach(g => {
  g.addEventListener('click', () => {
    const key = g.dataset.group;
    const body = document.getElementById(`group-${key}`);
    if (!body) return;
    body.style.display = (body.style.display === 'none') ? 'grid' : 'none';
  });
});

/* Clique nas ferramentas */
document.querySelectorAll('.toolbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('disabled')) return;

    const tool = btn.dataset.tool;
    const toolMode = btn.dataset.mode;

    // Se clicar numa ferramenta 2D estando no 3D (ou vice-versa), muda modo automaticamente
    if (toolMode && toolMode !== mode){
      setMode(toolMode);
    }

    // Ações imediatas
    if (tool === 'addCube') return addObject3D('cube');
    if (tool === 'addSphere') return addObject3D('sphere');
    if (tool === 'addCylinder') return addObject3D('cylinder');
    if (tool === 'addCone') return addObject3D('cone');
    if (tool === 'addPlane') return addObject3D('plane');

    if (tool === 'deleteSelected') return deleteSelected3D();
    if (tool === 'clearAll3D') return clearAll3D();

    if (tool === 'rect2d') return createRect2D();
    if (tool === 'tri2d') return createTriangle2D();
    if (tool === 'circle2d') return createCircle2D();
    if (tool === 'clear2d') return clear2D();

    // Ferramentas “de estado”
    if (tool) setActiveTool(tool);
  });
});

/* Inicial */
setMode('3d');
setActiveTool('select3d');
refreshToolHighlights();

/* =========================
   2D — SVG simples (sem moldura)
========================= */
const svg = document.getElementById('svg2d');

let selected2D = null;
let drag2D = { on:false, startX:0, startY:0, origX:0, origY:0, origPoints:null };

function svgPoint(evt){
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function shapeStyle(el){
  el.setAttribute('filter', 'url(#softShadow)');
  el.setAttribute('stroke', 'rgba(0,0,0,0.22)');
  el.setAttribute('stroke-width', '2');
  el.setAttribute('fill', 'rgba(0,113,227,0.10)');
  el.dataset.shape = 'true';
  el.style.cursor = 'grab';
  return el;
}

function select2D(el){
  if (selected2D) selected2D.setAttribute('stroke', 'rgba(0,0,0,0.22)');
  selected2D = el;
  if (selected2D) selected2D.setAttribute('stroke', 'rgba(0,113,227,0.70)');
}

function createRect2D(){
  const r = shapeStyle(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
  r.setAttribute('x', '420');
  r.setAttribute('y', '240');
  r.setAttribute('width', '200');
  r.setAttribute('height', '160');
  r.setAttribute('rx', '16');
  svg.appendChild(r);
  select2D(r);
}

function createCircle2D(){
  const c = shapeStyle(document.createElementNS('http://www.w3.org/2000/svg', 'circle'));
  c.setAttribute('cx', '520');
  c.setAttribute('cy', '320');
  c.setAttribute('r', '90');
  svg.appendChild(c);
  select2D(c);
}

function createTriangle2D(){
  const p = shapeStyle(document.createElementNS('http://www.w3.org/2000/svg', 'polygon'));
  p.setAttribute('points', '520,210 660,450 380,450');
  svg.appendChild(p);
  select2D(p);
}

function clear2D(){
  [...svg.querySelectorAll('[data-shape="true"]')].forEach(n => n.remove());
  select2D(null);
}

svg.addEventListener('pointerdown', (evt) => {
  if (mode !== '2d') return;

  const target = evt.target;
  if (target && target.dataset && target.dataset.shape === 'true'){
    select2D(target);
    drag2D.on = true;

    const p = svgPoint(evt);
    drag2D.startX = p.x; drag2D.startY = p.y;

    if (target.tagName === 'rect'){
      drag2D.origX = parseFloat(target.getAttribute('x'));
      drag2D.origY = parseFloat(target.getAttribute('y'));
    } else if (target.tagName === 'circle'){
      drag2D.origX = parseFloat(target.getAttribute('cx'));
      drag2D.origY = parseFloat(target.getAttribute('cy'));
    } else if (target.tagName === 'polygon'){
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
  if (mode !== '2d') return;
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
  drag2D.on = false;
  if (selected2D) selected2D.style.cursor = 'grab';
});

/* =========================
   3D — Three.js (seleção + objetos + TransformControls)
========================= */
const canvas3d = document.getElementById('canvas3d');

let renderer, scene, camera, orbit, transform;
let raycaster, mouse;
let objects3D = [];
let selected3D = null;
let isTransforming = false;

init3D();
animate3D();

function init3D(){
  renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
  camera.position.set(7, 6, 10);

  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.08;

  // “Apple clean”: limites leves
  orbit.minDistance = 2.5;
  orbit.maxDistance = 80;

  transform = new TransformControls(camera, renderer.domElement);
  transform.setSize(1.2);

  transform.addEventListener('dragging-changed', (e) => {
    isTransforming = e.value;
    orbit.enabled = !e.value;
  });
  transform.addEventListener('mouseDown', () => { isTransforming = true; });
  transform.addEventListener('mouseUp', () => { isTransforming = false; });

  scene.add(transform);

  // iluminação suave
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e6ff, 0.92));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(10, 16, 12);
  scene.add(key);

  // grid discreta
  const grid = new THREE.GridHelper(40, 40, 0x000000, 0x000000);
  grid.material.opacity = 0.06;
  grid.material.transparent = true;
  scene.add(grid);

  const axes = new THREE.AxesHelper(5);
  axes.material.opacity = 0.25;
  axes.material.transparent = true;
  scene.add(axes);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  renderer.domElement.addEventListener('pointerdown', onPointerDown3D);
  window.addEventListener('resize', resize3D);
  resize3D();

  setTransformMode('translate');
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

function resetCamera(){
  camera.position.set(7, 6, 10);
  orbit.target.set(0, 1.2, 0);
  orbit.update();
}

function setTransformMode(modeName){
  transform.setMode(modeName);
  // destaca botões transform
  document.querySelectorAll('.toolbtn[data-tool="tMove"],.toolbtn[data-tool="tRotate"],.toolbtn[data-tool="tScale"]').forEach(b => b.classList.remove('active'));
  const map = { translate: 'tMove', rotate: 'tRotate', scale: 'tScale' };
  const id = map[modeName];
  const btn = document.querySelector(`.toolbtn[data-tool="${id}"]`);
  if (btn) btn.classList.add('active');
}

function materialClean(){
  return new THREE.MeshStandardMaterial({
    color: 0x1b6fe3,
    metalness: 0.04,
    roughness: 0.48,
    transparent: true,
    opacity: 0.88
  });
}

function outline(geom){
  return new THREE.LineSegments(
    new THREE.WireframeGeometry(geom),
    new THREE.LineBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.22 })
  );
}

function addObject3D(kind){
  if (mode !== '3d') setMode('3d');

  let geom;
  switch(kind){
    case 'cube': geom = new THREE.BoxGeometry(2.2, 2.2, 2.2); break;
    case 'sphere': geom = new THREE.SphereGeometry(1.35, 32, 24); break;
    case 'cylinder': geom = new THREE.CylinderGeometry(1.1, 1.1, 2.8, 32); break;
    case 'cone': geom = new THREE.ConeGeometry(1.35, 3.0, 32); break;
    case 'plane': geom = new THREE.PlaneGeometry(5.0, 5.0, 1, 1); break;
    default: geom = new THREE.BoxGeometry(2,2,2);
  }

  const mesh = new THREE.Mesh(geom, materialClean());

  // posição inicial agradável
  mesh.position.set((Math.random()-0.5)*1.4, kind === 'plane' ? 0.02 : 1.6, (Math.random()-0.5)*1.4);

  // se for plano, deixa deitado (tipo “chão”)
  if (kind === 'plane'){
    mesh.rotation.x = -Math.PI / 2;
    mesh.material.opacity = 0.35;
  }

  mesh.add(outline(geom));
  scene.add(mesh);
  objects3D.push(mesh);

  select3D(mesh);
  setActiveTool('tMove'); // já deixa pronto pra arrastar
}

function select3D(obj){
  selected3D = obj;
  transform.detach();
  if (selected3D) transform.attach(selected3D);
}

function onPointerDown3D(evt){
  if (mode !== '3d') return;

  // Se estiver mexendo no gizmo, não altera seleção
  if (isTransforming || transform.axis !== null) return;

  // Ferramentas de navegação: orbit/pan/zoom são do próprio OrbitControls
  // Aqui a gente só faz seleção quando a ferramenta ativa for "select3d" ou uma transform.
  const allowSelect = (activeTool === 'select3d' || activeTool === 'tMove' || activeTool === 'tRotate' || activeTool === 'tScale');
  if (!allowSelect) return;

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

function deleteSelected3D(){
  if (mode !== '3d') return;
  if (!selected3D) return;

  objects3D = objects3D.filter(o => o !== selected3D);
  scene.remove(selected3D);
  select3D(null);
}

function clearAll3D(){
  if (mode !== '3d') return;
  objects3D.forEach(o => scene.remove(o));
  objects3D = [];
  select3D(null);
}

/* =========================
   Ajustes finos: Pan/Zoom tool (UX)
========================= */
/**
 * GeoGebra tem ferramentas de “Move/Rotate/Zoom”.
 * Aqui, OrbitControls já faz tudo por padrão.
 * Mas a gente usa o estado activeTool para orientar o usuário.
 */
function applyNavMode(){
  // Mantém orbit sempre possível; só muda mensagem/estado.
  // Se você quiser travar, dá pra configurar orbit.mouseButtons.
}
applyNavMode();
