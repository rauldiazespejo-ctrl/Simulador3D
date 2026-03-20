/**
 * SimForge3D — Industrial Simulation Platform v3.0
 * Professional 3D Factory Simulation powered by AI
 * © 2026 SimForge3D — All rights reserved
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════
const NF = {
  // Three.js core
  scene: null, camera: null, renderer: null, controls: null,
  clock: null, animFrameId: null,
  // Scene objects
  workerMeshes: [], machineMeshes: [], sceneObjects: [],
  // Data
  currentScene: null, projectId: null, simulationId: null,
  // Simulation state
  isRunning: false, simTime: 0, units: 0, failures: 0,
  simSpeed: 1.0, logEntries: [],
  // Upload
  floorPlanBase64: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// HTML SHELL
// ═══════════════════════════════════════════════════════════════════════════
document.getElementById('root').innerHTML = `
<div id="loading-overlay">
  <div class="loading-brand">
    <div class="loading-logo-wrap" id="loading-logo-wrap">
      <span style="font-size:24px;font-weight:900;color:white">NF</span>
    </div>
    <div>
      <div class="loading-title">SimForge3D</div>
      <div class="loading-subtitle">Industrial Simulation Platform</div>
    </div>
  </div>
  <div class="loading-progress"><div class="loading-bar"></div></div>
  <div class="loading-status" id="loading-status">Cargando motor 3D...</div>
</div>

<div id="toast-container"></div>

<!-- HEADER -->
<header id="header">
  <div class="logo" onclick="showLanding()">
    <div class="logo-icon" id="header-logo">
      <span class="logo-fallback">NF</span>
    </div>
    <div class="logo-name">Nexus<span>Forge</span></div>
    <div class="logo-badge">PRO</div>
  </div>
  <div class="header-spacer"></div>
  <nav class="header-nav">
    <button class="nav-btn active" id="btn-nav-gen" onclick="switchMode('generate')">
      <i class="fas fa-wand-magic-sparkles"></i> Generar
    </button>
    <button class="nav-btn" id="btn-nav-proj" onclick="switchMode('projects')">
      <i class="fas fa-folder-open"></i> Proyectos
    </button>
    <div class="header-divider"></div>
    <button class="nav-btn" onclick="exportScene()" title="Exportar escena JSON">
      <i class="fas fa-file-export"></i>
    </button>
    <button class="nav-btn" onclick="exportReport()" title="Exportar informe KPI">
      <i class="fas fa-chart-bar"></i>
    </button>
    <button class="nav-btn" onclick="openModal('api-modal')" title="API Key">
      <i class="fas fa-key"></i>
    </button>
    <button class="nav-btn btn-primary-sm" onclick="openModal('new-project-modal')">
      <i class="fas fa-plus"></i> Nuevo Proyecto
    </button>
  </nav>
</header>

<!-- MAIN LAYOUT -->
<div id="main-layout">
  <!-- ── SIDEBAR ────────────────────────────── -->
  <aside id="sidebar">
    <div class="sidebar-tabs">
      <button class="tab-btn active" id="tab-btn-input" onclick="switchTab('input')"><i class="fas fa-pen-to-square"></i> Entrada</button>
      <button class="tab-btn" id="tab-btn-scene" onclick="switchTab('scene')"><i class="fas fa-cubes"></i> Análisis</button>
      <button class="tab-btn" id="tab-btn-history" onclick="switchTab('history');loadHistory()"><i class="fas fa-clock-rotate-left"></i> Historial</button>
    </div>

    <!-- INPUT TAB -->
    <div class="tab-content active" id="tab-input">
      <div class="form-group">
        <label class="form-label"><i class="fas fa-industry"></i> Industria</label>
        <select class="form-select" id="industry-select">
          <option value="manufacturing">🏭 Manufactura / Ensamble</option>
          <option value="logistics">📦 Logística / Distribución</option>
          <option value="food">🍽️ Alimentos / Gastronomía</option>
          <option value="medical">🏥 Salud / Laboratorio</option>
          <option value="maintenance">🔧 Mantenimiento Industrial</option>
          <option value="construction">🏗️ Construcción / Obra Civil</option>
          <option value="automotive">🚗 Automotriz</option>
          <option value="pharma">💊 Farmacéutica / Química</option>
          <option value="electronics">⚡ Electrónica</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label"><i class="fas fa-align-left"></i> Descripción del procedimiento</label>
        <textarea class="form-textarea" id="procedure-text" rows="7"
          placeholder="Describe el proceso de trabajo en detalle:

• ¿Quiénes son los operarios y qué hacen?
• ¿Qué zonas o estaciones existen?
• ¿Qué máquinas o equipos intervienen?
• ¿Cuál es el flujo de materiales?

Ejemplo: 'Línea de ensamble con 3 operarios. El operario A recoge piezas del almacén y las lleva a la estación B donde el técnico realiza soldadura durante 5 min...'"></textarea>
      </div>

      <!-- Floor plan upload -->
      <div class="form-group">
        <label class="form-label"><i class="fas fa-map"></i> Plano / Croquis (opcional)</label>
        <div class="upload-zone" id="upload-zone"
          onclick="document.getElementById('floor-plan-input').click()"
          ondrop="handleDrop(event)" ondragover="event.preventDefault();this.classList.add('dragover')"
          ondragleave="this.classList.remove('dragover')">
          <div class="upload-icon"><i class="fas fa-cloud-arrow-up"></i></div>
          <div class="upload-title">Arrastra o haz clic para subir</div>
          <div class="upload-sub">PNG, JPG, PDF — La IA analizará la distribución</div>
          <input type="file" id="floor-plan-input" accept="image/*" style="display:none" onchange="handleFloorPlanUpload(event)">
        </div>
        <div id="floor-plan-preview" style="display:none; position:relative;">
          <img id="plan-img" class="upload-preview-img" alt="Plano">
          <button class="btn btn-ghost btn-sm" style="margin-top:6px;width:100%" onclick="removeFloorPlan()"><i class="fas fa-times"></i> Eliminar plano</button>
        </div>
      </div>

      <button class="btn btn-generate" id="btn-gen" onclick="generateSimulation()">
        <div class="pulse"></div>
        <i class="fas fa-wand-magic-sparkles"></i> Generar Simulación 3D
      </button>

      <!-- Examples -->
      <div>
        <label class="form-label" style="margin-bottom:10px"><i class="fas fa-bolt-lightning"></i> Ejemplos rápidos</label>
        <div class="examples-grid">
          <div class="example-card" onclick="loadExample('manufacturing')">
            <div class="example-icon">🏭</div>
            <div class="example-name">Manufactura</div>
            <div class="example-desc">Línea de ensamble PCB</div>
          </div>
          <div class="example-card" onclick="loadExample('logistics')">
            <div class="example-icon">📦</div>
            <div class="example-name">Logística</div>
            <div class="example-desc">Centro de distribución</div>
          </div>
          <div class="example-card" onclick="loadExample('food')">
            <div class="example-icon">🍽️</div>
            <div class="example-name">Cocina</div>
            <div class="example-desc">Cocina industrial</div>
          </div>
          <div class="example-card" onclick="loadExample('medical')">
            <div class="example-icon">🏥</div>
            <div class="example-name">Laboratorio</div>
            <div class="example-desc">Lab. clínico</div>
          </div>
          <div class="example-card" onclick="loadExample('maintenance')">
            <div class="example-icon">🔧</div>
            <div class="example-name">Mantenimiento</div>
            <div class="example-desc">Taller industrial</div>
          </div>
          <div class="example-card" onclick="loadExample('construction')">
            <div class="example-icon">🏗️</div>
            <div class="example-name">Construcción</div>
            <div class="example-desc">Obra civil</div>
          </div>
        </div>
      </div>
    </div>

    <!-- SCENE / ANALYSIS TAB -->
    <div class="tab-content" id="tab-scene">
      <div id="scene-panel">
        <div style="text-align:center;padding:40px 20px;color:var(--nf-t3)">
          <i class="fas fa-cubes" style="font-size:2.5rem;opacity:0.2;margin-bottom:12px;display:block"></i>
          <div style="font-size:0.85rem">Genera una simulación para ver el análisis</div>
        </div>
      </div>
    </div>

    <!-- HISTORY TAB -->
    <div class="tab-content" id="tab-history">
      <div id="history-list-container">
        <div style="text-align:center;padding:40px 20px;color:var(--nf-t3)">
          <i class="fas fa-clock-rotate-left" style="font-size:2rem;opacity:0.2;margin-bottom:12px;display:block"></i>
          <div style="font-size:0.83rem">Sin historial aún</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- ── VIEWPORT ───────────────────────────── -->
  <div id="viewport-container">
    <canvas id="viewport-canvas"></canvas>

    <!-- Empty state -->
    <div id="vp-empty-state">
      <div class="empty-icon"><i class="fas fa-industry"></i></div>
      <div class="empty-title">Motor 3D listo</div>
      <div class="empty-sub">Describe tu proceso industrial y la IA generará una simulación 3D interactiva en segundos</div>
    </div>

    <!-- Title bar -->
    <div class="vp-overlay" id="vp-titlebar" style="display:none">
      <div class="sim-title-chip">
        <i class="fas fa-circle-play" style="color:var(--nf-primary);font-size:0.8rem"></i>
        <span id="sim-title-text">Simulación</span>
      </div>
      <div class="sim-status-chip">
        <div class="status-dot" id="status-dot"></div>
        <span id="status-text">Listo</span>
        &nbsp;|&nbsp;
        <span id="sim-clock" style="font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--nf-primary-light)">00:00:00</span>
      </div>
    </div>

    <!-- Camera controls -->
    <div class="vp-overlay" id="vp-cam-controls" style="display:none">
      <button class="cam-btn active" id="cam-iso" onclick="setCameraPreset('iso')" title="Isométrica">ISO</button>
      <button class="cam-btn" id="cam-top" onclick="setCameraPreset('top')" title="Vista superior">TOP</button>
      <button class="cam-btn" id="cam-front" onclick="setCameraPreset('front')" title="Vista frontal">FNT</button>
      <button class="cam-btn" id="cam-side" onclick="setCameraPreset('side')" title="Vista lateral">SDE</button>
      <button class="cam-btn" id="cam-fly" onclick="setCameraPreset('fly')" title="Vista aérea">FLY</button>
    </div>

    <!-- KPI HUD -->
    <div class="vp-overlay" id="vp-kpi-hud" style="display:none">
      <div class="kpi-chip oee"><div class="kpi-chip-value" id="kpi-oee">—</div><div class="kpi-chip-label">OEE %</div></div>
      <div class="kpi-chip throughput"><div class="kpi-chip-value" id="kpi-throughput">—</div><div class="kpi-chip-label">Uds/h</div></div>
      <div class="kpi-chip cycle"><div class="kpi-chip-value" id="kpi-cycle">—</div><div class="kpi-chip-label">Ciclo seg</div></div>
      <div class="kpi-chip util"><div class="kpi-chip-value" id="kpi-util">—</div><div class="kpi-chip-label">Util %</div></div>
    </div>

    <!-- Clock -->
    <div class="vp-overlay" id="vp-clock" style="display:none"></div>

    <!-- Units counter -->
    <div class="vp-overlay" id="vp-units">
      <i class="fas fa-box-archive" style="color:var(--green)"></i>
      <span id="units-counter">0 uds</span>
    </div>

    <!-- Running bar -->
    <div class="vp-overlay" id="running-bar">
      <div class="running-indicator">
        <div class="running-dot"></div>
        Simulando
      </div>
      <button class="btn btn-secondary btn-sm" onclick="toggleSimulation()"><i class="fas fa-pause"></i> Pausar</button>
      <button class="btn btn-ghost btn-sm" onclick="resetSimulation()"><i class="fas fa-rotate-left"></i></button>
      <div style="display:flex;align-items:center;gap:5px;font-size:0.75rem;color:var(--nf-t3)">
        Vel:
        <div class="speed-selector">
          <button class="speed-btn" onclick="setSpeed(0.5)">0.5×</button>
          <button class="speed-btn active" onclick="setSpeed(1)">1×</button>
          <button class="speed-btn" onclick="setSpeed(2)">2×</button>
          <button class="speed-btn" onclick="setSpeed(4)">4×</button>
        </div>
      </div>
    </div>

    <!-- Activity log -->
    <div class="vp-overlay" id="vp-log">
      <div class="log-header"><i class="fas fa-list" style="margin-right:5px"></i>Actividad en tiempo real</div>
      <div id="worker-log"></div>
    </div>
  </div>

  <!-- ── ANALYSIS PANEL ─────────────────────── -->
  <div id="analysis-panel">
    <div class="panel-header">
      <div class="panel-title"><i class="fas fa-chart-line"></i> Panel de Análisis</div>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('analysis-panel').classList.toggle('collapsed')"><i class="fas fa-chevron-right"></i></button>
    </div>
    <div class="panel-body" id="analysis-body">
      <div style="color:var(--nf-t3);font-size:0.82rem;text-align:center;padding:30px 10px">
        <i class="fas fa-chart-pie" style="font-size:2rem;opacity:0.2;display:block;margin-bottom:10px"></i>
        Genera una simulación para ver el análisis completo
      </div>
    </div>
  </div>
</div>

<!-- ── SIMULATION CONTROL BAR (bottom of viewport, hidden until sim loaded) -->
<div id="sim-control-bar" style="display:none; position:absolute; bottom:0; left:var(--sidebar-w); right:300px; z-index:50;">
</div>

<!-- ── MODALS ──────────────────────────────────────────────────────────── -->
<div class="modal-backdrop" id="api-modal">
  <div class="modal-box">
    <div class="modal-title"><i class="fas fa-key"></i> Configurar API Key</div>
    <p style="font-size:0.82rem;color:var(--nf-t3);margin-bottom:14px;line-height:1.6">
      Para generar simulaciones con IA avanzada, configura tu API key de GenSpark. Sin key se usarán las plantillas integradas.
    </p>
    <div class="form-group">
      <label class="form-label">API Key (GenSpark)</label>
      <input type="password" class="form-input" id="api-key-input" placeholder="sk-... o lVRq...">
    </div>
    <div style="margin-top:8px">
      <a href="https://www.genspark.ai" target="_blank" style="font-size:0.78rem;color:var(--nf-primary)">
        <i class="fas fa-external-link-alt"></i> Obtener API key en genspark.ai
      </a>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="saveApiKey()"><i class="fas fa-save"></i> Guardar</button>
      <button class="btn btn-ghost" onclick="closeModal('api-modal')">Cancelar</button>
    </div>
  </div>
</div>

<div class="modal-backdrop" id="new-project-modal">
  <div class="modal-box">
    <div class="modal-title"><i class="fas fa-folder-plus"></i> Nuevo Proyecto</div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group">
        <label class="form-label">Nombre del proyecto *</label>
        <input class="form-input" id="project-name" placeholder="Ej: Planta Norte 2026">
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea class="form-textarea" id="project-desc" rows="2" placeholder="Descripción opcional..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Industria</label>
        <select class="form-select" id="project-industry">
          <option value="manufacturing">Manufactura</option>
          <option value="logistics">Logística</option>
          <option value="food">Alimentos</option>
          <option value="medical">Salud</option>
          <option value="maintenance">Mantenimiento</option>
          <option value="construction">Construcción</option>
        </select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="createProject()"><i class="fas fa-plus"></i> Crear Proyecto</button>
      <button class="btn btn-ghost" onclick="closeModal('new-project-modal')">Cancelar</button>
    </div>
  </div>
</div>

<!-- LANDING OVERLAY -->
<div id="landing-overlay">
  <div class="land-hero">

    <div class="land-badge">
      <div class="land-badge-dot"></div>
      Plataforma de Simulación Industrial con IA
    </div>

    <h1 class="land-h1">
      Simula tu fábrica<br>
      <span class="gradient-text">en 3D con Inteligencia Artificial</span>
    </h1>

    <p class="land-sub">
      Describe tu proceso de trabajo con texto o sube un plano y SimForge3D genera una simulación 3D interactiva con operarios, máquinas y KPIs en tiempo real.
    </p>

    <div class="land-ctas">
      <button class="cta-primary" onclick="hideLanding()">
        <i class="fas fa-play"></i> Probar gratis ahora
      </button>
      <button class="cta-secondary" onclick="loadExample('manufacturing');hideLanding()">
        <i class="fas fa-eye"></i> Ver demo
      </button>
    </div>

    <div class="land-stats">
      <div class="land-stat">
        <div class="land-stat-n">3<span>D</span></div>
        <div class="land-stat-l">Simulación en tiempo real</div>
      </div>
      <div class="land-stat">
        <div class="land-stat-n">IA<span>+</span></div>
        <div class="land-stat-l">Generación automática</div>
      </div>
      <div class="land-stat">
        <div class="land-stat-n">9<span>+</span></div>
        <div class="land-stat-l">Industrias cubiertas</div>
      </div>
      <div class="land-stat">
        <div class="land-stat-n">∞</div>
        <div class="land-stat-l">Escenarios posibles</div>
      </div>
    </div>

    <!-- Features -->
    <h2 class="land-h2" style="animation: fadeSlideUp 0.6s ease 0.5s both">Todo lo que necesitas para optimizar tus procesos</h2>
    <div class="land-features">
      <div class="feat-card">
        <div class="feat-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
        <div class="feat-title">Generación por IA</div>
        <div class="feat-desc">Describe tu proceso en texto natural y la IA genera la escena 3D completa con zonas, máquinas y operarios.</div>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><i class="fas fa-users-gear"></i></div>
        <div class="feat-title">Operarios Animados</div>
        <div class="feat-desc">Trabajadores 3D con rutas inteligentes, animaciones de trabajo, transporte y inspección en tiempo real.</div>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><i class="fas fa-chart-line"></i></div>
        <div class="feat-title">KPIs en tiempo real</div>
        <div class="feat-desc">OEE, throughput, tiempo de ciclo y utilización calculados dinámicamente durante la simulación.</div>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><i class="fas fa-map"></i></div>
        <div class="feat-title">Análisis de planos</div>
        <div class="feat-desc">Sube fotos o planos de tu instalación y la IA analiza la distribución espacial para generar la escena.</div>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><i class="fas fa-triangle-exclamation"></i></div>
        <div class="feat-title">Detección de cuellos</div>
        <div class="feat-desc">Identifica automáticamente los cuellos de botella y recibe sugerencias de mejora basadas en datos.</div>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><i class="fas fa-file-export"></i></div>
        <div class="feat-title">Exportación completa</div>
        <div class="feat-desc">Exporta escenas en JSON y reportes de KPIs para usar en tus proyectos de consultoría o ingeniería.</div>
      </div>
    </div>

    <!-- Comparison vs competitors -->
    <div class="land-compare">
      <h2 class="land-h2">Por qué SimForge3D</h2>
      <table class="compare-table">
        <thead>
          <tr>
            <th>Característica</th>
            <th style="color:var(--nf-t4)">FlexSim</th>
            <th style="color:var(--nf-t4)">AnyLogic</th>
            <th class="compare-highlight" style="color:var(--nf-primary)">SimForge3D</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Generación por IA con texto</td>
            <td><span class="compare-cross">✕</span></td>
            <td><span class="compare-cross">✕</span></td>
            <td class="compare-highlight"><span class="compare-check">✓</span></td>
          </tr>
          <tr>
            <td>Análisis de planos/croquis</td>
            <td><span class="compare-cross">✕</span></td>
            <td><span class="compare-cross">✕</span></td>
            <td class="compare-highlight"><span class="compare-check">✓</span></td>
          </tr>
          <tr>
            <td>Acceso web sin instalación</td>
            <td><span class="compare-cross">✕</span></td>
            <td><span class="compare-cross">✕</span></td>
            <td class="compare-highlight"><span class="compare-check">✓</span></td>
          </tr>
          <tr>
            <td>3D en tiempo real</td>
            <td><span class="compare-check">✓</span></td>
            <td><span class="compare-cross">✕</span></td>
            <td class="compare-highlight"><span class="compare-check">✓</span></td>
          </tr>
          <tr>
            <td>Precio de entrada</td>
            <td><span style="color:var(--nf-t4)">$8,000+/año</span></td>
            <td><span style="color:var(--nf-t4)">$5,000+/año</span></td>
            <td class="compare-highlight" style="color:var(--green)">Desde $49/mes</td>
          </tr>
          <tr>
            <td>Curva de aprendizaje</td>
            <td><span style="color:var(--red)">Alta (semanas)</span></td>
            <td><span style="color:var(--yellow)">Media (días)</span></td>
            <td class="compare-highlight" style="color:var(--green)">Mínima (minutos)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pricing -->
    <div class="land-pricing">
      <h2 class="land-h2">Planes simples y transparentes</h2>
      <div class="pricing-grid">
        <div class="pricing-card">
          <div class="pricing-plan">Starter</div>
          <div class="pricing-price"><sub>$</sub>49<span class="pricing-period">/mes</span></div>
          <div class="pricing-features">
            <div class="pricing-feature"><i class="fas fa-check"></i> 20 simulaciones/mes</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Motor 3D completo</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> KPIs en tiempo real</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Export JSON</div>
            <div class="pricing-feature dim"><i class="fas fa-times"></i> IA avanzada</div>
            <div class="pricing-feature dim"><i class="fas fa-times"></i> Análisis de planos</div>
          </div>
          <button class="btn btn-secondary btn-full" onclick="hideLanding()">Comenzar</button>
        </div>
        <div class="pricing-card featured">
          <div class="pricing-plan">Professional</div>
          <div class="pricing-price"><sub>$</sub>149<span class="pricing-period">/mes</span></div>
          <div class="pricing-features">
            <div class="pricing-feature"><i class="fas fa-check"></i> Simulaciones ilimitadas</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> IA avanzada GPT-5</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Análisis de planos</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Proyectos ilimitados</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Export completo</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Soporte prioritario</div>
          </div>
          <button class="btn btn-primary btn-full" onclick="hideLanding()">Empezar prueba</button>
        </div>
        <div class="pricing-card">
          <div class="pricing-plan">Enterprise</div>
          <div class="pricing-price" style="font-size:1.6rem">Custom</div>
          <div class="pricing-features">
            <div class="pricing-feature"><i class="fas fa-check"></i> Todo lo de Pro</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Integración ERP/MES</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> API dedicada</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> On-premise disponible</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> SLA garantizado</div>
            <div class="pricing-feature"><i class="fas fa-check"></i> Consultoría incluida</div>
          </div>
          <button class="btn btn-ghost btn-full">Contactar ventas</button>
        </div>
      </div>
    </div>

    <!-- Testimonials -->
    <div class="land-testimonials">
      <h2 class="land-h2">Lo que dicen nuestros clientes</h2>
      <div class="testimonial-grid">
        <div class="testimonial-card">
          <div class="testimonial-stars">★★★★★</div>
          <div class="testimonial-quote">"Redujimos el tiempo de diseño de procesos de 3 semanas a 2 días. La IA genera escenas precisas que antes tardábamos semanas en modelar."</div>
          <div class="testimonial-author">
            <div class="testimonial-avatar">MA</div>
            <div>
              <div class="testimonial-name">María A.</div>
              <div class="testimonial-role">Ing. Industrial, AutoParts SA</div>
            </div>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★★★★</div>
          <div class="testimonial-quote">"Usamos SimForge3D para presentar rediseños de planta a clientes. El impacto visual 3D convence en segundos lo que antes requería costosas maquetas."</div>
          <div class="testimonial-author">
            <div class="testimonial-avatar">CL</div>
            <div>
              <div class="testimonial-name">Carlos L.</div>
              <div class="testimonial-role">Consultor Lean, ProcessFlow</div>
            </div>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-stars">★★★★★</div>
          <div class="testimonial-quote">"Identificamos 2 cuellos de botella críticos que nunca habíamos notado. Mejoramos la eficiencia un 23% después de implementar las sugerencias de la IA."</div>
          <div class="testimonial-author">
            <div class="testimonial-avatar">RP</div>
            <div>
              <div class="testimonial-name">Roberto P.</div>
              <div class="testimonial-role">Director Operaciones, FoodCorp</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom CTA -->
    <div class="land-cta-bottom">
      <h2 class="land-h2">Empieza a simular hoy</h2>
      <button class="cta-primary" style="width:100%;justify-content:center;margin-bottom:10px" onclick="hideLanding()">
        <i class="fas fa-rocket"></i> Abrir plataforma gratis
      </button>
      <p>Sin tarjeta de crédito · Acceso inmediato · Cancela cuando quieras</p>
    </div>

  </div>
</div>
`;

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════
function waitForThree(callback, attempts) {
  if (attempts === undefined) attempts = 0;
  if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
    callback();
  } else if (attempts < 150) {
    setTimeout(() => waitForThree(callback, attempts + 1), 50);
  } else {
    console.error('THREE.js failed to load after 7.5s');
    const el = document.getElementById('loading-status');
    if (el) el.textContent = 'Error cargando Three.js — verifica conexión a internet';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setLoadingStatus('Inicializando motor de renderizado...');

  // Load logo into header and loading screen
  const logoImg = new Image();
  logoImg.onload = () => {
    const headerLogo = document.getElementById('header-logo');
    if (headerLogo) { headerLogo.innerHTML = ''; const img2 = logoImg.cloneNode(); img2.style.cssText = 'width:28px;height:28px;object-fit:contain'; headerLogo.appendChild(img2); }
    const loadWrap = document.getElementById('loading-logo-wrap');
    if (loadWrap) { loadWrap.innerHTML = ''; const img3 = logoImg.cloneNode(); img3.style.cssText = 'width:38px;height:38px;object-fit:contain'; loadWrap.appendChild(img3); }
  };
  logoImg.src = '/static/simforge3d-logo.png';

  restoreApiKey();

  waitForThree(() => {
    setLoadingStatus('Motor 3D listo');
    initThreeJS();
    loadProjects();
  });

  // Hide overlay after load
  setTimeout(() => {
    const ol = document.getElementById('loading-overlay');
    if (ol) { ol.classList.add('hidden'); setTimeout(() => ol.remove(), 600); }
  }, 2600);
});

function setLoadingStatus(msg) {
  const el = document.getElementById('loading-status');
  if (el) el.textContent = msg;
}

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS ENGINE
// ═══════════════════════════════════════════════════════════════════════════
function initThreeJS() {
  const canvas = document.getElementById('viewport-canvas');
  if (!canvas) return;

  NF.clock = new THREE.Clock();

  // Renderer
  NF.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  NF.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  NF.renderer.shadowMap.enabled = true;
  NF.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  NF.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  NF.renderer.toneMappingExposure = 1.1;

  // Scene
  NF.scene = new THREE.Scene();
  NF.scene.background = new THREE.Color(0x030712);
  NF.scene.fog = new THREE.Fog(0x030712, 60, 140);

  // Camera
  NF.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  NF.camera.position.set(30, 24, 30);
  NF.camera.lookAt(0, 0, 0);

  // Controls
  NF.controls = new THREE.OrbitControls(NF.camera, canvas);
  NF.controls.enableDamping = true;
  NF.controls.dampingFactor = 0.07;
  NF.controls.minDistance = 6;
  NF.controls.maxDistance = 120;
  NF.controls.maxPolarAngle = Math.PI / 2.1;

  // Lighting
  setupLights();

  // Resize
  resizeRenderer();
  window.addEventListener('resize', resizeRenderer);

  // Start loop
  animate();
}

function setupLights() {
  // Ambient
  NF.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // Sun
  const sun = new THREE.DirectionalLight(0xfff8f0, 1.4);
  sun.position.set(20, 30, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -50;
  sun.shadow.camera.right = sun.shadow.camera.top = 50;
  sun.shadow.bias = -0.0005;
  NF.scene.add(sun);

  // Fill
  const fill = new THREE.DirectionalLight(0x4466cc, 0.35);
  fill.position.set(-15, 20, -10);
  NF.scene.add(fill);

  // Hemi
  NF.scene.add(new THREE.HemisphereLight(0x1a2a5e, 0x050810, 0.45));
}

function animate() {
  NF.animFrameId = requestAnimationFrame(animate);
  const delta = NF.clock.getDelta() * NF.simSpeed;
  NF.controls.update();
  if (NF.isRunning) { updateSimulation(delta); }
  NF.renderer.render(NF.scene, NF.camera);
}

function resizeRenderer() {
  const container = document.getElementById('viewport-container');
  if (!container || !NF.renderer) return;
  const w = container.clientWidth, h = container.clientHeight;
  NF.renderer.setSize(w, h);
  if (NF.camera) {
    NF.camera.aspect = w / h;
    NF.camera.updateProjectionMatrix();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE BUILDING — PROFESSIONAL 3D
// ═══════════════════════════════════════════════════════════════════════════
function buildScene(sceneData) {
  NF.currentScene = sceneData;
  clearSceneObjects();
  NF.workerMeshes = [];
  NF.machineMeshes = [];

  const env = sceneData.environment || {};
  const W = env.width || 30;
  const D = env.depth || 20;
  const ceilH = env.ceilingHeight || 5;

  // Update scene fog
  NF.scene.fog = new THREE.Fog(0x030712, W * 3, W * 6);

  // Floor
  buildFloor(W, D, env.floorColor || '#0d1117');

  // Grid overlay
  const gridHelper = new THREE.GridHelper(Math.max(W, D) + 10, Math.max(W, D) + 10, 0x1a2a3a, 0x111820);
  gridHelper.position.y = 0.001;
  NF.scene.add(markRemovable(gridHelper));

  // Walls (perimeter)
  buildPerimeter(W, D, env.wallColor || '#0f3460', ceilH);

  // Zones
  (sceneData.zones || []).forEach(z => buildZone(z));

  // Machines
  (sceneData.machines || []).forEach(m => {
    const mesh = buildMachine(m);
    if (mesh) NF.machineMeshes.push({ mesh, data: m });
  });

  // Workers
  (sceneData.workers || []).forEach(w => {
    const mesh = buildWorker(w);
    if (mesh) NF.workerMeshes.push({ mesh, data: w, routeIndex: 0, t: 0 });
  });

  // Show viewport UI
  showViewportUI(sceneData);
  updateAnalysisPanel(sceneData);
  updateSceneTab(sceneData);

  // Switch to scene tab
  switchTab('scene');

  // Camera iso
  setCameraPreset('iso');

  // Show empty state off
  const es = document.getElementById('vp-empty-state');
  if (es) es.style.display = 'none';
}

function clearSceneObjects() {
  NF.sceneObjects.forEach(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    NF.scene.remove(obj);
  });
  NF.sceneObjects = [];
}

function markRemovable(obj) {
  NF.sceneObjects.push(obj);
  // Also push children for proper cleanup
  obj.traverse(child => {
    if (child !== obj) NF.sceneObjects.push(child);
  });
  return obj;
}

function buildFloor(W, D, colorHex) {
  const color = hexToInt(colorHex);
  const geo = new THREE.PlaneGeometry(W + 10, D + 10);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  NF.scene.add(markRemovable(mesh));
}

function buildPerimeter(W, D, colorHex, h) {
  const color = hexToInt(colorHex);
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.25 });
  const wallDefs = [
    { w: W + 10, d: 0.5, x: 0,      z: -(D/2+5), y: h/2 },
    { w: W + 10, d: 0.5, x: 0,      z:  (D/2+5), y: h/2 },
    { w: 0.5,   d: D + 10, x: -(W/2+5), z: 0, y: h/2 },
    { w: 0.5,   d: D + 10, x:  (W/2+5), z: 0, y: h/2 },
  ];
  wallDefs.forEach(w => {
    const geo = new THREE.BoxGeometry(w.w, h, w.d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(w.x, w.y, w.z);
    mesh.receiveShadow = true;
    NF.scene.add(markRemovable(mesh));
  });
}

function buildZone(z) {
  const group = new THREE.Group();
  // IMPORTANT: position is set BEFORE adding — no rotation issues
  group.position.set(z.x || 0, 0, z.z || 0);

  const zW = z.width || 5;
  const zD = z.depth || 4;
  const color = hexToInt(z.color || '#1e3a4c');

  // Floor slab — BoxGeometry is always axis-aligned
  const slabGeo = new THREE.BoxGeometry(zW, 0.1, zD);
  const slabMat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.85 });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = 0.05;
  slab.receiveShadow = true;
  group.add(slab);

  // Border (4 edge beams)
  const bMat = new THREE.MeshBasicMaterial({ color: lightenColor(color, 0.4), transparent: true, opacity: 0.6 });
  [[zW, 0.06, 0.06, 0, 0.1, -zD/2],
   [zW, 0.06, 0.06, 0, 0.1,  zD/2],
   [0.06, 0.06, zD, -zW/2, 0.1, 0],
   [0.06, 0.06, zD,  zW/2, 0.1, 0]
  ].forEach(([bw, bh, bd, bx, by, bz]) => {
    const bg = new THREE.BoxGeometry(bw, bh, bd);
    const bm = new THREE.Mesh(bg, bMat);
    bm.position.set(bx, by, bz);
    group.add(bm);
  });

  // Type indicator corner post
  const typeColors = {
    entry: 0x22c55e, exit: 0xef4444, storage: 0xf59e0b,
    workstation: 0x3b82f6, assembly: 0x8b5cf6, inspection: 0x06b6d4,
    quality: 0xec4899, office: 0x6b7280
  };
  const postColor = typeColors[z.type] || 0xffffff;
  const postGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  const postMat = new THREE.MeshLambertMaterial({ color: postColor });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(-zW/2 + 0.2, 0.4, -zD/2 + 0.2);
  post.castShadow = true;
  group.add(post);

  // Point light inside zone (subtle)
  const ptLight = new THREE.PointLight(postColor, 0.3, 6);
  ptLight.position.set(0, 1.5, 0);
  group.add(ptLight);

  // Label sprite
  addTextSprite(z.label || z.name || '', group, 0, 0.7, 0, 1.1, '#e2e8f0');

  NF.scene.add(markRemovable(group));
}

function buildMachine(m) {
  const group = new THREE.Group();
  group.position.set(m.x || 0, 0, m.z || 0);
  const color = hexToInt(m.color || '#334466');
  const w = m.width || 1.5, d = m.depth || 1.5, h = m.height || 1.5;

  if (m.type === 'conveyor') {
    // Conveyor belt
    const baseGeo = new THREE.BoxGeometry(w, h * 0.35, d);
    const baseMat = new THREE.MeshLambertMaterial({ color });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = h * 0.175;
    base.castShadow = true; base.receiveShadow = true;
    group.add(base);

    const beltGeo = new THREE.BoxGeometry(w, h * 0.06, d * 0.7);
    const beltMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = h * 0.35 + 0.03;
    group.add(belt);

    // Side rollers
    [-w/2 + 0.1, w/2 - 0.1].forEach(rx => {
      const rGeo = new THREE.CylinderGeometry(h * 0.18, h * 0.18, d * 0.7, 8);
      const rMesh = new THREE.Mesh(rGeo, baseMat);
      rMesh.rotation.z = Math.PI / 2;
      rMesh.position.set(rx, h * 0.35, 0);
      group.add(rMesh);
    });

  } else if (m.type === 'crane') {
    const cMat = new THREE.MeshLambertMaterial({ color });
    // Column
    const colGeo = new THREE.BoxGeometry(w * 0.25, h, d * 0.25);
    const col = new THREE.Mesh(colGeo, cMat); col.position.y = h/2; col.castShadow = true;
    group.add(col);
    // Arm
    const armGeo = new THREE.BoxGeometry(w * 2.5, h * 0.08, d * 0.1);
    const arm = new THREE.Mesh(armGeo, cMat); arm.position.y = h;
    group.add(arm);
    // Hook cable
    const cableGeo = new THREE.BoxGeometry(0.04, h * 0.5, 0.04);
    const cableMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(w * 0.8, h * 0.75, 0);
    group.add(cable);

  } else if (m.type === 'press' || m.type === 'hydraulic') {
    const pMat = new THREE.MeshLambertMaterial({ color });
    const base2 = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.2, d), pMat);
    base2.position.y = h * 0.1; base2.castShadow = true;
    group.add(base2);
    const column2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.25, h * 0.85, d * 0.25), pMat);
    column2.position.y = h * 0.63; column2.castShadow = true;
    group.add(column2);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h * 0.1, d * 0.8), pMat);
    arm2.position.y = h * 0.3; arm2.castShadow = true;
    group.add(arm2);
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.12, d), pMat);
    topBeam.position.y = h; group.add(topBeam);

  } else if (m.type === 'table') {
    const tMat = new THREE.MeshLambertMaterial({ color });
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.08, d), tMat);
    top.position.y = h; top.castShadow = true; top.receiveShadow = true;
    group.add(top);
    [[-w/2+0.1,-d/2+0.1],[w/2-0.1,-d/2+0.1],[-w/2+0.1,d/2-0.1],[w/2-0.1,d/2-0.1]].forEach(([lx,lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), tMat);
      leg.position.set(lx, h/2, lz); group.add(leg);
    });

  } else if (m.type === 'shelf' || m.type === 'rack') {
    const sMat = new THREE.MeshLambertMaterial({ color });
    const levels = 3;
    for (let i = 0; i <= levels; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), sMat);
      shelf.position.y = (h / levels) * i;
      group.add(shelf);
    }
    [[-w/2+0.06, d/2-0.06], [w/2-0.06, d/2-0.06], [-w/2+0.06, -d/2+0.06], [w/2-0.06, -d/2+0.06]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), sMat);
      post.position.set(px, h/2, pz); group.add(post);
    });

  } else {
    // Generic machine box
    const bMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
    body.position.y = h/2; body.castShadow = true; body.receiveShadow = true;
    group.add(body);

    // Accent top
    const capMat = new THREE.MeshLambertMaterial({ color: 0x223344 });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.1, d * 0.9), capMat);
    cap.position.y = h + h * 0.05;
    group.add(cap);

    // Control panel
    const panelMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.4, 0.05), panelMat);
    panel.position.set(0, h * 0.6, d/2 + 0.03);
    group.add(panel);
  }

  // Indicator light
  if (m.animated) {
    const lightGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(w * 0.35, h + 0.15, d * 0.35);
    light.userData.isIndicatorLight = true;
    group.add(light);
    const ptLight = new THREE.PointLight(0x00ff88, 0.6, 3.5);
    ptLight.position.copy(light.position);
    group.add(ptLight);
  }

  addTextSprite(m.name, group, 0, h + 0.6, 0, 0.85, '#94a3b8');
  NF.scene.add(markRemovable(group));
  return group;
}

function buildWorker(w) {
  const group = new THREE.Group();
  // Use startX / startZ from data
  group.position.set(w.startX || 0, 0, w.startZ || 0);

  const bodyCol = hexToInt(w.color || '#3b82f6');
  const helmCol = hexToInt(w.helmetColor || '#60a5fa');
  const skinCol = 0xd4a574;

  // ── Body (torso) — use BoxGeometry for max compatibility
  const torsoMat = new THREE.MeshLambertMaterial({ color: bodyCol });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.22), torsoMat);
  torso.position.y = 0.9;
  torso.castShadow = true;
  group.add(torso);

  // ── Head
  const headMat = new THREE.MeshLambertMaterial({ color: skinCol });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.22), headMat);
  head.position.y = 1.42;
  head.castShadow = true;
  group.add(head);

  // ── Helmet
  const helmMat = new THREE.MeshLambertMaterial({ color: helmCol });
  const helmTop = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.1, 0.27), helmMat);
  helmTop.position.y = 1.58;
  group.add(helmTop);
  const helmBrim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.32), helmMat);
  helmBrim.position.y = 1.51;
  group.add(helmBrim);

  // ── Arms
  [-0.24, 0.24].forEach((xOff) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), torsoMat);
    arm.position.set(xOff, 0.86, 0);
    arm.userData.isArm = true;
    group.add(arm);
  });

  // ── Legs
  [-0.12, 0.12].forEach(xOff => {
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1a3a5c });
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.44, 0.13), legMat);
    leg.position.set(xOff, 0.38, 0);
    leg.userData.isLeg = true;
    leg.castShadow = true;
    group.add(leg);
  });

  // ── Feet
  [-0.12, 0.12].forEach(xOff => {
    const footMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.18), footMat);
    foot.position.set(xOff, 0.14, 0.03);
    group.add(foot);
  });

  // ── Name label
  addTextSprite(w.name, group, 0, 1.85, 0, 1.0, w.color || '#60a5fa');

  // ── Action dot
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), dotMat);
  dot.position.y = 1.75;
  dot.userData.isActionDot = true;
  group.add(dot);

  NF.scene.add(markRemovable(group));
  return group;
}

// Text sprite (canvas-based)
function addTextSprite(text, parent, x, y, z, size, color) {
  if (!text) return;
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 56;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = 'rgba(5,10,22,0.7)';
  ctx.roundRect ? ctx.roundRect(2, 2, 252, 52, 6) : ctx.fillRect(2, 2, 252, 52);
  ctx.fill();

  // Text
  ctx.font = 'bold 22px Inter, Arial, sans-serif';
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 28);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size * 2.2, size * 0.5, 1);
  sprite.position.set(x, y, z);
  parent.add(sprite);
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
function updateSimulation(delta) {
  NF.simTime += delta;
  updateClock(NF.simTime);

  const cycleTime = NF.currentScene?.kpis?.cycleTime || 14;
  const efficiency = NF.currentScene?.kpis?.efficiency || 82;
  const t = NF.simTime;

  // Animate workers
  NF.workerMeshes.forEach(wm => updateWorkerMovement(wm, delta));

  // Animate machine lights
  NF.machineMeshes.forEach(mm => {
    if (mm.data.animated) {
      mm.mesh.traverse(child => {
        if (child.userData.isIndicatorLight && child.material) {
          const s = 0.7 + Math.abs(Math.sin(t * 2.5)) * 0.5;
          child.scale.setScalar(s);
          child.material.color.setHex(NF.isRunning ? 0x00ff88 : 0xff6600);
        }
      });
    }
  });

  // Live KPIs
  const oee = Math.min(99.9, efficiency + Math.sin(t * 0.1) * 2.5).toFixed(1);
  const throughput = Math.round((3600 / cycleTime) * (efficiency / 100));
  const utilization = Math.min(99.9, efficiency * 0.95 + Math.cos(t * 0.07) * 3).toFixed(1);

  const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setKpi('kpi-oee', oee);
  setKpi('kpi-throughput', throughput);
  setKpi('kpi-cycle', cycleTime);
  setKpi('kpi-util', utilization);

  NF.units = Math.floor(t / cycleTime);
  const uc = document.getElementById('units-counter');
  if (uc) uc.textContent = `${NF.units} uds`;

  // Occasional failure events
  if (Math.random() < 0.00015) {
    NF.failures++;
    const ws = NF.currentScene?.workers || [];
    if (ws.length > 0) {
      const wo = ws[Math.floor(Math.random() * ws.length)];
      addLog(`⚠️ ${wo.name}: avería detectada`, '#ef4444');
    }
  }
}

function updateWorkerMovement(wm, delta) {
  const route = wm.data.route;
  if (!route || route.length === 0) return;

  const step = route[wm.routeIndex % route.length];
  const target = new THREE.Vector3(step.targetX || 0, 0, step.targetZ || 0);
  const curr = wm.mesh.position.clone();
  curr.y = 0;
  const dist = curr.distanceTo(target);

  const speed = getActionSpeed(step.action);

  if (dist > 0.12) {
    const dir = target.clone().sub(curr).normalize();
    const move = Math.min(speed * delta, dist);
    wm.mesh.position.x += dir.x * move;
    wm.mesh.position.z += dir.z * move;
    wm.mesh.position.y = Math.abs(Math.sin(NF.simTime * 5)) * 0.04; // walk bob

    // Face direction
    if (dist > 0.3) {
      const angle = Math.atan2(dir.x, dir.z);
      wm.mesh.rotation.y = THREE.MathUtils.lerp(wm.mesh.rotation.y, angle, 0.12);
    }

    // Arm swing animation
    wm.mesh.traverse(child => {
      if (child.userData.isArm) {
        const swing = Math.sin(NF.simTime * 6) * 0.35;
        child.rotation.x = (child.position.x > 0) ? swing : -swing;
      }
      if (child.userData.isLeg) {
        const swing = Math.sin(NF.simTime * 6) * 0.4;
        child.rotation.x = (child.position.x > 0) ? -swing : swing;
      }
    });

  } else {
    wm.t += delta;
    wm.mesh.position.y = 0;

    // Reset limb angles
    wm.mesh.traverse(child => {
      if (child.userData.isArm || child.userData.isLeg) {
        child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, 0, 0.1);
      }
    });

    if (step.action === 'work') {
      wm.mesh.rotation.z = Math.sin(NF.simTime * 3) * 0.05;
    } else if (step.action === 'inspect') {
      wm.mesh.rotation.y += delta * 0.6;
    } else if (step.action === 'repair') {
      wm.mesh.position.y = 0.03 + Math.sin(NF.simTime * 4) * 0.04;
    } else {
      wm.mesh.rotation.z = THREE.MathUtils.lerp(wm.mesh.rotation.z, 0, 0.08);
    }

    const actionDur = step.duration || 3;
    if (wm.t >= actionDur) {
      const prevStep = wm.routeIndex % route.length;
      wm.routeIndex++;
      wm.t = 0;
      const newStep = wm.routeIndex % route.length;
      if (prevStep !== newStep) {
        const icon = getActionIcon(step.action);
        addLog(`${icon} ${wm.data.name}: ${step.description || step.action}`, wm.data.color);
      }
    }
  }

  // Update action dot color
  wm.mesh.traverse(child => {
    if (child.userData.isActionDot && child.material) {
      child.material.color.setHex(getActionColorHex(step.action));
    }
  });
}

function getActionSpeed(action) {
  return { walk: 3.2, carry: 2.1, run: 4.8, idle: 0, work: 0, inspect: 0, repair: 0 }[action] || 2.5;
}
function getActionColorHex(action) {
  return { walk: 0x94a3b8, carry: 0xf59e0b, work: 0x3b82f6, inspect: 0x06b6d4, repair: 0xef4444, idle: 0x4b5563 }[action] || 0xffffff;
}
function getActionIcon(action) {
  return { walk: '🚶', carry: '📦', work: '⚙️', inspect: '🔍', repair: '🔧', idle: '💤' }[action] || '▶';
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════════════════════
function setCameraPreset(preset) {
  const W = NF.currentScene?.environment?.width || 30;
  const D = NF.currentScene?.environment?.depth || 20;
  const dist = Math.max(W, D) * 0.85;

  ['iso','top','front','side','fly'].forEach(id => {
    const b = document.getElementById(`cam-${id}`); if (b) b.classList.remove('active');
  });
  const ab = document.getElementById(`cam-${preset}`); if (ab) ab.classList.add('active');

  const positions = {
    iso:   [dist, dist * 0.9, dist],
    top:   [0.01, dist * 1.9, 0.01],
    front: [0, dist * 0.6, dist * 1.5],
    side:  [-dist * 1.5, dist * 0.6, 0],
    fly:   [dist * 0.35, dist * 1.5, dist * 0.35],
  };
  const [px, py, pz] = positions[preset] || positions.iso;
  animateCamera(new THREE.Vector3(px, py, pz), new THREE.Vector3(0, 0, 0));
}

function animateCamera(targetPos, targetLook) {
  const startPos = NF.camera.position.clone();
  const startLook = NF.controls.target.clone();
  let t = 0;
  function step() {
    t = Math.min(t + 0.016 / 0.75, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    NF.camera.position.lerpVectors(startPos, targetPos, ease);
    NF.controls.target.lerpVectors(startLook, targetLook, ease);
    NF.controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION CONTROLS
// ═══════════════════════════════════════════════════════════════════════════
function toggleSimulation() {
  if (!NF.currentScene) { showToast('Genera una simulación primero', 'error'); return; }
  NF.isRunning = !NF.isRunning;

  const runBar = document.getElementById('running-bar');
  const dot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const vpUnits = document.getElementById('vp-units');
  const vpLog = document.getElementById('vp-log');

  if (NF.isRunning) {
    if (runBar) { runBar.classList.add('active'); runBar.style.display = 'flex'; }
    if (dot) { dot.classList.add('running'); dot.style.background = 'var(--green)'; }
    if (statusText) statusText.textContent = 'Simulando';
    if (vpUnits) vpUnits.classList.add('visible');
    if (vpLog) vpLog.classList.add('visible');
    showToast('Simulación iniciada', 'success');
  } else {
    if (runBar) { runBar.classList.remove('active'); runBar.style.display = 'none'; }
    if (dot) { dot.classList.remove('running'); dot.style.background = 'var(--yellow)'; }
    if (statusText) statusText.textContent = 'Pausada';
    showToast('Simulación pausada', 'info');
  }
}

function resetSimulation() {
  NF.isRunning = false; NF.simTime = 0; NF.units = 0; NF.failures = 0;

  const runBar = document.getElementById('running-bar');
  const dot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const vpUnits = document.getElementById('vp-units');
  const log = document.getElementById('worker-log');

  if (runBar) { runBar.classList.remove('active'); runBar.style.display = 'none'; }
  if (dot) { dot.classList.remove('running'); dot.style.background = 'var(--blue)'; }
  if (statusText) statusText.textContent = 'Listo';
  if (vpUnits) vpUnits.classList.remove('visible');
  if (log) log.innerHTML = '';

  updateClock(0);

  // Reset worker positions
  NF.workerMeshes.forEach(wm => {
    wm.mesh.position.set(wm.data.startX || 0, 0, wm.data.startZ || 0);
    wm.routeIndex = 0; wm.t = 0;
  });
  showToast('Simulación reiniciada', 'info');
}

function setSpeed(s) {
  NF.simSpeed = s;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.textContent) === s);
  });
}

function updateClock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s2 = Math.floor(seconds % 60);
  const fmt = n => String(n).padStart(2, '0');
  const el = document.getElementById('sim-clock');
  if (el) el.textContent = `${fmt(h)}:${fmt(m)}:${fmt(s2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════════════════
const MAX_LOG = 5;
function addLog(msg, color) {
  const container = document.getElementById('worker-log');
  if (!container) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<div class="log-dot" style="background:${color || '#94a3b8'}"></div><span>${msg}</span>`;
  container.appendChild(entry);
  NF.logEntries.push({ msg, color, time: NF.simTime });
  while (container.children.length > MAX_LOG) container.removeChild(container.firstChild);
}

// ═══════════════════════════════════════════════════════════════════════════
// UI: VIEWPORT OVERLAYS
// ═══════════════════════════════════════════════════════════════════════════
function showViewportUI(scene) {
  const titlebar = document.getElementById('vp-titlebar');
  const camCtrl = document.getElementById('vp-cam-controls');
  const kpiHud = document.getElementById('vp-kpi-hud');
  const clock = document.getElementById('vp-clock');

  if (titlebar) titlebar.style.display = 'flex';
  if (camCtrl) camCtrl.style.display = 'flex';
  if (kpiHud) kpiHud.style.display = 'flex';
  if (clock) clock.style.display = 'block';

  const titleEl = document.getElementById('sim-title-text');
  if (titleEl) titleEl.textContent = scene.title || 'Simulación';

  const kpis = scene.kpis || {};
  const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setKpi('kpi-oee', kpis.efficiency || '—');
  setKpi('kpi-throughput', kpis.throughput || '—');
  setKpi('kpi-cycle', kpis.cycleTime || '—');
  setKpi('kpi-util', kpis.efficiency || '—');
}

function updateSceneTab(scene) {
  const panel = document.getElementById('scene-panel');
  if (!panel) return;
  const kpis = scene.kpis || {};
  panel.innerHTML = `
    <div class="scene-info-title" style="margin-bottom:6px">${scene.title || 'Sin título'}</div>
    <div class="scene-info-desc" style="margin-bottom:14px">${scene.description || ''}</div>

    <div class="mini-kpi-grid" style="margin-bottom:14px">
      <div class="mini-kpi">
        <div class="mini-kpi-val" style="color:var(--green)">${kpis.efficiency || 0}%</div>
        <div class="mini-kpi-lbl">Eficiencia</div>
      </div>
      <div class="mini-kpi">
        <div class="mini-kpi-val" style="color:var(--cyan)">${kpis.throughput || 0}</div>
        <div class="mini-kpi-lbl">Uds / hora</div>
      </div>
      <div class="mini-kpi">
        <div class="mini-kpi-val" style="color:var(--yellow)">${kpis.cycleTime || 0}s</div>
        <div class="mini-kpi-lbl">T. Ciclo</div>
      </div>
      <div class="mini-kpi">
        <div class="mini-kpi-val" style="color:var(--purple)">${kpis.workersCount || 0}</div>
        <div class="mini-kpi-lbl">Operarios</div>
      </div>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:14px">
      <button class="btn btn-primary btn-full" onclick="toggleSimulation()">
        <i class="fas fa-play"></i> Iniciar simulación
      </button>
      <button class="btn btn-secondary" onclick="resetSimulation()" title="Reiniciar">
        <i class="fas fa-rotate-left"></i>
      </button>
    </div>

    ${scene.steps?.length ? `
      <div class="section-div" style="margin-bottom:8px"><i class="fas fa-list-check" style="color:var(--nf-primary)"></i> Pasos del proceso</div>
      <div class="steps-list" style="margin-bottom:12px">
        ${scene.steps.map((s, i) => `
          <div class="step-item">
            <div class="step-num">${i+1}</div>
            <span>${s}</span>
          </div>`).join('')}
      </div>` : ''}

    ${scene.bottlenecks?.length ? `
      <div class="section-div" style="margin-bottom:8px"><i class="fas fa-triangle-exclamation" style="color:var(--red)"></i> Cuellos de botella</div>
      <div style="margin-bottom:12px">
        ${scene.bottlenecks.map(b => `
          <div class="alert-item bottleneck" style="margin-bottom:4px">
            <i class="fas fa-exclamation-circle" style="min-width:14px;margin-top:2px"></i> ${b}
          </div>`).join('')}
      </div>` : ''}

    ${scene.improvements?.length ? `
      <div class="section-div" style="margin-bottom:8px"><i class="fas fa-lightbulb" style="color:var(--yellow)"></i> Mejoras sugeridas</div>
      <div>
        ${scene.improvements.map(b => `
          <div class="alert-item improvement" style="margin-bottom:4px">
            <i class="fas fa-arrow-trend-up" style="min-width:14px;margin-top:2px"></i> ${b}
          </div>`).join('')}
      </div>` : ''}
  `;
}

function updateAnalysisPanel(scene) {
  const body = document.getElementById('analysis-body');
  if (!body) return;
  const kpis = scene.kpis || {};
  body.innerHTML = `
    <div>
      <div class="section-div" style="margin-bottom:10px"><i class="fas fa-chart-pie" style="color:var(--nf-primary)"></i> KPIs del proceso</div>
      <div class="mini-kpi-grid" style="margin-bottom:12px">
        <div class="mini-kpi">
          <div class="mini-kpi-val" style="color:var(--green)">${kpis.efficiency || 0}%</div>
          <div class="mini-kpi-lbl">OEE</div>
        </div>
        <div class="mini-kpi">
          <div class="mini-kpi-val" style="color:var(--cyan)">${kpis.throughput || 0}</div>
          <div class="mini-kpi-lbl">Uds/h</div>
        </div>
        <div class="mini-kpi">
          <div class="mini-kpi-val" style="color:var(--yellow)">${kpis.cycleTime || 0}s</div>
          <div class="mini-kpi-lbl">Ciclo</div>
        </div>
        <div class="mini-kpi">
          <div class="mini-kpi-val" style="color:var(--nf-primary)">${kpis.zonesCount || (scene.zones?.length) || 0}</div>
          <div class="mini-kpi-lbl">Zonas</div>
        </div>
      </div>
    </div>

    <div>
      <div class="section-div" style="margin-bottom:8px"><i class="fas fa-map-pin" style="color:var(--blue)"></i> Zonas de trabajo</div>
      <div class="legend-grid">
        ${(scene.zones || []).map(z => `
          <div class="legend-item">
            <div class="legend-dot" style="background:${z.color || '#334466'}"></div>
            <span>${z.name}</span>
            <span style="margin-left:auto;color:var(--nf-t3);font-size:0.7rem">${z.type || ''}</span>
          </div>`).join('')}
      </div>
    </div>

    <div>
      <div class="section-div" style="margin-bottom:8px"><i class="fas fa-cog" style="color:var(--yellow)"></i> Maquinaria</div>
      <div class="legend-grid">
        ${(scene.machines || []).map(m => `
          <div class="legend-item">
            <div class="legend-dot" style="background:${m.color || '#445566'};border-radius:2px"></div>
            <span>${m.name}</span>
            ${m.animated ? '<span style="margin-left:auto"><div class="running-dot" style="width:6px;height:6px;display:inline-block"></div></span>' : ''}
          </div>`).join('')}
      </div>
    </div>

    <div>
      <div class="section-div" style="margin-bottom:8px"><i class="fas fa-person-digging" style="color:var(--green)"></i> Operarios</div>
      <div class="legend-grid">
        ${(scene.workers || []).map(w => `
          <div class="legend-item">
            <div class="legend-dot" style="background:${w.color || '#3b82f6'};border-radius:50%"></div>
            <span>${w.name}</span>
            <span style="margin-left:auto;color:var(--nf-t3);font-size:0.7rem">${w.route?.length || 0} pasos</span>
          </div>`).join('')}
      </div>
    </div>

    <div style="margin-top:4px;padding-top:10px;border-top:1px solid var(--nf-border)">
      <button class="btn btn-ghost btn-sm btn-full" onclick="exportReport()"><i class="fas fa-file-chart-column"></i> Exportar informe KPI</button>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION
// ═══════════════════════════════════════════════════════════════════════════
async function generateSimulation() {
  const procedure = document.getElementById('procedure-text')?.value?.trim();
  if (!procedure) {
    showToast('Describe el procedimiento de trabajo primero', 'error');
    document.getElementById('procedure-text')?.focus();
    return;
  }

  const btn = document.getElementById('btn-gen');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando con IA...'; }

  hideLanding();
  showToast('Analizando procedimiento con IA...', 'info');

  try {
    const industry = document.getElementById('industry-select')?.value || 'manufacturing';
    const apiKey = localStorage.getItem('nf_apikey') || '';

    const payload = { procedure, industry, projectId: NF.projectId || null };
    if (apiKey) payload.apiKey = apiKey;
    if (NF.floorPlanBase64) payload.floorPlanBase64 = NF.floorPlanBase64;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error de generación');

    if (data.simulationId) NF.simulationId = data.simulationId;
    buildScene(data.scene);

    const src = data.source === 'ai' ? '✨ IA avanzada' : '📋 Plantilla inteligente';
    const z = data.scene.zones?.length || 0;
    const w2 = data.scene.workers?.length || 0;
    const m = data.scene.machines?.length || 0;
    showToast(`Escena generada (${src}) — ${z} zonas · ${w2} operarios · ${m} máquinas`, 'success');

  } catch (err) {
    console.error('Generation error:', err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<div class="pulse"></div><i class="fas fa-wand-magic-sparkles"></i> Generar Simulación 3D'; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════
const EXAMPLES = {
  manufacturing: {
    industry: 'manufacturing',
    text: `Línea de ensamble electrónico de alta precisión.
El operario de almacén (operario A) recoge las tarjetas PCB y componentes del almacén de materia prima y los transporta al área de preparación (3 min).
El técnico de ensamble (operario B) realiza montaje SMD: coloca componentes usando plantilla de pasta de soldadura, monta en máquina SMT, inspección visual (8 min/unidad).
El técnico de soldadura (operario C) realiza soldadura por ola o retoque manual en estación de soldadura (4 min/unidad).
El inspector QC verifica funcionamiento con probador ICT durante 5 minutos, aprueba o rechaza.
Unidades aprobadas van a packaging automático y paletizado para despacho.
El ciclo total por unidad es de 20 minutos con capacidad de 3 operarios simultáneos.`
  },
  logistics: {
    industry: 'logistics',
    text: `Centro de distribución para e-commerce con 3 turnos.
Muelle de recepción: el receptor verifica y descarga camiones, escanea códigos de barras con pistola RF, registra en sistema WMS, tiempo 15 min por pallet.
Zona de clasificación: el clasificador A organiza por tipo de producto (A,B,C) y destino, coloca en estanterías dinámicas.
Zona de almacenaje: operador de montacargas posiciona pallets en racks altos según mapa de ubicaciones WMS.
Área de picking: el picker recibe órdenes digitales en tablet, recorre el almacén con carro de picking, recolecta productos, escanea confirmación (8-12 min/orden).
Empaque: el empacador arma cajas, imprime etiquetas, coloca en cinta transportadora hacia muelle de despacho.
Despacho: verificación final de pedido, asignación de guía de transporte, carga en camión.`
  },
  food: {
    industry: 'food',
    text: `Cocina industrial de catering corporativo para 500 personas.
Recepción de materia prima: el bodeguero recibe, verifica temperatura y calidad, almacena en cámara fría (0-4°C) o bodega seca.
Mise en place: el cocinero A prepara verduras (lavar, cortar, porcionar) y carnes (desposte, marinada) durante 60 minutos.
Cocción partida caliente: chef B prepara fondos, salsas y guarniciones en marmitas de 80L y fogones industriales (45 min).
Horneado: hornos de convección giratoria a 180°C para proteínas y masas (programación automatizada 25-40 min).
Emplatado: línea de 3 operarios emplatan según estándar fotográfico, controlan temperatura mínima 65°C con termómetro digital.
Distribución: contenedores isotérmicos cargados en furgón para entrega dentro de 30 minutos.`
  },
  medical: {
    industry: 'medical',
    text: `Laboratorio clínico de análisis automatizado.
Recepción de muestras: auxiliar recepciona tubos, verifica cadena de custodia y datos del paciente, etiqueta con código de barras LIS.
Triaje: técnico clasifica muestras según análisis solicitados (hematología CBC, química sanguínea, microbiología, orina).
Centrifugación: centrifuga a 3500 rpm durante 10 minutos en centrífuga refrigerada para muestras de suero.
Carga autoanalizador: técnico carga muestras en carrusel del analizador automático de bioquímica (Cobas, Architect) con capacidad 200 tests/hora.
Control de calidad: el técnico revisa los controles internos cada 8 horas y verifica valores de alarma.
Validación: el patólogo valida resultados críticos, anota observaciones morfológicas en hemogramas.
Reporte: liberación de resultados al HIS/LIS, impresión para pacientes ambulatorios, archivo digital.`
  },
  maintenance: {
    industry: 'maintenance',
    text: `Taller de mantenimiento industrial para equipos rotativos.
Recepción del equipo: el recepcionista registra la orden de trabajo, descripción de la falla, historial del equipo y datos del cliente.
Diagnóstico: el técnico diagnosticador realiza pruebas eléctricas (aislamiento, continuidad), vibración y análisis de aceite en el banco de diagnóstico (45 min).
Solicitud de repuestos: el almacenista verifica stock, solicita compra si no hay disponibilidad (tiempo variable 1-48 horas).
Mecanizado: el tornero trabaja piezas en torno CNC o convencional, rectificadora, fresadora según requerimiento.
Soldadura: el soldador realiza soldadura MIG/TIG para reparación estructural y resane de carcasas.
Ensamble: el técnico de ensamble monta el equipo con herramientas calibradas, ajusta tolerancias según especificaciones del fabricante.
Prueba: banco de pruebas funcional: prueba sin carga, con carga parcial y plena, verifica temperatura, ruido y vibración.
Entrega: elabora informe técnico con causa raíz, trabajos realizados, repuestos instalados y recomendaciones de mantenimiento preventivo.`
  },
  construction: {
    industry: 'construction',
    text: `Construcción de losa de entrepiso en edificio residencial de 8 pisos.
Maestro de obra revisa planos estructurales con el ingeniero residente, distribuye actividades a las 4 cuadrillas del turno.
Cuadrilla de encofrado (4 personas): instala puntales metálicos, coloca vigas de madera y tablones de encofrado según cotas del plano.
Cuadrilla de acero (3 personas): arma parrilla de acero de refuerzo No.4 y No.6, coloca separadores de recubrimiento, amarra cruces con alambre.
Cuadrilla de instalaciones (2 personas): coloca tuberías de desagüe PVC de 4" embebidas en losa, conduit eléctrico EMT de 1/2".
Vaciado: el operador de bomba posiciona el brazo telescópico, cuadrilla de 5 albañiles guía el concreto f'c=3000psi, vibra con vibrador eléctrico para eliminar vacíos.
Acabado: cuadrilla de acabados realiza nivelado con regla de aluminio, alisado superficial con fratacho y llana.
Curado: se aplica membrana de curado químico o curado con agua durante 7 días mínimo.`
  }
};

function loadExample(type) {
  const ex = EXAMPLES[type];
  if (!ex) return;
  const ta = document.getElementById('procedure-text');
  const sel = document.getElementById('industry-select');
  if (ta) ta.value = ex.text.trim();
  if (sel) sel.value = ex.industry;
  showToast(`Ejemplo cargado: ${type}`, 'info');
  hideLanding();
  switchTab('input');
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOOR PLAN
// ═══════════════════════════════════════════════════════════════════════════
function handleFloorPlanUpload(event) {
  const file = event.target.files[0];
  if (file) processFloorPlanFile(file);
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone')?.classList.remove('dragover');
  const file = event.dataTransfer.files[0];
  if (file?.type.startsWith('image/')) processFloorPlanFile(file);
}

function processFloorPlanFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    NF.floorPlanBase64 = e.target.result.split(',')[1];
    const uz = document.getElementById('upload-zone');
    const fp = document.getElementById('floor-plan-preview');
    const img = document.getElementById('plan-img');
    if (uz) uz.style.display = 'none';
    if (fp) fp.style.display = 'block';
    if (img) img.src = e.target.result;
    showToast('Plano cargado — La IA lo analizará al generar', 'success');
  };
  reader.readAsDataURL(file);
}

function removeFloorPlan() {
  NF.floorPlanBase64 = null;
  const uz = document.getElementById('upload-zone');
  const fp = document.getElementById('floor-plan-preview');
  const fi = document.getElementById('floor-plan-input');
  if (uz) uz.style.display = 'block';
  if (fp) fp.style.display = 'none';
  if (fi) fi.value = '';
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════
async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    if (data.success) renderProjects(data.projects || []);
  } catch {}
}

function renderProjects(projects) {
  // Projects can be shown in a dropdown or panel — kept minimal
}

async function createProject() {
  const name = document.getElementById('project-name')?.value?.trim();
  if (!name) { showToast('El nombre del proyecto es obligatorio', 'error'); return; }
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: document.getElementById('project-desc')?.value?.trim() || '',
        industry: document.getElementById('project-industry')?.value || 'manufacturing'
      })
    });
    const data = await res.json();
    if (data.success) {
      NF.projectId = data.project.id;
      closeModal('new-project-modal');
      showToast(`Proyecto "${name}" creado`, 'success');
      document.getElementById('project-name').value = '';
      document.getElementById('project-desc').value = '';
    }
  } catch (err) {
    showToast('Error al crear proyecto', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════
async function loadHistory() {
  const container = document.getElementById('history-list-container');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--nf-t3);font-size:0.8rem;text-align:center;padding:20px">Cargando...</div>';
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    if (!data.success || !data.projects?.length) {
      container.innerHTML = '<div style="color:var(--nf-t3);font-size:0.82rem;text-align:center;padding:40px 20px"><i class="fas fa-folder-open" style="font-size:2rem;opacity:0.2;display:block;margin-bottom:10px"></i>No hay proyectos aún</div>';
      return;
    }
    container.innerHTML = `<div class="history-list">${data.projects.map(p => `
      <div class="history-card" onclick="loadProjectSims('${p.id}')">
        <div class="history-card-title">${p.name}</div>
        <div class="history-card-meta">
          <span><i class="fas fa-industry"></i> ${p.industry || 'general'}</span>
          <span><i class="fas fa-film"></i> ${p.simulations_count || 0} sims</span>
        </div>
      </div>`).join('')}</div>`;
  } catch {
    container.innerHTML = '<div style="color:var(--nf-t3);font-size:0.82rem;text-align:center;padding:20px">Error al cargar</div>';
  }
}

async function loadProjectSims(projectId) {
  try {
    const res = await fetch(`/api/projects/${projectId}/simulations`);
    const data = await res.json();
    if (!data.success || !data.simulations?.length) { showToast('No hay simulaciones en este proyecto', 'info'); return; }
    const sim = data.simulations[0];
    if (sim.scene_json) {
      const scene = JSON.parse(sim.scene_json);
      buildScene(scene);
      NF.simulationId = sim.id;
      showToast(`Simulación "${sim.name}" cargada`, 'success');
    }
  } catch {
    showToast('Error al cargar simulación', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
function exportScene() {
  if (!NF.currentScene) { showToast('Genera una simulación primero', 'error'); return; }
  const blob = new Blob([JSON.stringify(NF.currentScene, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `simforge3d_scene_${Date.now()}.json`);
  showToast('Escena exportada como JSON', 'success');
}

function exportReport() {
  if (!NF.currentScene) { showToast('Genera una simulación primero', 'error'); return; }
  const report = {
    platform: 'SimForge3D v3.0',
    generated: new Date().toISOString(),
    title: NF.currentScene.title,
    description: NF.currentScene.description,
    simulationTime: NF.simTime,
    unitsProduced: NF.units,
    failures: NF.failures,
    kpis: NF.currentScene.kpis,
    processSteps: NF.currentScene.steps,
    bottlenecks: NF.currentScene.bottlenecks,
    improvements: NF.currentScene.improvements,
    workers: NF.currentScene.workers?.map(w => ({ name: w.name, route: w.route?.length + ' pasos' })),
    zones: NF.currentScene.zones?.map(z => ({ name: z.name, type: z.type, dimensions: `${z.width}x${z.depth}m` })),
    machines: NF.currentScene.machines?.map(m => ({ name: m.name, type: m.type })),
    activityLog: NF.logEntries.slice(-100)
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `simforge3d_report_${Date.now()}.json`);
  showToast('Informe KPI exportado', 'success');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function showLanding() {
  const ol = document.getElementById('landing-overlay');
  if (ol) { ol.classList.remove('hidden'); }
}
function hideLanding() {
  const ol = document.getElementById('landing-overlay');
  if (ol) { ol.classList.add('hidden'); }
}

function switchMode(mode) {
  document.getElementById('btn-nav-gen')?.classList.toggle('active', mode === 'generate');
  document.getElementById('btn-nav-proj')?.classList.toggle('active', mode === 'projects');
  if (mode === 'projects') { switchTab('history'); loadHistory(); }
  else { switchTab('input'); }
}

function switchTab(tab) {
  ['input', 'scene', 'history'].forEach(t => {
    document.getElementById(`tab-content-${t}`)?.classList.remove('active');
    document.getElementById(`tab-btn-${t}`)?.classList.remove('active');
    // also try without 'content' prefix
    const c = document.getElementById(`tab-${t}`);
    if (c) c.style.display = 'none';
    const b = document.getElementById(`tab-btn-${t}`);
    if (b) b.classList.remove('active');
  });
  const c = document.getElementById(`tab-${tab}`);
  if (c) c.style.display = 'flex';
  const b = document.getElementById(`tab-btn-${tab}`);
  if (b) b.classList.add('active');
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: 'fas fa-circle-check', error: 'fas fa-circle-exclamation', info: 'fas fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type || 'info'}`;
  toast.innerHTML = `<i class="${icons[type] || icons.info} toast-icon"></i><span>${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 350); }, 3800);
}

function saveApiKey() {
  const key = document.getElementById('api-key-input')?.value?.trim();
  if (!key) { showToast('Ingresa una API key válida', 'error'); return; }
  localStorage.setItem('nf_apikey', key);
  closeModal('api-modal');
  showToast('API key guardada', 'success');
}

function restoreApiKey() {
  const key = localStorage.getItem('nf_apikey');
  const input = document.getElementById('api-key-input');
  if (key && input) input.value = key;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
function hexToInt(hex) {
  if (typeof hex !== 'string') return 0x334466;
  return parseInt(hex.replace('#', ''), 16) || 0x334466;
}

function lightenColor(hexInt, factor) {
  const r = Math.min(255, ((hexInt >> 16) & 255) + 255 * factor) | 0;
  const g = Math.min(255, ((hexInt >> 8) & 255) + 255 * factor) | 0;
  const b = Math.min(255, (hexInt & 255) + 255 * factor) | 0;
  return (r << 16) | (g << 8) | b;
}

// Close modals on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});
