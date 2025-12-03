import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';

export class BedsController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const bedRepository = AppDataSource.getRepository(Bed);
      const beds = await bedRepository.find({
        relations: ['area', 'patient'],
        order: { bedNumber: 'ASC' },
      });

      res.json(beds);
    } catch (error) {
      console.error('Error al obtener camas:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async getByArea(req: Request, res: Response): Promise<void> {
    try {
      const { areaId } = req.params;
      const bedRepository = AppDataSource.getRepository(Bed);
      const beds = await bedRepository.find({
        where: { areaId: parseInt(areaId) },
        relations: ['patient'],
        order: { bedNumber: 'ASC' },
      });

      res.json(beds);
    } catch (error) {
      console.error('Error al obtener camas por área:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { bedNumber, areaId, notes } = req.body;

      if (!bedNumber || !areaId) {
        res.status(400).json({ message: 'El número de cama y el área son requeridos' });
        return;
      }

      const bedRepository = AppDataSource.getRepository(Bed);
      
      // Verificar si ya existe una cama con ese número en el área
      const existing = await bedRepository.findOne({
        where: { bedNumber, areaId: parseInt(areaId) },
      });

      if (existing) {
        res.status(400).json({ message: 'Ya existe una cama con ese número en esta área' });
        return;
      }

      const bed = new Bed();
      bed.bedNumber = bedNumber;
      bed.areaId = parseInt(areaId);
      bed.notes = notes || '';
      bed.isActive = true;

      await bedRepository.save(bed);

      const savedBed = await bedRepository.findOne({
        where: { id: bed.id },
        relations: ['area', 'patient'],
      });

      res.status(201).json({ message: 'Cama creada exitosamente', bed: savedBed });
    } catch (error) {
      console.error('Error al crear cama:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async assignPatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { patientId } = req.body;

      const bedRepository = AppDataSource.getRepository(Bed);
      const patientRepository = AppDataSource.getRepository(Patient);

      const bed = await bedRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['patient'],
      });

      if (!bed) {
        res.status(404).json({ message: 'Cama no encontrada' });
        return;
      }

      console.log(`🛏️ Procesando cama ${bed.bedNumber}:`, {
        pacienteActual: bed.patientId,
        pacienteNuevo: patientId
      });

      if (patientId === null || patientId === undefined) {
        await bedRepository.update(bed.id, { patientId: null });
      } 
      // Si se está asignando un paciente
      else if (patientId) {
        const patient = await patientRepository.findOne({ where: { id: patientId } });
        if (!patient) {
          res.status(404).json({ message: 'Paciente no encontrado' });
          return;
        }

        // Desasignar paciente de otra cama si tiene una asignada
        const currentBed = await bedRepository.findOne({
          where: { patientId: patient.id },
        });
        if (currentBed && currentBed.id !== bed.id) {
          console.log(`🔄 Liberando cama anterior ${currentBed.bedNumber} del paciente ${patient.id}`);
          await bedRepository.update(currentBed.id, { patientId: null });
        }

        // Liberar la cama actual si tiene otro paciente
        if (bed.patientId && bed.patientId !== patientId) {
          console.log(`🔄 Liberando cama ${bed.bedNumber} del paciente ${bed.patientId}`);
        }

        // Asignar el nuevo paciente
        await bedRepository.update(bed.id, { patientId: patient.id });
        console.log(`✅ Paciente ${patient.id} asignado a cama ${bed.bedNumber}`);
      }

      console.log(`💾 Cambios guardados en BD`);

      // Forzar recarga desde BD sin caché
      const updatedBed = await bedRepository
        .createQueryBuilder('bed')
        .leftJoinAndSelect('bed.area', 'area')
        .leftJoinAndSelect('bed.patient', 'patient')
        .where('bed.id = :id', { id: bed.id })
        .getOne();

      console.log(`📊 Cama después de recargar:`, {
        id: updatedBed?.id,
        bedNumber: updatedBed?.bedNumber,
        patientId: updatedBed?.patientId
      });

      const message = patientId === null || patientId === undefined
        ? `Cama ${bed.bedNumber} liberada exitosamente`
        : `Paciente asignado exitosamente`;

      res.json({ message, bed: updatedBed });
    } catch (error) {
      console.error('❌ Error al asignar paciente:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { bedNumber, notes, isActive } = req.body;

      const bedRepository = AppDataSource.getRepository(Bed);
      const bed = await bedRepository.findOne({ where: { id: parseInt(id) } });

      if (!bed) {
        res.status(404).json({ message: 'Cama no encontrada' });
        return;
      }

      if (bedNumber) bed.bedNumber = bedNumber;
      if (notes !== undefined) bed.notes = notes;
      if (isActive !== undefined) bed.isActive = isActive;

      await bedRepository.save(bed);

      const updatedBed = await bedRepository.findOne({
        where: { id: bed.id },
        relations: ['area', 'patient'],
      });

      res.json({ message: 'Cama actualizada exitosamente', bed: updatedBed });
    } catch (error) {
      console.error('Error al actualizar cama:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bedRepository = AppDataSource.getRepository(Bed);

      const bed = await bedRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['patient'],
      });

      if (!bed) {
        res.status(404).json({ message: 'Cama no encontrada' });
        return;
      }

      if (bed.patientId) {
        res.status(400).json({ message: 'No se puede eliminar una cama que tiene un paciente asignado' });
        return;
      }

      await bedRepository.remove(bed);

      res.json({ message: 'Cama eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar cama:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

