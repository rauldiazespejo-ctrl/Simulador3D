import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/simulations — save a simulation directly (without generating)
export async function POST(req: Request) {
  try {
    const { scene, procedure, projectId, name } = await req.json()

    if (!scene) {
      return NextResponse.json({ error: 'scene is required' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const simId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const sim = await supabase.createSimulation({
      id: simId,
      project_id: projectId,
      name: name || scene.title || 'Simulación',
      procedure: (procedure || '').slice(0, 1000),
      scene_json: JSON.stringify(scene),
      workers_count: scene.workers?.length || 0,
      zones_count: scene.zones?.length || 0,
      efficiency: scene.kpis?.efficiency || 75,
      cycle_time: scene.kpis?.cycleTime || 15,
    })

    return NextResponse.json({ success: true, simulationId: sim.id, simulation: sim }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/simulations', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
