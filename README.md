# SimPro3D v4.0 — Generador de Simulaciones Industriales con IA

Webapp que convierte la descripción de cualquier procedimiento o metodología de trabajo en una **simulación 3D animada interactiva** generada automáticamente con IA.

## 🌐 Demo en vivo
> Desplegado en Cloudflare Pages

## ✨ Funcionalidades

### Entrada inteligente
- 📝 Descripción libre del procedimiento de trabajo
- 🗺️ Carga de plano o croquis (PNG/JPG/PDF) — la IA lo analiza para recrear el escenario
- 🤖 Generación automática con GPT-5 (o modo demo sin API key)

### Motor 3D Three.js interactivo
- Fábrica completa con zonas, máquinas y operarios
- Humanoides articulados con 6 animaciones: walk, work, carry, inspect, repair, idle
- Cámara orbital libre + 3 vistas preestablecidas (Planta / Isométrica / Frontal)
- Pausar / Reiniciar la simulación

### Panel KPI en tiempo real
- OEE · Throughput · Utilización por operario
- Tiempo de ciclo · Log de eventos

### 5 escenas demo inteligentes
Detecta el tipo de procedimiento automáticamente:
- 🏭 Ensamblaje industrial
- 📦 Logística / Centro de distribución
- 🍕 Cocina industrial
- 🏥 Laboratorio clínico
- ⚙️ Taller de mantenimiento

### Exportación
- JSON de la configuración de escena

## 🛠️ Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Backend | Hono + Cloudflare Workers |
| Frontend | Vanilla JS + Three.js r161 + Tailwind CSS |
| IA | OpenAI GPT-5 (compatible GenSpark) |
| Deploy | Cloudflare Pages |
| Build | Vite + @hono/vite-build |

## 🚀 Desarrollo local

### Requisitos
- Node.js 18+
- npm

### Instalación
```bash
git clone https://github.com/rauldiazespejo-ctrl/Simulador3D.git
cd Simulador3D
npm install
```

### Configurar API Key (opcional para IA completa)
```bash
cp .dev.vars.example .dev.vars
# Edita .dev.vars con tu API key de GenSpark
```

`.dev.vars.example`:
```
OPENAI_API_KEY=tu-api-key-aqui
OPENAI_BASE_URL=https://www.genspark.ai/api/llm_proxy/v1
```

### Ejecutar en desarrollo
```bash
npm run build
npm run dev:sandbox
# Abre http://localhost:3000
```

## 📁 Estructura del proyecto

```
webapp/
├── src/
│   └── index.tsx          # Backend Hono (API + SSR)
├── public/
│   └── static/
│       ├── app.js         # Motor 3D Three.js + UI
│       └── styles.css     # Estilos profesionales
├── wrangler.jsonc          # Configuración Cloudflare
├── vite.config.ts          # Build config
├── ecosystem.config.cjs    # PM2 config
└── package.json
```

## 🎮 Uso

1. Describe el procedimiento de trabajo en el área de texto
2. (Opcional) Sube un plano o croquis
3. Haz clic en "Generar Simulación con IA"
4. Explora la simulación 3D con los controles de cámara
5. Usa "Refinar" para modificar la escena con instrucciones en lenguaje natural

## 📄 Licencia
MIT
