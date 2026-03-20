import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Zone {
  id: string; name: string; type: string
  x: number; z: number; width: number; depth: number; color: string
}
interface Machine {
  id: string; name: string; type: string
  x: number; z: number; color: string; speed?: number
}
interface WorkerRoute {
  x: number; z: number; action: string; duration: number
}
interface Worker {
  id: string; name: string; role: string
  x: number; z: number; color: string
  route: WorkerRoute[]
}
interface SceneData {
  title: string; description: string
  environment: { width: number; depth: number; height: number; floorColor: string; wallColor: string }
  zones: Zone[]; machines: Machine[]; workers: Worker[]
  kpis: { cycleTime: number; workersCount: number; zonesCount: number; machinesCount: number; efficiency: number; throughput: number }
  steps: string[]; bottlenecks: string[]; improvements: string[]
}

// ─── Scene Templates ──────────────────────────────────────────────────────────
const SCENE_TEMPLATES: Record<string, SceneData> = {
  manufacturing: {
    title: 'Planta de Manufactura — Línea de Producción',
    description: 'Línea de producción automatizada con estaciones de ensamble, control de calidad y despacho.',
    environment: { width: 40, depth: 28, height: 8, floorColor: '#1a1a2e', wallColor: '#0d0d1a' },
    zones: [
      { id: 'z1', name: 'Almacén MP', type: 'storage', x: -14, z: -8, width: 6, depth: 5, color: '#1e40af' },
      { id: 'z2', name: 'Pre-ensamble', type: 'processing', x: -6, z: -5, width: 5, depth: 4, color: '#7c3aed' },
      { id: 'z3', name: 'Ensamble Principal', type: 'assembly', x: 2, z: -4, width: 7, depth: 6, color: '#f97316' },
      { id: 'z4', name: 'Control Calidad', type: 'quality', x: 10, z: -3, width: 5, depth: 5, color: '#16a34a' },
      { id: 'z5', name: 'Packaging', type: 'processing', x: -8, z: 7, width: 5, depth: 4, color: '#ca8a04' },
      { id: 'z6', name: 'Despacho', type: 'exit', x: 6, z: 8, width: 6, depth: 4, color: '#dc2626' },
    ],
    machines: [
      { id: 'm1', name: 'Conveyor A', type: 'conveyor', x: -10, z: -2, color: '#475569' },
      { id: 'm2', name: 'Robot Soldador', type: 'default', x: 2, z: -2, color: '#f97316' },
      { id: 'm3', name: 'Prensa CNC', type: 'default', x: 6, z: -6, color: '#7c3aed' },
      { id: 'm4', name: 'Scanner QC', type: 'default', x: 11, z: -1, color: '#16a34a' },
      { id: 'm5', name: 'Conveyor B', type: 'conveyor', x: 0, z: 5, color: '#475569' },
      { id: 'm6', name: 'Paletizador', type: 'default', x: 7, z: 9, color: '#ca8a04' },
    ],
    workers: [
      {
        id: 'w1', name: 'Operario A', role: 'operator', x: -12, z: -7, color: '#3b82f6',
        route: [
          { x: -12, z: -7, action: 'pick', duration: 3 },
          { x: -6, z: -4, action: 'carry', duration: 4 },
          { x: 2, z: -3, action: 'assemble', duration: 6 },
          { x: 10, z: -2, action: 'inspect', duration: 3 },
          { x: -12, z: -7, action: 'walk', duration: 5 },
        ],
      },
      {
        id: 'w2', name: 'Técnico QC', role: 'quality', x: 11, z: -4, color: '#22c55e',
        route: [
          { x: 11, z: -4, action: 'inspect', duration: 5 },
          { x: 8, z: 6, action: 'walk', duration: 3 },
          { x: -8, z: 7, action: 'carry', duration: 4 },
          { x: 11, z: -4, action: 'walk', duration: 4 },
        ],
      },
      {
        id: 'w3', name: 'Supervisor', role: 'supervisor', x: 0, z: 0, color: '#f59e0b',
        route: [
          { x: 0, z: 0, action: 'idle', duration: 2 },
          { x: -14, z: -8, action: 'walk', duration: 3 },
          { x: 10, z: -3, action: 'walk', duration: 4 },
          { x: 6, z: 8, action: 'walk', duration: 3 },
          { x: 0, z: 0, action: 'idle', duration: 2 },
        ],
      },
    ],
    kpis: { cycleTime: 14, workersCount: 3, zonesCount: 6, machinesCount: 6, efficiency: 86, throughput: 264 },
    steps: ['Recepción MP', 'Pre-ensamble', 'Ensamble principal', 'Control calidad', 'Packaging', 'Despacho'],
    bottlenecks: ['Ensamble principal (cuello de botella)'],
    improvements: ['Añadir segundo robot soldador', 'Optimizar ruta de conveyor B'],
  },

  logistics: {
    title: 'Centro de Distribución — Logística',
    description: 'Hub logístico con zonas de recepción, clasificación y despacho de mercancía.',
    environment: { width: 50, depth: 35, height: 10, floorColor: '#0f172a', wallColor: '#0a0f1e' },
    zones: [
      { id: 'z1', name: 'Recepción', type: 'entry', x: -18, z: -10, width: 7, depth: 5, color: '#0ea5e9' },
      { id: 'z2', name: 'Clasificación A', type: 'processing', x: -8, z: -7, width: 6, depth: 5, color: '#8b5cf6' },
      { id: 'z3', name: 'Almacén Bulk', type: 'storage', x: 2, z: -9, width: 8, depth: 7, color: '#1e40af' },
      { id: 'z4', name: 'Picking', type: 'processing', x: 12, z: -4, width: 6, depth: 6, color: '#f97316' },
      { id: 'z5', name: 'Packing', type: 'processing', x: -6, z: 8, width: 6, depth: 5, color: '#ca8a04' },
      { id: 'z6', name: 'Despacho', type: 'exit', x: 8, z: 10, width: 7, depth: 5, color: '#dc2626' },
    ],
    machines: [
      { id: 'm1', name: 'Montacargas A', type: 'crane', x: -15, z: -8, color: '#f97316' },
      { id: 'm2', name: 'Sorter', type: 'conveyor', x: -5, z: -5, color: '#475569' },
      { id: 'm3', name: 'Conveyor Bulk', type: 'conveyor', x: 3, z: -6, color: '#475569' },
      { id: 'm4', name: 'Pick Robot', type: 'default', x: 12, z: -2, color: '#7c3aed' },
      { id: 'm5', name: 'Flejadora', type: 'default', x: -6, z: 9, color: '#16a34a' },
      { id: 'm6', name: 'Montacargas B', type: 'crane', x: 9, z: 11, color: '#f97316' },
    ],
    workers: [
      {
        id: 'w1', name: 'Op. Recepción', role: 'operator', x: -18, z: -9, color: '#3b82f6',
        route: [
          { x: -18, z: -9, action: 'pick', duration: 4 },
          { x: -8, z: -6, action: 'carry', duration: 5 },
          { x: 2, z: -8, action: 'carry', duration: 4 },
          { x: -18, z: -9, action: 'walk', duration: 6 },
        ],
      },
      {
        id: 'w2', name: 'Op. Picking', role: 'picker', x: 12, z: -3, color: '#f97316',
        route: [
          { x: 12, z: -3, action: 'pick', duration: 3 },
          { x: -6, z: 8, action: 'carry', duration: 6 },
          { x: 8, z: 10, action: 'carry', duration: 3 },
          { x: 12, z: -3, action: 'walk', duration: 5 },
        ],
      },
      {
        id: 'w3', name: 'Jefe Turno', role: 'supervisor', x: 0, z: 0, color: '#f59e0b',
        route: [
          { x: 0, z: 0, action: 'idle', duration: 2 },
          { x: -18, z: -10, action: 'walk', duration: 4 },
          { x: 12, z: -4, action: 'walk', duration: 5 },
          { x: 0, z: 0, action: 'idle', duration: 2 },
        ],
      },
    ],
    kpis: { cycleTime: 18, workersCount: 3, zonesCount: 6, machinesCount: 6, efficiency: 82, throughput: 200 },
    steps: ['Recepción', 'Clasificación', 'Almacenaje', 'Picking', 'Packing', 'Despacho'],
    bottlenecks: ['Zona de picking (alta demanda)'],
    improvements: ['Implementar WMS', 'Añadir pick-to-light'],
  },

  food: {
    title: 'Planta Alimentaria — Procesamiento',
    description: 'Línea de procesamiento de alimentos con zonas HACCP, refrigeración y empaque.',
    environment: { width: 36, depth: 26, height: 7, floorColor: '#0a1628', wallColor: '#060e1a' },
    zones: [
      { id: 'z1', name: 'Recepción MP', type: 'entry', x: -13, z: -8, width: 5, depth: 4, color: '#0ea5e9' },
      { id: 'z2', name: 'Lavado/Desinfección', type: 'processing', x: -5, z: -6, width: 5, depth: 4, color: '#06b6d4' },
      { id: 'z3', name: 'Procesamiento', type: 'processing', x: 3, z: -5, width: 6, depth: 5, color: '#f97316' },
      { id: 'z4', name: 'Cocción', type: 'processing', x: 10, z: -3, width: 5, depth: 5, color: '#dc2626' },
      { id: 'z5', name: 'Refrigeración', type: 'storage', x: -6, z: 7, width: 6, depth: 4, color: '#1d4ed8' },
      { id: 'z6', name: 'Empaque', type: 'exit', x: 5, z: 8, width: 6, depth: 4, color: '#16a34a' },
    ],
    machines: [
      { id: 'm1', name: 'Lavadora Industrial', type: 'default', x: -5, z: -5, color: '#06b6d4' },
      { id: 'm2', name: 'Cortadora', type: 'default', x: 3, z: -3, color: '#f97316' },
      { id: 'm3', name: 'Horno Túnel', type: 'conveyor', x: 10, z: -1, color: '#dc2626' },
      { id: 'm4', name: 'Envasadora', type: 'default', x: 5, z: 9, color: '#16a34a' },
      { id: 'm5', name: 'Etiquetadora', type: 'conveyor', x: 1, z: 9, color: '#7c3aed' },
      { id: 'm6', name: 'Cámara Fría', type: 'default', x: -6, z: 8, color: '#1d4ed8' },
    ],
    workers: [
      {
        id: 'w1', name: 'Op. Procesamiento', role: 'operator', x: 3, z: -4, color: '#3b82f6',
        route: [
          { x: -13, z: -7, action: 'pick', duration: 3 },
          { x: -5, z: -5, action: 'carry', duration: 4 },
          { x: 3, z: -4, action: 'assemble', duration: 5 },
          { x: 10, z: -2, action: 'carry', duration: 4 },
          { x: -13, z: -7, action: 'walk', duration: 5 },
        ],
      },
      {
        id: 'w2', name: 'Controlador HACCP', role: 'quality', x: 0, z: 0, color: '#22c55e',
        route: [
          { x: 0, z: 0, action: 'inspect', duration: 4 },
          { x: 3, z: -4, action: 'inspect', duration: 3 },
          { x: 10, z: -2, action: 'inspect', duration: 3 },
          { x: 5, z: 9, action: 'inspect', duration: 3 },
          { x: 0, z: 0, action: 'idle', duration: 2 },
        ],
      },
      {
        id: 'w3', name: 'Op. Empaque', role: 'operator', x: 5, z: 8, color: '#a78bfa',
        route: [
          { x: 10, z: -1, action: 'pick', duration: 3 },
          { x: -6, z: 7, action: 'carry', duration: 5 },
          { x: 5, z: 8, action: 'assemble', duration: 5 },
          { x: 5, z: 8, action: 'idle', duration: 2 },
        ],
      },
    ],
    kpis: { cycleTime: 20, workersCount: 3, zonesCount: 6, machinesCount: 6, efficiency: 79, throughput: 180 },
    steps: ['Recepción MP', 'Lavado', 'Procesamiento', 'Cocción', 'Refrigeración', 'Empaque'],
    bottlenecks: ['Horno túnel (capacidad limitada)'],
    improvements: ['Ampliar capacidad de cocción', 'Sistema FIFO automatizado'],
  },

  medical: {
    title: 'Planta Farmacéutica — Línea Estéril',
    description: 'Producción de medicamentos con salas blancas, control de calidad GMP y trazabilidad.',
    environment: { width: 38, depth: 28, height: 7, floorColor: '#0d1117', wallColor: '#080c12' },
    zones: [
      { id: 'z1', name: 'Recepción API', type: 'entry', x: -14, z: -9, width: 5, depth: 4, color: '#0ea5e9' },
      { id: 'z2', name: 'Pesaje', type: 'processing', x: -6, z: -7, width: 4, depth: 4, color: '#8b5cf6' },
      { id: 'z3', name: 'Mezclado', type: 'processing', x: 1, z: -6, width: 5, depth: 5, color: '#6366f1' },
      { id: 'z4', name: 'Llenado Aséptico', type: 'assembly', x: 9, z: -4, width: 5, depth: 5, color: '#f97316' },
      { id: 'z5', name: 'Control QA', type: 'quality', x: -6, z: 6, width: 5, depth: 5, color: '#16a34a' },
      { id: 'z6', name: 'Liberación/Despacho', type: 'exit', x: 6, z: 8, width: 6, depth: 4, color: '#22c55e' },
    ],
    machines: [
      { id: 'm1', name: 'Balanza Analítica', type: 'default', x: -6, z: -6, color: '#8b5cf6' },
      { id: 'm2', name: 'Mezclador V', type: 'default', x: 1, z: -5, color: '#6366f1' },
      { id: 'm3', name: 'Llenadora Asép.', type: 'default', x: 9, z: -3, color: '#f97316' },
      { id: 'm4', name: 'Autoclave', type: 'default', x: 14, z: -5, color: '#dc2626' },
      { id: 'm5', name: 'HPLC Analyzer', type: 'default', x: -6, z: 7, color: '#16a34a' },
      { id: 'm6', name: 'Etiquetadora', type: 'conveyor', x: 5, z: 9, color: '#22c55e' },
    ],
    workers: [
      {
        id: 'w1', name: 'Técnico Producción', role: 'operator', x: 1, z: -5, color: '#3b82f6',
        route: [
          { x: -14, z: -8, action: 'pick', duration: 3 },
          { x: -6, z: -6, action: 'carry', duration: 4 },
          { x: 1, z: -5, action: 'assemble', duration: 7 },
          { x: 9, z: -3, action: 'carry', duration: 4 },
          { x: -14, z: -8, action: 'walk', duration: 5 },
        ],
      },
      {
        id: 'w2', name: 'Analista QA', role: 'quality', x: -6, z: 7, color: '#22c55e',
        route: [
          { x: -6, z: 7, action: 'inspect', duration: 6 },
          { x: 1, z: -5, action: 'walk', duration: 4 },
          { x: 9, z: -3, action: 'inspect', duration: 4 },
          { x: -6, z: 7, action: 'walk', duration: 4 },
        ],
      },
      {
        id: 'w3', name: 'Director Planta', role: 'supervisor', x: 0, z: 0, color: '#f59e0b',
        route: [
          { x: 0, z: 0, action: 'idle', duration: 3 },
          { x: -6, z: 7, action: 'walk', duration: 3 },
          { x: 9, z: -3, action: 'walk', duration: 4 },
          { x: 0, z: 0, action: 'idle', duration: 3 },
        ],
      },
    ],
    kpis: { cycleTime: 28, workersCount: 3, zonesCount: 6, machinesCount: 6, efficiency: 73, throughput: 129 },
    steps: ['Recepción API', 'Pesaje', 'Mezclado', 'Llenado', 'Control QA', 'Liberación'],
    bottlenecks: ['Llenado aséptico (limpieza entre lotes)'],
    improvements: ['Sistema de limpieza CIP automático', 'Segundo autoclave'],
  },

  maintenance: {
    title: 'Taller de Mantenimiento Industrial',
    description: 'Centro de diagnóstico, reparación y reacondicionamiento de maquinaria industrial.',
    environment: { width: 36, depth: 26, height: 8, floorColor: '#111827', wallColor: '#0a0f19' },
    zones: [
      { id: 'z1', name: 'Recepción Equipos', type: 'entry', x: -13, z: -8, width: 5, depth: 4, color: '#0ea5e9' },
      { id: 'z2', name: 'Diagnóstico', type: 'processing', x: -5, z: -6, width: 5, depth: 4, color: '#f59e0b' },
      { id: 'z3', name: 'Almacén Repuestos', type: 'storage', x: 3, z: -8, width: 5, depth: 5, color: '#1e40af' },
      { id: 'z4', name: 'Taller Mecánico', type: 'assembly', x: 10, z: -4, width: 6, depth: 6, color: '#f97316' },
      { id: 'z5', name: 'Pruebas', type: 'quality', x: -6, z: 6, width: 5, depth: 4, color: '#16a34a' },
      { id: 'z6', name: 'Entrega', type: 'exit', x: 6, z: 8, width: 5, depth: 4, color: '#22c55e' },
    ],
    machines: [
      { id: 'm1', name: 'Banco Diagnóstico', type: 'default', x: -5, z: -5, color: '#f59e0b' },
      { id: 'm2', name: 'Torno CNC', type: 'default', x: 10, z: -6, color: '#f97316' },
      { id: 'm3', name: 'Soldadora MIG', type: 'default', x: 10, z: -2, color: '#dc2626' },
      { id: 'm4', name: 'Puente Grúa', type: 'crane', x: 0, z: -2, color: '#78716c' },
      { id: 'm5', name: 'Banco Pruebas', type: 'default', x: -6, z: 7, color: '#16a34a' },
      { id: 'm6', name: 'Compresor', type: 'default', x: -13, z: 5, color: '#475569' },
    ],
    workers: [
      {
        id: 'w1', name: 'Técnico Mecánico', role: 'operator', x: 10, z: -4, color: '#f97316',
        route: [
          { x: -13, z: -7, action: 'pick', duration: 3 },
          { x: -5, z: -5, action: 'inspect', duration: 5 },
          { x: 3, z: -7, action: 'pick', duration: 3 },
          { x: 10, z: -4, action: 'repair', duration: 8 },
          { x: -6, z: 6, action: 'carry', duration: 4 },
          { x: -13, z: -7, action: 'walk', duration: 5 },
        ],
      },
      {
        id: 'w2', name: 'Técnico Eléctrico', role: 'operator', x: -5, z: -5, color: '#3b82f6',
        route: [
          { x: -5, z: -5, action: 'inspect', duration: 5 },
          { x: 10, z: -2, action: 'repair', duration: 6 },
          { x: -6, z: 7, action: 'inspect', duration: 4 },
          { x: -5, z: -5, action: 'walk', duration: 4 },
        ],
      },
      {
        id: 'w3', name: 'Jefe Taller', role: 'supervisor', x: 0, z: 0, color: '#f59e0b',
        route: [
          { x: 0, z: 0, action: 'idle', duration: 2 },
          { x: -5, z: -5, action: 'walk', duration: 3 },
          { x: 10, z: -4, action: 'walk', duration: 4 },
          { x: 6, z: 8, action: 'walk', duration: 3 },
          { x: 0, z: 0, action: 'idle', duration: 2 },
        ],
      },
    ],
    kpis: { cycleTime: 28, workersCount: 3, zonesCount: 6, machinesCount: 6, efficiency: 73, throughput: 129 },
    steps: ['Recepción', 'Diagnóstico', 'Adquisición repuestos', 'Reparación', 'Pruebas', 'Entrega'],
    bottlenecks: ['Torno CNC (único recurso)'],
    improvements: ['Inventario crítico de repuestos', 'Segundo torno para piezas simples'],
  },

  construction: {
    title: 'Obra Civil — Gestión de Cuadrillas',
    description: 'Gestión de cuadrillas de construcción con zonas de trabajo, materiales y supervisión.',
    environment: { width: 40, depth: 28, height: 8, floorColor: '#1a1208', wallColor: '#0f0a04' },
    zones: [
      { id: 'z1', name: 'Almacén Material', type: 'storage', x: -14, z: -9, width: 6, depth: 5, color: '#a16207' },
      { id: 'z2', name: 'Estructura', type: 'assembly', x: -4, z: -6, width: 7, depth: 6, color: '#92400e' },
      { id: 'z3', name: 'Instalaciones', type: 'processing', x: 6, z: -5, width: 6, depth: 5, color: '#0ea5e9' },
      { id: 'z4', name: 'Acabados', type: 'processing', x: -6, z: 6, width: 6, depth: 5, color: '#16a34a' },
      { id: 'z5', name: 'Supervisión', type: 'processing', x: 4, z: 7, width: 5, depth: 4, color: '#f59e0b' },
      { id: 'z6', name: 'Salida', type: 'exit', x: 14, z: 2, width: 4, depth: 4, color: '#dc2626' },
    ],
    machines: [
      { id: 'm1', name: 'Concretera', type: 'default', x: -14, z: -7, color: '#a16207' },
      { id: 'm2', name: 'Andamio A', type: 'default', x: -4, z: -4, color: '#78716c' },
      { id: 'm3', name: 'Mezcladora', type: 'default', x: -9, z: 4, color: '#92400e' },
      { id: 'm4', name: 'Compresor', type: 'default', x: 6, z: -3, color: '#475569' },
      { id: 'm5', name: 'Grúa Torre', type: 'crane', x: 2, z: 0, color: '#f59e0b' },
      { id: 'm6', name: 'Cortadora Cerámica', type: 'default', x: -6, z: 7, color: '#16a34a' },
    ],
    workers: [
      {
        id: 'w1', name: 'Maestro Obra', role: 'supervisor', x: 0, z: 0, color: '#f59e0b',
        route: [
          { x: 0, z: 0, action: 'idle', duration: 2 },
          { x: -14, z: -8, action: 'walk', duration: 3 },
          { x: -4, z: -5, action: 'inspect', duration: 3 },
          { x: 6, z: -4, action: 'inspect', duration: 3 },
          { x: 4, z: 7, action: 'walk', duration: 3 },
          { x: 0, z: 0, action: 'idle', duration: 2 },
        ],
      },
      {
        id: 'w2', name: 'Cuadrilla Estructura', role: 'operator', x: -4, z: -5, color: '#f97316',
        route: [
          { x: -14, z: -8, action: 'pick', duration: 3 },
          { x: -4, z: -5, action: 'carry', duration: 4 },
          { x: -4, z: -5, action: 'assemble', duration: 7 },
          { x: -14, z: -8, action: 'walk', duration: 4 },
        ],
      },
      {
        id: 'w3', name: 'Cuadrilla Acabados', role: 'operator', x: -6, z: 6, color: '#22c55e',
        route: [
          { x: -9, z: 4, action: 'pick', duration: 3 },
          { x: -6, z: 6, action: 'carry', duration: 3 },
          { x: -6, z: 6, action: 'assemble', duration: 6 },
          { x: 6, z: -4, action: 'walk', duration: 4 },
          { x: -9, z: 4, action: 'pick', duration: 3 },
        ],
      },
    ],
    kpis: { cycleTime: 24, workersCount: 3, zonesCount: 6, machinesCount: 6, efficiency: 76, throughput: 150 },
    steps: ['Revisión planos', 'Acopio material', 'Estructura', 'Instalaciones', 'Acabados', 'Entrega'],
    bottlenecks: ['Instalaciones (cuello de botella)', 'Espera de materiales'],
    improvements: ['Plan de material semanal', 'Paralelizar instalaciones y acabados'],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildUserPrompt(procedure: string, industry: string): string {
  return `Eres un experto en simulación industrial. Genera una escena 3D JSON para la siguiente descripción de proceso industrial.

Proceso: "${procedure}"
Industria: ${industry}

RESPONDE ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "title": "string",
  "description": "string",
  "environment": {
    "width": number (20-60),
    "depth": number (15-40),
    "height": number (6-12),
    "floorColor": "#hexcolor",
    "wallColor": "#hexcolor"
  },
  "zones": [
    { "id": "z1", "name": "string", "type": "entry|exit|storage|processing|assembly|quality", "x": number, "z": number, "width": number (4-10), "depth": number (3-8), "color": "#hexcolor" }
  ],
  "machines": [
    { "id": "m1", "name": "string", "type": "conveyor|crane|default", "x": number, "z": number, "color": "#hexcolor", "speed": number (0.5-3.0) }
  ],
  "workers": [
    {
      "id": "w1", "name": "string", "role": "operator|supervisor|quality|picker",
      "x": number, "z": number, "color": "#hexcolor",
      "route": [
        { "x": number, "z": number, "action": "walk|carry|pick|assemble|inspect|repair|idle", "duration": number (1-10) }
      ]
    }
  ],
  "kpis": { "cycleTime": number, "workersCount": number, "zonesCount": number, "machinesCount": number, "efficiency": number (60-95), "throughput": number },
  "steps": ["string"],
  "bottlenecks": ["string"],
  "improvements": ["string"]
}

Requisitos:
- Incluir entre 4 y 8 zonas
- Incluir entre 3 y 8 máquinas  
- Incluir entre 2 y 5 trabajadores
- Las coordenadas x y z deben estar dentro de los límites del environment (width/2 y depth/2)
- Cada worker debe tener una ruta con al menos 3 pasos
- Los colores en formato hexadecimal #rrggbb`
}

function detectIndustry(procedure: string, hint?: string): string {
  const text = (procedure + ' ' + (hint || '')).toLowerCase()
  const scores: Record<string, number> = {
    manufacturing: 0, logistics: 0, food: 0, medical: 0, maintenance: 0, construction: 0,
  }
  const keywords: Record<string, string[]> = {
    manufacturing: ['manufactura', 'fabricación', 'ensamble', 'producción', 'robot', 'cnc', 'soldadura', 'prensa', 'torno', 'maquinado', 'planta'],
    logistics: ['logística', 'almacén', 'bodega', 'distribución', 'picking', 'despacho', 'inventario', 'packing', 'flete', 'cadena suministro'],
    food: ['alimentos', 'comida', 'cocción', 'refrigeración', 'haccp', 'inocuidad', 'procesamiento alimentos', 'empaque', 'conserva', 'pasteurización'],
    medical: ['médico', 'farmacéutico', 'medicamento', 'gmp', 'estéril', 'laboratorio', 'clínica', 'hospital', 'llenado aséptico', 'api'],
    maintenance: ['mantenimiento', 'taller', 'reparación', 'diagnóstico', 'repuestos', 'mecánico', 'eléctrico', 'soldadura', 'overhaul'],
    construction: ['construcción', 'obra', 'edificio', 'cuadrilla', 'concreto', 'estructura', 'acabados', 'civil', 'albañil', 'grúa'],
  }
  for (const [ind, words] of Object.entries(keywords)) {
    for (const w of words) {
      if (text.includes(w)) scores[ind] += 1
    }
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

function validateScene(scene: Partial<SceneData>): SceneData {
  const fallback = SCENE_TEMPLATES.manufacturing
  const env = scene.environment || fallback.environment
  return {
    title: scene.title || fallback.title,
    description: scene.description || fallback.description,
    environment: {
      width: env.width || 40,
      depth: env.depth || 28,
      height: env.height || 8,
      floorColor: env.floorColor || '#1a1a2e',
      wallColor: env.wallColor || '#0d0d1a',
    },
    zones: (scene.zones && scene.zones.length >= 3) ? scene.zones : fallback.zones,
    machines: (scene.machines && scene.machines.length >= 2) ? scene.machines : fallback.machines,
    workers: (scene.workers && scene.workers.length >= 1) ? scene.workers : fallback.workers,
    kpis: { ...fallback.kpis, ...(scene.kpis || {}) },
    steps: (scene.steps && scene.steps.length) ? scene.steps : fallback.steps,
    bottlenecks: (scene.bottlenecks && scene.bottlenecks.length) ? scene.bottlenecks : fallback.bottlenecks,
    improvements: (scene.improvements && scene.improvements.length) ? scene.improvements : fallback.improvements,
  }
}

// ─── POST /api/generate ───────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { procedure, industry, projectId, apiKey, floorPlanBase64 } = body

    if (!procedure?.trim()) {
      return NextResponse.json({ error: 'procedure is required' }, { status: 400 })
    }

    const detectedIndustry = industry || detectIndustry(procedure)
    const userApiKey = apiKey || process.env.OPENAI_API_KEY
    const baseURL = process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'

    let scene: SceneData
    let source: 'ai' | 'procedural' = 'ai'

    // ─── Try OpenAI ─────────────────────────────────────────────────────────
    if (userApiKey) {
      try {
        const messages: Array<{ role: string; content: any }> = [
          {
            role: 'system',
            content: 'Eres un experto en simulación industrial 3D. Siempre respondes con JSON puro y válido, sin markdown, sin texto adicional. El JSON debe ser parseable directamente con JSON.parse().',
          },
          {
            role: 'user',
            content: floorPlanBase64
              ? [
                  { type: 'text', text: buildUserPrompt(procedure, detectedIndustry) },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${floorPlanBase64}` } },
                ]
              : buildUserPrompt(procedure, detectedIndustry),
          },
        ]

        const openaiRes = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
          }),
        })

        if (openaiRes.ok) {
          const aiData = await openaiRes.json()
          const content = aiData.choices?.[0]?.message?.content || ''
          const parsed = JSON.parse(content)
          scene = validateScene(parsed)
        } else {
          throw new Error(`OpenAI error: ${openaiRes.status}`)
        }
      } catch (aiErr) {
        console.warn('AI generation failed, using procedural fallback:', aiErr)
        source = 'procedural'
        scene = SCENE_TEMPLATES[detectedIndustry] || SCENE_TEMPLATES.manufacturing
      }
    } else {
      source = 'procedural'
      scene = SCENE_TEMPLATES[detectedIndustry] || SCENE_TEMPLATES.manufacturing
    }

    // ─── Save to Supabase if projectId provided ──────────────────────────────
    let simulationId: string | null = null
    if (projectId) {
      try {
        const simId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        await supabase.createSimulation({
          id: simId,
          project_id: projectId,
          name: scene.title,
          procedure: procedure.slice(0, 1000),
          scene_json: JSON.stringify(scene),
          workers_count: scene.workers.length,
          zones_count: scene.zones.length,
          efficiency: scene.kpis.efficiency,
          cycle_time: scene.kpis.cycleTime,
        })
        simulationId = simId
      } catch (dbErr) {
        console.warn('Failed to save simulation to DB:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      scene,
      simulationId,
      source,
    })
  } catch (err: any) {
    console.error('POST /api/generate', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
