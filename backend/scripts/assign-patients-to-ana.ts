import 'reflect-metadata';
import { loadEnv } from '../src/utils/env';
import { AppDataSource } from '../src/data-source';
import { Patient } from '../src/entities/Patient';
import { Schedule, ScheduleType, ScheduleStatus } from '../src/entities/Schedule';
import { User } from '../src/entities/User';
import { Bed } from '../src/entities/Bed';

loadEnv();

// Medicamentos comunes para asignar
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

// Tratamientos y cuidados
const treatments = [
  { description: 'Toma de signos vitales', time: '06:00' },
  { description: 'Toma de signos vitales', time: '14:00' },
  { description: 'Toma de signos vitales', time: '22:00' },
  { description: 'Baño/Aseo personal', time: '07:00' },
  { description: 'Cambio de posición', time: '08:00' },
  { description: 'Cambio de posición', time: '12:00' },
  { description: 'Cambio de posición', time: '16:00' },
  { description: 'Cambio de posición', time: '20:00' },
  { description: 'Curación de heridas', time: '10:00' },
  { description: 'Control de glucosa', time: '07:00' },
  { description: 'Control de glucosa', time: '13:00' },
  { description: 'Control de glucosa', time: '19:00' },
  { description: 'Cambio de vendaje', time: '09:00' },
  { description: 'Revisión de sonda', time: '08:00' },
  { description: 'Alimentación asistida', time: '12:00' },
  { description: 'Alimentación asistida', time: '18:00' },
  { description: 'Ejercicios de rehabilitación', time: '10:00' },
  { description: 'Ejercicios respiratorios', time: '11:00' },
  { description: 'Revisión general', time: '15:00' }
];

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

