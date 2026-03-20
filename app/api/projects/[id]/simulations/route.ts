import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const simulations = await supabase.getProjectSimulations(id)
    return NextResponse.json({ success: true, simulations })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
