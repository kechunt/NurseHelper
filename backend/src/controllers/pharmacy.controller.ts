import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { MedicationRequest, RequestStatus, RequestPriority } from '../entities/MedicationRequest';
import { DeliveryHistory } from '../entities/DeliveryHistory';
import { Medication, MedicationStatus } from '../entities/Medication';
import {
  MedicationInventoryMovement,
  InventoryMovementType,
} from '../entities/MedicationInventoryMovement';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Area } from '../entities/Area';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  classifyMedicationExpiry,
  daysToExpiry,
  EXPIRING_SOON_DAYS,
} from '../utils/inventory-expiry';
import { Between } from 'typeorm';

/** Stock + caducidad (columna `expiryDate`). Lotes futuros: tabla aparte por entrada. */
function applyMedicationStockAndStatus(medication: Medication, stock: number): void {
  medication.stock = stock;
  if (classifyMedicationExpiry(medication.expiryDate) === 'expired') {
    medication.status = MedicationStatus.EXPIRED;
    return;
  }
  if (stock === 0) {
    medication.status = MedicationStatus.OUT_OF_STOCK;
  } else if (stock < medication.minStock) {
    medication.status = MedicationStatus.LOW_STOCK;
  } else {
    medication.status = MedicationStatus.AVAILABLE;
  }
}

function serializeInventoryMedication(m: Medication) {
  const expiryClassification = classifyMedicationExpiry(m.expiryDate);
  const stock = m.stock;
  let status: MedicationStatus;
  if (expiryClassification === 'expired') {
    status = MedicationStatus.EXPIRED;
  } else if (stock === 0) {
    status = MedicationStatus.OUT_OF_STOCK;
  } else if (stock < m.minStock) {
    status = MedicationStatus.LOW_STOCK;
  } else {
    status = MedicationStatus.AVAILABLE;
  }
  return {
    id: m.id,
    name: m.name,
    dosage: m.dosage,
    description: m.description,
    stock: m.stock,
    minStock: m.minStock,
    location: m.location,
    expiryDate: m.expiryDate,
    status,
    isActive: m.isActive,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    expiryClassification,
    daysToExpiry: daysToExpiry(m.expiryDate),
    expiringSoonDays: EXPIRING_SOON_DAYS,
  };
}

function parsePagination(query: Request['query']) {
  const pageRaw = parseInt(String(query.page || ''), 10);
  const limitRaw = parseInt(String(query.limit || ''), 10);
  const paged = Number.isFinite(pageRaw) && Number.isFinite(limitRaw) && pageRaw > 0 && limitRaw > 0;
  const page = paged ? pageRaw : 1;
  const limit = paged ? Math.min(Math.max(limitRaw, 1), 200) : 0;
  return { paged, page, limit, skip: paged ? (page - 1) * limit : 0 };
}

