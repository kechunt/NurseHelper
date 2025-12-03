import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Bed } from '../entities/Bed';
import { Schedule } from '../entities/Schedule';

export class PatientsController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const patientRepository = AppDataSource.getRepository(Patient);
      const patients = await patientRepository.find({
        relations: ['bed', 'bed.area'],
        order: { lastName: 'ASC' },
      });

      res.json(patients);
    } catch (error) {
      console.error('Error al obtener pacientes:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const patientRepository = AppDataSource.getRepository(Patient);
      const patient = await patientRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['bed', 'bed.area', 'schedules'],
      });

      if (!patient) {
        res.status(404).json({ message: 'Paciente no encontrado' });
        return;
      }

      res.json(patient);
    } catch (error) {
      console.error('Error al obtener paciente:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async saveObservation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { observation } = req.body;

      if (!observation || observation.trim().length === 0) {
        res.status(400).json({ message: 'La observación no puede estar vacía' });
        return;
      }

      const patientRepository = AppDataSource.getRepository(Patient);
      const patient = await patientRepository.findOne({ where: { id: parseInt(id) } });

      if (!patient) {
        res.status(404).json({ message: 'Paciente no encontrado' });
        return;
      }

      // Agregar observación con timestamp
      const timestamp = new Date().toLocaleString('es-ES');
      const newObservation = `[${timestamp}] ${observation.trim()}`;
      
      patient.generalObservations = patient.generalObservations 
        ? `${patient.generalObservations}\n${newObservation}`
        : newObservation;

      await patientRepository.save(patient);

      res.json({ message: 'Observación guardada exitosamente', patient });
    } catch (error) {
      console.error('Error al guardar observación:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        firstName,
        lastName,
        identificationNumber,
        dateOfBirth,
        gender,
        phone,
        address,
        medicalHistory,
        allergies,
        emergencyContact,
        emergencyPhone,
        emergencyRelation,
        medicalObservations,
        specialNeeds,
        generalObservations,
        medications,
        treatmentHistory,
        pendingTasks,
      } = req.body;

      if (!firstName || !lastName) {
        res.status(400).json({ message: 'Nombre y apellido son requeridos' });
        return;
      }

      const patientRepository = AppDataSource.getRepository(Patient);
      const patient = new Patient();
      patient.firstName = firstName;
      patient.lastName = lastName;
      patient.identificationNumber = identificationNumber || null;
      patient.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : (null as any);
      patient.gender = gender || null;
      patient.phone = phone || null;
      patient.address = address || null;
      patient.medicalHistory = medicalHistory || null;
      patient.allergies = allergies || null;
      patient.emergencyContact = emergencyContact || null;
      patient.emergencyPhone = emergencyPhone || null;
      patient.emergencyRelation = emergencyRelation || null;
      patient.medicalObservations = medicalObservations || null;
      patient.specialNeeds = specialNeeds || null;
      patient.generalObservations = generalObservations || null;
      patient.medications = medications || null;
      patient.treatmentHistory = treatmentHistory || null;
      patient.pendingTasks = pendingTasks || null;
      patient.isActive = true;

      await patientRepository.save(patient);

      const savedPatient = await patientRepository.findOne({
        where: { id: patient.id },
        relations: ['bed', 'bed.area'],
      });

      res.status(201).json({ message: 'Paciente creado exitosamente', patient: savedPatient });
    } catch (error) {
      console.error('Error al crear paciente:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        identificationNumber,
        dateOfBirth,
        gender,
        phone,
        address,
        medicalHistory,
        allergies,
        emergencyContact,
        emergencyPhone,
        emergencyRelation,
        medicalObservations,
        specialNeeds,
        generalObservations,
        medications,
        treatmentHistory,
        pendingTasks,
        isActive,
      } = req.body;

      const patientRepository = AppDataSource.getRepository(Patient);
      const patient = await patientRepository.findOne({ where: { id: parseInt(id) } });

      if (!patient) {
        res.status(404).json({ message: 'Paciente no encontrado' });
        return;
      }

      if (firstName) patient.firstName = firstName;
      if (lastName) patient.lastName = lastName;
      if (identificationNumber !== undefined) patient.identificationNumber = identificationNumber;
      if (dateOfBirth) patient.dateOfBirth = new Date(dateOfBirth);
      if (gender !== undefined) patient.gender = gender;
      if (phone !== undefined) patient.phone = phone;
      if (address !== undefined) patient.address = address;
      if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;
      if (allergies !== undefined) patient.allergies = allergies;
      if (emergencyContact !== undefined) patient.emergencyContact = emergencyContact;
      if (emergencyPhone !== undefined) patient.emergencyPhone = emergencyPhone;
      if (emergencyRelation !== undefined) patient.emergencyRelation = emergencyRelation;
      if (medicalObservations !== undefined) patient.medicalObservations = medicalObservations;
      if (specialNeeds !== undefined) patient.specialNeeds = specialNeeds;
      if (generalObservations !== undefined) patient.generalObservations = generalObservations;
      if (medications !== undefined) patient.medications = medications;
      if (treatmentHistory !== undefined) patient.treatmentHistory = treatmentHistory;
      if (pendingTasks !== undefined) patient.pendingTasks = pendingTasks;
      if (isActive !== undefined) patient.isActive = isActive;

      await patientRepository.save(patient);

      const updatedPatient = await patientRepository.findOne({
        where: { id: patient.id },
        relations: ['bed', 'bed.area'],
      });

      res.json({ message: 'Paciente actualizado exitosamente', patient: updatedPatient });
    } catch (error) {
      console.error('Error al actualizar paciente:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const patientRepository = AppDataSource.getRepository(Patient);
      const bedRepository = AppDataSource.getRepository(Bed);
      const scheduleRepository = AppDataSource.getRepository(Schedule);

      const patient = await patientRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['bed'],
      });

      if (!patient) {
        res.status(404).json({ message: 'Paciente no encontrado' });
        return;
      }

      const bed = await bedRepository.findOne({ where: { patientId: parseInt(id) } });
      if (bed) {
        bed.patientId = null;
        await bedRepository.save(bed);
      }

      await scheduleRepository.delete({ patientId: parseInt(id) });
      await patientRepository.remove(patient);

      res.json({ message: 'Paciente eliminado permanentemente de la base de datos' });
    } catch (error) {
      console.error('Error al eliminar paciente:', error);
      res.status(500).json({ message: 'Error interno del servidor al eliminar el paciente' });
    }
  }
}

