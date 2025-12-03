import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { MedicationRequest, RequestStatus, RequestPriority } from '../entities/MedicationRequest';
import { DeliveryHistory } from '../entities/DeliveryHistory';
import { Medication, MedicationStatus } from '../entities/Medication';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMedicationRequests = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const requestRepo = AppDataSource.getRepository(MedicationRequest);
    const query = requestRepo.createQueryBuilder('mr')
      .leftJoinAndSelect('mr.requestedBy', 'nurse')
      .leftJoinAndSelect('mr.medication', 'medication')
      .orderBy('mr.priority', 'DESC')
      .addOrderBy('mr.createdAt', 'ASC');

    if (status) {
      query.where('mr.status = :status', { status });
    }

    const requests = await query.getMany();
    res.json(requests);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
};

export const updateRequestStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const requestRepo = AppDataSource.getRepository(MedicationRequest);
    const request = await requestRepo.findOne({ where: { id: parseInt(id) } });

    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    request.status = status;
    if (notes) {
      request.notes = notes;
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
    const { startDate, endDate } = req.query;
    
    const deliveryRepo = AppDataSource.getRepository(DeliveryHistory);
    const query = deliveryRepo.createQueryBuilder('dh')
      .leftJoinAndSelect('dh.medication', 'medication')
      .leftJoinAndSelect('dh.requestedBy', 'nurse')
      .leftJoinAndSelect('dh.deliveredBy', 'pharmacist')
      .orderBy('dh.deliveredAt', 'DESC');

    if (startDate && endDate) {
      query.where('dh.deliveredAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const history = await query.limit(100).getMany();
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