export const getMedicationRequests = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const { paged, page, limit, skip } = parsePagination(req.query);
    
    const requestRepo = AppDataSource.getRepository(MedicationRequest);
    const bedRepo = AppDataSource.getRepository(Bed);
    const patientRepo = AppDataSource.getRepository(Patient);
    
    const query = requestRepo.createQueryBuilder('mr')
      .leftJoinAndSelect('mr.requestedBy', 'nurse')
      .leftJoinAndSelect('mr.medication', 'medication')
      .orderBy('mr.priority', 'DESC')
      .addOrderBy('mr.createdAt', 'ASC');

    if (status) {
      query.where('mr.status = :status', { status });
    }

    if (paged) {
      query.skip(skip).take(limit);
    }

    const [requests, total] = paged
      ? await query.getManyAndCount()
      : [await query.getMany(), 0];
    
    // Actualizar información de pacientes con datos actualizados de camas y áreas
    const updatedRequests = await Promise.all(requests.map(async (request) => {
      if (request.patientsInfo && Array.isArray(request.patientsInfo)) {
        const updatedPatientsInfo = await Promise.all(request.patientsInfo.map(async (patientInfo: any) => {
          // Buscar paciente por ID si está disponible
          if (patientInfo.patientId) {
            const patient = await patientRepo.findOne({
              where: { id: patientInfo.patientId },
              relations: ['bed', 'bed.area']
            });
            
            if (patient && patient.bed) {
              return {
                ...patientInfo,
                bedNumber: patient.bed.bedNumber,
                areaName: patient.bed.area?.name || 'Sin área',
                areaId: patient.bed.areaId
              };
            }
          }
          
          // Si no encontramos por ID, buscar por nombre y cama actualizada
          if (patientInfo.patientName) {
            // Buscar paciente por nombre completo
            const patients = await patientRepo.find({
              relations: ['bed', 'bed.area']
            });
            
            const patient = patients.find(p => 
              `${p.firstName} ${p.lastName}` === patientInfo.patientName
            );
            
            if (patient && patient.bed) {
              return {
                ...patientInfo,
                bedNumber: patient.bed.bedNumber,
                areaName: patient.bed.area?.name || 'Sin área',
                areaId: patient.bed.areaId,
                patientId: patient.id
              };
            }
          }
          
          return patientInfo;
        }));
        
        request.patientsInfo = updatedPatientsInfo;
      }
      
      return request;
    }));
    
    if (!paged) {
      res.json(updatedRequests);
      return;
    }

    /** Totales reales en BD (no solo la página actual) — para KPI del panel de farmacia */
    const pipelineStatuses = [
      RequestStatus.PENDING,
      RequestStatus.IN_PREPARATION,
      RequestStatus.READY,
    ] as const;
    const summaryRaw = await requestRepo
      .createQueryBuilder('mr')
      .select('mr.status', 'status')
      .addSelect('COUNT(mr.id)', 'cnt')
      .where('mr.status IN (:...sts)', { sts: [...pipelineStatuses] })
      .groupBy('mr.status')
      .getRawMany();
    const openByStatus: Record<string, number> = {
      pending: 0,
      in_preparation: 0,
      ready: 0,
    };
    for (const row of summaryRaw) {
      const st = String(row.status);
      if (st in openByStatus) {
        openByStatus[st] = parseInt(String(row.cnt), 10) || 0;
      }
    }

    res.json({
      data: updatedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      openByStatus: {
        pending: openByStatus.pending,
        in_preparation: openByStatus.in_preparation,
        ready: openByStatus.ready,
      },
    });
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
};

export const updateRequestStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, rejectionReason } = req.body;

    const requestRepo = AppDataSource.getRepository(MedicationRequest);
    const request = await requestRepo.findOne({ where: { id: parseInt(id) } });

    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    // Validar transiciones de estado
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['in_preparation', 'cancelled'],
      'in_preparation': ['ready', 'cancelled'],
      'ready': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': [],
      'rejected': [] // Sinónimo de cancelled
    };

    const allowedStatuses = validTransitions[request.status] || [];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `No se puede cambiar el estado de "${request.status}" a "${status}". Transiciones válidas: ${allowedStatuses.join(', ')}` 
      });
    }

    // Si se rechaza, requerir razón
    if (status === 'cancelled' && !rejectionReason && !notes) {
      return res.status(400).json({ message: 'Se requiere una razón para rechazar la solicitud' });
    }

    request.status = status as RequestStatus;
    
    // Actualizar notas con razón de rechazo si aplica
    if (status === 'cancelled' && rejectionReason) {
      request.notes = request.notes 
        ? `${request.notes}\n\n[RECHAZADO] Razón: ${rejectionReason}`
        : `[RECHAZADO] Razón: ${rejectionReason}`;
    } else if (notes) {
      request.notes = request.notes ? `${request.notes}\n${notes}` : notes;
    }

    await requestRepo.save(request);
    res.json({ message: 'Estado actualizado', request });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
};

