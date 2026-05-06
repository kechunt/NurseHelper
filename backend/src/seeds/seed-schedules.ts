import 'reflect-metadata';
import { loadEnv } from '../utils/env';
import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Schedule, ScheduleType, ScheduleStatus } from '../entities/Schedule';
import { User } from '../entities/User';
import { logger } from '../utils/logger';

loadEnv();

// Medicamentos comunes
const medications = [
  { name: 'Paracetamol', dosage: '500mg', times: ['08:00', '14:00', '20:00'] },
  { name: 'Ibuprofeno', dosage: '400mg', times: ['09:00', '21:00'] },
  { name: 'Omeprazol', dosage: '20mg', times: ['08:00'] },
  { name: 'Metformina', dosage: '850mg', times: ['08:00', '20:00'] },
  { name: 'Enalapril', dosage: '10mg', times: ['08:00', '20:00'] },
  { name: 'Atorvastatina', dosage: '20mg', times: ['20:00'] },
  { name: 'Losartán', dosage: '50mg', times: ['08:00'] },
  { name: 'Furosemida', dosage: '40mg', times: ['08:00', '14:00'] },
  { name: 'Aspirina', dosage: '100mg', times: ['20:00'] },
  { name: 'Insulina', dosage: '10 UI', times: ['07:30', '12:30', '19:30'] }
];

// Cuidados/Tratamientos diarios
const dailyCares = [
  { description: 'Baño/Aseo personal', time: '07:00' },
  { description: 'Toma de signos vitales', time: '06:00' },
  { description: 'Toma de signos vitales', time: '14:00' },
  { description: 'Toma de signos vitales', time: '22:00' },
  { description: 'Cambio de sábanas', time: '09:00' },
  { description: 'Cambio de posición', time: '08:00' },
  { description: 'Cambio de posición', time: '12:00' },
  { description: 'Cambio de posición', time: '16:00' },
  { description: 'Cambio de posición', time: '20:00' },
  { description: 'Curación de heridas', time: '10:00' },
  { description: 'Control de glucosa', time: '07:00' },
  { description: 'Control de glucosa', time: '13:00' },
  { description: 'Control de glucosa', time: '19:00' },
  { description: 'Ejercicios de rehabilitación', time: '10:00' },
  { description: 'Ejercicios respiratorios', time: '11:00' },
  { description: 'Cambio de vendaje', time: '09:00' },
  { description: 'Revisión de sonda', time: '08:00' },
  { description: 'Alimentación asistida', time: '12:00' },
  { description: 'Alimentación asistida', time: '18:00' },
  { description: 'Revisión general', time: '15:00' }
];

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seedSchedules() {
  try {
    logger.info('🔄 Inicializando conexión a la base de datos...');
    await AppDataSource.initialize();
    logger.info('✅ Conexión establecida\n');

    const patientRepo = AppDataSource.getRepository(Patient);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const userRepo = AppDataSource.getRepository(User);

    const patients = await patientRepo.find({
      where: { isActive: true }
    });

    logger.info(`👥 Pacientes encontrados: ${patients.length}\n`);

    if (patients.length === 0) {
      logger.info('❌ No hay pacientes en la BD');
      return;
    }

    logger.info('🗑️ Limpiando horarios existentes...');
    await scheduleRepo.clear();
    logger.info('✅ Horarios limpiados\n');

    let totalSchedulesCreated = 0;

    // Fecha de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    logger.info('📅 Generando horarios para cada paciente...\n');

    for (const patient of patients) {
      const patientWithBed = await patientRepo.findOne({
        where: { id: patient.id },
        relations: ['bed'],
      });
      const bed = patientWithBed?.bed ?? null;

      if (!bed) {
        logger.info(`⚠️ Paciente ${patient.firstName} ${patient.lastName} sin cama, saltando...`);
        continue;
      }

      const nurses = await userRepo.find({
        where: {
          role: 'nurse' as any,
          assignedAreaId: bed.areaId,
          isActive: true
        },
        take: 1
      });

      const assignedNurse = nurses[0];

      logger.info(`👤 ${patient.firstName} ${patient.lastName} (Cama: ${bed.bedNumber})`);

      // 1. Agregar 2-4 medicamentos aleatorios
      const patientMedications = getRandomElements(medications, 2 + Math.floor(Math.random() * 3));
      
      for (const med of patientMedications) {
        for (const time of med.times) {
          const [hours, minutes] = time.split(':').map(Number);
          const scheduledTime = new Date(today);
          scheduledTime.setHours(hours, minutes, 0, 0);

          const schedule = new Schedule();
          schedule.patientId = patient.id;
          schedule.assignedToId = assignedNurse?.id || null;
          schedule.type = ScheduleType.MEDICATION;
          schedule.scheduledTime = scheduledTime;
          schedule.description = `Administrar ${med.name} ${med.dosage}`;
          schedule.medication = med.name;
          schedule.dosage = med.dosage;
          schedule.status = ScheduleStatus.PENDING;
          schedule.notes = '';

          await scheduleRepo.save(schedule);
          totalSchedulesCreated++;
        }
        logger.info(`   💊 ${med.name} ${med.dosage} (${med.times.length} dosis)`);
      }

      // 2. Agregar 3-6 cuidados/tratamientos diarios aleatorios
      const patientCares = getRandomElements(dailyCares, 3 + Math.floor(Math.random() * 4));
      
      for (const care of patientCares) {
        const [hours, minutes] = care.time.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const schedule = new Schedule();
        schedule.patientId = patient.id;
        schedule.assignedToId = assignedNurse?.id || null;
        schedule.type = ScheduleType.TREATMENT;
        schedule.scheduledTime = scheduledTime;
        schedule.description = care.description;
        schedule.status = ScheduleStatus.PENDING;
        schedule.medication = '';
        schedule.dosage = '';
        schedule.notes = '';

        await scheduleRepo.save(schedule);
        totalSchedulesCreated++;
      }
      logger.info(`   🩺 ${patientCares.length} cuidados programados`);
      logger.info('');
    }

    logger.info('\n🎉 ¡Horarios generados exitosamente!\n');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📊 RESUMEN:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`   👥 Pacientes procesados: ${patients.length}`);
    logger.info(`   📅 Total horarios creados: ${totalSchedulesCreated}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Resumen por tipo
    const medicationsCount = await scheduleRepo.count({
      where: { type: ScheduleType.MEDICATION }
    });
    
    const treatmentsCount = await scheduleRepo.count({
      where: { type: ScheduleType.TREATMENT }
    });

    logger.info('\n📋 Por tipo:');
    logger.info(`   💊 Medicamentos: ${medicationsCount}`);
    logger.info(`   🩺 Tratamientos/Cuidados: ${treatmentsCount}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    logger.error('❌ Error al generar horarios:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('🔌 Conexión cerrada');
    }
  }
}

seedSchedules()
  .then(() => {
    logger.info('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });

