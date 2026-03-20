import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

// ─── TYPES ─────────────────────────────────────────────────────────────────
type Bindings = {
  DB: D1Database
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

type SceneZone = {
  id: string; name: string; type: string
  x: number; z: number; width: number; depth: number; height: number
  color: string; label: string
}
type SceneMachine = {
  id: string; name: string; type: string
  x: number; z: number; width: number; depth: number; height: number
  color: string; animated: boolean
}
type WorkerRoute = {
  step: number; action: string; targetX: number; targetZ: number
  duration: number; description: string; zone: string
}
type SceneWorker = {
  id: string; name: string; color: string; helmetColor: string
  startX: number; startZ: number; route: WorkerRoute[]
}
type SceneData = {
  title: string; description: string
  environment: { width: number; depth: number; floorColor: string; wallColor: string; ceilingHeight: number }
  zones: SceneZone[]; machines: SceneMachine[]; workers: SceneWorker[]
  kpis: { cycleTime: number; workersCount: number; zonesCount: number; machinesCount: number; efficiency: number; throughput: number }
  steps: string[]; bottlenecks: string[]; improvements: string[]
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('*', cors())

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/projects', async (c) => {
  const { DB } = c.env
  const { results } = await DB.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM simulations s WHERE s.project_id = p.id) AS simulations_count,
      (SELECT MAX(s.created_at) FROM simulations s WHERE s.project_id = p.id) AS last_simulation
    FROM projects p
    WHERE p.status != 'archived'
    ORDER BY p.updated_at DESC
    LIMIT 50
  `).all()
  return c.json({ success: true, projects: results })
})

app.post('/api/projects', async (c) => {
  const { DB } = c.env
  const { name, description, industry } = await c.req.json()
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  await DB.prepare(`
    INSERT INTO projects (id, name, description, industry)
    VALUES (?, ?, ?, ?)
  `).bind(id, name.trim(), description || '', industry || 'manufacturing').run()
  const project = await DB.prepare('SELECT * FROM projects WHERE id=?').bind(id).first()
  return c.json({ success: true, project }, 201)
})

app.put('/api/projects/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields: string[] = [], vals: unknown[] = []
  if (body.name) { fields.push('name=?'); vals.push(body.name) }
  if (body.description !== undefined) { fields.push('description=?'); vals.push(body.description) }
  if (body.industry) { fields.push('industry=?'); vals.push(body.industry) }
  if (body.status) { fields.push('status=?'); vals.push(body.status) }
  if (!fields.length) return c.json({ error: 'nothing to update' }, 400)
  fields.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id)
  await DB.prepare(`UPDATE projects SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  const project = await DB.prepare('SELECT * FROM projects WHERE id=?').bind(id).first()
  return c.json({ success: true, project })
})

app.delete('/api/projects/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  await DB.prepare(`UPDATE projects SET status='archived', updated_at=? WHERE id=?`)
    .bind(new Date().toISOString(), id).run()
  return c.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATIONS API
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/projects/:id/simulations', async (c) => {
  const { DB } = c.env
  const projectId = c.req.param('id')
  const { results } = await DB.prepare(`
    SELECT * FROM simulations WHERE project_id=? ORDER BY created_at DESC LIMIT 30
  `).bind(projectId).all()
  return c.json({ success: true, simulations: results })
})

app.get('/api/simulations/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const sim = await DB.prepare('SELECT * FROM simulations WHERE id=?').bind(id).first()
  if (!sim) return c.json({ error: 'not found' }, 404)
  return c.json({ success: true, simulation: sim })
})

app.delete('/api/simulations/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  await DB.prepare('DELETE FROM simulations WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════
// AI GENERATION API — CORE FEATURE
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/generate', async (c) => {
  const { DB, OPENAI_API_KEY, OPENAI_BASE_URL } = c.env
  const body = await c.req.json()
  const { procedure, floorPlanBase64, industry, projectId, apiKey } = body

  if (!procedure?.trim()) return c.json({ error: 'procedure required' }, 400)

  const effectiveKey = apiKey || OPENAI_API_KEY
  const baseUrl = OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

  if (!effectiveKey) return c.json({ error: 'API key required' }, 401)

  try {
    const systemPrompt = `Eres un arquitecto de simulaciones industriales 3D experto. 
Analizas procedimientos de trabajo y generas configuraciones de escena 3D detalladas.
SIEMPRE responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones.
El JSON debe ser la configuración completa de la escena.

INSTRUCCIONES DE DISEÑO:
- Usa coordenadas X entre -15 y 15, Z entre -10 y 10
- Colores como strings hex (#rrggbb)
- Las zonas NO deben superponerse
- Los workers deben tener rutas realistas y coherentes con el procedimiento
- Las máquinas deben estar dentro de las zonas correspondientes
- Los KPIs deben ser realistas según el proceso descrito
- Genera EXACTAMENTE el JSON con esta estructura`

    const userContent = floorPlanBase64
      ? [
          { type: 'text', text: buildUserPrompt(procedure, industry) },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${floorPlanBase64}` } }
        ]
      : buildUserPrompt(procedure, industry)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI error:', err)
      // Fall back to procedural generation
      const scene = generateSceneProcedurally(procedure, industry || 'manufacturing')
      return c.json({ success: true, scene, source: 'procedural' })
    }

    const data: any = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response from AI')

    let scene: SceneData
    try {
      scene = JSON.parse(content)
    } catch {
      scene = generateSceneProcedurally(procedure, industry || 'manufacturing')
      return c.json({ success: true, scene, source: 'procedural' })
    }

    // Validate and fix scene
    scene = validateAndFixScene(scene, procedure)

    // Save to DB if projectId provided
    if (projectId && DB) {
      try {
        const simId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        const name = scene.title || procedure.slice(0, 80)
        await DB.prepare(`
          INSERT INTO simulations (id, project_id, name, procedure, scene_json, workers_count, zones_count, efficiency, cycle_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          simId, projectId, name, procedure,
          JSON.stringify(scene),
          scene.workers?.length || 0,
          scene.zones?.length || 0,
          scene.kpis?.efficiency || 75,
          scene.kpis?.cycleTime || 15
        ).run()
        await DB.prepare(`UPDATE projects SET updated_at=? WHERE id=?`)
          .bind(new Date().toISOString(), projectId).run()
        return c.json({ success: true, scene, simulationId: simId, source: 'ai' })
      } catch (dbErr) {
        console.error('DB save error:', dbErr)
      }
    }

    return c.json({ success: true, scene, source: 'ai' })
  } catch (err: any) {
    console.error('Generation error:', err)
    // Always fallback to procedural
    const scene = generateSceneProcedurally(procedure, industry || 'manufacturing')
    return c.json({ success: true, scene, source: 'procedural' })
  }
})

