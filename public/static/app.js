/**
 * NexusForge — Industrial Simulation Platform
 * Frontend Application v2.0 — Motor 3D + IA completo
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
const NF = {
  scene: null,         // THREE.Scene
  camera: null,        // THREE.PerspectiveCamera
  renderer: null,      // THREE.WebGLRenderer
  controls: null,      // OrbitControls
  animFrameId: null,
  clock: null,
  workerMeshes: [],
  machineMeshes: [],
  currentScene: null,  // scene data JSON
  isRunning: false,
  simTime: 0,
  units: 0,
  failures: 0,
  projectId: null,
  simulationId: null,
  logEntries: [],
  floorPlanFile: null,
  floorPlanBase64: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// RENDER SHELL
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('root').innerHTML = `
<div id="loading-overlay">
  <div class="loading-brand">
    <div class="loading-logo" id="loading-logo-img">NF</div>
    <div class="loading-title">NexusForge</div>
  </div>
  <div class="spinner-ring"></div>
  <div class="loading-text">Iniciando plataforma de simulación industrial...</div>
  <div class="loading-progress"><div class="loading-bar"></div></div>
</div>
<div id="toast-container"></div>

<!-- HEADER -->
<header id="header">
  <div class="logo" onclick="showLanding()">
    <div class="logo-icon-fallback" id="logo-el">NF</div>
    <div>
      <div class="logo-name">Nexus<span>Forge</span></div>
    </div>
    <div class="logo-tag">BETA</div>
  </div>
  <nav class="header-nav">
    <button class="nav-btn active" id="btn-generate" onclick="switchMode('generate')">
      <i class="fas fa-wand-magic-sparkles"></i> Generar
    </button>
    <button class="nav-btn" id="btn-projects" onclick="switchMode('projects')">
      <i class="fas fa-folder-open"></i> Proyectos
    </button>
    <div class="header-divider"></div>
    <button class="nav-btn" onclick="exportScene()" title="Exportar JSON">
      <i class="fas fa-download"></i>
    </button>
    <button class="nav-btn" onclick="openModal('api-modal')" title="Configurar API Key">
      <i class="fas fa-key"></i>
    </button>
    <button class="nav-btn btn-cta" onclick="openModal('new-project-modal')">
      <i class="fas fa-plus"></i> Nuevo Proyecto
    </button>
  </nav>
</header>

<!-- MAIN LAYOUT -->
<div id="main-layout">
  <!-- SIDEBAR -->
  <aside id="sidebar">
    <div class="sidebar-tabs">
      <button class="tab-btn active" id="tab-btn-input" onclick="switchTab('input')">
        <i class="fas fa-pen-to-square"></i> Entrada
      </button>
      <button class="tab-btn" id="tab-btn-scene" onclick="switchTab('scene')">
        <i class="fas fa-cubes"></i> Escena
      </button>
      <button class="tab-btn" id="tab-btn-history" onclick="switchTab('history'); loadHistory()">
        <i class="fas fa-clock-rotate-left"></i> Historial
      </button>
    </div>

    <!-- TAB: INPUT -->
    <div class="tab-content active" id="tab-input">
      <div class="form-group">
        <label class="form-label"><i class="fas fa-industry"></i> Industria</label>
        <select class="form-select" id="industry-select">
          <option value="manufacturing">Manufactura / Ensamble</option>
          <option value="logistics">Logística / Distribución</option>
          <option value="food">Alimentos / Gastronomía</option>
          <option value="medical">Salud / Laboratorio</option>
          <option value="maintenance">Mantenimiento Industrial</option>
          <option value="construction">Construcción / Obra Civil</option>
          <option value="automotive">Automotriz</option>
          <option value="electronics">Electrónica</option>
          <option value="chemical">Química / Farmacéutica</option>
          <option value="custom">Personalizado (IA libre)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label"><i class="fas fa-file-lines"></i> Descripción del procedimiento</label>
        <textarea class="form-textarea" id="procedure-text" rows="9"
          placeholder="Describe el procedimiento de trabajo, metodología o proceso que deseas simular.

Ejemplo: 'Proceso de ensamblaje electrónico. El operario 1 recoge componentes del almacén y los lleva a la estación A donde trabaja 5 min. El operario 2 realiza soldadura en estación B. El inspector QC verifica en la estación de calidad...'

Más detalle = mejor simulación."></textarea>
      </div>

      <div class="form-group">
        <label class="form-label"><i class="fas fa-map"></i> Plano o croquis (opcional)</label>
        <div class="upload-zone" id="upload-zone" ondragover="event.preventDefault(); this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="handleDrop(event)">
          <input type="file" id="floor-plan-input" accept="image/*,.pdf" onchange="handleFloorPlanUpload(event)">
          <div class="upload-icon"><i class="fas fa-image"></i></div>
          <div class="upload-text">Arrastra o <strong>selecciona</strong> un plano</div>
          <div class="upload-sub">JPG, PNG, PDF • Hasta 10 MB</div>
        </div>
        <div id="floor-plan-preview" style="display:none"></div>
      </div>

      <button class="btn btn-generate btn-full" id="btn-gen" onclick="generateSimulation()">
        <div class="pulse"></div>
        <i class="fas fa-wand-magic-sparkles"></i>
        Generar Simulación 3D
      </button>

      <div class="section-header">
        <div class="section-header-title">Ejemplos rápidos</div>
        <div class="section-header-line"></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="example-card" onclick="loadExample('manufacturing')">
          <div class="example-icon">🏭</div>
          <div class="example-title">Manufactura</div>
          <div class="example-desc">Ensamble industrial con QC</div>
        </div>
        <div class="example-card" onclick="loadExample('logistics')">
          <div class="example-icon">📦</div>
          <div class="example-title">Logística</div>
          <div class="example-desc">Centro de distribución</div>
        </div>
        <div class="example-card" onclick="loadExample('food')">
          <div class="example-icon">👨‍🍳</div>
          <div class="example-title">Cocina</div>
          <div class="example-desc">Línea de alimentos</div>
        </div>
        <div class="example-card" onclick="loadExample('medical')">
          <div class="example-icon">🧪</div>
          <div class="example-title">Laboratorio</div>
          <div class="example-desc">Procesamiento de muestras</div>
        </div>
        <div class="example-card" onclick="loadExample('maintenance')">
          <div class="example-icon">🔧</div>
          <div class="example-title">Mantenimiento</div>
          <div class="example-desc">Taller industrial</div>
        </div>
        <div class="example-card" onclick="loadExample('construction')">
          <div class="example-icon">🏗️</div>
          <div class="example-title">Construcción</div>
          <div class="example-desc">Gestión de cuadrillas</div>
        </div>
      </div>
    </div>

    <!-- TAB: SCENE -->
    <div class="tab-content" id="tab-scene">
      <div id="scene-panel">
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-cube"></i></div>
          <div class="empty-title">Sin simulación activa</div>
          <div class="empty-sub">Genera una simulación desde la pestaña Entrada para ver los datos de la escena aquí.</div>
        </div>
      </div>
    </div>

    <!-- TAB: HISTORY -->
    <div class="tab-content" id="tab-history">
      <div id="history-panel">
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-clock"></i></div>
          <div class="empty-title">Sin historial</div>
          <div class="empty-sub">Crea un proyecto y genera simulaciones para verlas aquí.</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- 3D VIEWPORT -->
  <div id="viewport-container">
    <!-- LANDING -->
    <div id="landing-overlay">
      <div class="landing-grid-bg"></div>
      <div class="landing-badge"><i class="fas fa-bolt"></i> AI-Powered Industrial Simulation</div>
      <h1 class="landing-title">Simula procesos industriales<br>con Inteligencia Artificial</h1>
      <p class="landing-sub">Describe cualquier procedimiento de trabajo o sube un plano y NexusForge genera automáticamente una simulación 3D con trabajadores animados, KPIs en tiempo real y análisis de cuellos de botella.</p>
      <div class="landing-features">
        <div class="landing-feature"><i class="fas fa-brain"></i> Generación con IA</div>
        <div class="landing-feature"><i class="fas fa-cube"></i> Visualización 3D</div>
        <div class="landing-feature"><i class="fas fa-map"></i> Análisis de planos</div>
        <div class="landing-feature"><i class="fas fa-chart-line"></i> KPIs en tiempo real</div>
        <div class="landing-feature"><i class="fas fa-users"></i> Workers animados</div>
        <div class="landing-feature"><i class="fas fa-download"></i> Exportar JSON/informe</div>
      </div>
      <div class="landing-cta">
        <button class="btn btn-primary btn-lg" onclick="loadExample('manufacturing'); hideLanding()">
          <i class="fas fa-play"></i> Ver demo — Manufactura
        </button>
        <button class="btn btn-secondary btn-lg" onclick="hideLanding(); document.getElementById('procedure-text').focus()">
          <i class="fas fa-pen"></i> Escribir procedimiento
        </button>
      </div>
    </div>

    <!-- CANVAS -->
    <canvas id="viewport-canvas"></canvas>

    <!-- TOP BAR -->
    <div class="viewport-top-bar" id="viewport-top-bar" style="display:none">
      <div class="sim-title" id="sim-title">
        <i class="fas fa-industry" style="color:var(--nf-primary)"></i>
        <span>Sin título</span>
      </div>
      <div class="sim-status">
        <div class="status-dot" id="status-dot"></div>
        <span id="status-text">Iniciando...</span>
      </div>
    </div>

    <!-- OVERLAY (KPI + Camera) -->
    <div class="viewport-overlay" id="viewport-overlay" style="display:none">
      <!-- Live KPIs -->
      <div class="hud-card">
        <div class="hud-title"><i class="fas fa-gauge-high"></i> KPIs en vivo</div>
        <div class="live-kpi-grid">
          <div class="live-kpi">
            <div class="live-kpi-val" id="kpi-oee">—</div>
            <div class="live-kpi-label">OEE %</div>
          </div>
          <div class="live-kpi">
            <div class="live-kpi-val" id="kpi-throughput">—</div>
            <div class="live-kpi-label">Udad/h</div>
          </div>
          <div class="live-kpi">
            <div class="live-kpi-val" id="kpi-cycle">—</div>
            <div class="live-kpi-label">T.Ciclo s</div>
          </div>
          <div class="live-kpi">
            <div class="live-kpi-val" id="kpi-util">—</div>
            <div class="live-kpi-label">Utiliz. %</div>
          </div>
        </div>
        <div style="margin-top:10px; border-top:1px solid var(--nf-border); padding-top:8px;">
          <div class="running-bar" id="running-bar" style="display:none">
            <div class="dot"></div>
            <span id="sim-clock">00:00:00</span>
            <span style="margin-left:auto; color:var(--nf-text-muted)" id="units-counter">0 uds</span>
          </div>
        </div>
      </div>

      <!-- Camera Controls -->
      <div class="hud-card">
        <div class="hud-title"><i class="fas fa-camera"></i> Cámara</div>
        <div class="camera-controls">
          <button class="cam-btn active" id="cam-iso" onclick="setCameraPreset('iso')"><i class="fas fa-vector-square"></i> Isométrica</button>
          <button class="cam-btn" id="cam-top" onclick="setCameraPreset('top')"><i class="fas fa-arrow-down"></i> Planta</button>
          <button class="cam-btn" id="cam-front" onclick="setCameraPreset('front')"><i class="fas fa-square"></i> Frontal</button>
          <button class="cam-btn" id="cam-side" onclick="setCameraPreset('side')"><i class="fas fa-sidebar"></i> Lateral</button>
          <button class="cam-btn" id="cam-fly" onclick="setCameraPreset('fly')"><i class="fas fa-drone"></i> Aérea</button>
        </div>
      </div>
    </div>

    <!-- BOTTOM BAR -->
    <div class="viewport-bottom-bar" id="viewport-bottom-bar" style="display:none">
      <div class="worker-log" id="worker-log"></div>
      <div class="toolbar-floating">
        <button class="tool-btn" id="btn-play" onclick="toggleSimulation()">
          <i class="fas fa-play"></i> <span>Iniciar</span>
        </button>
        <button class="tool-btn" onclick="resetSimulation()">
          <i class="fas fa-rotate-left"></i>
        </button>
        <button class="tool-btn" onclick="exportScene()">
          <i class="fas fa-download"></i> Exportar
        </button>
        <button class="tool-btn" onclick="exportReport()">
          <i class="fas fa-file-chart-column"></i> Informe
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MODALS -->
<!-- API Key Modal -->
<div class="modal-overlay" id="api-modal" onclick="closeModalBg(event,'api-modal')">
  <div class="modal-box">
    <div class="modal-title"><i class="fas fa-key" style="color:var(--nf-primary)"></i> API Key de GenSpark</div>
    <div class="modal-desc">
      Ingresa tu API key para activar la generación con IA real.<br>
      Sin API key se usarán escenas predefinidas inteligentes.<br>
      <a href="https://www.genspark.ai" target="_blank" style="color:var(--nf-primary)">Obtener API key →</a>
    </div>
    <div class="form-group" style="margin-bottom:12px">
      <input class="form-input" id="api-key-input" type="password" placeholder="gsk-xxxxxxxxxxxxxxxx...">
    </div>
    <div style="display:flex; gap:8px">
      <button class="btn btn-primary" style="flex:1" onclick="saveApiKey()"><i class="fas fa-save"></i> Guardar</button>
      <button class="btn btn-secondary" onclick="closeModal('api-modal')">Cancelar</button>
    </div>
  </div>
</div>

<!-- New Project Modal -->
<div class="modal-overlay" id="new-project-modal" onclick="closeModalBg(event,'new-project-modal')">
  <div class="modal-box">
    <div class="modal-title"><i class="fas fa-folder-plus" style="color:var(--nf-primary)"></i> Nuevo Proyecto</div>
    <div class="modal-desc">Organiza tus simulaciones en proyectos por cliente, planta o proceso.</div>
    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Nombre del proyecto *</label>
      <input class="form-input" id="project-name" placeholder="Ej: Planta Monterrey — Línea 3">
    </div>
    <div class="form-group" style="margin-bottom:10px">
      <label class="form-label">Descripción</label>
      <input class="form-input" id="project-desc" placeholder="Breve descripción del proyecto">
    </div>
    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">Industria</label>
      <select class="form-select" id="project-industry">
        <option value="manufacturing">Manufactura</option>
        <option value="logistics">Logística</option>
        <option value="food">Alimentos</option>
        <option value="medical">Salud</option>
        <option value="maintenance">Mantenimiento</option>
        <option value="construction">Construcción</option>
        <option value="automotive">Automotriz</option>
        <option value="other">Otro</option>
      </select>
    </div>
    <div style="display:flex; gap:8px">
      <button class="btn btn-primary" style="flex:1" onclick="createProject()"><i class="fas fa-plus"></i> Crear Proyecto</button>
      <button class="btn btn-secondary" onclick="closeModal('new-project-modal')">Cancelar</button>
    </div>
  </div>
</div>
`;

// ─────────────────────────────────────────────────────────────────────────────
// INIT — wait for THREE.js to be available
// ─────────────────────────────────────────────────────────────────────────────
function waitForThree(callback, attempts) {
  if (attempts === undefined) attempts = 0;
  if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
    callback();
  } else if (attempts < 100) {
    setTimeout(() => waitForThree(callback, attempts + 1), 50);
  } else {
    console.error('THREE.js failed to load');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  waitForThree(() => {
    initThreeJS();
  });
  restoreApiKey();
  loadProjects();

  // Load logo if available
  const logoEl = document.getElementById('logo-el');
  if (logoEl) {
    const img = new Image();
    img.onload = () => {
      logoEl.innerHTML = '';
      logoEl.appendChild(img);
      img.className = 'logo-img';
    };
    img.src = '/static/nexusforge-logo.png';
  }

  // Hide loading overlay
  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) { overlay.classList.add('hidden'); setTimeout(() => overlay.remove(), 600); }
  }, 2400);
});

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function initThreeJS() {
  const canvas = document.getElementById('viewport-canvas');
  const container = document.getElementById('viewport-container');

  NF.clock = new THREE.Clock();

  // Renderer
  NF.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  NF.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  NF.renderer.shadowMap.enabled = true;
  NF.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  NF.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  NF.renderer.toneMappingExposure = 1.2;
  resizeRenderer();

  // Scene
  NF.scene = new THREE.Scene();
  NF.scene.background = new THREE.Color(0x050810);
  NF.scene.fog = new THREE.Fog(0x050810, 60, 120);

  // Camera
  NF.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 300);
  NF.camera.position.set(28, 22, 28);
  NF.camera.lookAt(0, 0, 0);

  // Controls
  NF.controls = new THREE.OrbitControls(NF.camera, canvas);
  NF.controls.enableDamping = true;
  NF.controls.dampingFactor = 0.07;
  NF.controls.minDistance = 8;
  NF.controls.maxDistance = 100;
  NF.controls.maxPolarAngle = Math.PI / 2.2;
  NF.controls.target.set(0, 0, 0);

  // Lights
  setupLights();

  // Start render loop
  animate();

  // Resize observer
  window.addEventListener('resize', resizeRenderer);
}

function setupLights() {
  // Ambient
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  NF.scene.add(ambient);

  // Directional (sun)
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
  sun.position.set(20, 30, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -50;
  sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  sun.shadow.bias = -0.001;
  NF.scene.add(sun);

  // Fill light
  const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
  fill.position.set(-15, 15, -15);
  NF.scene.add(fill);

  // Hemisphere
  const hemi = new THREE.HemisphereLight(0x1a2a5e, 0x0a0a0a, 0.4);
  NF.scene.add(hemi);
}

function resizeRenderer() {
  const container = document.getElementById('viewport-container');
  if (!container || !NF.renderer || !NF.camera) return;
  const w = container.clientWidth, h = container.clientHeight;
  NF.renderer.setSize(w, h, false);
  NF.camera.aspect = w / h;
  NF.camera.updateProjectionMatrix();
}

function animate() {
  NF.animFrameId = requestAnimationFrame(animate);
  const delta = NF.clock.getDelta();

  if (NF.controls) NF.controls.update();
  if (NF.isRunning) updateSimulation(delta);

  NF.renderer.render(NF.scene, NF.camera);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE BUILDING
// ─────────────────────────────────────────────────────────────────────────────
function buildScene(sceneData) {
  if (!sceneData) return;
  NF.currentScene = sceneData;

  // Clear existing objects (keep lights)
  clearSceneObjects();

  const env = sceneData.environment || {};
  const W = env.width || 30, D = env.depth || 20;

  // Update fog based on scene size
  NF.scene.fog.near = Math.max(W, D) * 2;
  NF.scene.fog.far = Math.max(W, D) * 5;

  // Floor
  buildFloor(W, D, env.floorColor || '#0d1117');

  // Grid
  const gridHelper = new THREE.GridHelper(Math.max(W, D) + 10, Math.floor((Math.max(W, D) + 10) / 2), 0x1a2a3a, 0x0d1520);
  NF.scene.add(gridHelper);

  // Perimeter walls (subtle)
  buildPerimeter(W, D, env.wallColor || '#161b22', env.ceilingHeight || 5);

  // Zones
  (sceneData.zones || []).forEach(z => buildZone(z));

  // Machines
  NF.machineMeshes = [];
  (sceneData.machines || []).forEach(m => {
    const mesh = buildMachine(m);
    if (mesh) NF.machineMeshes.push({ data: m, mesh });
  });

  // Workers
  NF.workerMeshes = [];
  (sceneData.workers || []).forEach(w => {
    const mesh = buildWorker(w);
    NF.workerMeshes.push({ data: w, mesh, routeIndex: 0, t: 0, totalTime: 0, state: 'idle' });
  });

  // Update UI
  updateScenePanel(sceneData);
  updateViewportUI(sceneData);

  // Reset sim state
  NF.simTime = 0;
  NF.units = 0;
  NF.failures = 0;

  // Show viewport UI
  document.getElementById('viewport-top-bar').style.display = 'flex';
  document.getElementById('viewport-overlay').style.display = 'flex';
  document.getElementById('viewport-bottom-bar').style.display = 'flex';

  // Switch to scene tab
  switchTab('scene');

  // Fit camera
  setTimeout(() => setCameraPreset('iso'), 100);
}

function clearSceneObjects() {
  const toRemove = [];
  NF.scene.traverse(obj => {
    if (obj.userData.removable) toRemove.push(obj);
  });
  toRemove.forEach(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    NF.scene.remove(obj);
  });
  NF.workerMeshes = [];
  NF.machineMeshes = [];
}

function markRemovable(obj) {
  obj.userData.removable = true;
  obj.children.forEach(c => markRemovable(c));
  return obj;
}

function buildFloor(W, D, colorHex) {
  const geo = new THREE.PlaneGeometry(W + 8, D + 8);
  const mat = new THREE.MeshLambertMaterial({ color: parseInt(colorHex.replace('#','0x')) });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  NF.scene.add(markRemovable(floor));
}

function buildPerimeter(W, D, colorHex, h) {
  const color = parseInt(colorHex.replace('#', '0x'));
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.3 });
  const walls = [
    { w: W + 8, d: 0.4, x: 0, z: -(D/2+4), y: h/2 },
    { w: W + 8, d: 0.4, x: 0, z:  (D/2+4), y: h/2 },
    { w: 0.4, d: D + 8, x: -(W/2+4), z: 0, y: h/2 },
    { w: 0.4, d: D + 8, x:  (W/2+4), z: 0, y: h/2 },
  ];
  walls.forEach(w => {
    const geo = new THREE.BoxGeometry(w.w, h, w.d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(w.x, w.y, w.z);
    NF.scene.add(markRemovable(mesh));
  });
}

function buildZone(z) {
  const color = parseInt((z.color || '#1e3a4c').replace('#', '0x'));
  const group = new THREE.Group();
  group.position.set(z.x || 0, 0, z.z || 0);

  // Floor slab
  const floorGeo = new THREE.BoxGeometry(z.width || 4, 0.08, z.depth || 4);
  const floorMat = new THREE.MeshLambertMaterial({ color });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = 0.04;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Border highlight
  const borderGeo = new THREE.EdgesGeometry(floorGeo);
  const borderMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
  const border = new THREE.LineSegments(borderGeo, borderMat);
  border.position.y = 0.04;
  group.add(border);

  // Zone type indicator column
  const indicatorColors = {
    entry: 0x22c55e, exit: 0xef4444, storage: 0xf59e0b,
    workstation: 0x3b82f6, assembly: 0x8b5cf6, inspection: 0x06b6d4,
    quality: 0xec4899, office: 0x6b7280
  };
  const indicatorColor = indicatorColors[z.type] || 0xffffff;
  const colGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
  const colMat = new THREE.MeshLambertMaterial({ color: indicatorColor });
  const col = new THREE.Mesh(colGeo, colMat);
  col.position.set(-(z.width || 4)/2 + 0.3, 0.3, -(z.depth || 4)/2 + 0.3);
  group.add(col);

  // Label sprite
  addTextSprite(z.label || z.name || '', group, 0, 0.5, 0, 1.2, '#ffffff');

  NF.scene.add(markRemovable(group));
}

function buildMachine(m) {
  const group = new THREE.Group();
  group.position.set(m.x || 0, 0, m.z || 0);
  const color = parseInt((m.color || '#445566').replace('#', '0x'));

  const w = m.width || 1.5, d = m.depth || 1.5, h = m.height || 1.5;

  // Machine body
  let bodyGeo;
  if (m.type === 'conveyor') {
    bodyGeo = new THREE.BoxGeometry(w, h * 0.4, d);
  } else if (m.type === 'crane') {
    // Base + arm
    const baseGeo = new THREE.BoxGeometry(w * 0.3, h * 0.7, d * 0.3);
    const baseMat = new THREE.MeshLambertMaterial({ color });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = h * 0.35;
    base.castShadow = true;
    group.add(base);

    const armGeo = new THREE.BoxGeometry(w * 2, h * 0.08, d * 0.08);
    const arm = new THREE.Mesh(armGeo, baseMat);
    arm.position.y = h * 0.7;
    group.add(arm);
    NF.scene.add(markRemovable(group));
    return group;
  } else {
    bodyGeo = new THREE.BoxGeometry(w, h, d);
  }
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = (m.type === 'conveyor') ? h * 0.2 : h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Machine cap/accent
  if (m.type !== 'conveyor') {
    const capGeo = new THREE.BoxGeometry(w * 0.9, h * 0.08, d * 0.9);
    const capMat = new THREE.MeshLambertMaterial({ color: 0x334455 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = h + 0.04;
    group.add(cap);
  }

  // Animated indicator light
  if (m.animated) {
    const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(w * 0.4, h + 0.2, d * 0.4);
    light.userData.isLight = true;
    group.add(light);

    // Glow point light
    const ptLight = new THREE.PointLight(0x00ff88, 0.5, 3);
    ptLight.position.copy(light.position);
    group.add(ptLight);
  }

  addTextSprite(m.name, group, 0, h + 0.5, 0, 0.9, '#94a3b8');

  NF.scene.add(markRemovable(group));
  return group;
}

function buildWorker(w) {
  const group = new THREE.Group();
  group.position.set(w.startX || 0, 0, w.startZ || 0);

  const bodyColor = parseInt((w.color || '#3b82f6').replace('#', '0x'));
  const helmetColor = parseInt((w.helmetColor || '#60a5fa').replace('#', '0x'));

  // Body (torso)
  const torsoGeo = new THREE.CapsuleGeometry(0.22, 0.7, 4, 8);
  const torsoMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.0;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const headGeo = new THREE.SphereGeometry(0.18, 12, 8);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xe8c89a });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.65;
  head.castShadow = true;
  group.add(head);

  // Helmet
  const helmetGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.18, 12);
  const helmetMat = new THREE.MeshLambertMaterial({ color: helmetColor });
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.position.y = 1.78;
  group.add(helmet);

  // Legs
  [-0.12, 0.12].forEach(xOff => {
    const legGeo = new THREE.CapsuleGeometry(0.1, 0.45, 4, 6);
    const legMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(xOff, 0.4, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  // Name label
  addTextSprite(w.name, group, 0, 2.1, 0, 1.0, w.color || '#3b82f6');

  // Worker action indicator
  const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.y = 2.0;
  dot.userData.isActionDot = true;
  group.add(dot);

  NF.scene.add(markRemovable(group));
  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT SPRITES
// ─────────────────────────────────────────────────────────────────────────────
function addTextSprite(text, parent, x, y, z, size, color) {
  if (!text) return;
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.roundRect?.(4, 16, 248, 36, 8) || ctx.fillRect(4, 16, 248, 36);
  ctx.fill();

  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.length > 18 ? text.slice(0, 17) + '…' : text, 128, 34);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(size * 2, size * 0.5, 1);
  sprite.userData.isLabel = true;
  parent.add(sprite);
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function updateSimulation(delta) {
  NF.simTime += delta;
  updateClock(NF.simTime);

  NF.workerMeshes.forEach(wm => {
    updateWorkerMovement(wm, delta);
  });

  // Animate machines
  NF.machineMeshes.forEach(mm => {
    if (mm.data.animated) {
      animateMachine(mm.mesh, delta);
    }
  });

  // Update live KPIs
  const elapsed = Math.max(1, NF.simTime);
  const efficiency = NF.currentScene?.kpis?.efficiency || 80;
  const cycleTime = NF.currentScene?.kpis?.cycleTime || 15;
  const oee = Math.min(99, efficiency + Math.sin(NF.simTime * 0.1) * 3).toFixed(1);
  const throughput = Math.round((3600 / cycleTime) * (efficiency / 100));
  const utilization = Math.min(99, efficiency + Math.cos(NF.simTime * 0.07) * 4).toFixed(1);

  document.getElementById('kpi-oee').textContent = oee;
  document.getElementById('kpi-throughput').textContent = throughput;
  document.getElementById('kpi-cycle').textContent = cycleTime;
  document.getElementById('kpi-util').textContent = utilization;

  // Count units every cycle
  NF.units = Math.floor(NF.simTime / cycleTime);
  document.getElementById('units-counter').textContent = `${NF.units} uds`;

  // Random failure events
  if (Math.random() < 0.0002) {
    NF.failures++;
    const workers = NF.currentScene?.workers || [];
    if (workers.length > 0) {
      const w = workers[Math.floor(Math.random() * workers.length)];
      addLog(`⚠️ ${w.name} — avería detectada`, w.color);
    }
  }
}

function updateWorkerMovement(wm, delta) {
  const route = wm.data.route;
  if (!route || route.length === 0) return;

  const step = route[wm.routeIndex % route.length];
  const target = new THREE.Vector3(step.targetX, 0, step.targetZ);
  const current = wm.mesh.position.clone();
  const dist = current.distanceTo(target);

  if (dist > 0.1) {
    // Move towards target
    const speed = getActionSpeed(step.action);
    const dir = target.clone().sub(current).normalize();
    wm.mesh.position.add(dir.multiplyScalar(Math.min(speed * delta, dist)));

    // Face movement direction
    if (dist > 0.3) {
      const angle = Math.atan2(dir.x, dir.z);
      wm.mesh.rotation.y = THREE.MathUtils.lerp(wm.mesh.rotation.y, angle, 0.15);
    }

    // Walk animation
    animateWorkerWalk(wm.mesh, delta, step.action);
  } else {
    // Arrived — perform action
    wm.t += delta;
    const actionDuration = step.duration || 3;
    animateWorkerAction(wm.mesh, delta, step.action, wm.t);

    if (wm.t >= actionDuration) {
      wm.t = 0;
      const prevIndex = wm.routeIndex % route.length;
      wm.routeIndex++;

      // Log action
      if (prevIndex !== wm.routeIndex % route.length) {
        addLog(`${getActionIcon(step.action)} ${wm.data.name}: ${step.description}`, wm.data.color);
      }
    }
  }

  // Update action indicator dot color
  const dot = wm.mesh.children.find(c => c.userData.isActionDot);
  if (dot && dot.material) {
    dot.material.color.set(getActionColor(step.action));
  }
}

function getActionSpeed(action) {
  const speeds = { walk: 3.0, carry: 2.0, run: 4.5, idle: 0, work: 0, inspect: 0, repair: 0 };
  return speeds[action] || 2.5;
}

function getActionColor(action) {
  const colors = {
    walk: '#94a3b8', carry: '#f59e0b', work: '#3b82f6',
    inspect: '#06b6d4', repair: '#ef4444', idle: '#4b5563'
  };
  return colors[action] || '#ffffff';
}

function getActionIcon(action) {
  const icons = { walk: '🚶', carry: '📦', work: '⚙️', inspect: '🔍', repair: '🔧', idle: '💤' };
  return icons[action] || '▶️';
}

function animateWorkerWalk(mesh, delta, action) {
  const t = NF.simTime * 4;
  if (action === 'walk' || action === 'carry') {
    mesh.position.y = Math.abs(Math.sin(t)) * 0.04;
  } else if (action === 'work') {
    mesh.position.y = Math.abs(Math.sin(t * 0.5)) * 0.02;
  }
}

function animateWorkerAction(mesh, delta, action, t) {
  if (action === 'work') {
    mesh.rotation.z = Math.sin(t * 3) * 0.06;
  } else if (action === 'inspect') {
    mesh.rotation.y += delta * 0.8;
  } else if (action === 'repair') {
    mesh.rotation.z = Math.sin(t * 5) * 0.1;
    mesh.position.y = 0.02 + Math.sin(t * 2) * 0.03;
  } else {
    mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, 0.1);
  }
}

function animateMachine(mesh, delta) {
  const t = NF.simTime;
  // Gently pulse the indicator light
  mesh.traverse(child => {
    if (child.userData.isLight) {
      const s = 0.8 + Math.abs(Math.sin(t * 2)) * 0.4;
      child.scale.setScalar(s);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA PRESETS
// ─────────────────────────────────────────────────────────────────────────────
function setCameraPreset(preset) {
  const s = NF.currentScene;
  const W = s?.environment?.width || 30;
  const D = s?.environment?.depth || 20;
  const cx = s ? 0 : 0, cz = s ? 0 : 0;

  // Deactivate all cam buttons
  ['iso','top','front','side','fly'].forEach(id => {
    const btn = document.getElementById(`cam-${id}`);
    if (btn) btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`cam-${preset}`);
  if (activeBtn) activeBtn.classList.add('active');

  const dist = Math.max(W, D) * 0.8;
  const positions = {
    iso:   new THREE.Vector3(dist, dist*0.9, dist),
    top:   new THREE.Vector3(0, dist*1.8, 0.01),
    front: new THREE.Vector3(0, dist*0.5, dist*1.3),
    side:  new THREE.Vector3(-dist*1.3, dist*0.5, 0),
    fly:   new THREE.Vector3(dist*0.3, dist*1.3, dist*0.3),
  };

  const pos = positions[preset] || positions.iso;
  animateCamera(pos, new THREE.Vector3(cx, 0, cz));
}

function animateCamera(targetPos, targetLook) {
  const startPos = NF.camera.position.clone();
  const startLook = NF.controls.target.clone();
  let t = 0;
  const duration = 0.8;

  function step(dt) {
    t += 0.016 / duration;
    if (t >= 1) { t = 1; }
    const ease = 1 - Math.pow(1 - t, 3);
    NF.camera.position.lerpVectors(startPos, targetPos, ease);
    NF.controls.target.lerpVectors(startLook, targetLook, ease);
    NF.controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION CONTROLS
// ─────────────────────────────────────────────────────────────────────────────
function toggleSimulation() {
  NF.isRunning = !NF.isRunning;
  const btn = document.getElementById('btn-play');
  const running = document.getElementById('running-bar');
  if (NF.isRunning) {
    btn.innerHTML = '<i class="fas fa-pause"></i> <span>Pausar</span>';
    btn.classList.add('active');
    running.style.display = 'flex';
    document.getElementById('status-dot').style.background = 'var(--nf-success)';
    document.getElementById('status-text').textContent = 'Simulación en curso';
    showToast('Simulación iniciada', 'success');
  } else {
    btn.innerHTML = '<i class="fas fa-play"></i> <span>Reanudar</span>';
    btn.classList.remove('active');
    document.getElementById('status-dot').style.background = 'var(--nf-warning)';
    document.getElementById('status-text').textContent = 'Pausada';
    showToast('Simulación pausada', 'info');
  }
}

function resetSimulation() {
  NF.isRunning = false;
  NF.simTime = 0;
  NF.units = 0;
  NF.failures = 0;

  const btn = document.getElementById('btn-play');
  btn.innerHTML = '<i class="fas fa-play"></i> <span>Iniciar</span>';
  btn.classList.remove('active');
  document.getElementById('running-bar').style.display = 'none';
  document.getElementById('status-dot').style.background = 'var(--nf-info)';
  document.getElementById('status-text').textContent = 'Listo';
  document.getElementById('worker-log').innerHTML = '';

  // Reset worker positions
  if (NF.currentScene) {
    NF.workerMeshes.forEach(wm => {
      wm.mesh.position.set(wm.data.startX || 0, 0, wm.data.startZ || 0);
      wm.routeIndex = 0;
      wm.t = 0;
    });
  }

  showToast('Simulación reiniciada', 'info');
}

function updateClock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const fmt = n => String(n).padStart(2, '0');
  const el = document.getElementById('sim-clock');
  if (el) el.textContent = `${fmt(h)}:${fmt(m)}:${fmt(s)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────────────────────────────────────
const MAX_LOG = 4;
function addLog(msg, color) {
  const container = document.getElementById('worker-log');
  if (!container) return;

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <div class="log-color" style="background:${color || '#94a3b8'}"></div>
    <span>${msg}</span>
  `;
  container.appendChild(entry);

  NF.logEntries.push({ msg, color, time: NF.simTime });

  while (container.children.length > MAX_LOG) {
    container.removeChild(container.firstChild);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATION
// ─────────────────────────────────────────────────────────────────────────────
async function generateSimulation() {
  const procedure = document.getElementById('procedure-text').value.trim();
  if (!procedure) {
    showToast('Escribe un procedimiento para generar la simulación', 'error');
    document.getElementById('procedure-text').focus();
    return;
  }

  const btn = document.getElementById('btn-gen');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando con IA...';

  hideLanding();
  showToast('Generando simulación con IA...', 'info');

  try {
    const industry = document.getElementById('industry-select').value;
    const apiKey = localStorage.getItem('nf_apikey') || '';

    const payload = {
      procedure,
      industry,
      projectId: NF.projectId || null,
      apiKey: apiKey || undefined,
    };

    if (NF.floorPlanBase64) {
      payload.floorPlanBase64 = NF.floorPlanBase64;
    }

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error al generar');

    if (data.simulationId) NF.simulationId = data.simulationId;

    buildScene(data.scene);
    const sourceLabel = data.source === 'ai' ? '✨ IA' : '📋 Plantilla';
    showToast(`Simulación generada (${sourceLabel}) — ${data.scene.zones?.length || 0} zonas, ${data.scene.workers?.length || 0} operarios`, 'success');

  } catch (err) {
    console.error(err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<div class="pulse"></div><i class="fas fa-wand-magic-sparkles"></i> Generar Simulación 3D';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────
const EXAMPLE_TEXTS = {
  manufacturing: `Proceso de ensamblaje de componentes electrónicos en línea de producción.
El operario de almacén recoge las tarjetas PCB y los componentes del almacén de materia prima y los lleva a la estación de pre-ensamble. 
El técnico de ensamble realiza el montaje de componentes en la PCB usando soldadura SMD, trabaja 6 minutos por unidad. 
Luego transfiere las placas al área de inspección de calidad donde el inspector QC verifica visualmente y con sonda de prueba durante 4 minutos. 
Las unidades aprobadas pasan a packaging para embalaje final y despacho.`,

  logistics: `Centro de distribución con flujo de entrada y salida de mercancías.
El receptor del muelle verifica y descarga camiones, escanea códigos de barras y registra en sistema WMS.
El clasificador organiza la mercancía por destino y la coloca en las zonas A (seco) o B (refrigerado).
El operador de picking recibe órdenes del WMS, recorre el almacén recolectando productos, arma pallets y los traslada al muelle de despacho.
El despachador verifica el pedido, genera guía y carga el camión.`,

  food: `Preparación de menús en cocina industrial de restaurante corporativo.
Recepción de materias primas y almacenamiento en cámara fría o bodega seca.
El cocinero de preparaciones frías lava, corta y porciona vegetales y proteínas durante 30 min.
El chef de partida caliente prepara salsas, sopas y guisos en fogones industriales.
Cocción en hornos de convección a temperatura controlada.
El emplatador arma los platos según estándar visual, controla temperatura con termómetro digital.
Entrega a servicio con control de tiempo máximo de 15 minutos desde cocción.`,

  medical: `Laboratorio clínico — procesamiento de muestras biológicas.
Recepción de muestras con cadena de custodia, verificación de datos del paciente y etiquetado con código de barras.
Triaje según tipo de análisis: hematología, bioquímica o microbiología.
Centrifugado de muestras de suero a 3500 rpm por 10 minutos.
Carga en analizador automático de hematología y bioquímica.
Revisión de resultados por técnico de laboratorio, validación por patólogo.
Liberación de resultados al sistema HIS y archivo de documentación.`,

  maintenance: `Mantenimiento correctivo de compresor industrial.
Recepción del equipo averiado, llenado de orden de trabajo con descripción de falla reportada.
Diagnóstico técnico en banco de diagnóstico: prueba eléctrica y mecánica, 45 minutos.
Solicitud de repuestos al almacén, espera o compra si no hay stock.
Mecanizado de piezas dañadas en torno CNC si es necesario.
Soldadura y resane de componentes estructurales.
Ensamble y ajuste del equipo, prueba funcional en banco de pruebas.
Entrega al cliente con informe de mantenimiento y garantía.`,

  construction: `Construcción de losa de entrepiso en obra civil de edificio residencial.
Maestro de obra revisa planos estructurales e imparte instrucciones a cuadrillas.
Cuadrilla de estructura arma encofrado de madera según planos, instala acero de refuerzo.
Cuadrilla de instalaciones coloca tuberías sanitarias y eléctricas embebidas en la losa.
Servicio de bombeo de concreto y vaciado de losa, vibrado para compactación.
Cuadrilla de acabados realiza nivelado y acabado superficial.
Supervisión e inspección de resistencia después de 28 días de curado.`
};

function loadExample(type) {
  const text = EXAMPLE_TEXTS[type];
  if (!text) return;
  document.getElementById('procedure-text').value = text.trim();
  document.getElementById('industry-select').value = type;
  showToast(`Ejemplo cargado: ${type}`, 'info');
  hideLanding();
  switchTab('input');
}

// ─────────────────────────────────────────────────────────────────────────────
// UI UPDATES
// ─────────────────────────────────────────────────────────────────────────────
function updateViewportUI(scene) {
  const title = document.getElementById('sim-title');
  if (title) title.innerHTML = `<i class="fas fa-industry" style="color:var(--nf-primary)"></i> <span>${scene.title || 'Simulación'}</span>`;

  const status = document.getElementById('status-text');
  if (status) status.textContent = 'Listo para simular';

  const dot = document.getElementById('status-dot');
  if (dot) dot.style.background = 'var(--nf-info)';

  // Initialize KPIs
  const kpis = scene.kpis || {};
  document.getElementById('kpi-oee').textContent = kpis.efficiency || '—';
  document.getElementById('kpi-throughput').textContent = kpis.throughput || '—';
  document.getElementById('kpi-cycle').textContent = kpis.cycleTime || '—';
  document.getElementById('kpi-util').textContent = kpis.efficiency || '—';
}

function updateScenePanel(scene) {
  const panel = document.getElementById('scene-panel');
  if (!panel) return;

  const kpis = scene.kpis || {};

  panel.innerHTML = `
    <div class="scene-title-text">${scene.title || 'Sin título'}</div>
    <div class="scene-desc-text">${scene.description || ''}</div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${kpis.efficiency || 0}%</div>
        <div class="kpi-label">Eficiencia</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${kpis.throughput || 0}</div>
        <div class="kpi-label">Uds/h</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${kpis.cycleTime || 0}s</div>
        <div class="kpi-label">Ciclo</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${kpis.workersCount || 0}</div>
        <div class="kpi-label">Operarios</div>
      </div>
    </div>

    ${scene.steps?.length ? `
    <div class="section-header"><div class="section-header-title"><i class="fas fa-list-check"></i> Pasos del proceso</div><div class="section-header-line"></div></div>
    <div class="steps-list">
      ${scene.steps.map((s, i) => `<div class="step-item"><div class="step-num">${i+1}</div>${s}</div>`).join('')}
    </div>` : ''}

    ${scene.bottlenecks?.length ? `
    <div class="section-header" style="margin-top:10px"><div class="section-header-title"><i class="fas fa-triangle-exclamation"></i> Cuellos de botella</div><div class="section-header-line"></div></div>
    ${scene.bottlenecks.map(b => `<div class="bottleneck-item"><i class="fas fa-warning" style="color:#f87171;min-width:14px"></i>${b}</div>`).join('')}` : ''}

    ${scene.improvements?.length ? `
    <div class="section-header" style="margin-top:10px"><div class="section-header-title"><i class="fas fa-lightbulb"></i> Mejoras sugeridas</div><div class="section-header-line"></div></div>
    ${scene.improvements.map(b => `<div class="improvement-item"><i class="fas fa-arrow-trend-up" style="color:#4ade80;min-width:14px"></i>${b}</div>`).join('')}` : ''}

    <div style="margin-top:14px">
      <button class="btn btn-primary btn-full" onclick="toggleSimulation()">
        <i class="fas fa-play"></i> Iniciar Simulación
      </button>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────────────────────────────────────
async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    if (!data.success) return;
    renderProjects(data.projects);
  } catch {}
}

function renderProjects(projects) {
  // Update header or any project list UI
}

async function createProject() {
  const name = document.getElementById('project-name').value.trim();
  if (!name) { showToast('El nombre es obligatorio', 'error'); return; }

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: document.getElementById('project-desc').value.trim(),
        industry: document.getElementById('project-industry').value
      })
    });
    const data = await res.json();
    if (data.success) {
      NF.projectId = data.project.id;
      closeModal('new-project-modal');
      showToast(`Proyecto creado: ${name}`, 'success');
      document.getElementById('project-name').value = '';
      document.getElementById('project-desc').value = '';
    }
  } catch (err) {
    showToast('Error al crear proyecto', 'error');
  }
}

async function loadHistory() {
  if (!NF.projectId) {
    document.getElementById('history-panel').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-folder-open"></i></div>
        <div class="empty-title">Sin proyecto activo</div>
        <div class="empty-sub">Crea un proyecto para guardar y ver el historial de simulaciones.</div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="openModal('new-project-modal')"><i class="fas fa-plus"></i> Crear Proyecto</button>
      </div>`;
    return;
  }

  try {
    const res = await fetch(`/api/projects/${NF.projectId}/simulations`);
    const data = await res.json();

    if (!data.success || !data.simulations?.length) {
      document.getElementById('history-panel').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-clock"></i></div>
          <div class="empty-title">Sin simulaciones aún</div>
          <div class="empty-sub">Genera una simulación para guardarla en este proyecto.</div>
        </div>`;
      return;
    }

    document.getElementById('history-panel').innerHTML = `
      <div class="projects-panel">
        ${data.simulations.map(s => `
          <div class="project-card" onclick="loadSimulation('${s.id}')">
            <div class="project-name">${s.name}</div>
            <div class="project-meta">
              <span>${s.workers_count} ops</span>
              <span>${s.zones_count} zonas</span>
              <span>${Math.round(s.efficiency || 0)}% ef.</span>
            </div>
            <div style="margin-top:5px">
              <span class="badge badge-orange">${new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          </div>`).join('')}
      </div>`;
  } catch {}
}

async function loadSimulation(id) {
  try {
    const res = await fetch(`/api/simulations/${id}`);
    const data = await res.json();
    if (data.success && data.simulation?.scene_json) {
      const scene = JSON.parse(data.simulation.scene_json);
      buildScene(scene);
      NF.simulationId = id;
      showToast('Simulación cargada', 'success');
    }
  } catch (err) {
    showToast('Error al cargar simulación', 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR PLAN UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
function handleFloorPlanUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  processFloorPlanFile(file);
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone').classList.remove('dragover');
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) processFloorPlanFile(file);
}

function processFloorPlanFile(file) {
  NF.floorPlanFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(',')[1];
    NF.floorPlanBase64 = base64;

    document.getElementById('upload-zone').style.display = 'none';
    const preview = document.getElementById('floor-plan-preview');
    preview.style.display = 'flex';
    preview.innerHTML = `
      <div class="upload-preview">
        <img src="${e.target.result}" alt="Plano">
        <div class="upload-preview-name">${file.name}</div>
        <button class="upload-preview-remove" onclick="removeFloorPlan()"><i class="fas fa-times"></i></button>
      </div>`;
    showToast('Plano cargado — Se usará para analizar la distribución espacial', 'success');
  };
  reader.readAsDataURL(file);
}

function removeFloorPlan() {
  NF.floorPlanFile = null;
  NF.floorPlanBase64 = null;
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('floor-plan-preview').style.display = 'none';
  document.getElementById('floor-plan-input').value = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportScene() {
  if (!NF.currentScene) { showToast('Genera una simulación primero', 'error'); return; }
  const blob = new Blob([JSON.stringify(NF.currentScene, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `nexusforge_scene_${Date.now()}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Escena exportada como JSON', 'success');
}

function exportReport() {
  if (!NF.currentScene) { showToast('Genera una simulación primero', 'error'); return; }
  const report = {
    generatedBy: 'NexusForge v2.0',
    timestamp: new Date().toISOString(),
    title: NF.currentScene.title,
    description: NF.currentScene.description,
    simulationTime: NF.simTime,
    unitsProduced: NF.units,
    failures: NF.failures,
    kpis: NF.currentScene.kpis,
    steps: NF.currentScene.steps,
    bottlenecks: NF.currentScene.bottlenecks,
    improvements: NF.currentScene.improvements,
    workers: NF.currentScene.workers?.map(w => ({ name: w.name, route: w.route.length + ' pasos' })),
    zones: NF.currentScene.zones?.map(z => ({ name: z.name, type: z.type })),
    eventLog: NF.logEntries.slice(-50)
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `nexusforge_report_${Date.now()}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Informe exportado', 'success');
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function switchMode(mode) {
  ['generate', 'projects'].forEach(m => document.getElementById(`btn-${m}`)?.classList.remove('active'));
  document.getElementById(`btn-${mode}`)?.classList.add('active');
  if (mode === 'projects') {
    switchTab('history');
    loadHistory();
  } else {
    switchTab('input');
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-btn-${tab}`)?.classList.add('active');
  document.getElementById(`tab-${tab}`)?.classList.add('active');
}

function showLanding() {
  document.getElementById('landing-overlay').style.display = 'flex';
}

function hideLanding() {
  document.getElementById('landing-overlay').style.display = 'none';
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function closeModalBg(event, id) {
  if (event.target.id === id) closeModal(id);
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (key) {
    localStorage.setItem('nf_apikey', key);
    showToast('API key guardada', 'success');
  }
  closeModal('api-modal');
}

function restoreApiKey() {
  const key = localStorage.getItem('nf_apikey') || '';
  const input = document.getElementById('api-key-input');
  if (input && key) input.value = key;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: 'check-circle', error: 'circle-xmark', info: 'circle-info', warning: 'triangle-exclamation' };
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${icons[type] || 'circle-info'}" style="color:${colors[type]}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}
