#!/bin/bash

# Script para iniciar frontend y backend con manejo de puertos
# Uso: ./scripts/start-dev.sh

set -e

echo "🚀 Iniciando NurseHelper (Frontend + Backend)"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para liberar un puerto
free_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}⚠️  Puerto $port está en uso. Liberando...${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        
        # Verificar que se liberó
        if lsof -ti:$port >/dev/null 2>&1; then
            echo -e "${RED}❌ No se pudo liberar el puerto $port${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Puerto $port liberado${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ Puerto $port está libre${NC}"
        return 0
    fi
}

# Liberar puertos si están en uso
echo -e "${BLUE}🔍 Verificando puertos...${NC}"
free_port 3000
free_port 4200
echo ""

# Verificar que las dependencias estén instaladas
echo -e "${BLUE}🔍 Verificando dependencias...${NC}"
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Instalando dependencias del backend...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Instalando dependencias del frontend...${NC}"
    cd frontend && npm install && cd ..
fi
echo ""

# Ejecutar migraciones si es necesario
echo -e "${BLUE}🔄 Verificando migraciones pendientes...${NC}"
cd backend
if npm run migration:run 2>&1 | grep -q "No migrations"; then
    echo -e "${GREEN}✅ No hay migraciones pendientes${NC}"
else
    echo -e "${GREEN}✅ Migraciones ejecutadas${NC}"
fi
cd ..
echo ""

# Iniciar ambos servicios con concurrently
echo -e "${GREEN}🚀 Iniciando servicios...${NC}"
echo ""

npm run dev
