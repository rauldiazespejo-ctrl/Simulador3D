/**
 * SimPro3D — Motor de Simulación Industrial 3D
 * Genera escenas Three.js automáticamente desde descripción de procedimientos + planos
 */

// ─────────────────────────────────────────────────────────────────────────────
// RENDER APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
<!-- Loading Overlay -->
<div id="loading-overlay">
  <div class="spinner"></div>
  <div class="loading-text" id="loading-text">Generando simulación con IA...</div>
  <div class="loading-sub" id="loading-sub">Analizando procedimiento y creando escena 3D</div>
</div>

<!-- Toast Container -->
<div id="toast-container"></div>

<!-- Header -->
<header id="header">
  <div class="logo">
    <div class="logo-icon">⚙️</div>
    <div>
      <div class="logo-text">Sim<span>Pro3D</span></div>
    </div>
    <div class="logo-version">v4.0 AI</div>
  </div>
  <nav class="header-nav">
    <button class="nav-btn active" id="btn-generate" onclick="switchMode('generate')">
      <i class="fas fa-magic"></i> Generar
    </button>
    <button class="nav-btn" id="btn-refine" onclick="switchMode('refine')">
      <i class="fas fa-sliders-h"></i> Refinar
    </button>
    <button class="nav-btn" id="btn-export" onclick="exportScene()">
      <i class="fas fa-download"></i> Exportar
    </button>
    <button class="nav-btn" onclick="document.getElementById('api-key-modal').style.display='flex'" title="Configurar API Key">
      <i class="fas fa-key"></i>
    </button>
  </nav>
</header>

<!-- API Key Modal -->
<div id="api-key-modal" style="display:none; position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); align-items:center; justify-content:center;">
  <div style="background:#0a1628; border:1px solid rgba(59,130,246,0.4); border-radius:16px; padding:24px; width:420px; max-width:90vw;">
    <h2 style="font-size:1.1rem; font-weight:700; margin-bottom:8px;"><i class="fas fa-key" style="color:#60a5fa"></i> Configurar API Key</h2>
    <p style="font-size:0.82rem; color:#94a3b8; margin-bottom:16px; line-height:1.5;">
      Ingresa tu API key de GenSpark para activar la generación de escenas 100% personalizada con IA.
      Sin API key, se usarán escenas de demostración predefinidas.<br>
      <a href="https://www.genspark.ai" target="_blank" style="color:#60a5fa">Obtener API key →</a>
    </p>
    <input id="api-key-input" type="password" placeholder="gsk-xxxxxxxxxxxxxxxx..."
      value="${localStorage.getItem('simpro3d_apikey')||''}"
      style="width:100%; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(59,130,246,0.3); color:#f1f5f9; font-size:0.9rem; margin-bottom:12px;">
    <div style="display:flex; gap:8px;">
      <button onclick="saveApiKey()" class="btn btn-primary" style="flex:1">
        <i class="fas fa-save"></i> Guardar
      </button>
      <button onclick="document.getElementById('api-key-modal').style.display='none'" class="btn btn-secondary" style="flex:0.5">
        Cancelar
      </button>
    </div>
  </div>
</div>

<!-- Main Layout -->
<div id="main-layout">

  <!-- Sidebar -->
  <aside id="sidebar">
    <div class="sidebar-tabs">
      <button class="tab-btn active" onclick="switchTab('input')">
        <i class="fas fa-pen"></i> Entrada
      </button>
      <button class="tab-btn" id="tab-scene-btn" onclick="switchTab('scene')">
        <i class="fas fa-cubes"></i> Escena
      </button>
      <button class="tab-btn" onclick="switchTab('examples')">
        <i class="fas fa-lightbulb"></i> Ejemplos
      </button>
    </div>

    <!-- TAB: Input -->
    <div class="tab-content active" id="tab-input">
      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-file-alt" style="color:var(--accent)"></i>
          Descripción del procedimiento / metodología de trabajo
        </label>
        <textarea class="form-textarea" id="procedure-text" rows="8"
          placeholder="Describe el procedimiento de trabajo, metodología o proceso industrial que deseas simular.