export const deliverMedication = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    const authReq = req as AuthRequest;
    const pharmacistId = authReq.user?.id;

    if (!pharmacistId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const requestRepo = AppDataSource.getRepository(MedicationRequest);
    const deliveryRepo = AppDataSource.getRepository(DeliveryHistory);
    const medicationRepo = AppDataSource.getRepository(Medication);

    const request = await requestRepo.findOne({
      where: { id: parseInt(requestId) },
      relations: ['medication', 'requestedBy']
    });

    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (request.status !== RequestStatus.READY) {
      return res.status(400).json({ message: 'La solicitud debe estar en estado "Lista" para ser entregada' });
    }

    const deliveryCount = await deliveryRepo.count();
    const deliveryId = `DEL-${new Date().getFullYear()}-${String(deliveryCount + 1).padStart(3, '0')}`;

    const delivery = new DeliveryHistory();
    delivery.deliveryId = deliveryId;
    delivery.requestId = request.id;
    delivery.medicationId = request.medicationId;
    delivery.dosage = request.dosage;
    delivery.quantity = request.quantity;
    delivery.requestedById = request.requestedById;
    delivery.deliveredById = pharmacistId;
    delivery.patients = request.patientsInfo.map((p: any) => p.patientName);
    delivery.notes = notes || 'Sin observaciones';

    await deliveryRepo.save(delivery);

    request.status = RequestStatus.DELIVERED;
    await requestRepo.save(request);

    const medication = await medicationRepo.findOne({ where: { id: request.medicationId } });
    if (medication) {
      const stockBefore = medication.stock;
      const newStock = Math.max(0, medication.stock - request.quantity);
      applyMedicationStockAndStatus(medication, newStock);
      await medicationRepo.save(medication);

      const movementRepo = AppDataSource.getRepository(MedicationInventoryMovement);
      const movement = movementRepo.create({
        medicationId: medication.id,
        movementType: InventoryMovementType.DELIVERY,
        quantityDelta: -request.quantity,
        stockBefore,
        stockAfter: medication.stock,
        reason: notes?.trim() || `Entrega solicitud ${request.requestId}`,
        performedById: pharmacistId,
        medicationRequestId: request.id,
      });
      await movementRepo.save(movement);
    }

    res.json({ 
      message: 'Entrega registrada exitosamente',
      deliveryId,
      delivery
    });
  } catch (error) {
    console.error('Error al registrar entrega:', error);
    res.status(500).json({ message: 'Error al registrar entrega' });
  }
};

