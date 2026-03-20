#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# NexusForge — Deploy a Vercel
# Ejecutar: bash deploy-vercel.sh TU_VERCEL_TOKEN
# ═══════════════════════════════════════════════════════════════════

set -e

VERCEL_TOKEN=${1:-$VERCEL_TOKEN}

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Error: Se requiere un token de Vercel"
  echo "   Uso: bash deploy-vercel.sh TU_TOKEN"
  echo ""
  echo "   Para obtener tu token:"
  echo "   1. Ve a https://vercel.com/account/tokens"
  echo "   2. Crea un nuevo token"
  echo "   3. Cópiar y pegar aquí"
  exit 1
fi

VERCEL_BIN="/home/user/.npm-global/bin/vercel"

echo "🚀 Desplegando NexusForge a Vercel..."
echo ""

# Deploy con las variables de entorno requeridas
$VERCEL_BIN deploy \
  --token "$VERCEL_TOKEN" \
  --yes \
  --prod \
  2>&1

echo ""
echo "✅ Deploy completado!"
echo "   Tu app está en: https://nexusforge-vercel.vercel.app"
