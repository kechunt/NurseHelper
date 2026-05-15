# NurseHelper — Recomendaciones de producto y técnica

Recomendaciones basadas en el inventario de `docs/FUNCIONALIDAD_PROYECTO.md` y revisión del código (mayo 2026).  
Prioridad: **Alta** · **Media** · **Baja**.

---

## 1. Resumen ejecutivo

El proyecto tiene un **núcleo operativo sólido** (enfermería + farmacia + administración). Las mayores oportunidades están en:

1. **Cerrar huecos ya visibles en UI** (paciente activo/inactivo, loading global).
2. **Endurecer seguridad por rol** (farmacia y ruta de enfermería).
3. **Depurar backend legacy** sin riesgo para producción.
4. **Ampliar valor clínico** (auditoría, alertas, integraciones) sin reescribir lo existente.

---

## 2. Funciones existentes — recomendaciones de mejora

### 2.1 Autenticación y roles

| Tema | Situación actual | Recomendación | Prioridad |
|------|------------------|---------------|-----------|
| Guard enfermería | `/nurse-dashboard` usa solo `authGuard` | Añadir `nurseGuard` (rol `nurse` + redirección por `defaultDashboardPath`) | **Alta** |
| Rutas farmacia API | Muchos endpoints solo exigen JWT | Añadir `requireAdminOrSupervisorOrPharmacy` en router de farmacia (inventario y solicitudes) | **Alta** |
| Registro | Rol fijado a `nurse` en formulario | Documentar como decisión de producto o permitir invitación solo-admin para otros roles | **Media** |
| Verificación email | Flujo completo en backend | E2E de registro → verify-email con mail de prueba (Mailhog) | **Media** |

### 2.2 Panel Admin / Supervisor

| Tema | Situación actual | Recomendación | Prioridad |
|------|------------------|---------------|-----------|
| Toggle activo paciente | Confirmación + toast “pendiente”; sin API | Implementar `PATCH /patients/:id` con `isActive` o endpoint dedicado; conectar `toggleActive()` | **Alta** |
| Pestañas con emojis | Solo Resumen debe mantener emojis (decisión UX) | Migrar pestañas admin (Usuarios, Áreas, etc.) a `app-bootstrap-icon` como en nav enfermería | **Baja** |
| Duplicación admin/supervisor | ~95% código compartido | Extraer más lógica a servicios compartidos; unificar hosts de modales en supervisor si aporta paridad | **Media** |
| Exportaciones | CSV/Excel en usuarios y pacientes | Unificar en `ExportService` con plantillas i18n y límites de filas | **Baja** |
| Alertas cobertura | Navegación a horarios desde áreas/camas | Toast con enlace directo a enfermera concreta cuando el backend devuelva `nurseUserId` | **Media** |

### 2.3 Panel Enfermería

| Tema | Situación actual | Recomendación | Prioridad |
|------|------------------|---------------|-----------|
| Facades | 17 facades + specs | Mantener patrón; evitar más lógica en `nurse-dashboard.component.ts` | **Media** |
| Modal paciente | Muchos modales/overlays | Mapa de estados en un pequeño store (signals) para depurar aperturas cruzadas | **Media** |
| Handover | Nota por fecha/turno/área | Recordatorio automático si falta nota al cerrar turno (notificación in-app) | **Media** |
| Historial día | Export CSV desde tareas | Añadir PDF resumido por paciente para entrega de turno | **Baja** |
| Offline / red lenta | Reintentos solo en interceptor | Indicador “sin conexión” en header enfermería | **Media** |

### 2.4 Panel Farmacia

| Tema | Situación actual | Recomendación | Prioridad |
|------|------------------|---------------|-----------|
| Cola solicitudes | Estados manuales | SLA visual (tiempo en “pendiente” / “en preparación”) y orden por urgencia | **Media** |
| Inventario | Kardex y stock mínimo | Alertas automáticas a admin cuando stock &lt; mínimo (notificación + email opcional) | **Alta** |
| Asistencia | Página `/asistencia` separada | Integrar resumen en pestaña farmacia o breadcrumb claro | **Baja** |
| Doble entrada solicitudes | Enfermería envía bulk | Idempotencia en backend (`requestKey` por paciente+med+fecha) | **Media** |

