#!/usr/bin/env bash
# Radisist backup: webroot + Django DB + media
set -euo pipefail

REPO="/root/fyp"
BACKEND_DIR="$REPO/radisist/radisist_backend"
WEBROOT="/var/www/radisist"
DEST="/var/backups/radisist"
KEEP=14

mkdir -p "$DEST"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$DEST/radisist-$TS.tar.gz"

# SQLite backup via Django (safe, handles WAL)
DB_BACKUP="$DEST/db-$TS.sqlite3"
cd "$BACKEND_DIR"
"$REPO/.venv/bin/python" -c "
import sqlite3, sys
src = '$BACKEND_DIR/db.sqlite3'
dst = '$DB_BACKUP'
con = sqlite3.connect(src)
con.backup(sqlite3.connect(dst))
con.close()
print('db backed up ->', dst)
" 2>&1

# Tar everything
tar -czf "$OUT" \
  -C / "$DB_BACKUP" \
  -C / "$WEBROOT" \
  -C / "$BACKEND_DIR" media 2>/dev/null

rm -f "$DB_BACKUP"
echo "backup created: $OUT ($(du -h "$OUT" | cut -f1))"

# Prune
ls -1t "$DEST"/radisist-*.tar.gz 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "kept last $KEEP backups"
