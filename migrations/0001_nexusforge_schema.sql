-- NexusForge — Schema v1.0
-- Industrial 3D Simulation Platform

-- ─── PROJECTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name        TEXT NOT NULL,
  description TEXT,
  industry    TEXT NOT NULL DEFAULT 'manufacturing',
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived','draft')),
  thumbnail   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── SIMULATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulations (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  procedure    TEXT NOT NULL,
  scene_json   TEXT NOT NULL,
  floor_plan   TEXT,
  workers_count INTEGER DEFAULT 0,
  zones_count   INTEGER DEFAULT 0,
  efficiency    REAL DEFAULT 0,
  cycle_time    REAL DEFAULT 0,
  version      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── SIMULATION_RUNS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulation_runs (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  simulation_id TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  duration_sec  REAL,
  oee           REAL,
  throughput    REAL,
  units_produced INTEGER DEFAULT 0,
  failures      INTEGER DEFAULT 0,
  kpi_json      TEXT,
  ran_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_simulations_project ON simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_simulation ON simulation_runs(simulation_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulations_created ON simulations(created_at DESC);