export const getDeliveryHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, includeCancelled } = req.query;
    const { paged, page, limit, skip } = parsePagination(req.query);
    
    const deliveryRepo = AppDataSource.getRepository(DeliveryHistory);
    const requestRepo = AppDataSource.getRepository(MedicationRequest);
    
    // Obtener entregas
    const deliveryQuery = deliveryRepo.createQueryBuilder('dh')
      .leftJoinAndSelect('dh.medication', 'medication')
      .leftJoinAndSelect('dh.requestedBy', 'nurse')
      .leftJoinAndSelect('dh.deliveredBy', 'pharmacist')
      .orderBy('dh.deliveredAt', 'DESC');

    if (startDate && endDate) {
      deliveryQuery.where('dh.deliveredAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    if (paged) {
      deliveryQuery.skip(skip).take(limit);
    } else {
      deliveryQuery.limit(100);
    }
    const [deliveries, deliveriesTotal] = paged
      ? await deliveryQuery.getManyAndCount()
      : [await deliveryQuery.getMany(), 0];
    
    // Obtener solicitudes rechazadas si se solicita
    let cancelledRequests: MedicationRequest[] = [];
    if (includeCancelled === 'true') {
      const cancelledQuery = requestRepo.createQueryBuilder('mr')
        .leftJoinAndSelect('mr.requestedBy', 'nurse')
        .leftJoinAndSelect('mr.medication', 'medication')
        .where('mr.status = :status', { status: RequestStatus.CANCELLED })
        .orderBy('mr.updatedAt', 'DESC');
      
      if (startDate && endDate) {
        cancelledQuery.andWhere('mr.updatedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
      }
      
      if (paged) {
        cancelledQuery.skip(skip).take(limit);
      } else {
        cancelledQuery.limit(100);
      }
      cancelledRequests = await cancelledQuery.getMany();
    }
    
    // Formatear respuesta con entregas y rechazos
    const history = {
      deliveries: deliveries.map(d => ({
        ...d,
        type: 'delivery'
      })),
      cancelled: cancelledRequests.map(r => ({
        id: r.id,
        requestId: r.requestId,
        medication: r.medication,
        dosage: r.dosage,
        quantity: r.quantity,
        requestedBy: r.requestedBy,
        cancelledAt: r.updatedAt,
        notes: r.notes,
        patientsInfo: r.patientsInfo,
        type: 'cancelled'
      }))
    };
    
    if (!paged) {
      res.json(history);
      return;
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    const deliveredTodayCount = await deliveryRepo.count({
      where: { deliveredAt: Between(dayStart, dayEnd) },
    });

    res.json({
      ...history,
      pagination: {
        page,
        limit,
        total: deliveriesTotal,
        totalPages: Math.max(1, Math.ceil(deliveriesTotal / limit)),
      },
      summary: {
        deliveredTodayCount,
      },
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
};

export const getInventory = async (req: Request, res: Response) => {
  try {
    const { paged, page, limit, skip } = parsePagination(req.query);
    const medicationRepo = AppDataSource.getRepository(Medication);
    if (!paged) {
      const medications = await medicationRepo.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
      res.json(medications.map(serializeInventoryMedication));
      return;
    }

    const [medications, total] = await medicationRepo.findAndCount({
      where: { isActive: true },
      order: { name: 'ASC' },
      skip,
      take: limit,
    });
    res.json({
      data: medications.map(serializeInventoryMedication),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({ message: 'Error al obtener inventario' });
  }
};

export const updateMedicationStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({ message: 'Stock inválido' });
    }

    const medicationRepo = AppDataSource.getRepository(Medication);
    const medication = await medicationRepo.findOne({ where: { id: parseInt(id) } });

    if (!medication) {
      return res.status(404).json({ message: 'Medicamento no encontrado' });
    }

    applyMedicationStockAndStatus(medication, stock);

    await medicationRepo.save(medication);
    res.json({ message: 'Stock actualizado', medication });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ message: 'Error al actualizar stock' });
  }
};

export const postInventoryMovement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, quantity, reason, expiryDate: expiryDateInput } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id ?? null;

    if (!['entry', 'exit', 'adjustment'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de movimiento inválido' });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ message: 'Cantidad inválida' });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const medicationRepo = queryRunner.manager.getRepository(Medication);
      const medication = await medicationRepo.findOne({ where: { id: parseInt(id) } });

      if (!medication) {
        await queryRunner.rollbackTransaction();
        return res.status(404).json({ message: 'Medicamento no encontrado' });
      }

      const stockBefore = medication.stock;
      let stockAfter = stockBefore;
      let quantityDelta = 0;
      let movementType: InventoryMovementType;

      if (type === 'entry') {
        movementType = InventoryMovementType.ENTRY;
        stockAfter = stockBefore + qty;
        quantityDelta = qty;
      } else if (type === 'exit') {
        movementType = InventoryMovementType.EXIT;
        stockAfter = stockBefore - qty;
        quantityDelta = -qty;
        if (stockAfter < 0) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ message: 'Stock insuficiente para esta salida' });
        }
      } else {
        movementType = InventoryMovementType.ADJUSTMENT;
        stockAfter = qty;
        quantityDelta = stockAfter - stockBefore;
      }

      let entryExpiryApplied = false;
      if (type === 'entry' && expiryDateInput) {
        const raw = String(expiryDateInput).slice(0, 10);
        const parsed = new Date(`${raw}T12:00:00.000Z`);
        if (!Number.isNaN(parsed.getTime())) {
          medication.expiryDate = parsed;
          entryExpiryApplied = true;
        }
      }

      applyMedicationStockAndStatus(medication, stockAfter);
      await medicationRepo.save(medication);

      let reasonText = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
      if (entryExpiryApplied) {
        const ymd = String(expiryDateInput).slice(0, 10);
        reasonText = reasonText
          ? `${reasonText} · Caducidad referida: ${ymd}`
          : `Caducidad referida (entrada): ${ymd}`;
      }

      const movementRepo = queryRunner.manager.getRepository(MedicationInventoryMovement);
      const movement = movementRepo.create({
        medicationId: medication.id,
        movementType,
        quantityDelta,
        stockBefore,
        stockAfter,
        reason: reasonText,
        performedById: userId,
        medicationRequestId: null,
      });
      await movementRepo.save(movement);

      await queryRunner.commitTransaction();
      res.json({ message: 'Movimiento registrado', medication, movement });
    } catch (inner) {
      await queryRunner.rollbackTransaction();
      throw inner;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error al registrar movimiento de inventario:', error);
    res.status(500).json({ message: 'Error al registrar movimiento de inventario' });
  }
};

