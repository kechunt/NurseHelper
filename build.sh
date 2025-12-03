#!/bin/bash
# Script de build que funciona desde cualquier ubicación

set -e  # Salir si hay algún error

echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

# Detectar si estamos en la raíz o en frontend
if [ -d "frontend" ]; then
  # Estamos en la raíz del proyecto
  echo "Building from project root..."
  cd frontend
  echo "Changed to frontend directory: $(pwd)"
  npm install
  npm run build
elif [ -f "package.json" ] && [ -f "angular.json" ]; then
  # Estamos en el directorio frontend
  echo "Building from frontend directory..."
  npm install
  npm run build
else
  echo "Error: No se encontró el directorio frontend ni los archivos necesarios"
  echo "Current directory contents:"
  ls -la
  exit 1
fi