Ejemplo: 'Proceso de ensamblaje de componentes electrónicos. El operario 1 toma las piezas del almacén, las lleva a la estación de ensamble donde trabaja durante 5 minutos, luego traslada el producto terminado a la zona de control de calidad. Mientras tanto, el operario 2 revisa los materiales...'"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">
          <i class="fas fa-map" style="color:var(--accent)"></i>
          Plano o croquis del lugar (opcional)
        </label>
        <div id="drop-zone" onclick="document.getElementById('file-input').click()"
          ondragover="handleDragOver(event)" ondrop="handleDrop(event)" ondragleave="handleDragLeave(event)">
          <div class="dz-icon">🗺️</div>
          <div class="dz-text">Arrastra un plano/croquis aquí o haz clic</div>
          <div class="dz-hint">PNG, JPG, PDF — El AI analizará el layout</div>
          <input type="file" id="file-input" accept="image/*,.pdf" onchange="handleFileSelect(event)">
        </div>
        <div id="image-preview">
          <img id="preview-img" src="" alt="Plano">
          <button class="remove-image" onclick="removeImage()" id="remove-image">✕</button>
        </div>
      </div>

      <button class="btn btn-primary" id="generate-btn" onclick="generateSimulation()">
        <i class="fas fa-magic"></i> Generar Simulación con IA
      </button>

      <!-- API Key hint -->
      <div id="api-key-hint" style="display:none; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:10px 12px; font-size:0.78rem; color:#fbbf24;">
        <i class="fas fa-info-circle"></i> <strong>Modo Demo activo</strong> — Para generar escenas 100% personalizadas con IA, 
        <a href="#" onclick="document.getElementById('api-key-modal').style.display='flex'" style="color:#60a5fa; text-decoration:underline">configura tu API key de GenSpark</a>.
      </div>

      <div id="refine-section" style="display:none">
        <div style="border-top:1px solid var(--border); padding-top:14px; display:flex; flex-direction:column; gap:8px;">
          <label class="form-label">
            <i class="fas fa-edit" style="color:var(--warning)"></i>
            Refinar escena (instrucción de cambio)
          </label>
          <input class="refine-input" id="refine-input" type="text"
            placeholder="Ej: 'Agrega una estación de pintura', 'Mueve el almacén a la derecha', 'Añade 2 operarios más'...">
          <button class="btn btn-warning" onclick="refineScene()">
            <i class="fas fa-sync"></i> Aplicar cambios con IA
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: Scene Info -->
    <div class="tab-content" id="tab-scene">
      <div id="scene-info">
        <div class="info-card" style="text-align:center; color:var(--text-secondary)">
          <p style="font-size:2rem; margin-bottom:8px">🏭</p>
          <p>Genera una simulación para ver los detalles de la escena</p>
        </div>
      </div>
    </div>

    <!-- TAB: Examples -->
    <div class="tab-content" id="tab-examples">
      <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:8px">
        Selecciona un ejemplo para cargarlo:
      </p>
      <div id="examples-list"></div>
    </div>
  </aside>

  <!-- Viewport -->
  <div id="viewport-container">
    <!-- Overlay inicial -->
    <div id="viewport-overlay">
      <div class="overlay-icon">🏭</div>
      <div class="overlay-title">SimPro3D — Generador de Simulaciones Industriales</div>
      <div class="overlay-subtitle">
        Describe un procedimiento de trabajo y opcionalmente sube un plano.<br>
        La IA generará automáticamente la simulación 3D animada.
      </div>
      <button class="btn btn-primary" style="width:auto; margin-top:8px" onclick="document.getElementById('procedure-text').focus()">
        <i class="fas fa-magic"></i> Comenzar
      </button>
    </div>

    <!-- Three.js Canvas -->
    <canvas id="three-canvas"></canvas>

    <!-- HUD Top Left -->
    <div id="hud-top-left" style="display:none">
      <h2 id="hud-title">Simulación</h2>
      <p id="hud-desc">Descripción</p>
      <div class="progress-bar-container" style="margin-top:8px">
        <div class="progress-bar-fill" id="hud-progress" style="width:0%"></div>
      </div>
    </div>

    <!-- HUD Top Center - KPI Live -->
    <div id="kpi-live-bar"></div>

    <!-- HUD Top Right -->
    <div id="hud-top-right" style="display:none">
      <div class="hud-badge running" id="status-badge">
        <div class="dot-blink"></div>
        <span id="status-text">Ejecutando</span>
      </div>
    </div>

    <!-- HUD Bottom Controls -->
    <div id="hud-bottom" style="display:none">
      <button class="ctrl-btn" onclick="togglePlay()" id="play-btn">
        <i class="fas fa-pause"></i> Pausar
      </button>
      <button class="ctrl-btn" onclick="resetSim()">
        <i class="fas fa-redo"></i> Reiniciar
      </button>
      <button class="ctrl-btn" onclick="setView('top')">
        <i class="fas fa-map"></i> Planta
      </button>
      <button class="ctrl-btn" onclick="setView('iso')">
        <i class="fas fa-cube"></i> Isométrica
      </button>
      <button class="ctrl-btn" onclick="setView('front')">
        <i class="fas fa-eye"></i> Frontal
      </button>
    </div>

    <!-- Time Display -->
    <div id="time-display" style="display:none">00:00:00</div>
  </div>
</div>
`

// ─────────────────────────────────────────────────────────────────────────────
// EJEMPLOS PREDEFINIDOS
// ─────────────────────────────────────────────────────────────────────────────
const EXAMPLES = [
  {
    title: '🏭 Línea de Ensamblaje Automotriz',
    badge: 'Manufactura', badgeColor: '#3b82f6',
    desc: 'Proceso de ensamblaje en estaciones de trabajo en serie.',
    text: `Proceso de fabricación en línea de ensamblaje automotriz. La fábrica tiene 4 estaciones en línea recta.

El Operario 1 recibe los chasis en la zona de recepción (izquierda), los prepara y los coloca en la cinta transportadora.

El Operario 2 en la Estación A instala el motor durante 6 minutos, luego señala que está listo.

El Operario 3 en la Estación B instala el interior y tablero durante 5 minutos.

El Operario 4 en la Estación C realiza la inspección final de calidad durante 3 minutos y coloca el producto terminado en la zona de despacho (derecha).

La planta tiene 40x20 metros. Las estaciones están separadas 8 metros entre sí. Hay un almacén de piezas en la parte trasera.`
  },
  {
    title: '🏥 Procedimiento de Laboratorio Clínico',
    badge: 'Salud', badgeColor: '#10b981',
    desc: 'Flujo de trabajo en laboratorio con manejo de muestras.',
    text: `Procedimiento de procesamiento de muestras en laboratorio clínico.

