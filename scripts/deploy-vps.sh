#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Despliegue de la landing en la VPS (mismo patrón que LowFrost: se compila en
# esta máquina y en el servidor solo corre `node server.js`; con 1 núcleo y la
# swap al límite, compilar allá no es viable).
#
#   bash scripts/deploy-vps.sh
#
# Variables opcionales:
#   VPS=root@2.25.185.242   LLAVE=~/.ssh/da_landing_vps
#   SITE_URL=https://laviejaescuelabar.com.ar
#
# Los NEXT_PUBLIC_* se fijan al compilar (van dentro del JS del navegador).
# Las variables del servidor (sucursales, secretos) viven en la VPS, en
# /etc/landinglve/app.env, y NO pasan por acá.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

VPS="${VPS:-root@2.25.185.242}"
LLAVE="${LLAVE:-$HOME/.ssh/da_landing_vps}"
SITE_URL="${SITE_URL:-https://laviejaescuelabar.com.ar}"
SSH=(ssh -i "$LLAVE" -o BatchMode=yes "$VPS")
VERSION="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Hay cambios sin commitear: commiteá antes de desplegar." >&2
  exit 1
fi

# Se compila en un contenedor Linux con el mismo Node mayor que la VPS: el
# paquete standalone lleva binarios nativos (sharp, para las imágenes) y uno
# armado en Windows o macOS no arranca en el servidor. Se parte del commit
# (git archive), así no viaja ningún .env local ni nada sin commitear.
echo "== Compilando $VERSION en Linux (SITE_URL=$SITE_URL)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git archive HEAD | tar -x -C "$TMP"
TMP_DOCKER="$(cd "$TMP" && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm -v "$TMP_DOCKER:/app" -w /app \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e NEXT_PUBLIC_SITE_URL="$SITE_URL" \
  -e NEXT_PUBLIC_INSTAGRAM_URL="${NEXT_PUBLIC_INSTAGRAM_URL:-https://www.instagram.com/laviejaescuelatuc/}" \
  -e NEXT_PUBLIC_CARTA_URL="${NEXT_PUBLIC_CARTA_URL:-}" \
  -e NEXT_PUBLIC_MEMBRESIAS_URL="${NEXT_PUBLIC_MEMBRESIAS_URL:-}" \
  node:22-bookworm-slim bash -c '
    set -e
    # Misma versión de npm que generó package-lock.json (con npm 10 el lock
    # armado en Windows no cierra por las dependencias opcionales de Linux).
    npx --yes npm@11.6.2 ci --no-audit --no-fund --loglevel=error
    npx next build
    PAQ=.next/standalone
    cp -r public "$PAQ/"
    mkdir -p "$PAQ/.next"
    cp -r .next/static "$PAQ/.next/"
    find "$PAQ" -maxdepth 1 -name ".env*" -delete
    tar -czf /app/paquete.tgz -C "$PAQ" .
    # Lo que crea el contenedor queda con dueño root: se borra desde adentro.
    rm -rf node_modules .next
  '
mv "$TMP/paquete.tgz" "/tmp/landinglve-$VERSION.tgz"

echo "== Subiendo"
scp -i "$LLAVE" -o BatchMode=yes "/tmp/landinglve-$VERSION.tgz" "$VPS:/tmp/"
"${SSH[@]}" "bash -s" <<REMOTO
set -euo pipefail
R=/home/landinglve/releases/$VERSION
mkdir -p "\$R"
tar -xzf /tmp/landinglve-$VERSION.tgz -C "\$R"
mkdir -p "\$R/.next/cache"
chown -R landinglve:landinglve /home/landinglve/releases
ln -sfn "\$R" /home/landinglve/app
systemctl restart landinglve
rm -f /tmp/landinglve-$VERSION.tgz
# Se quedan las últimas 3 versiones para volver atrás con un ln -sfn.
ls -1dt /home/landinglve/releases/* | tail -n +4 | xargs -r rm -rf
sleep 3
curl -fsS -o /dev/null -w "landing en 127.0.0.1:3120 -> %{http_code}\n" http://127.0.0.1:3120/
REMOTO
rm -f "/tmp/landinglve-$VERSION.tgz"
echo "== Listo: $VERSION"
