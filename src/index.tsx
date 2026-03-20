import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('*', cors())

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un experto en simulación industrial 3D y ergonomía laboral.
Tu tarea es analizar un procedimiento de trabajo y generar una configuración JSON
para una simulación 3D interactiva con Three.js.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):

{
  "title": "Nombre de la simulación",
  "description": "Descripción breve",
  "environment": {
    "width": 30,
    "depth": 20,
    "floorColor": "#1a2a1a",
    "wallColor": "#1e3a5f",
    "ambientColor": "#334466"
  },
  "zones": [
    {
      "id": "zone_1",
      "name": "Almacén",
      "type": "storage",
      "x": -12,
      "z": -7,
      "width": 5,
      "depth": 4,
      "height": 0.1,
      "color": "#1a3a2a",
      "label": "Almacén"
    }
  ],
  "machines": [
    {
      "id": "machine_1",
      "name": "Mesa de trabajo",
      "type": "table",
      "x": 0,
      "z": 0,
      "width": 2,
      "depth": 1.2,
      "height": 0.8,
      "color": "#886633",
      "animated": false
    }
  ],
  "workers": [
    {
      "id": "worker_1",
      "name": "Operario 1",
      "color": "#3355aa",
      "startX": -10,
      "startZ": -5,
      "route": [
        {
          "step": 1,
          "action": "walk",
          "targetX": -10,
          "targetZ": -5,
          "duration": 3,
          "description": "Se dirige al almacén",
          "zone": "zone_1"
        },
        {
          "step": 2,
          "action": "work",
          "targetX": -10,
          "targetZ": -5,
          "duration": 4,
          "description": "Recoge materiales",
          "zone": "zone_1"
        },
        {
          "step": 3,
          "action": "carry",
          "targetX": 0,
          "targetZ": 0,
          "duration": 3,
          "description": "Traslada a la mesa de trabajo",
          "zone": "zone_2"
        },
        {
          "step": 4,
          "action": "work",
          "targetX": 0,
          "targetZ": 0,
          "duration": 5,
          "description": "Ensambla el componente",
          "zone": "zone_2"
        }
      ]
    }
  ],
  "kpis": {
    "cycleTime": 15,
    "workersCount": 1,
    "zonesCount": 3,
    "efficiency": 78
  },
  "steps": [
    "Paso 1: El operario recoge materiales del almacén",
    "Paso 2: Traslada materiales a la mesa de trabajo",
    "Paso 3: Ensambla el componente",
    "Paso 4: Lleva el producto terminado al área de despacho"
  ]
}

REGLAS CRÍTICAS:
- Las coordenadas x,z deben estar dentro del entorno: x entre -(width/2)+2 y (width/2)-2, z entre -(depth/2)+2 y (depth/2)-2
- Coloca los elementos de forma coherente con el procedimiento
- Si hay plano adjunto, úsalo para la distribución espacial
- Genera 2-4 trabajadores según la complejidad
- Genera 3-7 zonas bien distribuidas por el espacio
- Genera 3-6 máquinas/equipos
- Cada trabajador tiene ruta de 4-8 pasos que forman un ciclo completo (el último paso regresa al inicio)
- IMPORTANTE: El paso final de cada trabajador debe llevar de vuelta a startX, startZ
- Usa colores hexadecimales oscuros e industriales
- Responde SOLO con el JSON, sin \`\`\`json, sin texto adicional`