La técnica 1 recibe las muestras en la ventanilla de recepción (entrada frontal), las registra en el sistema y las etiqueta.

La técnica 2 lleva las muestras al área de centrifugado, opera la centrífuga durante 4 minutos, luego traslada las muestras al área de análisis.

La técnica 3 en el área de análisis realiza las pruebas en los analizadores automáticos, espera los resultados (5 minutos) y lleva los reportes a la zona de validación.

La técnica 4 valida los resultados y los envía al sistema. Planta de 20x15 metros con zona estéril separada.`
  },
  {
    title: '🍕 Cocina Industrial / Restaurante',
    badge: 'Alimentación', badgeColor: '#f59e0b',
    desc: 'Flujo de producción en cocina industrial.',
    text: `Proceso de producción en cocina industrial de restaurante.

La cocina tiene 25x15 metros con 4 zonas: preparación (izquierda), cocción (centro), emplatado (derecha) y lavado (fondo).

El Chef 1 en la zona de preparación corta y prepara los ingredientes durante 3 minutos, luego los pasa a cocción.

El Chef 2 en la zona de cocción prepara los platillos en las estufas industriales durante 8 minutos y pasa los platillos al área de emplatado.

El Chef 3 emplata y decora durante 2 minutos, luego coloca los platos en la ventana de servicio.

El Auxiliar recoge platos sucios de la ventana y los lleva a la zona de lavado, los limpia y los regresa al área de preparación.`
  },
  {
    title: '📦 Centro de Distribución Logístico',
    badge: 'Logística', badgeColor: '#8b5cf6',
    desc: 'Operaciones de recepción, almacenamiento y despacho.',
    text: `Operaciones en centro de distribución logístico de 50x30 metros.

Zona de recepción en el lado izquierdo, racks de almacenamiento en el centro (3 filas de 10 metros), zona de picking a la derecha y muelle de carga al fondo.

El Operario de Recepción descarga los pallets del camión en el muelle, los escanea y los registra. Luego los traslada con el montacargas a los racks asignados.

El Picker recibe la orden de picking, recorre los racks recolectando los productos (3-4 minutos de desplazamiento), los lleva a la zona de empaque.

El Empacador prepara el pedido durante 4 minutos, lo etiqueta y lo mueve a la zona de despacho donde el Transportista lo carga al camión de entrega.`
  },
  {
    title: '⚙️ Taller de Mantenimiento Industrial',
    badge: 'Mantenimiento', badgeColor: '#ef4444',
    desc: 'Proceso de mantenimiento preventivo de maquinaria.',
    text: `Procedimiento de mantenimiento preventivo en taller industrial de 30x20 metros.

El taller tiene: área de recepción de equipos (entrada), zona de diagnóstico con banco de pruebas, área de reparación con tornos y fresadoras, zona de pintura/acabados, y área de pruebas finales (salida).

El Técnico 1 recibe el equipo a mantener, realiza diagnóstico inicial durante 5 minutos, documenta las fallas encontradas.

El Técnico 2 desmonta los componentes dañados en el banco de trabajo durante 8 minutos, los lleva a los tornos si requieren mecanizado.

El Técnico 3 realiza el mecanizado o reemplazo de piezas durante 10 minutos, luego ensambla y ajusta.

El Técnico 4 realiza pruebas finales durante 6 minutos, firma el reporte y libera el equipo.`
  },
  {
    title: '🌾 Proceso Agroindustrial',
    badge: 'Agroindustria', badgeColor: '#84cc16',
    desc: 'Línea de procesamiento de productos agrícolas.',
    text: `Proceso de procesamiento y empaque de frutas en planta agroindustrial de 35x25 metros.

Zonas: recepción de materia prima (carga frontal), lavado y desinfección, selección y clasificación (banda transportadora), procesamiento/corte, empaque/envasado, cámara de frío (fondo), despacho (lateral).

Operaria 1 recibe los cajones de fruta, los vierte en la tolva de lavado, verifica el proceso de lavado/desinfección (3 min).

Operaria 2 clasifica la fruta en la banda transportadora separando por calidad durante 5 minutos continuos.

Operaria 3 en la cortadora procesa la fruta de primera calidad durante 4 minutos, alimenta la empacadora.

