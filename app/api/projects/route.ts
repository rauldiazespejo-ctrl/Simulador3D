import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const projects = await supabase.getProjects()
    return NextResponse.json({ success: true, projects })
  } catch (err: any) {
    console.error('GET /api/projects', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, description, industry } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const project = await supabase.createProject(
      name.trim(),
      description || '',
      industry || 'manufacturing'
    )
    return NextResponse.json({ success: true, project }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/projects', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
