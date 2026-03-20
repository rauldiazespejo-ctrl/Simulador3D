# NexusForge — Simulación Industrial 3D con IA
## Stack: Next.js 16 + Supabase PostgreSQL + Vercel

---

## 📋 Estado del proyecto

| Componente | Estado |
|---|---|
| Frontend (Three.js SPA) | ✅ Completo |
| API Routes (Next.js) | ✅ Completo |
| Supabase Client | ✅ Completo |
| Vercel Config | ✅ Listo para deploy |
| Supabase DB | ⚠️ Requiere configuración manual |
| Vercel Deploy | ⚠️ Requiere token de Vercel |

---

## 🚀 Guía de despliegue (5 pasos)

### Paso 1 — Crear proyecto Supabase

1. Ve a **https://app.supabase.com** → New Project
2. Nombre: `nexusforge`, región: la más cercana
3. Una vez creado, ve a **SQL Editor → New Query**
4. Pega y ejecuta el contenido de [`supabase-schema.sql`](./supabase-schema.sql)
5. Ve a **Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Paso 2 — Crear proyecto Vercel

1. Ve a **https://vercel.com** → Add New → Project
2. Importa el repo: `rauldiazespejo-ctrl/Simulador3D`
3. **Root Directory**: `nexusforge-vercel` (o la carpeta del proyecto)
4. **Branch**: `vercel`
5. Framework: **Next.js** (auto-detectado)

### Paso 3 — Configurar variables de entorno en Vercel

En el panel de Vercel → Settings → Environment Variables, añade:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...
OPENAI_API_KEY                  = (opcional) tu API key de OpenAI
OPENAI_BASE_URL                 = https://www.genspark.ai/api/llm_proxy/v1
```

### Paso 4 — Desplegar

Vercel desplegará automáticamente al hacer push a la rama `vercel`.

O manualmente con Vercel CLI:
```bash
export VERCEL_TOKEN=tu_token
cd nexusforge-vercel
/home/user/.npm-global/bin/vercel --token $VERCEL_TOKEN --yes
```

### Paso 5 — URL de producción

Tras el deploy, recibirás:
- `https://nexusforge-vercel.vercel.app` (o el nombre que elija Vercel)

---

## 🏗️ Arquitectura

```
nexusforge-vercel/
├── app/
│   ├── layout.tsx              # HTML shell con meta tags
│   ├── page.tsx                # Sirve la SPA (Three.js cargado por scripts)
│   └── api/
│       ├── projects/
│       │   ├── route.ts        # GET /api/projects, POST /api/projects
│       │   └── [id]/
│       │       ├── route.ts    # PUT, DELETE /api/projects/:id
│       │       └── simulations/route.ts  # GET simulaciones del proyecto
│       ├── simulations/
│       │   ├── route.ts        # POST /api/simulations
│       │   └── [id]/
│       │       ├── route.ts    # GET, DELETE /api/simulations/:id
│       │       └── runs/route.ts  # POST runs
│       ├── generate/
│       │   └── route.ts        # POST /api/generate (IA + fallback)
│       └── stats/
│           └── route.ts        # GET /api/stats
├── lib/
│   └── supabase.ts             # Cliente Supabase con tipos TypeScript
├── public/
│   └── static/
│       ├── app.js              # SPA Three.js completa (~85KB)
│       ├── styles.css          # Design system NexusForge (~35KB)
│       └── nexusforge-logo.png
├── supabase-schema.sql         # Schema PostgreSQL para Supabase
└── vercel.json                 # Config de deployment
```

## 🗄️ Modelos de datos (Supabase PostgreSQL)

### projects
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT PK | UUID 16 chars |
| name | TEXT | Nombre del proyecto |
| description | TEXT | Descripción |
| industry | TEXT | manufacturing/logistics/food/medical/maintenance/construction |
| status | TEXT | active/archived |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto (trigger) |

### simulations
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT PK | UUID 16 chars |
| project_id | TEXT FK | Referencia a projects |
| name | TEXT | Título de la simulación |
| procedure | TEXT | Descripción del proceso |
| scene_json | TEXT | JSON de la escena 3D |
| workers_count | INTEGER | Número de trabajadores |
| zones_count | INTEGER | Número de zonas |
| efficiency | NUMERIC | % eficiencia (0-100) |
| cycle_time | NUMERIC | Tiempo de ciclo en segundos |

### simulation_runs
| Campo | Tipo | Descripción |
|---|---|---|
| id | TEXT PK | UUID 16 chars |
| simulation_id | TEXT FK | Referencia a simulations |
| duration_sec | NUMERIC | Duración de la simulación |
| oee | NUMERIC | Overall Equipment Effectiveness |
| throughput | NUMERIC | Unidades por hora |
| units_produced | INTEGER | Unidades producidas |
| failures | INTEGER | Fallos detectados |
| kpi_json | TEXT | KPIs completos en JSON |

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/projects | Lista proyectos activos |
| POST | /api/projects | Crear proyecto |
| PUT | /api/projects/:id | Actualizar proyecto |
| DELETE | /api/projects/:id | Archivar proyecto |
| GET | /api/projects/:id/simulations | Simulaciones del proyecto |
| GET | /api/simulations/:id | Obtener simulación |
| DELETE | /api/simulations/:id | Eliminar simulación |
| POST | /api/simulations/:id/runs | Guardar run de simulación |
| POST | /api/generate | Generar escena 3D con IA |
| GET | /api/stats | Estadísticas globales |

## 🤖 Generación con IA

`POST /api/generate` acepta:
```json
{
  "procedure": "Descripción del proceso industrial",
  "industry": "manufacturing",
  "projectId": "abc123",
  "apiKey": "sk-..." 
}
```

- **Con API Key**: Usa GPT-4o via proxy de Genspark
- **Sin API Key**: Fallback a 6 templates procedimentales (manufacturing, logistics, food, medical, maintenance, construction)

---

## 📝 Última actualización

**Fecha**: 2026-03-20  
**Versión**: 3.0 Vercel+Supabase  
**GitHub**: https://github.com/rauldiazespejo-ctrl/Simulador3D (rama `vercel`)