Operaria 4 supervisa el empacado automático, coloca las cajas terminadas en la cámara de frío. El montacarguista lleva las cajas al camión de despacho.`
  }
]

// Render examples
const exList = document.getElementById('examples-list')
EXAMPLES.forEach((ex, i) => {
  const div = document.createElement('div')
  div.className = 'example-card'
  div.innerHTML = `
    <span class="ec-badge" style="background:${ex.badgeColor}22; color:${ex.badgeColor}">${ex.badge}</span>
    <div class="ec-title">${ex.title}</div>
    <div class="ec-desc">${ex.desc}</div>
  `
  div.onclick = () => loadExample(i)
  exList.appendChild(div)
})

function loadExample(i) {
  const ex = EXAMPLES[i]
  document.getElementById('procedure-text').value = ex.text
  switchTab('input')
  showToast(`Ejemplo "${ex.title}" cargado`, 'info')
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => {
    const tabs = ['input','scene','examples']
    b.classList.toggle('active', tabs[i] === tab)
  })
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
  document.getElementById(`tab-${tab}`)?.classList.add('active')
}

function switchMode(mode) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById(`btn-${mode}`)?.classList.add('active')
}

function showLoading(text='Generando con IA...', sub='Por favor espera...') {
  document.getElementById('loading-text').textContent = text
  document.getElementById('loading-sub').textContent = sub
  document.getElementById('loading-overlay').classList.add('visible')
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('visible')
}

function showToast(msg, type='info') {
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  document.getElementById('toast-container').appendChild(t)
  setTimeout(() => t.remove(), 3500)
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE HANDLING
// ─────────────────────────────────────────────────────────────────────────────
let floorPlanFile = null

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) setFloorPlan(file)
}

function handleDragOver(e) {
  e.preventDefault()
  document.getElementById('drop-zone').classList.add('drag-over')
}

function handleDragLeave(e) {
  document.getElementById('drop-zone').classList.remove('drag-over')
}

function handleDrop(e) {
  e.preventDefault()
  document.getElementById('drop-zone').classList.remove('drag-over')
  const file = e.dataTransfer.files[0]
  if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
    setFloorPlan(file)
  }
}

function setFloorPlan(file) {
  floorPlanFile = file
  document.getElementById('drop-zone').style.display = 'none'
  document.getElementById('image-preview').style.display = 'block'
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = e => { document.getElementById('preview-img').src = e.target.result }
    reader.readAsDataURL(file)
  } else {
    document.getElementById('preview-img').src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="%23162847"/><text x="50" y="35" text-anchor="middle" fill="%2360a5fa" font-size="12">PDF Plano</text></svg>'
  }
  showToast(`Plano cargado: ${file.name}`, 'success')
}

function removeImage() {
  floorPlanFile = null
  document.getElementById('drop-zone').style.display = 'block'
  document.getElementById('image-preview').style.display = 'none'
  document.getElementById('file-input').value = ''
}

// ─────────────────────────────────────────────────────────────────────────────
// API KEY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
let userApiKey = localStorage.getItem('simpro3d_apikey') || ''

function getApiHeaders() {
  const headers = {}
  if (userApiKey) headers['X-API-Key'] = userApiKey
  return headers
}

// ─────────────────────────────────────────────────────────────────────────────
// AI GENERATION
// ─────────────────────────────────────────────────────────────────────────────
let currentScene = null

async function generateSimulation() {
  const procedure = document.getElementById('procedure-text').value.trim()
  if (!procedure) {
    showToast('Por favor describe el procedimiento de trabajo', 'error')
    return
  }

  showLoading(
    '🤖 Analizando procedimiento con IA...',
    floorPlanFile ? 'Procesando plano + descripción → generando escena 3D' : 'Generando configuración de escena 3D'
  )

  document.getElementById('generate-btn').disabled = true

  try {
    let response
    const extraHeaders = getApiHeaders()
    if (floorPlanFile) {
      const formData = new FormData()
      formData.append('procedure', procedure)
      formData.append('floorPlan', floorPlanFile)
      response = await fetch('/api/generate', { method: 'POST', headers: extraHeaders, body: formData })
    } else {
      response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify({ procedure })
      })
    }

    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Error generando escena')

    currentScene = data.scene
    hideLoading()
    buildScene(currentScene)
    updateSceneInfo(currentScene)
    switchTab('scene')

    if (data.demo) {
      showToast(`🎯 Escena de demostración generada (configura tu API key para IA completa)`, 'info')
      // Show API key hint
      document.getElementById('api-key-hint').style.display = 'block'
    } else {
      showToast(`✅ Escena "${currentScene.title}" generada con IA`, 'success')
      document.getElementById('api-key-hint').style.display = 'none'
    }
    document.getElementById('refine-section').style.display = 'block'

  } catch(e) {
    hideLoading()
    showToast(`Error: ${e.message}`, 'error')
    console.error(e)
  } finally {
    document.getElementById('generate-btn').disabled = false
  }
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim()
  userApiKey = key
  if (key) {
    localStorage.setItem('simpro3d_apikey', key)
    showToast('✅ API key guardada', 'success')
  } else {
    localStorage.removeItem('simpro3d_apikey')
    showToast('API key eliminada', 'info')
  }
  document.getElementById('api-key-modal').style.display = 'none'
}

async function refineScene() {
  const instruction = document.getElementById('refine-input').value.trim()
  if (!instruction || !currentScene) {
    showToast('Escribe una instrucción de refinamiento', 'error')
    return
  }

  showLoading('🔧 Refinando escena con IA...', instruction)

  try {
    const response = await fetch('/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
      body: JSON.stringify({ scene: currentScene, instruction })
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.error)
    currentScene = data.scene
    hideLoading()
    buildScene(currentScene)
    updateSceneInfo(currentScene)
    document.getElementById('refine-input').value = ''
    showToast('✅ Escena refinada exitosamente', 'success')
  } catch(e) {
    hideLoading()
    showToast(`Error: ${e.message}`, 'error')
  }
}

function exportScene() {
  if (!currentScene) { showToast('Genera una escena primero', 'error'); return }
  const blob = new Blob([JSON.stringify(currentScene, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${currentScene.title.replace(/\s+/g,'_')}_scene.json`
  a.click()
  showToast('Escena exportada como JSON', 'success')
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
let renderer, scene3d, camera, controls, animFrameId
let workerMeshes = [], machineMeshes = [], simRunning = false, simTime = 0
let workerStates = []  // [{mesh, route, stepIdx, stepT, state, color, name}]
const WORKER_SPEED = 4  // units/sec

