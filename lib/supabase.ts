import { createClient } from '@supabase/supabase-js'

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          industry: string
          status: string
          thumbnail: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      simulations: {
        Row: {
          id: string
          project_id: string
          name: string
          procedure: string
          scene_json: string | null
          floor_plan: string | null
          workers_count: number
          zones_count: number
          efficiency: number
          cycle_time: number
          version: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['simulations']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['simulations']['Insert']>
      }
      simulation_runs: {
        Row: {
          id: string
          simulation_id: string
          duration_sec: number
          oee: number
          throughput: number
          units_produced: number
          failures: number
          kpi_json: string | null
          ran_at: string
        }
        Insert: Omit<Database['public']['Tables']['simulation_runs']['Row'], 'ran_at'>
        Update: Partial<Database['public']['Tables']['simulation_runs']['Insert']>
      }
    }
  }
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, key)
}

export const supabase = {
  // Projects
  async getProjects() {
    const db = getSupabaseClient()
    const { data, error } = await db
      .from('projects')
      .select(`
        *,
        simulations(count)
      `)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data || []).map((p: any) => ({
      ...p,
      simulations_count: p.simulations?.[0]?.count ?? 0,
    }))
  },

  async createProject(name: string, description: string, industry: string) {
    const db = getSupabaseClient()
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const { data, error } = await db
      .from('projects')
      .insert({ id, name, description, industry, status: 'active' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateProject(id: string, updates: Record<string, unknown>) {
    const db = getSupabaseClient()
    const { data, error } = await db
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async archiveProject(id: string) {
    const db = getSupabaseClient()
    const { error } = await db
      .from('projects')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  // Simulations
  async getProjectSimulations(projectId: string) {
    const db = getSupabaseClient()
    const { data, error } = await db
      .from('simulations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return data || []
  },

  async getSimulation(id: string) {
    const db = getSupabaseClient()
    const { data, error } = await db
      .from('simulations')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createSimulation(fields: {
    id: string; project_id: string; name: string; procedure: string
    scene_json: string; workers_count: number; zones_count: number
    efficiency: number; cycle_time: number
  }) {
    const db = getSupabaseClient()
    const { data, error } = await db
      .from('simulations')
      .insert({ ...fields, version: 1 })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteSimulation(id: string) {
    const db = getSupabaseClient()
    const { error } = await db.from('simulations').delete().eq('id', id)
    if (error) throw error
  },

  // Runs
  async createRun(fields: {
    id: string; simulation_id: string; duration_sec: number
    oee: number; throughput: number; units_produced: number
    failures: number; kpi_json: string
  }) {
    const db = getSupabaseClient()
    const { data, error } = await db
      .from('simulation_runs')
      .insert(fields)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Stats
  async getStats() {
    const db = getSupabaseClient()
    const [{ count: pCount }, { count: sCount }, runs] = await Promise.all([
      db.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('simulations').select('*', { count: 'exact', head: true }),
      db.from('simulation_runs').select('oee, throughput'),
    ])
    const runsData = runs.data || []
    const avgOee = runsData.length
      ? runsData.reduce((s: number, r: any) => s + (r.oee || 0), 0) / runsData.length
      : 0
    const avgThroughput = runsData.length
      ? runsData.reduce((s: number, r: any) => s + (r.throughput || 0), 0) / runsData.length
      : 0
    return {
      projects: pCount ?? 0,
      simulations: sCount ?? 0,
      runs: runsData.length,
      avgOee: Math.round(avgOee * 10) / 10,
      avgThroughput: Math.round(avgThroughput),
    }
  },
}