async function assignPatientsToAna() {
  try {
    console.log('🔄 Inicializando conexión a la base de datos...');
    await AppDataSource.initialize();
    console.log('✅ Conexión establecida\n');

    const userRepo = AppDataSource.getRepository(User);
    const patientRepo = AppDataSource.getRepository(Patient);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const bedRepo = AppDataSource.getRepository(Bed);

    // Buscar a Ana García
    console.log('🔍 Buscando a Ana García...');
    let anaGarcia = await userRepo.findOne({
      where: [
        { username: 'enfermera1' },
        { firstName: 'Ana', lastName: 'García' },
        { email: 'ana.garcia@nursehelper.com' }
      ]
    });

    if (!anaGarcia) {
      // Buscar por nombre parcial
      const allNurses = await userRepo.find({
        where: { role: 'nurse' as any, isActive: true }
      });
      
      const ana = allNurses.find((n: User) => 
        n.firstName.toLowerCase().includes('ana') && 
        n.lastName.toLowerCase().includes('garcía')
      );

      if (!ana) {
        console.error('❌ No se encontró a Ana García. Enfermeras disponibles:');
        allNurses.forEach((n: User) => {
          console.log(`   - ${n.firstName} ${n.lastName} (${n.username})`);
        });
        return;
      }

      anaGarcia = ana;
    }

    if (!anaGarcia) {
      console.error('❌ No se pudo encontrar a Ana García');
      return;
    }

    console.log(`✅ Encontrada: ${anaGarcia.firstName} ${anaGarcia.lastName} (ID: ${anaGarcia.id})\n`);

    // Buscar pacientes existentes sin asignar o crear algunos nuevos
    console.log('👥 Buscando pacientes...');
    let patients = await patientRepo.find({
      where: { isActive: true },
      take: 5
    });

    // Si hay menos de 3 pacientes, crear algunos nuevos
    if (patients.length < 3) {
      console.log(`⚠️ Solo hay ${patients.length} pacientes. Creando pacientes adicionales...\n`);
      
      const newPatientsData = [
        {
          firstName: 'María',
          lastName: 'Rodríguez',
          identificationNumber: `ID${Date.now()}1`,
          dateOfBirth: new Date(1965, 5, 15),
          gender: 'F',
          phone: '555-1234',
          address: 'Calle Principal 123',
          emergencyContact: 'Juan Rodríguez',
          emergencyPhone: '555-5678',
          emergencyRelation: 'Esposo',
          medicalHistory: 'Hipertensión, Diabetes tipo 2',
          allergies: 'Penicilina',
          isActive: true
        },
        {
          firstName: 'Carlos',
          lastName: 'López',
          identificationNumber: `ID${Date.now()}2`,
          dateOfBirth: new Date(1958, 8, 22),
          gender: 'M',
          phone: '555-2345',
          address: 'Avenida Central 456',
          emergencyContact: 'Laura López',
          emergencyPhone: '555-6789',
          emergencyRelation: 'Hija',
          medicalHistory: 'Enfermedad pulmonar obstructiva crónica',
          allergies: 'Ninguna conocida',
          isActive: true
        },
        {
          firstName: 'Isabel',
          lastName: 'Martínez',
          identificationNumber: `ID${Date.now()}3`,
          dateOfBirth: new Date(1972, 2, 10),
          gender: 'F',
          phone: '555-3456',
          address: 'Calle Secundaria 789',
          emergencyContact: 'Pedro Martínez',
          emergencyPhone: '555-7890',
          emergencyRelation: 'Hermano',
          medicalHistory: 'Artritis reumatoide',
          allergies: 'Ibuprofeno',
          isActive: true
        }
      ];

      for (const patientData of newPatientsData) {
        const newPatient = new Patient();
        Object.assign(newPatient, patientData);
        const savedPatient = await patientRepo.save(newPatient);
        patients.push(savedPatient);
        console.log(`✅ Paciente creado: ${savedPatient.firstName} ${savedPatient.lastName}`);
      }
    }

    // Asignar pacientes a Ana García
    console.log(`\n📋 Asignando ${patients.length} pacientes a Ana García...\n`);
    
    for (const patient of patients) {
      // Asignar paciente a Ana García usando SQL directo (porque assignedToId puede no existir)
      try {
        await AppDataSource.query(
          `UPDATE patients SET assignedToId = ? WHERE id = ?`,
          [anaGarcia.id, patient.id]
        );
        console.log(`✅ ${patient.firstName} ${patient.lastName} asignado a Ana García`);
      } catch (error: any) {
        // Si la columna no existe, solo continuar sin asignar
        if (error?.code === 'ER_BAD_FIELD_ERROR') {
          console.log(`⚠️ ${patient.firstName} ${patient.lastName} - Columna assignedToId no existe, continuando...`);
        } else {
          throw error;
        }
      }

      // Obtener o crear cama para el paciente
      // Nota: La relación bed-patient se maneja a través de Patient.bedId
      // Buscar una cama disponible si el paciente no tiene una asignada
      if (!patient.bedId) {
        const availableBeds = await bedRepo.find({
          where: { isActive: true },
          take: 1
        });
        if (availableBeds.length > 0) {
          const bed = availableBeds[0];
          patient.bedId = bed.id;
          await patientRepo.save(patient);
          console.log(`   🛏️ Asignada cama ${bed.bedNumber} al paciente`);
        }
      }

      // Crear medicamentos programados (2-4 medicamentos por paciente)
      const patientMedications = getRandomElements(medications, 2 + Math.floor(Math.random() * 3));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log(`   💊 Medicamentos programados:`);
      for (const med of patientMedications) {
        for (const time of med.times) {
          const [hours, minutes] = time.split(':').map(Number);
          const scheduledTime = new Date(today);
          scheduledTime.setHours(hours, minutes, 0, 0);

          // Crear para los próximos 7 días
          for (let day = 0; day < 7; day++) {
            const scheduleDate = new Date(scheduledTime);
            scheduleDate.setDate(scheduleDate.getDate() + day);

            const schedule = new Schedule();
            schedule.patientId = patient.id;
            schedule.assignedToId = anaGarcia.id;
            schedule.type = ScheduleType.MEDICATION;
            schedule.scheduledTime = scheduleDate;
            schedule.description = `Administrar ${med.name} ${med.dosage}`;
            schedule.medication = med.name;
            schedule.dosage = med.dosage;
            schedule.status = ScheduleStatus.PENDING;
            schedule.notes = 'Medicación prescrita por médico';

            await scheduleRepo.save(schedule);
          }
        }
        console.log(`      - ${med.name} ${med.dosage} (${med.times.length} veces al día)`);
      }

      // Crear tratamientos programados (3-6 tratamientos por paciente)
      const patientTreatments = getRandomElements(treatments, 3 + Math.floor(Math.random() * 4));
      
      console.log(`   🩺 Tratamientos programados:`);
      for (const treatment of patientTreatments) {
        const [hours, minutes] = treatment.time.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // Crear para los próximos 7 días
        for (let day = 0; day < 7; day++) {
          const scheduleDate = new Date(scheduledTime);
          scheduleDate.setDate(scheduleDate.getDate() + day);

          const schedule = new Schedule();
          schedule.patientId = patient.id;
          schedule.assignedToId = anaGarcia.id;
          schedule.type = ScheduleType.TREATMENT;
          schedule.scheduledTime = scheduleDate;
          schedule.description = treatment.description;
          schedule.status = ScheduleStatus.PENDING;
          schedule.medication = '';
          schedule.dosage = '';
          schedule.notes = 'Tratamiento programado';

          await scheduleRepo.save(schedule);
        }
        console.log(`      - ${treatment.description} (${treatment.time})`);
      }
      console.log('');
    }

    // Resumen final
    const totalSchedules = await scheduleRepo.count({
      where: { assignedToId: anaGarcia.id }
    });

    const medicationsCount = await scheduleRepo.count({
      where: { 
        assignedToId: anaGarcia.id,
        type: ScheduleType.MEDICATION 
      }
    });

    const treatmentsCount = await scheduleRepo.count({
      where: { 
        assignedToId: anaGarcia.id,
        type: ScheduleType.TREATMENT 
      }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN FINAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👩‍⚕️ Enfermera: ${anaGarcia.firstName} ${anaGarcia.lastName}`);
    console.log(`👥 Pacientes asignados: ${patients.length}`);
    console.log(`📅 Total horarios creados: ${totalSchedules}`);
    console.log(`   💊 Medicamentos: ${medicationsCount}`);
    console.log(`   🩺 Tratamientos: ${treatmentsCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Proceso completado exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexión cerrada');
    }
  }
}

assignPatientsToAna()
  .then(() => {
    console.log('✅ Script ejecutado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