function buildScene(cfg) {
  // Stop previous
  if (animFrameId) cancelAnimationFrame(animFrameId)
  simRunning = false; simTime = 0

  // Show viewport, hide overlay
  document.getElementById('viewport-overlay').style.display = 'none'
  document.getElementById('hud-top-left').style.display = 'block'
  document.getElementById('hud-top-right').style.display = 'flex'
  document.getElementById('hud-bottom').style.display = 'flex'
  document.getElementById('time-display').style.display = 'block'
  document.getElementById('kpi-live-bar').style.display = 'flex'
  document.getElementById('hud-title').textContent = cfg.title || 'Simulación'
  document.getElementById('hud-desc').textContent = cfg.description || ''

  // Init Three.js if needed
  const canvas = document.getElementById('three-canvas')
  const container = document.getElementById('viewport-container')

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.shadowMap.enabled = false
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x010510)
  }
  renderer.setSize(container.clientWidth, container.clientHeight)

  scene3d = new THREE.Scene()
  scene3d.fog = new THREE.FogExp2(0x010510, 0.018)

  // Camera
  const w = cfg.environment?.width || 20
  const d = cfg.environment?.depth || 20
  const maxDim = Math.max(w, d)
  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 500)
  camera.position.set(maxDim * 0.7, maxDim * 0.8, maxDim * 0.7)
  camera.lookAt(0, 0, 0)

  // Orbit controls
  if (controls) controls.dispose()
  controls = new THREE.OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 3; controls.maxDistance = maxDim * 3
  controls.maxPolarAngle = Math.PI / 2.1

  // Lighting
  const ambient = new THREE.AmbientLight(0x334466, 1.2)
  scene3d.add(ambient)
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(10, 20, 10)
  scene3d.add(sun)
  const fill = new THREE.DirectionalLight(0x4466aa, 0.4)
  fill.position.set(-10, 5, -10)
  scene3d.add(fill)

  // Floor
  const floorColor = parseInt((cfg.environment?.floorColor || '#1a2a1a').replace('#',''), 16)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d, Math.floor(w), Math.floor(d)),
    new THREE.MeshLambertMaterial({ color: floorColor, wireframe: false })
  )
  floor.rotation.x = -Math.PI / 2
  scene3d.add(floor)

  // Grid
  const grid = new THREE.GridHelper(Math.max(w,d)*1.5, Math.floor(Math.max(w,d)*1.5), 0x1a3a5a, 0x0d2035)
  grid.position.y = 0.01
  scene3d.add(grid)

  // Walls
  buildWalls(cfg)

  // Zones
  if (cfg.zones) cfg.zones.forEach(z => buildZone(z))

  // Machines
  machineMeshes = []
  if (cfg.machines) cfg.machines.forEach(m => buildMachine(m))

  // Workers
  workerMeshes = []; workerStates = []
  if (cfg.workers) cfg.workers.forEach(w => buildWorker(w))

  // KPI Live Bar
  buildKpiBar(cfg.kpis)

  // Start animation
  simRunning = true
  animate()
}

function buildWalls(cfg) {
  const w = cfg.environment?.width || 20
  const d = cfg.environment?.depth || 20
  const wColor = parseInt((cfg.environment?.wallColor || '#1e3a5f').replace('#',''), 16)
  const mat = new THREE.MeshLambertMaterial({ color: wColor })
  const h = 4, t = 0.3

  const walls = [
    [w, h, t, 0, h/2, -d/2],
    [w, h, t, 0, h/2, d/2],
    [t, h, d, -w/2, h/2, 0],
    [t, h, d, w/2, h/2, 0],
  ]
  walls.forEach(([ww,wh,wd, x,y,z]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(ww,wh,wd), mat)
    mesh.position.set(x,y,z)
    scene3d.add(mesh)
  })
}

function buildZone(z) {
  const color = parseInt((z.color || '#1a3a2a').replace('#',''), 16)
  const h = z.height || 0.08
  const geo = new THREE.BoxGeometry(z.width || 3, h, z.depth || 3)
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.7 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(z.x || 0, h/2, z.z || 0)
  scene3d.add(mesh)

  // Zone border
  const edges = new THREE.EdgesGeometry(geo)
  const borderColor = parseInt((z.color || '#2a5a3a').replace('#',''), 16)
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: borderColor + 0x333333 }))
  line.position.copy(mesh.position)
  scene3d.add(line)

  // Zone label
  addLabel(z.label || z.name, z.x || 0, 0.5, z.z || 0, z.color || '#88bbaa')
}

const MACHINE_TYPES = {
  press:     { colors: [0x445566, 0x334455], shape: 'box', scale: [1.5, 2, 1.5] },
  lathe:     { colors: [0x556677, 0x334466], shape: 'box', scale: [2, 1, 1] },
  conveyor:  { colors: [0x666633, 0x444422], shape: 'box', scale: [4, 0.4, 0.8] },
  robot:     { colors: [0x336688, 0x224477], shape: 'box', scale: [0.8, 2.5, 0.8] },
  oven:      { colors: [0x884433, 0x663322], shape: 'box', scale: [2, 2, 2] },
  table:     { colors: [0x886633, 0x554422], shape: 'box', scale: [2, 0.8, 1.2] },
  computer:  { colors: [0x334455, 0x223344], shape: 'box', scale: [0.5, 1, 0.4] },
  shelf:     { colors: [0x775533, 0x554422], shape: 'box', scale: [3, 2.5, 0.5] },
  crane:     { colors: [0xcc8822, 0xaa6611], shape: 'box', scale: [1, 5, 1] },
  default:   { colors: [0x445577, 0x334466], shape: 'box', scale: [1.5, 1.5, 1.5] }
}

