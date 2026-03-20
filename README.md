# NexusForge — Industrial Simulation Platform

## 🚀 Descripción
**NexusForge** es una plataforma profesional de simulación industrial 3D con IA. Genera automáticamente simulaciones 3D con trabajadores animados, máquinas, zonas de trabajo y KPIs en tiempo real a partir de la descripción de un procedimiento de trabajo o la carga de un plano.

## 🌐 URL
- **Live**: [https://nexusforge.pages.dev](https://nexusforge.pages.dev)
- **GitHub**: [https://github.com/rauldiazespejo-ctrl/Simulador3D](https://github.com/rauldiazespejo-ctrl/Simulador3D)

## ✨ Características
- **Generación con IA**: Describe un procedimiento y NexusForge genera la escena 3D completa
- **Análisis de planos**: Sube un croquis/plano y la IA recrea el espacio en 3D
- **Trabajadores animados**: Hasta 4 operarios con rutas, acciones y estados visuales (caminar, trabajar, inspeccionar, reparar)
- **Máquinas 3D**: Tornos, CNC, transportadores, prensas, hornos, grúas y más
- **KPIs en tiempo real**: OEE, Throughput, Tiempo de ciclo, Utilización
- **Panel de análisis**: Pasos del proceso, cuellos de botella, mejoras sugeridas
- **Cámara orbital**: 5 vistas preestablecidas (isométrica, planta, frontal, lateral, aérea)
- **Exportación**: JSON de escena e informe completo de KPIs
- **Gestión de proyectos**: Múltiples proyectos con historial de simulaciones
- **6 industrias**: Manufactura, Logística, Alimentos, Salud, Mantenimiento, Construcción

## 🏗️ Arquitectura
```
webapp/
├── src/index.tsx          # Backend Hono (API REST + serve HTML)
├── public/static/
│   ├── app.js             # Frontend Three.js + UI completa
│   ├── styles.css         # Design system NexusForge
│   └── nexusforge-logo.png
├── migrations/
│   └── 0001_nexusforge_schema.sql   # D1 SQLite schema
├── wrangler.jsonc         # Cloudflare Pages config
└── ecosystem.config.cjs   # PM2 config (desarrollo)
```

## 📊 Data Architecture
- **Cloudflare D1**: projects, simulations, simulation_runs
- **Backend**: Hono (TypeScript) en Cloudflare Pages Functions
- **Frontend**: Three.js r134 + vanilla JS (sin frameworks pesados)
- **IA**: GenSpark LLM Proxy / OpenAI GPT-4o para generación de escenas

## 🔑 APIs
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/generate` | POST | Genera escena 3D desde procedimiento (IA + fallback) |
| `/api/projects` | GET/POST | CRUD proyectos |
| `/api/projects/:id/simulations` | GET | Historial de simulaciones |
| `/api/simulations/:id` | GET/DELETE | Operaciones sobre simulación |
| `/api/simulations/:id/runs` | POST | Guardar ejecución con KPIs |
| `/api/stats` | GET | Estadísticas globales |

## 🚀 Instalación Local
```bash
git clone https://github.com/rauldiazespejo-ctrl/Simulador3D.git
cd Simulador3D
npm install
cp .dev.vars.example .dev.vars   # Edita con tu API key
npx wrangler d1 migrations apply nexusforge-production --local
npm run build
pm2 start ecosystem.config.cjs
```

## 🌐 Deploy a Cloudflare Pages
```bash
npm run build
npx wrangler pages deploy dist --project-name nexusforge
```

## 🔧 Tech Stack
- **Runtime**: Cloudflare Pages + Hono Framework
- **Database**: Cloudflare D1 (SQLite edge)
- **3D Engine**: Three.js r134
- **Styling**: Tailwind CSS (CDN) + Custom CSS
- **Icons**: FontAwesome 6.5
- **IA**: GenSpark LLM / OpenAI GPT-4o

## 📅 Estado
- ✅ Backend Hono + D1 operativo
- ✅ Motor 3D completo (zonas, máquinas, trabajadores animados)
- ✅ Generación con IA (texto + imagen de plano)
- ✅ KPIs en tiempo real
- ✅ Gestión de proyectos
- ✅ 6 plantillas de industria predefinidas
- ⏳ Deploy Cloudflare (requiere API key configurada)

**Última actualización**: 2026-03-20
