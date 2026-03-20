# NexusForge — Industrial Simulation Platform v3.0

## Visión general
Plataforma SaaS de simulación industrial 3D impulsada por IA. Los usuarios describen su proceso de trabajo en texto natural y NexusForge genera una simulación 3D interactiva con operarios animados, maquinaria especializada y KPIs en tiempo real.

**Posicionamiento**: Alternativa web a FlexSim ($8,000+/año) y AnyLogic ($5,000+/año) — acceso desde el navegador, sin instalación, con IA generativa.

---

## URLs activas
- **Desarrollo (sandbox)**: https://3000-i6gs555vagaku7bgfe4ur-c81df28e.sandbox.novita.ai
- **GitHub**: https://github.com/rauldiazespejo-ctrl/Simulador3D
- **Producción Cloudflare**: Pendiente configurar API key en pestaña Deploy

---

## Funcionalidades implementadas ✅

### Motor 3D (Three.js r147)
- Zonas de trabajo axis-aligned (BoxGeometry — sin bugs de rotación)
- Workers 3D con torso/cabeza/casco/brazos/piernas animados
  - Walk bob, swing de brazos y piernas al caminar
  - Animaciones de work/inspect/repair en destino
- Máquinas 3D especializadas:
  - Conveyor belt con rodillos
  - Crane con columna, brazo y cable
  - Hydraulic press con columna y brazo
  - Mesa de trabajo con 4 patas
  - Rack/shelf multi-nivel con postes
  - Máquina genérica con panel de control
- Luces: ambient, directional sun, fill, hemisphere
- Sombras PCF soft, tone mapping ACESFilmic
- 5 presets de cámara (ISO, TOP, FRONT, SIDE, FLY) con animación suave
- Fog dinámico basado en dimensiones de la escena

### Motor de Simulación
- Ciclo de animación con delta time real
- Workers siguen rutas multi-paso con velocidades por acción
- KPIs dinámicos: OEE, Throughput, Ciclo, Utilización (oscilación realista)
- Contador de unidades producidas
- Log de actividad en tiempo real (últimas 5 acciones)
- Control de velocidad: 0.5x, 1x, 2x, 4x
- Play/Pause/Reset

### Landing page de ventas
- Badge animado + headline con gradiente
- Estadísticas de impacto (3D, IA+, 9+ industrias)
- Grid de 6 features con íconos
- Tabla comparativa vs FlexSim y AnyLogic
- Planes de precios: Starter $49/mes · Professional $149/mes · Enterprise custom
- 3 testimoniales con estrellas y avatar
- CTA bottom con urgencia

### Backend (Hono + Cloudflare D1)
- `GET /api/projects` — listar proyectos
- `POST /api/projects` — crear proyecto
- `PUT /api/projects/:id` — actualizar proyecto
- `DELETE /api/projects/:id` — archivar proyecto
- `GET /api/projects/:id/simulations` — simulaciones de un proyecto
- `GET /api/simulations/:id` — detalle de simulación
- `DELETE /api/simulations/:id` — eliminar simulación
- `POST /api/generate` — generar escena (IA GPT-5 con fallback procedural)
- `POST /api/simulations/:id/runs` — guardar run de KPIs
- `GET /api/stats` — estadísticas del dashboard

### Plantillas procedurales inteligentes (6)
- manufacturing (Línea de ensamble)
- logistics (Centro de distribución)
- food (Cocina industrial)
- medical (Laboratorio clínico)
- maintenance (Taller industrial)
- construction (Obra civil)

### UI/UX Professional
- Design system v3.0: tema space-dark, paleta naranja NexusForge
- Sin Tailwind CDN — CSS propio 100% optimizado
- Toast notifications animadas
- Modales con backdrop blur
- KPI HUD overlay en viewport
- Camera controls flotantes
- Panel de análisis lateral colapsable
- Historial de proyectos
- Upload de planos con drag & drop
- Export JSON (escena) + Export JSON (informe KPI)
- SEO: meta tags, og:tags, favicon, theme-color

---

## Pendiente / Mejoras recomendadas

- [ ] Desplegar a Cloudflare Pages producción (configurar API key en Deploy tab)
- [ ] Integrar D1 database en producción (actualmente usa SQLite local)
- [ ] Panel de estadísticas del dashboard con Chart.js
- [ ] Export a imagen PNG del viewport
- [ ] Modo comparación A/B de escenarios
- [ ] Integración ERP (SAP, Odoo) vía API
- [ ] Multi-idioma (EN/ES)
- [ ] Autenticación de usuarios (Clerk o Auth0)
- [ ] Compartir simulaciones por link

---

## Stack técnico
| Capa | Tecnología |
|------|-----------|
| Runtime | Cloudflare Workers (edge) |
| Framework | Hono v4 + TypeScript |
| Build | Vite v6 + @hono/vite-cloudflare-pages |
| 3D Engine | Three.js r147 (global build) |
| Base de datos | Cloudflare D1 (SQLite) |
| IA | OpenAI GPT-5 via GenSpark proxy |
| Fuentes | Inter + JetBrains Mono (Google Fonts) |
| Íconos | Font Awesome 6.5 |
| PM2 | Proceso daemon en sandbox |

---

## Guía de uso rápido

1. **Abre la plataforma** → aparece la landing page de ventas
2. **Clic en "Probar gratis ahora"** → entra al editor
3. **Selecciona industria** en el dropdown
4. **Escribe tu proceso** en el textarea o carga un ejemplo
5. **(Opcional)** sube un plano/croquis de tu instalación
6. **Clic "Generar Simulación 3D"** → la IA genera la escena en 1-3 segundos
7. **Explora la escena** con mouse (orbitar, zoom, pan)
8. **Cambia la cámara** con los botones ISO/TOP/FRONT/SIDE/FLY
9. **Inicia la simulación** → los operarios comienzan a moverse
10. **Exporta** el JSON o el informe de KPIs

---

## Despliegue a producción

```bash
# 1. Configurar API key en pestaña Deploy
# 2. Crear base de datos D1
npx wrangler d1 create nexusforge-production
# 3. Copiar database_id a wrangler.jsonc
# 4. Aplicar migraciones
npx wrangler d1 migrations apply nexusforge-production
# 5. Deploy
npm run build
npx wrangler pages deploy dist --project-name nexusforge
# 6. Configurar secretos
npx wrangler pages secret put OPENAI_API_KEY --project-name nexusforge
npx wrangler pages secret put OPENAI_BASE_URL --project-name nexusforge
```

---

**Versión**: 3.0.0 · **Última actualización**: 2026-03-20