function buildMachine(m) {
  const type = MACHINE_TYPES[m.type] || MACHINE_TYPES.default
  const color = m.color ? parseInt(m.color.replace('#',''), 16) : type.colors[0]
  const mw = m.width || type.scale[0]
  const mh = m.height || type.scale[1]
  const md = m.depth || type.scale[2]

  const group = new THREE.Group()

  // Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(mw, mh * 0.6, md),
    new THREE.MeshLambertMaterial({ color })
  )
  base.position.y = mh * 0.3
  group.add(base)

  // Top accent
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(mw * 0.9, mh * 0.4, md * 0.9),
    new THREE.MeshLambertMaterial({ color: Math.max(0, color - 0x111111) })
  )
  top.position.y = mh * 0.7
  group.add(top)

  // Control panel (small box)
  if (m.type !== 'conveyor' && m.type !== 'shelf') {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.4, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x88ccff })
    )
    panel.position.set(mw * 0.3, mh * 0.5, md * 0.5 + 0.05)
    group.add(panel)
  }

  group.position.set(m.x || 0, 0, m.z || 0)
  scene3d.add(group)
  machineMeshes.push({ group, config: m, animated: m.animated || false, t: 0 })

  addLabel(m.name, m.x || 0, mh + 0.3, m.z || 0, '#88aacc')
}

function buildWorker(w) {
  const color = w.color ? parseInt(w.color.replace('#',''), 16) : 0x3355aa
  const group = new THREE.Group()

  // Body parts - humanoid shape
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 })
  const bodyMat = new THREE.MeshLambertMaterial({ color })
  const pantsMat = new THREE.MeshLambertMaterial({ color: Math.max(0, color - 0x222222) })
  const shoesMat = new THREE.MeshLambertMaterial({ color: 0x222222 })

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat)
  head.position.y = 1.7
  group.add(head)

  // Helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), new THREE.MeshLambertMaterial({ color: 0xffdd00 }))
  helmet.position.y = 1.92
  group.add(helmet)

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.25), bodyMat)
  torso.position.y = 1.25
  group.add(torso)

  // Arms
  const armGeo = new THREE.BoxGeometry(0.15, 0.45, 0.15)
  const leftArm = new THREE.Mesh(armGeo, bodyMat)
  leftArm.position.set(-0.33, 1.2, 0)
  group.add(leftArm)
  const rightArm = new THREE.Mesh(armGeo, bodyMat)
  rightArm.position.set(0.33, 1.2, 0)
  group.add(rightArm)

  // Legs
  const legGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18)
  const leftLeg = new THREE.Mesh(legGeo, pantsMat)
  leftLeg.position.set(-0.14, 0.7, 0)
  group.add(leftLeg)
  const rightLeg = new THREE.Mesh(legGeo, pantsMat)
  rightLeg.position.set(0.14, 0.7, 0)
  group.add(rightLeg)

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.2, 0.1, 0.25)
  const leftShoe = new THREE.Mesh(shoeGeo, shoesMat)
  leftShoe.position.set(-0.14, 0.37, 0.03)
  group.add(leftShoe)
  const rightShoe = new THREE.Mesh(shoeGeo, shoesMat)
  rightShoe.position.set(0.14, 0.37, 0.03)
  group.add(rightShoe)

  // Ref to limbs for animation
  group.userData = {
    leftArm, rightArm, leftLeg, rightLeg, head,
    carrying: false
  }

  group.position.set(w.startX || 0, 0, w.startZ || 0)
  scene3d.add(group)
  workerMeshes.push(group)

  // Worker state
  const route = w.route || []
  workerStates.push({
    mesh: group,
    route,
    stepIdx: 0,
    stepT: 0,
    state: route[0]?.action || 'idle',
    name: w.name || `Worker ${workerStates.length+1}`,
    color: w.color || '#3355aa',
    description: route[0]?.description || 'Iniciando...',
    startPos: { x: w.startX || 0, z: w.startZ || 0 }
  })
}

function addLabel(text, x, y, z, color='#ffffff') {
  // Create canvas texture for label
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 256, 64)
  ctx.fillStyle = 'rgba(0,10,30,0.7)'
  ctx.roundRect(2, 2, 252, 60, 8)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = 'bold 18px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text.substring(0, 20), 128, 32)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.position.set(x, y, z)
  sprite.scale.set(2.5, 0.65, 1)
  scene3d.add(sprite)
}