### 2.5 Notificaciones y reportes

| Tema | Situación actual | Recomendación | Prioridad |
|------|------------------|---------------|-----------|
| Jobs cobertura | Cron ~120 s | Panel admin “últimas alertas de cobertura” con ack | **Media** |
| Campana in-app | Marcar leída / ack / quitar | Filtro por severidad; sonido opcional solo en `critical` | **Baja** |
| Reportes | 7 días, CSV/Excel | Rango de fechas configurable; programar envío por email (admin) | **Media** |
| Webhooks | Solo admin API | UI mínima en admin para registrar URL de prueba | **Baja** |

### 2.6 Infraestructura y calidad

| Tema | Situación actual | Recomendación | Prioridad |
|------|------------------|---------------|-----------|
| `LoadingService` | Instanciado en `App`, sin uso | Usar en cargas de facades (`withLoading`) o eliminar spinner global | **Alta** |
| `LoadingDirective` | Sin plantillas | Eliminar o documentar en un módulo de ejemplo | **Baja** |
| E2E | Smoke enfermería mockeado | Suite “happy path” admin + farmacia con BD de test en CI | **Alta** |
| Backup | `backup-db.sh` + API opcional | UI admin “Descargar último respaldo” leyendo `bdresp1_latest.sql.gz` | **Media** |
| Variables cron | `backup-cron.sh` usa `DB_NAME`; app usa `DB_DATABASE` | Unificar nombres en `.env.example` | **Media** |

### 2.7 Limpieza de código (depuración)

| Elemento | Acción recomendada | Prioridad |
|----------|-------------------|-----------|
| `backend/src/services/nurse.service.ts` | Eliminar tras verificar que tests no dependan; migrar tests a servicios `nurse-*` | **Media** |
| `backend/src/services/medication.service.ts` | Eliminar o fusionar con controlador | **Media** |
| `public/heroicons`, `src/assets/heroicons` | Ya eliminados; no restaurar | — |
| `GET /health-basic` | Deprecar en docs; redirigir a `/health` | **Baja** |
| `/use-case-diagram` | Mover a docs estáticos o proteger con `adminGuard` si es solo interno | **Baja** |

---

## 3. Funcionalidades nuevas sugeridas

Ordenadas por impacto en un hospital pequeño/mediano usando NurseHelper hoy.

### 3.1 Prioridad alta (valor clínico + seguridad)

1. **Alta/baja de paciente (egreso / reingreso)**  
   Completar toggle activo + historial de quién dio de baja y cuándo. Evita borrados y mantiene trazabilidad.

2. **Auditoría visible para supervisor**  
   Aprovechar `audit.service.ts`: pantalla “Últimos cambios” (usuario, paciente, medicación, cama) filtrable por fecha.

3. **Dashboard de cumplimiento por área**  
   Vista supervisor: % tareas completadas a tiempo, medicación no administrada, solicitudes farmacia pendientes — datos ya existen en reportes.

4. **Alertas de stock farmacia**  
   Notificación a rol farmacia + admin cuando inventario bajo mínimo o caducidad &lt; 30 días.

5. **Guard de rol enfermería + farmacia en API**  
   Cierre de brecha de seguridad sin cambiar UX.

### 3.2 Prioridad media (operación diaria)

6. **Checklist de inicio de turno (enfermera)**  
   En Resumen: “¿Nota de entrega leída?”, “¿Cobertura farmacia confirmada?”, “¿Camas revisadas?” — checkboxes locales o persistidos.

7. **Escaneo / código de cama o paciente**  
   Búsqueda en cabecera por código de barras (QR en cama) para abrir modal paciente más rápido.

8. **Plantillas de tratamiento / medicación**  
   Admin define plantillas por patología; enfermera aplica plantilla al ingresar tratamiento.

9. **Mensajería interna por área**  
   Canal ligero (no chat completo): mensaje supervisor → todas las enfermeras del área, aparece en notificaciones.

10. **Programación de respaldos desde admin**  
    Botón “Crear respaldo ahora” + listado de archivos en `backups/` (lee API backup si `BACKUP_ENABLED=true`).

11. **Modo solo lectura para supervisor en horarios**  
    Flag por usuario: supervisor puede ver pero no editar turnos sin permiso explícito.

