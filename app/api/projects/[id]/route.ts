import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const allowed = ['name', 'description', 'industry', 'status']
    const updates: Record<string, unknown> = {}
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
    }
    const project = await supabase.updateProject(id, updates)
    return NextResponse.json({ success: true, project })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await supabase.archiveProject(id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