// Save simulation run KPIs
app.post('/api/simulations/:id/runs', async (c) => {
  const { DB } = c.env
  const simId = c.req.param('id')
  const { duration, oee, throughput, unitsProduced, failures, kpis } = await c.req.json()
  const runId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  await DB.prepare(`
    INSERT INTO simulation_runs (id, simulation_id, duration_sec, oee, throughput, units_produced, failures, kpi_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(runId, simId, duration || 0, oee || 0, throughput || 0, unitsProduced || 0, failures || 0, JSON.stringify(kpis || {})).run()
  return c.json({ success: true, runId })
})

// Dashboard stats
app.get('/api/stats', async (c) => {
  const { DB } = c.env
  const [projects, simulations, runs] = await Promise.all([
    DB.prepare("SELECT COUNT(*) as count FROM projects WHERE status='active'").first<{ count: number }>(),
    DB.prepare("SELECT COUNT(*) as count FROM simulations").first<{ count: number }>(),
    DB.prepare("SELECT COUNT(*) as count, AVG(oee) as avg_oee, AVG(throughput) as avg_throughput FROM simulation_runs").first<{ count: number; avg_oee: number; avg_throughput: number }>()
  ])
  return c.json({
    success: true,
    stats: {
      projects: projects?.count || 0,
      simulations: simulations?.count || 0,
      runs: runs?.count || 0,
      avgOee: Math.round((runs?.avg_oee || 0) * 10) / 10,
      avgThroughput: Math.round(runs?.avg_throughput || 0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function buildUserPrompt(procedure: string, industry: string): string {
  return `Analiza este procedimiento de trabajo y genera una escena 3D industrial completa.

PROCEDIMIENTO:
${procedure}

INDUSTRIA: ${industry || 'manufacturing'}

Genera un JSON con esta estructura EXACTA:
{
  "title": "Título descriptivo del proceso",
  "description": "Descripción breve del proceso",
  "environment": {
    "width": 30,
    "depth": 20,
    "floorColor": "#1a1a2e",
    "wallColor": "#0f3460",
    "ceilingHeight": 5
  },
  "zones": [
    {
      "id": "z1",
      "name": "Nombre zona",
      "type": "entry|workstation|assembly|inspection|storage|exit|office|quality",
      "x": 0, "z": 0,
      "width": 5, "depth": 4, "height": 0.08,
      "color": "#2a4a6a",
      "label": "Etiqueta corta"
    }
  ],
  "machines": [
    {
      "id": "m1",
      "name": "Nombre máquina",
      "type": "conveyor|press|oven|computer|table|shelf|lathe|cnc|welder|crane|scanner",
      "x": 0, "z": 0,
      "width": 1.5, "depth": 1.0, "height": 1.2,
      "color": "#556677",
      "animated": true
    }
  ],
  "workers": [
    {
      "id": "w1",
      "name": "Nombre operario",
      "color": "#2255aa",
      "helmetColor": "#4477cc",
      "startX": -10, "startZ": -5,
      "route": [
        {
          "step": 1,
          "action": "walk|work|carry|inspect|repair|idle",
          "targetX": -10, "targetZ": -5,
          "duration": 4,
          "description": "Descripción de la acción",
          "zone": "z1"
        }
      ]
    }
  ],
  "kpis": {
    "cycleTime": 15,
    "workersCount": 3,
    "zonesCount": 6,
    "machinesCount": 5,
    "efficiency": 82,
    "throughput": 240
  },
  "steps": ["Paso 1", "Paso 2", "Paso 3"],
  "bottlenecks": ["Descripción del cuello de botella"],
  "improvements": ["Mejora sugerida 1", "Mejora sugerida 2"]
}

IMPORTANTE: Genera al menos 3 workers, 5 zonas y 4 máquinas. Las rutas deben ser coherentes con el procedimiento.`
}

function validateAndFixScene(scene: any, procedure: string): SceneData {
  if (!scene.environment) {
    scene.environment = { width: 30, depth: 20, floorColor: '#1a1a2e', wallColor: '#0f3460', ceilingHeight: 5 }
  }
  if (!Array.isArray(scene.zones) || scene.zones.length === 0) {
    scene = generateSceneProcedurally(procedure, 'manufacturing')
    return scene
  }
  if (!Array.isArray(scene.workers) || scene.workers.length === 0) {
    scene = generateSceneProcedurally(procedure, 'manufacturing')
    return scene
  }
  if (!scene.kpis) {
    scene.kpis = { cycleTime: 15, workersCount: scene.workers?.length || 2, zonesCount: scene.zones?.length || 4, machinesCount: scene.machines?.length || 3, efficiency: 78, throughput: 200 }
  }
  if (!Array.isArray(scene.steps)) scene.steps = []
  if (!Array.isArray(scene.bottlenecks)) scene.bottlenecks = []
  if (!Array.isArray(scene.improvements)) scene.improvements = []
  return scene as SceneData
}

function generateSceneProcedurally(procedure: string, industry: string): SceneData {
  const text = (procedure + ' ' + industry).toLowerCase()

  // Score each industry template
  const scores: Record<string, number> = {
    food: 0, medical: 0, logistics: 0, construction: 0,
    maintenance: 0, manufacturing: 0
  }

  // Food keywords
  const foodKw = ['aliment','cocin','food','restaurant','chef','cocina','menú','menu','ingredien','horno','cocción','emplatad','recipe','kitchen','gastrono','bebida','comida','platillo','culinari']
  foodKw.forEach(k => { if (text.includes(k)) scores.food += 2 })

  // Medical keywords
  const medKw = ['médic','hospital','muestra','laborator','patient','enferm','clínic','clinic','analiz','centrifug','sangre','diagnos','triage','farmac','salud','health','biopsia','patolog','microscop']
  medKw.forEach(k => { if (text.includes(k)) scores.medical += 2 })

  // Logistics/warehouse keywords
  const logKw = ['almacén','logística','bodega','despacho','envío','picking','warehouse','inventario','pallet','carga','descarga','transporte','distribuc','sorter','wms','fulfillment','shipping','recepción de mercancía','stock']
  logKw.forEach(k => { if (text.includes(k)) scores.logistics += 2 })

  // Construction keywords
  const conKw = ['obra','construcc','cuadrilla','cemento','concreto','encofrad','soldad','andamio','architect','plomería','electricist','albañil','losa','muro','cimentac','estructura','acabado']
  conKw.forEach(k => { if (text.includes(k)) scores.construction += 2 })

  // Maintenance keywords
  const mntKw = ['mantenimient','reparac','taller','mecánic','mechanic','torno','fresad','soldador','cnc','lubricac','avería','falla','correctivo','preventivo','diagnóstico técnico','motor','repuest','automotriz','automotive','vehículo','vehicle','transmission']
  mntKw.forEach(k => { if (text.includes(k)) scores.maintenance += 2 })

  // Manufacturing keywords
  const mfgKw = ['ensambla','manufactur','producción','línea','calidad','qc','operario','planta','troquelad','prensa','robot','conveyor','transportad','inyecc','molde','maquinado','montaje','componente']
  mfgKw.forEach(k => { if (text.includes(k)) scores.manufacturing += 1 })

  // Industry parameter bonus
  if (industry === 'food') scores.food += 5
  if (industry === 'medical' || industry === 'health') scores.medical += 5
  if (industry === 'logistics') scores.logistics += 5
  if (industry === 'construction') scores.construction += 5
  if (industry === 'maintenance') scores.maintenance += 5
  if (industry === 'automotive') scores.maintenance += 4  // automotive → maintenance template
  if (industry === 'manufacturing') scores.manufacturing += 3
  if (industry === 'electronics') scores.manufacturing += 3

  // Find best match
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  const template = best[0] as keyof typeof SCENE_TEMPLATES

  return SCENE_TEMPLATES[template]?.()
    ?? SCENE_TEMPLATES.manufacturing()
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

const SCENE_TEMPLATES: Record<string, () => SceneData> = {
  manufacturing: () => ({
    title: 'Planta de Ensamble — Línea de Producción',
    description: 'Línea de ensamble industrial con control de calidad automatizado y gestión de materiales.',
    environment: { width: 34, depth: 22, floorColor: '#0d1117', wallColor: '#161b22', ceilingHeight: 6 },
    zones: [
      { id: 'z1', name: 'Almacén MP', type: 'storage', x: -14, z: -8, width: 5, depth: 4, height: 0.08, color: '#1e3a4c', label: 'Almacén' },
      { id: 'z2', name: 'Pre-ensamble', type: 'workstation', x: -6, z: -5, width: 5, depth: 4, height: 0.08, color: '#1e4c3a', label: 'Pre-ens.' },
      { id: 'z3', name: 'Ensamble Principal', type: 'assembly', x: 2, z: -4, width: 6, depth: 6, height: 0.08, color: '#3a4c1e', label: 'Ensamble' },
      { id: 'z4', name: 'Control Calidad', type: 'inspection', x: 10, z: -3, width: 5, depth: 5, height: 0.08, color: '#4c3a1e', label: 'QC' },
      { id: 'z5', name: 'Packaging', type: 'assembly', x: -8, z: 6, width: 5, depth: 4, height: 0.08, color: '#2a1e4c', label: 'Packaging' },
      { id: 'z6', name: 'Despacho', type: 'exit', x: 6, z: 7, width: 5, depth: 4, height: 0.08, color: '#4c1e2a', label: 'Despacho' },
    ],
    machines: [
      { id: 'm1', name: 'Transportador A', type: 'conveyor', x: -2, z: -3, width: 4, depth: 0.8, height: 0.9, color: '#4a5568', animated: true },
      { id: 'm2', name: 'Prensa Hidráulica', type: 'press', x: 2, z: -4, width: 1.8, depth: 1.5, height: 2.2, color: '#2d4a6e', animated: true },
      { id: 'm3', name: 'Robot Ensamble', type: 'cnc', x: 4, z: -2, width: 1.2, depth: 1.2, height: 2.5, color: '#3d6e4a', animated: true },
      { id: 'm4', name: 'Mesa Inspección', type: 'table', x: 10, z: -3, width: 2.5, depth: 1.5, height: 0.9, color: '#6e4a2d', animated: false },
      { id: 'm5', name: 'Scanner QR', type: 'scanner', x: 12, z: -2, width: 0.3, depth: 0.3, height: 1.5, color: '#334455', animated: false },
      { id: 'm6', name: 'Selladora', type: 'press', x: -8, z: 6, width: 1.5, depth: 1.2, height: 1.4, color: '#554433', animated: false },
    ],
    workers: [
      { id: 'w1', name: 'Op. Almacén', color: '#3b82f6', helmetColor: '#60a5fa', startX: -14, startZ: -8,
        route: [
          { step: 1, action: 'work', targetX: -14, targetZ: -8, duration: 4, description: 'Prepara materiales', zone: 'z1' },
          { step: 2, action: 'carry', targetX: -6, targetZ: -5, duration: 3, description: 'Lleva materiales a pre-ensamble', zone: 'z2' },
          { step: 3, action: 'walk', targetX: -14, targetZ: -8, duration: 3, description: 'Regresa al almacén', zone: 'z1' },
        ] },
      { id: 'w2', name: 'Operario Ensamble', color: '#10b981', helmetColor: '#34d399', startX: 2, startZ: -4,
        route: [
          { step: 1, action: 'work', targetX: 2, targetZ: -4, duration: 6, description: 'Ensambla componentes', zone: 'z3' },
          { step: 2, action: 'carry', targetX: 10, targetZ: -3, duration: 2, description: 'Lleva a QC', zone: 'z4' },
          { step: 3, action: 'walk', targetX: 2, targetZ: -4, duration: 2, description: 'Regresa a ensamble', zone: 'z3' },
        ] },
      { id: 'w3', name: 'Inspector QC', color: '#f59e0b', helmetColor: '#fbbf24', startX: 10, startZ: -3,
        route: [
          { step: 1, action: 'inspect', targetX: 10, targetZ: -3, duration: 5, description: 'Inspección dimensional', zone: 'z4' },
          { step: 2, action: 'carry', targetX: 6, targetZ: 7, duration: 3, description: 'Aprueba y envía a despacho', zone: 'z6' },
          { step: 3, action: 'walk', targetX: 10, targetZ: -3, duration: 3, description: 'Regresa a QC', zone: 'z4' },
        ] },
    ],
    kpis: { cycleTime: 14, workersCount: 3, zonesCount: 6, machinesCount: 6, efficiency: 86, throughput: 264 },
    steps: ['Recepción MP', 'Pre-ensamble', 'Ensamble principal', 'Control de calidad', 'Packaging', 'Despacho'],
    bottlenecks: ['Cuello de botella en ensamble principal (mayor tiempo de ciclo)'],
    improvements: ['Segundo robot de ensamble para incrementar throughput', 'Sistema de abastecimiento automático desde almacén']
  }),

  logistics: () => ({
    title: 'Centro de Distribución — Flujo Logístico',
    description: 'Proceso de recepción, clasificación, almacenamiento y despacho de mercancías en centro de distribución.',
    environment: { width: 40, depth: 26, floorColor: '#0a0a14', wallColor: '#141428', ceilingHeight: 8 },
    zones: [
      { id: 'z1', name: 'Muelle Recepción', type: 'entry', x: -17, z: -9, width: 5, depth: 5, height: 0.08, color: '#1a2a3a', label: 'Recepción' },
      { id: 'z2', name: 'Área Clasificación', type: 'workstation', x: -8, z: -5, width: 6, depth: 5, height: 0.08, color: '#1a3a2a', label: 'Clasificac.' },
      { id: 'z3', name: 'Almacén A (Seco)', type: 'storage', x: 0, z: -6, width: 8, depth: 8, height: 0.08, color: '#2a1a3a', label: 'Almacén A' },
      { id: 'z4', name: 'Almacén B (Frío)', type: 'storage', x: 10, z: -4, width: 6, depth: 6, height: 0.08, color: '#1a2a4a', label: 'Almacén B' },
      { id: 'z5', name: 'Picking / Preparación', type: 'assembly', x: -4, z: 7, width: 7, depth: 5, height: 0.08, color: '#3a2a1a', label: 'Picking' },
      { id: 'z6', name: 'Muelle Despacho', type: 'exit', x: 14, z: 8, width: 5, depth: 5, height: 0.08, color: '#3a1a2a', label: 'Despacho' },
      { id: 'z7', name: 'Control Inventario', type: 'office', x: 16, z: -8, width: 4, depth: 3, height: 0.08, color: '#2a2a1a', label: 'Control' },
    ],
    machines: [
      { id: 'm1', name: 'Transportador Recepción', type: 'conveyor', x: -14, z: -7, width: 6, depth: 0.8, height: 0.9, color: '#4a5568', animated: true },
      { id: 'm2', name: 'Escáner Entrada', type: 'scanner', x: -11, z: -9, width: 0.4, depth: 0.4, height: 1.8, color: '#334455', animated: false },
      { id: 'm3', name: 'Carretilla Elevadora 1', type: 'crane', x: 0, z: -6, width: 1.2, depth: 2, height: 2.5, color: '#cc8822', animated: true },
      { id: 'm4', name: 'Carretilla Elevadora 2', type: 'crane', x: 10, z: -4, width: 1.2, depth: 2, height: 2.5, color: '#cc6622', animated: false },
      { id: 'm5', name: 'Sistema WMS', type: 'computer', x: 16, z: -8, width: 0.6, depth: 0.4, height: 1.5, color: '#334455', animated: false },
      { id: 'm6', name: 'Sorter Clasificación', type: 'conveyor', x: -6, z: -3, width: 4, depth: 0.8, height: 1, color: '#445566', animated: true },
      { id: 'm7', name: 'Estaciones Picking', type: 'table', x: -4, z: 7, width: 4, depth: 1.5, height: 0.9, color: '#664433', animated: false },
    ],
    workers: [
      { id: 'w1', name: 'Receptor', color: '#3b82f6', helmetColor: '#60a5fa', startX: -17, startZ: -9,
        route: [
          { step: 1, action: 'inspect', targetX: -17, targetZ: -9, duration: 4, description: 'Verifica y descarga mercancía', zone: 'z1' },
          { step: 2, action: 'carry', targetX: -8, targetZ: -5, duration: 3, description: 'Lleva a clasificación', zone: 'z2' },
          { step: 3, action: 'walk', targetX: -17, targetZ: -9, duration: 3, description: 'Regresa al muelle', zone: 'z1' },
        ] },
      { id: 'w2', name: 'Clasificador', color: '#10b981', helmetColor: '#34d399', startX: -8, startZ: -5,
        route: [
          { step: 1, action: 'work', targetX: -8, targetZ: -5, duration: 3, description: 'Clasifica y etiqueta', zone: 'z2' },
          { step: 2, action: 'carry', targetX: 0, targetZ: -6, duration: 4, description: 'Almacena en zona seca', zone: 'z3' },
          { step: 3, action: 'walk', targetX: -8, targetZ: -5, duration: 3, description: 'Regresa a clasificación', zone: 'z2' },
        ] },
      { id: 'w3', name: 'Operador Picking', color: '#f59e0b', helmetColor: '#fbbf24', startX: -4, startZ: 7,
        route: [
          { step: 1, action: 'work', targetX: -4, targetZ: 7, duration: 5, description: 'Prepara pedido según WMS', zone: 'z5' },
          { step: 2, action: 'carry', targetX: 14, targetZ: 8, duration: 3, description: 'Lleva pedido a despacho', zone: 'z6' },
          { step: 3, action: 'walk', targetX: -4, targetZ: 7, duration: 3, description: 'Regresa a picking', zone: 'z5' },
        ] },
    ],
    kpis: { cycleTime: 11, workersCount: 3, zonesCount: 7, machinesCount: 7, efficiency: 91, throughput: 480 },
    steps: ['Recepción y verificación', 'Clasificación y etiquetado', 'Almacenamiento', 'Gestión WMS', 'Picking de pedidos', 'Despacho y carga'],
    bottlenecks: ['Clasificación puede generar cola en recepción masiva'],
    improvements: ['Sistema de clasificación automática (sorter)', 'Picking por voz para incrementar velocidad']
  }),

  food: () => ({
    title: 'Cocina Industrial — Línea de Producción Alimentaria',
    description: 'Proceso de preparación y ensamble de comidas en cocina industrial con control de temperatura y trazabilidad.',
    environment: { width: 28, depth: 18, floorColor: '#141414', wallColor: '#202020', ceilingHeight: 4 },
    zones: [
      { id: 'z1', name: 'Recepción MP', type: 'entry', x: -11, z: -6, width: 4, depth: 3, height: 0.08, color: '#1a2a1a', label: 'Recepción' },
      { id: 'z2', name: 'Prep. Fría', type: 'workstation', x: -5, z: -4, width: 4, depth: 3, height: 0.08, color: '#1a1a3a', label: 'Prep. Fría' },
      { id: 'z3', name: 'Prep. Caliente', type: 'workstation', x: 2, z: -3, width: 4, depth: 4, height: 0.08, color: '#3a1a1a', label: 'Prep. Cal.' },
      { id: 'z4', name: 'Cocción', type: 'assembly', x: 8, z: -2, width: 4, depth: 4, height: 0.08, color: '#2a2a1a', label: 'Cocción' },
      { id: 'z5', name: 'Emplatado', type: 'workstation', x: -3, z: 5, width: 5, depth: 3, height: 0.08, color: '#1a3a2a', label: 'Emplatado' },
      { id: 'z6', name: 'QC Temperatura', type: 'quality', x: 6, z: 6, width: 3, depth: 3, height: 0.08, color: '#3a2a1a', label: 'QC Temp' },
      { id: 'z7', name: 'Entrega / Servicio', type: 'exit', x: 10, z: 6, width: 3, depth: 3, height: 0.08, color: '#2a1a3a', label: 'Entrega' },
    ],
    machines: [
      { id: 'm1', name: 'Horno Convección ×2', type: 'oven', x: 8, z: -2, width: 1.5, depth: 1.2, height: 1.8, color: '#884422', animated: true },
      { id: 'm2', name: 'Cocina Industrial', type: 'oven', x: 10, z: -1, width: 1.5, depth: 0.9, height: 1.2, color: '#664422', animated: true },
      { id: 'm3', name: 'Mesa Prep. Fría', type: 'table', x: -5, z: -4, width: 3, depth: 1.5, height: 0.9, color: '#334455', animated: false },
      { id: 'm4', name: 'Mesa Emplatado', type: 'table', x: -3, z: 5, width: 4, depth: 1.2, height: 0.9, color: '#445533', animated: false },
      { id: 'm5', name: 'Termómetro Digital', type: 'scanner', x: 6, z: 6, width: 0.2, depth: 0.2, height: 0.5, color: '#334455', animated: false },
      { id: 'm6', name: 'Refrigerador Industrial', type: 'shelf', x: -10, z: -4, width: 1.5, depth: 0.8, height: 2.2, color: '#2a4a6e', animated: false },
    ],
    workers: [
      { id: 'w1', name: 'Chef de Partida', color: '#e5e7eb', helmetColor: '#ffffff', startX: 2, startZ: -3,
        route: [
          { step: 1, action: 'work', targetX: 2, targetZ: -3, duration: 5, description: 'Prepara ingredientes calientes', zone: 'z3' },
          { step: 2, action: 'carry', targetX: 8, targetZ: -2, duration: 2, description: 'Lleva a cocción', zone: 'z4' },
          { step: 3, action: 'inspect', targetX: 8, targetZ: -2, duration: 3, description: 'Supervisa cocción', zone: 'z4' },
          { step: 4, action: 'walk', targetX: 2, targetZ: -3, duration: 2, description: 'Regresa a prep.', zone: 'z3' },
        ] },
      { id: 'w2', name: 'Cocinero Frío', color: '#93c5fd', helmetColor: '#bfdbfe', startX: -5, startZ: -4,
        route: [
          { step: 1, action: 'work', targetX: -5, targetZ: -4, duration: 5, description: 'Prepara ingredientes fríos', zone: 'z2' },
          { step: 2, action: 'carry', targetX: -3, targetZ: 5, duration: 2, description: 'Lleva a emplatado', zone: 'z5' },
          { step: 3, action: 'walk', targetX: -5, targetZ: -4, duration: 2, description: 'Regresa a prep. fría', zone: 'z2' },
        ] },
      { id: 'w3', name: 'Emplatador', color: '#6ee7b7', helmetColor: '#a7f3d0', startX: -3, startZ: 5,
        route: [
          { step: 1, action: 'work', targetX: -3, targetZ: 5, duration: 3, description: 'Emplata y presenta', zone: 'z5' },
          { step: 2, action: 'carry', targetX: 6, targetZ: 6, duration: 2, description: 'Lleva a control temperatura', zone: 'z6' },
          { step: 3, action: 'carry', targetX: 10, targetZ: 6, duration: 1, description: 'Entrega al servicio', zone: 'z7' },
          { step: 4, action: 'walk', targetX: -3, targetZ: 5, duration: 3, description: 'Regresa a emplatado', zone: 'z5' },
        ] },
    ],
    kpis: { cycleTime: 13, workersCount: 3, zonesCount: 7, machinesCount: 6, efficiency: 84, throughput: 277 },
    steps: ['Recepción MP', 'Preparación fría', 'Preparación caliente', 'Cocción', 'Emplatado', 'QC y temperatura', 'Servicio'],
    bottlenecks: ['Cuello de botella en cocción (mayor tiempo de proceso)'],
    improvements: ['Horno adicional para ampliar capacidad', 'Mise en place estandarizado']
  }),

  medical: () => ({
    title: 'Laboratorio Clínico — Procesamiento de Muestras',
    description: 'Flujo de trabajo de laboratorio clínico con cadena de custodia, centrifugado, análisis automatizado y validación.',
    environment: { width: 26, depth: 18, floorColor: '#e8e8ec', wallColor: '#d0dde8', ceilingHeight: 4 },
    zones: [
      { id: 'z1', name: 'Recepción Muestras', type: 'entry', x: -10, z: -6, width: 4, depth: 3, height: 0.08, color: '#aaccdd', label: 'Recepción' },
      { id: 'z2', name: 'Triaje y Registro', type: 'workstation', x: -4, z: -5, width: 4, depth: 3, height: 0.08, color: '#bbddcc', label: 'Triaje' },
      { id: 'z3', name: 'Centrifugado', type: 'assembly', x: 2, z: -4, width: 4, depth: 4, height: 0.08, color: '#ccddaa', label: 'Centrifugado' },
      { id: 'z4', name: 'Análisis Automatizado', type: 'inspection', x: 8, z: -3, width: 5, depth: 5, height: 0.08, color: '#ddccaa', label: 'Análisis' },
      { id: 'z5', name: 'Zona Estéril', type: 'quality', x: -4, z: 5, width: 5, depth: 4, height: 0.08, color: '#eedddd', label: 'Estéril' },
      { id: 'z6', name: 'Validación', type: 'office', x: 9, z: 6, width: 4, depth: 3, height: 0.08, color: '#ddccbb', label: 'Validación' },
      { id: 'z7', name: 'Archivo', type: 'storage', x: -10, z: 5, width: 3, depth: 3, height: 0.08, color: '#ccbbaa', label: 'Archivo' },
    ],
    machines: [
      { id: 'm1', name: 'Centrífuga ×2', type: 'press', x: 2, z: -4, width: 1.2, depth: 1.2, height: 1.2, color: '#aaaacc', animated: true },
      { id: 'm2', name: 'Analizador Hematología', type: 'computer', x: 8, z: -3, width: 1.5, depth: 0.9, height: 1.6, color: '#ccccaa', animated: false },
      { id: 'm3', name: 'Analizador Bioquímica', type: 'computer', x: 10, z: -3, width: 1.5, depth: 0.9, height: 1.6, color: '#aaccaa', animated: false },
      { id: 'm4', name: 'PC Triaje', type: 'computer', x: -4, z: -5, width: 0.5, depth: 0.4, height: 1.2, color: '#334455', animated: false },
      { id: 'm5', name: 'PC Validación', type: 'computer', x: 9, z: 6, width: 0.5, depth: 0.4, height: 1.2, color: '#334455', animated: false },
      { id: 'm6', name: 'Lector Código Barras', type: 'scanner', x: -4, z: -6, width: 0.2, depth: 0.2, height: 1, color: '#334455', animated: false },
    ],
    workers: [
      { id: 'w1', name: 'TLM Recepción', color: '#2266aa', helmetColor: '#4488cc', startX: -10, startZ: -6,
        route: [
          { step: 1, action: 'work', targetX: -10, targetZ: -6, duration: 3, description: 'Recibe muestra con cadena custodia', zone: 'z1' },
          { step: 2, action: 'carry', targetX: -4, targetZ: -5, duration: 2, description: 'Lleva a triaje y registro', zone: 'z2' },
          { step: 3, action: 'walk', targetX: -10, targetZ: -6, duration: 2, description: 'Regresa a recepción', zone: 'z1' },
        ] },
      { id: 'w2', name: 'TLM Análisis', color: '#2288cc', helmetColor: '#44aadd', startX: 2, startZ: -4,
        route: [
          { step: 1, action: 'work', targetX: 2, targetZ: -4, duration: 5, description: 'Opera centrífuga', zone: 'z3' },
          { step: 2, action: 'carry', targetX: 8, targetZ: -3, duration: 2, description: 'Carga analizadores', zone: 'z4' },
          { step: 3, action: 'inspect', targetX: 8, targetZ: -3, duration: 5, description: 'Supervisa análisis', zone: 'z4' },
          { step: 4, action: 'walk', targetX: 2, targetZ: -4, duration: 2, description: 'Regresa a centrífuga', zone: 'z3' },
        ] },
      { id: 'w3', name: 'Patólogo Validador', color: '#22aa88', helmetColor: '#44ccaa', startX: 9, startZ: 6,
        route: [
          { step: 1, action: 'inspect', targetX: 9, targetZ: 6, duration: 5, description: 'Valida resultados analíticos', zone: 'z6' },
          { step: 2, action: 'work', targetX: 9, targetZ: 6, duration: 3, description: 'Libera reporte al sistema', zone: 'z6' },
          { step: 3, action: 'walk', targetX: -10, targetZ: 5, duration: 5, description: 'Archiva documentación', zone: 'z7' },
          { step: 4, action: 'walk', targetX: 9, targetZ: 6, duration: 5, description: 'Regresa a validación', zone: 'z6' },
        ] },
    ],
    kpis: { cycleTime: 17, workersCount: 3, zonesCount: 7, machinesCount: 6, efficiency: 88, throughput: 212 },
    steps: ['Recepción con cadena de custodia', 'Triaje y etiquetado', 'Centrifugado', 'Análisis automatizado', 'Validación patólogo', 'Liberación de resultados'],
    bottlenecks: ['Cuello de botella en validación (único patólogo)'],
    improvements: ['Segundo turno de validación', 'Reglas de autoliberación para valores normales']
  }),

  maintenance: () => ({
    title: 'Taller de Mantenimiento Industrial',
    description: 'Procedimiento de mantenimiento preventivo y correctivo con diagnóstico, mecanizado, reparación y pruebas.',
    environment: { width: 34, depth: 22, floorColor: '#1a1a1a', wallColor: '#282828', ceilingHeight: 7 },
    zones: [
      { id: 'z1', name: 'Recepción Equipos', type: 'entry', x: -14, z: -8, width: 4, depth: 4, height: 0.08, color: '#2a2a1a', label: 'Recepción' },
      { id: 'z2', name: 'Diagnóstico', type: 'inspection', x: -7, z: -5, width: 5, depth: 4, height: 0.08, color: '#1a2a2a', label: 'Diagnóstico' },
      { id: 'z3', name: 'Mecanizado', type: 'workstation', x: 0, z: -3, width: 6, depth: 6, height: 0.08, color: '#1a1a2a', label: 'Mecanizado' },
      { id: 'z4', name: 'Soldadura', type: 'assembly', x: 8, z: -4, width: 4, depth: 4, height: 0.08, color: '#2a1a1a', label: 'Soldadura' },
      { id: 'z5', name: 'Almacén Repuestos', type: 'storage', x: -6, z: 8, width: 5, depth: 3, height: 0.08, color: '#1a3a1a', label: 'Repuestos' },
      { id: 'z6', name: 'Pruebas', type: 'quality', x: 12, z: -3, width: 4, depth: 4, height: 0.08, color: '#2a2a15', label: 'Pruebas' },
      { id: 'z7', name: 'Entrega', type: 'exit', x: 14, z: 7, width: 4, depth: 3, height: 0.08, color: '#1a1a2a', label: 'Entrega' },
    ],
    machines: [
      { id: 'm1', name: 'Torno CNC', type: 'lathe', x: 0, z: -3, width: 2.5, depth: 1.5, height: 1.5, color: '#556677', animated: true },
      { id: 'm2', name: 'Fresadora', type: 'cnc', x: 3, z: -1, width: 2, depth: 1.5, height: 2, color: '#445566', animated: false },
      { id: 'm3', name: 'Soldadora MIG', type: 'welder', x: 8, z: -4, width: 0.8, depth: 0.8, height: 1.8, color: '#884422', animated: true },
      { id: 'm4', name: 'Banco Diagnóstico', type: 'table', x: -7, z: -5, width: 3, depth: 1.5, height: 0.9, color: '#664422', animated: false },
      { id: 'm5', name: 'Banco Pruebas', type: 'table', x: 12, z: -3, width: 3, depth: 1.5, height: 1, color: '#554422', animated: false },
      { id: 'm6', name: 'Estante Herramientas', type: 'shelf', x: -14, z: -5, width: 3, depth: 0.5, height: 3, color: '#444422', animated: false },
      { id: 'm7', name: 'Grúa Puente', type: 'crane', x: 0, z: 0, width: 1, depth: 1, height: 6, color: '#cc8822', animated: true },
    ],
    workers: [
      { id: 'w1', name: 'Técnico Recepción', color: '#cc7722', helmetColor: '#ffaa00', startX: -14, startZ: -8,
        route: [
          { step: 1, action: 'inspect', targetX: -14, targetZ: -8, duration: 3, description: 'Recibe equipo y documenta', zone: 'z1' },
          { step: 2, action: 'carry', targetX: -7, targetZ: -5, duration: 3, description: 'Lleva a diagnóstico', zone: 'z2' },
          { step: 3, action: 'walk', targetX: -14, targetZ: -8, duration: 3, description: 'Regresa a recepción', zone: 'z1' },
        ] },
      { id: 'w2', name: 'Mecánico CNC', color: '#bb4411', helmetColor: '#ff6622', startX: 0, startZ: -3,
        route: [
          { step: 1, action: 'repair', targetX: 0, targetZ: -3, duration: 10, description: 'Mecaniza y rectifica pieza', zone: 'z3' },
          { step: 2, action: 'inspect', targetX: 0, targetZ: -3, duration: 2, description: 'Control dimensional', zone: 'z3' },
          { step: 3, action: 'carry', targetX: 8, targetZ: -4, duration: 3, description: 'Lleva a soldadura', zone: 'z4' },
          { step: 4, action: 'walk', targetX: 0, targetZ: -3, duration: 3, description: 'Regresa al CNC', zone: 'z3' },
        ] },
      { id: 'w3', name: 'Soldador Certificado', color: '#884422', helmetColor: '#cc6600', startX: 8, startZ: -4,
        route: [
          { step: 1, action: 'repair', targetX: 8, targetZ: -4, duration: 8, description: 'Soldadura y resane', zone: 'z4' },
          { step: 2, action: 'carry', targetX: 12, targetZ: -3, duration: 3, description: 'Lleva a banco de pruebas', zone: 'z6' },
          { step: 3, action: 'inspect', targetX: 12, targetZ: -3, duration: 4, description: 'Pruebas funcionales', zone: 'z6' },
          { step: 4, action: 'walk', targetX: 8, targetZ: -4, duration: 5, description: 'Regresa a soldadura', zone: 'z4' },
        ] },
    ],
    kpis: { cycleTime: 28, workersCount: 3, zonesCount: 7, machinesCount: 7, efficiency: 73, throughput: 129 },
    steps: ['Recepción y documentación', 'Diagnóstico técnico', 'Búsqueda de repuestos', 'Mecanizado/rectificado', 'Soldadura', 'Pruebas funcionales', 'Entrega y cierre OT'],
    bottlenecks: ['Cuello de botella en mecanizado CNC'],
    improvements: ['Inventario mínimo de repuestos críticos', 'Segunda máquina CNC para piezas simples']
  }),

  construction: () => ({
    title: 'Obra Civil — Gestión de Cuadrillas',
    description: 'Coordinación de cuadrillas en obra: estructura, acabados, instalaciones y control de avance.',
    environment: { width: 40, depth: 28, floorColor: '#2a2218', wallColor: '#1a1a18', ceilingHeight: 8 },
    zones: [
      { id: 'z1', name: 'Acopio Materiales', type: 'storage', x: -17, z: -10, width: 5, depth: 4, height: 0.08, color: '#2a2010', label: 'Acopio' },
      { id: 'z2', name: 'Estructura', type: 'workstation', x: -7, z: -4, width: 6, depth: 6, height: 0.08, color: '#2a1a10', label: 'Estructura' },
      { id: 'z3', name: 'Instalaciones', type: 'assembly', x: 3, z: -4, width: 6, depth: 6, height: 0.08, color: '#101a2a', label: 'Instalac.' },
      { id: 'z4', name: 'Acabados', type: 'workstation', x: 12, z: -3, width: 5, depth: 5, height: 0.08, color: '#1a2010', label: 'Acabados' },
      { id: 'z5', name: 'Supervisión', type: 'office', x: 0, z: 9, width: 5, depth: 3, height: 0.08, color: '#1a1a10', label: 'Supervisor' },
      { id: 'z6', name: 'Seguridad', type: 'quality', x: -15, z: 8, width: 4, depth: 3, height: 0.08, color: '#251510', label: 'Seguridad' },
      { id: 'z7', name: 'Salida', type: 'exit', x: 17, z: 8, width: 4, depth: 4, height: 0.08, color: '#151520', label: 'Salida' },
    ],
    machines: [
      { id: 'm1', name: 'Concretera', type: 'press', x: -7, z: -4, width: 1.5, depth: 1.5, height: 1.5, color: '#888855', animated: true },
      { id: 'm2', name: 'Andamio', type: 'shelf', x: 3, z: -4, width: 5, depth: 0.5, height: 4, color: '#777755', animated: false },
      { id: 'm3', name: 'Mezcladora', type: 'press', x: -16, z: -8, width: 1.5, depth: 1.2, height: 1.2, color: '#886644', animated: true },
      { id: 'm4', name: 'Compresor', type: 'oven', x: -13, z: -8, width: 1.2, depth: 0.8, height: 1, color: '#664422', animated: false },
      { id: 'm5', name: 'Grúa Torre', type: 'crane', x: 0, z: -2, width: 1, depth: 1, height: 7, color: '#cc8822', animated: true },
      { id: 'm6', name: 'Cortadora Cerámica', type: 'lathe', x: 12, z: -3, width: 1.5, depth: 0.8, height: 1, color: '#555544', animated: false },
    ],
    workers: [
      { id: 'w1', name: 'Maestro de Obra', color: '#cc8822', helmetColor: '#ffffff', startX: 0, startZ: 9,
        route: [
          { step: 1, action: 'inspect', targetX: -7, targetZ: -4, duration: 4, description: 'Supervisa estructura', zone: 'z2' },
          { step: 2, action: 'inspect', targetX: 3, targetZ: -4, duration: 3, description: 'Revisa instalaciones', zone: 'z3' },
          { step: 3, action: 'work', targetX: 0, targetZ: 9, duration: 3, description: 'Registra avance', zone: 'z5' },
        ] },
      { id: 'w2', name: 'Cuadrilla Estructuras', color: '#886622', helmetColor: '#ffaa00', startX: -7, startZ: -4,
        route: [
          { step: 1, action: 'work', targetX: -7, targetZ: -4, duration: 8, description: 'Arma encofrado y vierte concreto', zone: 'z2' },
          { step: 2, action: 'walk', targetX: -17, targetZ: -10, duration: 4, description: 'Busca materiales', zone: 'z1' },
          { step: 3, action: 'carry', targetX: -7, targetZ: -4, duration: 4, description: 'Regresa con materiales', zone: 'z2' },
        ] },
      { id: 'w3', name: 'Cuadrilla Acabados', color: '#228833', helmetColor: '#44cc55', startX: 12, startZ: -3,
        route: [
          { step: 1, action: 'work', targetX: 12, targetZ: -3, duration: 7, description: 'Cerámica y pintura', zone: 'z4' },
          { step: 2, action: 'walk', targetX: -17, targetZ: -10, duration: 5, description: 'Busca materiales', zone: 'z1' },
          { step: 3, action: 'carry', targetX: 12, targetZ: -3, duration: 5, description: 'Regresa con materiales', zone: 'z4' },
        ] },
    ],
    kpis: { cycleTime: 24, workersCount: 3, zonesCount: 7, machinesCount: 6, efficiency: 76, throughput: 150 },
    steps: ['Revisión de planos', 'Acopio de materiales', 'Estructura', 'Instalaciones', 'Acabados', 'Inspección', 'Entrega'],
    bottlenecks: ['Cuello de botella en instalaciones', 'Esperas por materiales'],
    improvements: ['Plan de materiales semanal', 'Paralelizar instalaciones y acabados']
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// STATIC ASSETS + MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

app.use('/static/*', serveStatic({ root: './public' }))
app.use('/assets/*', serveStatic({ root: './public' }))

app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusForge — Industrial Simulation Platform</title>
  <meta name="description" content="Plataforma profesional de simulación industrial 3D con IA. Genera, analiza y optimiza procesos de trabajo automáticamente desde descripción de procedimientos y planos.">
  <meta property="og:title" content="NexusForge — Industrial Simulation Platform">
  <meta property="og:description" content="Genera simulaciones 3D industriales con IA en segundos. Sin código, sin límites.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <div id="root"></div>
  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
