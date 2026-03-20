# NexusForge — Simulación Industrial 3D con IA
## Stack: Next.js 16 + Supabase PostgreSQL + Vercel

---

## 🌐 URLs de Producción

| Entorno | URL |
|---|---|
| **Producción** | https://nexusforge-vercel.vercel.app |
| **Dashboard Vercel** | https://vercel.com/rauldiazespejo-ctrls-projects/nexusforge-vercel |
| **GitHub (rama vercel)** | https://github.com/rauldiazespejo-ctrl/Simulador3D/tree/vercel |

---

## 📋 Estado del proyecto

| Componente | Estado |
|---|---|
| Frontend Three.js SPA | ✅ Live en producción |
| Next.js API Routes (10 endpoints) | ✅ Live en producción |
| Supabase Client tipado | ✅ Listo |
| Vercel Deploy | ✅ **Activo** |
| Supabase DB | ⚠️ Requiere configuración (ver abajo) |

---

## 🗄️ Conectar Supabase (1 vez — 5 minutos)

> Sin Supabase, la app funciona con fallback procedimental (sin persistencia)

### 1 — Crear proyecto Supabase
1. Ve a **https://app.supabase.com** → **New project** → nombre: `nexusforge`
2. Espera ~2 min a que el proyecto esté listo

### 2 — Ejecutar schema SQL
1. Ve a **SQL Editor → New Query**
2. Pega el contenido de [`supabase-schema.sql`](./supabase-schema.sql) y ejecuta

### 3 — Obtener credenciales
Ve a **Settings → API** y copia:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 4 — Actualizar variables en Vercel

**Opción A — Dashboard Vercel:**
1. Ve a https://vercel.com/rauldiazespejo-ctrls-projects/nexusforge-vercel/settings/environment-variables
2. Edita `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Haz un nuevo deploy (Settings → Deployments → Redeploy)

**Opción B — CLI:**
```bash
VTOKEN="tu_vercel_personal_access_token"
VCLI="vercel"

printf "https://xxxx.supabase.co"  | $VCLI env rm NEXT_PUBLIC_SUPABASE_URL production -y --token "$VTOKEN"
printf "https://xxxx.supabase.co"  | $VCLI env add NEXT_PUBLIC_SUPABASE_URL production --token "$VTOKEN" --yes

printf "eyJ..."  | $VCLI env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production -y --token "$VTOKEN"
printf "eyJ..."  | $VCLI env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --token "$VTOKEN" --yes

printf "eyJ..."  | $VCLI env rm SUPABASE_SERVICE_ROLE_KEY production -y --token "$VTOKEN"
printf "eyJ..."  | $VCLI env add SUPABASE_SERVICE_ROLE_KEY production --token "$VTOKEN" --yes

$VCLI deploy --token "$VTOKEN" --prod --yes
```

---

## 🏗️ Arquitectura

```
nexusforge-vercel/
├── app/
│   ├── layout.tsx                        # Meta tags SEO + HTML shell
│   ├── page.tsx                          # Sirve la SPA Three.js (static)
│   └── api/
│       ├── projects/route.ts             # GET + POST /api/projects
│       ├── projects/[id]/route.ts        # PUT + DELETE
│       ├── projects/[id]/simulations/    # GET simulaciones del proyecto
│       ├── simulations/route.ts          # POST /api/simulations
│       ├── simulations/[id]/route.ts     # GET + DELETE
│       ├── simulations/[id]/runs/        # POST runs KPI
│       ├── generate/route.ts             # POST IA + 6 templates fallback
│       └── stats/route.ts               # GET estadísticas globales
├── lib/
│   └── supabase.ts                       # Cliente PostgreSQL tipado
├── public/static/
│   ├── app.js                           # Three.js SPA (~85KB)
│   ├── styles.css                       # Design system NexusForge (~35KB)
│   └── nexusforge-logo.png
├── supabase-schema.sql                  # Schema listo para SQL Editor
├── vercel.json                          # Config framework + region
└── next.config.ts                       # ignoreBuildErrors
```

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/projects | Lista proyectos activos |
| POST | /api/projects | Crear proyecto |
| PUT | /api/projects/:id | Actualizar proyecto |
| DELETE | /api/projects/:id | Archivar proyecto |
| GET | /api/projects/:id/simulations | Simulaciones del proyecto |
| POST | /api/simulations | Guardar simulación |
| GET | /api/simulations/:id | Obtener simulación |
| DELETE | /api/simulations/:id | Eliminar simulación |
| POST | /api/simulations/:id/runs | Guardar run de KPIs |
| POST | /api/generate | **Generar escena 3D con IA** |
| GET | /api/stats | Estadísticas globales |

## 🤖 Generación con IA

`POST /api/generate`:
```json
{
  "procedure": "Descripción del proceso",
  "industry": "manufacturing",
  "projectId": "abc123",
  "apiKey": "sk-..." 
}
```
- **Con API Key** → GPT-4o via proxy Genspark
- **Sin API Key** → 6 templates: manufacturing / logistics / food / medical / maintenance / construction

---

**Última actualización**: 2026-03-20 | **Versión**: 3.0 Vercel+Supabase | **Estado**: ✅ Live