export const getInventoryMovements = async (req: Request, res: Response) => {
  try {
    const medicationId = parseInt(String(req.query.medicationId || ''), 10);
    const { paged, page, limit, skip } = parsePagination(req.query);
    const fallbackLimitRaw = parseInt(String(req.query.limit || '100'), 10);
    const fallbackLimit = Number.isFinite(fallbackLimitRaw)
      ? Math.min(Math.max(fallbackLimitRaw, 1), 500)
      : 100;

    if (!medicationId || medicationId < 1) {
      return res.status(400).json({ message: 'medicationId es requerido' });
    }

    const movementRepo = AppDataSource.getRepository(MedicationInventoryMovement);
    const qb = movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.performedBy', 'performedBy')
      .where('m.medicationId = :medicationId', { medicationId })
      .orderBy('m.createdAt', 'DESC');
    if (paged) {
      qb.skip(skip).take(limit);
    } else {
      qb.take(fallbackLimit);
    }
    const [rows, total] = paged ? await qb.getManyAndCount() : [await qb.getMany(), 0];

    const payload = rows.map((m) => ({
      id: m.id,
      medicationId: m.medicationId,
      movementType: m.movementType,
      quantityDelta: m.quantityDelta,
      stockBefore: m.stockBefore,
      stockAfter: m.stockAfter,
      reason: m.reason,
      createdAt: m.createdAt,
      performedByName: m.performedBy
        ? `${m.performedBy.firstName} ${m.performedBy.lastName}`.trim()
        : null,
      medicationRequestId: m.medicationRequestId,
    }));

    if (!paged) {
      res.json(payload);
      return;
    }

    res.json({
      data: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error al obtener movimientos de inventario:', error);
    res.status(500).json({ message: 'Error al obtener movimientos de inventario' });
  }
};

export const createMedication = async (req: Request, res: Response) => {
  try {
    const { name, dosage, description, stock, minStock, location, expiryDate } = req.body;

    if (!name || !dosage) {
      return res.status(400).json({ message: 'Nombre y dosis son requeridos' });
    }

    const medicationRepo = AppDataSource.getRepository(Medication);
    
    // Verificar si ya existe un medicamento con el mismo nombre y dosis
    const existing = await medicationRepo.findOne({
      where: { name, dosage, isActive: true }
    });

    if (existing) {
      return res.status(400).json({ message: 'Ya existe un medicamento con ese nombre y dosis' });
    }

    const medication = new Medication();
    medication.name = name;
    medication.dosage = dosage;
    medication.description = description || '';
    medication.stock = stock || 0;
    medication.minStock = minStock || 50;
    medication.location = location || '';
    medication.isActive = true;

    if (expiryDate) {
      const raw = String(expiryDate).slice(0, 10);
      const parsed = new Date(`${raw}T12:00:00.000Z`);
      if (!Number.isNaN(parsed.getTime())) {
        medication.expiryDate = parsed;
      }
    }

    applyMedicationStockAndStatus(medication, medication.stock);

    await medicationRepo.save(medication);
    res.json({ message: 'Medicamento creado exitosamente', medication });
  } catch (error) {
    console.error('Error al crear medicamento:', error);
    res.status(500).json({ message: 'Error al crear medicamento' });
  }
};

export const deleteMedication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const medicationRepo = AppDataSource.getRepository(Medication);
    const medication = await medicationRepo.findOne({ where: { id: parseInt(id) } });

    if (!medication) {
      return res.status(404).json({ message: 'Medicamento no encontrado' });
    }

    // En lugar de eliminar físicamente, marcamos como inactivo
    medication.isActive = false;
    await medicationRepo.save(medication);

    res.json({ message: 'Medicamento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar medicamento:', error);
    res.status(500).json({ message: 'Error al eliminar medicamento' });
  }
};

export const createMedicationRequest = async (req: Request, res: Response) => {
  try {
    console.log('📥 Solicitud recibida para crear medicamento:', {
      body: req.body,
      headers: req.headers.authorization ? 'Token presente' : 'Sin token'
    });

    const {
      medicationName,
      dosage,
      quantity,
      patientsInfo,
      priority,
      notes
    } = req.body;

    const authReq = req as AuthRequest;
    const nurseId = authReq.user?.id;

    console.log('👤 Usuario autenticado:', {
      nurseId: nurseId,
      user: authReq.user ? `${authReq.user.firstName} ${authReq.user.lastName}` : 'No encontrado'
    });

    if (!nurseId) {
      console.error('❌ Error: Usuario no autenticado');
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!medicationName || !dosage || !quantity) {
      console.error('❌ Error: Datos faltantes', {
        medicationName: !!medicationName,
        dosage: !!dosage,
        quantity: !!quantity
      });
      return res.status(400).json({ 
        message: 'Nombre del medicamento, dosis y cantidad son requeridos',
        received: {
          medicationName: medicationName || 'faltante',
          dosage: dosage || 'faltante',
          quantity: quantity || 'faltante'
        }
      });
    }

    console.log('🔍 Buscando medicamento en BD:', { medicationName, dosage });
    const medicationRepo = AppDataSource.getRepository(Medication);
    let medication = await medicationRepo.findOne({
      where: { name: medicationName, dosage: dosage, isActive: true }
    });

    // Si el medicamento no existe, crearlo automáticamente
    if (!medication) {
      console.log('➕ Creando nuevo medicamento en BD...');
      medication = new Medication();
      medication.name = medicationName;
      medication.dosage = dosage;
      medication.stock = 0;
      medication.minStock = 50;
      medication.status = MedicationStatus.OUT_OF_STOCK;
      medication.isActive = true;
      medication.description = `Medicamento solicitado desde enfermería`;
      
      medication = await medicationRepo.save(medication);
      console.log(`✅ Medicamento creado automáticamente: ID=${medication.id}, ${medicationName} ${dosage}`);
    } else {
      console.log(`✅ Medicamento encontrado: ID=${medication.id}`);
    }

    console.log('📝 Creando solicitud de medicamento...');
    const requestRepo = AppDataSource.getRepository(MedicationRequest);
    const requestCount = await requestRepo.count();
    const requestId = `REQ-${new Date().getFullYear()}-${String(requestCount + 1).padStart(3, '0')}`;

    const request = new MedicationRequest();
    request.requestId = requestId;
    request.requestedById = nurseId;
    request.medicationId = medication.id;
    request.dosage = dosage;
    request.quantity = quantity;
    request.patientsInfo = patientsInfo || [];
    request.status = RequestStatus.PENDING;
    request.priority = priority || RequestPriority.NORMAL;
    request.notes = notes || '';

    console.log('💾 Guardando solicitud en BD...', {
      requestId,
      medicationId: medication.id,
      quantity,
      patientsCount: patientsInfo?.length || 0
    });

    const savedRequest = await requestRepo.save(request);
    console.log(`✅ Solicitud guardada en BD con ID: ${savedRequest.id}`);

    // Cargar la solicitud con todas las relaciones para devolverla completa
    const requestWithRelations = await requestRepo.findOne({
      where: { id: savedRequest.id },
      relations: ['medication', 'requestedBy']
    });

    if (!requestWithRelations) {
      console.error('❌ Error: No se pudo cargar la solicitud con relaciones');
      return res.status(500).json({ message: 'Error al cargar la solicitud creada' });
    }

    console.log(`✅ Solicitud de medicamento creada exitosamente: ${requestId} - ${medicationName} ${dosage} - Cantidad: ${quantity}`);

    res.status(201).json({
      message: 'Solicitud creada exitosamente',
      requestId,
      request: requestWithRelations
    });
  } catch (error: any) {
    console.error('❌ Error al crear solicitud:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Error al crear solicitud',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
    });
  }
};