// ─── API: Generate scene ───────────────────────────────────────────────────
app.post('/api/generate', async (c) => {
  // Accept API key from env OR from request header (user-provided)
  const apiKey = c.env?.OPENAI_API_KEY || c.req.header('X-API-Key') || ''
  const baseURL = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

  let procedure = ''
  let floorPlanBase64 = ''
  let floorPlanMimeType = ''

  const contentType = c.req.header('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData()
    procedure = (formData.get('procedure') as string) || ''
    const file = formData.get('floorPlan') as File | null
    if (file) {
      const buffer = await file.arrayBuffer()
      floorPlanBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      floorPlanMimeType = file.type || 'image/png'
    }
  } else {
    const body = await c.req.json()
    procedure = body.procedure || ''
  }

  if (!procedure) return c.json({ error: 'procedure is required' }, 400)

  // If no API key, return demo scene based on keywords
  if (!apiKey || apiKey === 'demo') {
    const demo = generateDemoScene(procedure)
    return c.json({ success: true, scene: demo, demo: true })
  }

  const userContent: any[] = [{
    type: 'text',
    text: `Procedimiento de trabajo a simular:\n\n${procedure}`
  }]

  if (floorPlanBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${floorPlanMimeType};base64,${floorPlanBase64}`, detail: 'high' }
    })
    userContent.push({
      type: 'text',
      text: 'El plano/croquis adjunto muestra la distribución espacial. Úsalo para posicionar los elementos.'
    })
  }

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent }
        ],
        max_tokens: 4000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const err = await response.text()
      // Fallback to demo if API fails
      const demo = generateDemoScene(procedure)
      return c.json({ success: true, scene: demo, demo: true, apiError: err })
    }

    const data: any = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    let jsonStr = raw.trim()
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) jsonStr = match[1].trim()

    const sceneConfig = JSON.parse(jsonStr)
    return c.json({ success: true, scene: sceneConfig })
  } catch (e: any) {
    // Fallback to demo scene
    const demo = generateDemoScene(procedure)
    return c.json({ success: true, scene: demo, demo: true })
  }
})

// ─── API: Refine scene ─────────────────────────────────────────────────────
app.post('/api/refine', async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY || c.req.header('X-API-Key') || ''
  const baseURL = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
  const { scene, instruction } = await c.req.json()
  if (!scene || !instruction) return c.json({ error: 'scene and instruction required' }, 400)

  if (!apiKey || apiKey === 'demo') {
    return c.json({ success: true, scene, demo: true })
  }

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: 'Eres experto en simulación 3D industrial. Modifica el JSON de configuración según la instrucción. Responde ÚNICAMENTE con el JSON modificado válido, sin markdown.' },
          { role: 'user', content: `Instrucción: ${instruction}\n\nEscena:\n${JSON.stringify(scene, null, 2)}` }
        ],
        max_tokens: 4000,
        temperature: 0.2
      })
    })
    const data: any = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''
    let jsonStr = raw.trim()
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) jsonStr = match[1].trim()
    return c.json({ success: true, scene: JSON.parse(jsonStr) })
  } catch {
    return c.json({ success: true, scene, demo: true })
  }
})

// ─── DEMO SCENE GENERATOR ─────────────────────────────────────────────────
function generateDemoScene(procedure: string) {
  const text = procedure.toLowerCase()

  // Detect scenario type
  const isWarehouse = text.includes('almacén') || text.includes('logístic') || text.includes('despacho') || text.includes('bodega')
  const isKitchen = text.includes('cocina') || text.includes('alimento') || text.includes('cocinero') || text.includes('gastronomía')
  const isMedical = text.includes('laborator') || text.includes('médic') || text.includes('clínic') || text.includes('muestra') || text.includes('salud')
  const isMaintenance = text.includes('mantenimiento') || text.includes('reparación') || text.includes('taller')

  if (isWarehouse) return DEMO_SCENES.warehouse(procedure)
  if (isKitchen) return DEMO_SCENES.kitchen(procedure)
  if (isMedical) return DEMO_SCENES.medical(procedure)
  if (isMaintenance) return DEMO_SCENES.maintenance(procedure)
  return DEMO_SCENES.assembly(procedure)
}

const DEMO_SCENES = {
  assembly: (p: string) => ({
    title: 'Línea de Ensamblaje Industrial',
    description: p.substring(0, 80) + '...',
    environment: { width: 30, depth: 20, floorColor: '#1a2a1a', wallColor: '#1e3a5f', ambientColor: '#334466' },
    zones: [
      { id: 'z1', name: 'Almacén', type: 'storage', x: -12, z: -7, width: 5, depth: 4, height: 0.1, color: '#1a3a2a', label: 'Almacén' },
      { id: 'z2', name: 'Estación A', type: 'workstation', x: -4, z: 0, width: 4, depth: 4, height: 0.1, color: '#1a2a3a', label: 'Ensamblaje A' },
      { id: 'z3', name: 'Estación B', type: 'assembly', x: 4, z: 0, width: 4, depth: 4, height: 0.1, color: '#1a2a4a', label: 'Ensamblaje B' },
      { id: 'z4', name: 'Control Calidad', type: 'inspection', x: 10, z: -5, width: 4, depth: 3, height: 0.1, color: '#2a2a1a', label: 'C. Calidad' },
      { id: 'z5', name: 'Despacho', type: 'exit', x: 12, z: 7, width: 4, depth: 3, height: 0.1, color: '#1a1a3a', label: 'Despacho' }
    ],
    machines: [
      { id: 'm1', name: 'Mesa Ensamble A', type: 'table', x: -4, z: 0, width: 2, depth: 1.2, height: 0.8, color: '#886633', animated: false },
      { id: 'm2', name: 'Mesa Ensamble B', type: 'table', x: 4, z: 0, width: 2, depth: 1.2, height: 0.8, color: '#886644', animated: false },
      { id: 'm3', name: 'Prensa Hidráulica', type: 'press', x: 0, z: -6, width: 1.5, depth: 1.5, height: 2, color: '#445566', animated: true },
      { id: 'm4', name: 'Estante Piezas', type: 'shelf', x: -12, z: -5, width: 3, depth: 0.5, height: 2.5, color: '#664422', animated: false },
      { id: 'm5', name: 'Robot Soldador', type: 'robot', x: 2, z: 3, width: 0.8, depth: 0.8, height: 2.5, color: '#336688', animated: true }
    ],
    workers: [
      {
        id: 'w1', name: 'Operario 1', color: '#3355cc', startX: -12, startZ: -7,
        route: [
          { step: 1, action: 'walk', targetX: -12, targetZ: -5, duration: 3, description: 'Va al almacén', zone: 'z1' },
          { step: 2, action: 'work', targetX: -12, targetZ: -5, duration: 3, description: 'Recoge piezas', zone: 'z1' },
          { step: 3, action: 'carry', targetX: -4, targetZ: 0, duration: 4, description: 'Transporta a Estación A', zone: 'z2' },
          { step: 4, action: 'work', targetX: -4, targetZ: 0, duration: 5, description: 'Ensambla componente', zone: 'z2' },
          { step: 5, action: 'carry', targetX: 10, targetZ: -5, duration: 3, description: 'Lleva a Control de Calidad', zone: 'z4' },
          { step: 6, action: 'inspect', targetX: 10, targetZ: -5, duration: 3, description: 'Inspección', zone: 'z4' },
          { step: 7, action: 'walk', targetX: -12, targetZ: -7, duration: 4, description: 'Regresa al inicio', zone: 'z1' }
        ]
      },
      {
        id: 'w2', name: 'Operario 2', color: '#cc5533', startX: 4, startZ: -3,
        route: [
          { step: 1, action: 'work', targetX: 4, targetZ: 0, duration: 6, description: 'Ensambla en Estación B', zone: 'z3' },
          { step: 2, action: 'inspect', targetX: 4, targetZ: 0, duration: 2, description: 'Verifica calidad', zone: 'z3' },
          { step: 3, action: 'carry', targetX: 12, targetZ: 7, duration: 3, description: 'Lleva al despacho', zone: 'z5' },
          { step: 4, action: 'walk', targetX: 4, targetZ: -3, duration: 4, description: 'Regresa a Estación B', zone: 'z3' }
        ]
      },
      {
        id: 'w3', name: 'Inspector', color: '#33aa55', startX: 10, startZ: -5,
        route: [
          { step: 1, action: 'inspect', targetX: 10, targetZ: -5, duration: 5, description: 'Inspección de calidad', zone: 'z4' },
          { step: 2, action: 'walk', targetX: 12, targetZ: 7, duration: 3, description: 'Va a despacho', zone: 'z5' },
          { step: 3, action: 'work', targetX: 12, targetZ: 7, duration: 3, description: 'Registra productos', zone: 'z5' },
          { step: 4, action: 'walk', targetX: 10, targetZ: -5, duration: 3, description: 'Regresa a control', zone: 'z4' }
        ]
      }
    ],
    kpis: { cycleTime: 18, workersCount: 3, zonesCount: 5, efficiency: 76 },
    steps: [
      'Paso 1: Operario recoge materiales del almacén',
      'Paso 2: Transporta materiales a Estación A',
      'Paso 3: Ensambla componente (5 min)',
      'Paso 4: Segundo operario procesa en Estación B',
      'Paso 5: Inspector verifica calidad',
      'Paso 6: Producto aprobado va a despacho'
    ]
  }),

  warehouse: (p: string) => ({
    title: 'Centro de Distribución Logístico',
    description: p.substring(0, 80) + '...',
    environment: { width: 40, depth: 28, floorColor: '#181e18', wallColor: '#1a3040', ambientColor: '#2a3a4a' },
    zones: [
      { id: 'z1', name: 'Muelle Recepción', type: 'entry', x: -17, z: 0, width: 4, depth: 8, height: 0.1, color: '#1a2a3a', label: 'Muelle' },
      { id: 'z2', name: 'Racks A', type: 'storage', x: -6, z: -8, width: 8, depth: 5, height: 0.1, color: '#1a3a1a', label: 'Racks A' },
      { id: 'z3', name: 'Racks B', type: 'storage', x: 6, z: -8, width: 8, depth: 5, height: 0.1, color: '#1a3a1a', label: 'Racks B' },
      { id: 'z4', name: 'Picking', type: 'workstation', x: 0, z: 4, width: 8, depth: 4, height: 0.1, color: '#2a2a1a', label: 'Picking' },
      { id: 'z5', name: 'Empaque', type: 'assembly', x: 10, z: 4, width: 5, depth: 4, height: 0.1, color: '#1a1a3a', label: 'Empaque' },
      { id: 'z6', name: 'Despacho', type: 'exit', x: 17, z: 0, width: 4, depth: 8, height: 0.1, color: '#2a1a1a', label: 'Despacho' }
    ],
    machines: [
      { id: 'm1', name: 'Estante Alto A', type: 'shelf', x: -7, z: -8, width: 6, depth: 0.5, height: 4, color: '#554422', animated: false },
      { id: 'm2', name: 'Estante Alto B', type: 'shelf', x: 5, z: -8, width: 6, depth: 0.5, height: 4, color: '#554422', animated: false },
      { id: 'm3', name: 'Mesa Picking', type: 'table', x: 0, z: 4, width: 3, depth: 1.5, height: 0.9, color: '#886633', animated: false },
      { id: 'm4', name: 'Empacadora', type: 'conveyor', x: 10, z: 4, width: 4, depth: 0.8, height: 0.5, color: '#334455', animated: true },
      { id: 'm5', name: 'Computer Gestión', type: 'computer', x: -15, z: 5, width: 0.5, depth: 0.4, height: 1.2, color: '#334455', animated: false }
    ],
    workers: [
      {
        id: 'w1', name: 'Recepcionista', color: '#aa4433', startX: -17, startZ: 0,
        route: [
          { step: 1, action: 'work', targetX: -17, targetZ: 0, duration: 4, description: 'Recibe y escanea pallet', zone: 'z1' },
          { step: 2, action: 'carry', targetX: -6, targetZ: -8, duration: 5, description: 'Lleva a racks A', zone: 'z2' },
          { step: 3, action: 'work', targetX: -6, targetZ: -8, duration: 3, description: 'Almacena en rack', zone: 'z2' },
          { step: 4, action: 'walk', targetX: -17, targetZ: 0, duration: 4, description: 'Regresa al muelle', zone: 'z1' }
        ]
      },
      {
        id: 'w2', name: 'Picker', color: '#3355aa', startX: 0, startZ: -8,
        route: [
          { step: 1, action: 'walk', targetX: -6, targetZ: -8, duration: 3, description: 'Va a Racks A', zone: 'z2' },
          { step: 2, action: 'work', targetX: -6, targetZ: -8, duration: 3, description: 'Recoge producto', zone: 'z2' },
          { step: 3, action: 'carry', targetX: 0, targetZ: 4, duration: 3, description: 'Lleva a Picking', zone: 'z4' },
          { step: 4, action: 'carry', targetX: 10, targetZ: 4, duration: 3, description: 'Lleva a Empaque', zone: 'z5' },
          { step: 5, action: 'walk', targetX: 0, targetZ: -8, duration: 4, description: 'Regresa a racks', zone: 'z2' }
        ]
      },
      {
        id: 'w3', name: 'Empacador', color: '#33aa55', startX: 10, startZ: 4,
        route: [
          { step: 1, action: 'work', targetX: 10, targetZ: 4, duration: 5, description: 'Empaca pedido', zone: 'z5' },
          { step: 2, action: 'carry', targetX: 17, targetZ: 0, duration: 3, description: 'Lleva a despacho', zone: 'z6' },
          { step: 3, action: 'work', targetX: 17, targetZ: 0, duration: 2, description: 'Carga al camión', zone: 'z6' },
          { step: 4, action: 'walk', targetX: 10, targetZ: 4, duration: 3, description: 'Regresa a empaque', zone: 'z5' }
        ]
      }
    ],
    kpis: { cycleTime: 14, workersCount: 3, zonesCount: 6, efficiency: 82 },
    steps: [
      'Paso 1: Recepción y escaneo de mercancía',
      'Paso 2: Almacenamiento en racks',
      'Paso 3: Picking según orden',
      'Paso 4: Empaque del pedido',
      'Paso 5: Despacho al camión'
    ]
  }),

  kitchen: (p: string) => ({
    title: 'Cocina Industrial',
    description: p.substring(0, 80) + '...',
    environment: { width: 24, depth: 16, floorColor: '#1e1e1e', wallColor: '#2a2a1a', ambientColor: '#3a3a2a' },
    zones: [
      { id: 'z1', name: 'Prep.', type: 'workstation', x: -9, z: -5, width: 5, depth: 4, height: 0.1, color: '#2a2a1a', label: 'Preparación' },
      { id: 'z2', name: 'Cocción', type: 'workstation', x: 0, z: -2, width: 6, depth: 5, height: 0.1, color: '#3a1a1a', label: 'Cocción' },
      { id: 'z3', name: 'Emplatado', type: 'assembly', x: 8, z: -4, width: 4, depth: 3, height: 0.1, color: '#1a2a1a', label: 'Emplatado' },
      { id: 'z4', name: 'Servicio', type: 'exit', x: 10, z: 5, width: 3, depth: 3, height: 0.1, color: '#1a1a2a', label: 'Servicio' },
      { id: 'z5', name: 'Lavado', type: 'storage', x: -8, z: 5, width: 5, depth: 3, height: 0.1, color: '#1a2a3a', label: 'Lavado' }
    ],
    machines: [
      { id: 'm1', name: 'Estufa industrial', type: 'oven', x: 0, z: -2, width: 2.5, depth: 1.5, height: 1.2, color: '#884433', animated: true },
      { id: 'm2', name: 'Mesa prep.', type: 'table', x: -9, z: -5, width: 3, depth: 1.2, height: 0.9, color: '#888833', animated: false },
      { id: 'm3', name: 'Mesa emplatado', type: 'table', x: 8, z: -4, width: 2, depth: 1, height: 0.9, color: '#888844', animated: false },
      { id: 'm4', name: 'Fregadero', type: 'table', x: -8, z: 5, width: 2, depth: 1, height: 0.9, color: '#334455', animated: false }
    ],
    workers: [
      {
        id: 'w1', name: 'Chef Prep.', color: '#aaaaaa', startX: -9, startZ: -5,
        route: [
          { step: 1, action: 'work', targetX: -9, targetZ: -5, duration: 4, description: 'Prepara ingredientes', zone: 'z1' },
          { step: 2, action: 'carry', targetX: 0, targetZ: -2, duration: 3, description: 'Pasa a cocción', zone: 'z2' },
          { step: 3, action: 'walk', targetX: -9, targetZ: -5, duration: 3, description: 'Regresa a prep.', zone: 'z1' }
        ]
      },
      {
        id: 'w2', name: 'Chef Cocina', color: '#cccccc', startX: 0, startZ: -2,
        route: [
          { step: 1, action: 'work', targetX: 0, targetZ: -2, duration: 7, description: 'Cocina platillo', zone: 'z2' },
          { step: 2, action: 'carry', targetX: 8, targetZ: -4, duration: 2, description: 'Pasa a emplatado', zone: 'z3' },
          { step: 3, action: 'walk', targetX: 0, targetZ: -2, duration: 2, description: 'Regresa a cocción', zone: 'z2' }
        ]
      },
      {
        id: 'w3', name: 'Chef Emplatado', color: '#ddddaa', startX: 8, startZ: -4,
        route: [
          { step: 1, action: 'work', targetX: 8, targetZ: -4, duration: 3, description: 'Emplata y decora', zone: 'z3' },
          { step: 2, action: 'carry', targetX: 10, targetZ: 5, duration: 2, description: 'Lleva a servicio', zone: 'z4' },
          { step: 3, action: 'walk', targetX: 8, targetZ: -4, duration: 2, description: 'Regresa a emplatado', zone: 'z3' }
        ]
      }
    ],
    kpis: { cycleTime: 12, workersCount: 3, zonesCount: 5, efficiency: 84 },
    steps: ['Paso 1: Preparación de ingredientes', 'Paso 2: Cocción del platillo', 'Paso 3: Emplatado y decoración', 'Paso 4: Servicio al cliente']
  }),

  medical: (p: string) => ({
    title: 'Laboratorio Clínico',
    description: p.substring(0, 80) + '...',
    environment: { width: 22, depth: 16, floorColor: '#eaeaea', wallColor: '#ccddee', ambientColor: '#ddeeff' },
    zones: [
      { id: 'z1', name: 'Recepción', type: 'entry', x: -9, z: -5, width: 3, depth: 3, height: 0.1, color: '#aaccdd', label: 'Recepción' },
      { id: 'z2', name: 'Centrifugado', type: 'workstation', x: -3, z: -3, width: 4, depth: 3, height: 0.1, color: '#aaddcc', label: 'Centrifugado' },
      { id: 'z3', name: 'Análisis', type: 'inspection', x: 4, z: -3, width: 5, depth: 4, height: 0.1, color: '#ccddaa', label: 'Análisis' },
      { id: 'z4', name: 'Validación', type: 'office', x: 8, z: 5, width: 4, depth: 3, height: 0.1, color: '#ddccaa', label: 'Validación' },
      { id: 'z5', name: 'Zona Estéril', type: 'workstation', x: -4, z: 5, width: 5, depth: 3, height: 0.1, color: '#eeddcc', label: 'Estéril' }
    ],
    machines: [
      { id: 'm1', name: 'Centrífuga', type: 'press', x: -3, z: -3, width: 1, depth: 1, height: 1.2, color: '#aaaacc', animated: true },
      { id: 'm2', name: 'Analizador', type: 'computer', x: 4, z: -3, width: 1.2, depth: 0.8, height: 1.5, color: '#ccccaa', animated: false },
      { id: 'm3', name: 'Microscopio', type: 'computer', x: 6, z: -3, width: 0.5, depth: 0.5, height: 1.2, color: '#aaccaa', animated: false },
      { id: 'm4', name: 'PC Validación', type: 'computer', x: 8, z: 5, width: 0.5, depth: 0.4, height: 1.2, color: '#334455', animated: false }
    ],
    workers: [
      {
        id: 'w1', name: 'Técnico Rec.', color: '#2266aa', startX: -9, startZ: -5,
        route: [
          { step: 1, action: 'work', targetX: -9, targetZ: -5, duration: 3, description: 'Recibe muestra', zone: 'z1' },
          { step: 2, action: 'carry', targetX: -3, targetZ: -3, duration: 3, description: 'Lleva a centrífuga', zone: 'z2' },
          { step: 3, action: 'walk', targetX: -9, targetZ: -5, duration: 3, description: 'Regresa a recepción', zone: 'z1' }
        ]
      },
      {
        id: 'w2', name: 'Técnico Lab', color: '#2288cc', startX: -3, startZ: -3,
        route: [
          { step: 1, action: 'work', targetX: -3, targetZ: -3, duration: 5, description: 'Opera centrífuga', zone: 'z2' },
          { step: 2, action: 'carry', targetX: 4, targetZ: -3, duration: 3, description: 'Lleva a análisis', zone: 'z3' },
          { step: 3, action: 'inspect', targetX: 4, targetZ: -3, duration: 5, description: 'Realiza análisis', zone: 'z3' },
          { step: 4, action: 'walk', targetX: -3, targetZ: -3, duration: 3, description: 'Regresa a centrífuga', zone: 'z2' }
        ]
      },
      {
        id: 'w3', name: 'Validador', color: '#22aa88', startX: 8, startZ: 5,
        route: [
          { step: 1, action: 'inspect', targetX: 8, targetZ: 5, duration: 5, description: 'Valida resultados', zone: 'z4' },
          { step: 2, action: 'work', targetX: 8, targetZ: 5, duration: 3, description: 'Firma reporte', zone: 'z4' },
          { step: 3, action: 'walk', targetX: 4, targetZ: -3, duration: 4, description: 'Verifica análisis', zone: 'z3' },
          { step: 4, action: 'walk', targetX: 8, targetZ: 5, duration: 4, description: 'Regresa a validación', zone: 'z4' }
        ]
      }
    ],
    kpis: { cycleTime: 16, workersCount: 3, zonesCount: 5, efficiency: 88 },
    steps: ['Paso 1: Recepción y registro de muestra', 'Paso 2: Centrifugado', 'Paso 3: Análisis en analizador', 'Paso 4: Validación y reporte']
  }),

  maintenance: (p: string) => ({
    title: 'Taller de Mantenimiento',
    description: p.substring(0, 80) + '...',
    environment: { width: 28, depth: 20, floorColor: '#1c1c1c', wallColor: '#2a2a2a', ambientColor: '#3a3a2a' },
    zones: [
      { id: 'z1', name: 'Recepción Eq.', type: 'entry', x: -11, z: -7, width: 4, depth: 3, height: 0.1, color: '#2a2a1a', label: 'Recep. Eq.' },
      { id: 'z2', name: 'Diagnóstico', type: 'inspection', x: -5, z: -4, width: 4, depth: 4, height: 0.1, color: '#1a2a2a', label: 'Diagnóstico' },
      { id: 'z3', name: 'Reparación', type: 'workstation', x: 2, z: -2, width: 5, depth: 5, height: 0.1, color: '#1a1a2a', label: 'Reparación' },
      { id: 'z4', name: 'Pruebas', type: 'inspection', x: 9, z: -4, width: 4, depth: 4, height: 0.1, color: '#2a1a1a', label: 'Pruebas' },
      { id: 'z5', name: 'Almacén Repuestos', type: 'storage', x: -4, z: 7, width: 5, depth: 3, height: 0.1, color: '#1a3a1a', label: 'Repuestos' }
    ],
    machines: [
      { id: 'm1', name: 'Torno CNC', type: 'lathe', x: 2, z: -2, width: 2.5, depth: 1.2, height: 1.5, color: '#556677', animated: true },
      { id: 'm2', name: 'Fresadora', type: 'press', x: 4, z: 1, width: 1.5, depth: 1.5, height: 2, color: '#445566', animated: false },
      { id: 'm3', name: 'Banco de Pruebas', type: 'table', x: 9, z: -4, width: 3, depth: 1.5, height: 1, color: '#664422', animated: false },
      { id: 'm4', name: 'Estante Herr.', type: 'shelf', x: -11, z: 0, width: 3, depth: 0.5, height: 2.5, color: '#554422', animated: false },
      { id: 'm5', name: 'Soldadora', type: 'robot', x: 0, z: 2, width: 0.8, depth: 0.8, height: 1.8, color: '#884422', animated: true }
    ],
    workers: [
      {
        id: 'w1', name: 'Técnico 1', color: '#cc7722', startX: -11, startZ: -7,
        route: [
          { step: 1, action: 'work', targetX: -11, targetZ: -7, duration: 3, description: 'Recibe equipo', zone: 'z1' },
          { step: 2, action: 'carry', targetX: -5, targetZ: -4, duration: 3, description: 'Lleva a diagnóstico', zone: 'z2' },
          { step: 3, action: 'inspect', targetX: -5, targetZ: -4, duration: 5, description: 'Diagnóstico inicial', zone: 'z2' },
          { step: 4, action: 'walk', targetX: -11, targetZ: -7, duration: 3, description: 'Regresa a recepción', zone: 'z1' }
        ]
      },
      {
        id: 'w2', name: 'Técnico 2', color: '#cc3322', startX: 2, startZ: -2,
        route: [
          { step: 1, action: 'work', targetX: 2, targetZ: -2, duration: 8, description: 'Desmonta componentes', zone: 'z3' },
          { step: 2, action: 'repair', targetX: 2, targetZ: -2, duration: 6, description: 'Repara / mecaniza', zone: 'z3' },
          { step: 3, action: 'carry', targetX: 9, targetZ: -4, duration: 3, description: 'Lleva a pruebas', zone: 'z4' },
          { step: 4, action: 'walk', targetX: 2, targetZ: -2, duration: 3, description: 'Regresa al taller', zone: 'z3' }
        ]
      },
      {
        id: 'w3', name: 'Técnico 3', color: '#2255cc', startX: 9, startZ: -4,
        route: [
          { step: 1, action: 'inspect', targetX: 9, targetZ: -4, duration: 6, description: 'Pruebas finales', zone: 'z4' },
          { step: 2, action: 'work', targetX: 9, targetZ: -4, duration: 3, description: 'Firma reporte', zone: 'z4' },
          { step: 3, action: 'walk', targetX: -4, targetZ: 7, duration: 4, description: 'Recoge repuestos', zone: 'z5' },
          { step: 4, action: 'walk', targetX: 9, targetZ: -4, duration: 4, description: 'Regresa a pruebas', zone: 'z4' }
        ]
      }
    ],
    kpis: { cycleTime: 24, workersCount: 3, zonesCount: 5, efficiency: 71 },
    steps: ['Paso 1: Recepción y diagnóstico del equipo', 'Paso 2: Desmontaje de componentes', 'Paso 3: Reparación y mecanizado', 'Paso 4: Pruebas finales y liberación']
  })
}

// ─── Static files ──────────────────────────────────────────────────────────
app.use('/static/*', serveStatic({ root: './public' }))

// ─── Main page ─────────────────────────────────────────────────────────────
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SimPro3D — Generador de Simulaciones Industriales con IA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.161.0/examples/js/controls/OrbitControls.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">
  <div id="app"></div>
  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
