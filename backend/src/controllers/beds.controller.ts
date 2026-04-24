import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { sendErrorResponse, handleControllerError, parseId } from '../utils/response.helper';
import { logger } from '../utils/logger';

export class BedsController {
  private normalizeBedForClient(bed: any): any {
    const activePatients = Array.isArray(bed?.patients)
      ? bed.patients.filter((p: any) => p?.isActive !== false)
      : [];
    const firstPatient = activePatients.length > 0 ? activePatients[0] : null;

    return {
      ...bed,
      patientId: firstPatient?.id ?? null,
      patient: firstPatient
        ? {
            id: firstPatient.id,
            firstName: firstPatient.firstName,
            lastName: firstPatient.lastName,
            identificationNumber: firstPatient.identificationNumber ?? null,
          }
        : null,
      isOccupied: !!firstPatient,
    };
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const bedRepository = AppDataSource.getRepository(Bed);
      
      // Intentar cargar con relaciones primero
      let beds: Bed[];
      try {
        beds = await bedRepository.find({
          relations: ['area', 'patients'],
          order: { bedNumber: 'ASC' },
        });
      } catch (relationError: any) {
        // Si falla por la relación patients (bedId o assignedToId no existe), cargar sin esa relación
        const errorMessage = relationError?.message || relationError?.sqlMessage || '';
        if (relationError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no existe aún, cargando camas sin relación de pacientes');
          beds = await bedRepository.find({
            relations: ['area'],
            order: { bedNumber: 'ASC' },
          });
          
          // Intentar cargar pacientes manualmente solo si bedId existe
          // Por ahora, simplemente asignar array vacío ya que bedId no existe
          beds.forEach(bed => {
            bed.patients = [];
          });
        } else {
          throw relationError;
        }
      }

      res.json(beds.map((bed) => this.normalizeBedForClient(bed)));
    } catch (error) {
      handleControllerError(error, req, res, 'Error al obtener camas');
    }
  }

  async getByArea(req: Request, res: Response): Promise<void> {
    try {
      const areaId = parseId(req.params.areaId);
      if (!areaId) {
        sendErrorResponse(res, 400, 'ID de área inválido', 'INVALID_ID');
        return;
      }

      const bedRepository = AppDataSource.getRepository(Bed);
      let beds: Bed[];
      
      try {
        beds = await bedRepository.find({
          where: { areaId },
          relations: ['patients', 'area'],
          order: { bedNumber: 'ASC' },
        });
      } catch (relationError: any) {
        // Si falla por la relación patients (bedId o assignedToId no existe), cargar sin esa relación
        const errorMessage = relationError?.message || relationError?.sqlMessage || '';
        if (relationError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          console.warn('⚠️ Columna bedId o assignedToId no existe aún, cargando camas sin relación de pacientes');
          beds = await bedRepository.find({
            where: { areaId },
            relations: ['area'],
            order: { bedNumber: 'ASC' },
          });
          
          // Por ahora, asignar array vacío ya que bedId no existe
          beds.forEach(bed => {
            bed.patients = [];
          });
        } else {
          throw relationError;
        }
      }

      res.json(beds.map((bed) => this.normalizeBedForClient(bed)));
    } catch (error) {
      handleControllerError(error, req, res, 'Error al obtener camas por área');
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { bedNumber, areaId, notes } = req.body;

      if (!bedNumber || !areaId) {
        sendErrorResponse(res, 400, 'El número de cama y el área son requeridos', 'VALIDATION_ERROR');
        return;
      }

      const areaIdNum = parseId(String(areaId));
      if (!areaIdNum) {
        sendErrorResponse(res, 400, 'ID de área inválido', 'INVALID_ID');
        return;
      }

      const bedRepository = AppDataSource.getRepository(Bed);
      
      // Verificar si ya existe una cama con ese número en el área
      const existing = await bedRepository.findOne({
        where: { bedNumber, areaId: areaIdNum },
      });

      if (existing) {
        sendErrorResponse(res, 400, 'Ya existe una cama con ese número en esta área', 'DUPLICATE_BED');
        return;
      }

      const bed = new Bed();
      bed.bedNumber = bedNumber;
      bed.areaId = areaIdNum;
      bed.notes = notes || '';
      bed.isActive = true;

      await bedRepository.save(bed);

      let savedBed: Bed | null;
      try {
        savedBed = await bedRepository.findOne({
          where: { id: bed.id },
          relations: ['area', 'patients'],
        });
      } catch (relationError: any) {
        // Si falla por la relación patients (bedId o assignedToId no existe), cargar sin esa relación
        const errorMessage = relationError?.message || relationError?.sqlMessage || '';
        if (relationError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          savedBed = await bedRepository.findOne({
            where: { id: bed.id },
            relations: ['area'],
          });
          if (savedBed) {
            savedBed.patients = [];
          }
        } else {
          throw relationError;
        }
      }

      res.status(201).json({ message: 'Cama creada exitosamente', bed: savedBed });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al crear cama');
    }
  }

  async assignPatient(req: Request, res: Response): Promise<void> {
    try {
      const bedId = parseId(req.params.id);
      if (!bedId) {
        sendErrorResponse(res, 400, 'ID de cama inválido', 'INVALID_ID');
        return;
      }

      const { patientId } = req.body;
      const bedRepository = AppDataSource.getRepository(Bed);
      const patientRepository = AppDataSource.getRepository(Patient);

      let bed: Bed | null;
      try {
        bed = await bedRepository.findOne({
          where: { id: bedId },
          relations: ['patients', 'area'],
        });
      } catch (relationError: any) {
        // Si falla por la relación patients (bedId o assignedToId no existe), cargar sin esa relación
        const errorMessage = relationError?.message || relationError?.sqlMessage || '';
        if (relationError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          bed = await bedRepository.findOne({
            where: { id: bedId },
            relations: ['area'],
          });
          if (bed) {
            bed.patients = [];
          }
        } else {
          throw relationError;
        }
      }

      if (!bed) {
        sendErrorResponse(res, 404, 'Cama no encontrada', 'BED_NOT_FOUND');
        return;
      }

      if (patientId === null || patientId === undefined) {
        // Liberar cama - encontrar pacientes en esta cama y desasignarlos
        // Intentar encontrar y desasignar pacientes
        try {
          const patientsInBed = await patientRepository.find({ 
            where: { bedId: bed.id as any, isActive: true } 
          });
          
          for (const patient of patientsInBed) {
            try {
              await patientRepository
                .createQueryBuilder()
                .update(Patient)
                .set({ bedId: null })
                .where('id = :id', { id: patient.id })
                .execute();
            } catch (saveError: any) {
              if (saveError?.code === 'ER_BAD_FIELD_ERROR' && saveError?.sqlMessage?.includes('bedId')) {
                // Si bedId no existe, simplemente continuar
                logger.warn('Columna bedId no existe, omitiendo desasignación', { patientId: patient.id });
              } else {
                throw saveError;
              }
            }
          }
        } catch (findError: any) {
          if (findError?.code === 'ER_BAD_FIELD_ERROR' && findError?.sqlMessage?.includes('bedId')) {
            // Si bedId no existe, simplemente continuar sin desasignar
            logger.warn('Columna bedId no existe, omitiendo búsqueda de pacientes', { bedId });
          } else {
            throw findError;
          }
        }
        
        // Actualizar estado de ocupación (si la columna existe)
        try {
          bed.isOccupied = false;
          await bedRepository.save(bed);
        } catch (error: any) {
          // Si la columna isOccupied no existe, ignorar el error
          if (error?.code !== 'ER_BAD_FIELD_ERROR' && !error?.message?.includes('isOccupied')) {
            throw error;
          }
          logger.warn('Columna isOccupied no existe, se omitirá la actualización', { bedId });
        }
        
        logger.info('Cama liberada', { bedId, bedNumber: bed.bedNumber });
      } 
      // Si se está asignando un paciente
      else if (patientId) {
        const patientIdNum = typeof patientId === 'number' ? patientId : parseId(String(patientId));
        if (!patientIdNum) {
          sendErrorResponse(res, 400, 'ID de paciente inválido', 'INVALID_ID');
          return;
        }

        const patient = await patientRepository.findOne({ where: { id: patientIdNum } });
        if (!patient) {
          sendErrorResponse(res, 404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
          return;
        }

        // Desasignar paciente de otra cama si tiene una asignada
        try {
          if (patient.bedId && patient.bedId !== bed.id) {
            const currentBed = await bedRepository.findOne({ where: { id: patient.bedId } });
            if (currentBed) {
              // Verificar si hay otros pacientes en esa cama
              try {
                const otherPatients = await patientRepository.count({ 
                  where: { bedId: currentBed.id as any, isActive: true } 
                });
                if (otherPatients <= 1) {
                  try {
                    currentBed.isOccupied = false;
                    await bedRepository.save(currentBed);
                  } catch (error: any) {
                    // Si la columna isOccupied no existe, ignorar el error
                    if (error?.code !== 'ER_BAD_FIELD_ERROR' && !error?.message?.includes('isOccupied')) {
                      throw error;
                    }
                  }
                }
              } catch (countError: any) {
                if (countError?.code === 'ER_BAD_FIELD_ERROR' && countError?.sqlMessage?.includes('bedId')) {
                  // Si bedId no existe, simplemente continuar
                  logger.warn('Columna bedId no existe, omitiendo verificación', { bedId: currentBed.id });
                } else {
                  throw countError;
                }
              }
            }
            logger.info('Cama anterior liberada', { 
              previousBedId: patient.bedId, 
              patientId 
            });
          }

          // Asignar el nuevo paciente a esta cama
          try {
            await patientRepository
              .createQueryBuilder()
              .update(Patient)
              .set({ bedId: bed.id, areaId: bed.areaId })
              .where('id = :id', { id: patient.id })
              .execute();
          } catch (saveError: any) {
            if (saveError?.code === 'ER_BAD_FIELD_ERROR' && saveError?.sqlMessage?.includes('bedId')) {
              logger.warn('Columna bedId no existe, omitiendo asignación', { bedId: bed.id, patientId });
            } else {
              throw saveError;
            }
          }
        } catch (bedIdError: any) {
          if (bedIdError?.code === 'ER_BAD_FIELD_ERROR' && bedIdError?.sqlMessage?.includes('bedId')) {
            logger.warn('Columna bedId no existe, omitiendo operación de asignación', { bedId, patientId });
          } else {
            throw bedIdError;
          }
        }
        
        // Actualizar estado de ocupación de la cama (si la columna existe)
        try {
          bed.isOccupied = true;
          await bedRepository.save(bed);
        } catch (error: any) {
          // Si la columna isOccupied no existe, ignorar el error
          if (error?.code !== 'ER_BAD_FIELD_ERROR' && !error?.message?.includes('isOccupied')) {
            throw error;
          }
          logger.warn('Columna isOccupied no existe, se omitirá la actualización', { bedId });
        }
        
        logger.info('Paciente asignado a cama', { 
          bedId: bed.id, 
          bedNumber: bed.bedNumber, 
          patientId: patientIdNum 
        });
      }

      // Forzar recarga desde BD sin caché
      let updatedBed: Bed | null;
      try {
        updatedBed = await bedRepository
          .createQueryBuilder('bed')
          .leftJoinAndSelect('bed.area', 'area')
          .leftJoinAndSelect('bed.patients', 'patients')
          .where('bed.id = :id', { id: bed.id })
          .getOne();
      } catch (queryError: any) {
        // Si falla por la relación patients (bedId o assignedToId no existe), cargar sin esa relación
        const errorMessage = queryError?.message || queryError?.sqlMessage || '';
        if (queryError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          updatedBed = await bedRepository
            .createQueryBuilder('bed')
            .leftJoinAndSelect('bed.area', 'area')
            .where('bed.id = :id', { id: bed.id })
            .getOne();
          if (updatedBed) {
            updatedBed.patients = [];
          }
        } else {
          throw queryError;
        }
      }

      const message = patientId === null || patientId === undefined
        ? `Cama ${bed.bedNumber} liberada exitosamente`
        : `Paciente asignado exitosamente`;

      res.json({ message, bed: updatedBed ? this.normalizeBedForClient(updatedBed) : null });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al asignar paciente a cama');
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const bedId = parseId(req.params.id);
      if (!bedId) {
        sendErrorResponse(res, 400, 'ID de cama inválido', 'INVALID_ID');
        return;
      }

      const { bedNumber, notes, isActive, areaId, patientId } = req.body;
      const bedRepository = AppDataSource.getRepository(Bed);
      const patientRepository = AppDataSource.getRepository(Patient);
      const bed = await bedRepository.findOne({ where: { id: bedId } });

      if (!bed) {
        sendErrorResponse(res, 404, 'Cama no encontrada', 'BED_NOT_FOUND');
        return;
      }

      if (bedNumber) bed.bedNumber = bedNumber;
      if (notes !== undefined) bed.notes = notes;
      
      // Normalizar isActive a boolean explícito
      if (isActive !== undefined) {
        // Convertir a boolean explícito (manejar string "true"/"false", números, etc.)
        if (isActive === false || isActive === 0 || isActive === 'false' || isActive === '0') {
          bed.isActive = false;
        } else if (isActive === true || isActive === 1 || isActive === 'true' || isActive === '1') {
          bed.isActive = true;
        }
      }
      
      // Permitir cambiar el área de la cama solo para admin/supervisor
      if (areaId !== undefined && areaId !== null) {
        const newAreaId = parseId(String(areaId));
        if (newAreaId) {
          bed.areaId = newAreaId;
        }
      }

      // Manejar asignación/liberación de paciente si se proporciona patientId
      if (patientId !== undefined) {
        logger.info('🔄 Procesando asignación/liberación de paciente', { bedId, patientId });
        
        if (patientId === null || patientId === '') {
          // Liberar cama - encontrar pacientes en esta cama y desasignarlos
          logger.info('🔓 Liberando cama', { bedId });
          try {
            const patientsInBed = await patientRepository.find({ 
              where: { bedId: bed.id as any, isActive: true } 
            });
            
            logger.info(`👥 Pacientes encontrados en cama ${bedId}: ${patientsInBed.length}`);
            
            for (const patient of patientsInBed) {
              try {
                patient.bedId = null;
                await patientRepository.save(patient);
                logger.info('✅ Paciente desasignado de cama', { patientId: patient.id, bedId });
              } catch (saveError: any) {
                if (saveError?.code === 'ER_BAD_FIELD_ERROR' && saveError?.sqlMessage?.includes('bedId')) {
                  logger.warn('Columna bedId no existe, omitiendo desasignación', { patientId: patient.id });
                } else {
                  throw saveError;
                }
              }
            }
          } catch (findError: any) {
            if (findError?.code === 'ER_BAD_FIELD_ERROR' && findError?.sqlMessage?.includes('bedId')) {
              logger.warn('Columna bedId no existe, omitiendo búsqueda de pacientes', { bedId });
            } else {
              throw findError;
            }
          }
        } else {
          // Asignar paciente
          const patientIdNum = typeof patientId === 'number' ? patientId : parseId(String(patientId));
          if (!patientIdNum) {
            sendErrorResponse(res, 400, 'ID de paciente inválido', 'INVALID_ID');
            return;
          }

          logger.info('👤 Asignando paciente a cama', { bedId, patientId: patientIdNum });

          const patient = await patientRepository.findOne({ where: { id: patientIdNum } });
          if (!patient) {
            sendErrorResponse(res, 404, 'Paciente no encontrado', 'PATIENT_NOT_FOUND');
            return;
          }

          // Desasignar paciente de otra cama si tiene una asignada
          try {
            if (patient.bedId && patient.bedId !== bed.id) {
              logger.info('🔄 Paciente tiene otra cama asignada, desasignando', { 
                patientId: patientIdNum, 
                currentBedId: patient.bedId,
                newBedId: bed.id 
              });
              
              const currentBed = await bedRepository.findOne({ where: { id: patient.bedId } });
              if (currentBed) {
                try {
                  const otherPatients = await patientRepository.count({ 
                    where: { bedId: currentBed.id as any, isActive: true } 
                  });
                  if (otherPatients <= 1) {
                    try {
                      currentBed.isOccupied = false;
                      await bedRepository.save(currentBed);
                    } catch (error: any) {
                      if (error?.code !== 'ER_BAD_FIELD_ERROR' && !error?.message?.includes('isOccupied')) {
                        throw error;
                      }
                    }
                  }
                } catch (countError: any) {
                  if (countError?.code === 'ER_BAD_FIELD_ERROR' && countError?.sqlMessage?.includes('bedId')) {
                    logger.warn('Columna bedId no existe, omitiendo verificación', { bedId: currentBed.id });
                  } else {
                    throw countError;
                  }
                }
              }
            }

            // Asignar el nuevo paciente a esta cama - USAR QUERY BUILDER DIRECTAMENTE
            try {
              logger.info('💾 Guardando paciente en BD usando UPDATE directo', {
                patientId: patientIdNum,
                bedId: bed.id,
                bedNumber: bed.bedNumber
              });
              
              // Usar query builder para UPDATE directo en la BD
              const updateResult = await patientRepository
                .createQueryBuilder()
                .update(Patient)
                .set({ bedId: bed.id, areaId: bed.areaId })
                .where('id = :id', { id: patientIdNum })
                .execute();
              
              logger.info('✅ UPDATE ejecutado:', {
                affected: updateResult.affected,
                patientId: patientIdNum,
                bedId: bed.id
              });
              
              // Verificar inmediatamente después de guardar
              const verifyPatient = await patientRepository
                .createQueryBuilder('patient')
                .select(['patient.id', 'patient.bedId', 'patient.firstName', 'patient.lastName'])
                .where('patient.id = :id', { id: patientIdNum })
                .getRawOne();
              
              const savedBedId = verifyPatient?.patient_bedId;
              
              logger.info('🔍 Verificación después de guardar:', {
                patientId: patientIdNum,
                expectedBedId: bed.id,
                actualBedId: savedBedId,
                verifyResult: verifyPatient
              });
              
              if (savedBedId === bed.id) {
                logger.info('✅ VERIFICACIÓN EXITOSA: Paciente asignado correctamente en BD', {
                  patientId: patientIdNum,
                  bedId: savedBedId,
                  patientName: `${verifyPatient?.patient_firstName || ''} ${verifyPatient?.patient_lastName || ''}`
                });
              } else {
                logger.error('❌ ERROR DE VERIFICACIÓN: El paciente NO se guardó correctamente', {
                  expectedBedId: bed.id,
                  actualBedId: savedBedId,
                  patientId: patientIdNum
                });
                // Lanzar error para que se maneje arriba
                throw new Error(`Error: El paciente no se guardó correctamente. Esperado bedId: ${bed.id}, Obtenido: ${savedBedId}`);
              }
            } catch (saveError: any) {
              if (saveError?.code === 'ER_BAD_FIELD_ERROR' && saveError?.sqlMessage?.includes('bedId')) {
                logger.warn('Columna bedId no existe, omitiendo asignación', { bedId: bed.id, patientId });
              } else {
                logger.error('❌ Error guardando asignación de paciente:', saveError);
                throw saveError;
              }
            }
          } catch (bedIdError: any) {
            if (bedIdError?.code === 'ER_BAD_FIELD_ERROR' && bedIdError?.sqlMessage?.includes('bedId')) {
              logger.warn('Columna bedId no existe, omitiendo operación de asignación', { bedId, patientId });
            } else {
              logger.error('❌ Error en operación de asignación:', bedIdError);
              throw bedIdError;
            }
          }
        }
      }

      await bedRepository.save(bed);

      // Recargar cama actualizada con paciente activo relacionado
      let updatedBed: Bed | null;
      try {
        updatedBed = await bedRepository.findOne({
          where: { id: bed.id },
          relations: ['area', 'patients'],
        });
      } catch (relationError: any) {
        updatedBed = await bedRepository.findOne({
          where: { id: bed.id },
          relations: ['area'],
        });
        if (updatedBed) {
          (updatedBed as any).patients = [];
        }
      }

      res.json({
        message: 'Cama actualizada exitosamente',
        bed: updatedBed ? this.normalizeBedForClient(updatedBed) : null,
      });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al actualizar cama');
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const bedId = parseId(req.params.id);
      if (!bedId) {
        sendErrorResponse(res, 400, 'ID de cama inválido', 'INVALID_ID');
        return;
      }

      const bedRepository = AppDataSource.getRepository(Bed);
      const patientRepository = AppDataSource.getRepository(Patient);
      let bed: Bed | null;
      try {
        bed = await bedRepository.findOne({
          where: { id: bedId },
          relations: ['patients'],
        });
      } catch (relationError: any) {
        // Si falla por la relación patients (bedId o assignedToId no existe), cargar sin esa relación
        const errorMessage = relationError?.message || relationError?.sqlMessage || '';
        if (relationError?.code === 'ER_BAD_FIELD_ERROR' && 
            (errorMessage.includes('bedId') || errorMessage.includes('bed') || 
             errorMessage.includes('assignedToId') || errorMessage.includes('assignedTo') ||
             errorMessage.includes('Patient'))) {
          bed = await bedRepository.findOne({
            where: { id: bedId },
          });
        } else {
          throw relationError;
        }
      }

      if (!bed) {
        sendErrorResponse(res, 404, 'Cama no encontrada', 'BED_NOT_FOUND');
        return;
      }

      // Verificar si hay pacientes activos asignados a esta cama
      try {
        const patientsInBed = await patientRepository.count({ 
          where: { bedId: bed.id as any, isActive: true } 
        });
        
        if (patientsInBed > 0) {
          sendErrorResponse(res, 400, 'No se puede eliminar una cama que tiene pacientes asignados', 'BED_IN_USE');
          return;
        }
      } catch (countError: any) {
        // Si bedId no existe, asumir que no hay pacientes asignados
        if (countError?.code === 'ER_BAD_FIELD_ERROR' && countError?.sqlMessage?.includes('bedId')) {
          logger.warn('Columna bedId no existe, permitiendo eliminación de cama', { bedId });
        } else {
          throw countError;
        }
      }

      await bedRepository.remove(bed);

      res.json({ message: 'Cama eliminada exitosamente' });
    } catch (error) {
      handleControllerError(error, req, res, 'Error al eliminar cama');
    }
  }
}

