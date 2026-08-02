#!/bin/bash

echo "🚀 Iniciando Frontend de NurseHelper..."
echo ""

# Limpiar caché de Angular
echo "🧹 Limpiando caché..."
rm -rf .angular/cache

# Iniciar servidor
echo "▶️  Iniciando servidor de desarrollo..."
npm start
