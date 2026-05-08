# Digrama textual secuencial - NurseHelper

## 1) Secuencia principal: autenticacion y entrada por rol

```text
Usuario -> Frontend (Angular): Abre /login
Frontend -> API (/api/auth/login): Envia credenciales
API -> AuthController: Valida formato + rate limit
AuthController -> Servicio/Auth: Verifica usuario + password
Servicio/Auth -> MySQL (TypeORM): Consulta usuario
MySQL -> Servicio/Auth: Devuelve usuario/estado
Servicio/Auth -> AuthController: Genera JWT + perfil
AuthController -> Frontend: token + datos de usuario
Frontend -> Guards: Evalua rol (admin/supervisor/nurse/pharmacy)
Guards -> Router Angular: Redirecciona al dashboard correspondiente
```

## 2) Secuencia operativa: enfermeria (flujo diario)

```text
Nurse -> Frontend: Entra a /nurse-dashboard
Frontend -> API (/api/nurse/shift-context): Pide contexto de turno
API -> NurseShiftContextService: Calcula area/turno vigente
Service -> MySQL: Consulta turnos + asignaciones
API -> Frontend: Contexto del turno

Frontend -> API (/api/nurse/beds): Solicita camas asignadas
Frontend -> API (/api/nurse/patients): Solicita pacientes asignados
API -> Servicios NurseMyBeds/NurseMyPatients: Resuelven listas
Servicios -> MySQL: Consultan beds/patients/schedules
API -> Frontend: Renderiza panel de pacientes y tareas

Nurse -> Frontend: Registra administracion (administered/no administrado/missed)
Frontend -> API (/api/nurse/administration): Envia evento clinico
API -> NurseAdministrationService: Valida reglas + guarda historial
Service -> MySQL: Inserta en administration_history + actualiza estados
API -> Frontend: Confirma registro y actualiza timeline
```

## 3) Secuencia operativa: farmacia

```text
Pharmacy -> Frontend: Entra a /pharmacy
Frontend -> API (/api/pharmacy/requests): Carga solicitudes
API -> PharmacyController/Services: Filtra por estado/prioridad
Service -> MySQL: Lee medication_requests
API -> Frontend: Lista pendientes/en preparacion/listo/entregado

Pharmacy -> Frontend: Marca solicitud como entregada
Frontend -> API (/api/pharmacy/requests/:requestId/deliver): Confirma entrega
API -> Servicio farmacia: Registra delivery + descuenta/ajusta inventario
Service -> MySQL: Inserta delivery_history + inventory_movements
API -> Frontend: Respuesta exitosa + inventario actualizado
```

## 4) Secuencia operativa: administracion/supervision

```text
Admin/Supervisor -> Frontend: Gestiona pacientes, camas, areas, usuarios
Frontend -> API (/api/patients, /api/beds, /api/areas, /api/users)
API -> Middlewares: auth + autorizacion por rol
Controllers -> Servicios dominio: Validaciones de negocio
Servicios -> MySQL: CRUD y consultas paginadas
API -> Frontend: Datos actualizados + estados de operacion
```

## 5) Secuencia de respaldo y restauracion

```text
Admin -> API (/api/backup): Solicita crear backup
API -> BackupService: Ejecuta estrategia de backup
BackupService -> Sistema: Genera .sql/.sql.gz
API -> Admin: Retorna nombre/tamano/fecha

Admin -> API (/api/backup/restore): Solicita restaurar archivo
API -> BackupService: Verifica existencia + ejecuta restore
BackupService -> MySQL: Restaura estructura/datos
API -> Admin: Resultado de restauracion
```

## 6) Componentes transversales de la arquitectura

- Seguridad: `helmet`, CORS, sanitizacion, JWT, rate limit.
- Observabilidad: logs estructurados, health checks, metricas middleware.
- Persistencia: TypeORM + migraciones + MySQL.
- Contratos: Swagger para exploracion y pruebas de endpoints.

---

# Recomendaciones de mejora (logica + nuevas funciones)

## A. Mejoras de logica/arquitectura

1. **Separar mas el dominio por modulos internos**  
   Dividir servicios grandes de enfermeria/farmacia en casos de uso concretos (`use-cases`) para bajar acoplamiento y facilitar pruebas.

2. **Idempotencia en operaciones criticas**  
   En endpoints como administracion de medicamento y entregas, aceptar un `idempotencyKey` para evitar dobles registros por reintentos de red.

3. **Auditoria de cambios sensible**  
   Registrar "quien, que, cuando y por que" en cambios de pacientes, inventario y turnos para trazabilidad clinica/legal.

4. **Politicas de concurrencia**  
   Agregar control optimista (`version`/`updatedAt`) en inventario y tareas para evitar sobrescrituras cuando dos usuarios editan lo mismo.

5. **Cache de lectura para paneles**  
   Cache corto (15-60s) para endpoints de dashboard (`stats`, `tasks/today`, `inventory`) y asi reducir carga de DB.

## B. Funciones nuevas de alto impacto

1. **Motor de alertas clinicas**  
   Alertas por medicamento vencido, stock critico, tareas vencidas y pacientes sin nota de handover.

2. **Programacion inteligente de tareas**  
   Reglas para sugerir horarios de administracion segun turno, carga de enfermera y prioridad del paciente.

3. **Bandeja de excepciones operativas**  
   Vista unica de "incidencias": administraciones omitidas, solicitudes urgentes sin atender, camas sin responsable.

4. **Exportes operativos listos para auditoria**  
   Exportar PDF/Excel por turno, paciente y farmacia con firmas/metadata de quien registro cada accion.

5. **Bitacora de restauraciones y backups**  
   Registrar pruebas de restore periodicas, checksum del backup y tiempo estimado de recuperacion (RTO/RPO).

## C. Mejoras de UX/flujo funcional

1. **Wizard de ingreso rapido para enfermeria**  
   Flujo guiado: inicio de turno -> revisar pacientes -> ejecutar tareas prioritarias -> cerrar turno.

2. **Atajos de teclado y acciones en lote**  
   Marcar varias tareas como completadas (con validacion) y mejorar velocidad en piso clinico.

3. **Modo degradado offline parcial**  
   Cola local para capturar eventos criticos y sincronizar cuando vuelva la red (especialmente administraciones).

## D. Roadmap sugerido (corto)

- **Fase 1 (1-2 semanas):** idempotencia + auditoria + alertas de stock/tareas.
- **Fase 2 (2-4 semanas):** cache dashboards + control de concurrencia + bandeja de excepciones.
- **Fase 3 (4-6 semanas):** scheduler inteligente + exportes auditables + modo offline parcial.

