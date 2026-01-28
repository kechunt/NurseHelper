import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { MedicationRequest, RequestStatus, RequestPriority } from '../entities/MedicationRequest';
import { DeliveryHistory } from '../entities/DeliveryHistory';
import { Medication, MedicationStatus } from '../entities/Medication';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Area } from '../entities/Area';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMedicationRequests = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
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

    const requests = await query.getMany();
    
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
    
    res.json(updatedRequests);
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
      medication.stock = Math.max(0, medication.stock - request.quantity);
      if (medication.stock === 0) {
        medication.status = MedicationStatus.OUT_OF_STOCK;
      } else if (medication.stock < medication.minStock) {
        medication.status = MedicationStatus.LOW_STOCK;
      }
      await medicationRepo.save(medication);
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

    const deliveries = await deliveryQuery.limit(100).getMany();
    
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
      
      cancelledRequests = await cancelledQuery.limit(100).getMany();
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
    
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
};

export const getInventory = async (req: Request, res: Response) => {
  try {
    const medicationRepo = AppDataSource.getRepository(Medication);
    const medications = await medicationRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });
    res.json(medications);
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

    medication.stock = stock;

    if (stock === 0) {
      medication.status = MedicationStatus.OUT_OF_STOCK;
    } else if (stock < medication.minStock) {
      medication.status = MedicationStatus.LOW_STOCK;
    } else {
      medication.status = MedicationStatus.AVAILABLE;
    }

    await medicationRepo.save(medication);
    res.json({ message: 'Stock actualizado', medication });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ message: 'Error al actualizar stock' });
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
      medication.expiryDate = new Date(expiryDate);
    }

    // Determinar estado inicial
    if (medication.stock === 0) {
      medication.status = MedicationStatus.OUT_OF_STOCK;
    } else if (medication.stock < medication.minStock) {
      medication.status = MedicationStatus.LOW_STOCK;
    } else {
      medication.status = MedicationStatus.AVAILABLE;
    }

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

