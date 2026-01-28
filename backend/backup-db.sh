#!/bin/bash

# Script para hacer respaldo de la base de datos MySQL
# Nombre del respaldo: bdresp1

# Cargar variables de entorno desde .env
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Valores por defecto si no están en .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USERNAME=${DB_USERNAME:-root}
DB_PASSWORD=${DB_PASSWORD:-Loktarogar}
DB_DATABASE=${DB_DATABASE:-nursehelper}

# Nombre del archivo de respaldo
BACKUP_NAME="bdresp1"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_NAME}_${TIMESTAMP}.sql"
BACKUP_DIR="./backups"

# Crear directorio de respaldos si no existe
mkdir -p "$BACKUP_DIR"

# Ruta completa del archivo de respaldo
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "🔄 Iniciando respaldo de la base de datos..."
echo "📊 Base de datos: $DB_DATABASE"
echo "🖥️  Host: $DB_HOST:$DB_PORT"
echo "👤 Usuario: $DB_USERNAME"
echo "💾 Archivo: $FULL_BACKUP_PATH"

# Ejecutar mysqldump (ignorar warnings sobre LIBRARIES)
mysqldump -h "$DB_HOST" \
          -P "$DB_PORT" \
          -u "$DB_USERNAME" \
          -p"$DB_PASSWORD" \
          --single-transaction \
          --routines \
          --triggers \
          --events \
          --skip-lock-tables \
          "$DB_DATABASE" > "$FULL_BACKUP_PATH" 2>/dev/null

# Verificar si el respaldo fue exitoso (verificar que el archivo existe y no está vacío)
if [ -f "$FULL_BACKUP_PATH" ] && [ -s "$FULL_BACKUP_PATH" ]; then
    # Comprimir el respaldo
    gzip "$FULL_BACKUP_PATH"
    COMPRESSED_FILE="${FULL_BACKUP_PATH}.gz"
    
    echo "✅ Respaldo completado exitosamente!"
    echo "📦 Archivo comprimido: $COMPRESSED_FILE"
    echo "📏 Tamaño: $(du -h "$COMPRESSED_FILE" | cut -f1)"
    
    # Crear un enlace simbólico con el nombre solicitado
    cd "$BACKUP_DIR"
    LATEST_BACKUP="${BACKUP_NAME}_latest.sql.gz"
    rm -f "$LATEST_BACKUP"
    ln -s "$(basename "$COMPRESSED_FILE")" "$LATEST_BACKUP"
    echo "🔗 Enlace simbólico creado: ${BACKUP_DIR}/${LATEST_BACKUP}"
else
    echo "❌ Error al crear el respaldo"
    exit 1
fi