function buildKpiBar(kpis) {
  if (!kpis) return
  const bar = document.getElementById('kpi-live-bar')
  bar.innerHTML = [
    { v: kpis.workersCount || 0, l: 'Operarios' },
    { v: kpis.zonesCount || 0, l: 'Zonas' },
    { v: `${kpis.cycleTime || 0}s`, l: 'Ciclo' },
    { v: `${kpis.efficiency || 0}%`, l: 'Eficiencia' },
  ].map(k => `
    <div class="kpi-chip">
      <div class="kv">${k.v}</div>
      <div class="kl">${k.l}</div>
    </div>
  `).join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION LOOP
// ─────────────────────────────────────────────────────────────────────────────
let lastTime = 0

function animate(ts = 0) {
  animFrameId = requestAnimationFrame(animate)
  const dt = Math.min((ts - lastTime) / 1000, 0.1)
  lastTime = ts

  if (simRunning) {
    simTime += dt
    updateTime(simTime)
    updateWorkers(dt)
    updateMachines(dt)
    updateProgress()
  }

  controls?.update()
  renderer.render(scene3d, camera)
}

function updateWorkers(dt) {
  workerStates.forEach((ws, wi) => {
    const route = ws.route
    if (!route || route.length === 0) return

    const step = route[ws.stepIdx % route.length]
    const mesh = ws.mesh
    const ud = mesh.userData

    if (step.action === 'walk') {
      // Move toward target
      const tx = step.targetX || 0
      const tz = step.targetZ || 0
      const dx = tx - mesh.position.x
      const dz = tz - mesh.position.z
      const dist = Math.sqrt(dx*dx + dz*dz)

      if (dist > 0.1) {
        const speed = WORKER_SPEED * dt
        mesh.position.x += (dx/dist) * Math.min(speed, dist)
        mesh.position.z += (dz/dist) * Math.min(speed, dist)
        // Face direction
        mesh.rotation.y = Math.atan2(dx, dz)
        // Walk animation
        const t = simTime * 6
        ud.leftLeg.rotation.x = Math.sin(t) * 0.5
        ud.rightLeg.rotation.x = -Math.sin(t) * 0.5
        ud.leftArm.rotation.x = -Math.sin(t) * 0.4
        ud.rightArm.rotation.x = Math.sin(t) * 0.4
        ws.state = 'walk'
      } else {
        // Arrived
        ws.stepIdx = (ws.stepIdx + 1) % route.length
        ws.stepT = 0
        resetLimbs(ud)
      }

    } else if (step.action === 'work') {
      ws.stepT += dt
      // Work animation - arms move
      const t = simTime * 3
      ud.leftArm.rotation.x = Math.sin(t) * 0.6 - 0.3
      ud.rightArm.rotation.x = -Math.sin(t) * 0.6 - 0.3
      ud.head.rotation.y = Math.sin(simTime * 0.8) * 0.2
      ws.state = 'work'
      ws.description = step.description || 'Trabajando...'
      if (ws.stepT >= (step.duration || 5)) {
        ws.stepIdx = (ws.stepIdx + 1) % route.length
        ws.stepT = 0
        resetLimbs(ud)
      }

    } else if (step.action === 'carry') {
      // Move carrying
      const tx = step.targetX || 0
      const tz = step.targetZ || 0
      const dx = tx - mesh.position.x
      const dz = tz - mesh.position.z
      const dist = Math.sqrt(dx*dx + dz*dz)

      if (dist > 0.1) {
        const speed = WORKER_SPEED * 0.7 * dt
        mesh.position.x += (dx/dist) * Math.min(speed, dist)
        mesh.position.z += (dz/dist) * Math.min(speed, dist)
        mesh.rotation.y = Math.atan2(dx, dz)
        // Carry animation - arms forward
        const t = simTime * 4
        ud.leftArm.rotation.x = -0.8 + Math.sin(t) * 0.1
        ud.rightArm.rotation.x = -0.8 + Math.sin(t) * 0.1
        ud.leftLeg.rotation.x = Math.sin(t) * 0.3
        ud.rightLeg.rotation.x = -Math.sin(t) * 0.3
        ws.state = 'carry'
      } else {
        ws.stepIdx = (ws.stepIdx + 1) % route.length
        ws.stepT = 0
        resetLimbs(ud)
      }

    } else if (step.action === 'inspect') {
      ws.stepT += dt
      const t = simTime * 1.5
      ud.head.rotation.y = Math.sin(t) * 0.5
      ud.rightArm.rotation.x = -0.5 + Math.sin(t*2) * 0.1
      ws.state = 'inspect'
      if (ws.stepT >= (step.duration || 4)) {
        ws.stepIdx = (ws.stepIdx + 1) % route.length; ws.stepT = 0; resetLimbs(ud)
      }

    } else if (step.action === 'repair') {
      ws.stepT += dt
      const t = simTime * 4
      ud.leftArm.rotation.x = Math.sin(t) * 0.7
      ud.rightArm.rotation.x = -Math.sin(t) * 0.5
      ws.state = 'repair'
      if (ws.stepT >= (step.duration || 6)) {
        ws.stepIdx = (ws.stepIdx + 1) % route.length; ws.stepT = 0; resetLimbs(ud)
      }

    } else { // wait/idle
      ws.stepT += dt
      // Idle breathing
      const t = simTime * 1.2
      mesh.position.y = Math.sin(t) * 0.02
      ud.leftArm.rotation.x = Math.sin(t * 0.5) * 0.05
      ws.state = 'idle'
      if (ws.stepT >= (step.duration || 2)) {
        ws.stepIdx = (ws.stepIdx + 1) % route.length; ws.stepT = 0
      }
    }

    ws.description = step.description || ws.state
  })

  updateWorkersInfo()
}

function resetLimbs(ud) {
  ud.leftLeg.rotation.x = 0; ud.rightLeg.rotation.x = 0
  ud.leftArm.rotation.x = 0; ud.rightArm.rotation.x = 0
  ud.head.rotation.y = 0
}

function updateMachines(dt) {
  machineMeshes.forEach(m => {
    if (!m.animated) return
    m.t += dt
    // Gentle rotation for machines like robots/conveyors
    if (m.config.type === 'robot') {
      m.group.rotation.y = Math.sin(m.t * 0.5) * 0.8
    } else if (m.config.type === 'conveyor') {
      // Move parts on conveyor (visual via offset)
    }
  })
}

function updateProgress() {
  if (!workerStates.length) return
  const ws = workerStates[0]
  const pct = ((ws.stepIdx % (ws.route.length || 1)) / (ws.route.length || 1)) * 100
  document.getElementById('hud-progress').style.width = pct + '%'
}

function updateTime(t) {
  const h = Math.floor(t/3600).toString().padStart(2,'0')
  const m = Math.floor((t%3600)/60).toString().padStart(2,'0')
  const s = Math.floor(t%60).toString().padStart(2,'0')
  document.getElementById('time-display').textContent = `${h}:${m}:${s}`
}

function updateWorkersInfo() {
  // Update scene info tab workers list
  const list = document.getElementById('workers-live-list')
  if (!list) return
  list.innerHTML = workerStates.map(ws => {
    const stateColors = { walk:'#60a5fa', work:'#34d399', carry:'#fbbf24', inspect:'#a78bfa', repair:'#f87171', idle:'#94a3b8' }
    const col = stateColors[ws.state] || '#94a3b8'
    return `<div class="worker-card">
      <div class="worker-dot" style="background:${ws.color}"></div>
      <div class="worker-info">
        <div class="worker-name">${ws.name}</div>
        <div class="worker-action" style="color:${col}">${ws.state.toUpperCase()} — ${ws.description.substring(0,40)}</div>
      </div>
    </div>`
  }).join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE INFO PANEL
// ─────────────────────────────────────────────────────────────────────────────
function updateSceneInfo(cfg) {
  const container = document.getElementById('scene-info')
  container.innerHTML = `
    <div class="info-card">
      <h3>📊 KPIs de la Simulación</h3>
      <div class="kpi-grid">
        <div class="kpi-item">
          <div class="kpi-value">${cfg.workers?.length || 0}</div>
          <div class="kpi-label">Operarios</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${cfg.zones?.length || 0}</div>
          <div class="kpi-label">Zonas</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${cfg.kpis?.cycleTime || 0}s</div>
          <div class="kpi-label">Ciclo</div>
        </div>
        <div class="kpi-item">
          <div class="kpi-value">${cfg.kpis?.efficiency || 0}%</div>
          <div class="kpi-label">Eficiencia</div>
        </div>
      </div>
    </div>

    <div class="info-card">
      <h3>👷 Operarios en tiempo real</h3>
      <div class="workers-list" id="workers-live-list">
        ${(cfg.workers || []).map(w => `
          <div class="worker-card">
            <div class="worker-dot" style="background:${w.color || '#3355aa'}"></div>
            <div class="worker-info">
              <div class="worker-name">${w.name}</div>
              <div class="worker-action">Iniciando...</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="info-card">
      <h3>🗺️ Zonas del Entorno</h3>
      ${(cfg.zones || []).map(z => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:10px;height:10px;border-radius:2px;background:${z.color || '#334'}"></div>
          <div style="font-size:0.8rem">
            <strong>${z.name}</strong>
            <span style="color:var(--text-secondary);margin-left:6px">${z.type}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="info-card">
      <h3>📋 Pasos del Procedimiento</h3>
      <ul class="steps-list">
        ${(cfg.steps || []).map((s, i) => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────────────────────────────────────
function togglePlay() {
  simRunning = !simRunning
  const btn = document.getElementById('play-btn')
  const badge = document.getElementById('status-badge')
  const statusText = document.getElementById('status-text')
  if (simRunning) {
    btn.innerHTML = '<i class="fas fa-pause"></i> Pausar'
    badge.className = 'hud-badge running'
    statusText.textContent = 'Ejecutando'
  } else {
    btn.innerHTML = '<i class="fas fa-play"></i> Continuar'
    badge.className = 'hud-badge paused'
    statusText.textContent = 'Pausado'
  }
}

function resetSim() {
  if (!currentScene) return
  simTime = 0
  workerStates.forEach(ws => {
    ws.stepIdx = 0; ws.stepT = 0
    ws.mesh.position.set(ws.startPos.x, 0, ws.startPos.z)
    resetLimbs(ws.mesh.userData)
  })
  simRunning = true
  showToast('Simulación reiniciada', 'info')
}

function setView(view) {
  if (!camera || !currentScene) return
  const cfg = currentScene
  const maxDim = Math.max(cfg.environment?.width || 20, cfg.environment?.depth || 20)
  const target = new THREE.Vector3(0, 0, 0)

  switch(view) {
    case 'top':
      camera.position.set(0, maxDim * 1.5, 0.01)
      break
    case 'iso':
      camera.position.set(maxDim * 0.7, maxDim * 0.8, maxDim * 0.7)
      break
    case 'front':
      camera.position.set(0, maxDim * 0.4, maxDim * 1.2)
      break
    case 'side':
      camera.position.set(maxDim * 1.2, maxDim * 0.4, 0)
      break
  }
  camera.lookAt(target)
  controls.target.set(0, 0, 0)
  controls.update()
}

// ─────────────────────────────────────────────────────────────────────────────
// RESIZE
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  if (!renderer || !camera) return
  const container = document.getElementById('viewport-container')
  const w = container.clientWidth, h = container.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
})
