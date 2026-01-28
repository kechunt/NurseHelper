#!/bin/bash

# Script de backup automático para cron
# Configurar en crontab: 0 2 * * * /path/to/backup-cron.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/backups/backup.log"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "Starting backup process"

# Cargar variables de entorno
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
fi

# Variables de base de datos
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-nurse_helper}"

# Nombre del archivo de backup
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Crear backup
log "Creating backup: $BACKUP_FILE"
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_FILE" 2>> "$LOG_FILE"

if [ $? -eq 0 ]; then
    log "Backup created successfully: $BACKUP_FILE"
    
    # Comprimir
    log "Compressing backup"
    gzip "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        log "Backup compressed: $COMPRESSED_FILE"
        
        # Limpiar backups antiguos (mantener últimos 7 días)
        log "Cleaning up old backups"
        find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
        
        log "Backup process completed successfully"
    else
        log "ERROR: Failed to compress backup"
        exit 1
    fi
else
    log "ERROR: Failed to create backup"
    exit 1
fi
