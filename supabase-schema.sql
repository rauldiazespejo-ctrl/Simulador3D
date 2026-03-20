-- ═══════════════════════════════════════════════════════════════════════════
-- SimForge3D — Supabase Schema v1.0
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  industry     TEXT DEFAULT 'manufacturing',
  status       TEXT DEFAULT 'active',
  thumbnail    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Simulations
CREATE TABLE IF NOT EXISTS simulations (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  procedure      TEXT NOT NULL DEFAULT '',
  scene_json     TEXT,
  floor_plan     TEXT,
  workers_count  INTEGER DEFAULT 0,
  zones_count    INTEGER DEFAULT 0,
  efficiency     NUMERIC(5,2) DEFAULT 0,
  cycle_time     NUMERIC(8,2) DEFAULT 0,
  version        INTEGER DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Simulation runs (KPI history)
CREATE TABLE IF NOT EXISTS simulation_runs (
  id              TEXT PRIMARY KEY,
  simulation_id   TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  duration_sec    NUMERIC(10,2) DEFAULT 0,
  oee             NUMERIC(5,2) DEFAULT 0,
  throughput      NUMERIC(10,2) DEFAULT 0,
  units_produced  INTEGER DEFAULT 0,
  failures        INTEGER DEFAULT 0,
  kpi_json        TEXT,
  ran_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated     ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sims_project_id      ON simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_sims_created         ON simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_simulation_id   ON simulation_runs(simulation_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to projects
DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply trigger to simulations
DROP TRIGGER IF EXISTS trg_simulations_updated ON simulations;
CREATE TRIGGER trg_simulations_updated
  BEFORE UPDATE ON simulations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) — disabled for service role key access
-- Enable if using anon key with user authentication
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
