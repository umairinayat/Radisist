#!/usr/bin/env bash
# Radisist redeploy: git pull + frontend build + webroot sync + Django restart
set -euo pipefail

REPO="/root/fyp"
FRONTEND="$REPO/radisist/radisist-frontend"
WEBROOT="/var/www/radisist"
BACKEND_DIR="$REPO/radisist/radisist_backend"
VENV="$REPO/.venv/bin"
LOG="/var/log/radisist-redeploy.log"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
echo "[$(ts)] === redeploy start ===" | tee -a "$LOG"

# Backup current webroot
BACKUP="/var/www/radisist.bak-$(date +%Y%m%d-%H%M%S)"
cp -a "$WEBROOT" "$BACKUP"
echo "[$(ts)] backed up webroot -> $BACKUP" | tee -a "$LOG"

# Git pull
echo "[$(ts)] git pull..." | tee -a "$LOG"
git -C "$REPO" pull --ff-only 2>&1 | tee -a "$LOG" || git -C "$REPO" pull 2>&1 | tee -a "$LOG"

# Install deps if package-lock changed
echo "[$(ts)] npm ci..." | tee -a "$LOG"
npm --prefix "$FRONTEND" ci 2>&1 | tail -3 | tee -a "$LOG"

# Build frontend
echo "[$(ts)] building frontend..." | tee -a "$LOG"
npm --prefix "$FRONTEND" run build 2>&1 | tail -5 | tee -a "$LOG"

# Sync to webroot
echo "[$(ts)] syncing webroot..." | tee -a "$LOG"
rm -rf "$WEBROOT"/assets
cp -a "$FRONTEND/dist/." "$WEBROOT"/

# Django migrations
echo "[$(ts)] running migrations..." | tee -a "$LOG"
cd "$BACKEND_DIR"
"$VENV/python" manage.py migrate --noinput 2>&1 | tail -5 | tee -a "$LOG"
"$VENV/python" manage.py collectstatic --noinput 2>&1 | tail -2 | tee -a "$LOG" || true

# Restart services
echo "[$(ts)] restarting services..." | tee -a "$LOG"
systemctl restart radisist-django.service
systemctl reload nginx 2>/dev/null || true

# Prune old backups (keep last 10)
ls -1dt /var/www/radisist.bak-* 2>/dev/null | tail -n +11 | xargs -r rm -rf

echo "[$(ts)] === redeploy complete ===" | tee -a "$LOG"
