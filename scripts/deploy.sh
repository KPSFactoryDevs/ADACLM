#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ADA Frontend (React/Vite) Auto-Deploy Script (ogni ~10 secondi)
# ═══════════════════════════════════════════════════════════════
# Il cron lo lancia ogni minuto. Internamente fa 6 check
# a intervalli di 10 secondi, ottenendo un deploy quasi istantaneo.
#
# Cron:
#   * * * * * /var/www/html/ADAFRONTEND/scripts/deploy.sh >> /var/www/html/ADAFRONTEND/deploy.log 2>&1
# ═══════════════════════════════════════════════════════════════

set -e

# ── Config ──
APP_DIR="/var/www/html/ADAFRONTEND"
BRANCH="feature/factoring"
LOCK_FILE="${APP_DIR}/deploy.lock"
# NVM paths
export NVM_DIR="/home/ec2-user/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
NODE="$(which node)"
NPM="$(which npm)"

# ── Lock: evita esecuzioni parallele ──
if [ -f "$LOCK_FILE" ]; then
    if [ "$(find "$LOCK_FILE" -mmin +5 2>/dev/null)" ]; then
        rm -f "$LOCK_FILE"
    else
        exit 0
    fi
fi

trap "rm -f $LOCK_FILE" EXIT
touch "$LOCK_FILE"

cd "$APP_DIR"

# ── Funzione deploy ──
do_deploy() {
    local LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

    git fetch origin "$BRANCH" --quiet 2>/dev/null

    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "origin/${BRANCH}")

    if [ "$LOCAL" = "$REMOTE" ]; then
        return 0
    fi

    echo "${LOG_PREFIX} 🚀 Nuovi commit frontend! ${LOCAL:0:7} → ${REMOTE:0:7}"

    # Salva hash di package.json prima del pull
    PREV_PKG=$(md5sum package.json 2>/dev/null | awk '{print $1}')

    git pull origin "$BRANCH" --no-edit 2>&1

    # Installa dipendenze solo se package.json è cambiato
    NEW_PKG=$(md5sum package.json 2>/dev/null | awk '{print $1}')
    if [ "$PREV_PKG" != "$NEW_PKG" ]; then
        echo "${LOG_PREFIX} 📦 package.json cambiato, npm install..."
        $NPM install --production=false 2>&1
    fi

    echo "${LOG_PREFIX} 🔨 Building frontend..."
    $NPM run build 2>&1

    echo "${LOG_PREFIX} ✅ Frontend Deploy OK → $(git rev-parse --short HEAD)"
    echo "───────────────────────────────────────"
}

# ── Loop: 6 check × 10 secondi = 60 secondi ──
for i in 1 2 3 4 5 6; do
    do_deploy
    [ "$i" -lt 6 ] && sleep 10
done