### 3.3 Prioridad baja (futuro / diferenciación)

12. **Panel familia / paciente** (portal externo) — solo lectura de horarios de visita y estado “estable” (requiere nuevo rol y mucho legal).

13. **Integración HL7/FHIR** — export de administraciones; solo si hay HIS externo.

14. **Firma digital en administración de medicación** — segundo factor en marcar “administrado”.

15. **PWA offline limitado** — cola de acciones en IndexedDB para tareas sin red (complejidad alta).

16. **Multi-idioma completo** — ya hay `$localize` / i18n parcial; completar mensajes de farmacia y errores API.

17. **Dark mode neumórfico** — tokens CSS ya centralizados en `dashboard-layout.css`; tema alternativo.

---

## 4. Matriz: problema → módulo afectado

| Problema de negocio | Módulos a tocar |
|---------------------|-----------------|
| No sé quién dio de baja un paciente | `patients` API, `PatientsManagementComponent` |
| Farmacia olvida pedidos urgentes | `pharmacy` requests, notificaciones, KPI SLA |
| Enfermera entra al panel equivocado | `auth.guard.ts`, `AuthService.defaultDashboardPath` |
| Pérdida de datos | `backup` API + UI admin, `backup-db.sh` en CI |
| Supervisor no ve cumplimiento global | `reports` + nuevo componente overview supervisor |
| Código difícil de mantener en enfermería | Facades (mantener), reducir `nurse-dashboard.component.ts` |

---

## 5. Roadmap sugerido (3 fases)

### Fase 1 — Estabilización (1–2 sprints)

- [ ] `nurseGuard` + roles en API farmacia  
- [ ] Toggle activo paciente end-to-end  
- [ ] Activar o eliminar `LoadingService`  
- [ ] Eliminar `nurse.service.ts` y `medication.service.ts` legacy (backend)  
- [ ] E2E admin login + una pestaña (usuarios o pacientes)

### Fase 2 — Operación (2–3 sprints)

- [ ] Alertas stock y caducidad farmacia  
- [ ] Auditoría supervisor (lectura)  
- [ ] Dashboard cumplimiento por área  
- [ ] Handover: recordatorio si nota pendiente  
- [ ] UI admin backup (listar / disparar)

### Fase 3 — Valor añadido (backlog)

- [ ] Plantillas medicación/tratamiento  
- [ ] Checklist inicio de turno  
- [ ] Webhooks UI  
- [ ] Reportes con rango de fechas y envío programado  

---

## 6. Qué NO recomendaría ahora

| Idea | Motivo |
|------|--------|
| Reescribir panel enfermería sin facades | Ya modularizado; coste altísimo |
| Microservicios | Monolito actual es adecuado para el tamaño |
| Catálogo UI `/design-catalog` | Ya retirado; usar Storybook solo si el equipo crece |
| Volver a Heroicons | Migración a Bootstrap Icons completada |
| Chat en tiempo real completo | Complejidad; mensajería por notificaciones es suficiente al inicio |

---

## 7. Métricas de éxito (si implementas recomendaciones)

| Métrica | Objetivo orientativo |
|---------|----------------------|
| Tiempo medio solicitud farmacia → entregada | Reducir 20 % con SLA visible |
| Tareas no completadas sin motivo | &lt; 5 % del total diario por área |
| Cobertura E2E rutas críticas | Admin + nurse + pharmacy smoke en CI |
| Incidentes por rol incorrecto en API | 0 tras endurecer guards |
| Líneas en `nurse-dashboard.component.ts` | Estable o ↓ delegando a facades |

---

## 8. Documentos relacionados en el repo

| Archivo | Contenido |
|---------|-----------|
| `docs/FUNCIONALIDAD_PROYECTO.md` | Inventario detallado de lo que existe y se usa |
| `frontend/docs/MEJORAS.md` | Historial de mejoras numeradas (#1–#272+) |
| `frontend/docs/MEJORAS_PENDIENTES.md` | Backlog técnico B-03/B-04/B-05 |
| `frontend/docs/digrama textual.md` | Diagrama textual del dominio (si aplica) |

---

*Este documento es una guía de producto/técnica; no sustituye decisiones clínicas, legales ni de seguridad hospitalaria (HIPAA/LPD según jurisdicción).*
