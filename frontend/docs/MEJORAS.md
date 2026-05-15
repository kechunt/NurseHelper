# Registro de mejoras (NurseHelper)

Este documento lista las **mejoras numeradas** planificadas y el estado de cada una. **Tras aplicar una mejora**, se actualiza aquí la fecha, el resumen y los archivos tocados para no tener que releer todo el proyecto en cada sesión.

- **Backlog y opcionales** (sin número hasta promoverse): [`MEJORAS_PENDIENTES.md`](./MEJORAS_PENDIENTES.md).
- **Orden de lectura / plan** de lo ya hecho y del flujo de trabajo: sección [Orden del plan y del historial](#orden-del-plan-y-del-historial) más abajo.

---

## Leyenda

| Estado | Significado |
|--------|-------------|
| Pendiente | No iniciada |
| En curso | Trabajo a medias |
| Parcial | Parte aplicada; se puede continuar en el mismo número |
| Hecha | Aplicada en el repo |

---

## Lista maestra

| # | Mejora | Estado | Notas / archivos |
|---|--------|--------|------------------|
| 1 | Dejar de versionar caché de Angular (`.angular`, `.tsbuildinfo` en `frontend/`) | Hecha | Ver sección “Historial” abajo |
| 2 | Unificar logs del backend: `console.*` → `logger` (Winston) donde aplique | Hecha | Runtime API; seeds/migrations/tests siguen con `console` (opcional unificar después) |
| 3 | Catálogo UI `/design-catalog` (histórico; retirado del repo) | Retirado | Antes: `designCatalogGuard` + ruta en `app.routes.ts` (2026-05 se eliminó catálogo, guard y E2E). |
| 4 | Modularizar `nurse-dashboard` (partir TS/HTML por dominio o vistas) | Hecha | Fases 1–33 + **cierre 2026-05-04**: cabecera `nurse-dashboard-header-search/`, nav `nurse-dashboard-main-nav/`, vistas en secciones (`nurse-summary-section`, tareas, farmacia, camas, pacientes), `nurse-patient-modal-shell/`, `nurse-dashboard-overlays-stack/`, limpieza CSS del padre. *Objeto VM del stack:* ver **#74** / backlog **B-01**. |
| 5 | Reducir tamaño / responsabilidades de `nurses.controller.ts` (servicios) | Hecha | Servicios extraídos + **acceso unificado**: `recordNurseAdministration` y `fetchNursePatientAdministrationHistoryFormatted` usan `assertNurseCanAccessPatient` (área/cama o asignación directa). Tests: `nurse-patient-access.service.test.ts`. |
| 6 | Documentar `backend/frontend/package.json` (stub Vercel) en un solo sitio | Hecha | `backend/README.md` |
| 7 | Ampliar tests (frontend crítico + servicios backend tras refactors) | Hecha | Ver historial; `npm test` (frontend), `npm run test:unit` (backend); specs enfermería nav/búsqueda/resumen/handover/tareas/farmacia/camas/lista pacientes/overlays: **#69**–**#73** |
| 8 | Helper + tests: conteo dosis lista `medications` en panel enfermería | Hecha | `nurse-dashboard-medication-doses.helpers.ts` + `.spec.ts`; `nurse-dashboard.component.ts` delega KPI lista, filtro pacientes y callback de tabla |
| 9 | Helpers + tests: KPI atención farmacia / tareas próxima hora | Hecha | `nurse-dashboard-attention-kpis.helpers.ts` + `.spec.ts`; getters `attentionPharmacyNotRequestedCount` y `attentionTasksNextHourCount` delegan |
| 10 | Helpers + tests: fecha local ISO, agregados KPI lista pacientes | Hecha | `nurse-dashboard-local-date.helpers.ts`, `nurse-dashboard-patient-kpis.helpers.ts` + specs; `tasksDayHistoryDate` y `applyPrimaryDashboardData` delegan |
| 11 | Helpers + tests: validación ISO historial del día, suma dosis farmacia secundaria | Hecha | `isValidIsoYmdDateString` en `nurse-dashboard-local-date.helpers.ts`; `sumTotalDosesFromPharmacyMedications` en `nurse-dashboard-pharmacy-totals.helpers.ts` + spec; `loadTasksDayHistory` y `loadSecondaryData` delegan |
| 12 | Helper + tests: filtros tareas agrupadas por hora (`applyTasksFilters`) | Hecha | `computeFilteredNurseTasksGroupedByHour` en `nurse-dashboard-tasks-filters.helpers.ts` + spec; `nurse-dashboard.component.ts` delega |
| 13 | Helper + tests: conteo total tareas pendientes en grupos por hora | Hecha | `countPendingTasksInHourGroups` en `nurse-dashboard-attention-kpis.helpers.ts` + spec; `loadSecondaryData` delega `pendingTasksCount` |
| 14 | Helper + tests: CSV historial del día (mapeo filas + nombre archivo) | Hecha | `mapNurseDayHistoryItemsToCsvRows`, `tasksDayHistoryCsvFilename` en `nurse-dashboard-day-history-csv.helpers.ts` + spec; `exportTasksDayHistoryCsv` delega |
| 15 | Helper + tests: mensaje de error HTTP reutilizable en panel enfermería | Hecha | `readNurseDashboardHttpErrorMessage` en `nurse-dashboard-http-error.helpers.ts` + spec; `nurse-dashboard.component.ts` unifica extracción `error.error.message` / anidados / `message` |
| 16 | Reutilizar ISO fecha en nota de entrega + tests preview descripción tarea | Hecha | `reloadHandoverForDate` usa `isValidIsoYmdDateString`; nuevo `nurse-pending-task-description.helpers.spec.ts` |
| 17 | Helpers + tests: conteo y «seleccionar todos» solicitudes farmacia | Hecha | `countPharmacyMedicationsRequested`, `setAllPharmacyMedicationsRequested` en `nurse-dashboard-pharmacy-totals.helpers.ts` + spec; `nurse-pharmacy-section` y `nurse-pharmacy-quick-modal` delegan |
| 18 | Tests helper: filtro de pacientes del dashboard | Hecha | `nurse-dashboard-patients-filter.helpers.spec.ts` cubre búsqueda (nombre/id/cama) y filtros (`medications`, `tasks`, `critical`) |
| 19 | Tests helper: parseo de observaciones de paciente | Hecha | `nurse-patient-observations.helpers.spec.ts` cubre líneas vacías, eliminación de prefijo `[timestamp]` y preservación de texto libre |
| 20 | Helper compartido: búsqueda de pacientes en dashboard | Hecha | `patientMatchesDashboardSearchTerm` y `filterPatientsByDashboardSearchTerm`; `nurse-dashboard.component.ts` y `nurse-dashboard-patients-filter.helpers.ts` reutilizan la misma regla |
| 21 | Helper + tests: selección de match único en búsqueda paciente | Hecha | `findSinglePatientByDashboardSearchTerm` (search helper) y uso en `onHeaderPatientSearch` |
| 22 | Tests helper: tratamientos del día (orden/estado/tipo) | Hecha | `nurse-treatments-today.helpers.spec.ts` cubre `sortTreatmentsTodaySlots`, `treatmentSlotPending`, `treatmentSlotStatusLabel`, `treatmentTypeLabel` |
| 23 | Tests helper: historial de paciente (filtros, fechas, textos) | Hecha | `nurse-patient-history.helpers.spec.ts` cubre `parseHistoryRecordDate`, `filterTreatmentHistoryByPeriodAndOutcome`, `sortTreatmentHistoryDescending`, `historyRecordStatusLabel`, `historyNotesBlockVisible`, `historyNotesPreview` |
| 24 | Tests helpers: slots modal horarios + medicación hoy (ficha paciente) | Hecha | `nurse-dashboard-schedule-slots.helpers.spec.ts` (`buildScheduleSlotsViewPayload`); `nurse-patient-medication-helpers.spec.ts` (`sortMedicationsTodaySlots`, `medicationSlotPending`, `medicationSlotStatusLabel`) |
| 25 | Tests: mapeo pacientes/camas + type guard vistas del nav | Hecha | `nurse-dashboard-patient-mapping.spec.ts` (`parseConditions`, `mapBedsWithPatientForNurseDashboard`, `mapPatientDetailsToPatients`); `nurse-dashboard.types.spec.ts` (`isNurseDashboardMainView`) |
| 26 | Tests: ruta post-login por rol + validadores capacidad pacientes | Hecha | `auth.service.spec.ts` (`defaultDashboardPath`); `validators.spec.ts` (`validateMaxPatients`, `validateCapacityReduction`) |
| 27 | Tests: guards de autenticación y por rol (rutas protegidas) | Hecha | `auth.guard.spec.ts`: `authGuard`, `adminGuard`, `supervisorGuard`, `pharmacyGuard` con `TestBed.runInInjectionContext` y mocks de `AuthService` / `Router` |
| 28 | Tests backend: caducidad inventario + fecha/hora local enfermería | Hecha | `inventory-expiry.util.test.ts` (`classifyMedicationExpiry`, `daysToExpiry`, reloj Jest UTC); `nurse-local-datetime.util.test.ts` (`parseLocalDateTimeParts`) |
| 29 | Tests backend: respuestas HTTP (`response.helper`) + turno actual enfermería | Hecha | `response.helper.test.ts` (`parseId`, `parsePagination`, `sendPaginatedResponse`, `sendErrorResponse`); `nurse-shift-context.service.test.ts` (`pickCurrentShiftForNurse`, reloj Jest) |
| 30 | Tests backend: errores de controlador (`handleControllerError`) + utilidades `sanitizer` | Hecha | `response.helper.test.ts` (`handleControllerError`, mock `logApiError`); `sanitizer.test.ts` (`sanitizeString`/`Object`/`Number`/`Id`/`Email`/`Phone`/`sanitizeMiddleware`, mock `isomorphic-dompurify` para Jest) |
| 31 | Tests backend: errores tipados (`errors`) + middleware `error-handler` + paginación | Hecha | `errors.test.ts` (`AppError` y subclases); `error-handler.test.ts` (`errorHandler`, `asyncHandler`, `sendError`, mocks `logger`/`logApiError`); `pagination.helper.test.ts` (`calculatePaginationInfo`, `applyPagination`) |
| 32 | Tests backend: JWT (`generateToken`/`verifyToken`) + paginación por cursor | Hecha | `jwt.util.test.ts` (mock `jsonwebtoken`, `JWT_SECRET` / `JWT_EXPIRES_IN`); `pagination.helper.test.ts` (`CursorPaginationHelper.paginateWithCursor`, cursor inválido, límite acotado) |
| 33 | Tests backend: carga de entorno (`loadEnv`) + `MigrationHelper` (listado / validación) | Hecha | `migration-helper.test.ts`: mock compartido de `fs`/`dotenv`/`logger` — `loadEnv` (prioridad `.env.local`, fallback, `ENV_LOADED`); `getMigrationInfo` / `validateMigrations` (orden, duplicados, archivo ausente) |
| 34 | Tests backend: middleware de métricas (`metricsMiddleware`) | Hecha | `metrics.middleware.test.ts`: mock `healthController` / `logger`; evento `finish` (éxito vs error HTTP), petición lenta `>1s` en rutas `/api/*` |
| 35 | Tests backend: middleware de autenticación y roles | Hecha | `auth-role.middleware.test.ts`: `authMiddleware` (BD no init, sin token, token inválido, usuario inexistente, OK); `requireRole` / `requireAdmin` / `requireAdminOrSupervisor`; `requireAdminOrSupervisorOrNurseInArea` (admin, id inválido, 404 cama, sin área, otra área, OK enfermera, BD no init) |
| 36 | Tests backend: paginación HTTP + validación DTO/query | Hecha | `pagination-validation.middleware.test.ts`: `paginationMiddleware`, `paginatedResponse`, `validateDto` / `validateQuery` con `class-validator` (`TitleDto`, `PaginationDto`) |
| 37 | Tests backend: rate limiting + sin `setInterval` en `NODE_ENV=test` | Hecha | `rate-limit.middleware.test.ts` (`rateLimitMiddleware`, `authRateLimitMiddleware`, `strictRateLimitMiddleware`); `rate-limit.middleware.ts`: no arrancar limpieza periódica en tests (evita handles abiertos en Jest) |
| 38 | Tests backend: `HealthController` (basic + métricas) | Hecha | `health.controller.test.ts`: instancia aislada; mock `AppDataSource.query` / `options.pool`; `basic` healthy / unhealthy; `metrics` con `incrementRequest` / `incrementError` / `incrementQuery` |
| 39 | Tests backend: `HealthController` checks K8s (`ready` / `live`) | Hecha | `health.controller.test.ts` (ampliado): `ready` con BD OK / fallo `503 not ready`; `live` → `alive` sin llamar `AppDataSource.query` |
| 40 | Tests backend: `HealthController` (`detailed`) | Hecha | `health.controller.test.ts`: mock estable de `os` (`totalmem`/`freemem`) para evitar 503 por memoria real en CI; `detailed` healthy (200 + checks BD/memoria/disco); BD fallida → 503; BD lenta (`Date.now` simulado) → check BD `degraded` con **200** |
| 41 | Tests backend: `NotificationsController` | Hecha | `notifications.controller.test.ts`: instancia aislada; mock ligero de `notification.service`; `getNotifications` → `[]`; `markAsRead` / `markAllAsRead` / `delete` → JSON de mensaje stub |
| 42 | Tests backend: `WebhookController` | Hecha | `webhook.controller.test.ts`: mock de `webhook.service`; `register` validación **400** (sin `url`, sin `events`, `events` no array), **201** + payload; `list` / `delete` / `test` delegan con `userId` e `id` parseado |
| 43 | Tests backend: `BackupController` | Hecha | `backup.controller.test.ts`: mock `backup.service`; `createBackup` (default `full` / `incremental`); `listBackups`; `restoreBackup` / `verifyBackup` / `testRestore` (**400** sin `filename`, **404** sin coincidencia en `listBackups`, éxito con delegación); `flush` (`setImmediate`) tras handlers `asyncHandler` (no devuelve la promesa interna; análogo a `flushMetrics` en health) |
| 44 | Tests backend: `AreasController` | Hecha | `areas.controller.test.ts`: mock `AppDataSource.getRepository` + `logger`; `getAll` / `getById` (404, OK, fallback `ER_BAD_FIELD_ERROR` + segundo `findOne`, 500); `create` (400 sin nombre, **201**); `update` (404, OK); `delete` (404, **400** con camas, OK `remove`) |
| 45 | Tests backend: `BedsController` (CRUD sin asignación) | Hecha | `beds.controller.test.ts`: mock `getRepository(Bed|Patient)` + `logger`/`logApiError`; `getAll` / `getByArea` (normalización, fallback `ER_BAD_FIELD_ERROR`); `create` / `update` / `delete` (`sendErrorResponse` **400**/**404**/**201**; **BED_IN_USE**); `assignPatient` → **#46** |
| 46 | Tests backend: `BedsController` `assignPatient` (parcial) | Hecha | Mismo spec: mock `AppDataSource.createQueryRunner` (`commit`/`rollback`/`release`, `manager.createQueryBuilder` / `getRepository`); liberar cama (`patientId: null`); **400**/**404**; **409** `BED_ALREADY_OCCUPIED`; **200** asignación + `getRawOne` de verificación: ver **#64** |
| 47 | Tests backend: `shifts.controller` (`getShifts` / `updateShift`) | Hecha | `shifts.controller.test.ts`: mock `getRepository(Shift)` + `logger`; `getShifts` (orden + filtro activos, **500**); `updateShift` (**400** id / formato HH:MM, **404**, éxito `save`) |
| 48 | Tests backend: `shifts.controller` `getWeeklySchedule` | Hecha | Mismo spec: mock `getRepository(NurseShift)` + `createQueryBuilder` (`leftJoinAndSelect`, `where` opcional por `weekStartDate`, `getMany`); agrupación por enfermera/día; **500** si `getMany` falla |
| 49 | `getWeeklySchedule`: log preview seguro + test omisión sin nurse/shift | Hecha | `shifts.controller.ts`: en el log de preview, `nurseName` solo si hay `ns.nurse` (evita **TypeError**); `shifts.controller.test.ts`: caso con `nurse` o `shift` nulos → `[]` y `logger.warn` |
| 50 | Tests backend: `ReportsController` | Hecha | `reports.controller.test.ts`: mock `reportService`; `generateMedicationReport` / `generateComplianceStats` (**400**, admin/supervisor, enfermera **403** / `restrictToPatientIds`); `exportReport` (**400** query, **400** tipo, **415** buffer nulo, CSV **medication**/**compliance** + `setHeader`/`send`) |
| 51 | Tests backend: `shifts.controller` `saveWeeklySchedule` / `getShiftAttendance` | Hecha | `shifts.controller.test.ts`: **`saveWeeklySchedule`** (**400**, lista vacía, persistencia con `shiftId` string + `createQueryBuilder` delete, **500**); **`getShiftAttendance`** (**400** query / `shiftId`, lista enfermeras + mapa asistencia, **500**) |
| 52 | Tests backend: `shifts.controller` `saveShiftAttendance` | Hecha | Mismo spec: mock `getRepository(ShiftAttendance)` (`findOne`, `create`, `save`); **400** body / `shiftId`; lista vacía; omisión por `nurseId`/`status` inválidos; alta + **`recordedBy`**; update sin `create`; **500** si `save` falla |
| 53 | Tests backend: `shifts.controller` `getPresentNursesByShift` / `getShiftAttendanceHistory` | Hecha | Mismo spec: **`getPresentNursesByShift`** (**400**, filtro present/late + enfermera activa, **500**); **`getShiftAttendanceHistory`** (cadena `createQueryBuilder`, `take` default **200** / tope **1000**, filtros query, mapeo sin nurse/shift, **500**) |
| 54 | Tests backend: `AuthController.login` | Hecha | `auth.controller.test.ts`: mock `getRepository(User)`, `generateToken`, `auditService` / `AuditService` (IP/UA), `emailService.isSmtpConfigured`, `logger`; **400** credenciales; **401** usuario inexistente / inactivo / contraseña; **403** email no verificado; **200** + `logLoginSuccess`; **500** |
| 55 | Tests backend: `AuthController` `register` / `verifyEmail` / `resendVerificationCode` (parcial) | Hecha | Mismo spec: mock `User` + `PendingRegistration`, `sendVerificationCode`, `AppDataSource.transaction` (mock no usado en estos casos); **`register`**: **400** campos/teléfono/rol, usuario/email en uso, pendiente conflicto, **201**, **500**; **`verifyEmail`**: **400**/ **404** / verificado / código; **`resendVerificationCode`**: **400** sin email |
| 56 | Tests backend: `AuthController` `verifyEmail` éxito + `resendVerificationCode` ampliado | Hecha | Mismo spec: **`verifyEmail`** **409** conflicto + **`AppDataSource.transaction`** **200** pendiente; **200** usuario sin pendiente; **`resendVerificationCode`**: **404**, pendiente (save + SMTP off), **500** envío, **400** ya verificado, usuario no verificado |
| 57 | Tests backend: `AuthController` `updateMe` + `me` | Hecha | Mismo spec: **`updateMe`** **401**/**400** (campos, longitud usuario, email inválido, usuario/correo en uso, teléfono largo), **404**, **200** (actualización + limpiar `phone`), **500** `save`; **`me`** **401**, **200**, **500** si falla `res.json` |
| 58 | Tests backend: `SchedulesController` | Hecha | `schedules.controller.test.ts`: mock `getRepository(Schedule|AdministrationHistory)`, `createQueryBuilder` + **`getManyAndCount`** (éxito, **500**, fallback **ER_BAD_FIELD_ERROR** + `logger.warn`); **`getByPatient`**; **`create`** (**400**, **201**, fallback `findOne`); **`update`**/**`delete`**; **`complete`**/**`markAsNotCompleted`** (**401**/**400**/**404**, **200** + `adminRepo.save`); **`postpone`**; **`markMedicationGiven`** |
| 59 | Tests backend: handlers `medications.controller` | Hecha | `medications.controller.test.ts`: mocks `Schedule` + **`cacheService`**; **`addMedication`** (**401**, **400** campos / id paciente / sin dosis, **201** + `delete` caché, **500** `save`); **`suspendMedication`** / **`deleteMedication`** / **`reactivateMedication`** / **`getPatientMedications`** (`createQueryBuilder` → **`getMany`** / **`getRawMany`**, **400**/**404**/**200**, **500**) |
| 60 | Tests backend: `PatientsController` (parcial) | Hecha | `patients.controller.test.ts`: **`getAll`** + fallback **`ER_BAD_FIELD_ERROR`**; **`getById`**; **`saveObservation`**; **`create`**; **`update`** rama **403** enfermera + **`assignedToId`**; **`update`** **400**/**404**/**200** admin; **`delete`** **400**/**404**/**200** + **`Schedule`** (**#67**); **`delete`** con cama (**#69**) |
| 61 | Tests backend: `UsersController` | Hecha | `users.controller.test.ts`: **`getAll`**; **`update`** / **`updateRole`** / **`delete`** / **`restore`** (**400**/**404**/**200**, `logUserAction`, repos **`Schedule`**/**`NurseShift`**) |
| 62 | Tests backend: handlers `pharmacy.controller` (parcial) | Hecha | `pharmacy.controller.test.ts`: **`getMedicationRequests`** sin paginar + **paginado** + **500** (**#69**–**#70**); **`updateRequestStatus`**; **`deliverMedication`**; **`getDeliveryHistory`** + **#68**–**#70**; **`postInventoryMovement`** + **#68**–**#69**; **`getInventory`** + **500** **`find`/`findAndCount`** (**#71**); **`updateMedicationStock`**; **`getInventoryMovements`** + paginado **#68**; **`createMedication`** / **`deleteMedication`**; **`createMedicationRequest`**: **#67** + **500** **`save`** medicamento nuevo (**#71**) |
| 63 | Tests backend: handlers `nurses.controller` (parcial) | Hecha | `nurses.controller.test.ts`: mocks **`AppDataSource.isInitialized`** + servicios (`computeNurseStats`, camas/pacientes, tareas, historial día, detalle, farmacia panel, tratamientos, administración, contexto turno, handover); **401**/**403**/**404**/**400**/**500** y **200** en rutas cubiertas; más handlers: **#65**; **500** por rechazo de servicio: **#66** |
| 64 | Tests backend: `BedsController` `assignPatient` **200** | Hecha | `beds.controller.test.ts`: caso **200** asignación a cama libre (`update` afectado, **`getRawOne`** `patient_bedId` = `bed.id`, `commit`, recarga `createQueryBuilder` → **`getOne`**, payload normalizado) |
| 65 | Tests backend: `nurses.controller` (handlers adicionales) | Hecha | `nurses.controller.test.ts`: **`getPatientHistory`** (403, **200**, **404**); **`quickAddPatientTreatment`** (**400**, **201**); **`patchPatientTreatmentSchedule`** **200**; **`patchAdministrationHistoryRecord`** / **`deleteAdministrationHistoryRecord`** (**400**/**200**); **`patchNursePatientSchedule`** / **`deleteNursePatientSchedule`** (**400**/**200**) |
| 66 | Tests backend: `nurses.controller` (ramas **500** por rechazo) | Hecha | Mismo spec: **`describe('ramas 500 cuando el servicio lanza')`** — cada handler relevante con mock **`mockRejectedValueOnce`** → **500** y mensaje JSON esperado (`getNurseStats`, camas/pacientes, tareas, historial día, detalle, farmacia, administración, historial, tratamientos, horarios, contexto turno, handover get/put) |
| 67 | Tests backend: `PatientsController` **`delete`** + `pharmacy` ampliado | Hecha | **`patients.controller.test.ts`**: mock **`Schedule.delete`** + **`remove`**; **`pharmacy.controller.test.ts`**: **`getMedicationRequests`** paginado, **`getDeliveryHistory`**, **`postInventoryMovement`** (query runner), **`createMedicationRequest`** (**401**/**400**/**201**, `headers` en req) |
| 68 | Tests backend: `pharmacy` historial + movimientos + movimientos lista | Hecha | **`pharmacy.controller.test.ts`**: **`getDeliveryHistory`** (`includeCancelled`, paginado + **`deliveredTodayCount`**); **`postInventoryMovement`** salida insuficiente **400**, salida **200**, **`adjustment`** **200**; **`getInventoryMovements`** paginado |
| 69 | Tests backend (farmacia/pacientes) + frontend nav/búsqueda | Hecha | **`pharmacy`**: **`getMedicationRequests`** **500**; **`getDeliveryHistory`** con **`startDate`/`endDate`**; **`postInventoryMovement`** entrada + **`expiryDate`**; **`patients`**: **`delete`** con **cama** y liberación **`isOccupied`**; **frontend**: **`nurse-dashboard-main-nav.component.spec.ts`**, **`nurse-dashboard-header-search.component.spec.ts`** |
| 70 | Tests farmacia **500** listado + frontend resumen/handover | Hecha | **`pharmacy.controller.test.ts`**: **`getMedicationRequests`** **500** sin paginar (`getMany`); **`getDeliveryHistory`** **500**; **frontend**: **`nurse-summary-section.component.spec.ts`**, **`nurse-handover-modal.component.spec.ts`** |
| 71 | Tests farmacia inventario **500** + crear solicitud **500** + specs tareas/farmacia | Hecha | **`pharmacy.controller.test.ts`**: **`getInventory`** **500** (`find` / `findAndCount`); **`createMedicationRequest`** **500** si falla **`medRepo.save`**; **frontend**: **`nurse-tasks-section.component.spec.ts`**, **`nurse-pharmacy-section.component.spec.ts`** |
| 72 | Specs Angular secciones **camas** y **pacientes asignados** | Hecha | **`nurse-beds-section.component.spec.ts`** (`bedEditRequest`, `viewPatientRequest`, stopPropagation en «Ver detalles»); **`nurse-patients-assigned-section.component.spec.ts`** (buscador, filtro, fila, badge dosis, lista vacía) |
| 73 | Spec Angular **`nurse-dashboard-overlays-stack`** (cableado modales) | Hecha | **`nurse-dashboard-overlays-stack.component.spec.ts`**: creación + **`resetObservationEditState`**; delegación **`handoverDismissed`**, **`pharmacyPatientsDismissed`**, **`pendingTaskDetailDismissed`**, **`historyDetailDismissed`** desde hijos |
| 74 | Objeto VM único para entradas de **`nurse-dashboard-overlays-stack`** (backlog B-01) | Hecha | **`nurse-dashboard-overlays-stack.vm.ts`** (`NurseDashboardOverlaysStackVm`, factories); padre **`[vm]="overlaysStackVm"`** + `DoCheck` + `syncOverlaysStackVmFromState()`; stack con un solo `@Input() vm`; spec con **`nurseDashboardOverlaysStackVmForTesting`**. |
| 75 | Unificar `console.*` → `logger` en scripts/tests integración/seeds/migraciones (backlog B-02) | Hecha | Reemplazos en `backend/src/__tests__/run-full-test.ts` + `integration/*.test.ts`, `backend/src/seeds/*.ts`, `backend/src/migrations/17337*.ts`/`17338*.ts`/`17341*.ts`; import explícito de `logger` en cada archivo. |
| 76 | Partir `nurse-dashboard.component.ts` por dominio/facade (B-03, fase 1: tareas rápidas) | Hecha | Nuevo **`nurse-dashboard-tasks-quick.facade.ts`** (`open/clear/build` estado filtros/modal rápido) + spec; `nurse-dashboard.component.ts` delega `openTasksQuickModal`, `applyTasksFilters`, `clearTasksFilters` y usa constante `DEFAULT_NURSE_TASKS_HOUR_FILTER`. |
| 77 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 2: acciones de tareas) | Hecha | Nuevo **`nurse-dashboard-task-actions.helpers.ts`** (`hasTaskId`, `resolveTaskId`, `normalizeNotCompletedReason`, `completeTaskLocally`, `markTaskAsMissedLocally`, `buildPostponeIsoDateTime`, etc.) + spec; `nurse-dashboard.component.ts` delega validación/mutación local de `completeTask`, `onNotCompletedTaskConfirmed`, `onPostponeTaskConfirmed`. |
| 78 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 3: estado historial del día) | Hecha | Nuevo **`nurse-dashboard-day-history-state.helpers.ts`** (`start`, `finish success`, `finish error`) + spec; `loadTasksDayHistory()` delega validación de fecha y transiciones de estado (`loading/items/error/date`). |
| 79 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 4: acciones de medicación) | Hecha | Nuevo **`nurse-dashboard-medication-actions.helpers.ts`** (`normalizeMedicationActionReason`, `resolveSuspendUntilDate`, `resolvePatientIdAndMedicationName`) + spec; `onSuspendMedicationConfirmed`, `onDeleteMedicationConfirmed`, `onReactivateMedicationConfirmed` delegan validación/parseo/cálculo. |
| 80 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 5: mapeo detalle paciente) | Hecha | Nuevo **`nurse-dashboard-patient-details-state.helpers.ts`** (`parsePatientDetailsRequestId`, `buildPatientDetailsPatch`) + spec; `loadPatientDetails()` delega parseo id y mapeo/normalización de respuesta para actualizar `selectedPatient`. |
| 81 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 6: solicitudes farmacia) | Hecha | Nuevo **`nurse-dashboard-pharmacy-requests.helpers.ts`** (`pickRequestedPharmacyMedications`, `buildPharmacyMedicationRequestPayload`) + spec; `sendPharmacyRequest()` delega selección y armado de payload de solicitudes. |
| 82 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 7: estado modales de tareas) | Hecha | `nurse-dashboard-task-actions.helpers.ts` añade `openTaskActionModalState`/`closeTaskActionModalState` + tests; `markTaskAsNotCompleted`, `openPostponeTaskModal`, `closeNotCompletedModal` y `closePostponeTaskModal` delegan apertura/cierre/validación de estado modal. |
| 83 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 8: navegación/cards) | Hecha | Nuevo **`nurse-dashboard-navigation.helpers.ts`** (`buildNurseAreaInfoMessage`, `nurseDashboardSectionIdForView`) + spec; `showAreaInfo`, `filterByPatients`, `filterByTasks`, `navigateToPharmacyTab` delegan composición de mensaje/objetivo de scroll. |
| 84 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 9: borrado historial/schedule) | Hecha | Nuevo **`nurse-dashboard-history-actions.helpers.ts`** (`resolveHistoryDeleteTarget`, `successMessageForHistoryDeleteTarget`) + spec; `deleteHistoryRecord()` delega resolución del objetivo de borrado y mensajes de éxito, y reutiliza parseo de patientId desde helper de schedule. |
| 85 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 10: estado modales de historial) | Hecha | Nuevo **`nurse-dashboard-history-modals.helpers.ts`** (`open/close` para detalle y edición) + spec; `openHistoryEdit`, `closeHistoryEdit`, `openHistoryDetail`, `closeHistoryDetail` delegan estado del modal. |
| 86 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 11: estado modales de creación) | Hecha | Nuevo **`nurse-dashboard-create-modals.helpers.ts`** (abrir/cerrar modales de agregar tratamiento/medicación desde tareas y contexto paciente) + spec; `openAddTaskModal`, `closeAddTreatmentModal`, `openAddMedicationFromTasks`, `openAddMedicationModal`, `closeAddMedicationModal` delegan estado. |
| 87 | Partir `nurse-dashboard.component.ts` por dominio/helpers (B-03, fase 12: reglas de refresh post-acción) | Hecha | Nuevo **`nurse-dashboard-refresh.helpers.ts`** (`shouldRefreshSelectedPatientAfterSave`, `taskMutationsShouldReloadHistory`) + spec; se usa en `onAddTreatmentSaved`, `onAddMedicationSaved`, `completeTask`, `onNotCompletedTaskConfirmed`, `onPostponeTaskConfirmed`. |
| 88 | B-04: ampliar cobertura con specs de modales pendientes (nurse-dashboard) | Hecha | Nuevos specs: `nurse-postpone-task-modal.component.spec.ts`, `nurse-not-completed-task-modal.component.spec.ts`, `nurse-pharmacy-patients-modal.component.spec.ts` (interacciones de cierre/confirmación, validaciones básicas y render de lista). |
| 89 | B-04: ampliar cobertura backend con tests de DTO de medicación/tareas | Hecha | Nuevo `backend/src/__tests__/unit/dto/medication.dto.test.ts` cubriendo validación y transformación (`AddMedicationDto`, `Suspend/DeleteMedicationDto`, `AddTreatmentDto`, `MarkNotCompletedDto`, `PostponeTaskDto`). |
| 90 | B-04: ampliar cobertura con specs adicionales de modales schedule/history | Hecha | Nuevos specs: `nurse-schedule-slots-modal.component.spec.ts`, `nurse-history-detail-modal.component.spec.ts`, `nurse-medication-day-detail-modal.component.spec.ts` (cierres, mapeo de estado, grid semanal y bloques de detalle). |
| 91 | B-04: ampliar cobertura backend con ramas 500 en controladores | Hecha | Se añadieron casos de error 500 en `areas.controller.test.ts` (create/update/delete) y `pharmacy.controller.test.ts` (updateRequestStatus, deliverMedication, getInventoryMovements, createMedication, deleteMedication). |
| 92 | B-04: ampliar cobertura backend de errores en `users.controller` | Hecha | Nuevos casos 500 en `users.controller.test.ts` para `getAll`, `updateRole`, `delete` y `restore`, verificando respuesta estandarizada con `code: SERVER_ERROR`. |
| 93 | B-04: ampliar cobertura backend de errores en `auth.controller` | Hecha | Nuevos casos 500 en `auth.controller.test.ts` para `verifyEmail` (fallo en `transaction` y en `save`) y `resendVerificationCode` (fallo en `save` de pendiente y usuario). |
| 94 | B-04: reforzar manejo de errores async en `reports.controller` | Hecha | Nuevos tests en `reports.controller.test.ts` validan que `asyncHandler` propaga errores al `next` en `generateMedicationReport`, `generateComplianceStats` y `exportReport`. |
| 95 | B-04: ampliar cobertura backend de errores en `patients.controller` | Hecha | Nuevos casos 500 en `patients.controller.test.ts` para `getById`, `saveObservation`, `create`, `update` y `delete`; se completa mock de `logApiError` para rutas que usan `handleControllerError`. |
| 96 | B-04: ampliar cobertura backend de errores en `shifts.controller` | Hecha | Nuevos casos 500 en `shifts.controller.test.ts` para `updateShift` (fallo en `save`), `getShiftAttendance` (fallo en `find` de enfermeras) y `saveShiftAttendance` (fallo en `findOne`). |
| 97 | B-04: ampliar cobertura backend de errores en `schedules.controller` | Hecha | Nuevos casos 500 en `schedules.controller.test.ts` para `create`, `update`, `delete`, `complete`, `markAsNotCompleted` y `postpone` cuando fallan operaciones de persistencia. |
| 98 | B-04: ampliar cobertura backend de errores en `beds.controller` | Hecha | Nuevos casos 500 en `beds.controller.test.ts` para `getByArea`, `create`, `update` y `delete` en fallos de repositorio (`find`/`save`/`remove`). |
| 99 | B-04: ampliar cobertura backend de errores en `medications.controller` | Hecha | Nuevos casos 500 en `medications.controller.test.ts` para `suspendMedication` (fallo en `getMany`), `deleteMedication` (fallo en `remove`) y `reactivateMedication` (fallo en `save`). |
| 100 | B-04: specs Angular en modales **añadir medicamento/tratamiento** (nurse-dashboard) | Hecha | Nuevos `nurse-add-medication-modal.component.spec.ts` y `nurse-add-treatment-modal.component.spec.ts`: validaciones, sugerencias de horarios, toggles de días, ramas `confirmAdd` (global vs `fromPatient`) y manejo de error/success con mocks de `NurseService`/`ToastService`. |
| 101 | B-04: specs Angular en modales **suspender / eliminar / reactivar** medicamento | Hecha | Nuevos `nurse-suspend-medication-modal`, `nurse-delete-medication-modal` y `nurse-reactivate-medication-modal` `.component.spec.ts`: cierre por backdrop, `canSubmit` / validación de motivo, emisión de `confirmed`, reset en `ngOnChanges` (suspender) y toast en borrado. |
| 102 | B-04: specs **posponer tratamiento**, **detalle tarea** y **tareas rápidas** | Hecha | Nuevos `nurse-treatment-postpone-modal`, `nurse-pending-task-detail-modal` y `nurse-tasks-quick-modal` `.component.spec.ts`: `ngOnChanges`/toast/`confirmed`, `typeLabel` y backdrop, `descriptionPreview` + emisión `completeTask` + estado vacío. |
| 103 | B-04: specs **farmacia rápida**, **editar horario** y **editar cama** | Hecha | Nuevos `nurse-pharmacy-quick-modal`, `nurse-schedule-edit-modal` y `nurse-edit-bed-modal` `.component.spec.ts`: contadores/seleccionar todos, `patchPatientSchedule` + toast, `getPatientBed`/`filterPatientsForBed`/guardado cama + `reloadRequested` con `fakeAsync`. |
| 104 | B-04: specs **historial edición**, **reportes** y **shell ficha paciente** | Hecha | Nuevos `nurse-history-edit-modal`, `nurse-reports-modal` y `nurse-patient-modal-shell` `.component.spec.ts`: ramas `save` (historial vs schedule), UI reportes (CSV/carga/error), cierre e impresión y cambio de pestaña en shell. |
| 105 | B-04: specs **pestañas ficha paciente** (medicación, tratamientos, observaciones, historial) | Hecha | Nuevos `nurse-patient-medications-tab`, `nurse-patient-treatments-day-tab`, `nurse-patient-observations-tab`, `nurse-patient-history-tab` `.component.spec.ts`: helpers delegados, acciones de tabla/filtros, edición diagnóstico y estado vacío. |
| 106 | B-03: helpers **cabecera usuario** (`headerUserName` / teléfono) en nurse-dashboard | Hecha | Nuevo `nurse-dashboard-header-user.helpers.ts` + spec; getters `headerUserName` y `headerUserPhoneLine` en `nurse-dashboard.component.ts` delegan (sin cambiar comportamiento). |
| 107 | B-04: **E2E Playwright** guard rutas enfermería sin sesión | Hecha | `e2e/nurse-dashboard-guard.spec.ts`: `/nurse-dashboard` y `/dashboard` → **`/login`** sin cookie/token de sesión. Ejecutar e2e: navegadores Playwright instalados (`npx playwright install chromium`). |
| 108 | B-03: helpers **vista principal** (`localStorage`) nurse-dashboard | Hecha | `nurse-dashboard-main-view-storage.helpers.ts` + spec (`NURSE_DASHBOARD_MAIN_VIEW_STORAGE_KEY`, `nurseDashboardMainViewFromStoredValue`); `persistNurseMainView` / `restoreNurseMainView` en `nurse-dashboard.component.ts` delegan. |
| 109 | B-03: helpers **error recarga inicial** (`forkJoin` stats/camas/pacientes) | Hecha | `nurse-dashboard-reload-error.helpers.ts` + spec (`nurseDashboardReloadFailureDecision` + mensajes); `reloadDashboard$` en `nurse-dashboard.component.ts` delega; eliminado `allowedNurseViews` no usado. |
| 110 | B-04: **E2E smoke enfermería** con API simulada (sin BD / backend real) | Hecha | `e2e/nurse-dashboard-smoke.spec.ts`: mocks `route()` para `/api/auth/login` + rutas `/api/nurse/*` del primer render (`forkJoin` + `loadSecondaryData`); aserta `/nurse-dashboard` + título shell + subtítulo área simulada. |
| 111 | B-03: helper **¿cargar historial del día?** al estar en vista tareas | Hecha | `nurse-dashboard-tasks-day-history-sync.helpers.ts` + spec (`nurseDashboardShouldLoadTasksDayHistory`); `ngOnInit` / `setNurseMainView` delegan. |
| 112 | B-03: helper **toast advertencia** fallo `loadSecondaryData` (tareas+farmacia) | Hecha | `nurse-dashboard-secondary-load.helpers.ts` + spec (`nurseDashboardSecondaryLoadWarningToastMessage`); `loadSecondaryData` delega. |
| 113 | B-04: **E2E guards** `/admin`, `/supervisor`, `/pharmacy` sin sesión → `/login` | Hecha | `e2e/role-routes-guard.spec.ts` (bucle sobre rutas con `canActivate` por rol). |
| 114 | B-04: **E2E** `/use-case-diagram` sin sesión → `/login` | Hecha | `e2e/use-case-diagram-guard.spec.ts` (`authGuard`). |
| 115 | B-03: helper **mensaje error HTTP** carga historial del día (tareas) | Hecha | `nurse-dashboard-tasks-day-history-load.helpers.ts` + spec (`nurseDashboardTasksDayHistoryLoadDetailMessage`); `loadTasksDayHistory` delega. |
| 116 | B-03: helpers **textos export CSV** historial del día | Hecha | `nurse-dashboard-day-history-export.helpers.ts` + spec (vacío / éxito / fallo); `exportTasksDayHistoryCsv` delega. |
| 117 | B-03: helpers **toasts nota de entrega** (handover modal) | Hecha | `nurse-dashboard-handover-messages.helpers.ts` + spec; `reloadHandoverForDate` / `saveHandoverNote` delegan. |
| 118 | B-04: **E2E** raíz `/` sin sesión → `/login` | Hecha | `e2e/root-and-public-routes.spec.ts` (primera prueba del archivo). |
| 119 | B-04: **E2E** `/register` público (heading Crear Cuenta) | Hecha | Mismo `e2e/root-and-public-routes.spec.ts` (segunda prueba). |
| 120 | B-04: **E2E** `/verify-email` sin `email` en query → `/login` | Hecha | `e2e/root-and-public-routes.spec.ts` (comportamiento `VerifyEmailComponent`). |
| 121 | B-03: helpers **modal reportes** enfermería (carga / export CSV) | Hecha | `nurse-dashboard-nurse-reports-messages.helpers.ts` + spec; `openNurseReportsModal` / `downloadNurseReportCsv` delegan. |
| 122 | B-04: **E2E** `/login` público (heading Iniciar Sesión) | Hecha | `e2e/root-and-public-routes.spec.ts`. |
| 123 | B-03: helpers **avisos slots** tratamiento/medicación (solo pendientes) | Hecha | `nurse-dashboard-schedule-slot-toasts.helpers.ts` + spec; edición/borrado tratamiento y borrado dosis medicación delegan. |
| 124 | B-03: helpers **observación inline** (guardar desde ficha) | Hecha | `nurse-dashboard-patient-observation-inline.helpers.ts` + spec; `saveObservation` delega. |
| 125 | B-04: **E2E** `/design-catalog` (histórico; retirado) | Retirado | Eliminados `e2e/design-catalog-dev.spec.ts`, ruta y guard asociados (2026-05). |
| 126 | B-03: helpers **toasts guardado campos** ficha paciente (médicas/alergias/etc.) | Hecha | `nurse-dashboard-patient-field-save-toasts.helpers.ts` + spec; `saveMedicalObservations` … `saveGeneralObservationsFull` delegan. |
| 127 | B-03: helpers **marcar/borrar medicación** del día (avisos comunes) | Hecha | `nurse-dashboard-mark-medication-toasts.helpers.ts` + spec; `markMedicationGiven` / `markMedicationAsNotAdministered` / éxito borrar dosis delegan. |
| 128 | B-04: **E2E** navegación login → registro (`routerLink`) | Hecha | `e2e/root-and-public-routes.spec.ts` (enlace **Regístrate aquí**). |
| 129 | B-03: helpers **tratamiento del día** (aceptar/cancelar/posponer + horario inválido) | Hecha | `nurse-dashboard-treatment-schedule-toasts.helpers.ts` + spec; acciones de tratamiento y `completeScheduleItem` / `markScheduleAsNotAdministered` delegan. |
| 130 | B-03: helpers **farmacia masiva** y **sin pacientes** (modales desde tareas) | Hecha | `nurse-dashboard-pharmacy-task-actions.helpers.ts` + spec; `sendPharmacyRequest`, `openAddTaskModal`, `openAddMedicationFromTasks` delegan. |
| 131 | B-04: **E2E** navegación registro → login (`routerLink`) | Hecha | `e2e/root-and-public-routes.spec.ts` (enlace **Inicia sesión aquí**). |
| 132 | B-03: helpers **toasts acciones de tareas** (completar, postergar, ID paciente, motivo ≥10) | Hecha | `nurse-dashboard-task-actions-toasts.helpers.ts` + spec; `nurse-dashboard.component.ts` delega. |
| 133 | B-03: helpers **toasts borrado historial / tratamiento pendiente** | Hecha | `nurse-dashboard-history-schedule-delete-toasts.helpers.ts` + spec; `nurse-dashboard.component.ts` delega. |
| 134 | B-03: helpers **toasts misc** (medicación sin contexto, cama sin id, impresión) | Hecha | `nurse-dashboard-misc-guard-toasts.helpers.ts` + spec; `nurse-dashboard.component.ts` delega. |
| 135 | B-03: helpers **toasts interpolados** (éxito/error con datos dinámicos) | Hecha | `nurse-dashboard-interpolated-toasts.helpers.ts` + spec; `nurse-dashboard.component.ts` delega. |
| 136 | B-03: constants **fallback HTTP** (`readNurseDashboardHttpErrorMessage`) | Hecha | `nurse-dashboard-http-fallback-messages.helpers.ts` + spec; `nurse-dashboard.component.ts` usa constantes en lugar de literales. |
| 137 | B-03: **confirmaciones** historial/tratamiento pendiente vía `ConfirmationService` + copy helper | Hecha | `nurse-dashboard-confirmation-copy.helpers.ts` + spec; `deleteHistoryRecord` / `deleteScheduleItem` async; sin `confirm()` nativo en esos flujos. |
| 138 | **Admin:** `confirm()` → `ConfirmationService` + copy (`admin-confirmation-copy`) | Hecha | Camas liberar, pacientes eliminar medicamento, personal quitar asignación; `admin-confirmation-copy.helpers.ts` + spec. |
| 139 | **Admin:** `schedules-management` — sin `confirm()` nativo (semanal / limpiar / asignación rápida) | Hecha | Textos en `admin-confirmation-copy.helpers.ts` + spec; `schedules-management.component.ts` + `ConfirmationService`. |
| 140 | **Admin:** `schedules-management` — `ToastService` + modal día descanso (sin `alert`/`prompt`) | Hecha | `schedules-management.component.ts/html/css`; feedback unificado con el resto de la app. |
| 141 | **Admin:** `staff-management` — sin `alert()` nativo (`ToastService`) | Hecha | `staff-management.component.ts`: edición enfermera, área, asignación cama/paciente, quitar asignación. |
| 142 | **Admin:** `beds-management` — sin `alert()` nativo (`ToastService`) | Hecha | `beds-management.component.ts`: crear cama, guardar cambios, errores HTTP. |
| 143 | **B-04:** spec `schedules-management` (montaje + modal día descanso) | Hecha | `schedules-management.component.spec.ts`; mocks Admin/Shifts/confirm/toast. |
| 144 | **B-04:** spec `staff-management` (carga + filtros + helpers UI) | Hecha | `staff-management.component.spec.ts`; mocks Admin/Shifts/Router/confirm/toast. |
| 145 | **B-04:** spec `beds-management` (carga + filtros + estado cama + crear) | Hecha | `beds-management.component.spec.ts`; mocks Admin/toast/confirm. |
| 146 | **B-05 (parcial):** admin dashboard — pestañas ARIA + `<main>` + botones | Hecha | `admin-dashboard.component.html`: `tablist`/`tab`/`tabpanel`, `aria-labelledby`, `type="button"`, logo/cierre accesibles. |
| 147 | **B-05 + B-04:** admin — teclado en pestañas + spec `admin-dashboard` | Hecha | `onAdminTabKeydown` (←/→/Inicio/Fin); `admin-dashboard.component.spec.ts`. |
| 148 | **B-05 + B-04:** supervisor — ARIA + teclado + spec | Hecha | `supervisor-dashboard.component.html/ts`: `tablist`/`tab`/`tabpanel`, `<main>`, `onSupervisorTabKeydown`; `.spec.ts`. |
| 149 | **B-05 + B-04:** farmacia — `dashboard-shell` + pestañas + spec | Hecha | `dashboard-shell` (`navRoleTablist`, `panelHeadingId`, logo); `pharmacy-dashboard` ARIA/teclado/`main`; `.spec.ts`. |
| 150 | **B-05 + B-04:** enfermería — nav `tablist` + `<main>` + teclado + spec | Hecha | `nurse-dashboard-main-nav` (`role="tablist"`/`tab`, grupo rápido); `nurse-dashboard.component.html` (`main`, `tabpanel`, `panelHeadingId` shell); `onMainViewTabKeydown`; `.spec.ts` ampliado. |
| 151 | **B-05 + B-04:** enfermería — modales `dialog` + `aria-*` + spec handover | Hecha | Modales del stack: backdrop `role="presentation"`, panel `role="dialog"` `aria-modal` `aria-labelledby`, `id` en `<h3>`, cierre `aria-label="Cerrar"`; prueba en `nurse-handover-modal.component.spec.ts`. |
| 152 | **B-05 + B-04:** enfermería — cierre global con `Escape` en overlays stack + spec | Hecha | `nurse-dashboard-overlays-stack`: `HostListener('document:keydown.escape')` con prioridad de cierre del modal superior; test de prioridad (`handover` sobre `patient`) y caso sin overlays. |
| 153 | **B-05 + B-04:** trap de foco en modales (`appModalFocusTrap`) + spec | Hecha | Directiva **`ModalFocusTrapDirective`** (`shared/directives`); `appModalFocusTrap` en diálogos enfermería + **`confirmation-modal`**; enfocar primer control al abrir; Tab/Shift+Tab ciclan; restaurar foco al destruir. **Tests:** `modal-focus-trap.directive.spec.ts`. |
| 154 | **B-04:** E2E teclado en `nurse-dashboard-main-nav` (←/→ + foco) | Hecha | `frontend/e2e/nurse-dashboard-main-nav-keyboard.spec.ts`; ejecutado en Chromium con `PLAYWRIGHT_BROWSERS_PATH=0`. |
| 155 | **B-05:** i18n incremental en `nurse-dashboard-main-nav` + compat test | Hecha | `nurse-dashboard-main-nav.component.html`: `i18n`/`i18n-*` en labels visibles y ARIA de tabs/accesos rápidos. `nurse-dashboard-main-nav.component.spec.ts`: shim `$localize` para pruebas y ajustes de selectores/expectativas. |
| 156 | **B-05:** i18n incremental en modales `handover` y `reports` + compat specs | Hecha | `nurse-handover-modal.component.html` y `nurse-reports-modal.component.html` con `i18n`/`i18n-*` en títulos, labels/placeholder y controles principales; specs con shim `$localize` (`nurse-handover-modal.component.spec.ts`, `nurse-reports-modal.component.spec.ts`). |
| 157 | **B-05:** i18n incremental en modales rápidos `tasks` / `pharmacy` + compat specs | Hecha | `nurse-tasks-quick-modal.component.html` y `nurse-pharmacy-quick-modal.component.html`: títulos, intro, filtros/opciones, cabeceras de tabla, estados/tooltips, badges, ICU plural pacientes (`patientsSummary`), botones pie; shim `$localize` en `.spec.ts` de ambos. |
| 158 | **B-05:** i18n en modales posponer / no realizada / pacientes farmacia + compat specs | Hecha | `nurse-postpone-task-modal`, `nurse-not-completed-task-modal`, `nurse-pharmacy-patients-modal`: `i18n`/`i18n-*` en títulos, resúmenes, labels, placeholder, contador, lista; shim `$localize` en los tres `.spec.ts`; spec posponer: fecha «hoy» en **hora local** vs `Date` del componente. |
| 159 | **B-05:** i18n en modales alta medicación/tratamiento, editar cama y horarios + compat specs | Hecha | `nurse-add-medication-modal`, `nurse-add-treatment-modal`, `nurse-edit-bed-modal`, `nurse-schedule-slots-modal`: `i18n`/`i18n-*` en formularios, opciones, tooltips/ARIA; labels de días semana siguen en TS (`day.label`); shim `$localize` en los cuatro `.spec.ts`. |
| 160 | **B-05:** i18n en modales detalle tarea/medicación día, historial ver/editar + compat specs | Hecha | `nurse-pending-task-detail-modal`, `nurse-medication-day-detail-modal`, `nurse-history-detail-modal`, `nurse-history-edit-modal`: `i18n`/`i18n-*` en títulos, líneas de detalle, bloques de notas, selects/placeholder; shim `$localize` en los cuatro `.spec.ts`. |
| 161 | **B-05:** i18n en modales suspender/eliminar/reactivar medicación, posponer tratamiento y editar horario + compat specs | Hecha | `nurse-suspend-medication-modal`, `nurse-delete-medication-modal`, `nurse-reactivate-medication-modal`, `nurse-treatment-postpone-modal`, `nurse-schedule-edit-modal`: textos/ARIA/placeholder; shim `$localize` en los cinco `.spec.ts`. |
| 162 | **B-05 + B-04:** `nurse-patient-modal-shell` — i18n cabecera/pestañas/pie + pestañas ARIA + spec | Hecha | `nurse-patient-modal-shell.component.html`: `i18n` título con `{{ patient.name }}`, `i18n-aria-label` cierre y tablist; pestañas `role="tab"` `aria-selected` `aria-controls`; paneles `role="tabpanel"` `aria-labelledby`; shim + prueba ARIA en `.spec.ts`. |
| 163 | **B-05 + B-04:** i18n en pestañas ficha paciente (`medications` / `treatments` / `observations` / `history`) + shims | Hecha | Cuatro `.html` con `i18n`/`i18n-*`; edad en medicamentos: `{{ age }}` + palabra «años» traducible (compatible shim Karma); shim en los cuatro `.spec.ts`. Labels de estado/tipo siguen desde helpers TS. |
| 164 | **B-05 + B-04:** teclado pestañas modal ficha paciente (←/→/`Home`/`End`) + specs | Hecha | `nurse-patient-modal-shell`: `onPatientTabKeydown` alineado con `nurse-dashboard-main-nav`; `queueMicrotask` + ids `nurse-patient-tab-*`; tests Karma `fakeAsync` + `tick()` (flecha derecha + `Home`). |
| 165 | **B-05 + B-04:** `$localize` en helpers de estados/tipo/días + CSV historial día; polyfill `@angular/localize` | Hecha | Helpers y componentes que los reutilizan; `package.json` **`@angular/localize@20.3.15`**; `angular.json` polyfills `\@angular/localize/init` (build + test); `tsconfig.app.json` / `tsconfig.spec.json` `types`; `ensureLocalizeShim` en specs de helpers afectados; nuevos `nurse-dashboard-ui-i18n.helpers` + `nurse-schedule-modal-slot-status.helpers` + specs. |
| 166 | **B-05 + B-04:** `confirmation-modal` + wrapper — defaults `$localize` + ARIA cierre + spec | Hecha | `confirmation-modal.component.ts` defaults con IDs compartidos; `.html` `i18n-aria-label` cierre; `confirmation-wrapper`: fallbacks alineados (antes string literal **y** mensaje vacío → ahora texto por defecto traducible); `confirmation-modal.component.spec.ts` con shim. |
| 167 | **B-05:** toasts/mensajes panel enfermería (`nurse-dashboard-*` helpers) con `$localize` | Hecha | Constantes y funciones interpoladas consumidas por `nurse-dashboard.component.ts` (fallbacks HTTP, confirm copy, handover, reportes, slots, farmacia, historial/borrados, campos paciente, guards, tareas, recarga, CSV día, marcar med, carga historial tareas, navegación área, segundo `forkJoin`). `nurseDashboardReloadFailureDecision` usa `NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN`; specs reload/secondary-load ajustados. |
| 168 | **B-05:** toasts y confirm «liberar cama» en modales hijos enfermería (`$localize`, `@@nurseModal.*`) | Hecha | Nuevo `nurse-modal-component-toasts.helpers.ts`; componentes: `nurse-add-medication-modal`, `nurse-add-treatment-modal` (fallback `NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN`), `nurse-history-edit-modal`, `nurse-schedule-edit-modal`, `nurse-treatment-postpone-modal`, `nurse-delete-medication-modal`, `nurse-postpone-task-modal`, `nurse-edit-bed-modal` (`confirm` sin `cancelText` literal; usa defaults del wrapper). |
| 169 | Modularización admin/supervisor + B-03 (fachada carga secundaria) | Hecha | `staff-dashboard-shell/`, `DashboardTabStateService` + configs, `modal-shell/` (piloto `users-management`), `section-header/`, `admin-empty-state/`, tipos en `models/admin.types.ts` reexportados desde `admin.service.ts`, `NurseDashboardSecondaryLoadFacade` + specs nuevos/actualizados. |
| 170 | Modal shell áreas + facade carga primaria nurse + doc serverless | Hecha | `ModalShellComponent` `titleIcon`; `areas-management` 6 modales + `app-section-header`; `areas-management.component.spec.ts`; `NurseDashboardPrimaryLoadFacade` + spec; [`backend/README.md`](../../backend/README.md) sección entrada serverless `api/index.ts` / `app-test.ts`. |
| 171 | Modal shell tema `adminAssign` + modales asignar/cambiar área en gestión de áreas | Hecha | `ModalShellComponent`: `theme` / `assignLarge` / `assignStackTop`, plantilla bifurcada, `admin-assign-modal.shared.css` en `styleUrls`; [`areas-management.component.html`](../src/app/components/admin-dashboard/areas-management/areas-management.component.html) modales assign/cambiar → `app-modal-shell`; specs en [`areas-management.component.spec.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.spec.ts). |
| 172 | B-03: facades informes enfermería + farmacia bulk en `nurse-dashboard` | Hecha | `NurseDashboardNurseReportsLoadFacade` + spec (`forkJoin` medicación/cumplimiento); `NurseDashboardPharmacyBulkFacade` + spec; cableado en [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) (`openNurseReportsModal`, `sendPharmacyRequest`). |
| 173 | B-06 staff modales shell + B-05 admin i18n + backlog horarios | Hecha | **Staff:** cinco modales → [`app-modal-shell`](../src/app/shared/components/modal-shell/modal-shell.component.ts) en [`staff-management.component.html`](../src/app/components/admin-dashboard/staff-management/staff-management.component.html); specs modal; **B-05:** `i18n` en [`overview.component.html`](../src/app/components/admin-dashboard/overview/overview.component.html); `$localize` shell/hamburger en [`admin-dashboard.component.ts`](../src/app/components/admin-dashboard/admin-dashboard.component.ts); `i18n` parcial en [`patients-management.component.html`](../src/app/components/admin-dashboard/patients-management/patients-management.component.html); **B-06:** migración de horarios al shell en **#174**. |
| 174 | B-06 horarios modales shell + B-05 supervisor shell `$localize` | Hecha | **Horarios:** [`schedules-management.component.html`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.html) — modales editar turno, historial y día de descanso → **`app-modal-shell`**; CSS `::ng-deep` para anchuras `modal-history-neuro` / `day-off-picker-modal-neuro`; [`schedules-management.component.spec.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.spec.ts) (Router/ActivatedRoute + humo shell). **Supervisor:** `$localize` en [`supervisor-dashboard.component.ts`](../src/app/components/supervisor-dashboard/supervisor-dashboard.component.ts) + bindings en [`supervisor-dashboard.component.html`](../src/app/components/supervisor-dashboard/supervisor-dashboard.component.html); shim en spec. |
| 175 | B-05 farmacia shell `$localize` + spec shim | Hecha | [`pharmacy-dashboard.component.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.ts): título panel, rol, ARIA nav/logo, etiquetas pestañas (solicitudes / historial / inventario / asistencia) con **`$localize`** (`@@pharmacyShell.*`); [`pharmacy-dashboard.component.html`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.html) enlaza al shell y tabs; [`pharmacy-dashboard.component.spec.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.spec.ts): **`ensureLocalizeShim`**, humo de cadenas, stubs **`getWorkShifts`** / asistencia farmacia para `app-pharmacy-shift-attendance-section`. |
| 176 | B-03 handover facade + B-05 users/camas i18n + B-04 specs | Hecha | **B-03:** [`NurseDashboardHandoverNoteFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-handover-note.facade.ts) + spec; [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) delega `getHandoverNote`. **B-05:** `$localize` (`@@usersMgmt.*`, `@@bedsMgmt.*`) en [`users-management`](../src/app/components/admin-dashboard/users-management/) (cabecera, secciones supervisor/farmacia, filtros, carga, export, ARIA tabla) y [`beds-management`](../src/app/components/admin-dashboard/beds-management/) (título, alta cama, filtros área/estado, carga). **B-04:** nuevo [`users-management.component.spec.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.spec.ts); [`beds-management.component.spec.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.spec.ts): shim, mock **`getAreasShiftCoverage`**, humo título. |
| 177 | B-03 handover save + B-05 áreas/usuarios i18n + B-04 specs | Hecha | **B-03:** `NurseDashboardHandoverNoteFacade.saveNote` → `putHandoverNote`; [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) `saveHandoverNote`; spec facade ampliado. **B-05:** `$localize` `@@areasMgmt.*` en [`areas-management`](../src/app/components/admin-dashboard/areas-management/) (cabecera, tarjetas, modal camas, ARIA cobertura); más `@@usersMgmt.*` (columnas tabla, estados fila, sin resultados, hoja acciones, modal editar). **B-04:** [`areas-management.component.spec.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.spec.ts) shim + humo; [`users-management.component.spec.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.spec.ts) prueba `userTableRowAriaLabel`. |
| 181 | Lote paralelo: B-03 completeTask facade + B-05 farmacia export/print i18n + B-04 specs | Hecha | **B-03:** [`NurseDashboardCompleteTaskFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-complete-task.facade.ts) + spec; cuatro llamadas `completeTask` en [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) delegan en `completeByScheduleId`. **B-05:** `@@pharmacyModule.*` para CSV/Excel historial e inventario (cabeceras y claves de columnas), impresión (`printRowsAsTable`: vacío, prefijo generado, títulos), toasts/aviso export, hojas Excel, tipos fila Entrega/Rechazo. **B-04:** [`pharmacy-dashboard.component.spec.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.spec.ts) (cabeceras export/impresión). |
| 182 | Lote paralelo: B-03 facades tarea/horario/tratamiento nurse + B-05 farmacia errores carga + B-04 specs | Hecha | **B-03:** [`NurseDashboardTaskLifecycleFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-task-lifecycle.facade.ts) (`markNotCompleted` / `postpone`), [`NurseDashboardPatientScheduleWriteFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-patient-schedule-write.facade.ts) (`deleteSchedule`), [`NurseDashboardTreatmentScheduleFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-treatment-schedule.facade.ts) (`patchAction`) + specs; cableado en [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts). **B-05:** `@@pharmacyModule.errLoadInventory`, `errLoadRequests`, `errLoadRequestsToast`, `errLoadHistory` en carga (`loadData` / `loadRequests` / `loadHistory`). **B-04:** specs de las tres facades + [`pharmacy-dashboard.component.spec.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.spec.ts) (errores de carga). |
| 183 | Lote paralelo: B-03 facades clínica/historial/medicación nurse + B-05 farmacia inventario + B-04 specs | Hecha | **B-03:** [`NurseDashboardPatientClinicalWriteFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-patient-clinical-write.facade.ts) (observaciones + PATCH clínica), [`NurseDashboardAdministrationHistoryWriteFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-administration-history-write.facade.ts) (`deleteHistory`), [`NurseDashboardMedicationMutationFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-medication-mutation.facade.ts) (suspender / borrar / reactivar) + specs; [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) deja de inyectar `NurseService` en el constructor; posponer tratamiento usa `NurseDashboardTreatmentScheduleFacade`. **B-05:** `@@pharmacyModule.*` en alta/borrado/movimiento de inventario y confirmación de borrado. **B-04:** specs nuevas de facades + humo cadenas inventario en [`pharmacy-dashboard.component.spec.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.spec.ts). |
| 184 | Lote paralelo: B-03 facades modales nurse + B-05 farmacia detalle solicitud + B-04 specs | Hecha | **B-03:** [`NurseDashboardPatientRecordPatchFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-patient-record-patch.facade.ts) (`patchAdministrationHistory`, `patchPatientSchedule`) + spec; [`NurseDashboardPatientCareCreateFacade`](../src/app/components/nurse-dashboard/facades/nurse-dashboard-patient-care-create.facade.ts) (`addMedication`, `addTreatment`) + spec; modales [`nurse-history-edit-modal`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/), [`nurse-schedule-edit-modal`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/), [`nurse-add-medication-modal`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/), [`nurse-add-treatment-modal`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/) con `providers` + inyección de facade (sin `NurseService` en el componente). **B-05:** `@@pharmacyModule.infoRequestDetails` en resumen `viewRequestDetails`. **B-04:** specs de facades nuevas + ajustes en specs de modales + prueba `viewRequestDetails` en [`pharmacy-dashboard.component.spec.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.spec.ts). |
| 185 | B-05 farmacia asistencia turno `$localize` + nombre usuario por defecto + B-04 specs | Hecha | **B-05:** [`pharmacy-shift-attendance-section`](../src/app/components/pharmacy-shift-attendance-section/) — **`@@pharmacyAttendance.*`** (errores HTTP por defecto, avisos/toasts al guardar, títulos cobertura/asistencia con interpolación, cabeceras tabla, etiquetas de estado, botón guardar); [`pharmacy-dashboard.component.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.ts): **`@@pharmacyModule.defaultPharmacyUserName`** en `pharmacyUserName`; `staffContactLabel` sin contacto usa **`pharmacyEmDash`**. **B-04:** [`pharmacy-shift-attendance-section.component.spec.ts`](../src/app/components/pharmacy-shift-attendance-section/pharmacy-shift-attendance-section.component.spec.ts) (shim, humo cadenas, guardado sin fecha/turno, error `getWorkShifts`); [`pharmacy-dashboard.component.spec.ts`](../src/app/components/pharmacy-dashboard/pharmacy-dashboard.component.spec.ts) — describe sin usuario (nombre por defecto + `headerUserName`). |
| 186 | B-05 admin pacientes i18n + `ShiftRealtimeService` etiqueta turno + B-04 specs | Hecha | **B-05:** [`patients-management`](../src/app/components/admin-dashboard/patients-management/) — `i18n` / **`$localize`** (`@@adminPatients.*`) en formulario ingreso, filtros, tabla, export (claves columnas), toasts/confirmaciones, resumen hoja de acciones; orden enfermera sin asignar vía **`isPatientNurseUnassigned`** (sin comparar texto localizado); columna área alineada con **`adminPatientsNoArea`**. **B-05:** [`shift-realtime.service.ts`](../src/app/shared/services/shift-realtime.service.ts) — **`@@shiftRealtime.*`** en `formatShiftLabel` (hint asistencia farmacia / enfermería). **B-04:** [`patients-management.component.spec.ts`](../src/app/components/admin-dashboard/patients-management/patients-management.component.spec.ts) (shim + humo cadenas); [`shift-realtime.service.spec.ts`](../src/app/shared/services/shift-realtime.service.spec.ts). |
| 187 | B-05 `users-management` flujos TS `$localize` + B-04 humo cadenas | Hecha | **B-05:** [`users-management.component.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.ts) — **`@@usersMgmt.*`** en validaciones (rol, formulario, email, teléfono, roster farmacia), confirmación doble al pasar de enfermera a otro rol (`updateRole` / `updateUser`), toasts éxito/error (rol, usuario, borrado, restauración, export CSV), errores HTTP al cargar usuarios/supervisores/farmacia (incl. 500 con detalle), mensaje confirmación borrado interpolado (`buildDeleteUserConfirmMessage`), claves columnas export; **`getRoleLabel`** delega en **`usersMgmtRoleFilterOptions`**. **B-04:** [`users-management.component.spec.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.spec.ts) — humo adicional toasts/export/errores. |
| 188 | B-05 `beds-management` flujos TS/resumen + B-04 spec | Hecha | **B-05:** [`beds-management.component.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.ts) — más **`@@bedsMgmt.*`**: cobertura turno (`getAreaShiftNotice`), nombres de área, hoja resumen cama (etiquetas y notas paciente), `getBedStatusLabel` / `getPatientNameForBed` / asignación cruzada, toasts y confirmaciones (alta/liberación/asignación/estado/diagnóstico/borrado), errores carga listados paciente, `cancelText` liberar cama; comparaciones de estado por **`getBedClass`** (no por texto localizado de «Ocupada»). **B-04:** [`beds-management.component.spec.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.spec.ts) — mocks **`AdminPatientBedAssignmentService`** / **`AdminShiftCoverageAlertNavigationService`**; humo cadenas flujo. |
| 189 | B-05 staff + áreas TS `$localize` (lote) + B-04 humo | Hecha | **B-05:** [`staff-management.component.ts`](../src/app/components/admin-dashboard/staff-management/staff-management.component.ts) — **`@@staffMgmt.*`**: turno activo cabecera, etiquetas operativas (`getOperationalStatusLabel`), teléfono sin registrar, validación área/teléfono, CRUD enfermera y modales asignación área/paciente/cama, hoja resumen paciente, `cancelText` quitar asignación, helpers `getAreaName` / `getPatientBed`. **B-05:** [`areas-management.component.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.ts) — más **`@@areasMgmt.*`** en toasts/confirmaciones (área/camas masivas, alta cama, edición, borrar cama/área, liberar paciente, asignar/cambiar área paciente), `normalizePatientsData` sin literal «Sin área». **B-04:** humo en [`staff-management.component.spec.ts`](../src/app/components/admin-dashboard/staff-management/staff-management.component.spec.ts) (shim `$localize`) y [`areas-management.component.spec.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.spec.ts). |
| 190 | B-05 `schedules-management` TS `$localize` + B-04 spec humo | Hecha | **B-05:** [`schedules-management.component.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.ts) — **`@@schedMgmt.*`**: toasts (carga semanal, resumen enfermera, horarios turno, asistencia con reparto/handoff, historial vacío, guardado programación individual/masiva, asignación semanal/rápida, limpieza), confirmaciones `cancelText` / Sí / No, títulos y etiquetas de estado en resumen de asistencia, `getAreaName`, grupo «sin área», nombre de hoja Excel historial. **B-04:** [`schedules-management.component.spec.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.spec.ts) — **`ensureLocalizeShim`**, humo `@@schedMgmt.*`, `getAreaName` / etiquetas asistencia. |
| 191 | B-05 `schedules-management` HTML `i18n` + TS helpers ARIA/modales + B-04 spec | Hecha | **B-05:** [`schedules-management.component.html`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.html) — **`@@schedMgmtHtml.*`** en cabecera tiempo real, badges de resumen, alerta de cobertura, tablas toma de lista, filtros, configuración de turnos, historial, export, modales (edición horario, historial, día de descanso) y acciones de asistencia. **B-05:** [`schedules-management.component.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.ts) — **`@@schedMgmtHtml.*`** en fallbacks de modal, títulos con interpolación (`getEditShiftModalTitle`, `getShiftConfigModalTitle`, líneas resumen), **ARIA** (`getAriaLabelSummaryAttendance`, `getAriaLabelAttendanceListRow`, `getAriaLabelShiftConfigRow`), **`getResolvedShiftLabelForDisplay`**. **B-04:** spec ampliado (helpers). |
| 192 | B-05 `staff-management` HTML `i18n` + TS helpers modales/ARIA/cama + B-04 spec | Hecha | **B-05:** [`staff-management.component.html`](../src/app/components/admin-dashboard/staff-management/staff-management.component.html) — **`@@staffMgmtHtml.*`** (cabecera, filtros, estados vacío/error/carga, tarjeta enfermera, detalle, tablas pacientes, modales editar/gestionar/cambiar área/asignar área/seleccionar cama). **B-05:** [`staff-management.component.ts`](../src/app/components/admin-dashboard/staff-management/staff-management.component.ts) — **`@@staffMgmtHtml.*`** y **`$localize`** en ARIA (`getAriaLabelAssignAreaToNurse`, `getAriaLabelPatientRow`), textos alerta sin área, títulos modales interpolados, **`formatBedOptionLabel`**, **`staffHtmlSaving` / `staffHtmlSave`**. **B-04:** [`staff-management.component.spec.ts`](../src/app/components/admin-dashboard/staff-management/staff-management.component.spec.ts) — prueba de helpers. |
| 193 | B-05 `beds-management` HTML `i18n` + TS helpers ARIA/modales/tablas + B-04 spec | Hecha | **B-05:** [`beds-management.component.html`](../src/app/components/admin-dashboard/beds-management/beds-management.component.html) — marcadores **`i18n`** / **`@@bedsMgmtHtml.*`** (cobertura, tarjetas de cama, vacíos, modales acciones/editar/crear/asignación, tablas pacientes). **B-05:** [`beds-management.component.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.ts) — **`@@bedsMgmtHtml.*`** en ARIA (`getAriaBedCard`, `getAriaShiftCoverageResolve`, …), títulos modales interpolados, textos de tabla/ayuda. **B-04:** [`beds-management.component.spec.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.spec.ts) — humo de helpers. |
| 194 | B-05 `areas-management` plantilla `$localize` + helpers + B-04 spec | Hecha | **B-05:** [`areas-management.component.html`](../src/app/components/admin-dashboard/areas-management/areas-management.component.html) — literales sustituidos por enlaces a **`@@areasMgmtHtml.*`** / **`@@areasMgmt.*`** en TS (cabeceras de tabla, modales, secciones pacientes, asignación/cambio de área–cama, hojas de acciones). **B-05:** [`areas-management.component.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.ts) — nuevos **`readonly`** y métodos (`getAriaAreaBedRow`, `getAreaPatientsModalTitle`, `getAreaFormModalTitle`, `getAreaBedsCountFormLabel`, `formatBedAssignmentOptionLabel`, líneas de resumen de hojas, `getPatientFullName`, `areaBedsSheetSummary` localizado). **B-04:** [`areas-management.component.spec.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.spec.ts) — humo de helpers. |
| 195 | B-05 `users-management` plantilla modales/resultados + `@@usersMgmtHtml.*` + B-04 spec | Hecha | **B-05:** [`users-management.component.html`](../src/app/components/admin-dashboard/users-management/users-management.component.html) — textos de **resultados**, **tabla** (guión sin teléfono), **modal editar** y **modal cambiar rol** enlazados a TS. **B-05:** [`users-management.component.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.ts) — **`@@usersMgmtHtml.*`** (etiquetas, placeholders, opciones de rol, avisos, título modal rol); métodos **`getUsersResultsLine`**, **`getUsersResultsRolePart`**, **`getUsersResultsSearchPart`**; **`userRowActionsSummary`** y guión con **`$localize`**. **B-04:** [`users-management.component.spec.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.spec.ts) — humo de resultados y resumen de hoja. |
| 196 | B-05 overview error stats `$localize` + patients tabla guión + B-04 specs | Hecha | **B-05:** [`overview.component.ts`](../src/app/components/admin-dashboard/overview/overview.component.ts) — **`@@adminOverview.errLoadStats`** como fallback de error en **`loadStats`**; **`liveCurrentShiftLabel`** inicial vacío (etiqueta la rellena **`ShiftRealtimeService.formatShiftLabel`**). **B-05:** [`patients-management.component.html`](../src/app/components/admin-dashboard/patients-management/patients-management.component.html) — cama sin número con **`adminPatientsEmDash`** (guión localizado). **B-04:** [`overview.component.spec.ts`](../src/app/components/admin-dashboard/overview/overview.component.spec.ts) — shim **`$localize`**, **`TestBed.resetTestingModule`**, humo **`adminOverviewErrLoadStats`** y describe de fallo **`forkJoin`**; [`patients-management.component.spec.ts`](../src/app/components/admin-dashboard/patients-management/patients-management.component.spec.ts) — aserción **`adminPatientsEmDash`**. |
| 197 | B-05 `pharmacy-coverage-summary-card` i18n + error TS + B-04 spec + supervisor spec | Hecha | **B-05:** [`pharmacy-coverage-summary-card.component.html`](../src/app/shared/components/pharmacy-coverage-summary-card/pharmacy-coverage-summary-card.component.html) — **`i18n`** / **`@@pharmacyCoverageCard.*`** (título, fecha, carga, sin teléfono, sin encargado). **B-05:** [`pharmacy-coverage-summary-card.component.ts`](../src/app/shared/components/pharmacy-coverage-summary-card/pharmacy-coverage-summary-card.component.ts) — **`pharmacyCoverageErrLoad`** con **`@@pharmacyCoverageCard.errLoad`**. **B-04:** [`pharmacy-coverage-summary-card.component.spec.ts`](../src/app/shared/components/pharmacy-coverage-summary-card/pharmacy-coverage-summary-card.component.spec.ts) — humo + fallo servicio; [`supervisor-dashboard.component.spec.ts`](../src/app/components/supervisor-dashboard/supervisor-dashboard.component.spec.ts) — humo shell. |
| 198 | B-05 `staff-dashboard-quick-actions` i18n + B-04 `StaffQuickActionsService` spec | Hecha | **B-05:** [`staff-quick-actions.service.ts`](../src/app/shared/components/staff-dashboard-quick-actions/staff-quick-actions.service.ts) — **`@@staffQuickActions.*`** (toasts handover/reportes, CSV/Excel, fallback ID enfermera, separador periodo reportes, `LOCALE_ID` en fechas y `localeCompare`). **B-05:** [`staff-dashboard-quick-actions-toolbar.component.html`](../src/app/shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-toolbar.component.html) — **`i18n`** / **`@@staffQuickActionsHtml.*`** (ARIA grupo, Coordinación, Pendiente, Reportes). **B-05:** [`staff-dashboard-quick-actions-modals.component.ts`](../src/app/shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-modals.component.ts) + [`staff-dashboard-quick-actions-modals.component.html`](../src/app/shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-modals.component.html) — sufijo ámbito reportes (`@@staffQuickActionsHtml.reportsScopeSuffix`). **B-04:** [`staff-quick-actions.service.spec.ts`](../src/app/shared/components/staff-dashboard-quick-actions/staff-quick-actions.service.spec.ts) — humo mensajes + error carga handover + guardado vacío. |
| 199 | B-05 modales día medicación / detalle tarea + B-04 specs | Hecha | **B-05:** [`nurse-medication-day-detail-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component.ts) — `inject(LOCALE_ID)` en **`scheduledLabel`** / **`selectedDayLabel`**; **`emDash()`** vía **`nurseUiEmDash`**. **B-05:** [`nurse-medication-day-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component.html) — guiones vacíos con **`emDash()`**; **`i18n`** **`@@nurseMedicationDayDetailModal.lineConsideredDate`**. **B-05:** [`nurse-pending-task-detail-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.ts) — **`@@nursePendingTaskDetailModal.type*`** / **`status*`**; `LOCALE_ID` en **`scheduledDetailLabel`**; **`emDash()`**. **B-05:** [`nurse-pending-task-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.html) — **`emDash()`** en descripción/medicamento. **B-04:** specs ampliados en ambos **`.component.spec.ts`**. |
| 200 | B-05 `nurse-history-detail-modal` rejilla/badges i18n + `LOCALE_ID` + `emDash` + B-04 spec | Hecha | **B-05:** [`nurse-history-detail-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.ts) — `inject(LOCALE_ID)` en **`formatMaybeDateTime`**; vacíos con **`nurseUiEmDash`**; **`emDash()`** expuesto. **B-05:** [`nurse-history-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.html) — **`i18n`** **`@@nurseHistoryDetailModal.badgePostponed`**, **`badgeNotes`**, **`kvTableDateTime`**, **`kvProfessional`**, **`kvActualTime`**, **`kvPlannedSlot`**; descripción/profesional con **`emDash()`**. **B-04:** [`nurse-history-detail-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.spec.ts) — **`formatMaybeDateTime`** + rejilla. |
| 201 | B-05 `nurse-clinical-notes-scope-block` i18n + `LOCALE_ID` + B-04 spec | Hecha | **B-05:** [`nurse-clinical-notes-scope-block.component.ts`](../src/app/components/nurse-dashboard/nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component.ts) — **`@@ncnsb.*`** (vacío, vista previa, lista, pin, autor, **`expandAllLabel`**); `inject(LOCALE_ID)` en fecha/hora detalle; **`nurseUiEmDash`**. **B-05:** [`nurse-clinical-notes-scope-block.component.html`](../src/app/components/nurse-dashboard/nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component.html) — **`i18n`** metadetalle y cierres. **B-04:** [`nurse-clinical-notes-scope-block.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-clinical-notes-scope-block/nurse-clinical-notes-scope-block.component.spec.ts). |
| 202 | B-05 tareas: `taskActions` fallback + `LOCALE_ID` en completar + modal no realizado `emDash` + B-04 specs | Hecha | **B-05:** [`nurse-dashboard-task-actions.helpers.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-task-actions.helpers.ts) — **`@@nurseDashboard.taskActions.displayFallback`**; **`completeTaskLocally`** con **`toLocaleString(localeId)`**. **B-05:** [`nurse-not-completed-task-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.ts) — **`nurseUiEmDash`** en **`patientLine`** / **`taskLine`**. **B-05:** [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) — `inject(LOCALE_ID)` y paso a **`completeTaskLocally`**. **B-04:** [`nurse-dashboard-task-actions.helpers.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-task-actions.helpers.spec.ts), [`nurse-not-completed-task-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.spec.ts). |
| 203 | B-05 vista paciente: previews/emDash + ARIA modal tareas + B-04 specs | Hecha | **B-05:** [`nurse-pending-task-description.helpers.ts`](../src/app/components/nurse-dashboard/nurse-pending-task-description.helpers.ts) — **`nurseUiEmDash`** sin descripción. **B-05:** [`nurse-tasks-quick-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.ts) — **`nurseUiEmDash`** en **`descriptionPreview`**; **`@@nurseTasksQuickModal.*`** en **`taskRowAriaLabel`**. **B-05:** [`nurse-patient-medications-tab`](../src/app/components/nurse-dashboard/nurse-patient-medications-tab/) — **`emDash`**, **`slotDosageCell`**, diagnóstico vacío vs **`nurseUiEmDash`**, resumen acciones sin notas. **B-05:** [`nurse-patient-treatments-day-tab.component.ts`](../src/app/components/nurse-dashboard/nurse-patient-treatments-day-tab/nurse-patient-treatments-day-tab.component.ts) — notas vacías con **`nurseUiEmDash`**. **B-04:** [`nurse-pending-task-description.helpers.spec.ts`](../src/app/components/nurse-dashboard/nurse-pending-task-description.helpers.spec.ts), [`nurse-tasks-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.spec.ts), [`nurse-patient-medications-tab.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-medications-tab/nurse-patient-medications-tab.component.spec.ts), [`nurse-patient-treatments-day-tab.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-treatments-day-tab/nurse-patient-treatments-day-tab.component.spec.ts). |
| 204 | B-05 sección tareas + tab tratamientos: ARIA `$localize` + notas tabla `emDash` + B-04 specs | Hecha | **B-05:** [`nurse-tasks-section.component.ts`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.ts) — **`@@nurseTasksSection.*`** en **`taskRowAriaLabel`** (tipos de tarea, plantilla ARIA, palabra cama). **B-05:** [`nurse-patient-treatments-day-tab`](../src/app/components/nurse-dashboard/nurse-patient-treatments-day-tab/) — **`notesCellDisplay`** + **`@@nursePatientTreatmentsDayTab.rowAriaOpenActions`** en fila. **B-04:** [`nurse-tasks-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.spec.ts), [`nurse-patient-treatments-day-tab.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-treatments-day-tab/nurse-patient-treatments-day-tab.component.spec.ts). |
| 205 | B-05 ficha paciente + lista: ARIA filas `$localize` + B-04 specs | Hecha | **B-05:** [`nurse-patient-medications-tab.component.ts`](../src/app/components/nurse-dashboard/nurse-patient-medications-tab/nurse-patient-medications-tab.component.ts) — **`medicationRowAriaLabel`** (`@@nursePatientMedicationsTab.rowAriaOpenMedicationSlot`). **B-05:** [`nurse-patient-history-tab.component.ts`](../src/app/components/nurse-dashboard/nurse-patient-history-tab/nurse-patient-history-tab.component.ts) — **`historyRecordRowAriaLabel`** (`@@nursePatientHistoryTab.rowAriaOpenDetail`). **B-05:** [`nurse-patients-assigned-section`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/) — **`patientCardAriaLabel`** (`@@nursePatientsAssigned.rowAriaViewPatientDetail`). **B-04:** [`nurse-patient-medications-tab.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-medications-tab/nurse-patient-medications-tab.component.spec.ts), [`nurse-patient-history-tab.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-history-tab/nurse-patient-history-tab.component.spec.ts), [`nurse-patients-assigned-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.spec.ts). |
| 206 | B-05 farmacia/cabecera/editar cama: ARIA `i18n` + fila paciente `$localize` + B-04 specs | Hecha | **B-05:** [`nurse-pharmacy-section.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.html) — **`i18n-aria-label`** región contacto por turno (`@@nursePharmacySection.contactShiftRegionAriaLabel`). **B-05:** [`nurse-dashboard-header-search.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.html) — **`@@nurseDashboardHeaderSearch.inputAriaLabel`**. **B-05:** [`nurse-edit-bed-modal`](../src/app/components/nurse-dashboard/nurse-edit-bed-modal/) — **`i18n-aria-label`** radiogrupo/tabla; **`patientRowSelectAriaLabel`** (`@@nurseEditBedModal.rowSelectPatient`). **B-04:** [`nurse-pharmacy-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.spec.ts), [`nurse-dashboard-header-search.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.spec.ts), [`nurse-edit-bed-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-edit-bed-modal/nurse-edit-bed-modal.component.spec.ts). |
| 207 | B-05 camas + cabecera: `i18n-title` tooltips + B-04 specs | Hecha | **B-05:** [`nurse-beds-section.component.html`](../src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.html) — **`i18n-title`** tarjeta cama (`@@nurseBedsSection.cardEditBedTitle`) y botón detalles (`@@nurseBedsSection.btnViewPatientTitle`). **B-05:** [`nurse-dashboard-header-search.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.html) — **`@@nurseDashboardHeaderSearch.searchHintTitle`**. **B-04:** [`nurse-beds-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.spec.ts), [`nurse-dashboard-header-search.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.spec.ts). |
| 208 | B-05 tareas/farmacia/reportes/pacientes/resumen/slots: `i18n-title` tooltips + B-04 specs | Hecha | **B-05:** [`nurse-tasks-section.component.html`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.html) — **`@@nurseTasksSection.btnAddTaskTitle`**, **`btnAddMedicationTitle`**, **`exportDayHistoryCsvTitle`**. **B-05:** [`nurse-pharmacy-section.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.html) — **`@@nursePharmacySection.selectAllCheckboxTitle`**, **`viewPatientsWhoNeedMedTitle`**. **B-05:** [`nurse-reports-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.html) — **`@@nurseReportsModal.downloadCsvComplianceTitle`** / **`downloadCsvMedicationTitle`** / **`downloadExcelComplianceTitle`** / **`downloadExcelMedicationTitle`**. **B-05:** [`nurse-patients-assigned-section.component.html`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.html) — badges + **`@@nursePatientsAssigned.btnViewPatientDetailsTitle`**. **B-05:** [`nurse-summary-section.component.html`](../src/app/components/nurse-dashboard/nurse-summary-section/nurse-summary-section.component.html) — **`@@nurseSummarySection.handoverTileTitle`**. **B-05:** [`nurse-schedule-slots-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.html) — **`@@nurseScheduleSlotsModal.hasNotesIconTitle`**. **B-04:** specs en los seis **`.component.spec.ts`** anteriores. |
| 209 | B-05 cabecera + pacientes área: `i18n-placeholder` búsqueda + B-04 specs | Hecha | **B-05:** [`nurse-dashboard-header-search.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.html) — **`@@nurseDashboardHeaderSearch.inputPlaceholder`**. **B-05:** [`nurse-patients-assigned-section.component.html`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.html) — **`@@nursePatientsAssigned.searchPlaceholder`**. **B-04:** [`nurse-dashboard-header-search.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.spec.ts), [`nurse-patients-assigned-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.spec.ts). |
| 210 | B-05 modal reportes: filtro enfermera + periodo + carga `i18n` + B-04 specs | Hecha | **B-05:** [`nurse-reports-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.html) — **`@@nurseReportsModal.periodPrefix`**; **`@@nurseReportsModal.staffNurseFilterLabel`** / **`staffNurseSelectAriaLabel`** / **`staffNurseOptionAll`**; **`@@nurseReportsModal.loadingMessage`**. **B-04:** [`nurse-reports-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.spec.ts) — periodo, filtro staff, **`staffNurseFilterChange`**. |
| 211 | B-05 modal reportes: secciones, tablas, vacíos y Cerrar `i18n` + B-04 specs | Hecha | **B-05:** [`nurse-reports-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.html) — **`@@nurseReportsModal.sectionComplianceTitle`** / **`sectionMedicationTitle`**; cabeceras **`colPatient`**, **`colCompliance`**, **`colMed*`**; vacíos **`emptyComplianceCancelled`** / **`emptyComplianceFiltered`**, **`emptyMedicationCancelled`** / **`emptyMedicationFiltered`**; **`@@nurseReportsModal.closeButton`**. **B-04:** mismo **`.component.spec.ts`** (títulos, tablas, Cerrar, filtro cancelados). |
| 212 | B-05 `nurse-tasks-section` plantilla visible `i18n` + B-04 specs | Hecha | **B-05:** [`nurse-tasks-section.component.html`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.html) — título pendientes, botones **Nueva tarea** / **Nuevo medicamento**, filtros (paciente/horario, **Todos los pacientes**, opciones de ventana horaria, **Limpiar filtros**), cabeceras tabla pendientes (`pendingCol*`), tipos de fila (`pendingType*`), vacíos pendientes; bloque historial del día (título, subtítulo, pista expandir, export CSV, **Ocultar**/**Mostrar**, otra fecha, carga `dayHistoryLoading`, `dayHistoryCol*`, `historyType*`, `historyStatusCompleted`/`historyStatusMissed`, vacío sin registros). **B-04:** [`nurse-tasks-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.spec.ts) — humo título, filtros, `<th>` y opciones del `<select>` de horario. |
| 213 | B-05 `nurse-summary-section` KPIs visibles `i18n` + B-04 spec | Hecha | **B-05:** [`nurse-summary-section.component.html`](../src/app/components/nurse-dashboard/nurse-summary-section/nurse-summary-section.component.html) — **`@@nurseSummarySection.sectionTitle`**; etiquetas e indicaciones de clic de las ocho tarjetas (`stat*Label`, `stat*HintClick`, `handoverTileValueTitle` / `handoverTileStatLabel` / `handoverTileHintClick`, `reportsTile*`); se mantiene **`handoverTileTitle`** (**#208**). **B-04:** [`nurse-summary-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-summary-section/nurse-summary-section.component.spec.ts) — humo título **#nurse-summary-section-title** y varias **`.stat-label`**. |
| 214 | B-05 `nurse-pharmacy-section` plantilla + estados historial `$localize` + B-04 specs | Hecha | **B-05:** [`nurse-pharmacy-section.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.html) — título hoy, badges resumen, intro contactos turno, vacíos contacto, cabeceras **`todayCol*`** / **`historyCol*`**, dosis/pacientes (ICU plural **`patientCountLine`**), fila estado **Solicitado**/**Pendiente**, botón enviar, vacío lista, bloque historial (título, subtítulo, pista colapsada, **Ocultar**/**Mostrar**, fecha, carga, vacío sin solicitudes); **`pharmacyContactDisplayName`** + **`statusLabel`** en [`nurse-pharmacy-section.component.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.ts) con **`$localize`** (`@@nursePharmacySection.contactFallbackName`, **`status*`**). **B-04:** [`nurse-pharmacy-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.spec.ts) — humo títulos/cabeceras, **`statusLabel`**, **`pharmacyContactDisplayName`**. |
| 215 | B-05 `nurse-patients-assigned-section` lista + clínico compacto `i18n`/`$localize` + B-04 specs | Hecha | **B-05:** [`nurse-patients-assigned-section.component.html`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.html) — **`@@nursePatientsAssigned.*`** (título **#nurse-patients-area-title**, etiquetas búsqueda/filtro, opciones **`<select>`**, **Limpiar filtros**, badges **Mi paciente**/**Sin asignar**, **Detalles**, edad, KPI medicamentos/tratamientos, vacío); se mantienen **`i18n-placeholder`** (**#209**) y **`i18n-title`** en badges/botón (**#208**). **B-05:** [`nurse-patients-assigned-section.component.ts`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.ts) — **`$localize`** en **`clinicalDiagnosisBlockLabel`** / vacíos y bloque médico. **B-04:** [`nurse-patients-assigned-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.spec.ts) — humo título, **`<select>`**, **`.ncnsb__block-label`**, asserts flexibles **Detalles**/vacío. |
| 216 | B-05 shell enfermería `$localize` + chip entrega `i18n` + B-04 main-nav | Hecha | **B-05:** [`nurse-dashboard.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard.component.html) + [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) — **`@@nurseDashboard.shellPanelTitle`**, **`shellRoleLabel`**, **`shellNavAriaLabel`**, **`shellLogoSectionAriaLabel`** en enlaces del **`app-dashboard-shell`**. **B-05:** [`nurse-dashboard-main-nav.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard-main-nav/nurse-dashboard-main-nav.component.html) — **`@@nurseDashboardMainNav.quick.handoverPendingChip`** (texto **Pendiente** junto a **Entrega**). **B-04:** [`nurse-dashboard-main-nav.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-main-nav/nurse-dashboard-main-nav.component.spec.ts) — acciones rápidas por índice en **`.nurse-nav-tablist`**, humo chip pendiente. |
| 217 | B-05 `nurse-beds-section` plantilla + clínico `$localize` + B-04 specs | Hecha | **B-05:** [`nurse-beds-section.component.html`](../src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.html) — **`@@nurseBedsSection.*`** (título **#nurse-beds-section-title**, subtítulo con contador y área, **Ocupada**/**Disponible**, **Detalles**, edad, vacío cama libre + pista); se mantienen **`i18n-title`** tarjeta y botón (**#207**). **B-05:** [`nurse-beds-section.component.ts`](../src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.ts) — **`$localize`** en **`clinicalDiagnosis*`** / **`clinicalMedical*`** para **`ncnsb`**. **B-04:** [`nurse-beds-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.spec.ts) — humo cabecera, estado ocupada, **`.ncnsb__block-label`**, cama libre. |
| 218 | B-05 modal horarios + helper tratamientos hoy `$localize` + B-04 specs | Hecha | **B-05:** [`nurse-schedule-slots-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.html) — **`@@nurseScheduleSlotsModal.toggleShowMoreOther`** / **`toggleShowLessOther`**. **B-05:** [`nurse-schedule-slots-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.ts) — **`@@nurseScheduleSlotsModal.slotNoteWhenFallback`** en **`slotNotesList`**. **B-05:** [`nurse-treatments-today.helpers.ts`](../src/app/components/nurse-dashboard/nurse-treatments-today.helpers.ts) — **`treatmentSlotStatusLabel`** con **`@@nurseTreatment.todaySlot.status.*`** y **`nurseUiEmDash`** vacío. **B-04:** [`nurse-schedule-slots-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.spec.ts) (toggle otras fechas, **`slotNotesList`**); [`nurse-treatments-today.helpers.spec.ts`](../src/app/components/nurse-dashboard/nurse-treatments-today.helpers.spec.ts) (sin cambio de contrato). |
| 219 | B-05 modal entrega: intros/turno/botones `i18n` + opciones turno `$localize` + B-04 spec | Hecha | **B-05:** [`nurse-handover-modal.component.html`](../src/app/components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.html) — **`@@nurseHandoverModal.introPrimary`** / **`introMuted`**; **`shiftLabel`**; **`acknowledge`**; **`saving`** / **`save`** en botón **`#handover-save-btn`**. **B-05:** [`nurse-handover-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.ts) — **`shiftChoices`** con **`@@nurseHandoverModal.shiftChoiceMorning|Afternoon|Night`** (`HANDOVER_SHIFT_CHOICES` del servicio se mantiene para **`admin-team-handover-modal`**). **B-04:** [`nurse-handover-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.spec.ts) — input **`handoverShift`**, **`#handover-save-btn`**, humo intro/select. |
| 220 | B-05 ficha paciente: export CSV/Excel `i18n` + obs. vacíos `$localize` + B-04 specs | Hecha | **B-05:** [`nurse-patient-modal-shell.component.html`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component.html) — **`@@nursePatientModalShell.footerExportCsv`** / **`footerExportExcel`**; **`i18n-title`** **`exportCsvTitle`** / **`exportExcelTitle`**; **`#nurse-patient-export-csv-btn`** / **`#nurse-patient-export-excel-btn`**. **B-05:** [`nurse-patient-observations-tab.component.ts`](../src/app/components/nurse-dashboard/nurse-patient-observations-tab/nurse-patient-observations-tab.component.ts) — **`emptyLabelDiagnosis|Medical|Allergies|Special|General`** (`@@nursePatientObservationsTab.empty*`); [`nurse-patient-observations-tab.component.html`](../src/app/components/nurse-dashboard/nurse-patient-observations-tab/nurse-patient-observations-tab.component.html) — **`[emptyLabel]`** → **`ncnsb`**. **B-04:** [`nurse-patient-modal-shell.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component.spec.ts), [`nurse-patient-observations-tab.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-observations-tab/nurse-patient-observations-tab.component.spec.ts). |
| 221 | B-05 alta tratamiento + edición historial/horario: `i18n` Meses + placeholders + B-04 humo | Hecha | **B-05:** [`nurse-add-treatment-modal.component.html`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.html) — **`@@nurseAddTreatmentModal.unitMonths`**. **B-05:** [`nurse-history-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.html) — **`@@nurseHistoryEditModal.descriptionPlaceholder`** / **`reasonFieldPlaceholder`** (notas ya **`notesPlaceholder`**). **B-05:** [`nurse-schedule-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.html) — **`@@nurseScheduleEditModal.descriptionPlaceholder`** / **`notesPlaceholder`**. **B-04:** humo en [`nurse-add-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.spec.ts), [`nurse-add-treatment-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.spec.ts), [`nurse-history-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.spec.ts), [`nurse-schedule-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.spec.ts). |
| 222 | B-05 posponer tratamiento pista `i18n` + ids confirmar + B-04 humo modales farmacia/meds | Hecha | **B-05:** [`nurse-treatment-postpone-modal.component.html`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.html) — **`@@nurseTreatmentPostponeModal.dateTimeHint`**; **`#nurse-treatment-postpone-save-btn`**. **B-05:** [`nurse-postpone-task-modal.component.html`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.html) — **`#nurse-postpone-task-save-btn`**. **B-04:** [`nurse-treatment-postpone-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.spec.ts), [`nurse-postpone-task-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.spec.ts), [`nurse-pharmacy-patients-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/nurse-pharmacy-patients-modal.component.spec.ts), [`nurse-reactivate-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.spec.ts), [`nurse-delete-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.spec.ts). |
| 223 | B-05 tarea no realizada / suspensión / alta med / farmacia rápida: pistas `i18n` + ids acción + B-04 humo | Hecha | **B-05:** [`nurse-not-completed-task-modal.component.html`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.html) — **`@@nurseNotCompletedTaskModal.reasonHint`**; **`#nurse-not-completed-confirm-btn`**. **B-05:** [`nurse-suspend-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.html) — **`@@nurseSuspendMedicationModal.untilHint`**; **`#nurse-suspend-medication-confirm-btn`**. **B-05:** [`nurse-add-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.html) — **`#nurse-add-medication-submit-btn`**. **B-05:** [`nurse-pharmacy-quick-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.html) — **`#nurse-pharmacy-quick-send-request-btn`**. **B-04:** [`nurse-not-completed-task-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.spec.ts), [`nurse-suspend-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.spec.ts), [`nurse-add-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.spec.ts), [`nurse-pharmacy-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.spec.ts). |
| 224 | B-05 reactivar/eliminar/alta tratamiento + edición historial/horario: id guardar + pista borrado + B-04 humo | Hecha | **B-05:** [`nurse-reactivate-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.html) — **`#nurse-reactivate-medication-confirm-btn`**. **B-05:** [`nurse-delete-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.html) — **`@@nurseDeleteMedicationModal.reasonHint`**; **`#nurse-delete-medication-confirm-btn`**. **B-05:** [`nurse-add-treatment-modal.component.html`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.html) — **`#nurse-add-treatment-submit-btn`**. **B-05:** [`nurse-history-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.html) — **`#nurse-history-edit-save-btn`**. **B-05:** [`nurse-schedule-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.html) — **`#nurse-schedule-edit-save-btn`**. **B-04:** [`nurse-reactivate-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.spec.ts), [`nurse-delete-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.spec.ts), [`nurse-add-treatment-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.spec.ts), [`nurse-history-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.spec.ts), [`nurse-schedule-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.spec.ts). |
| 225 | B-05 detalle tarea/med/historial + modales rápidos: pista pie + ids cerrar/acciones + B-04 humo | Hecha | **B-05:** [`nurse-pending-task-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.html) — **`@@nursePendingTaskDetailModal.footerHint`**; **`#nurse-pending-task-detail-complete-btn`** / **`#nurse-pending-task-detail-not-completed-btn`** / **`#nurse-pending-task-detail-postpone-btn`** / **`#nurse-pending-task-detail-close-btn`**. **B-05:** [`nurse-medication-day-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component.html) — **`#nurse-medication-day-detail-close-btn`**. **B-05:** [`nurse-history-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.html) — **`#nurse-history-detail-close-btn`**. **B-05:** [`nurse-tasks-quick-modal.component.html`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.html) — **`#nurse-tasks-quick-open-module-btn`** / **`#nurse-tasks-quick-close-btn`**. **B-05:** [`nurse-pharmacy-quick-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.html) — **`#nurse-pharmacy-quick-open-module-btn`** / **`#nurse-pharmacy-quick-close-btn`**. **B-04:** [`nurse-pending-task-detail-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.spec.ts), [`nurse-medication-day-detail-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component.spec.ts), [`nurse-history-detail-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.spec.ts), [`nurse-tasks-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.spec.ts), [`nurse-pharmacy-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.spec.ts). |
| 226 | B-05 posponer / horarios / ficha / no realizada: ids **Cancelar**/**Cerrar**/**Imprimir**/toggle + B-04 humo | Hecha | **B-05:** [`nurse-postpone-task-modal.component.html`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.html) — **`#nurse-postpone-task-cancel-btn`**. **B-05:** [`nurse-treatment-postpone-modal.component.html`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.html) — **`#nurse-treatment-postpone-cancel-btn`**. **B-05:** [`nurse-schedule-slots-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.html) — **`#nurse-schedule-slots-close-btn`**; **`#nurse-schedule-slots-toggle-other-btn`**. **B-05:** [`nurse-patient-modal-shell.component.html`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component.html) — **`#nurse-patient-modal-close-btn`**; **`#nurse-patient-print-btn`**. **B-05:** [`nurse-not-completed-task-modal.component.html`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.html) — **`#nurse-not-completed-cancel-btn`**. **B-04:** [`nurse-postpone-task-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.spec.ts), [`nurse-treatment-postpone-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.spec.ts), [`nurse-schedule-slots-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.spec.ts), [`nurse-patient-modal-shell.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component.spec.ts), [`nurse-not-completed-task-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.spec.ts). |
| 227 | B-05 entrega / pacientes med / editar cama: ids **Cerrar**/**Cancelar**/**Aceptar**/**Guardar** + B-04 humo | Hecha | **B-05:** [`nurse-handover-modal.component.html`](../src/app/components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.html) — **`#nurse-handover-modal-close-btn`**; **`#nurse-handover-cancel-btn`**; **`#nurse-handover-acknowledge-btn`**; se mantiene **`#handover-save-btn`**. **B-05:** [`nurse-pharmacy-patients-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/nurse-pharmacy-patients-modal.component.html) — **`#nurse-pharmacy-patients-close-btn`**. **B-05:** [`nurse-edit-bed-modal.component.html`](../src/app/components/nurse-dashboard/nurse-edit-bed-modal/nurse-edit-bed-modal.component.html) — **`#nurse-edit-bed-modal-close-btn`**; **`#nurse-edit-bed-cancel-btn`**; **`#nurse-edit-bed-save-btn`**. **B-04:** [`nurse-handover-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.spec.ts), [`nurse-pharmacy-patients-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/nurse-pharmacy-patients-modal.component.spec.ts), [`nurse-edit-bed-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-edit-bed-modal/nurse-edit-bed-modal.component.spec.ts). |
| 228 | B-05 modales reportes/posponer/horarios/edición/tarea no realizada/farmacia rápida: id **✕** cabecera + pie **Cerrar** reportes + B-04 humo | Hecha | **B-05:** [`nurse-reports-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.html) — **`#nurse-reports-header-close-btn`**; **`#nurse-reports-footer-close-btn`**. **B-05:** [`nurse-postpone-task-modal.component.html`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.html) — **`#nurse-postpone-task-header-close-btn`**. **B-05:** [`nurse-treatment-postpone-modal.component.html`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.html) — **`#nurse-treatment-postpone-header-close-btn`**. **B-05:** [`nurse-schedule-slots-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.html) — **`#nurse-schedule-slots-header-close-btn`**. **B-05:** [`nurse-history-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.html) — **`#nurse-history-edit-header-close-btn`**. **B-05:** [`nurse-schedule-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.html) — **`#nurse-schedule-edit-header-close-btn`**. **B-05:** [`nurse-not-completed-task-modal.component.html`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.html) — **`#nurse-not-completed-header-close-btn`**. **B-05:** [`nurse-pharmacy-quick-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.html) — **`#nurse-pharmacy-quick-header-close-btn`**. **B-04:** [`nurse-reports-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.spec.ts), [`nurse-postpone-task-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/nurse-postpone-task-modal.component.spec.ts), [`nurse-treatment-postpone-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.spec.ts), [`nurse-schedule-slots-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/nurse-schedule-slots-modal.component.spec.ts), [`nurse-history-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.spec.ts), [`nurse-schedule-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.spec.ts), [`nurse-not-completed-task-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.spec.ts), [`nurse-pharmacy-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.spec.ts). |
| 229 | B-05 ficha paciente + alta med/trat + mutación med + detalles + tareas rápida: id **✕** cabecera + B-04 humo | Hecha | **B-05:** [`nurse-patient-modal-shell.component.html`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component.html) — **`#nurse-patient-modal-header-close-btn`** (pie **`#nurse-patient-modal-close-btn`**). **B-05:** [`nurse-add-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.html) — **`#nurse-add-medication-header-close-btn`**; [`nurse-add-treatment-modal.component.html`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.html) — **`#nurse-add-treatment-header-close-btn`**; [`nurse-delete-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.html) — **`#nurse-delete-medication-header-close-btn`**; [`nurse-suspend-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.html) — **`#nurse-suspend-medication-header-close-btn`**; [`nurse-reactivate-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.html) — **`#nurse-reactivate-medication-header-close-btn`**; [`nurse-history-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.html) — **`#nurse-history-detail-header-close-btn`**; [`nurse-medication-day-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component.html) — **`#nurse-medication-day-detail-header-close-btn`**; [`nurse-pending-task-detail-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.html) — **`#nurse-pending-task-detail-header-close-btn`**; [`nurse-tasks-quick-modal.component.html`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.html) — **`#nurse-tasks-quick-header-close-btn`**. **B-04:** [`nurse-patient-modal-shell.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/nurse-patient-modal-shell.component.spec.ts), [`nurse-add-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.spec.ts), [`nurse-add-treatment-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.spec.ts), [`nurse-delete-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.spec.ts), [`nurse-suspend-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.spec.ts), [`nurse-reactivate-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.spec.ts), [`nurse-history-detail-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/nurse-history-detail-modal.component.spec.ts), [`nurse-medication-day-detail-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/nurse-medication-day-detail-modal.component.spec.ts), [`nurse-pending-task-detail-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.spec.ts), [`nurse-tasks-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.spec.ts). |
| 230 | B-05 pie **Cancelar** con id (edición historial/horario + alta med/trat + suspender/borrar/reactivar) + B-04 clics | Hecha | **B-05:** [`nurse-history-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.html) — **`#nurse-history-edit-cancel-btn`**. **B-05:** [`nurse-add-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.html) — **`#nurse-add-medication-cancel-btn`**; [`nurse-add-treatment-modal.component.html`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.html) — **`#nurse-add-treatment-cancel-btn`**; [`nurse-suspend-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.html) — **`#nurse-suspend-medication-cancel-btn`**; [`nurse-delete-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.html) — **`#nurse-delete-medication-cancel-btn`**; [`nurse-reactivate-medication-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.html) — **`#nurse-reactivate-medication-cancel-btn`**; [`nurse-schedule-edit-modal.component.html`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.html) — **`#nurse-schedule-edit-cancel-btn`**. **B-04:** [`nurse-history-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.spec.ts), [`nurse-add-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.spec.ts), [`nurse-add-treatment-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.spec.ts), [`nurse-suspend-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.spec.ts), [`nurse-delete-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/nurse-delete-medication-modal.component.spec.ts), [`nurse-reactivate-medication-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.spec.ts), [`nurse-schedule-edit-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.spec.ts). |
| 231 | B-05 modal reportes: ids KPI cumplimiento + descarga CSV/Excel + B-04 por id | Hecha | **B-05:** [`nurse-reports-modal.component.html`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.html) — **`#nurse-reports-kpi-scheduled-btn`**, **`#nurse-reports-kpi-completed-btn`**, **`#nurse-reports-kpi-missed-btn`**, **`#nurse-reports-kpi-cancelled-btn`**, **`#nurse-reports-kpi-rate-btn`**; **`#nurse-reports-download-csv-compliance-btn`**, **`#nurse-reports-download-csv-medication-btn`**, **`#nurse-reports-download-excel-compliance-btn`**, **`#nurse-reports-download-excel-medication-btn`**. **B-04:** [`nurse-reports-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.spec.ts). |
| 232 | B-05 farmacia rápida: id «seleccionar todos» + **Ver pacientes** por fila + B-04 | Hecha | **B-05:** [`nurse-pharmacy-quick-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.html) — **`#nurse-pharmacy-quick-select-all-checkbox`**; **`[attr.id]`** `nurse-pharmacy-quick-view-patients-` + índice de fila. **B-04:** [`nurse-pharmacy-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.spec.ts). |
| 233 | B-05 tareas rápidas: id **Limpiar filtros** + B-04 `clearFiltersRequested` | Hecha | **B-05:** [`nurse-tasks-quick-modal.component.html`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.html) — **`#nurse-tasks-quick-clear-filters-btn`**. **B-04:** [`nurse-tasks-quick-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.spec.ts). |
| 234 | B-05 modal pacientes farmacia: pie **Cerrar** con id + B-04 | Hecha | **B-05:** [`nurse-pharmacy-patients-modal.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/nurse-pharmacy-patients-modal.component.html) — **`#nurse-pharmacy-patients-footer-close-btn`** (`i18n` **`@@nursePharmacyPatientsModal.footerClose`**); se mantiene cabecera **`#nurse-pharmacy-patients-close-btn`**. **B-04:** [`nurse-pharmacy-patients-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/nurse-pharmacy-patients-modal.component.spec.ts). |
| 235 | B-05 sección farmacia (panel): ids alineados con farmacia rápida + B-04 | Hecha | **B-05:** [`nurse-pharmacy-section.component.html`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.html) — **`#nurse-pharmacy-section-select-all-checkbox`**; **`[attr.id]`** `nurse-pharmacy-section-view-patients-` + índice; **`#nurse-pharmacy-section-send-request-btn`**; **`#nurse-pharmacy-section-history-toggle-btn`**. **B-04:** [`nurse-pharmacy-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.spec.ts). |
| 236 | B-05 sección tareas (panel): ids cabecera, limpiar filtros, historial del día + B-04 | Hecha | **B-05:** [`nurse-tasks-section.component.html`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.html) — **`#nurse-tasks-section-add-task-btn`**; **`#nurse-tasks-section-add-medication-btn`**; **`#nurse-tasks-section-clear-filters-btn`**; **`#nurse-tasks-section-export-day-history-csv-btn`**; **`#nurse-tasks-section-day-history-toggle-btn`**. **B-04:** [`nurse-tasks-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.spec.ts). |
| 237 | B-05 `nurse-summary-section`: ids en las ocho tarjetas KPI/acciones + B-04 | Hecha | **B-05:** [`nurse-summary-section.component.html`](../src/app/components/nurse-dashboard/nurse-summary-section/nurse-summary-section.component.html) — **`#nurse-summary-section-stat-area-card`**, **`#nurse-summary-section-stat-patients-card`**, **`#nurse-summary-section-stat-pending-tasks-card`**, **`#nurse-summary-section-stat-medications-today-card`**, **`#nurse-summary-section-attention-pharmacy-btn`**, **`#nurse-summary-section-attention-tasks-next-hour-btn`**, **`#nurse-summary-section-handover-btn`**, **`#nurse-summary-section-reports-btn`**. **B-04:** [`nurse-summary-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-summary-section/nurse-summary-section.component.spec.ts). |
| 238 | B-05 `nurse-beds-section`: id por tarjeta + **Detalles** por fila + B-04 | Hecha | **B-05:** [`nurse-beds-section.component.html`](../src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.html) — **`[attr.id]`** `nurse-beds-section-bed-card-` + índice; **`nurse-beds-section-view-patient-`** + índice en cama ocupada. **B-04:** [`nurse-beds-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.spec.ts). |
| 239 | B-05 `nurse-patients-assigned-section`: **Limpiar filtros** + **Detalles** por fila + B-04 | Hecha | **B-05:** [`nurse-patients-assigned-section.component.html`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.html) — **`#nurse-patients-assigned-section-clear-filters-btn`**; **`[attr.id]`** `nurse-patients-assigned-section-view-details-` + índice (se mantiene **`#nurse-patients-area-title`**). **B-04:** [`nurse-patients-assigned-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.spec.ts). |
| 240 | B-05 `nurse-dashboard-main-nav`: ids accesos rápidos **Entrega** / **Reportes** + B-04 | Hecha | **B-05:** [`nurse-dashboard-main-nav.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard-main-nav/nurse-dashboard-main-nav.component.html) — **`#nurse-dashboard-main-nav-handover-quick-btn`**, **`#nurse-dashboard-main-nav-reports-quick-btn`** (pestañas **`#nurse-tab-*`** sin cambio). **B-04:** [`nurse-dashboard-main-nav.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-main-nav/nurse-dashboard-main-nav.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts). |
| 241 | B-05 `nurse-dashboard-header-search`: id input búsqueda + B-04 | Hecha | **B-05:** [`nurse-dashboard-header-search.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.html) — **`#nurse-dashboard-header-search-input`**. **B-04:** [`nurse-dashboard-header-search.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts). |
| 242 | B-05 shell enfermería: contenedor acciones cabecera + B-04 | Hecha | **B-05:** [`nurse-dashboard.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard.component.html) — **`#nurse-dashboard-shell-header-actions`** (notificaciones + buscador). **B-04:** E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts). |
| 243 | B-05 campana notificaciones in-app: ids por `dashboardKind` + B-04 | Hecha | **B-05:** [`in-app-notifications-bell.component.html`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.html) + [`in-app-notifications-bell.component.ts`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.ts) — **`in-app-notifications-bell-${kind}-toggle`**, **`-panel`**, **`-mark-all-read-btn`**, **`-refresh-btn`**. **B-04:** [`in-app-notifications-bell.component.spec.ts`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts). |
| 244 | B-05 `dashboard-shell` compartido: ids logo, perfil, logout + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-logo-section`**, **`#dashboard-shell-profile-trigger-btn`**, **`#dashboard-shell-logout-btn`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts). |
| 245 | B-05 `staff-dashboard-shell`: ids cabecera con `idPrefix` + B-04 | Hecha | **B-05:** [`staff-dashboard-shell.component.html`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.html) — **`${idPrefix}-shell-logo-section`**, **`${idPrefix}-shell-profile-trigger-btn`**, **`${idPrefix}-shell-logout-btn`**. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts). |
| 246 | B-05 `dashboard-shell`: navegación móvil (overlay, cerrar, hamburguesa) + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-nav-mobile-overlay`**, **`#dashboard-shell-nav-mobile-close-btn`**, **`#dashboard-shell-nav-hamburger-btn`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 247 | B-05 drawer staff + hamburguesa admin: ids móvil + B-04 | Hecha | **B-05:** [`staff-dashboard-shell.component.html`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.html) — **`${idPrefix}-shell-nav-mobile-overlay`**, **`${idPrefix}-shell-nav-mobile-close-btn`** (`mobileDrawer`). **B-05:** [`admin-dashboard.component.html`](../src/app/components/admin-dashboard/admin-dashboard.component.html) — **`#admin-shell-nav-hamburger-btn`**. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts), [`admin-dashboard.component.spec.ts`](../src/app/components/admin-dashboard/admin-dashboard.component.spec.ts). |
| 248 | B-05 campana in-app: ids por fila (abrir / leída / aceptar / quitar) + B-04 | Hecha | **B-05:** [`in-app-notifications-bell.component.html`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.html) + TS — **`in-app-notifications-bell-${kind}-row-${id}-open-btn`**, **`-mark-read-btn`**, **`-acknowledge-btn`**, **`-remove-btn`**. **B-04:** [`in-app-notifications-bell.component.spec.ts`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.spec.ts). |
| 249 | B-05 `dashboard-user-profile-modal`: ids cabecera / cancelar / guardar + B-04 | Hecha | **B-05:** [`dashboard-user-profile-modal.component.html`](../src/app/shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component.html) — **`#dashboard-user-profile-modal-header-close-btn`**, **`#dashboard-user-profile-modal-cancel-btn`**, **`#dashboard-user-profile-modal-save-btn`**. **B-04:** [`dashboard-user-profile-modal.component.spec.ts`](../src/app/shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component.spec.ts). |
| 250 | B-05 campana in-app: ids estado **cargando** y lista **vacía** + B-04 | Hecha | **B-05:** [`in-app-notifications-bell`](../src/app/shared/components/in-app-notifications-bell/) — **`in-app-notifications-bell-${kind}-loading`**, **`in-app-notifications-bell-${kind}-empty`**. **B-04:** [`in-app-notifications-bell.component.spec.ts`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.spec.ts). |
| 251 | B-05 `dashboard-shell`: id del `<nav>` lateral + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-nav`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 252 | B-05 `dashboard-shell`: id contenedor principal (`main-wrapper`) + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-main-wrapper`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 253 | B-05 `staff-dashboard-shell`: id `<nav>` lateral con `idPrefix` + B-04 | Hecha | **B-05:** [`staff-dashboard-shell.component.html`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.html) — **`${idPrefix}-shell-nav`**. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts). |
| 254 | B-05 `login`: ids formulario, enviar, toggle contraseña y enlace registro + B-04 | Hecha | **B-05:** [`login.component.html`](../src/app/components/login/login.component.html) — **`#login-form`**, **`#login-submit-btn`**, **`#login-password-toggle-btn`**, **`#login-register-link`** (inputs **`#usernameOrEmail`** / **`#password`** sin cambio). **B-04:** [`login.component.spec.ts`](../src/app/components/login/login.component.spec.ts). |
| 255 | B-05 `dashboard-shell`: id región cabecera + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-header`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 256 | B-05 `dashboard-shell`: id región cuerpo (nav + contenido) + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-body`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 257 | B-05 `register`: ids formulario, enviar, términos y enlace login + B-04 | Hecha | **B-05:** [`register.component.html`](../src/app/components/register/register.component.html) — **`#register-form`**, **`#register-submit-btn`**, **`#register-terms-open-link`**, **`#register-login-link`** (campos **`#firstName`** … **`#confirmPassword`** sin cambio). **B-04:** [`register.component.spec.ts`](../src/app/components/register/register.component.spec.ts). |
| 258 | B-05 `staff-dashboard-shell`: id región cabecera (`idPrefix`) + B-04 | Hecha | **B-05:** [`staff-dashboard-shell.component.html`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.html) — **`${idPrefix}-shell-header`**. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts). |
| 259 | B-05 `staff-dashboard-shell`: id región cuerpo (`idPrefix`) + B-04 | Hecha | **B-05:** [`staff-dashboard-shell.component.html`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.html) — **`${idPrefix}-shell-body`**. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts). |
| 260 | B-05 `verify-email`: ids formulario, verificar, reenviar y enlace login + B-04 | Hecha | **B-05:** [`verify-email.component.html`](../src/app/components/verify-email/verify-email.component.html) — **`#verify-email-form`**, **`#verify-email-submit-btn`**, **`#verify-email-resend-btn`**, **`#verify-email-login-link`** (input **`#code`** sin cambio). **B-04:** [`verify-email.component.spec.ts`](../src/app/components/verify-email/verify-email.component.spec.ts). |
| 261 | B-05 `terms-modal`: ids backdrop, cerrar cabecera, cancelar y aceptar + B-04 | Hecha | **B-05:** [`terms-modal.component.html`](../src/app/components/terms-modal/terms-modal.component.html) — **`#terms-modal-backdrop`**, **`#terms-modal-header-close-btn`**, **`#terms-modal-cancel-btn`**, **`#terms-modal-accept-btn`**. **B-04:** [`terms-modal.component.spec.ts`](../src/app/components/terms-modal/terms-modal.component.spec.ts). |
| 262 | B-05 `dashboard-user-profile-modal`: id backdrop + B-04 | Hecha | **B-05:** [`dashboard-user-profile-modal.component.html`](../src/app/shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component.html) — **`#dashboard-user-profile-modal-backdrop`**. **B-04:** [`dashboard-user-profile-modal.component.spec.ts`](../src/app/shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component.spec.ts). |
| 263 | B-05 `staff-dashboard-shell`: id slot principal (`idPrefix`) + B-04 | Hecha | **B-05:** [`staff-dashboard-shell.component.html`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.html) — **`${idPrefix}-shell-main-slot`** (envoltorio **`display:contents`** en CSS). **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts). |
| 264 | B-05 `confirmation-modal`: ids overlay, cerrar, cancelar y confirmar + B-04 | Hecha | **B-05:** [`confirmation-modal.component.html`](../src/app/components/confirmation-modal/confirmation-modal.component.html) — **`#confirmation-modal-overlay`**, **`#confirmation-modal-header-close-btn`**, **`#confirmation-modal-cancel-btn`**, **`#confirmation-modal-confirm-btn`**. **B-04:** [`confirmation-modal.component.spec.ts`](../src/app/components/confirmation-modal/confirmation-modal.component.spec.ts). |
| 265 | B-05 `loading-spinner`: id host global + B-04 | Hecha | **B-05:** [`loading-spinner.component.html`](../src/app/components/loading-spinner/loading-spinner.component.html) — **`#global-loading-spinner`**; tamaño con **`[ngClass]="'size-' + size"`** (sustituye binding de clase inválido). **B-04:** [`loading-spinner.component.spec.ts`](../src/app/components/loading-spinner/loading-spinner.component.spec.ts). |
| 266 | B-05 `dashboard-shell`: id slot contenido principal + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-main-slot`** (envoltorio **`display:contents`** en CSS). **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 267 | B-05 `toast-container`: id región lista de toasts + B-04 | Hecha | **B-05:** [`toast-container.component.html`](../src/app/components/toast-container/toast-container.component.html) — **`#toast-container`**. **B-04:** [`toast-container.component.spec.ts`](../src/app/components/toast-container/toast-container.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 268 | B-05 `toast`: ids por toast (`toast-item-*`, cerrar, acción) + B-04 | Hecha | **B-05:** [`toast.component.html`](../src/app/components/toast/toast.component.html) — **`toast-item-${id}`**, **`toast-${id}-close-btn`**, **`toast-${id}-action-btn`** (si hay acción). **B-04:** [`toast.component.spec.ts`](../src/app/components/toast/toast.component.spec.ts). |
| 269 | B-05 `dashboard-shell`: id slot proyección overlays + B-04 | Hecha | **B-05:** [`dashboard-shell.component.html`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.html) — **`#dashboard-shell-overlays-slot`** (envoltorio **`display:contents`**). **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 270 | B-05 `confirmation-wrapper`: id ancla host + B-04 | Hecha | **B-05:** [`confirmation-wrapper.component.ts`](../src/app/components/confirmation-wrapper/confirmation-wrapper.component.ts) + CSS — **`#confirmation-wrapper-host`** (`display:contents`). **B-04:** [`confirmation-wrapper.component.spec.ts`](../src/app/components/confirmation-wrapper/confirmation-wrapper.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |
| 271 | B-05 `staff-dashboard-shell`: ids slots after-header y quick-modals + B-04 | Hecha | **B-05:** [`staff-dashboard-shell.component.html`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.html) — **`${idPrefix}-shell-after-header-slot`**, **`${idPrefix}-shell-quick-modals-slot`** (`display:contents`). **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts). |
| 272 | B-05 `app` raíz: id ancla `router-outlet` + B-04 | Hecha | **B-05:** [`app.html`](../src/app/app.html) + [`app.css`](../src/app/app.css) — **`#app-router-slot`** (`display:contents`). **B-04:** E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) (`toBeAttached`). |

---

## Orden del plan y del historial

### Cómo estaba planeado el trabajo (lista maestra 1–155)

Orden **lógico de aplicación** (no siempre coincide con el orden cronológico del historial, que mezcla ramas en paralelo):

| Orden | # | Resumen |
|------:|---|---------|
| 1 | 1 | Caché Angular fuera de Git |
| 2 | 2 | Logs runtime backend → Winston |
| 3 | 3 | Catálogo UI (histórico; retirado) |
| 4 | 4 | Modularizar `nurse-dashboard` (fases 1–33 + cierre) |
| 5 | 5 | Afilar `nurses.controller.ts` con servicios |
| 6 | 6 | Documentar stub `backend/frontend/package.json` |
| 7 | 7 | Tests críticos frontend + unitarios backend |
| 8 | 8 | Helper testeado para dosis en lista de pacientes (post–modularización) |
| 9 | 9 | Helpers testeados para KPIs de atención (farmacia + ventana temporal de tareas) |
| 10 | 10 | Fecha local `YYYY-MM-DD` + sumas de tareas / dosis en lista de pacientes |
| 11 | 11 | Validación cadena `YYYY-MM-DD` + suma dosis totales lista farmacia (`loadSecondaryData`) |
| 12 | 12 | Filtros de vista de tareas (hora + paciente) en función pura testeable |
| 13 | 13 | Conteo global de tareas pendientes desde grupos por hora (`loadSecondaryData`) |
| 14 | 14 | Exportación CSV del historial del día (mapeo y nombre de archivo) |
| 15 | 15 | Lectura unificada de mensajes de error HTTP en suscripciones del dashboard |
| 16 | 16 | Fecha ISO compartida en handover + tests de `pendingTaskDescriptionPreview` |
| 17 | 17 | Conteo y marcar todas las solicitudes a farmacia (sección + modal rápido) |
| 18 | 18 | Tests del helper de filtros de pacientes (`search` + categorías) |
| 19 | 19 | Tests del helper de observaciones (`parseObservationsDisplayList`) |
| 20 | 20 | Criterio compartido de búsqueda de pacientes (header + filtro sección) |
| 21 | 21 | Selección de match único de paciente en helper reutilizable |
| 22 | 22 | Tests de helpers de tratamientos del día (estado/tipo/orden) |
| 23 | 23 | Tests de helpers de historial de paciente (periodo, resultado, orden, vista previa de notas) |
| 24 | 24 | Tests de helpers de slots (modal horarios) y de medicación del día en ficha paciente |
| 25 | 25 | Tests de mapeo API → modelo lista (camas/pacientes) y guard de vista principal del nav |
| 26 | 26 | Tests de `defaultDashboardPath` (auth) y validadores de capacidad de área (`validators`) |
| 27 | 27 | Tests de guards funcionales `authGuard` y por rol (`admin` / `supervisor` / `pharmacy`) |
| 28 | 28 | Tests unitarios backend: inventario caducidad (`inventory-expiry`) y `parseLocalDateTimeParts` |
| 29 | 29 | Tests backend: `response.helper` (paginación / IDs / errores) y `pickCurrentShiftForNurse` |
| 30 | 30 | Tests backend: `handleControllerError` + `sanitizer` (mock DOMPurify en Jest) |
| 31 | 31 | Tests backend: `errors` + `error-handler` + `PaginationHelper` |
| 32 | 32 | Tests backend: `jwt` (mock) + `CursorPaginationHelper` |
| 33 | 33 | Tests backend: `loadEnv` + `MigrationHelper` (mocks `fs`/`dotenv`) |
| 34 | 34 | Tests backend: `metricsMiddleware` (`finish`, slow `/api/`) |
| 35 | 35 | Tests backend: `authMiddleware` + `role.middleware` (mocks `data-source` / `jwt`) |
| 36 | 36 | Tests backend: `paginationMiddleware` + `validateDto` / `validateQuery` |
| 37 | 37 | Tests backend: `rateLimitMiddleware` + ajuste `setInterval` en test |
| 38 | 38 | Tests backend: `HealthController` (`basic`, `metrics`) |
| 39 | 39 | Tests backend: `HealthController` (`ready`, `live`) |
| 40 | 40 | Tests backend: `HealthController` (`detailed`, mock `os` estable) |
| 41 | 41 | Tests backend: `NotificationsController` (stub API sin BD) |
| 42 | 42 | Tests backend: `WebhookController` (validación `register` + delegación) |
| 43 | 43 | Tests backend: `BackupController` (validación + `flush` por `asyncHandler`) |
| 44 | 44 | Tests backend: `AreasController` (repositorio mockeado + rama `getById` tolerante a columnas) |
| 45 | 45 | Tests backend: `BedsController` (`getAll` / `getByArea` / `create` / `update` / `delete`) |
| 46 | 46 | Tests backend: `BedsController` (`assignPatient` parcial: query runner mockeado) |
| 47 | 47 | Tests backend: `shifts.controller` (`getShifts`, `updateShift`) |
| 48 | 48 | Tests backend: `shifts.controller` (`getWeeklySchedule`) |
| 49 | 49 | `getWeeklySchedule` log seguro + test omisión filas incompletas |
| 50 | 50 | Tests backend: `ReportsController` (`reportService` mockeado) |
| 51 | 51 | Tests backend: `shifts.controller` (`saveWeeklySchedule`, `getShiftAttendance`) |
| 52 | 52 | Tests backend: `shifts.controller` (`saveShiftAttendance`) |
| 53 | 53 | Tests backend: `shifts.controller` (`getPresentNursesByShift`, `getShiftAttendanceHistory`) |
| 54 | 54 | Tests backend: `AuthController` (`login`) |
| 55 | 55 | Tests backend: `AuthController` (`register`, `verifyEmail`, `resendVerificationCode` parcial) |
| 56 | 56 | Tests backend: `AuthController` (`verifyEmail` éxito + `resendVerificationCode` ampliado) |
| 57 | 57 | Tests backend: `AuthController` (`updateMe`, `me`) |
| 58 | 58 | Tests backend: `SchedulesController` (lista + CRUD + completar / no completada / posponer / medicación) |
| 59 | 59 | Tests backend: `medications.controller` (funciones exportadas + caché) |
| 60 | 60 | Tests backend: `PatientsController` (parcial: lista, ficha, observación, alta, permiso enfermera, update/delete ampliados en **#67**) |
| 61 | 61 | Tests backend: `UsersController` (lista, CRUD usuario, rol, borrado, restaurar) |
| 62 | 62 | Tests backend: `pharmacy.controller` (solicitudes, entregas, inventario, movimientos, crear solicitud; ampliaciones **#67**–**#68**) |
| 63 | 63 | Tests backend: `nurses.controller` (parcial: stats, camas/pacientes, tareas, handover, permisos) |
| 64 | 64 | Tests backend: `BedsController` `assignPatient` (**200** + verificación post-update) |
| 65 | 65 | Tests backend: `nurses.controller` (historial administración, alta rápida tratamiento, patch/delete historial y horarios) |
| 66 | 66 | Tests backend: `nurses.controller` (catch **500** cuando el servicio mockeado rechaza) |
| 67 | 67 | Tests backend: `PatientsController` **`delete`** + farmacia (solicitudes paginadas, historial entregas, movimiento inventario, crear solicitud) |
| 68 | 68 | Tests backend: farmacia (`getDeliveryHistory` ampliado, `postInventoryMovement` salida/ajuste, `getInventoryMovements` paginado) |
| 69 | 69 | Tests backend farmacia/pacientes (lote) + specs Angular nav y búsqueda cabecera enfermería |
| 70 | 70 | Tests farmacia listado/historial **500** + specs resumen y modal entrega turno |
| 71 | 71 | Tests farmacia inventario **500** + solicitud **500** al crear med + specs secciones tareas y farmacia |
| 72 | 72 | Specs **`nurse-beds-section`** y **`nurse-patients-assigned-section`** (emisores y UI básica) |
| 73 | 73 | Spec **`nurse-dashboard-overlays-stack`** (varios `*ngIf` + eventos al padre) |
| 74 | 74 | VM único overlays stack (`NurseDashboardOverlaysStackVm` + sync estable en padre) |
| 75 | 75 | `console.*` → `logger` en tests integración/scripts + seeds + migraciones |
| 76 | 76 | Extraer facade de tareas rápidas en dashboard enfermería (B-03 fase 1) |
| 77 | 77 | Extraer helpers de acciones de tareas (B-03 fase 2) |
| 78 | 78 | Extraer helpers de estado para historial del día (B-03 fase 3) |
| 79 | 79 | Extraer helpers de acciones de medicación (B-03 fase 4) |
| 80 | 80 | Extraer helpers de mapeo de detalle de paciente (B-03 fase 5) |
| 81 | 81 | Extraer helpers de solicitudes de farmacia (B-03 fase 6) |
| 82 | 82 | Extraer helpers de estado de modales de tareas (B-03 fase 7) |
| 83 | 83 | Extraer helpers de navegación/cards (B-03 fase 8) |
| 84 | 84 | Extraer helpers de borrado historial/schedule (B-03 fase 9) |
| 85 | 85 | Extraer helpers de estado de modales de historial (B-03 fase 10) |
| 86 | 86 | Extraer helpers de estado de modales de creación (B-03 fase 11) |
| 87 | 87 | Extraer helpers de reglas de refresh post-acción (B-03 fase 12) |
| 88 | 88 | Añadir specs a modales pendientes (B-04) |
| 89 | 89 | Añadir tests DTO backend de medicación/tareas (B-04) |
| 90 | 90 | Añadir specs extra a modales schedule/history (B-04) |
| 91 | 91 | Cubrir más ramas 500 en controladores backend (B-04) |
| 92 | 92 | Cubrir ramas 500 adicionales en users.controller (B-04) |
| 93 | 93 | Cubrir ramas 500 adicionales en auth.controller (B-04) |
| 94 | 94 | Validar propagación de errores async en reports.controller (B-04) |
| 95 | 95 | Cubrir ramas 500 adicionales en patients.controller (B-04) |
| 96 | 96 | Cubrir ramas 500 adicionales en shifts.controller (B-04) |
| 97 | 97 | Cubrir ramas 500 adicionales en schedules.controller (B-04) |
| 98 | 98 | Cubrir ramas 500 adicionales en beds.controller (B-04) |
| 99 | 99 | Cubrir ramas 500 adicionales en medications.controller (B-04) |
| 100 | 100 | Specs modales agregar medicamento/tratamiento en nurse-dashboard (B-04) |
| 101 | 101 | Specs modales suspender/eliminar/reactivar medicamento (B-04) |
| 102 | 102 | Specs posponer tratamiento, detalle tarea pendiente y modal tareas rápidas (B-04) |
| 103 | 103 | Specs farmacia rápida, editar schedule y editar cama (B-04) |
| 104 | 104 | Specs editar historial, modal reportes y shell modal paciente (B-04) |
| 105 | 105 | Specs pestañas modal paciente: meds, tratamientos día, observaciones, historial (B-04) |
| 106 | 106 | Helpers cabecera usuario nurse-dashboard + refactor getters (B-03) |
| 107 | 107 | E2E guard nurse-dashboard/dashboard sin sesión → login (B-04) |
| 108 | 108 | Helpers persistencia vista principal nurse-dashboard + refactor restore/persist (B-03) |
| 109 | 109 | Helpers error recarga inicial nurse-dashboard + switch toast/logout (B-03) |
| 110 | 110 | E2E nurse-dashboard smoke login + mocks HTTP `/api/nurse/*` (B-04) |
| 111 | 111 | Helper sync historial día vista tareas + refactor ngOnInit/setMainView (B-03) |
| 112 | 112 | Helper toast secundario forkJoin tareas/farmacia + refactor loadSecondaryData (B-03) |
| 113 | 113 | E2E guards admin/supervisor/pharmacy sin sesión → login (B-04) |
| 114 | 114 | E2E use-case-diagram sin sesión → login (B-04) |
| 115 | 115 | Helper mensaje error carga historial día tareas + refactor loadTasksDayHistory (B-03) |
| 116 | 116 | Helpers textos export CSV historial día + refactor exportTasksDayHistoryCsv (B-03) |
| 117 | 117 | Helpers toasts handover + refactor reload/save nota entrega (B-03) |
| 118 | 118 | E2E raíz / sin sesión → login (B-04) |
| 119 | 119 | E2E /register público sin sesión (B-04) |
| 120 | 120 | E2E /verify-email sin email → login (B-04) |
| 121 | 121 | Helpers toasts/modal reportes enfermería + refactor forkJoin/export CSV (B-03) |
| 122 | 122 | E2E /login público heading Iniciar Sesión (B-04) |
| 123 | 123 | Helpers avisos slots tratamiento/medicación pendientes (B-03) |
| 124 | 124 | Helpers observación inline ficha paciente + refactor saveObservation (B-03) |
| 125 | 125 | E2E design-catalog (histórico; retirado) |
| 126 | 126 | Helpers toasts guardado campos ficha paciente (B-03) |
| 127 | 127 | Helpers marcar/no administrar/borrar dosis medicación día (B-03) |
| 128 | 128 | E2E login → register por enlace (B-04) |
| 129 | 129 | Helpers toasts tratamiento día + horario inválido schedule (B-03) |
| 130 | 130 | Helpers farmacia solicitud vacía + sin pacientes modales tareas (B-03) |
| 131 | 131 | E2E register → login por enlace (B-04) |
| 132 | 132 | Helpers toasts acciones tareas + refactor complete/postpone/not-completed/load patient (B-03) |
| 133 | 133 | Helpers toasts borrado historial y schedule pendiente (B-03) |
| 134 | 134 | Helpers toasts misc edición cama / medicación sin contexto / impresión (B-03) |
| 135 | 135 | Helpers toasts interpolados farmacia/tareas/medicación/observación/paciente (B-03) |
| 136 | 136 | Constantes fallback mensajes HTTP nurse-dashboard + refactor segundo argumento (B-03) |
| 137 | 137 | Confirmación modal borrado historial + tratamiento pendiente; helpers de copy (B-03) |
| 138 | 138 | Admin: modal confirmación camas/pacientes/personal; sin `confirm()` en esos flujos |
| 139 | 139 | Admin horarios: confirmaciones modal programa semanal + bulk (B-03) |
| 140 | 140 | Admin horarios: toasts + modal día descanso (sin alert/prompt) (B-03) |
| 141 | 141 | Admin personal: toasts en lugar de alert (B-03) |
| 142 | 142 | Admin camas: toasts en lugar de alert (B-03) |
| 143 | 143 | Spec admin horarios: init + picker día descanso (B-04) |
| 144 | 144 | Spec admin personal: loadData + filtros + badges (B-04) |
| 145 | 145 | Spec admin camas: loadData + filtros + labels + create (B-04) |
| 146 | 146 | Admin shell: a11y pestañas + main + alt/logo (B-05) |
| 147 | 147 | Admin: teclado pestañas + spec (B-05 / B-04) |
| 148 | 148 | Supervisor: a11y pestañas + teclado + spec (B-05 / B-04) |
| 149 | 149 | Farmacia: shell + tabs a11y/teclado + spec (B-05 / B-04) |
| 150 | 150 | Enfermería: main-nav tablist + main/tabpanels + teclado + spec (B-05 / B-04) |
| 151 | 151 | Enfermería: modales ARIA dialog + spec handover (B-05 / B-04) |
| 152 | 152 | Enfermería: Escape global para overlays stack + spec prioridad (B-05 / B-04) |
| 153 | 153 | Enfermería: trap foco modales + directiva + spec (B-05 / B-04) |
| 154 | 154 | B-04: E2E teclado en `nurse-dashboard-main-nav` (←/→ + foco) | Hecha | `frontend/e2e/nurse-dashboard-main-nav-keyboard.spec.ts`: verifica `nurse-panel-*` visible y `document.activeElement` cambia a `nurse-tab-*`. Ejecutado en `chromium` con `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test ... --project=chromium`. |
| 155 | 155 | i18n incremental `nurse-dashboard-main-nav` + ajuste spec `$localize` |
| 156 | 156 | i18n incremental modales handover/reports + ajuste specs `$localize` |
| 157 | 157 | i18n incremental modales rápidos tareas/farmacia + shim `$localize` en specs |
| 158 | 158 | i18n posponer + no realizada + pacientes farmacia + shims specs |
| 159 | 159 | i18n add med/treatment + edit bed + schedule slots + shims specs |
| 160 | 160 | i18n pending task + med day detail + history detail/edit + shims |
| 161 | 161 | i18n suspend/delete/reactivate med + postpone treatment + schedule edit |
| 162 | 162 | Patient modal shell: i18n + tabs ARIA + spec |
| 163 | 163 | Patient tabs i18n (med/treatments/obs/history) + shims |
| 164 | 164 | Patient modal shell: teclado en tablist + specs |
| 165 | 165 | $localize helpers estados/tipo/días + CSV + localize init |
| 166 | 166 | Confirmation modal + wrapper defaults i18n + spec |
| 167 | 167 | Nurse-dashboard toast/message helpers $localize |
| 168 | 168 | Nurse modal toasts + confirm liberar cama $localize |
| 169 | 169 | Shell admin/supervisor, tabs, modal shell users, types admin, facade nurse secondary |
| 170 | 170 | Modal shell areas, primary load facade nurse, backend README serverless |
| 171 | 171 | Modal shell adminAssign theme, areas assign/change area modals, specs |
| 172 | 172 | Nurse reports load facade + pharmacy bulk facade, nurse-dashboard wiring |
| 173 | 173 | Staff modals shell, admin i18n overview shell patients partial, schedules backlog note |
| 174 | 174 | Schedules modals shell + ng-deep widths; supervisor shell $localize + spec shim |
| 175 | 175 | Pharmacy shell + tabs $localize, spec shim + attendance API stubs |
| 176 | 176 | Handover note facade; users + beds $localize; users spec + beds spec fixes |
| 177 | 177 | Handover saveNote facade; areas + users i18n batch; areas/users spec bumps |
| 178 | 178 | Tasks day-history facade; pharmacy module $localize; overview spec + pharmacy spec |
| 179 | 179 | My-patients search facade; pharmacy pagination/export/tables/chips $localize; pharmacy spec |
| 180 | 180 | Patient-details load facade; pharmacy modals/status/toasts $localize; pharmacy spec |
| 181 | 181 | Complete-task facade; pharmacy export/print/Excel i18n; pharmacy spec |
| 182 | 182 | Task-lifecycle + schedule-write + treatment-schedule facades; pharmacy load errors $localize; specs |
| 183 | 183 | Clinical-write + administration-history + medication-mutation facades; pharmacy inventory i18n; specs |
| 184 | 184 | Record-patch + care-create facades in modals; pharmacy infoRequestDetails $localize; specs |
| 185 | 185 | Pharmacy shift attendance $localize; default pharmacy user + staffContact emDash; attendance + dashboard specs |
| 186 | 186 | Patients-management i18n + export $localize; nurse-unassigned logic; ShiftRealtime formatShiftLabel $localize; specs |
| 187 | 187 | Users-management TS toasts/confirm/load/export $localize; getRoleLabel from filter options; spec smoke |
| 188 | 188 | Beds-management TS toasts/confirm/sheet/shift notices $localize; getBedClass vs localized status; spec mocks + smoke |
| 189 | 189 | Staff-management + areas-management TS $localize toasts/confirms; staff shift labels; specs shim + smoke |
| 190 | 190 | Schedules-management TS $localize toasts/confirms/attendance labels; spec shim + smoke |
| 191 | 191 | Schedules-management HTML i18n @@schedMgmtHtml; TS modal/ARIA helpers; spec |
| 192 | 192 | Staff-management HTML i18n @@staffMgmtHtml; TS modal/ARIA/bed helpers; spec |
| 193 | 193 | Beds-management HTML i18n @@bedsMgmtHtml; TS ARIA/modal helpers; spec |
| 194 | 194 | Areas-management template bound to @@areasMgmtHtml TS; bed assign helpers; spec |
| 195 | 195 | Users-management HTML modals/results @@usersMgmtHtml; results/sheet helpers; spec |
| 196 | 196 | Overview errLoadStats $localize; patients bed dash emDash; overview + patients specs |
| 197 | 197 | Pharmacy-coverage-summary-card @@pharmacyCoverageCard i18n + errLoad TS; new spec + supervisor shell spec |
| 198 | 198 | Staff-quick-actions @@staffQuickActions + @@staffQuickActionsHtml; service spec |
| 199 | 199 | Nurse medication-day + pending-task-detail modals LOCALE_ID emDash $localize types/status; specs |
| 200 | 200 | Nurse history-detail modal @@nurseHistoryDetailModal kv/badges LOCALE_ID emDash; spec |
| 201 | 201 | Clinical notes scope block @@ncnsb LOCALE_ID; new spec |
| 202 | 202 | Task actions displayFallback $localize; completeTaskLocally LOCALE_ID; not-completed modal nurseUiEmDash; specs |
| 203 | 203 | Pending task preview + tasks-quick ARIA $localize; medications/treatments tabs emDash; specs |
| 204 | 204 | Tasks-section row ARIA @@nurseTasksSection; treatments-day tab notesCell + row ARIA; specs |
| 205 | 205 | Medications-tab + history-tab + patients-assigned row ARIA $localize; specs |
| 206 | 206 | Pharmacy region + header search i18n-aria-label; edit-bed radiogroup/table + rowSelect $localize; specs |
| 207 | 207 | Beds-section i18n-title card + details btn; header search i18n-title hint; specs |
| 208 | 208 | Tasks-section + pharmacy table titles; reports export titles; patients badges; summary handover; slots has-notes icon; specs |
| 209 | 209 | Header search + patients-assigned list: i18n-placeholder; specs |
| 210 | 210 | Reports modal: staff nurse filter i18n + period prefix + loading; specs |
| 211 | 211 | Reports modal: section titles, table headers, empty messages, close i18n; specs |
| 212 | 212 | Nurse-tasks-section: pending + day history visible strings i18n @@nurseTasksSection.*; specs smoke |
| 213 | 213 | Nurse-summary-section: KPI tiles labels/hints i18n @@nurseSummarySection.*; spec smoke |
| 214 | 214 | Nurse-pharmacy-section: visible i18n + $localize status/contact; specs |
| 215 | 215 | Nurse-patients-assigned-section: list i18n + clinical block labels $localize; specs |
| 216 | 216 | Nurse shell dashboard $localize + main-nav handover pending chip i18n; main-nav specs |
| 217 | 217 | Nurse-beds-section: visible i18n + clinical $localize; beds specs |
| 218 | 218 | Schedule-slots modal toggle i18n + slotNotes fallback; treatmentSlotStatusLabel $localize |
| 219 | 219 | Handover modal intro/shift/buttons i18n; shiftChoices $localize; spec #handover-save-btn |
| 220 | 220 | Patient modal: CSV/Excel i18n + export titles; observations emptyLabel $localize; specs |
| 221 | 221 | Add-treatment unitMonths i18n; history/schedule edit placeholders i18n; four modal specs smoke |
| 222 | 222 | Treatment postpone hint i18n + save ids; postpone task save id; pharmacy/reactivate/delete spec smoke |
| 223 | 223 | Not-completed reason hint i18n + confirm id; suspend until hint + confirm id; add-med submit id; pharmacy quick send id + specs |
| 224 | 224 | Reactivate/delete confirm ids; delete reason hint i18n; add-treatment submit id; history/schedule save btn ids + specs |
| 225 | 225 | Pending task detail footer hint i18n + action/close ids; med/history detail close ids; tasks/pharmacy quick footer open+close ids + specs |
| 226 | 226 | Postpone task/treatment cancel ids; schedule slots footer close + toggle other ids; patient shell close+print ids; not-completed cancel id + specs |
| 227 | 227 | Handover close/cancel/ack ids (keep handover-save); pharmacy patients close id; edit bed close/cancel/save ids + specs |
| 228 | 228 | Reports header+footer close ids; postpone/slots/history+schedule edit/not-completed header X ids; pharmacy quick header close id + specs |
| 229 | 229 | Patient shell + add med/treat + delete/suspend/reactivate + detail modals + tasks quick: header X close ids + specs |
| 230 | 230 | Footer Cancel ids: history-edit, add med/treat, suspend, delete, reactivate, schedule-edit + dismiss specs |
| 231 | 231 | Reports modal: KPI filter btn ids + CSV/Excel download btn ids + spec by id |
| 232 | 232 | Pharmacy quick: select-all checkbox id + per-row view patients id + viewPatients spec |
| 233 | 233 | Tasks quick: clear filters button id + clearFiltersRequested spec |
| 234 | 234 | Pharmacy patients modal: footer Cerrar id + dismissed spec (header close kept) |
| 235 | 235 | Pharmacy section panel: select-all, view-patients-N, send-request, history-toggle ids + spec by id |
| 236 | 236 | Tasks section: add task/med, clear filters, export day CSV, day-history toggle ids + spec by id |
| 237 | 237 | Summary section: eight stable ids (stats + attention + handover + reports) + spec by id |
| 238 | 238 | Beds section: bed-card-N + view-patient-N ids + spec by id |
| 239 | 239 | Patients assigned: clear-filters btn id + view-details-N per row + spec by id |
| 240 | 240 | Main nav: handover + reports quick btn ids + spec + E2E smoke |
| 241 | 241 | Header search: stable input id + spec + E2E smoke |
| 242 | 242 | Nurse dashboard shell: header actions container id + E2E smoke |
| 243 | 243 | In-app notifications bell: toggle/panel/mark-all/refresh ids by dashboardKind + spec + E2E |
| 244 | 244 | Dashboard shell (shared): logo + profile + logout btn ids + spec + E2E |
| 245 | 245 | Staff dashboard shell: header ids with idPrefix + spec |
| 246 | 246 | Dashboard shell: mobile overlay, close nav, hamburger ids + spec + E2E attached |
| 247 | 247 | Staff shell mobile drawer overlay/close ids + admin hamburger id + specs |
| 248 | 248 | In-app notifications: per-row stable ids (open, mark read, ack, remove) + spec |
| 249 | 249 | Dashboard user profile modal: header close + cancel + save btn ids + spec |
| 250 | 250 | In-app bell: loading + empty list stable ids + specs |
| 251 | 251 | Dashboard shell: stable `#dashboard-shell-nav` on lateral nav + spec + E2E attached |
| 252 | 252 | Dashboard shell: `#dashboard-shell-main-wrapper` + spec + E2E attached |
| 253 | 253 | Staff shell: `${idPrefix}-shell-nav` on tab nav + spec |
| 254 | 254 | Login: `#login-form`, submit, password toggle, register link ids + spec |
| 255 | 255 | Dashboard shell: `#dashboard-shell-header` + spec + E2E attached |
| 256 | 256 | Dashboard shell: `#dashboard-shell-body` + spec + E2E attached |
| 257 | 257 | Register: form, submit, terms link, login link ids + spec |
| 258 | 258 | Staff shell: `${idPrefix}-shell-header` + spec |
| 259 | 259 | Staff shell: `${idPrefix}-shell-body` + spec |
| 260 | 260 | Verify-email: form, submit, resend, login link ids + spec |
| 261 | 261 | Terms modal: backdrop, header close, cancel, accept btn ids + spec |
| 262 | 262 | Dashboard user profile modal: `#dashboard-user-profile-modal-backdrop` + spec |
| 263 | 263 | Staff shell: `${idPrefix}-shell-main-slot` (display:contents wrapper) + spec |
| 264 | 264 | Confirmation modal: overlay, header close, cancel, confirm btn ids + spec |
| 265 | 265 | Loading spinner: `#global-loading-spinner`, `[ngClass]` tamaño + spec |
| 266 | 266 | Dashboard shell: `#dashboard-shell-main-slot` (display:contents) + spec + E2E attached |
| 267 | 267 | Toast container: `#toast-container` + spec + E2E attached |
| 268 | 268 | Toast: per-item `toast-item-*`, `-close-btn`, `-action-btn` ids + spec |
| 269 | 269 | Dashboard shell: `#dashboard-shell-overlays-slot` (display:contents) + spec + E2E attached |
| 270 | 270 | Confirmation wrapper: `#confirmation-wrapper-host` (display:contents) + spec + E2E attached |
| 271 | 271 | Staff shell: `${idPrefix}-shell-after-header-slot` + `${idPrefix}-shell-quick-modals-slot` + spec |
| 272 | 272 | App root: `#app-router-slot` around router-outlet + E2E attached |

Las filas **1–272** están **Hechas** en el repo actual. Lo siguiente pasa por **[`MEJORAS_PENDIENTES.md`](./MEJORAS_PENDIENTES.md)** hasta promover una nueva fila numerada.

### Cómo leer el historial (orden cronológico)

Las subsecciones **«Historial de cambios aplicados»** van por **fecha** (más arriba = más reciente dentro del mismo día puede variar; conviene buscar por número de mejora o por palabra clave, p. ej. «Mejora 4 (parcial, fase 22)»).

- **Mejora 4** tiene muchas fases: del **1 al 33** y luego el **cierre**; conviene seguir el número de fase si se revisa un refacto concreto del panel de enfermería.

---

## Historial de cambios aplicados

### 2026-05-14 — Mejora 272

- **272 — Qué (lote):** **B-05:** [`app.html`](../src/app/app.html) / [`app.css`](../src/app/app.css) — **`#app-router-slot`**. **B-04:** E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts).

### 2026-05-14 — Mejora 271

- **271 — Qué (lote):** **B-05:** [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/) — **`${idPrefix}-shell-after-header-slot`**, **`${idPrefix}-shell-quick-modals-slot`**. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts).

### 2026-05-14 — Mejora 270

- **270 — Qué (lote):** **B-05:** [`confirmation-wrapper`](../src/app/components/confirmation-wrapper/) — **`#confirmation-wrapper-host`**. **B-04:** [`confirmation-wrapper.component.spec.ts`](../src/app/components/confirmation-wrapper/confirmation-wrapper.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts).

### 2026-05-14 — Mejora 269

- **269 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-overlays-slot`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts).

### 2026-05-14 — Mejora 268

- **268 — Qué (lote):** **B-05:** [`toast`](../src/app/components/toast/) — ids por **`toast.id`**: **`toast-item-*`**, **`toast-*-close-btn`**, **`toast-*-action-btn`**. **B-04:** [`toast.component.spec.ts`](../src/app/components/toast/toast.component.spec.ts).

### 2026-05-14 — Mejora 267

- **267 — Qué (lote):** **B-05:** [`toast-container`](../src/app/components/toast-container/) — **`#toast-container`**. **B-04:** [`toast-container.component.spec.ts`](../src/app/components/toast-container/toast-container.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts).

### 2026-05-14 — Mejora 266

- **266 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-main-slot`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts).

### 2026-05-14 — Mejora 265

- **265 — Qué (lote):** **B-05:** [`loading-spinner`](../src/app/components/loading-spinner/) — **`#global-loading-spinner`**; corrección de clase de tamaño con **`[ngClass]`** (el binding dinámico `[class.size-{{ size }}]` generaba un token inválido en `classList`). **B-04:** [`loading-spinner.component.spec.ts`](../src/app/components/loading-spinner/loading-spinner.component.spec.ts).

### 2026-05-14 — Mejora 264

- **264 — Qué (lote):** **B-05:** [`confirmation-modal`](../src/app/components/confirmation-modal/) — **`#confirmation-modal-overlay`**, **`#confirmation-modal-header-close-btn`**, **`#confirmation-modal-cancel-btn`**, **`#confirmation-modal-confirm-btn`**. **B-04:** [`confirmation-modal.component.spec.ts`](../src/app/components/confirmation-modal/confirmation-modal.component.spec.ts).

### 2026-05-14 — Mejora 263

- **263 — Qué (lote):** **B-05:** [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/) — **`${idPrefix}-shell-main-slot`** (envoltorio con **`display:contents`**). **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts).

### 2026-05-14 — Mejora 262

- **262 — Qué (lote):** **B-05:** [`dashboard-user-profile-modal`](../src/app/shared/components/dashboard-user-profile-modal/) — **`#dashboard-user-profile-modal-backdrop`**. **B-04:** [`dashboard-user-profile-modal.component.spec.ts`](../src/app/shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component.spec.ts).

### 2026-05-14 — Mejora 261

- **261 — Qué (lote):** **B-05:** [`terms-modal`](../src/app/components/terms-modal/) — **`#terms-modal-backdrop`**, **`#terms-modal-header-close-btn`**, **`#terms-modal-cancel-btn`**, **`#terms-modal-accept-btn`**. **B-04:** [`terms-modal.component.spec.ts`](../src/app/components/terms-modal/terms-modal.component.spec.ts).

### 2026-05-14 — Mejora 260

- **260 — Qué (lote):** **B-05:** [`verify-email`](../src/app/components/verify-email/) — **`#verify-email-form`**, **`#verify-email-submit-btn`**, **`#verify-email-resend-btn`**, **`#verify-email-login-link`**. **B-04:** [`verify-email.component.spec.ts`](../src/app/components/verify-email/verify-email.component.spec.ts).

### 2026-05-14 — Mejora 259

- **259 — Qué (lote):** **B-05:** [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/) — **`${idPrefix}-shell-body`**. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts).

### 2026-05-14 — Mejora 258

- **258 — Qué (lote):** **B-05:** [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/) — **`${idPrefix}-shell-header`**. **B-04:** mismo spec (cabecera/cuerpo con prefijo `test`).

### 2026-05-14 — Mejora 257

- **257 — Qué (lote):** **B-05:** [`register`](../src/app/components/register/) — **`#register-form`**, **`#register-submit-btn`**, **`#register-terms-open-link`**, **`#register-login-link`**. **B-04:** [`register.component.spec.ts`](../src/app/components/register/register.component.spec.ts).

### 2026-05-14 — Mejora 256

- **256 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-body`**. **B-04:** spec + E2E (`toBeAttached`).

### 2026-05-14 — Mejora 255

- **255 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-header`**. **B-04:** spec + E2E (`toBeAttached`).

### 2026-05-14 — Mejora 254

- **254 — Qué (lote):** **B-05:** [`login`](../src/app/components/login/) — **`#login-form`**, **`#login-submit-btn`**, **`#login-password-toggle-btn`**, **`#login-register-link`**. **B-04:** [`login.component.spec.ts`](../src/app/components/login/login.component.spec.ts).

### 2026-05-14 — Mejora 253

- **253 — Qué (lote):** **B-05:** [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/) — **`${idPrefix}-shell-nav`** en el `<nav>` de pestañas. **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts).

### 2026-05-14 — Mejora 252

- **252 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-main-wrapper`**. **B-04:** spec + E2E smoke (`toBeAttached`).

### 2026-05-14 — Mejora 251

- **251 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-nav`** en el `<nav>` lateral. **B-04:** spec + E2E smoke (`toBeAttached`).

### 2026-05-14 — Mejora 250

- **250 — Qué (lote):** **B-05:** [`in-app-notifications-bell`](../src/app/shared/components/in-app-notifications-bell/) — ids **`…-${kind}-loading`** y **`…-${kind}-empty`**. **B-04:** tests de panel vacío y estado cargando.

### 2026-05-14 — Mejora 249

- **249 — Qué (lote):** **B-05:** [`dashboard-user-profile-modal`](../src/app/shared/components/dashboard-user-profile-modal/) — **`#dashboard-user-profile-modal-header-close-btn`**, **`#dashboard-user-profile-modal-cancel-btn`**, **`#dashboard-user-profile-modal-save-btn`**. **B-04:** [`dashboard-user-profile-modal.component.spec.ts`](../src/app/shared/components/dashboard-user-profile-modal/dashboard-user-profile-modal.component.spec.ts).

### 2026-05-14 — Mejora 248

- **248 — Qué (lote):** **B-05:** [`in-app-notifications-bell`](../src/app/shared/components/in-app-notifications-bell/) — ids por fila y **`dashboardKind`**: **`…-row-${id}-open-btn`**, **`-mark-read-btn`**, **`-acknowledge-btn`**, **`-remove-btn`**. **B-04:** [`in-app-notifications-bell.component.spec.ts`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.spec.ts) (notificación de ejemplo id **42**).

### 2026-05-14 — Mejora 247

- **247 — Qué (lote):** **B-05:** [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/) — overlay y cierre del drawer móvil con **`${idPrefix}-shell-nav-mobile-*`**; [`admin-dashboard.component.html`](../src/app/components/admin-dashboard/admin-dashboard.component.html) — **`#admin-shell-nav-hamburger-btn`**. **B-04:** specs [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts) y [`admin-dashboard`](../src/app/components/admin-dashboard/admin-dashboard.component.spec.ts).

### 2026-05-14 — Mejora 246

- **246 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-nav-mobile-overlay`**, **`#dashboard-shell-nav-mobile-close-btn`**, **`#dashboard-shell-nav-hamburger-btn`**. **B-04:** [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E smoke (`toBeAttached` en viewport escritorio).

### 2026-05-13 — Mejora 245

- **245 — Qué (lote):** **B-05:** [`staff-dashboard-shell`](../src/app/shared/components/staff-dashboard-shell/) — ids de cabecera con prefijo **`${idPrefix}-shell-*`** (logo, perfil, logout). **B-04:** [`staff-dashboard-shell.component.spec.ts`](../src/app/shared/components/staff-dashboard-shell/staff-dashboard-shell.component.spec.ts).

### 2026-05-13 — Mejora 244

- **244 — Qué (lote):** **B-05:** [`dashboard-shell`](../src/app/shared/components/dashboard-shell/) — **`#dashboard-shell-logo-section`**, **`#dashboard-shell-profile-trigger-btn`**, **`#dashboard-shell-logout-btn`**. **B-04:** nuevo [`dashboard-shell.component.spec.ts`](../src/app/shared/components/dashboard-shell/dashboard-shell.component.spec.ts); E2E smoke enfermería.

### 2026-05-13 — Mejora 243

- **243 — Qué (lote):** **B-05:** [`in-app-notifications-bell`](../src/app/shared/components/in-app-notifications-bell/) — ids por **`dashboardKind`** (toggle, panel, marcar leídas, actualizar). **B-04:** [`in-app-notifications-bell.component.spec.ts`](../src/app/shared/components/in-app-notifications-bell/in-app-notifications-bell.component.spec.ts); E2E smoke.

### 2026-05-13 — Mejora 242

- **242 — Qué (lote):** **B-05:** [`nurse-dashboard.component.html`](../src/app/components/nurse-dashboard/nurse-dashboard.component.html) — **`#nurse-dashboard-shell-header-actions`** en el contenedor de notificaciones + buscador. **B-04:** [`nurse-dashboard-smoke.spec.ts`](../e2e/nurse-dashboard-smoke.spec.ts) — expect visible tras login simulado.

### 2026-05-13 — Mejora 241

- **241 — Qué (lote):** **B-05:** [`nurse-dashboard-header-search`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/) — **`#nurse-dashboard-header-search-input`**. **B-04:** spec por id; mismo E2E smoke.

### 2026-05-13 — Mejora 240

- **240 — Qué (lote):** **B-05:** [`nurse-dashboard-main-nav`](../src/app/components/nurse-dashboard/nurse-dashboard-main-nav/) — **`#nurse-dashboard-main-nav-handover-quick-btn`**, **`#nurse-dashboard-main-nav-reports-quick-btn`**. **B-04:** spec — pestaña Tareas por **`#nurse-tab-tasks`**; accesos rápidos por id; E2E smoke.

### 2026-05-13 — Mejora 239

- **239 — Qué (lote):** **B-05:** [`nurse-patients-assigned-section`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/) — **`#nurse-patients-assigned-section-clear-filters-btn`**; **Detalles** con id por fila (`nurse-patients-assigned-section-view-details-` + índice). **B-04:** spec — limpiar, detalles y humo de ids.

### 2026-05-13 — Mejora 238

- **238 — Qué (lote):** **B-05:** [`nurse-beds-section`](../src/app/components/nurse-dashboard/nurse-beds-section/) — tarjeta de cama con id por índice (`nurse-beds-section-bed-card-` + índice); botón **Detalles** con **`nurse-beds-section-view-patient-`** + índice. **B-04:** spec — edición de cama, ver paciente y humo de ids.

### 2026-05-13 — Mejora 237

- **237 — Qué (lote):** **B-05:** [`nurse-summary-section`](../src/app/components/nurse-dashboard/nurse-summary-section/) — ids en las cuatro tarjetas KPI (`stat-*-card`) y en los cuatro botones de atención/entrega/reportes (`attention-*`, `handover`, `reports`). **B-04:** spec — área, entrega y humo de las ocho ids.

### 2026-05-13 — Mejora 236

- **236 — Qué (lote):** **B-05:** [`nurse-tasks-section`](../src/app/components/nurse-dashboard/nurse-tasks-section/) — **`#nurse-tasks-section-add-task-btn`**, **`#nurse-tasks-section-add-medication-btn`**, **`#nurse-tasks-section-clear-filters-btn`**, **`#nurse-tasks-section-export-day-history-csv-btn`**, **`#nurse-tasks-section-day-history-toggle-btn`**. **B-04:** [`nurse-tasks-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.spec.ts) — clics y humo por id estable.

### 2026-05-13 — Mejora 235

- **235 — Qué (lote):** **B-05:** [`nurse-pharmacy-section`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/) — **`#nurse-pharmacy-section-select-all-checkbox`**; **Ver pacientes** con id por fila (`nurse-pharmacy-section-view-patients-` + índice); **`#nurse-pharmacy-section-send-request-btn`**; **`#nurse-pharmacy-section-history-toggle-btn`**. **B-04:** [`nurse-pharmacy-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.spec.ts) — enviar, ver pacientes, seleccionar todos, toggle historial y presencia de ids.

### 2026-05-14 — Mejora 234

- **234 — Qué (lote):** **B-05:** [`nurse-pharmacy-patients-modal`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/) — pie **`#nurse-pharmacy-patients-footer-close-btn`** con **`i18n`** `@@nursePharmacyPatientsModal.footerClose`; cabecera **`#nurse-pharmacy-patients-close-btn`** sin cambio. **B-04:** spec — tres vías de cierre (`dismissed`).

### 2026-05-14 — Mejora 233

- **233 — Qué (lote):** **B-05:** [`nurse-tasks-quick-modal`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/) — **`#nurse-tasks-quick-clear-filters-btn`**. **B-04:** spec — clic emite **`clearFiltersRequested`**.

### 2026-05-14 — Mejora 232

- **232 — Qué (lote):** **B-05:** [`nurse-pharmacy-quick-modal`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/) — **`#nurse-pharmacy-quick-select-all-checkbox`**; botones **Ver pacientes** con id estable por fila (`nurse-pharmacy-quick-view-patients-` + índice). **B-04:** spec — toggle «todos» vía checkbox real; ids en plantilla; **`viewPatients`** al pulsar la primera fila.

### 2026-05-14 — Mejora 231

- **231 — Qué (lote):** **B-05:** [`nurse-reports-modal`](../src/app/components/nurse-dashboard/nurse-reports-modal/) — ids en los cinco KPI de filtro de cumplimiento; ids en los cuatro botones de descarga CSV/Excel del pie. **B-04:** [`nurse-reports-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-reports-modal/nurse-reports-modal.component.spec.ts) — exportaciones y tooltips por id; KPI y filtro cancelados por id.

### 2026-05-14 — Mejora 230

- **230 — Qué (lote):** **B-05:** ids en pie **Cancelar** — [`nurse-history-edit-modal`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/) **`#nurse-history-edit-cancel-btn`**; [`nurse-add-medication-modal`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/) **`#nurse-add-medication-cancel-btn`**; [`nurse-add-treatment-modal`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/) **`#nurse-add-treatment-cancel-btn`**; [`nurse-suspend-medication-modal`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/) **`#nurse-suspend-medication-cancel-btn`**; [`nurse-delete-medication-modal`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/) **`#nurse-delete-medication-cancel-btn`**; [`nurse-reactivate-medication-modal`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/) **`#nurse-reactivate-medication-cancel-btn`**; [`nurse-schedule-edit-modal`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/) **`#nurse-schedule-edit-cancel-btn`**. **B-04:** expectativa de id y/o clic **Cancelar** → **`dismissed`** en los siete specs.

### 2026-05-14 — Mejora 229

- **229 — Qué (lote):** **B-05:** [`nurse-patient-modal-shell`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/) — **`#nurse-patient-modal-header-close-btn`**. **B-05:** cabecera **✕** con id en [`nurse-add-medication-modal`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/), [`nurse-add-treatment-modal`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/), [`nurse-delete-medication-modal`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/), [`nurse-suspend-medication-modal`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/), [`nurse-reactivate-medication-modal`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/), [`nurse-history-detail-modal`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/), [`nurse-medication-day-detail-modal`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/), [`nurse-pending-task-detail-modal`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/), [`nurse-tasks-quick-modal`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/) (patrón **`#nurse-*-header-close-btn`**). **B-04:** humo en los diez specs.

### 2026-05-14 — Mejora 228

- **228 — Qué (lote):** **B-05:** [`nurse-reports-modal`](../src/app/components/nurse-dashboard/nurse-reports-modal/) — **`#nurse-reports-header-close-btn`**, **`#nurse-reports-footer-close-btn`**. **B-05:** cabecera **✕** con id en [`nurse-postpone-task-modal`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/) (**`#nurse-postpone-task-header-close-btn`**), [`nurse-treatment-postpone-modal`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/) (**`#nurse-treatment-postpone-header-close-btn`**), [`nurse-schedule-slots-modal`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/) (**`#nurse-schedule-slots-header-close-btn`**), [`nurse-history-edit-modal`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/) (**`#nurse-history-edit-header-close-btn`**), [`nurse-schedule-edit-modal`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/) (**`#nurse-schedule-edit-header-close-btn`**), [`nurse-not-completed-task-modal`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/) (**`#nurse-not-completed-header-close-btn`**), [`nurse-pharmacy-quick-modal`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/) (**`#nurse-pharmacy-quick-header-close-btn`**). **B-04:** humo y clics en los ocho specs.

### 2026-05-14 — Mejora 227

- **227 — Qué (lote):** **B-05:** [`nurse-handover-modal`](../src/app/components/nurse-dashboard/nurse-handover-modal/) — **`#nurse-handover-modal-close-btn`**, **`#nurse-handover-cancel-btn`**, **`#nurse-handover-acknowledge-btn`** (mantiene **`#handover-save-btn`**). **B-05:** [`nurse-pharmacy-patients-modal`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/) — **`#nurse-pharmacy-patients-close-btn`**. **B-05:** [`nurse-edit-bed-modal`](../src/app/components/nurse-dashboard/nurse-edit-bed-modal/) — **`#nurse-edit-bed-modal-close-btn`**, **`#nurse-edit-bed-cancel-btn`**, **`#nurse-edit-bed-save-btn`**. **B-04:** humo y clics en los tres specs.

### 2026-05-14 — Mejora 226

- **226 — Qué (lote):** **B-05:** [`nurse-postpone-task-modal`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/) — **`#nurse-postpone-task-cancel-btn`**; [`nurse-treatment-postpone-modal`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/) — **`#nurse-treatment-postpone-cancel-btn`**. **B-05:** [`nurse-schedule-slots-modal`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/) — **`#nurse-schedule-slots-close-btn`**, **`#nurse-schedule-slots-toggle-other-btn`**. **B-05:** [`nurse-patient-modal-shell`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/) — **`#nurse-patient-modal-close-btn`**, **`#nurse-patient-print-btn`**. **B-05:** [`nurse-not-completed-task-modal`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/) — **`#nurse-not-completed-cancel-btn`**. **B-04:** humo en los cinco specs.

### 2026-05-14 — Mejora 225

- **225 — Qué (lote):** **B-05:** [`nurse-pending-task-detail-modal`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/) — pista de acciones en el pie (`@@nursePendingTaskDetailModal.footerHint`); ids **`#nurse-pending-task-detail-complete-btn`**, **`#nurse-pending-task-detail-not-completed-btn`**, **`#nurse-pending-task-detail-postpone-btn`**, **`#nurse-pending-task-detail-close-btn`**. **B-05:** [`nurse-medication-day-detail-modal`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/) — **`#nurse-medication-day-detail-close-btn`**; [`nurse-history-detail-modal`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/) — **`#nurse-history-detail-close-btn`**. **B-05:** [`nurse-tasks-quick-modal`](../src/app/components/nurse-dashboard/nurse-tasks-quick-modal/) — **`#nurse-tasks-quick-open-module-btn`** / **`#nurse-tasks-quick-close-btn`**; [`nurse-pharmacy-quick-modal`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/) — **`#nurse-pharmacy-quick-open-module-btn`** / **`#nurse-pharmacy-quick-close-btn`**. **B-04:** humo en los cinco specs.

### 2026-05-14 — Mejora 224

- **224 — Qué (lote):** **B-05:** [`nurse-reactivate-medication-modal`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/) — **`#nurse-reactivate-medication-confirm-btn`**. **B-05:** [`nurse-delete-medication-modal`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/) — **`@@nurseDeleteMedicationModal.reasonHint`**; **`#nurse-delete-medication-confirm-btn`**. **B-05:** [`nurse-add-treatment-modal`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/) — **`#nurse-add-treatment-submit-btn`**. **B-05:** [`nurse-history-edit-modal`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/) — **`#nurse-history-edit-save-btn`**; [`nurse-schedule-edit-modal`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/) — **`#nurse-schedule-edit-save-btn`**. **B-04:** humo de ids/pista en los cinco specs.

### 2026-05-14 — Mejora 223

- **223 — Qué (lote):** **B-05:** [`nurse-not-completed-task-modal`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/) — pista bajo el motivo con **`i18n`** (`@@nurseNotCompletedTaskModal.reasonHint`); **`#nurse-not-completed-confirm-btn`**. **B-05:** [`nurse-suspend-medication-modal`](../src/app/components/nurse-dashboard/nurse-suspend-medication-modal/) — pista de interpretación de fecha en modo personalizado (`@@nurseSuspendMedicationModal.untilHint`); **`#nurse-suspend-medication-confirm-btn`**. **B-05:** [`nurse-add-medication-modal`](../src/app/components/nurse-dashboard/nurse-add-medication-modal/) — **`#nurse-add-medication-submit-btn`**. **B-05:** [`nurse-pharmacy-quick-modal`](../src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/) — **`#nurse-pharmacy-quick-send-request-btn`**. **B-04:** humo de plantilla/ids en los cuatro specs.

### 2026-05-14 — Mejora 222

- **222 — Qué (lote):** **B-05:** [`nurse-treatment-postpone-modal`](../src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/) — pista bajo hora nueva con **`i18n`** (`@@nurseTreatmentPostponeModal.dateTimeHint`); botón **Guardar** con **`#nurse-treatment-postpone-save-btn`**. **B-05:** [`nurse-postpone-task-modal`](../src/app/components/nurse-dashboard/nurse-postpone-task-modal/) — **`#nurse-postpone-task-save-btn`** en confirmar. **B-04:** humo de plantilla en [`nurse-pharmacy-patients-modal`](../src/app/components/nurse-dashboard/nurse-pharmacy-patients-modal/), [`nurse-reactivate-medication-modal`](../src/app/components/nurse-dashboard/nurse-reactivate-medication-modal/), [`nurse-delete-medication-modal`](../src/app/components/nurse-dashboard/nurse-delete-medication-modal/) + cobertura pista/ids en posponer tratamiento/tarea.

### 2026-05-14 — Mejora 221

- **221 — Qué (lote):** **B-05:** [`nurse-add-treatment-modal`](../src/app/components/nurse-dashboard/nurse-add-treatment-modal/) — opción **Meses** en unidad de duración con **`i18n`** (`@@nurseAddTreatmentModal.unitMonths`). **B-05:** [`nurse-history-edit-modal`](../src/app/components/nurse-dashboard/nurse-history-edit-modal/) — **`i18n-placeholder`** en descripción y motivo (no realizado/omitido). **B-05:** [`nurse-schedule-edit-modal`](../src/app/components/nurse-dashboard/nurse-schedule-edit-modal/) — **`i18n-placeholder`** en descripción y notas. **B-04:** humo de plantilla y placeholders en specs de alta medicación/tratamiento y modales de edición.

### 2026-05-14 — Mejora 220

- **220 — Qué (lote):** **B-05:** [`nurse-patient-modal-shell`](../src/app/components/nurse-dashboard/nurse-patient-modal-shell/) — botones **CSV** / **Excel** con **`i18n`** en etiqueta, **`i18n-title`** en descarga por pestaña, ids **`#nurse-patient-export-csv-btn`** / **`#nurse-patient-export-excel-btn`**. **B-05:** [`nurse-patient-observations-tab`](../src/app/components/nurse-dashboard/nurse-patient-observations-tab/) — textos vacíos de **`ncnsb`** vía **`$localize`** (`@@nursePatientObservationsTab.empty*`) enlazados con **`[emptyLabel]`**. **B-04:** specs — export por id + títulos; vacíos en bloques clínicos; **`startEditingDiagnosis`** en flujo guardar diagnóstico.

### 2026-05-14 — Mejora 219

- **219 — Qué (lote):** **B-05:** [`nurse-handover-modal`](../src/app/components/nurse-dashboard/nurse-handover-modal/) — párrafos introductorios, etiqueta **Turno**, **Aceptar**, **Guardar**/**Guardando…** con **`i18n`**; etiquetas **Mañana**/**Tarde**/**Noche** del **`<select>`** vía **`$localize`** en **`shiftChoices`** (**#151** ARIA previo). **B-04:** [`nurse-handover-modal.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.spec.ts) — **`handoverShift`** requerido, **`#handover-save-btn`** para **`saveRequested`**, humo intro/select.

### 2026-05-14 — Mejora 218

- **218 — Qué (lote):** **B-05:** [`nurse-schedule-slots-modal`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/) — botón **«… Ver N más»** / **«Ver menos»** con **`i18n`**; fallback **`Horario`** en **`slotNotesList`** con **`$localize`**. **B-05:** [`nurse-treatments-today.helpers.ts`](../src/app/components/nurse-dashboard/nurse-treatments-today.helpers.ts) — **`treatmentSlotStatusLabel`** con **`@@nurseTreatment.todaySlot.status.*`**. **B-04:** specs del modal (toggle + notas) y helper (contrato de texto sin cambios funcionales).

### 2026-05-14 — Mejora 217

- **217 — Qué (lote):** **B-05:** [`nurse-beds-section`](../src/app/components/nurse-dashboard/nurse-beds-section/) — **`i18n`** en cabecera, subtítulo, estados de cama, botón **Detalles**, edad, bloque vacío y pista; **`$localize`** para etiquetas de **`nurse-clinical-notes-scope-block`** en tarjeta con paciente. **B-04:** spec — **`#nurse-beds-section-title`**, subtítulo con área, **`.ncnsb__block-label`**, texto cama libre.

### 2026-05-14 — Mejora 216

- **216 — Qué (lote):** **B-05:** [`nurse-dashboard`](../src/app/components/nurse-dashboard/) — cabecera **`app-dashboard-shell`** con cadenas **`$localize`** **`@@nurseDashboard.shell*`** (título panel, rol, ARIA nav, logo); chip **Pendiente** de la acción **Entrega** en [`nurse-dashboard-main-nav`](../src/app/components/nurse-dashboard/nurse-dashboard-main-nav/) con **`i18n`**. **B-04:** [`nurse-dashboard-main-nav.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-main-nav/nurse-dashboard-main-nav.component.spec.ts) — clic en acciones rápidas (índices en **tablist**) y chip visible con **`handoverPendingNotice`**.

### 2026-05-14 — Mejora 215

- **215 — Qué (lote):** **B-05:** [`nurse-patients-assigned-section`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/) — **`i18n`** en cabecera, filtros, opciones del desplegable, limpiar, badges fijos, botón **Detalles**, edad, KPIs, vacío; **`$localize`** para etiquetas **`blockLabel`**/**`emptyLabel`** de diagnóstico y obs. médicas pasadas a **`nurse-clinical-notes-scope-block`**. **B-04:** spec — **`#nurse-patients-area-title`**, opciones de filtro, etiquetas **`.ncnsb__block-label`**.

### 2026-05-14 — Mejora 214

- **214 — Qué (lote):** **B-05:** [`nurse-pharmacy-section`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/) — plantilla con **`i18n`** / **`@@nursePharmacySection.*`** (hoy, contactos por turno, tablas, historial colapsable, vacíos) y **`$localize`** en **`statusLabel`** / nombre de contacto por defecto / **`pharmacyContactDisplayName`**. **B-04:** spec — **`#nurse-pharmacy-today-title`**, cabeceras, historial abierto, **`statusLabel`**, fallback contacto.

### 2026-05-14 — Mejora 213

- **213 — Qué (lote):** **B-05:** [`nurse-summary-section`](../src/app/components/nurse-dashboard/nurse-summary-section/) — título **Resumen general** y todas las **`.stat-label`** / **`.click-hint`** / títulos de valor en tarjetas **Entrega** y **7 días** con **`i18n`** / **`@@nurseSummarySection.*`** (el **`title`** largo de la tarjeta de entrega sigue en **#208**). **B-04:** spec — **`#nurse-summary-section-title`** y presencia de etiquetas KPI localizables.

### 2026-05-14 — Mejora 212

- **212 — Qué (lote):** **B-05:** [`nurse-tasks-section`](../src/app/components/nurse-dashboard/nurse-tasks-section/) — textos visibles de pendientes e historial del día con **`i18n`** / **`@@nurseTasksSection.*`** (título, filtros, opciones de horario, cabeceras de tablas, tipos y estados de fila, vacíos, export CSV, toggles, carga). **B-04:** [`nurse-tasks-section.component.spec.ts`](../src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.spec.ts) — humo de título **#nurse-tasks-pending-title**, etiqueta filtro paciente, cinco **`<th>`** de la tabla pendiente y opciones del **`<select>`** de horario.

### 2026-05-14 — Mejora 211

- **211 — Qué (lote):** **B-05:** [`nurse-reports-modal`](../src/app/components/nurse-dashboard/nurse-reports-modal/) — títulos de sección, `<th>` de tablas cumplimiento/medicación, mensajes vacíos (cumplimiento y medicación) sin interpolación en plantilla, botón **Cerrar** con **`i18n`**. **B-04:** spec — títulos visibles, cabeceras «Paciente»/«Medicación», pie **Cerrar**, KPI **Cancelados** y mensaje vacío asociado.

### 2026-05-14 — Mejora 210

- **210 — Qué (lote):** **B-05:** [`nurse-reports-modal`](../src/app/components/nurse-dashboard/nurse-reports-modal/) — texto **`Periodo:`**, filtro enfermera (etiqueta, **`aria-label`** del `<select>`, primera opción), mensaje de carga con **`i18n`**. **B-04:** spec de periodo visible, filtro staff localizable y emisión **`staffNurseFilterChange`**.

### 2026-05-14 — Mejora 209

- **209 — Qué (lote):** **B-05:** [`nurse-dashboard-header-search`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/) — **`i18n-placeholder`** (`@@nurseDashboardHeaderSearch.inputPlaceholder`). **B-05:** [`nurse-patients-assigned-section`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/) — **`@@nursePatientsAssigned.searchPlaceholder`**. **B-04:** asserts de `placeholder` en los dos specs.

### 2026-05-14 — Mejora 208

- **208 — Qué (lote):** **B-05:** `i18n-title` en acciones y exportación de [`nurse-tasks-section`](../src/app/components/nurse-dashboard/nurse-tasks-section/), cabecera de tabla y «Ver pacientes» en [`nurse-pharmacy-section`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/), pie de [`nurse-reports-modal`](../src/app/components/nurse-dashboard/nurse-reports-modal/), badges y detalle en [`nurse-patients-assigned-section`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/), tile de entrega en [`nurse-summary-section`](../src/app/components/nurse-dashboard/nurse-summary-section/), icono de notas en [`nurse-schedule-slots-modal`](../src/app/components/nurse-dashboard/nurse-schedule-slots-modal/). **B-04:** humo de `title` / export Excel en los seis specs de componente.

### 2026-05-13 — Mejora 207

- **207 — Qué (lote):** **B-05:** [`nurse-beds-section`](../src/app/components/nurse-dashboard/nurse-beds-section/) — **`i18n-title`** en tarjeta de cama y botón «Detalles». **B-05:** [`nurse-dashboard-header-search`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/) — **`i18n-title`** pista de uso del buscador (`@@nurseDashboardHeaderSearch.searchHintTitle`). **B-04:** specs ampliados.

### 2026-05-13 — Mejora 206

- **206 — Qué (lote):** **B-05:** ARIA localizable en [`nurse-pharmacy-section`](../src/app/components/nurse-dashboard/nurse-pharmacy-section/) (región contacto turno), [`nurse-dashboard-header-search`](../src/app/components/nurse-dashboard/nurse-dashboard-header-search/) (input búsqueda) y [`nurse-edit-bed-modal`](../src/app/components/nurse-dashboard/nurse-edit-bed-modal/) (radiogrupo, tabla, **`patientRowSelectAriaLabel`**). **B-04:** humo en los tres specs.

### 2026-05-13 — Mejora 205

- **205 — Qué (lote):** **B-05:** ARIA de filas con **`$localize`** en [`nurse-patient-medications-tab`](../src/app/components/nurse-dashboard/nurse-patient-medications-tab/) (**`medicationRowAriaLabel`**), [`nurse-patient-history-tab`](../src/app/components/nurse-dashboard/nurse-patient-history-tab/) (**`historyRecordRowAriaLabel`**) y [`nurse-patients-assigned-section`](../src/app/components/nurse-dashboard/nurse-patients-assigned-section/) (**`patientCardAriaLabel`**). **B-04:** humo en los tres **`.component.spec.ts`**.

### 2026-05-13 — Mejora 204

- **204 — Qué (lote):** **B-05:** [`nurse-tasks-section`](../src/app/components/nurse-dashboard/nurse-tasks-section/) — **`taskRowAriaLabel`** con **`@@nurseTasksSection.*`**. **B-05:** [`nurse-patient-treatments-day-tab`](../src/app/components/nurse-dashboard/nurse-patient-treatments-day-tab/) — **`notesCellDisplay`**, **`treatmentRowAriaLabel`** (`@@nursePatientTreatmentsDayTab.rowAriaOpenActions`). **B-04:** specs en **`nurse-tasks-section`** y **`nurse-patient-treatments-day-tab`**.

### 2026-05-13 — Mejora 203

- **203 — Qué (lote):** **B-05:** helper **`pendingTaskDescriptionPreview`** y modal **`nurse-tasks-quick-modal`** con **`nurseUiEmDash`**; **`taskRowAriaLabel`** con **`@@nurseTasksQuickModal.*`**. Pestañas paciente **medicación** / **tratamientos**: guiones vacíos coherentes y resumen de acciones. **B-04:** specs ampliados en cuatro archivos de prueba.

### 2026-05-13 — Mejora 202

- **202 — Qué (lote):** **B-05:** [`nurse-dashboard-task-actions.helpers.ts`](../src/app/components/nurse-dashboard/nurse-dashboard-task-actions.helpers.ts) — fallback **`@@nurseDashboard.taskActions.displayFallback`**; **`completeTaskLocally(..., localeId)`** con **`toLocaleString`**. **B-05:** [`nurse-not-completed-task-modal.component.ts`](../src/app/components/nurse-dashboard/nurse-not-completed-task-modal/nurse-not-completed-task-modal.component.ts) — **`nurseUiEmDash`** en resumen paciente/tarea. **B-05:** [`nurse-dashboard.component.ts`](../src/app/components/nurse-dashboard/nurse-dashboard.component.ts) — **`LOCALE_ID`** al completar tarea. **B-04:** specs de helpers y modal.

### 2026-05-14 — Mejora 201

- **201 — Qué (lote):** **B-05:** [`nurse-clinical-notes-scope-block`](../src/app/components/nurse-dashboard/nurse-clinical-notes-scope-block/) — cadenas **`@@ncnsb.*`**, fechas con `LOCALE_ID`, guiones con **`nurseUiEmDash`**. **B-04:** spec nuevo.

### 2026-05-14 — Mejora 200

- **200 — Qué (lote):** **B-05:** [`nurse-history-detail-modal`](../src/app/components/nurse-dashboard/nurse-history-detail-modal/) — `LOCALE_ID` / `nurseUiEmDash` / nuevas claves **`@@nurseHistoryDetailModal.*`** en rejilla y badges. **B-04:** spec ampliado.

### 2026-05-14 — Mejora 199

- **199 — Qué (lote):** **B-05:** modales enfermería [`nurse-medication-day-detail-modal`](../src/app/components/nurse-dashboard/nurse-medication-day-detail-modal/) (`LOCALE_ID`, `emDash`, **`@@nurseMedicationDayDetailModal.lineConsideredDate`**) y [`nurse-pending-task-detail-modal`](../src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/) (`@@nursePendingTaskDetailModal.type*` / `status*`, fechas con `LOCALE_ID`, `emDash` en plantilla). **B-04:** specs ampliados en ambos componentes.

### 2026-05-14 — Mejora 198

- **198 — Qué (lote):** **B-05:** [`staff-quick-actions.service.ts`](../src/app/shared/components/staff-dashboard-quick-actions/staff-quick-actions.service.ts) — **`@@staffQuickActions.*`** en toasts y errores; periodo de reportes con `LOCALE_ID` y separador localizado; fallback nombre enfermera con interpolación. **B-05:** [`staff-dashboard-quick-actions-toolbar.component.html`](../src/app/shared/components/staff-dashboard-quick-actions/staff-dashboard-quick-actions-toolbar.component.html) — **`@@staffQuickActionsHtml.*`**. **B-05:** modales — sufijo ámbito reportes en TS (`@@staffQuickActionsHtml.reportsScopeSuffix`). **B-04:** [`staff-quick-actions.service.spec.ts`](../src/app/shared/components/staff-dashboard-quick-actions/staff-quick-actions.service.spec.ts).

### 2026-05-14 — Mejora 197

- **197 — Qué (lote):** **B-05:** tarjeta compartida [`pharmacy-coverage-summary-card`](../src/app/shared/components/pharmacy-coverage-summary-card/) — **`i18n`** en plantilla (`@@pharmacyCoverageCard.*`) y fallback de error en TS. **B-04:** spec nuevo del componente + humo shell en [`supervisor-dashboard.component.spec.ts`](../src/app/components/supervisor-dashboard/supervisor-dashboard.component.spec.ts).

### 2026-05-14 — Mejora 196

- **196 — Qué (lote):** **B-05:** [`overview.component.ts`](../src/app/components/admin-dashboard/overview/overview.component.ts) — fallback **`@@adminOverview.errLoadStats`**; **`liveCurrentShiftLabel`** inicial vacío. **B-05:** [`patients-management.component.html`](../src/app/components/admin-dashboard/patients-management/patients-management.component.html) — guión de cama con **`adminPatientsEmDash`**. **B-04:** specs [`overview.component.spec.ts`](../src/app/components/admin-dashboard/overview/overview.component.spec.ts) y [`patients-management.component.spec.ts`](../src/app/components/admin-dashboard/patients-management/patients-management.component.spec.ts).

### 2026-05-14 — Mejora 195

- **195 — Qué (lote):** **B-05:** [`users-management.component.html`](../src/app/components/admin-dashboard/users-management/users-management.component.html) — bloque de **resultados**, **teléfono vacío**, **modal editar usuario** y **modal cambiar rol** sin literales fijos en plantilla. **B-05:** [`users-management.component.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.ts) — **`@@usersMgmtHtml.*`** y métodos de línea de resultados; **`userRowActionsSummary`** localizado. **B-04:** [`users-management.component.spec.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.spec.ts).

### 2026-05-14 — Mejora 194

- **194 — Qué (lote):** **B-05:** [`areas-management.component.html`](../src/app/components/admin-dashboard/areas-management/areas-management.component.html) — textos de UI enlazados a **`@@areasMgmtHtml.*`** / existentes **`@@areasMgmt.*`** (tablas, modales de área/camas/pacientes, asignación y cambio de área–cama, hojas de acciones). **B-05:** [`areas-management.component.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.ts) — **`readonly`** y métodos (`getAriaAreaBedRow`, títulos de modal, `formatBedAssignmentOptionLabel`, resúmenes de hoja, `getPatientFullName`, `areaBedsSheetSummary` con **`$localize`**); selects con **`[ngValue]`** para opción nula. **B-04:** [`areas-management.component.spec.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.spec.ts) — humo de helpers.

### 2026-05-14 — Mejora 193

- **193 — Qué (lote):** **B-05:** [`beds-management.component.html`](../src/app/components/admin-dashboard/beds-management/beds-management.component.html) — **`i18n`** / **`@@bedsMgmtHtml.*`** en vista y modales de camas. **B-05:** [`beds-management.component.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.ts) — helpers ARIA y modales con **`@@bedsMgmtHtml.*`**. **B-04:** [`beds-management.component.spec.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.spec.ts) — humo de helpers (sin método inexistente en el componente).

### 2026-05-13 — Mejora 192

- **192 — Qué (lote):** **B-05:** [`staff-management.component.html`](../src/app/components/admin-dashboard/staff-management/staff-management.component.html) — marcadores **`i18n`** con **`@@staffMgmtHtml.*`** en toda la vista principal y modales. **B-05:** [`staff-management.component.ts`](../src/app/components/admin-dashboard/staff-management/staff-management.component.ts) — helpers con **`$localize`** para ARIA, alertas de área, títulos de modal y opciones de cama; **`staffHtmlSaving` / `staffHtmlSave`**. **B-04:** spec de helpers.

### 2026-05-13 — Mejora 191

- **191 — Qué (lote):** **B-05:** plantilla [`schedules-management.component.html`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.html) con **`i18n`** y IDs **`@@schedMgmtHtml.*`** (toma de lista, cobertura, tablas, filtros, historial, modales y botones de estado). **B-05:** [`schedules-management.component.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.ts) — cadenas **`@@schedMgmtHtml.*`** para modales/ARIA y métodos de título/resumen. **B-04:** [`schedules-management.component.spec.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.spec.ts) — cobertura de helpers.

### 2026-05-13 — Mejora 190

- **190 — Qué (lote):** **B-05:** [`schedules-management.component.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.ts) — cierre de literales en TS con **`@@schedMgmt.*`** y **`$localize`** (toasts de carga/guardado/asistencia con interpolación de reparto, confirmaciones, títulos de tabla resumen, etiquetas de estado, export historial, asignación semanal/rápida, `getAreaName`, vista agrupada sin área, hoja Excel). **B-04:** [`schedules-management.component.spec.ts`](../src/app/components/admin-dashboard/schedules-management/schedules-management.component.spec.ts) — shim **`$localize`** y pruebas de humo de cadenas y helpers.

### 2026-05-13 — Mejora 189

- **189 — Qué (lote):** **B-05:** [`staff-management.component.ts`](../src/app/components/admin-dashboard/staff-management/staff-management.component.ts) — **`@@staffMgmt.*`** en flujos de enfermeras (área, teléfono, turno visible, estados operativos, asignación paciente–cama, quitar asignación, resúmenes de hoja) y textos de ayuda (`getAreaName`, `getPatientBed`, `liveShiftName`). **B-05:** [`areas-management.component.ts`](../src/app/components/admin-dashboard/areas-management/areas-management.component.ts) — cierre de literales en toasts/errores/confirmaciones de áreas y camas, creación masiva con interpolación, asignación y cambio de área/cama del paciente. **B-04:** shim y pruebas de humo en specs de **staff** y **áreas**.

### 2026-05-13 — Mejora 188

- **188 — Qué:** **B-05:** [`beds-management.component.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.ts) — cadenas de usuario en TS con **`@@bedsMgmt.*`** (avisos de creación/edición/asignación, errores al cargar pacientes para modales, diagnóstico en modal unificado, confirmación y toasts de borrado, textos de cobertura de turno y de la hoja de resumen por cama); mensajes con interpolación vía **`$localize`**; **`fromBedSheetViewPatient`** y resumen de hoja usan **`getBedClass === 'occupied'`** en lugar de comparar con la etiqueta localizada. **B-04:** [`beds-management.component.spec.ts`](../src/app/components/admin-dashboard/beds-management/beds-management.component.spec.ts) — providers de **`AdminPatientBedAssignmentService`** y **`AdminShiftCoverageAlertNavigationService`**; prueba de humo de cadenas.

### 2026-05-13 — Mejora 187

- **187 — Qué:** **B-05:** [`users-management.component.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.ts) — literales de validación, confirmaciones (cambio de rol de enfermera en rol y en edición), toasts y errores HTTP al cargar listados, borrado/restauración, export CSV (cabeceras y estados activo/inactivo) y mensaje de confirmación de borrado con interpolación, todo con **`@@usersMgmt.*`**; **`getRoleLabel`** unificado con **`usersMgmtRoleFilterOptions`**. **B-04:** humo en [`users-management.component.spec.ts`](../src/app/components/admin-dashboard/users-management/users-management.component.spec.ts).

### 2026-05-13 — Mejora 186

- **186 — Qué:** **B-05:** gestión de **pacientes** admin — formulario de ingreso, filtros, tabla, export CSV/Excel, modal de acciones por fila, toasts y modales de confirmación con **`@@adminPatients.*`** y helpers TS (`patientTableRowAriaLabel`, `patientRowActionsSummary`, etc.); criterio **enfermera sin asignar** sin depender del literal localizado. **B-05:** **`ShiftRealtimeService.formatShiftLabel`** con **`@@shiftRealtime.*`** (texto sin turno y nombre por defecto de turno). **B-04:** specs de **`patients-management`** y **`shift-realtime`**.

### 2026-05-13 — Mejora 185

- **185 — Qué:** **B-05:** sección **asistencia de turno** de farmacia — cadenas **`@@pharmacyAttendance.*`** en TS/HTML (cobertura por turno, formulario asistencia, estados, errores y toasts); panel farmacia — **`@@pharmacyModule.defaultPharmacyUserName`** como valor inicial de `pharmacyUserName`; contacto ausente en `staffContactLabel` alineado con **`pharmacyEmDash`**. **B-04:** spec nuevo del componente de asistencia + bloque de prueba **sin usuario** en spec de farmacia (cabecera con nombre por defecto).

### 2026-05-13 — Mejora 184

- **184 — Qué (lote paralelo):** **B-03:** **`NurseDashboardPatientRecordPatchFacade`** (parche historial administración + horario paciente) + **`NurseDashboardPatientCareCreateFacade`** (alta medicación y tratamiento) + specs; cuatro modales standalone (`history-edit`, `schedule-edit`, `add-medication`, `add-treatment`) declaran `providers` con la facade y dejan de inyectar `NurseService` directamente. **B-05:** farmacia — **`@@pharmacyModule.infoRequestDetails`** para el resumen informativo de solicitud (`viewRequestDetails`). **B-04:** specs de las dos facades nuevas, providers en specs de modales, prueba de `viewRequestDetails` en spec de farmacia.

### 2026-05-13 — Mejora 183

- **183 — Qué (lote paralelo):** **B-03:** tres facades — **`NurseDashboardPatientClinicalWriteFacade`** (append observaciones + `updateMedicalObservations` / alergias / necesidades / historia / observaciones generales), **`NurseDashboardAdministrationHistoryWriteFacade`** (`deleteHistory`), **`NurseDashboardMedicationMutationFacade`** (suspender, eliminar, reactivar medicación) + specs; `nurse-dashboard.component.ts` cableado y **sin** `NurseService` en el constructor; posponer tratamiento delegado en **`NurseDashboardTreatmentScheduleFacade`**. **B-05:** farmacia — cadenas **`$localize`** para validaciones y toasts de alta/borrado/movimiento de inventario y mensaje de confirmación de borrado. **B-04:** specs de las tres facades + prueba de humo de cadenas de inventario en spec de farmacia.

### 2026-05-13 — Mejora 182

- **182 — Qué (lote paralelo):** **B-03:** tres facades en `nurse-dashboard` — **`NurseDashboardTaskLifecycleFacade`** (`markNotCompleted` / `postpone` → `NurseService`), **`NurseDashboardPatientScheduleWriteFacade`** (`deleteSchedule` → `deletePatientSchedule`), **`NurseDashboardTreatmentScheduleFacade`** (`patchAction` → `patchTreatmentScheduleAction`) + specs; cableado en `nurse-dashboard.component.ts` (tareas no completadas/posponer, borrados de horario pendiente, aceptar/cancelar tratamiento). **B-05:** farmacia — mensajes de error de carga y toast genérico de solicitudes con **`$localize`** (`errLoadInventory`, `errLoadRequests`, `errLoadRequestsToast`, `errLoadHistory`). **B-04:** specs de las tres facades + pruebas de fallo de carga en `pharmacy-dashboard.component.spec.ts`.

### 2026-05-13 — Mejora 181

- **181 — Qué (lote paralelo):** **B-03:** **`NurseDashboardCompleteTaskFacade`** (`completeByScheduleId` → `completeTask`) + spec; medicación/tareas/horario completados vía fachada. **B-05:** farmacia — export CSV/Excel e impresión con **`$localize`** (columnas, títulos de impresión, avisos vacíos, toasts de éxito, nombres de hoja Excel, tipo Entrega/Rechazo). **B-04:** spec farmacia — cabeceras export/impresión.

### 2026-05-13 — Mejora 180

- **180 — Qué (lote paralelo):** **B-03:** **`NurseDashboardPatientDetailsLoadFacade`** (`loadDetails` → `getPatientDetails`) + spec; modal paciente usa la fachada en `loadPatientDetails`. **B-05:** farmacia — `@@pharmacyModule.*` en HTML de modales y acciones; resúmenes `requestActionsSummary` / `inventoryActionsSummary` / `historyActionsSummary`; estados y tipos de movimiento/kardex; confirmación stock insuficiente; toasts/avisos de entrega/rechazo/estado; helpers `requestDetailModalTitle`, `stockMovementQuantityLabel`. **B-04:** spec farmacia — `getStatusLabel('pending')` y `requestDetailModalTitle`.

### 2026-05-13 — Mejora 179

- **179 — Qué (lote paralelo):** **B-03:** **`NurseDashboardMyPatientsSearchFacade`** (`searchByQuery` → `getMyPatients`) + spec; cabecera enfermería usa la fachada. **B-05:** farmacia — `@@pharmacyModule.*` ampliado (valor N/A, sufijo rol enfermera en solicitudes, nota por defecto en historial, mensajes vacíos, botones/pies de paginación interpolados, paneles export historial/bodega, estadísticas rápidas inventario, chips de filtro, columnas tablas historial/inventario/kardex, texto carga inventario). **B-04:** spec farmacia — `pharmacyRequestsPaginationInfo()` y título export historial.

### 2026-05-13 — Mejora 178

- **178 — Qué (lote paralelo, varios módulos):** **B-03:** nueva **`NurseDashboardTasksDayHistoryFacade`** (`loadHistory` → `getTasksDayHistory`) + spec; **`loadTasksDayHistory`** en `nurse-dashboard` usa la fachada. **B-05:** cuerpo de **farmacia** — `@@pharmacyModule.*` (módulo solicitudes: título, búsqueda, filtros en array, KPIs, ARIA resumen, columnas tabla, carga; módulos historial e inventario: títulos, placeholders, carga, botón agregar). **B-04:** spec **`overview.component.spec.ts`** (mocks `forkJoin` de `loadStats`, reloj en vivo, `navigate`); **`pharmacy-dashboard.component.spec.ts`**: humo **`pharmacyModule`** (título solicitudes + recuento filtros).

### 2026-05-13 — Mejora 177

- **177 — Qué (lote):** **B-03:** `NurseDashboardHandoverNoteFacade` amplía **`saveNote`** (`putHandoverNote`) y el panel usa la fachada en **`saveHandoverNote`**; spec del facade con segundo caso. **B-05:** **`$localize`** en **áreas** (cabecera, tarjeta, cobertura turno, estadísticas, iconos, modal listado camas con cabeceras y estados) y más cadenas en **usuarios** (columnas de tabla, activo/inactivo, vacío de búsqueda, hoja de acciones, título modal editar). **B-04:** **`ensureLocalizeShim`** + humo en **`areas-management.component.spec.ts`**; prueba **`userTableRowAriaLabel`** en users spec.

### 2026-05-13 — Mejora 176

- **176 — Qué (lote):** **B-03:** fachada **`NurseDashboardHandoverNoteFacade`** (`fetchNote` → `NurseService.getHandoverNote`) + spec; panel enfermería usa la fachada en recarga de entrega y aviso pendiente. **B-05:** **`$localize`** en gestión de **usuarios** (cabecera, bloques supervisor/farmacia, filtrol de rol con opciones en TS, búsqueda, limpieza, carga, export CSV, ARIA tabla) y **camas** (cabecera, filtros, mensaje de carga). **B-04:** spec nuevo **`users-management.component.spec.ts`** (shim + humo i18n + comprobación de llamadas `getUsersPaginated`); en **beds** spec: **`ensureLocalizeShim`**, mock **`getAreasShiftCoverage`** (alineado con `forkJoin` de `loadData`) y test de título localizable.

### 2026-05-13 — Mejora 175

- **175 — Qué:** **B-05:** panel farmacia — cabecera **`app-dashboard-shell`** y pestañas de navegación usan cadenas **`$localize`** en **TS** (`@@pharmacyShell.*`) con bindings en **HTML**; **`ensureLocalizeShim`**, prueba de humo de textos y **stubs** de `PharmacyService` para asistencia (`getWorkShifts`, resumen/filas/guardado) al montar **`app-pharmacy-shift-attendance-section`**.

### 2026-05-13 — Mejora 174

- **174 — Qué:** **B-06:** `schedules-management` migra los modales de edición de horario, historial de asistencia y selector de día de descanso a **`app-modal-shell`**; estilos de ancho vía **`:host ::ng-deep app-modal-shell .modal-content.*`**; spec con mocks de **Router** / **ActivatedRoute** y prueba de humo del shell. **B-05:** panel supervisor — cadenas de cabecera shell (`dashboardTitle`, `roleDisplayLabel`, `logoAriaLabel`, `navAriaLabel`) con **`$localize`** (`@@supervisorShell.*`) en **TS** + bindings en **HTML**; **`ensureLocalizeShim`** en el spec del supervisor.

### 2026-05-13 — Mejora 173

- **173 — Qué:** **B-06:** `staff-management` migra cinco modales a **`app-modal-shell`** + CSS `::ng-deep` + tests de humo. **B-05:** `i18n` en resumen admin (`overview`), `$localize` en cabecera/hamburguesa (`admin-dashboard`), `i18n` parcial en ingreso de pacientes. **Horarios:** en **#174** se migran los modales de `schedules-management` al mismo shell (antes solo constaba en pendientes como `modal-backdrop-neuro`).

### 2026-05-13 — Mejora 172

- **172 — Qué (B-03):** Nuevas facades **`NurseDashboardNurseReportsLoadFacade`** (carga paralela informe medicación + estadísticas cumplimiento) y **`NurseDashboardPharmacyBulkFacade`** (envío paralelo de solicitudes a farmacia), cada una con **spec**; integración en **`nurse-dashboard.component.ts`** sustituyendo `forkJoin` inline en `openNurseReportsModal` y `sendPharmacyRequest`.

### 2026-05-13 — Mejora 171

- **171 — Qué:** **`app-modal-shell`** admite tema **`adminAssign`** (mismas clases y z-index que [`admin-assign-modal.shared.css`](../src/app/shared/styles/admin-assign-modal.shared.css)), con **`assignLarge`** y opcional **`assignStackTop`**. **Gestión de áreas:** modales «Asignar área y cama» y «Cambiar área y cama» migrados al shell; tests de humo en **`areas-management.component.spec.ts`**.

### 2026-05-13 — Mejora 170

- **170 — Qué:** Cierre del plan «áreas + nurse + doc serverless»: extensión de **`app-modal-shell`** con **`titleIcon`**; **gestión de áreas** migra seis modales estándar al shell + **`app-section-header`**; spec **`areas-management.component.spec.ts`**; **`NurseDashboardPrimaryLoadFacade`** (carga primaria stats/camas/pacientes) + spec y uso en **`nurse-dashboard.component.ts`**; documentación en **`backend/README.md`** (handler `api/index.ts` vs `src/app-test.ts` / `src/app.ts`).

### 2026-05-13 — Mejora 169

- **169 — Qué:** Continuación del plan de **modularización admin/supervisor** y arranque de **B-03** (fachada de carga secundaria enfermería).
  - **`app-staff-dashboard-shell`:** cabecera compartida, pestañas, slots (`staffShellTop`, `staffShellAfterHeader`, `staffShellNavEnd`, `staffShellQuickModals`, `staffShellMain`); admin con drawer móvil; supervisor sin drawer.
  - **`DashboardTabStateService`** + `DASHBOARD_TAB_STATE_CONFIG` / `staff-dashboard-tab-state.config.ts`: pestañas con `signal`, `localStorage` y visitadas; usado en admin y supervisor.
  - **`app-modal-shell`:** piloto en **`users-management`** (editar usuario / cambiar rol).
  - **`app-section-header`**, **`app-admin-empty-state`:** piloto en gestión de usuarios.
  - **`models/admin.types.ts`:** interfaces extraídas de `admin.service.ts` con reexport para compatibilidad.
  - **`NurseDashboardSecondaryLoadFacade`:** `forkJoin` de tareas + medicación farmacia + contexto de turno; tests nuevos/actualizados.

### 2026-05-05 — Mejora 168

- **168 — Qué (B-05):** Textos de **toasts** y del **`confirm`** «liberar cama» que seguían como literales en **modales hijos** del panel enfermería pasan a **`$localize`** con IDs **`@@nurseModal.*`** centralizados en **`nurse-modal-component-toasts.helpers.ts`** (fuera de los helpers del `nurse-dashboard.component.ts`, ya cubiertos en **#167**).
  - Modales cableados: alta medicación/tratamiento; edición historial; edición horario tratamiento; posponer tratamiento; eliminar medicación (motivo); posponer tarea; editar cama (toasts + confirmación; **`cancelText`** omitido para usar el valor por defecto traducible del wrapper **#166**).
  - **`nurse-add-treatment-modal`:** mensaje de error HTTP usa **`NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN`** desde `nurse-dashboard-http-fallback-messages.helpers.ts`.

### 2026-05-05 — Mejora 167

- **167 — Qué (B-05):** Internacionalización con **`$localize`** (`@@nurseDashboard.*`) de prácticamente todo el texto de **toasts, avisos y fallbacks HTTP** definido en helpers `nurse-dashboard-*.helpers.ts` usados desde **`nurse-dashboard.component.ts`** (sin tocar los modales de alta med/trat u otros hijos que siguen con `toast.*` literal en esta mejora).
  - Archivos destacados: `nurse-dashboard-http-fallback-messages`, `reload-error` (mensaje genérico de carga con interpolación del error), `secondary-load`, `navigation` (mensaje área/camas/pacientes), `interpolated-toasts`, `confirmation-copy`, `handover-*`, `nurse-reports-*`, `schedule-slot-toasts`, `pharmacy-task-actions`, `history-schedule-delete`, `patient-field-save-toasts`, `misc-guard`, `treatment-schedule-toasts`, `patient-observation-inline`, `task-actions-toasts`, `day-history-export`, `mark-medication-toasts`, `tasks-day-history-load`, `history-actions` (`successMessageForHistoryDeleteTarget`).
  - **Tests:** `nurse-dashboard-reload-error.helpers.spec.ts` y `nurse-dashboard-secondary-load.helpers.spec.ts` usan `NURSE_DASHBOARD_HTTP_FALLBACK_UNKNOWN` en las expectativas de fallback de `readHttpErrorMessage`; resto de specs de helpers siguen pasando (44 pruebas en lote).

### 2026-05-05 — Mejora 166

- **166 — Qué (B-05 + B-04):** Modal de confirmación global:
  - **`confirmation-modal.component.ts`:** valores por defecto de `title` / `message` / `confirmText` / `cancelText` con **`$localize`** (IDs `@@confirmationModal.defaultTitle`, `.defaultMessage`, `.defaultConfirmLabel`, `.defaultCancelLabel`).
  - **`.html`:** `i18n-aria-label` en botón cerrar (`@@confirmationModal.closeAriaLabel`), patrón alineado con otros modales.
  - **`confirmation-wrapper.component.ts`:** mismos IDs en lecturas **`defaultModal*`** ligadas al modal (sin literales españoles huérfanos); si falta **`message`** se usa el mensaje por defecto traducible en lugar del cuerpo vacío (`''`).
  - **Tests:** `confirmation-modal.component.spec.ts` (shim `$localize`, visibilidad con `show`, textos por defecto y ARIA de cierre).

### 2026-05-05 — Mejora 165

- **165 — Qué (B-05 + B-04):** Cadenas que vivían en TypeScript pasan por **`$localize`** con IDs `@@…` estables (extract-i18n puede recogerlas):
  - **Medicación/tratamiento del día:** `nurse-patient-medication-helpers.ts`, `nurse-treatments-today.helpers.ts` (estado + tipo tratamiento); guión vacío vía **`nurseUiEmDash`**.
  - **Historial paciente / vista previa notas:** `nurse-patient-history.helpers.ts` (`historyRecordStatusLabel`, prefijos Plan/Registro).
  - **CSV historial del día:** `nurse-dashboard-day-history-csv.helpers.ts` (`Completada` / `No realizada`).
  - **Modal horarios:** `nurse-schedule-modal-slot-status.helpers.ts` (distinto de wording «Administrado» en otras vistas); **`nurse-schedule-slots-modal`** delega estados + grillas semanales con **`nurseWeekdayShortLabelsMondayFirst`** desde `nurse-dashboard-ui-i18n.helpers.ts`.
  - **Días Lun–Dom:** mismos helpers para **`nurse-medication-day-detail-modal`**, alta **medicación/tratamiento** (`nurseWeekdaySelectOptionsMondayFirst`).
  - **`nurse-history-detail-modal`** / **`nurse-medication-day-detail-modal`** delegan en `historyRecordStatusLabel` y `medicationSlotStatusLabel` para no duplicar textos.
  - **Infra:** dependencia **`@angular/localize`**, polyfill **`\@angular/localize/init`** (`angular.json`), `compilerOptions.types` en `tsconfig.app`/`spec`; `ensureLocalizeShim`/`beforeAll` en specs de helpers; nuevos **`nurse-dashboard-ui-i18n.helpers.spec.ts`** y **`nurse-schedule-modal-slot-status.helpers.spec.ts`**.

### 2026-05-05 — Mejora 164

- **164 — Qué (B-05 + B-04):** Navegación por teclado en el **`tablist`** del modal de ficha paciente, en la misma línea que el nav principal:
  - `nurse-patient-modal-shell.component.ts`: orden fijo `patientModalTabOrder`, `onPatientTabKeydown` (`ArrowLeft` / `ArrowRight` / `Home` / `End`), emisión `activeTabChange` y foco en el botón del tab con **`queueMicrotask`** + función **`patientModalTabDomId`** (mapeo `medications|schedule|observations|history` → `#nurse-patient-tab-*`).
  - `.html`: `(keydown)="onPatientTabKeydown($event, '…')"` en cada pestaña.
  - **Tests:** `nurse-patient-modal-shell.component.spec.ts` (`ArrowRight` → `schedule` + foco; `Home` desde `history` → `medications` + foco).
  - **Continuación:** **#165** (`$localize` en helpers de etiquetas y días).

### 2026-05-06 — Mejora 163

- **163 — Qué (B-05 + B-04):** Internacionalización de las **cuatro pestañas** embebidas en la ficha paciente:
  - `nurse-patient-medications-tab.component.html`: resumen cama/edad/diagnóstico; tabla; tooltips botones fila; vacío.
  - `nurse-patient-treatments-day-tab.component.html`: cabecera, tabla, «Horarios», `aria-label`/`title` en acciones; vacío.
  - `nurse-patient-observations-tab.component.html`: tarjetas, placeholders, guardar/cancelar, nueva observación.
  - `nurse-patient-history-tab.component.html`: filtros periodo/resultado, cabeceras tabla, títulos de iconos fila; vacío.
  - **Detalle:** en medicamentos, `{{ age }}` fuera del bloque i18n + `<span i18n>` solo para «años», para que el shim Karma no deje marcadores `INTERPOLATION`.
  - **Tests:** `ensureLocalizeShim()` en los cuatro specs.

### 2026-05-06 — Mejora 162

- **162 — Qué (B-05 + B-04):** Ficha paciente en modal — **`nurse-patient-modal-shell.component.html`:**
  - **i18n:** título `📋 {{ patient.name }}`, textos de las cuatro pestañas, pie Cerrar / Imprimir, `i18n-aria-label` del botón cerrar y del `tablist`.
  - **ARIA (alineado con nav principal):** contenedor `role="tablist"`; cada pestaña `role="tab"`, `id` `nurse-patient-tab-*`, `aria-controls` al panel; paneles `role="tabpanel"`, `id` `nurse-patient-panel-*`, `aria-labelledby` al tab.
  - **Tests:** shim `$localize` y caso que comprueba `tablist`/`tab`/`tabpanel` y `aria-selected` en la pestaña activa.
  - **Continuación:** **#163** (i18n pestañas) y **#164** (teclado en tablist).

### 2026-05-06 — Mejora 161

- **161 — Qué (B-05):** Internacionalización en cinco modales de medicación/programación del panel enfermería:
  - `nurse-suspend-medication-modal`: resumen medicación, duración (opciones y fecha personalizada), motivo (`i18n-placeholder`), acciones.
  - `nurse-delete-medication-modal`: aviso permanente, motivo eliminación, botones.
  - `nurse-reactivate-medication-modal`: resumen, caja informativa, confirmar.
  - `nurse-treatment-postpone-modal`: resumen tratamiento, fecha/hora nuevas, guardar.
  - `nurse-schedule-edit-modal`: título, descripción/notas, pie.
  - **Tests:** shim `$localize` en los cinco `.spec.ts`.

### 2026-05-06 — Mejora 160

- **160 — Qué (B-05):** Internacionalización en cuatro modales de detalle/edición de enfermería:
  - `nurse-pending-task-detail-modal.component.html`: título, cierre ARIA, campos de línea (hora/tipo/paciente/cama), secciones descripción y medicamento, pie.
  - `nurse-medication-day-detail-modal.component.html`: datos de dosis/pauta/vista semanal, vacío sin notas de toma, cerrar.
  - `nurse-history-detail-modal.component.html`: cabecera del registro, etiquetas del bloque ampliado (planificado, notas, motivo, registro real).
  - `nurse-history-edit-modal.component.html`: estado del registro (opciones del select), hints, descripción/notas/motivo, `i18n-placeholder` en notas, cancelar/guardar.
  - **Tests:** shim `$localize` en los cuatro `.spec.ts`.
  - **Nota:** textos devueltos por `typeLabel`, `statusLabel`, etc. siguen en TS (mejora posterior con `$localize` en métodos si se desea).

### 2026-05-06 — Mejora 159

- **159 — Qué (B-05):** Internacionalización en cuatro modales de enfermería:
  - `nurse-add-medication-modal.component.html`: título base + nombre paciente, formulario completo (frecuencia, horarios con sugeridos, duración, notas), botones; quitar hora con `title`/`aria-label` traducibles.
  - `nurse-add-treatment-modal.component.html`: títulos según modo, vacío, contexto paciente, programación, recurrente, pie (variantes guardar/agregar).
  - `nurse-edit-bed-modal.component.html`: cama, estado, asignación, búsqueda, mensajes vacío/búsqueda, liberar/guardar.
  - `nurse-schedule-slots-modal.component.html`: título medicación/tratamiento con `{{ title }}`, secciones semana/hoy/otras fechas, tablas y vacíos.
  - **Nota:** abreviaturas **Lun…Dom** siguen en `daysOfWeek` del TS (extracción en plantilla posible en mejora posterior).
  - **Tests:** shim `$localize` en los cuatro `.spec.ts`.

### 2026-05-06 — Mejora 158

- **158 — Qué (B-05):** Internacionalización incremental en tres modales de enfermería:
  - `nurse-postpone-task-modal.component.html`: título, cierre ARIA, resumen (hora/paciente/tarea), labels fecha/hora, hint, cancelar/confirmar.
  - `nurse-not-completed-task-modal.component.html`: título, resumen, motivo (label, `i18n-placeholder`, contador `…/500 caracteres`), botones.
  - `nurse-pharmacy-patients-modal.component.html`: título con `{{ med.name }}`, intro con dosis/total/pacientes, hint, cama y sufijo de área.
  - **Tests:** shim `$localize` en los tres `.spec.ts`; en `nurse-postpone-task-modal.component.spec.ts`, fecha de prueba con **calendario local** (`getFullYear`/mes/día) para alinear con `new Date(\`Y-M-DThh:mm:00\`)` del componente (evita falsos negativos si `toISOString()` cae en otro día UTC).

### 2026-05-06 — Mejora 157

- **157 — Qué (B-05):** Internacionalización incremental de los modales rápidos **Tareas** y **Farmacia** del panel enfermería:
  - `nurse-tasks-quick-modal.component.html`: `i18n`/`i18n-*` en título, cierre ARIA, intro, labels de filtros, opciones de horario, cabeceras de tabla, tipos de tarea, estados (`Pendiente`/`Completada`/`No realizada`), tooltips de acciones, vacío y pie.
  - `nurse-pharmacy-quick-modal.component.html`: mismo patrón + badges resumen; plural **paciente(s)** con mensaje ICU; estados Solicitado/Pendiente.
  - **Tests:** shim `$localize` en `nurse-tasks-quick-modal.component.spec.ts` y `nurse-pharmacy-quick-modal.component.spec.ts`.

### 2026-05-06 — Mejora 156

- **156 — Qué (B-05):** Internacionalización incremental de modales clave de enfermería:
  - `nurse-handover-modal.component.html`: `i18n`/`i18n-*` en título, `aria-label` de cierre, labels de fecha/contenido, placeholder y botón cancelar.
  - `nurse-reports-modal.component.html`: `i18n`/`i18n-*` en título, `aria-label` de cierre, etiquetas KPI y botón cerrar.
  - Compatibilidad tests: shim `$localize` en `nurse-handover-modal.component.spec.ts` y `nurse-reports-modal.component.spec.ts`.

### 2026-05-06 — Mejora 155

- **155 — Qué (B-05):** Internacionalización incremental en `nurse-dashboard-main-nav.component.html` con `i18n` e `i18n-*` en textos de pestañas, labels ARIA y títulos de accesos rápidos. Para mantener tests unitarios, se añade shim `$localize` en `nurse-dashboard-main-nav.component.spec.ts` y se ajustan expectativas/selectores afectados por metadatos i18n.

### 2026-05-06 — Mejora 154

- **154 — Qué (B-04):** Spec **Playwright e2e** `frontend/e2e/nurse-dashboard-main-nav-keyboard.spec.ts` para validar navegación por teclado en `nurse-dashboard-main-nav`: `ArrowRight/ArrowLeft` cambia de vista (paneles `role="tabpanel"`) y mueve el foco (`document.activeElement` pasa a `nurse-tab-*`).
  - **Ejecución:** ✅ `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test e2e/nurse-dashboard-main-nav-keyboard.spec.ts --project=chromium`.

### 2026-05-06 — Mejora 153

- **153 — Qué (B-05 + B-04):** Nueva directiva **`ModalFocusTrapDirective`** (`appModalFocusTrap`) en **`shared/directives/modal-focus-trap.directive.ts`:** al abrir enfoca el primer control enfocable del diálogo; **Tab / Mayús+Tab** mantienen el foco dentro del host; **`tabindex="-1"`** en el host para foco de respaldo; al destruir restaura el elemento que tenía el foco antes. Declarada en todos los **`role="dialog"`** del panel enfermería (modales bajo `nurse-dashboard/*-modal/`, `nurse-patient-modal-shell`) y en **`confirmation-modal`**. **Tests:** **`modal-focus-trap.directive.spec.ts`**.

### 2026-05-06 — Mejora 152

- **152 — Qué (B-05 + B-04):** En **`nurse-dashboard-overlays-stack.component.ts`** se añade cierre global por teclado con **`@HostListener('document:keydown.escape')`** y una función de prioridad para cerrar el overlay superior (confirmaciones/modales rápidos antes que ficha paciente). Al cerrar por Escape, se hace `preventDefault`/`stopPropagation` cuando procede. **Tests:** `nurse-dashboard-overlays-stack.component.spec.ts` añade casos para prioridad (`showHandoverModal` + `showPatientModal` cierra handover) y escenario sin overlays abiertos. 

### 2026-05-06 — Mejora 151

- **151 — Qué (B-05 + B-04):** **Modales del panel enfermería** (componentes bajo `nurse-dashboard/*-modal/` y `nurse-patient-modal-shell`): patrón **WAI-ARIA** para ventana modal — backdrop **`role="presentation"`**, panel **`role="dialog"`** **`aria-modal="true"`** **`aria-labelledby`** apuntando al **`id`** del **`<h3>`** titular; botón **✕** con **`aria-label="Cerrar"`**. Cubiertos: handover, reportes, paciente, not-completed, tasks-quick, pharmacy-quick, postpone task, pharmacy patients, schedule slots, history detail/edit, add medication/treatment, edit bed, medication day detail, pending task detail, suspend/delete/reactivate medication, treatment postpone, schedule edit. **Test:** **`nurse-handover-modal.component.spec.ts`** comprueba `role="dialog"` y vínculo título.

### 2026-05-06 — Mejora 150

- **150 — Qué (B-05 + B-04):** Panel **enfermería:** **`nurse-dashboard-main-nav`:** contenedor **`role="tablist"`** (vistas), pestañas **`role="tab"`** con **`aria-controls`/`aria-selected`**, grupo **`role="group"`** «Accesos rápidos» (Entrega/Reportes fuera del tablist); **`onMainViewTabKeydown`** + **`mainViewTabOrder`** + foco con **`queueMicrotask`**. **`nurse-dashboard.component.html`:** **`app-dashboard-shell`** con **`panelHeadingId`**, logo accesible; contenido en **`<main class="dashboard-content" id="nurse-dashboard-main">`**; cada vista con **`role="tabpanel"`** y **`aria-labelledby`** al botón tab. **CSS:** espaciado **`tablist`/rápidos** en `:host`. **Tests:** **`nurse-dashboard-main-nav.component.spec.ts`** (tablist, teclado, foco). **Archivos:** `nurse-dashboard-main-nav.component.html`/`.ts`/`.css`/`.spec.ts`, `nurse-dashboard.component.html`.

### 2026-05-06 — Mejora 149

- **149 — Qué (B-05 + B-04):** **`DashboardShellComponent`:** entradas **`navRoleTablist`**, **`panelHeadingId`**, **`headerLogoAlt`**, **`logoSectionAriaLabel`**; **`h1`** con **`id`** opcional; **`nav`** con **`role="tablist"`** cuando aplica; logo con **`aria-label`** opcional; **`img`** con alt configurable (por defecto «NurseHelper»); botones perfil/salida con **`aria-label`**. **Farmacia:** pestañas **`role="tab"`** / paneles **`tabpanel`**, **`<main>`** con **`aria-labelledby`**, **`onPharmacyTabKeydown`** + **`pharmacySectionOrder`**. **Tests:** **`pharmacy-dashboard.component.spec.ts`**. **Archivos:** `dashboard-shell.component.ts`/`.html`, `pharmacy-dashboard.component.ts`/`.html`/`.spec.ts`.

### 2026-05-06 — Mejora 148

- **148 — Qué (B-05 + B-04):** Panel **supervisor** alineado con admin: **`supervisor-dashboard.component.html`** con **`tablist`/`tab`/`tabpanel`**, **`<main aria-labelledby>`**, **`h1`** con **`id`**, botones **`type="button"`**, logo y cierre accesibles. **`onSupervisorTabKeydown`** + **`supervisorTabOrder`** en **`.ts`**. **Tests:** **`supervisor-dashboard.component.spec.ts`**. **Archivos:** `supervisor-dashboard.component.html`, `.ts`, `.spec.ts`.

### 2026-05-06 — Mejora 147

- **147 — Qué (B-05 + B-04):** **Teclado** en pestañas del admin: **`onAdminTabKeydown`** en `admin-dashboard.component.ts` (`ArrowLeft`/`ArrowRight`/`Home`/`End`), **`adminTabOrder`**, foco al botón destino con **`queueMicrotask`**. Template: **`(keydown)`** en cada pestaña. **Tests:** **`admin-dashboard.component.spec.ts`** (`HttpClientTestingModule`, `AuthService` con usuario admin, **`ArrowRight`**, **`End`**, tecla ignorada). **Archivos:** `admin-dashboard.component.ts`, `.html`, `.spec.ts`.

### 2026-05-06 — Mejora 146

- **146 — Qué (B-05 parcial):** En **`admin-dashboard`**, mejorar accesibilidad de la navegación por secciones: **`role="tablist"`** en `<nav>` con **`aria-label`**, cada enlace como **`role="tab"`** con **`aria-selected`**, **`aria-controls`** e **`id`** emparejados con paneles **`role="tabpanel"`** y **`aria-labelledby`**. Contenedor de contenido como **`<main aria-labelledby>`** vinculado al **`h1`** con **`id`**. Botones de nav/Cerrar sesión con **`type="button"`**; texto accesible en logo (volver al resumen) y en perfil/salida; imagen de logo con **`alt=""`** (el título va en **`h1`**). **Archivo:** `admin-dashboard.component.html`.

### 2026-05-06 — Mejora 145

- **145 — Qué (B-04):** Añadir **`beds-management.component.spec.ts`**: mocks **`AdminService`** (`getBeds`, `getAreas`, `getPatients`, `getPatientsPage`, `createBed`), **`ToastService`**, **`ConfirmationService`**. Pruebas: carga inicial; **`filteredBeds`** / **`getBedsByArea`** con ocupada/disponible; **`getPatientNameForBed`**, **`getBedClass`**, **`getBedStatusLabel`**; **`createBed`** sin datos → **`warning`** y no llama API; **`openCreateBedModal`** con **`selectedAreaId`**.

### 2026-05-06 — Mejora 144

- **144 — Qué (B-04):** Añadir **`staff-management.component.spec.ts`**: montaje con mocks de **`AdminService`** (`getAreas`, `getBeds`, `getPatients`, `getUsersPaginated`), **`ShiftsService`** (`getAllShifts` vacío, `getShiftAttendance`), **`Router`**, **`ConfirmationService`**, **`ToastService`**. Pruebas: carga **`forkJoin`** → una enfermera y **`getAreaName`**; **`getFilteredNurses`** + **`clearFilters`**; **`patientHasBedAssigned`**; etiquetas/clases de estado operativo; **`toggleNurseDetail`**; **`getNursePhoneDisplay`**.

### 2026-05-06 — Mejora 143

- **143 — Qué (B-04):** Añadir **`schedules-management.component.spec.ts`**: prueba de montaje tras **`ngOnInit`** (semana ISO, `loading`, turnos con descanso, etiqueta reloj) con mocks de **`AdminService`**, **`ShiftsService`** (`getAllShifts`, `getShiftAttendance`), **`ConfirmationService`**, **`ToastService`** y **`ExportService`** vacío. Pruebas de **`confirmDayOffChoice`** y **`cancelDayOffPicker`** (resolver el día o `null`).

### 2026-05-06 — Mejora 142

- **142 — Qué:** En **`beds-management`**, sustituir todos los **`alert()`** por **`ToastService`**: validación al crear cama y al guardar edición; éxito al crear / actualizar / liberar / asignar; errores de creación, actualización de cama y de asignación de paciente. Mensajes de éxito sin prefijo «✅». **Archivo:** `beds-management.component.ts`.

### 2026-05-05 — Mejora 141

- **141 — Qué:** En **`staff-management`**, sustituir todos los **`alert()`** por **`ToastService`** (validación de área, edición de enfermera, cambio de área, límites de pacientes, asignación con cama, errores HTTP, desasignación y liberar cama). **Archivo:** `staff-management.component.ts`.

### 2026-05-05 — Mejora 140

- **140 — Qué:** En **`schedules-management`**, sustituir **`alert()`** por **`ToastService`** (éxito / advertencia / error) y **`prompt()`** del día de descanso por **modal neumórfico** con botones por día (`pickDayOffDayAsync` + `confirmDayOffChoice` / `cancelDayOffPicker`). **Archivos:** `schedules-management.component.ts`, `.html`, `.css`.

### 2026-05-05 — Mejora 139

- **139 — Qué:** En **`schedules-management`**, sustituir todos los **`confirm()`** de programación semanal, limpieza global/por enfermera y asignación rápida por **`ConfirmationService`**. Nuevos textos y funciones de mensaje en **`admin-confirmation-copy.helpers.ts`** (incl. pregunta día de descanso «automáticamente» vs individual). Los flujos pasan a **async**. La sustitución del **`prompt`** del día concreto se completó en **#140**.

### 2026-05-05 — Mejora 138

- **138 — Qué:** Sustituir **`confirm()` nativo** en **admin** por **`ConfirmationService`** (modal global `app-confirmation-wrapper`): liberar cama (`beds-management`), eliminar medicamento en edición de paciente (`patients-management`), quitar paciente asignado a enfermera (`staff-management`, requiere inyectar servicio). Textos comunes y función de mensaje dinámico en **`admin-confirmation-copy.helpers.ts`** + spec.

### 2026-05-05 — Mejora 137

- **137 — Qué:** Sustituir **`confirm()` nativo** al borrar registro de **historial** o **tratamiento pendiente** por **`ConfirmationService`** (mismo estilo que borrar dosis / cancelar tratamiento). Textos en **`nurse-dashboard-confirmation-copy.helpers.ts`** + spec. **`deleteHistoryRecord`** y **`deleteScheduleItem`** pasan a **async**; **`deleteTreatmentSlot`** delega con **`void`**.

### 2026-05-05 — Mejora 136

- **136 — Qué:** Constantes para el **segundo argumento (fallback)** de `readNurseDashboardHttpErrorMessage` en el panel enfermería (`Error desconocido`, administración, borrados, tratamiento, suspender/reactivar medicación, posponer tarea). **Archivos:** `nurse-dashboard-http-fallback-messages.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.

### 2026-05-05 — Mejora 135

- **135 — Qué:** Funciones puras para textos de toast con **interpolación** (administración de dosis en slot/lista, completar ítem de agenda, observación nueva, solicitud masiva farmacia, tarea completada/no administrada/pospuesta, errores HTTP de detalle paciente y CRUD medicación). **Archivos:** `nurse-dashboard-interpolated-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.

### 2026-05-05 — Mejoras 132 a 134 (lote)

- **132 — Qué:** Constantes para toasts de **tareas**: tarea inválida (con/sin prefijo «Error:»), no identificar tarea, fallo HTTP al completar, ID paciente inválido al cargar detalle, postergación con fecha/hora inválida, motivo con menos de 10 caracteres (compartido con suspender medicación). **Archivos:** `nurse-dashboard-task-actions-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **133 — Qué:** Toasts de **borrado** en historial (error genérico) y de **tratamiento pendiente** (ID paciente inválido / éxito). **Archivos:** `nurse-dashboard-history-schedule-delete-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **134 — Qué:** Toasts **misc**: paciente/medicamento no disponible (suspender/eliminar/reactivar), cama sin id al editar, impresión sin paciente o ventana emergente bloqueada. **Archivos:** `nurse-dashboard-misc-guard-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.

### 2026-05-05 — Mejoras 129 a 131 (lote)

- **129 — Qué:** Toasts de **aceptar / cancelar / posponer** tratamiento del día y dos variantes de error por horario inválido (`completeScheduleItem` vs `markScheduleAsNotAdministered`). **Archivos:** `nurse-dashboard-treatment-schedule-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **130 — Qué:** Aviso si no hay medicamentos marcados en solicitud a farmacia y aviso común **sin pacientes** al abrir alta tratamiento/medicación desde tareas. **Archivos:** `nurse-dashboard-pharmacy-task-actions.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **131 — Qué:** E2E: desde **`/register`**, **Inicia sesión aquí** → **`/login`**. **Archivos:** `e2e/root-and-public-routes.spec.ts`.

### 2026-05-05 — Mejoras 126 a 128 (lote)

- **126 — Qué:** Constantes para toasts de guardado en ficha: observaciones médicas, alergias, necesidades especiales, diagnóstico y observaciones generales (éxito y error). **Archivos:** `nurse-dashboard-patient-field-save-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **127 — Qué:** Mensajes unificados al marcar medicación (dato ausente, sin dosis pendiente, sin `scheduleId`) y éxito al borrar horario de medicación. **Archivos:** `nurse-dashboard-mark-medication-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **128 — Qué:** E2E: desde **`/login`**, el enlace **Regístrate aquí** navega a **`/register`**. **Archivos:** `e2e/root-and-public-routes.spec.ts`.

### 2026-05-05 — Mejoras 123 a 125 (lote)

- **123 — Qué:** Constantes para avisos «solo pendiente(s)» al editar/borrar horarios de tratamiento y borrar dosis de medicación. **Archivos:** `nurse-dashboard-schedule-slot-toasts.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **124 — Qué:** Textos de validación/error al guardar **observación nueva** desde la ficha (`saveObservation`). **Archivos:** `nurse-dashboard-patient-observation-inline.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **125 — Qué:** (Histórico) E2E del catálogo UI `/design-catalog` — **retirado** en 2026-05 junto con la ruta y el guard de desarrollo.

### 2026-05-05 — Mejoras 120 a 122 (lote)

- **120 — Qué:** E2E: **`/verify-email`** sin parámetro **`email`** redirige a **`/login`** (validación en `VerifyEmailComponent`). **Archivos:** `e2e/root-and-public-routes.spec.ts`.
- **121 — Qué:** Mensajes del modal **Reportes** de enfermería (error carga `forkJoin`, avisos exportación, éxito CSV, error HTTP export). **Archivos:** `nurse-dashboard-nurse-reports-messages.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **122 — Qué:** E2E: **`/login`** accesible y visible el encabezado **Iniciar Sesión**. **Archivos:** `e2e/root-and-public-routes.spec.ts`.

### 2026-05-05 — Mejoras 117 a 119 (lote)

- **117 — Qué:** Centralización de mensajes del modal de **nota de entrega** (carga, validación cuerpo, éxito guardado, error HTTP). **Archivos:** `nurse-dashboard-handover-messages.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **118 — Qué:** E2E: **`/`** sin sesión → **`/login`**. **Archivos:** `e2e/root-and-public-routes.spec.ts`.
- **119 — Qué:** E2E: **`/register`** accesible sin sesión y visible el encabezado **Crear Cuenta**. **Archivos:** mismo spec.

### 2026-05-05 — Mejoras 114 a 116 (lote)

- **114 — Qué:** E2E Playwright: **`/use-case-diagram`** sin sesión redirige a **`/login`**. **Archivos:** `e2e/use-case-diagram-guard.spec.ts`.
- **115 — Qué:** Mensaje de error al fallar `getTasksDayHistory` centralizado en helper testeado. **Archivos:** `nurse-dashboard-tasks-day-history-load.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **116 — Qué:** Cadenas y función para toast de exportación CSV del historial del día (vacío, éxito, fallo). **Archivos:** `nurse-dashboard-day-history-export.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.

### 2026-05-05 — Mejoras 111 a 113 (lote)

- **111 — Qué:** Regla única para saber si la vista principal exige cargar el historial del día de tareas; cubierta por tests y usada en `ngOnInit` y `setNurseMainView`. **Archivos:** `nurse-dashboard-tasks-day-history-sync.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **112 — Qué:** Texto unificado del toast de advertencia cuando falla el segundo `forkJoin` de datos secundarios. **Archivos:** `nurse-dashboard-secondary-load.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **113 — Qué:** E2E Playwright parametrizado: **`/admin`**, **`/supervisor`** y **`/pharmacy`** sin sesión acaban en **`/login`**. **Archivos:** `e2e/role-routes-guard.spec.ts`.

### 2026-05-05 — Mejora 110

- **Qué:** Prueba E2E Playwright que simula login de rol **enfermería** y las respuestas mínimas de `/api/nurse/*` para que el dashboard cargue sin backend real (útil en CI / máquinas sin BD).
- **Archivos:** `frontend/e2e/nurse-dashboard-smoke.spec.ts`. Requiere navegadores Playwright instalados (`npx playwright install chromium` o `npx playwright install`).

### 2026-05-05 — Mejora 109

- **Qué:** Se extrajo la decisión de mensajes ante fallo del primer `forkJoin` (stats, camas, pacientes) a un helper puro con tests; el componente solo aplica toast / `logout()` según el `kind`. Se retiró el `Set` de vistas permitidas que no se usaba.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-reload-error.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.

### 2026-05-06 — Mejora 108

- **Qué:** Se extrajo la lectura/interpretación de la vista principal guardada en `localStorage` (clave versionada) a helpers puros con tests; el componente delega `persistNurseMainView` / `restoreNurseMainView`.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-main-view-storage.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts`.

### 2026-05-06 — Mejora 107

- **Qué:** Se añadieron pruebas E2E con Playwright que comprueban que, sin sesión, **`/nurse-dashboard`** y **`/dashboard`** acaban en **`/login`** (`authGuard`).
- **Archivos:** `frontend/e2e/nurse-dashboard-guard.spec.ts`.

### 2026-05-06 — Mejora 106

- **Qué:** Se extrajo la lógica de nombre y línea de teléfono de la cabecera del dashboard de enfermería a funciones puras reutilizables y cubiertas por tests unitarios.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-header-user.helpers.ts`, `.helpers.spec.ts`, `nurse-dashboard.component.ts` (getters).

### 2026-05-06 — Mejora 105

- **Qué:** Se añadieron specs para las cuatro pestañas internas del modal de paciente: medicación del día, tratamientos del día, observaciones (lista/edición/reset) e historial (filtros, acciones, vacío).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-patient-medications-tab/nurse-patient-medications-tab.component.spec.ts`, `nurse-patient-treatments-day-tab/nurse-patient-treatments-day-tab.component.spec.ts`, `nurse-patient-observations-tab/nurse-patient-observations-tab.component.spec.ts`, `nurse-patient-history-tab/nurse-patient-history-tab.component.spec.ts`.

### 2026-05-06 — Mejora 104

- **Qué:** Se añadieron specs para edición de historial clínico (`patchAdministrationHistory` / `patchPatientSchedule`), el modal de reportes (backdrop, CSV, estados carga/error) y el contenedor del modal de ficha de paciente (cierre, imprimir, navegación por pestañas).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-history-edit-modal/nurse-history-edit-modal.component.spec.ts`, `nurse-reports-modal/nurse-reports-modal.component.spec.ts`, `nurse-patient-modal-shell/nurse-patient-modal-shell.component.spec.ts`.

### 2026-05-06 — Mejora 103

- **Qué:** Se añadieron specs para el modal rápido de farmacia, la edición de horario/tratamiento (`patchPatientSchedule`) y el modal de edición de cama (filtros, validación y flujo de error con `reloadRequested`).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-pharmacy-quick-modal/nurse-pharmacy-quick-modal.component.spec.ts`, `nurse-schedule-edit-modal/nurse-schedule-edit-modal.component.spec.ts`, `nurse-edit-bed-modal/nurse-edit-bed-modal.component.spec.ts`.

### 2026-05-06 — Mejora 102

- **Qué:** Se añadieron specs para el modal de posponer tratamiento, el detalle de tarea pendiente y el modal de tareas rápidas del panel de enfermería.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-treatment-postpone-modal/nurse-treatment-postpone-modal.component.spec.ts`, `nurse-pending-task-detail-modal/nurse-pending-task-detail-modal.component.spec.ts`, `nurse-tasks-quick-modal/nurse-tasks-quick-modal.component.spec.ts`.

### 2026-05-06 — Mejora 101

- **Qué:** Se añadieron specs unitarios para los modales de suspender, eliminar y reactivar medicamento del dashboard de enfermería.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-suspend-medication-modal/nurse-suspend-medication-modal.component.spec.ts`, `nurse-delete-medication-modal/nurse-delete-medication-modal.component.spec.ts`, `nurse-reactivate-medication-modal/nurse-reactivate-medication-modal.component.spec.ts`.

### 2026-05-05 — Mejora 100

- **Qué:** Se añadieron specs unitarios para los modales de alta de medicamento y tratamiento del panel de enfermería (validación, sugerencias de horarios, selección de días y flujos `confirmAdd`).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-add-medication-modal/nurse-add-medication-modal.component.spec.ts`, `frontend/src/app/components/nurse-dashboard/nurse-add-treatment-modal/nurse-add-treatment-modal.component.spec.ts`.

### 2026-05-05 — Mejora 99

- **Qué:** Se reforzó cobertura de rutas de error en operaciones de suspensión, eliminación y reactivación de medicamentos.
- **Archivos:** `backend/src/__tests__/unit/controllers/medications.controller.test.ts`.

### 2026-05-05 — Mejora 98

- **Qué:** Se reforzó cobertura de errores de servidor en el controlador de camas para operaciones de consulta, creación, edición y borrado.
- **Archivos:** `backend/src/__tests__/unit/controllers/beds.controller.test.ts`.

### 2026-05-05 — Mejora 97

- **Qué:** Se reforzó cobertura de errores del controlador de horarios clínicos en rutas de creación, edición, borrado y acciones operativas.
- **Archivos:** `backend/src/__tests__/unit/controllers/schedules.controller.test.ts`.

### 2026-05-05 — Mejora 96

- **Qué:** Se reforzó cobertura de errores de servidor y fallos de repositorio en el controlador de turnos.
- **Archivos:** `backend/src/__tests__/unit/controllers/shifts.controller.test.ts`.

### 2026-05-05 — Mejora 95

- **Qué:** Se reforzó cobertura de errores de servidor en el controlador de pacientes sobre rutas de lectura, guardado y eliminación.
- **Archivos:** `backend/src/__tests__/unit/controllers/patients.controller.test.ts`.

### 2026-05-05 — Mejora 94

- **Qué:** Se amplió cobertura de rutas de excepción en el controlador de reportes verificando propagación de errores asíncronos al middleware de errores.
- **Archivos:** `backend/src/__tests__/unit/controllers/reports.controller.test.ts`.

### 2026-05-05 — Mejora 93

- **Qué:** Se reforzó cobertura de rutas de error en autenticación para verificar manejo de excepciones en verificación de email y reenvío de código.
- **Archivos:** `backend/src/__tests__/unit/controllers/auth.controller.test.ts`.

### 2026-05-05 — Mejora 92

- **Qué:** Se reforzó cobertura de errores del backend en el controlador de usuarios con foco en rutas de excepción manejadas por `handleControllerError`.
- **Archivos:** `backend/src/__tests__/unit/controllers/users.controller.test.ts`.

### 2026-05-05 — Mejora 91

- **Qué:** Se reforzó cobertura de errores de servidor (`500`) en controladores backend para rutas no felices de farmacia y áreas.
- **Archivos:** `backend/src/__tests__/unit/controllers/areas.controller.test.ts`, `backend/src/__tests__/unit/controllers/pharmacy.controller.test.ts`.

### 2026-05-05 — Mejora 90

- **Qué:** Se sumaron tres specs de modales pendientes del dashboard de enfermería para reforzar cobertura en UI de horarios y detalle de historial/medicación.
- **Archivos:** `nurse-schedule-slots-modal.component.spec.ts`, `nurse-history-detail-modal.component.spec.ts`, `nurse-medication-day-detail-modal.component.spec.ts`.

### 2026-05-05 — Mejora 89

- **Qué:** Se amplió cobertura unitaria del backend con pruebas de validación/clase DTO para flujos de medicación y tareas (alta, suspensión, eliminación, no administrado, postergación).
- **Archivos:** `backend/src/__tests__/unit/dto/medication.dto.test.ts`.

### 2026-05-05 — Mejora 88

- **Qué:** Se amplió cobertura de componentes hijos del dashboard de enfermería con tres specs nuevos para modales que aún no tenían pruebas unitarias.
- **Archivos:** `nurse-postpone-task-modal.component.spec.ts`, `nurse-not-completed-task-modal.component.spec.ts`, `nurse-pharmacy-patients-modal.component.spec.ts`.

### 2026-05-05 — Mejora 87

- **Qué:** Duodécima fase de partición del TS del dashboard: se centralizaron reglas de refresco post-acción (cuándo recargar paciente seleccionado y cuándo recargar historial del día) para reducir condiciones repetidas en handlers.
- **Archivos:** `nurse-dashboard-refresh.helpers.ts` (nuevo), `nurse-dashboard-refresh.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación en handlers de guardado/tareas).

### 2026-05-05 — Mejora 86

- **Qué:** Undécima fase de partición del TS del dashboard: el estado de apertura/cierre e inicialización de modales de alta (tratamiento/medicación) se movió a helpers puros para disminuir ruido de estado en el componente.
- **Archivos:** `nurse-dashboard-create-modals.helpers.ts` (nuevo), `nurse-dashboard-create-modals.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación de estado modal).

### 2026-05-05 — Mejora 85

- **Qué:** Décima fase de partición del TS del dashboard: la lógica de apertura/cierre de modales de historial (detalle y edición) se centralizó en helpers puros.
- **Archivos:** `nurse-dashboard-history-modals.helpers.ts` (nuevo), `nurse-dashboard-history-modals.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación de estado modal).

### 2026-05-05 — Mejora 84

- **Qué:** Novena fase de partición del TS del dashboard: el flujo de borrado desde historial (administración vs schedule) ahora delega la resolución del objetivo y el mensaje de éxito en helper puro, reduciendo branching inline en `deleteHistoryRecord`.
- **Archivos:** `nurse-dashboard-history-actions.helpers.ts` (nuevo), `nurse-dashboard-history-actions.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación en `deleteHistoryRecord`).

### 2026-05-05 — Mejora 83

- **Qué:** Octava fase de partición del TS del dashboard: se extrajo a helpers la composición del mensaje de card de área y el mapeo vista→sección para scroll, reduciendo lógica UI repetida en navegación rápida.
- **Archivos:** `nurse-dashboard-navigation.helpers.ts` (nuevo), `nurse-dashboard-navigation.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación en cards/navegación).

### 2026-05-05 — Mejora 82

- **Qué:** Séptima fase de partición del TS del dashboard: se centralizó en helper la apertura/cierre y validación básica de estado para modales de acciones de tareas, reduciendo decisiones de estado inline en el componente.
- **Archivos:** `nurse-dashboard-task-actions.helpers.ts` (ampliado), `nurse-dashboard-task-actions.helpers.spec.ts` (ampliado), `nurse-dashboard.component.ts` (delegación de estado modal).

### 2026-05-05 — Mejora 81

- **Qué:** Sexta fase de partición del TS del dashboard: el flujo de envío de solicitudes a farmacia ahora delega selección de medicamentos marcados y construcción de payload en helpers puros reutilizables.
- **Archivos:** `nurse-dashboard-pharmacy-requests.helpers.ts` (nuevo), `nurse-dashboard-pharmacy-requests.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación en `sendPharmacyRequest`).

### 2026-05-05 — Mejora 80

- **Qué:** Quinta fase de partición del TS del dashboard: la carga de detalle de paciente delega parseo de ID y mapeo/normalización de respuesta a helpers puros, reduciendo asignaciones directas repetidas sobre `selectedPatient`.
- **Archivos:** `nurse-dashboard-patient-details-state.helpers.ts` (nuevo), `nurse-dashboard-patient-details-state.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación en `loadPatientDetails`).

### 2026-05-05 — Mejora 79

- **Qué:** Cuarta fase de partición del TS del dashboard: validaciones y cálculo de parámetros de acciones de medicación (suspender/eliminar/reactivar) se movieron a helpers puros para reducir lógica de dominio en el componente.
- **Archivos:** `nurse-dashboard-medication-actions.helpers.ts` (nuevo), `nurse-dashboard-medication-actions.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación).

### 2026-05-05 — Mejora 78

- **Qué:** Tercera fase de partición del TS del dashboard: `loadTasksDayHistory()` ahora delega validación de fecha y transiciones de estado (inicio, éxito, error) en helpers puros para reducir lógica de estado inline.
- **Archivos:** `nurse-dashboard-day-history-state.helpers.ts` (nuevo), `nurse-dashboard-day-history-state.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación).

### 2026-05-05 — Mejora 77

- **Qué:** Segunda fase de partición del TS del dashboard: la lógica de validación y mutación local para acciones de tareas (completar/no administrada/posponer) se movió a helpers puros reutilizables, reduciendo reglas inline en `NurseDashboardComponent`.
- **Archivos:** `nurse-dashboard-task-actions.helpers.ts` (nuevo), `nurse-dashboard-task-actions.helpers.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación).

### 2026-05-05 — Mejora 76

- **Qué:** Se inició la partición del TS del dashboard de enfermería extrayendo la lógica de estado/acciones del modal rápido de tareas a un facade dedicado (`open`, `clear`, `build`) para reducir responsabilidades en `NurseDashboardComponent` y dejar una base para seguir separando dominios.
- **Archivos:** `nurse-dashboard-tasks-quick.facade.ts` (nuevo), `nurse-dashboard-tasks-quick.facade.spec.ts` (nuevo), `nurse-dashboard.component.ts` (delegación a facade).

### 2026-05-05 — Mejora 75

- **Qué:** Se reemplazó `console.*` por `logger` en piezas no-runtime que seguían pendientes de la mejora 2: scripts de pruebas de integración, seeds y migraciones antiguas. Con esto queda unificado el formato de salida en esos flujos.
- **Archivos:** `backend/src/__tests__/run-full-test.ts`, `backend/src/__tests__/integration/{database-connection,endpoints-structure,full-system,simple-endpoints,test-summary}.test.ts`, `backend/src/seeds/{create-pharmacy-user,seed-medications,seed-patients-treatments,seed-schedules}.ts`, `backend/src/migrations/{1733700000000-AddBedIsOccupiedColumn,1733800000000-AddPatientBedIdColumn,1734100000000-AddPatientAssignedToIdColumn}.ts`.

### 2026-05-04 — Mejora 74

- **Qué:** Un solo `@Input() vm` en `NurseDashboardOverlaysStackComponent` con interfaz **`NurseDashboardOverlaysStackVm`**; el HTML del dashboard enlaza **`[vm]="overlaysStackVm"`** (referencia creada una vez). El padre implementa **`DoCheck`** y copia el estado en **`syncOverlaysStackVmFromState()`** para no instanciar un objeto nuevo en cada ciclo de detección de cambios.
- **Archivos:** `nurse-dashboard-overlays-stack.vm.ts`, `nurse-dashboard-overlays-stack.component.{ts,html}`, `nurse-dashboard.component.{ts,html}`, `nurse-dashboard-overlays-stack.component.spec.ts`; backlog **`MEJORAS_PENDIENTES.md`** (B-01 cerrado).

### 2026-05-04 — Mejora 1

- **Qué:** Se eliminó del índice de Git el archivo de caché de compilación de Angular que no debía estar versionado.
- **Archivos:** `frontend/.angular/cache/20.3.13/NurseHelper/.tsbuildinfo` (solo deja de trackearse; puede seguir existiendo en disco local).
- **`.gitignore`:** Se reforzó la regla con `frontend/.angular/` para ignorar toda la carpeta de caché del CLI bajo el frontend.

### 2026-05-04 — Mejora 2

- **Qué:** Logs de ejecución de la API unificados con Winston (`logger` en `backend/src/utils/logger.ts`). Consola activa también en **producción** (formato texto sin color) para que plataformas tipo Railway capturen `stdout`; archivos `logs/error.log` y `logs/combined.log` se mantienen.
- **Sustituido `console.*` → `logger` en:** `app.ts`, `data-source.ts`, `utils/env.ts`, `api/index.ts`, middlewares `auth`, `metrics`, `role`, y controladores `auth`, `areas`, `beds`, `patients`, `medications`, `schedules`, `shifts`, `pharmacy`, `nurses`.
- **Sin cambiar (de momento):** `backend/src/__tests__/**`, `backend/src/seeds/**`, `backend/src/migrations/**` — siguen usando `console` para salida de scripts/tests; se puede migrar después si se desea el mismo formato en seeds.

### 2026-05-04 — Mejora 3 (histórico)

- **Nota:** La ruta `/design-catalog`, el guard `dev-tools.guard.ts` y el E2E asociado se **eliminaron** del proyecto (2026-05). La entrega original bloqueaba el catálogo en producción (`environment.production`) y redirigía a `/login`.

### 2026-05-04 — Mejora 4 (parcial, fase 1)

- **Qué:** Modal “Nota de entrega” extraído a componente standalone `NurseHandoverModalComponent` (plantilla + estilos propios); el dashboard solo enlaza estado y eventos.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-handover-modal/*`, cambios en `nurse-dashboard.component.{ts,html,css}`.

### 2026-05-04 — Mejora 4 (parcial, fase 2)

- **Qué:** Modal **“Reportes (últimos 7 días)”** extraído a `NurseReportsModalComponent` (`nurse-reports-modal/`). Entradas: periodo, loading, error, cumplimiento, medicación, exporting; salidas: `dismissed`, `csvDownload` (`'compliance' | 'medication'`).
- **CSS:** Estilos del shell del modal de reportes en el subcomponente; en `nurse-dashboard.component.css` se mantienen reglas de `.nurse-reports-modal-footer` para modales rápidos que reutilizan esa clase.

### 2026-05-04 — Mejora 4 (parcial, fase 3)

- **Qué:** Modal rápido **“Medicamentos a solicitar a farmacia”** extraído a `NursePharmacyQuickModalComponent` (`nurse-pharmacy-quick-modal/`). Misma lista `medicationsForPharmacy` por referencia; emite `requestStateChanged` para `updatePharmacyRequest()`, más `viewPatients`, `sendRequest`, `openFullModule`, `dismissed`.
- **Nota:** `toggleAllMedications` / `getRequestedCount()` del componente padre se mantienen para la vista completa del módulo Farmacia en el mismo dashboard.

### 2026-05-04 — Mejora 4 (parcial, fase 4)

- **Qué:** Modal rápido **“Tareas pendientes”** extraído a `NurseTasksQuickModalComponent` (`nurse-tasks-quick-modal/`). Entradas: pacientes, filtros, grupos por hora; salidas: cambio de filtros, limpiar filtros, acciones de tarea, detalle, `dismissed`, `openFullModule`. La lógica `applyTasksFilters`, `completeTask`, etc. sigue en el dashboard.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-tasks-quick-modal/*`, cambios en `nurse-dashboard.component.{ts,html}`.

### 2026-05-04 — Mejora 4 (parcial, fase 5)

- **Qué:** Modal auxiliar **“Detalle de tarea”** (descripción / medicación al pulsar ℹ️ en tareas rápidas) extraído a `NursePendingTaskDetailModalComponent` (`nurse-pending-task-detail-modal/`). Entrada `[task]`; salida `dismissed`. El padre mantiene `openPendingTaskDetail` / `closePendingTaskDetail` y el estado.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-pending-task-detail-modal/*`, cambios en `nurse-dashboard.component.{ts,html}`.

### 2026-05-04 — Mejora 4 (parcial, fase 6)

- **Qué:** Modal **“Pacientes por medicamento”** (farmacia: quiénes tienen la pauta hoy) extraído a `NursePharmacyPatientsModalComponent` (`nurse-pharmacy-patients-modal/`). Entrada `[med]` (`MedicationForPharmacy`); salida `dismissed`. El padre solo guarda `pharmacyPatientsModalMed` (sin flag `Open` duplicado). Estilos del listado movidos del CSS del dashboard al del subcomponente; se mantienen en el dashboard las reglas de la tabla principal (celda resumen / botón «Ver pacientes»).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 7)

- **Qué:** Modal **“Tarea no realizada”** (motivo ≥10 caracteres, marcar como no administrado vía API) extraído a `NurseNotCompletedTaskModalComponent` (`nurse-not-completed-task-modal/`). Entradas `[task]` y `[patientNameFallback]`; salidas `dismissed` y `confirmed` (`{ reason }`). El dashboard elimina `showNotCompletedModal` y `notCompletedReason`; la confirmación pasa a `onNotCompletedTaskConfirmed`. Resumen de hora solo si `task.time` existe; al marcar desde slot de medicación se envía `time` del slot.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 8)

- **Qué:** Modal **“Posponer tarea”** extraído a `NursePostponeTaskModalComponent` (`nurse-postpone-task-modal/`). Entrada `[task]`; salidas `dismissed` y `confirmed` (`{ date, time }`). Fecha/hora inicial y validación «debe ser futura» en el hijo (`ToastService`); el padre solo llama a `postponeTask` y refresca datos en `onPostponeTaskConfirmed`. Eliminados `showPostponeTaskModal`, `postponeNewDate` / `postponeNewTime` y `getMinDate()` del dashboard.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 9)

- **Qué:** Modales **eliminar medicamento** (`nurse-delete-medication-modal/`, motivo ≥10 caracteres, `confirmed` con `{ reason }`) y **reactivar medicamento** (`nurse-reactivate-medication-modal/`). Ambos reutilizan estilos base del modal posponer tarea como primer `styleUrl`. Dashboard: eliminados `showDeleteMedicationModal`, `showReactivateMedicationModal`, `deleteReason`; handlers `onDeleteMedicationConfirmed` / `onReactivateMedicationConfirmed`; sin `console.log` en esos flujos.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 10)

- **Qué:** Modal **suspender medicamento** (`nurse-suspend-medication-modal/`): duración (indefinido / 1–3 días / 1 semana / fecha custom), motivo ≥10 caracteres, `confirmed` con `{ durationType, untilDate, reason }`; API y toasts en `onSuspendMedicationConfirmed`. Modal **posponer tratamiento** (`nurse-treatment-postpone-modal/`): fecha/hora inicial desde `scheduledTime`, `confirmed` con `{ date, time }`, validación breve con `ToastService`; API en `onTreatmentPostponeConfirmed`. Eliminados `showSuspendMedicationModal`, `suspendDurationType`, `suspendUntilDate`, `suspendReason`, `showTreatmentPostponeModal`, `treatmentPostponeDate`, `treatmentPostponeTime` y `console.error` al fallar la suspensión.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 11)

- **Qué:** Modal **detalle de medicación del día** (`nurse-medication-day-detail-modal/`). Entradas `[slot]`, `[patientName]`, `[pauta]` (resultado de `getMedicationDetailGroupForSlot` al abrir); `dismissed`. Etiquetas de fecha programada y estado, y rejilla semanal desde `scheduleSlots`, encapsuladas en el hijo. Dashboard: `medicationDayDetailView` sustituye `medicationDayDetailModalOpen` / `medicationDayDetailModalSlot`; eliminado `medicationDayDetailScheduledLabel` y reglas CSS duplicadas de detalle en `nurse-dashboard.component.css`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 12)

- **Qué:** Modal **horarios (hoy / otras fechas)** para fila agrupada de medicación o tratamiento (`nurse-schedule-slots-modal/`). Entradas `[kind]`, `[title]`, `[todaySlots]`, `[otherSlots]`, `[allSlots]`; `dismissed`. Vista semanal y etiquetas de estado/tipo en el hijo. Dashboard: `scheduleSlotsView` sustituye `scheduleSlotsModalOpen` y arrays sueltos; `openScheduleSlotsModal` rellena un solo objeto. Eliminados del TS del dashboard: `weekdayMonFirst`, `medicationWeeklyGridFromSlots`, `medicationWeeklyGrid`, `medicationWeeklyGridHasAny`, `medicationWeeklyGridFromModal`, `medicationWeeklyGridModalHasAny`, `slotStatusLabel`. CSS del dashboard: quitados bloques solo usados por este modal (panel horarios + rejilla semanal duplicada).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 13)

- **Qué:** Modal **editar cama** (`nurse-edit-bed-modal/`). Entradas `[bed]` (`NurseEditBedModalBed`), `[myBeds]`; salidas `dismissed`, `saved`, `reloadRequested` (tras error de guardado, mismo criterio de refresco diferido). Formulario, carga/filtrado de pacientes del área, confirmación de liberar cama y `updateBed` en el hijo (`AdminService`, `ConfirmationService`, `ToastService`). Dashboard: `editBedModalBed: (BedDisplay & { id: number }) | null`; `onEditBedSaved()` cierra y `loadNurseData()` a 500 ms; eliminados `showEditBedModal`, `selectedBed`, `editBedForm`, búsqueda/listas de pacientes del modal, `getPatientBed`, `saveBedChanges`, etc.; inyección `AdminService` retirada del dashboard. CSS: bloque de lista/asignación de pacientes del modal retirado del CSS del dashboard (vive en el subcomponente).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 14)

- **Qué:** Modal **detalle de fila de historial** (solo lectura; `nurse-history-detail-modal/`). Entrada `[record]` (`NurseHistoryDetailRecord`); `dismissed`. Etiquetas de estado y bloque de notas (`statusLabel`, `notesBlockVisible`) en el hijo. Dashboard: eliminado `historyDetailOpen`; `historyRecordStatusLabel` y `historyNotesBlockVisible` se mantienen para la tabla dentro del modal paciente. CSS del dashboard: quitados estilos solo usados por este modal (cuerpo/líneas del detalle y bloque `history-notes-*` del popup; se conserva `.history-notes-cell` para la tabla).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 15)

- **Qué:** Modales **editar registro de historial** (`nurse-history-edit-modal/`) y **editar tratamiento / horario** (`nurse-schedule-edit-modal/`). Formulario, mapeos de estado API/UI y `patchAdministrationHistory` / `patchPatientSchedule` en los hijos (`ToastService`). Dashboard: `historyEditRecord` y `scheduleEditContext` (sin `historyEditOpen`, campos de formulario duplicados, `saveHistoryEdit`, `saveScheduleEdit`, `historyEditShowsStatusSelect`, mapeos privados); `onHistoryEditSaved` / `onScheduleEditSaved` recargan detalle del paciente; al guardar horario se cierra también el modal de slots. **Corrección:** `NurseScheduleEditContext` declarado fuera del decorador `@Component` (el archivo del modal de horario quedaba inválido). CSS del dashboard: eliminados `.neuro-select-block` y `.history-edit-hint` (viven en el modal de historial).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 16)

- **Qué:** Modales **agregar medicamento** (`nurse-add-medication-modal/`) y **agregar tratamiento / tarea** (`nurse-add-treatment-modal/`). Formularios, validación y llamadas `addMedication`, `addTreatment`, `quickAddPatientTreatment` en los hijos. Dashboard: flags `addMedicationModalOpen` / `addMedicationLockPatientSelect` / `addMedicationInitialPatientId` y `addTreatmentModalOpen` / `addTreatmentMode` / `addTreatmentFromPatientContext` / `addTreatmentInitialPatientId`; handlers `onAddMedicationSaved` / `onAddTreatmentSaved` (`loadNurseData`, recarga de ficha y `activeTab = 'schedule'` cuando el paciente abierto coincide). Eliminados del padre: estado y métodos del formulario antiguo, `getDaysOfWeek`, `toggleDayOfWeek`, `getTodayDate` / `getLocalYmd` (fechas locales solo en los hijos que las necesitan). CSS del dashboard: retirados bloques solo usados por estos formularios (incl. `.empty-state-modal` del tratamiento); se mantienen `.modal-content.modal-medication` y `.medications-header` usados por la ficha paciente / slots.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 17)

- **Qué:** Pestaña **Historial** del modal de ficha de paciente extraída a `NursePatientHistoryTabComponent` (`nurse-patient-history-tab/`). Entradas: `[records]`, `[periodFilter]`, `[outcomeFilter]`; salidas: `periodFilterChange`, `outcomeFilterChange`, `openDetail`, `openEdit`, `deleteRecord`. Lógica pura de filtrado/ordenación y textos de columna en `nurse-patient-history.helpers.ts`; tipo `TreatmentRecord` en `nurse-treatment-record.model.ts`. Dashboard: `getFilteredHistoryFlatSorted()` delega en helpers; eliminados `getFilteredHistory`, `parseHistoryRecordDate`, `historyRecordStatusLabel`, `historyNotesBlockVisible`, `historyNotesPreview`. CSS del dashboard: retirados bloques solo usados por la tabla de historial y botones de filtro (viven en el hijo + `admin-table-unified` / `table-actions-normalized`).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 18)

- **Qué:** Pestaña **Medicamentos** del modal de ficha de paciente extraída a `NursePatientMedicationsTabComponent` (`nurse-patient-medications-tab/`). Entradas: `[bedNumber]`, `[age]`, `[diagnosis]`, `[slots]`; salidas: `addMedication`, `openDayDetail`, `markGiven`, `markNotAdministered`, `suspend`, `reactivate`, `deleteSlot`. Ordenación y etiquetas de estado en `nurse-patient-medication-helpers.ts`; tipo `MedicationTodaySlot` en `medication-today-slot.model.ts`. Dashboard: `getMedicationsTodaySorted()` y la asignación tras `getPatientDetails` usan `sortMedicationsTodaySlots`; `medicationSlotPending` / `medicationSlotStatusLabel` dejan de ser métodos del padre (el hijo usa los helpers; el padre importa `medicationSlotPending` para validar acciones). CSS del dashboard: retirados `.patient-summary` / `.summary-item` y `.med-notes-cell` usados solo por esta pestaña (viven en el hijo).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 19)

- **Qué:** Pestaña **Tratamientos del día** del modal de ficha de paciente extraída a `NursePatientTreatmentsDayTabComponent` (`nurse-patient-treatments-day-tab/`). Entrada `[slots]`; salidas: `addTreatment`, `openSlotDetail`, `markDone`, `postpone`, `cancel`, `edit`, `deleteSlot`. Ordenación y reglas de pendiente/estado/tipo en `nurse-treatments-today.helpers.ts`; tipo `TreatmentTodayItem` en `treatment-today-item.model.ts`. Dashboard: `getTreatmentsTodaySorted()` y carga tras `getPatientDetails` usan `sortTreatmentsTodaySlots`; eliminados `treatmentTypeLabel`, `treatmentSlotPending`, `treatmentSlotStatusLabel` como métodos del padre (se importa `treatmentSlotPending` donde hace falta). `NurseScheduleSlotsModalComponent` delega `treatmentTypeLabel` en el mismo helper. CSS del dashboard: retirados bloques solo de esta pestaña (cabecera `.medications-header` del modal, tabla `treatments-modal-table` / botón horarios / `.notes-text` / `.frequency-text` / `.treatment-slot-status` y media queries asociadas a la fila de acciones de tratamientos).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 20)

- **Qué:** Pestaña **Observaciones** del modal de ficha de paciente extraída a `NursePatientObservationsTabComponent` (`nurse-patient-observations-tab/`). Entradas: textos del paciente, `newObservation` / `newObservationChange`, `isSavingObservation`; salidas: `saveDiagnosis`, `saveMedicalObservations`, `saveAllergies`, `saveSpecialNeeds`, `saveGeneralObservationsFull` (cada una con el texto a persistir), `saveNewObservation`. El listado de líneas de observaciones generales pasa a `parseObservationsDisplayList` en `nurse-patient-observations.helpers.ts`. El hijo mantiene el estado de edición por tarjeta; el dashboard conserva `saveObservation` / flags de guardado y los métodos de API reciben `string`; tras éxito se llama `resetObservationEditState()` vía `@ViewChild`. Eliminados del padre: flags y borradores de edición, `getObservationsList`, métodos start/cancel de edición. CSS del dashboard: retirado el bloque de observaciones (incl. responsive) movido al hijo.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 21)

- **Qué:** Tipos locales del panel movidos a **`nurse-dashboard.types.ts`**: `BedDisplay`, `Patient`, `Medication`, `ScheduleItem`; constante **`NURSE_DASHBOARD_MAIN_VIEWS`**, tipo **`NurseDashboardMainView`** y guard **`isNurseDashboardMainView`** para restaurar la vista desde `localStorage` sin aserción manual. `nurse-dashboard.component.ts` deja de declarar esas interfaces y usa el módulo de tipos; `allowedNurseViews` / `visitedNurseViews` / `setNurseMainView` tipados con la unión exportada.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 22)

- **Qué:** Mapeo de datos iniciales del panel movido a **`nurse-dashboard-patient-mapping.ts`**: `parseConditions` (texto → lista corta para tarjeta de cama), **`mapBedsWithPatientForNurseDashboard`** (`BedWithPatient[]` → `BedDisplay[]`), **`mapPatientDetailsToPatients`** (`PatientDetail[]` + camas → `Patient[]`). `applyPrimaryDashboardData` delega en estas funciones; eliminados del componente el método privado homónimo y `parseConditions`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 23)

- **Qué:** Eliminados del **`nurse-dashboard.component.ts`** métodos que no tenían ninguna referencia en plantilla ni en el resto del frontend: `getRowSlotsSorted`, `hasMoreRowSlots`, `getRowHorariosPreview`, `formatSlotDisplayLabel`, `isSlotDifferentCalendarDay`, `isMedicationSlotDifferentDay` (restos de una vista de horarios que ya no enlaza el HTML actual).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 24)

- **Qué:** **`nurse-dashboard-schedule-slots.helpers.ts`**: tipo `ScheduleSlotsModalViewPayload` y función `buildScheduleSlotsViewPayload` (ordenar slots, partir hoy vs otros). El dashboard importa el helper, tipa `scheduleSlotsView` con ese tipo y `openScheduleSlotsModal` solo asigna el payload si no es `null`. Eliminados `console.log` / `console.error` ruidosos en carga principal, secundaria, historial del día y detalle de paciente (donde ya hay toasts o no aportan en producción). En error de **`loadSecondaryData`**, `toastService.warning` con mensaje breve además del reseteo de estado.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 25)

- **Qué:** **`nurse-dashboard-patients-filter.helpers.ts`**: `filterNurseDashboardPatients` (búsqueda + filtros medicamentos/tareas/críticos). Componente standalone **`nurse-patients-assigned-section/`** (filtros, tabla, vacío): emite cambios de búsqueda/filtro y apertura de ficha; el padre mantiene `searchTerm` / `selectedFilter` / `filteredPatients` y delega el conteo de dosis con `todayMedicationDosesCountForList`. Estilos de tabla pacientes y barra de filtros retirados del CSS del dashboard donde solo aplicaban a esta vista (regla compartida `.nurse-table-shell-flat` duplicada en el hijo para el contenedor de tabla).
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-03 — Mejora 4 (parcial, fase 26)

- **Qué:** Vista **Resumen general** extraída a **`nurse-summary-section/`** (standalone): entradas KPI y segunda fila de atajos; salidas hacia los mismos handlers del dashboard (`showAreaInfo`, `filterByPatients`, modales rápidos, farmacia/tareas atención, entrega, reportes). Estilos específicos del resumen y `dashboard-overview-stats.css` pasan al hijo; el CSS del dashboard deja de incluir reglas solo del resumen y el padre ya no importa `dashboard-overview-stats.css` (solo el subcomponente).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-summary-section/*`, cambios en `nurse-dashboard.component.{ts,html,css}`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 27)

- **Qué:** Pestaña **Farmacia** (solicitud del día) extraída a **`nurse-pharmacy-section/`**: tabla, checkboxes, contador de seleccionados, envío y «Ver pacientes» vía `sendRequest` / `viewPatients`; el padre conserva `sendPharmacyRequest`, `openPharmacyPatientsModal` y `updatePharmacyRequest` (modal rápido). Eliminados del dashboard `toggleAllMedications` y `getRequestedCount` (lógica en el hijo). Estilos de farmacia tab retirados del CSS del dashboard donde solo aplicaban a esa vista; `btn-primary-neuro` duplicado en el hijo por encapsulación.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-pharmacy-section/*`, cambios en `nurse-dashboard.component.{ts,html,css}`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 28)

- **Qué:** Vista **Tareas** (pendientes + **historial del día**) extraída a **`nurse-tasks-section/`**; el padre mantiene estado, `applyTasksFilters`, `loadTasksDayHistory`, `exportTasksDayHistoryCsv` y acciones sobre tareas. Vista previa de descripción en **`nurse-pending-task-description.helpers.ts`** (`pendingTaskDescriptionPreview`); eliminado el método duplicado del dashboard. Estilos de tablas tarea/historial replicados en el hijo (fragmento alineado con `nurse-tasks-quick-modal`) más bloques `nurse-day-history-*` y cabeceras.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-tasks-section/*`, `nurse-pending-task-description.helpers.ts`, cambios en `nurse-dashboard.component.{ts,html}`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 29)

- **Qué:** Vista **Mis camas asignadas** extraída a **`nurse-beds-section/`** (`bedEditRequest` → `openEditBedModal`, `viewPatientRequest` → `viewPatientDetails`). Estilos de rejilla de camas, tarjetas y botón «Ver detalles» retirados del CSS del dashboard y movidos al hijo; media queries solo de `.beds-grid` en el subcomponente.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-beds-section/*`, cambios en `nurse-dashboard.component.{ts,html,css}`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 30)

- **Qué:** **Búsqueda del header** del shell en **`nurse-dashboard-header-search/`** (debounce 350 ms, proyección `appDashboardHeaderActions`); **nav principal** en **`nurse-dashboard-main-nav/`** (`viewSelect`, entrega, reportes). Ajustes `.nurse-nav-quick` con `:host-context(.nurse-dashboard)` en el hijo. Dashboard deja de importar `DebounceDirective`; CSS de cabecera y reglas huérfanas de historial del día retirados del padre.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-header-search/*`, `nurse-dashboard-main-nav/*`, cambios en `nurse-dashboard.component.{ts,html,css}`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 31)

- **Qué:** **Modal de ficha de paciente** (backdrop, nav de pestañas, cuatro tabs, modales de edición de historial y de horario) extraído a **`nurse-patient-modal-shell/`**. El dashboard enlaza estado y eventos; `@ViewChild` del shell y `resetObservationEditState()` delegan en la pestaña de observaciones. Tipos de filtro de historial (`HistoryPeriodFilter` / `HistoryOutcomeFilter`) en inputs y `EventEmitter` del shell. Imports de tabs/modales de paciente y de edición historial/horario retirados del dashboard (viven en el shell).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-patient-modal-shell/*`, cambios en `nurse-dashboard.component.{ts,html}`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 32)

- **Qué:** **`nurse-dashboard-overlays-stack/`**: un solo componente agrupa el modal «pacientes por medicamento» de farmacia y todos los modales bajo `appDashboardOverlays` (tarea no completada, ficha paciente vía `nurse-patient-modal-shell`, historial detalle, detalle medicación día, detalle tarea pendiente, entrega, reportes, tareas rápidas, farmacia rápida, horarios, alta medicación/tratamiento, suspender/eliminar/reactivar medicación, posponer tratamiento/tarea, editar cama). `:host { display: contents }` para no alterar el slot de proyección. El dashboard declara solo `NurseDashboardOverlaysStackComponent` como modal stack; `@ViewChild(NurseDashboardOverlaysStackComponent)` y `resetObservationEditState()` delegan en el shell interno.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-overlays-stack/*`, cambios en `nurse-dashboard.component.{ts,html}`.
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (parcial, fase 33)

- **Qué:** Limpieza de **`nurse-dashboard.component.css`**: eliminadas reglas sin uso en plantillas (timeline `.tasks-timeline` / `.hour-*`, listas compactas huérfanas, `@keyframes slideIn` no referenciado en este archivo), duplicados ya cubiertos por subcomponentes (shell de modales rápidos, `.empty-state--compact`, bloque «tabla pacientes» y `.patient-meta-inline` / anidados de nombres, tabla de filas `med-*` sin clases en HTML), manteniendo utilidades compartidas (`.unified-tasks-table`, `.action-btn-compact`, resumen de medicamentos en lista de pacientes, etc.).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard.component.css`
- **Verificación:** `cd frontend && npx ng build --configuration=development`

### 2026-05-04 — Mejora 4 (cierre)

- **Qué:** Se da por **cerrada** la modularización planificada del panel de enfermería: el `nurse-dashboard` queda partido por dominio (cabecera, nav, secciones de vista, modal de ficha, pila de overlays) y el CSS del padre depurado de reglas huérfanas. La lista maestra pasa a **Hecha**. Un único objeto «VM» para los muchos `@Input` del `nurse-dashboard-overlays-stack` queda como **mejora incremental opcional** (habría que evitar recrear el objeto en cada ciclo de detección de cambios o sincronizarlo a mano).
- **Archivos:** `MEJORAS.md` (estado y esta entrada); sin cambios de código en este cierre.
- **Verificación:** `cd frontend && npx ng build --configuration=development` (último estado conocido del chunk enfermería).

### 2026-05-04 — Registro de mejoras (estructura y backlog)

- **Qué:** Añadido **[`MEJORAS_PENDIENTES.md`](./MEJORAS_PENDIENTES.md)** para backlog y opcionales sin número. En **`MEJORAS.md`**: enlace en cabecera, sección **«Orden del plan y del historial»** (orden lógico 1–7 + cómo leer fases de la mejora 4), y guía **«Cómo usar»** actualizada para promover ítems desde el archivo de pendientes.
- **Archivos:** `MEJORAS.md`, `MEJORAS_PENDIENTES.md`.

### 2026-05-04 — Mejora 8

- **Qué:** Función pura **`countPatientMedicationListDoses`** en `nurse-dashboard-medication-doses.helpers.ts` (misma regla que antes en `todayMedicationDosesCount`: solo cuenta si `medications` es array). El dashboard la usa en `applyPrimaryDashboardData` (KPI `medicationsToday` inicial), `filterPatients` y como `todayMedicationDosesCountForList` para `nurse-patients-assigned-section`. Tests unitarios en `nurse-dashboard-medication-doses.helpers.spec.ts`.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-medication-doses.helpers.ts`, `nurse-dashboard-medication-doses.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless` (incluye el nuevo spec).

### 2026-05-04 — Mejora 9

- **Qué:** Funciones puras **`countPharmacyMedicationsNotRequested`** y **`countPendingTasksScheduledInWindow`** en `nurse-dashboard-attention-kpis.helpers.ts` (misma lógica que los getters del dashboard: medicamentos sin `requested`, tareas no completadas con `scheduledTime` en ventana **`[windowStartMs, windowEndMs]`** con **fin inclusive**). Tests en `nurse-dashboard-attention-kpis.helpers.spec.ts` con ventana fija para resultados deterministas.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-attention-kpis.helpers.ts`, `nurse-dashboard-attention-kpis.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-04 — Mejora 10

- **Qué:** **`formatLocalDateIsoYmd`** (`nurse-dashboard-local-date.helpers.ts`) para la fecha inicial del historial del día (`tasksDayHistoryDate`). **`sumPendingTasksAcrossPatients`** y **`sumMedicationListDosesAcrossPatients`** (`nurse-dashboard-patient-kpis.helpers.ts`, reutiliza `countPatientMedicationListDoses`) para los totales del resumen tras `applyPrimaryDashboardData`. Tests unitarios en los `.spec.ts` correspondientes.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-local-date.helpers.ts`, `nurse-dashboard-patient-kpis.helpers.ts`, sus specs, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 11

- **Qué:** **`isValidIsoYmdDateString`** (mismo módulo de fecha local) para validar el parámetro de **`loadTasksDayHistory`** sin duplicar la expresión regular. **`sumTotalDosesFromPharmacyMedications`** en `nurse-dashboard-pharmacy-totals.helpers.ts` para el total de dosis al fusionar tareas y farmacia en **`loadSecondaryData`**. Tests en los `.spec.ts` correspondientes.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-local-date.helpers.ts`, `nurse-dashboard-local-date.helpers.spec.ts`, `nurse-dashboard-pharmacy-totals.helpers.ts`, `nurse-dashboard-pharmacy-totals.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 12

- **Qué:** **`computeFilteredNurseTasksGroupedByHour`** en `nurse-dashboard-tasks-filters.helpers.ts`: misma lógica que tenía **`applyTasksFilters`** (ventanas `next1h` / `current`, franjas mañana/tarde/noche, filtro por paciente, reaprupo por hora). El componente pasa `now: new Date()` para alinear ventana temporal y `getHours()` en un solo instante. Tests con fechas locales fijas (`next1h`, `current` con fin inclusive, `morning`, filtro por `tasksPatientFilter`).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-tasks-filters.helpers.ts`, `nurse-dashboard-tasks-filters.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 13

- **Qué:** **`countPendingTasksInHourGroups`** en `nurse-dashboard-attention-kpis.helpers.ts` (misma noción de pendiente que **`countPendingTasksScheduledInWindow`**: no completada ni marcada como no realizada), reutilizada en **`loadSecondaryData`** para **`pendingTasksCount`**. Tests en `nurse-dashboard-attention-kpis.helpers.spec.ts`.
- **Archivos:** `nurse-dashboard-attention-kpis.helpers.ts`, `nurse-dashboard-attention-kpis.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 14

- **Qué:** **`mapNurseDayHistoryItemsToCsvRows`** y **`tasksDayHistoryCsvFilename`** en `nurse-dashboard-day-history-csv.helpers.ts` para la exportación CSV del bloque «Historial del día» (`exportTasksDayHistoryCsv` delega mapeo y nombre de archivo). Tests de columnas `Resultado` (completada / no realizada / `status`) y campos vacíos.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-day-history-csv.helpers.ts`, `nurse-dashboard-day-history-csv.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 15

- **Qué:** **`readNurseDashboardHttpErrorMessage`** en `nurse-dashboard-http-error.helpers.ts` centraliza la lectura de mensajes desde respuestas tipo HttpClient (`error.error.message`, `error.error` string o objeto con `.error`, `error.message`). Sustituye las cadenas repetidas de optional chaining en **`nurse-dashboard.component.ts`** (carga principal, tareas/farmacia, reportes, historial del día, medicación, etc.). Tests unitarios del helper.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-http-error.helpers.ts`, `nurse-dashboard-http-error.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 16

- **Qué:** **`reloadHandoverForDate`** valida `handoverDate` con **`isValidIsoYmdDateString`** (misma regla que historial del día, sin regex duplicada). Nuevo **`nurse-pending-task-description.helpers.spec.ts`** para **`pendingTaskDescriptionPreview`** (vacío, límite 72, truncado con «…»).
- **Archivos:** `nurse-dashboard.component.ts`, `nurse-pending-task-description.helpers.spec.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 17

- **Qué:** **`countPharmacyMedicationsRequested`** y **`setAllPharmacyMedicationsRequested`** en `nurse-dashboard-pharmacy-totals.helpers.ts` (misma lógica que los getters / «seleccionar todos» duplicados entre vista farmacia y modal rápido). Tests en `nurse-dashboard-pharmacy-totals.helpers.spec.ts`. **`nurse-pharmacy-section`** y **`nurse-pharmacy-quick-modal`** delegan.
- **Archivos:** `nurse-dashboard-pharmacy-totals.helpers.ts`, `nurse-dashboard-pharmacy-totals.helpers.spec.ts`, `nurse-pharmacy-section.component.ts`, `nurse-pharmacy-quick-modal.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 18

- **Qué:** Cobertura de tests para **`filterNurseDashboardPatients`** (`nurse-dashboard-patients-filter.helpers.ts`): búsqueda por nombre/id/cama y filtros `medications`, `tasks`, `critical`, incluyendo combinación búsqueda+filtro.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-patients-filter.helpers.spec.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 19

- **Qué:** Cobertura de tests para **`parseObservationsDisplayList`** (`nurse-patient-observations.helpers.ts`): vacíos/null, separación por líneas, eliminación de prefijo `[timestamp]` al inicio y preservación de líneas sin ese formato.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-patient-observations.helpers.spec.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 20

- **Qué:** Extraído criterio único de búsqueda de pacientes a `nurse-dashboard-patient-search.helpers.ts` (`patientMatchesDashboardSearchTerm`, `filterPatientsByDashboardSearchTerm`) para reutilizar la misma regla en el buscador de cabecera (`onHeaderPatientSearch`) y en `filterNurseDashboardPatients`.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-patient-search.helpers.ts`, `nurse-dashboard-patient-search.helpers.spec.ts`, `nurse-dashboard-patients-filter.helpers.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 21

- **Qué:** Extraída la lógica de “si hay exactamente un match” en el buscador de pacientes a **`findSinglePatientByDashboardSearchTerm`** (mismo helper de búsqueda), usada por `onHeaderPatientSearch` para evitar lógica inline repetida (`matches.length === 1`). Tests añadidos para 0/1/múltiples coincidencias.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-patient-search.helpers.ts`, `nurse-dashboard-patient-search.helpers.spec.ts`, `nurse-dashboard.component.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-03 — Mejora 22

- **Qué:** Cobertura de tests para `nurse-treatments-today.helpers.ts`: orden cronológico de slots (sin mutar input), evaluación de pendiente y etiquetas de estado/tipo.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-treatments-today.helpers.spec.ts`.
- **Verificación:** `cd frontend && npx ng build --configuration=development` · `npx ng test --watch=false --browsers=ChromeHeadless`.

### 2026-05-04 — Mejora 23

- **Qué:** Cobertura de tests para `nurse-patient-history.helpers.ts`: parseo de fecha/hora del registro, etiquetas de estado, visibilidad y vista previa de notas (incl. truncado con elipsis), orden descendente del historial, filtros por periodo (`today` / `week` / `month` con reloj simulado) y por resultado (`done`, `postponed`, `not_done`).
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-patient-history.helpers.spec.ts`.
- **Verificación:** `cd frontend && npx ng test --no-watch --browsers=ChromeHeadless --include='**/nurse-patient-history.helpers.spec.ts'`.

### 2026-05-04 — Mejora 24

- **Qué:** Cobertura adicional B-04: `buildScheduleSlotsViewPayload` (null sin slots, orden cronológico, reparto hoy / otras fechas con reloj simulado y fechas locales; `kind` y `title`); helpers de medicación del día en ficha (`sortMedicationsTodaySlots`, `medicationSlotPending`, `medicationSlotStatusLabel`).
- **Archivos:** `nurse-dashboard-schedule-slots.helpers.spec.ts`, `nurse-patient-medication-helpers.spec.ts`.
- **Verificación:** `cd frontend && npx ng test --no-watch --browsers=ChromeHeadless`.

### 2026-05-04 — Mejora 25

- **Qué:** Cobertura B-04 sobre `nurse-dashboard-patient-mapping.ts`: `parseConditions`, `mapBedsWithPatientForNurseDashboard`, `mapPatientDetailsToPatients` (cama API, resolución desde listado de camas ante placeholder). Sobre `nurse-dashboard.types.ts`: `isNurseDashboardMainView` para rutas del nav.
- **Archivos:** `nurse-dashboard-patient-mapping.spec.ts`, `nurse-dashboard.types.spec.ts`.
- **Verificación:** `cd frontend && npx ng test --no-watch --browsers=ChromeHeadless`.

### 2026-05-04 — Mejora 26

- **Qué:** Cobertura B-04 fuera del panel enfermería: `defaultDashboardPath` (admin, supervisor, farmacia, enfermería por defecto) en `auth.service.ts`; `validateMaxPatients` y `validateCapacityReduction` en `utils/validators.ts`.
- **Archivos:** `frontend/src/app/services/auth.service.spec.ts`, `frontend/src/app/utils/validators.spec.ts`.
- **Verificación:** `cd frontend && npx ng test --no-watch --browsers=ChromeHeadless`.

### 2026-05-04 — Mejora 27

- **Qué:** Tests de guards funcionales: `authGuard` (sesión / redirección a `/login`); `adminGuard`, `supervisorGuard` y `pharmacyGuard` (rol permitido, rol incorrecto → `defaultDashboardPath`, sin usuario con sesión → `/login`). Ejecución con `TestBed.runInInjectionContext` y mocks de `AuthService` / `Router`.
- **Archivos:** `frontend/src/app/guards/auth.guard.spec.ts`.
- **Verificación:** `cd frontend && npx ng test --no-watch --browsers=ChromeHeadless`.

### 2026-05-04 — Mejora 28

- **Qué:** Tests unitarios Jest en backend: `classifyMedicationExpiry` / `daysToExpiry` / constante `EXPIRING_SOON_DAYS` (`utils/inventory-expiry.ts`) con `jest.useFakeTimers` y fecha ancla UTC; `parseLocalDateTimeParts` (`utils/nurse-local-datetime.util.ts`) para fecha+hora local y casos con espacios / minutos omitidos.
- **Archivos:** `backend/src/__tests__/unit/utils/inventory-expiry.util.test.ts`, `backend/src/__tests__/unit/utils/nurse-local-datetime.util.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 29

- **Qué:** Tests Jest: `parseId`, `parsePagination`, `sendPaginatedResponse` y `sendErrorResponse` (`utils/response.helper.ts`); `pickCurrentShiftForNurse` (`nurse-shift-context.service.ts`) con intervalo mismo día, tarde, turno nocturno que cruza medianoche, turnos inactivos y sin coincidencia (reloj simulado).
- **Archivos:** `backend/src/__tests__/unit/utils/response.helper.test.ts`, `backend/src/__tests__/unit/services/nurse-shift-context.service.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 30

- **Qué:** Tests Jest: `handleControllerError` con mock de `logApiError` (error con `status`, sin mensaje → `defaultMessage`, sin `status` → 500 `SERVER_ERROR`). Tests de `utils/sanitizer.ts` con mock de `isomorphic-dompurify` (evita ESM/jsdom en Jest): cadenas, objetos anidados, números/IDs, email, teléfono y `sanitizeMiddleware`.
- **Archivos:** `backend/src/__tests__/unit/utils/response.helper.test.ts`, `backend/src/__tests__/unit/utils/sanitizer.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 31

- **Qué:** Tests Jest: clases y códigos en `utils/errors.ts`; `errorHandler` / `asyncHandler` / `sendError` en `utils/error-handler.ts` con mocks de `logger` y `logApiError` (AppError vs error genérico, producción vs desarrollo); `PaginationHelper.calculatePaginationInfo` y `applyPagination` en `utils/pagination.helper.ts`.
- **Archivos:** `backend/src/__tests__/unit/utils/errors.test.ts`, `error-handler.test.ts`, `pagination.helper.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 32

- **Qué:** Tests Jest: `generateToken` / `verifyToken` (`utils/jwt.ts`) con mock de `jsonwebtoken` y variables `JWT_SECRET` / `JWT_EXPIRES_IN`; `CursorPaginationHelper.paginateWithCursor` (sin cursor, `hasMore`/`nextCursor`, filtros ASC/DESC, cursor ilegible, tope de `limit`).
- **Archivos:** `backend/src/__tests__/unit/utils/jwt.util.test.ts`, `pagination.helper.test.ts` (ampliado).
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 33

- **Qué:** Tests Jest en un solo archivo con mock compartido de `fs` (no compatible con `spyOn` sobre `existsSync` en el mismo proceso): `loadEnv` (`utils/env.ts`) con `dotenv` y `logger` mockeados — salida temprana si `ENV_LOADED`, prioridad `backend/.env.local`, fallback a raíz, `dotenv.config()` sin path; `MigrationHelper` — `getMigrationInfo` (filtrado y orden por timestamp) y `validateMigrations` (duplicados, archivo faltante, caso válido).
- **Archivos:** `backend/src/__tests__/unit/utils/migration-helper.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 34

- **Qué:** Tests Jest de `metricsMiddleware` (`middleware/metrics.middleware.ts`): llama a `healthController.incrementRequest` y `next`; en evento `finish` con `statusCode >= 400` llama `incrementError`; petición lenta (`Date.now` simulado >1000 ms) con `req.path` bajo `/api/` dispara `logger.warn` con mensaje de slow request.
- **Archivos:** `backend/src/__tests__/unit/middleware/metrics.middleware.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 35

- **Qué:** Tests Jest de `authMiddleware` y `role.middleware` en un archivo con mocks compartidos de `AppDataSource` (`User` / `Bed`), `verifyToken` y `logger`: flujos 401/500, usuario adjunto; `requireRole`, `requireAdmin`, `requireAdminOrSupervisor`; enfermera y cama por área (`requireAdminOrSupervisorOrNurseInArea`).
- **Archivos:** `backend/src/__tests__/unit/middleware/auth-role.middleware.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 36

- **Qué:** Tests Jest de `paginationMiddleware` y `paginatedResponse` (`middleware/pagination.middleware.ts`); `validateDto` y `validateQuery` (`middleware/validation.middleware.ts`) con DTO mínimo y `PaginationDto` de `dto/common.dto.ts` (éxito y `ValidationError` vía `next`).
- **Archivos:** `backend/src/__tests__/unit/middleware/pagination-validation.middleware.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 37

- **Qué:** Tests Jest de `rateLimitMiddleware` (exceso → `TooManyRequestsError` + `logger.warn`; bypass en desarrollo + localhost), `authRateLimitMiddleware` (límite 200 en `development` vs 5 en `production` para IP remota) y `strictRateLimitMiddleware` (cabecera límite 10). En `RateLimiter`, no registrar `setInterval` de limpieza cuando `NODE_ENV === 'test'` para reducir handles abiertos en Jest.
- **Archivos:** `backend/src/__tests__/unit/middleware/rate-limit.middleware.test.ts`, `backend/src/middleware/rate-limit.middleware.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 38

- **Qué:** Tests Jest de `HealthController` con **instancia nueva** (sin mutar el singleton exportado): mock de `AppDataSource` (`query`, `options.pool`); endpoint `basic` con éxito (`healthy`) y con fallo de BD (`503` unhealthy); `metrics` tras `incrementRequest` / `incrementError` / `incrementQuery` (incl. consulta lenta) verifica totales, `errorRate` y contadores de BD en el JSON.
- **Archivos:** `backend/src/__tests__/unit/controllers/health.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 39

- **Qué:** Ampliación del mismo spec: `ready` con `SELECT 1` OK (`status: ready`) y con fallo de query (`503`, `not ready`); `live` devuelve `alive` + timestamp y **no** invoca `AppDataSource.query`.
- **Archivos:** `backend/src/__tests__/unit/controllers/health.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 40

- **Qué:** Tests de `detailed`: respuesta **200** con `checks.database` / `memory` / `disk` coherentes; fallo de `AppDataSource.query` → **503** y check de BD `unhealthy`; simulación de latencia de BD (`Date.now` con salto >1000 ms) → estado global `degraded`, check de BD `degraded` y `responseTime` esperado, manteniendo **200**. Al inicio del spec, **`jest.mock('os')`** con `totalmem`/`freemem` fijos (~40 % uso) para que el check de memoria no marque `unhealthy` en entornos con poca RAM libre (evita tests flaky).
- **Archivos:** `backend/src/__tests__/unit/controllers/health.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 41

- **Qué:** Tests Jest de `NotificationsController` con **`new NotificationsController()`** (sin singleton); mock de `notification.service` para no cargar TypeORM ni email; cobertura de `getNotifications` (array vacío), `markAsRead`, `markAllAsRead` y `delete` (respuestas JSON stub actuales).
- **Archivos:** `backend/src/__tests__/unit/controllers/notifications.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 42

- **Qué:** Tests Jest de `WebhookController` con instancia aislada; **`webhook.service`** mockeado (`register` / `list` / `delete` / `test`). `register`: tres casos **400** (`VALIDATION_ERROR`) si falta `url`, falta `events` o `events` no es array (sin llamar al servicio); caso **201** con argumentos `{ url, events, secret?, userId }` y cuerpo JSON acotado. `list`, `delete` (`parseInt` en `params.id`) y `test` verifican delegación y respuesta.
- **Archivos:** `backend/src/__tests__/unit/controllers/webhook.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 43

- **Qué:** Tests Jest de `BackupController` con **`backup.service`** mockeado (`createBackup`, `listBackups`, `restoreBackup`, `verifyBackup`, `testRestore`). Cobertura de `createBackup` (`'full'` por defecto y `incremental` en body), `listBackups`, y de `restoreBackup` / `verifyBackup` / `testRestore`: **400** sin `filename`, **404** si no hay entrada coincidente en `listBackups`, flujo OK con delegación al servicio y JSON esperado. Tras cada invocación a handlers envueltos en **`asyncHandler`** (no devuelven la promesa del `async` interno), **`await flush()`** con `setImmediate` para asentar microtareas antes de los `expect` (análogo al `flushMetrics` de `health.controller.test.ts`).
- **Archivos:** `backend/src/__tests__/unit/controllers/backup.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 44

- **Qué:** Tests Jest de `AreasController` con mock de **`AppDataSource.getRepository`** (objeto repositorio con `find` / `findOne` / `save` / `remove`) y **`logger`**. `getAll` (éxito con `order` + `relations`, **500** si `find` falla); `getById` (**404**, éxito directo, rama de compatibilidad **`ER_BAD_FIELD_ERROR`** con mensaje que menciona `Patient` y segundo `findOne` sin pacientes en camas, **500** en error genérico); `create` (**400** sin nombre, **201**); `update` (**404**, actualización + `save`); `delete` (**404**, **400** si hay camas, éxito con `remove`).
- **Archivos:** `backend/src/__tests__/unit/controllers/areas.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 45

- **Qué:** Tests Jest de `BedsController` con **`AppDataSource.getRepository`** según entidad (**`Bed`** / **`Patient`**), mocks de **`logger`** y **`logApiError`**. Cobertura de **`getAll`** (lista vacía, normalización de paciente activo / `isOccupied`, fallback **`ER_BAD_FIELD_ERROR`** en `find`), **`getByArea`** (**400** `INVALID_ID`, filtro por `areaId`), **`create`** (validación, `areaId` inválido, duplicado **`DUPLICATE_BED`**, **201** con recarga), **`update`** (**400**/**404**, actualización + respuesta normalizada), **`delete`** (**400** id, **404**, **`BED_IN_USE`** vía `count`, éxito con `remove`). La parte **`assignPatient`** quedó en la **mejora 46**.
- **Archivos:** `backend/src/__tests__/unit/controllers/beds.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 46

- **Qué:** Ampliación del mismo spec: **`assignPatient`** con **`AppDataSource.createQueryRunner`** mockeado (`connect`, `startTransaction`, `commitTransaction`, `rollbackTransaction`, `release`, `manager.createQueryBuilder` y `manager.getRepository`). Casos: **400** id de cama inválido; **404** cama inexistente; **liberación** con `patientId: null` (transacción + `commit` + recarga vía `bedRepository.createQueryBuilder`); **400** `patientId` no parseable (rollback, sin `commit`); **404** paciente inexistente (`findOne` devuelve `null`, distinto de «valor por defecto» del mock — se usa `'patientFindOne' in opts`); **409** cama ya ocupada (`getRawOne` con `patient_id`). *Pendiente de iterar:* asignación con **éxito** y verificación `getRawOne` (forma de alias en raw TypeORM vs `patient_bed_id` en el controlador) o prueba de integración con BD.
- **Archivos:** `backend/src/__tests__/unit/controllers/beds.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 47

- **Qué:** Tests Jest de las funciones exportadas **`getShifts`** y **`updateShift`** (`shifts.controller.ts`): mock **`AppDataSource.getRepository(Shift)`** y **`logger`**. `getShifts`: `find` con `where: { isActive: true }`, `order: { id: 'ASC' }`, **500** si falla la consulta. `updateShift`: **400** id no numérico; **404** sin turno; validación regex **HH:MM** para `startTime` y `endTime`; actualización con **`save`** y respuesta JSON de éxito.
- **Archivos:** `backend/src/__tests__/unit/controllers/shifts.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 48

- **Qué:** Ampliación de **`shifts.controller.test.ts`** con **`getWeeklySchedule`**: mock **`AppDataSource.getRepository(NurseShift)`** y cadena **`createQueryBuilder`** (`leftJoinAndSelect` enfermera y turno, `where` con rango de fechas cuando hay `weekStartDate`, **`getMany`**). Casos: lista vacía y joins sin filtro; filtro semana **2026-01-06** → **2026-01-13**; agrupación por enfermera y día (`monday` … `shift.type`); `dayOfWeek` fuera del mapa sin rellenar día; **500** si falla la consulta.
- **Archivos:** `backend/src/__tests__/unit/controllers/shifts.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 49

- **Qué:** En **`getWeeklySchedule`**, el log de «primeros turnos» ya no asume `ns.nurse` cargado (evita **TypeError** si hay filas huérfanas). Nuevo test: filas con `nurse` o `shift` nulos se omiten en la agrupación y se registra **`logger.warn`**.
- **Archivos:** `backend/src/controllers/shifts.controller.ts`, `backend/src/__tests__/unit/controllers/shifts.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 50

- **Qué:** Tests Jest de **`ReportsController`**: mock **`reportService`** (`getPatientIdsVisibleToNurse`, `generateMedicationReport`, `generateComplianceStats`, `exportReport`). **`generateMedicationReport`**: **400** sin fechas; admin sin llamada a visibilidad; enfermera **403** si `patientId` no está en IDs visibles; enfermera con `restrictToPatientIds`. **`generateComplianceStats`**: **400**; supervisor sin restricción. **`exportReport`**: **400** por query incompleta o tipo inválido; **415** si `exportReport` del servicio devuelve `null`; éxito CSV con cabeceras y **`send`** para **medication** y **compliance**. Tras handlers **`asyncHandler`**, `setImmediate` para vaciar microtareas.
- **Archivos:** `backend/src/__tests__/unit/controllers/reports.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 51

- **Qué:** Ampliación de **`shifts.controller.test.ts`** con **`saveWeeklySchedule`** (**400** sin `schedules` o no array; éxito con `schedules: []` y `shiftsCreated: 0`; flujo con `weekStartDate`, `nurseId`, `shiftId: 'morning'` mockeando `Shift.find`, cadena **`createQueryBuilder` → `delete`…`execute`** y **`NurseShift.save`**; **500** si `find` de turnos falla). **`getShiftAttendance`**: **400** sin `date`/`shiftId` o `shiftId` no numérico; éxito con **`User.find`** (rol enfermera) + **`ShiftAttendance.find`** (ausente por defecto / fila **PRESENT**); **500** si falla la consulta de asistencia.
- **Archivos:** `backend/src/__tests__/unit/controllers/shifts.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 52

- **Qué:** Tests Jest de **`saveShiftAttendance`**: mock **`ShiftAttendance`** (`findOne`, `create`, `save`). Validación **400** (`date`/`shiftId`/`attendance`, `shiftId` no numérico); **`attendance` vacío** → `saved: 0`; omisión de filas con **`nurseId`** o **`status`** inválidos; alta con **`create`** + **`recordedBy`** desde `req.user`; actualización de fila existente **sin** `create`; **500** si falla **`save`**.
- **Archivos:** `backend/src/__tests__/unit/controllers/shifts.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 53

- **Qué:** Ampliación de **`shifts.controller.test.ts`**: **`getPresentNursesByShift`** (**400** query / `shiftId`, filtro **present**/**late** + enfermera activa rol nurse, **500**); **`getShiftAttendanceHistory`** (mock cadena **`createQueryBuilder`**, `take` por defecto **200**, `limit` acotado a **1000**, `andWhere` opcionales `dateFrom`/`dateTo`/`shiftId`, mapeo DTO con `recordedByUser` y fallback nombre enfermera, **500**).
- **Archivos:** `backend/src/__tests__/unit/controllers/shifts.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 54

- **Qué:** Tests Jest de **`AuthController.login`**: mocks de **`AppDataSource.getRepository`**, **`generateToken`**, **`auditService`** / **`AuditService.getIpAddress`/`getUserAgent`**, **`emailService.isSmtpConfigured`**, **`logger`**. Casos: **400** sin usuario o contraseña; **401** usuario no encontrado (con `logLoginFailed`); **401** usuario inactivo; **403** email no verificado (`smtpConfigured`); **401** contraseña incorrecta; **200** con token y payload (`phone` **null**); **500** si falla la consulta.
- **Archivos:** `backend/src/__tests__/unit/controllers/auth.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 55

- **Qué:** Ampliación de **`auth.controller.test.ts`**: **`register`** (**400** campos, teléfono largo, rol inválido, usuario/correo duplicado, pendiente con mismo username y otro email, **201** con `save`/`sendVerificationCode`, **500**); **`verifyEmail`** (**400** query incompleta, **404** sin pendiente ni usuario, **400** ya verificado, código inválido o expirado con pendiente); **`resendVerificationCode`** (**400** sin email). Mock **`AppDataSource`** con `transaction` para alinear con el módulo real (flujo éxito con transacción → trabajo futuro).
- **Archivos:** `backend/src/__tests__/unit/controllers/auth.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 56

- **Qué:** Ampliación de **`auth.controller.test.ts`**: **`verifyEmail`** **409** (conflicto en `users`, `remove` del pendiente); **200** creación vía **`AppDataSource.transaction`** (mock `manager.save`/`delete`); **200** verificación sobre **usuario** existente sin pendiente (`save` + `generateToken`). **`resendVerificationCode`**: **404** sin pendiente ni usuario; flujo **pendiente** (save + mensaje sin SMTP); **500** si falla **`sendVerificationCode`**; **400** usuario ya verificado; reenvío sobre **usuario** no verificado.
- **Archivos:** `backend/src/__tests__/unit/controllers/auth.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 57

- **Qué:** Tests Jest de **`AuthController.updateMe`** (mock **`getRepository(User)`**): **401** sin sesión o sin `id`; **400** campos obligatorios / vacíos / longitud de usuario / email inválido / usuario o correo duplicado / teléfono **>30** caracteres; **404** usuario no encontrado; **200** actualización con **`save`** y limpieza de **`phone`** con **`null`**; **500** si **`save`** falla. **`me`**: **401**; **200** con payload `user`; **500** en **`catch`** si **`res.json`** lanza.
- **Archivos:** `backend/src/__tests__/unit/controllers/auth.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 58

- **Qué:** Nuevo **`schedules.controller.test.ts`**: mocks **`Schedule`** + **`AdministrationHistory`**; **`getAll`** con **`createQueryBuilder`** / **`getManyAndCount`** (paginación, **500**, reintento **`ER_BAD_FIELD_ERROR`** sin `assignedTo`); **`getByPatient`**; **`create`** (**400**, **201**, `findOne` tolerante a columna); **`update`**/**`delete`**; **`complete`** y **`markAsNotCompleted`** (auth, id, **404**, **200** e historial); **`postpone`**; **`markMedicationGiven`**.
- **Archivos:** `backend/src/__tests__/unit/controllers/schedules.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 59

- **Qué:** Nuevo **`medications.controller.test.ts`** para las funciones exportadas de **`medications.controller.ts`**: mock **`getRepository(Schedule)`**, **`cacheService.delete`/`generateKey`**, cadena **`createQueryBuilder`**; **`addMedication`** (**401**, **400** validación / sin dosis por días inválidos, **201**, **500**); **`suspendMedication`**, **`deleteMedication`**, **`reactivateMedication`**, **`getPatientMedications`** (**400**/**404**/**200**, **500** en raw query).
- **Archivos:** `backend/src/__tests__/unit/controllers/medications.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 60

- **Qué:** Nuevo **`patients.controller.test.ts`**: mock **`Patient`** / **`Bed`**; **`getAll`** + reintento **`ER_BAD_FIELD_ERROR`**; **`getById`** (**400**/**404**/**200**); **`saveObservation`**; **`create`** (**400**/**201**); **`update`** **403** enfermera + **`assignedToId`**.
- **Archivos:** `backend/src/__tests__/unit/controllers/patients.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 61

- **Qué:** Nuevo **`users.controller.test.ts`**: mocks **`User`**, **`Schedule`**, **`NurseShift`**; **`getAll`**; **`update`** (**400** id / **maxPatients** / auto-rol, **404**, **200** + **`logUserAction`**); **`updateRole`**; **`delete`** (auto-borrado, **404**, admin); **`restore`**.
- **Archivos:** `backend/src/__tests__/unit/controllers/users.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 62

- **Qué:** Nuevo **`pharmacy.controller.test.ts`** (handlers exportados): **`getMedicationRequests`** sin paginar; **`updateRequestStatus`**; **`deliverMedication`**; **`getInventory`**; **`updateMedicationStock`**; **`getInventoryMovements`**; **`createMedication`** / **`deleteMedication`** (mocks **`AppDataSource.getRepository`**).
- **Archivos:** `backend/src/__tests__/unit/controllers/pharmacy.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 63

- **Qué:** Nuevo **`nurses.controller.test.ts`**: **`AppDataSource.isInitialized`** + mocks de servicios (`nurse-stats`, `my-beds`, `my-patients`, `today-tasks`, `day-tasks-history`, `patient-details`, `pharmacy-medications`, `treatments`, `administration`, `shift-context`, `shift-handover-note`); pruebas de **`getNurseStats`**, **`getMyBeds`**/**`getMyPatients`**, **`getTodayTasks`**, **`getDayTasksHistory`**, **`getPatientDetails`**, **`addTreatment`**, **`getMedicationsForPharmacy`**, **`recordAdministration`**, **`getNurseShiftContext`**, handover **get/put**, **`patchPatientTreatmentSchedule`** (validación IDs).
- **Archivos:** `backend/src/__tests__/unit/controllers/nurses.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 64

- **Qué:** En **`beds.controller.test.ts`**, caso **`assignPatient`** **200**: paciente activo, cama libre, `update` con filas afectadas, **`getRawOne`** de verificación con alias **`patient_bedId`**, **`commitTransaction`**, recarga de cama con relación **`patients`** y payload normalizado (`patientId`, `isOccupied`, mensaje de éxito).
- **Archivos:** `backend/src/__tests__/unit/controllers/beds.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 65

- **Qué:** Ampliación de **`nurses.controller.test.ts`**: **`getPatientHistory`**, **`quickAddPatientTreatment`**, **`patchPatientTreatmentSchedule`** **200**, **`patchAdministrationHistoryRecord`**, **`deleteAdministrationHistoryRecord`**, **`patchNursePatientSchedule`**, **`deleteNursePatientSchedule`** (mocks de servicios ya existentes + casos **400**/**403**/**404**/**200**/**201** según handler).
- **Archivos:** `backend/src/__tests__/unit/controllers/nurses.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 66

- **Qué:** En **`nurses.controller.test.ts`**, bloque **`ramas 500 cuando el servicio lanza`**: servicios mockeados con **`mockRejectedValueOnce(new Error('db'))`** para ejercitar los **`catch`** de estadísticas, camas, pacientes, tareas, historial del día, detalle paciente, alta tratamiento, farmacia, **`recordAdministration`**, **`getPatientHistory`**, alta rápida y patch/delete de historial y horarios, contexto de turno, nota de entrega **get**/**put**.
- **Archivos:** `backend/src/__tests__/unit/controllers/nurses.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 67

- **Qué:** **`patients.controller.test.ts`**: **`update`** **400** id, **404**, **200** admin; **`delete`** **400**/**404**/**200** (paciente sin cama: **`scheduleRepository.delete`**, **`patientRepository.remove`**). **`pharmacy.controller.test.ts`**: **`getMedicationRequests`** con **`page`/`limit`** + resumen **`openByStatus`**; **`getDeliveryHistory`** sin paginar; **`postInventoryMovement`** (**400** tipo/cantidad, **404**, **200** entrada con **`createQueryRunner`** mockeado); **`createMedicationRequest`** (**401**, **400**, **201**) con **`headers: {}`** en el request (el controlador lee **`req.headers.authorization`**).
- **Archivos:** `backend/src/__tests__/unit/controllers/patients.controller.test.ts`, `backend/src/__tests__/unit/controllers/pharmacy.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 68

- **Qué:** **`pharmacy.controller.test.ts`**: **`getDeliveryHistory`** con **`includeCancelled`** (mapeo **`type: 'cancelled'`**), respuesta **paginada** con **`pagination`** y **`summary.deliveredTodayCount`**, y variante paginada + **`includeCancelled`**; **`postInventoryMovement`**: **400** salida con stock insuficiente, **200** salida y **200** **`adjustment`**; **`getInventoryMovements`** con **`page`/`limit`**.
- **Archivos:** `backend/src/__tests__/unit/controllers/pharmacy.controller.test.ts`.
- **Verificación:** `cd backend && npm run test:unit`.

### 2026-05-04 — Mejora 69

- **Qué (backend):** **`getMedicationRequests`** **500** si falla **`getManyAndCount`**; **`getDeliveryHistory`** con **`startDate`/`endDate`**; **`postInventoryMovement`** entrada con **`expiryDate`**; **`PatientsController.delete`** con **`bedId`**, **`count`** = 1 y **`bed.isOccupied`** → **`false`**. **Qué (frontend):** specs **`NurseDashboardMainNavComponent`** (emisión **`viewSelect`**, **`entregaClick`**, **`reportesClick`**) y **`NurseDashboardHeaderSearchComponent`** (**`debounced`** tras **`tick(350)`**).
- **Archivos:** `backend/src/__tests__/unit/controllers/pharmacy.controller.test.ts`, `backend/src/__tests__/unit/controllers/patients.controller.test.ts`, `frontend/src/app/components/nurse-dashboard/nurse-dashboard-main-nav/nurse-dashboard-main-nav.component.spec.ts`, `frontend/src/app/components/nurse-dashboard/nurse-dashboard-header-search/nurse-dashboard-header-search.component.spec.ts`.
- **Verificación:** `cd backend && npm run test:unit` · `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='**/nurse-dashboard-main-nav.component.spec.ts' --include='**/nurse-dashboard-header-search.component.spec.ts'`.

### 2026-05-04 — Mejora 70

- **Qué (backend):** **`getMedicationRequests`** **500** cuando falla **`getMany`** en modo sin paginar; **`getDeliveryHistory`** **500** si falla **`getMany`** de entregas. **Qué (frontend):** **`NurseSummarySectionComponent`** (**`areaSummaryClick`**, **`openHandoverClick`**); **`NurseHandoverModalComponent`** (**`dismissed`** por backdrop, **`ngModelChange`** fecha → **`handoverDateChange`**/**`handoverDateCommitted`**, **`saveRequested`**).
- **Archivos:** `backend/src/__tests__/unit/controllers/pharmacy.controller.test.ts`, `frontend/src/app/components/nurse-dashboard/nurse-summary-section/nurse-summary-section.component.spec.ts`, `frontend/src/app/components/nurse-dashboard/nurse-handover-modal/nurse-handover-modal.component.spec.ts`.
- **Verificación:** `cd backend && npm run test:unit -- --testPathPattern=pharmacy.controller.test` · `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='**/nurse-summary-section.component.spec.ts' --include='**/nurse-handover-modal.component.spec.ts'`.

### 2026-05-04 — Mejora 71

- **Qué (backend):** **`getInventory`** **500** si falla **`medRepo.find`** (lista sin paginar) o **`medRepo.findAndCount`** (paginado); **`createMedicationRequest`** **500** si falla **`medRepo.save`** al crear medicamento inexistente. **Qué (frontend):** **`NurseTasksSectionComponent`** (`addTaskClick`, `clearTaskFilters`, `descriptionPreview`, `completeTask`); **`NursePharmacySectionComponent`** (`sendRequest`, `viewPatients`, `requestedCount`, `toggleAllMedications`).
- **Archivos:** `backend/src/__tests__/unit/controllers/pharmacy.controller.test.ts`, `frontend/src/app/components/nurse-dashboard/nurse-tasks-section/nurse-tasks-section.component.spec.ts`, `frontend/src/app/components/nurse-dashboard/nurse-pharmacy-section/nurse-pharmacy-section.component.spec.ts`.
- **Verificación:** `cd backend && npm run test:unit -- --testPathPattern=pharmacy.controller.test` · `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='**/nurse-tasks-section.component.spec.ts' --include='**/nurse-pharmacy-section.component.spec.ts'`.

### 2026-05-04 — Mejora 72

- **Qué (frontend):** Specs **`NurseBedsSectionComponent`**: clic en tarjeta → **`bedEditRequest`**; botón «Ver detalles completos» → **`viewPatientRequest`** sin disparar edición de cama (`stopPropagation`). **`NursePatientsAssignedSectionComponent`**: **`searchTermChange`** / **`selectedFilterChange`** desde controles; fila → **`openPatientDetails`**; badge de dosis → **`openPatientMedicationSchedule`** sin **`openPatientDetails`**; mensaje vacío sin filas.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-beds-section/nurse-beds-section.component.spec.ts`, `frontend/src/app/components/nurse-dashboard/nurse-patients-assigned-section/nurse-patients-assigned-section.component.spec.ts`.
- **Verificación:** `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='**/nurse-beds-section.component.spec.ts' --include='**/nurse-patients-assigned-section.component.spec.ts'`.

### 2026-05-04 — Mejora 73

- **Qué (frontend):** Spec **`NurseDashboardOverlaysStackComponent`**: montaje con `@Input` obligatorios vacíos; **`resetObservationEditState`** sin **`ViewChild`**; comprobación de propagación al padre de **`handoverDismissed`**, **`pharmacyPatientsDismissed`**, **`pendingTaskDetailDismissed`** y **`historyDetailDismissed`** al interactuar con los modales hijos correspondientes.
- **Archivos:** `frontend/src/app/components/nurse-dashboard/nurse-dashboard-overlays-stack/nurse-dashboard-overlays-stack.component.spec.ts`.
- **Verificación:** `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='**/nurse-dashboard-overlays-stack.component.spec.ts'`.

### 2026-05-04 — Mejora 5 (cierre — acceso unificado + tests)

- **Qué:** `recordNurseAdministration` y `fetchNursePatientAdministrationHistoryFormatted` delegan la autorización en `assertNurseCanAccessPatient` (misma regla que el resto de acciones de enfermería sobre paciente). `getPatientHistory` pasa `nurse.id` al servicio. ID de paciente no numérico responde **400** con mensaje explícito (antes se devolvía 403 genérico). Eliminados imports no usados (`Bed`, `Patient`) en `nurse-administration.service.ts`.
- **Tests:** `backend/src/__tests__/unit/services/nurse-patient-access.service.test.ts` (404, asignación directa, sin área, sin cama, cama otra área, OK por área).
- **Comandos:** `cd backend && npm run build` · `npm run test:unit`

### 2026-05-04 — Mejora 5 (parcial, notas de entrega)

- **Qué:** Lógica de lectura/escritura de notas de entrega movida a `backend/src/services/shift-handover-note.service.ts`; `getNurseHandoverNote` / `putNurseHandoverNote` en `nurses.controller.ts` delegan en el servicio (validación HTTP sigue en el controlador). El resto del refacto del controlador y el cierre de acceso unificado figuran en las entradas posteriores de esta misma fecha y en «Mejora 5 (cierre — acceso unificado + tests)».

### 2026-05-03 — Mejora 5 (parcial, continuación)

- **Qué:** `getDayTasksHistory` delega en `fetchNurseDayTasksHistory` en `backend/src/services/nurse-day-tasks-history.service.ts` (consultas Schedule / Patient / AdministrationHistory y mapeo a DTO). El controlador solo valida el query `date` y responde JSON o 400/500.
- **Tests:** `__tests__/unit/services/nurse-day-tasks-history.service.test.ts` (`localDayBoundsForHistory`).

### 2026-05-04 — Mejora 5 (parcial, continuación 2)

- **Qué:** `getNurseStats` delega en `computeNurseStats` (`nurse-stats.service.ts`). `getTodayTasks` delega en `fetchNurseTodayTasksGrouped` (`nurse-today-tasks.service.ts`, con `groupNurseTodayTasksByHour` exportada para pruebas). El controlador conserva comprobación de `AppDataSource`, 401/404/500 y logs de `getNurseStats`.
- **Tests:** `__tests__/unit/services/nurse-today-tasks.service.test.ts` (`groupNurseTodayTasksByHour`).
- **Limpieza:** eliminado import no usado de `Area` en `nurses.controller.ts`.

### 2026-05-04 — Mejora 5 (parcial, continuación 3)

- **Qué:** `getMedicationsForPharmacy` delega en `fetchMedicationsForPharmacyGrouped` (`nurse-pharmacy-medications.service.ts`). Misma respuesta JSON que antes; tipos explícitos `MedicationForPharmacyGroup` / `PharmacyPatientRow` en el servicio.

### 2026-05-04 — Mejora 5 (parcial, continuación 4)

- **Qué:** `getMyBeds` → `fetchMyBedsForNurse` (`nurse-my-beds.service.ts`). `getMyPatients` → `fetchMyPatientsForNurse` (`nurse-my-patients.service.ts`), incluido filtro `q` y validación de longitud. Respuestas vía `{ ok, … }` para 404/400/500 donde aplica. Eliminado import `Between` del controlador (ya no se usa ahí).

### 2026-05-03 — Mejora 5 (parcial, continuación 5)

- **Qué:** `getNurseShiftContext` delega en `buildNurseShiftContextPayload` (`nurse-shift-context.service.ts`; incluye `pickCurrentShiftForNurse`). `getPatientDetails` delega en `fetchPatientDetailsForNurse` (`nurse-patient-details.service.ts`), con resultado `{ ok, detail }` o `{ ok, status, body }`. El controlador valida rol enfermería / auth, `patientId` numérico y errores 500; se quitaron imports `Shift`, `ShiftAttendance`, `In`/`Like` del controlador donde ya no aplican.
- **Build / tests:** `cd backend && npm run build` · `npm run test:unit`

### 2026-05-03 — Mejora 5 (parcial, continuación 6)

- **Qué:** Tratamientos y horarios: `addTreatment` → `createNurseTreatmentSchedules`, `quickAddPatientTreatment` → `quickAddNursePatientTreatment`, `patchPatientTreatmentSchedule` → `patchPatientTreatmentScheduleAction`, `patchNursePatientSchedule` → `patchNursePatientScheduleForNurse`, `deleteNursePatientSchedule` → `deletePendingNursePatientSchedule` (`nurse-treatments.service.ts`). Administración: `recordAdministration`, `getPatientHistory`, `patchAdministrationHistoryRecord`, `deleteAdministrationHistoryRecord` → `nurse-administration.service.ts`. `assertNurseCanAccessPatient` movido a `nurse-patient-access.service.ts`. `parseLocalDateTimeParts` compartido en `backend/src/utils/nurse-local-datetime.util.ts`. El controlador `nurses.controller.ts` deja de importar entidades TypeORM salvo `UserRole`.
- **Build / tests:** `cd backend && npm run build` · `npm run test:unit`

### 2026-05-04 — Mejora 6

- **Qué:** Documentado el propósito de `backend/frontend/package.json` (stub de build / Vercel) en `backend/README.md`.

### 2026-05-04 — Mejora 7

- **Frontend**
  - Ajustes en specs existentes para que `ng test` compile y pase: `login.component.spec.ts` (`usernameOrEmail`, `LoginResponse`, `provideRouter`, `ToastService`, `fakeAsync` + navegación), `pagination.component.spec.ts` (evento de cambio de página), `debounce.directive.spec.ts` (debounce 500 ms con componente recreado), `export.service.spec.ts` (fecha local; Excel sin asumir solo fallback CSV).
- **Backend**
  - Nuevo `__tests__/unit/services/shift-handover-note.service.test.ts` (mocks de TypeORM, sin BD).
  - Nuevo `__tests__/unit/services/nurse-patient-access.service.test.ts` (`assertNurseCanAccessPatient`: 404, asignación directa, sin área, sin cama, cama otra área, OK por área).
  - `patient.service.test.ts`: mock `update` y expectativas de `deletePatient` alineadas con `patientRepository.update({ bedId: null })`.
- **Comandos:** `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless` · `cd backend && npm run test:unit`

---

## Cómo usar este archivo

1. Revisar si hay trabajo **sin numerar** en [`MEJORAS_PENDIENTES.md`](./MEJORAS_PENDIENTES.md); si se adopta oficialmente, añadir una fila nueva (p. ej. #74) en **Lista maestra** con estado **Pendiente** o **En curso**.
2. Elegir la siguiente mejora **Pendiente** (o **Parcial** que se quiera continuar) por número en la tabla de arriba.
3. Implementarla en el código.
4. Cambiar su fila a **Hecha** y añadir una subsección en **Historial** con fecha, qué y rutas relevantes.

Si todas las filas numeradas están **Hechas** (lista **1–272** en el estado actual), este archivo sigue como **historial**; el backlog vivo y el orden sugerido de siguientes pasos están en **`MEJORAS_PENDIENTES.md`** hasta que promocionen a nueva fila numerada.
