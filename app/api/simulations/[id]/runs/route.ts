import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { duration, oee, throughput, unitsProduced, failures, kpis } = await req.json()
    const runId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const run = await supabase.createRun({
      id: runId,
      simulation_id: id,
      duration_sec: duration || 0,
      oee: oee || 0,
      throughput: throughput || 0,
      units_produced: unitsProduced || 0,
      failures: failures || 0,
      kpi_json: JSON.stringify(kpis || {}),
    })
    return NextResponse.json({ success: true, runId: run.id })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
