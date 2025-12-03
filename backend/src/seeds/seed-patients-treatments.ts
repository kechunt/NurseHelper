import { AppDataSource } from '../data-source';
import { Patient } from '../entities/Patient';
import { Bed } from '../entities/Bed';
import { Schedule, ScheduleType, ScheduleStatus } from '../entities/Schedule';
import { User } from '../entities/User';
import { Area } from '../entities/Area';

const medications = [
  { name: 'Paracetamol', dosage: '500mg' },
  { name: 'Ibuprofeno', dosage: '400mg' },
  { name: 'Amoxicilina', dosage: '500mg' },
  { name: 'Omeprazol', dosage: '20mg' },
  { name: 'Metformina', dosage: '500mg' },
  { name: 'Losartán', dosage: '50mg' },
  { name: 'Atorvastatina', dosage: '20mg' },
  { name: 'Amlodipino', dosage: '5mg' },
  { name: 'Levotiroxina', dosage: '50mcg' },
  { name: 'Furosemida', dosage: '40mg' },
];

const treatments = [
  'Toma de signos vitales',
  'Cambio de vendaje',
  'Aplicación de medicamento tópico',
  'Baño asistido',
  'Cambio de posición',
  'Aspiración de secreciones',
  'Control de glucosa',
  'Aplicación de oxígeno',
  'Limpieza de herida',
  'Fisioterapia respiratoria',
];

const firstNames = [
  'María', 'José', 'Ana', 'Carlos', 'Laura', 'Juan', 'Carmen', 'Luis',
  'Patricia', 'Roberto', 'Sofía', 'Miguel', 'Isabel', 'Fernando', 'Lucía'
];

const lastNames = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez',
  'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández',
  'Díaz', 'Moreno'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomTime(): string {
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

async function seedPatientsAndTreatments() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada');

    const patientRepo = AppDataSource.getRepository(Patient);
    const bedRepo = AppDataSource.getRepository(Bed);
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const userRepo = AppDataSource.getRepository(User);
    const areaRepo = AppDataSource.getRepository(Area);

    const areas = await areaRepo.find({ where: { isActive: true } });
    if (areas.length === 0) {
      console.error('❌ No hay áreas activas. Crea áreas primero.');
      return;
    }

    const nurses = await userRepo.find({ 
      where: { role: 'nurse' as any, isActive: true },
      take: 5 
    });
    if (nurses.length === 0) {
      console.error('❌ No hay enfermeras activas. Crea enfermeras primero.');
      return;
    }

    const allBeds = await bedRepo.find({
      where: { isActive: true },
      relations: ['area']
    });
    const availableBeds = allBeds.filter(bed => bed.patientId === null);

    console.log(`📊 Áreas disponibles: ${areas.length}`);
    console.log(`👩‍⚕️ Enfermeras disponibles: ${nurses.length}`);
    console.log(`🛏️ Camas disponibles: ${availableBeds.length}`);

    const newPatients: Patient[] = [];
    for (let i = 0; i < 5 && i < availableBeds.length; i++) {
      const bed = availableBeds[i];
      const area = bed.area || getRandomElement(areas);
      const nurse = getRandomElement(nurses);

      const patient = new Patient();
      patient.firstName = getRandomElement(firstNames);
      patient.lastName = getRandomElement(lastNames);
      patient.identificationNumber = `ID${Date.now()}${i}`;
      patient.dateOfBirth = new Date(1950 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      patient.gender = Math.random() > 0.5 ? 'M' : 'F';
      patient.phone = `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      patient.address = `Calle ${Math.floor(Math.random() * 100)} #${Math.floor(Math.random() * 100)}`;
      patient.emergencyContact = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
      patient.emergencyPhone = `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      patient.emergencyRelation = getRandomElement(['Esposo/a', 'Hijo/a', 'Hermano/a', 'Padre/Madre']);
      patient.medicalHistory = 'Historial médico del paciente';
      patient.isActive = true;

      const savedPatient = await patientRepo.save(patient);
      
      bed.patientId = savedPatient.id!;
      await bedRepo.save(bed);

      newPatients.push(savedPatient);
      console.log(`✅ Paciente creado: ${patient.firstName} ${patient.lastName} en cama ${bed.bedNumber}`);
    }

    const allPatients = await patientRepo.find({ where: { isActive: true } });
    console.log(`\n📋 Total de pacientes: ${allPatients.length}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const patient of allPatients) {
      // Obtener la cama del paciente para asignar a la enfermera del área
      const patientBed = await bedRepo.findOne({ 
        where: { patientId: patient.id },
        relations: ['area']
      });

      if (!patientBed) continue;

      const areaNurses = nurses.filter(n => n.assignedAreaId === patientBed.areaId);
      const assignedNurse = areaNurses.length > 0 ? getRandomElement(areaNurses) : getRandomElement(nurses);

      const selectedMedications = medications.sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const med of selectedMedications) {
        for (let day = 0; day < 7; day++) {
          const scheduleDate = new Date(today);
          scheduleDate.setDate(scheduleDate.getDate() + day);
          
          const timesPerDay = Math.floor(Math.random() * 2) + 2;
          for (let t = 0; t < timesPerDay; t++) {
            const [hours, minutes] = getRandomTime().split(':').map(Number);
            scheduleDate.setHours(hours, minutes, 0, 0);

            const schedule = new Schedule();
            schedule.patientId = patient.id!;
            schedule.assignedToId = assignedNurse.id;
            schedule.type = ScheduleType.MEDICATION;
            schedule.scheduledTime = new Date(scheduleDate);
            schedule.description = `${med.name} ${med.dosage}`;
            schedule.medication = med.name;
            schedule.dosage = med.dosage;
            schedule.status = ScheduleStatus.PENDING;
            schedule.notes = 'Medicación prescrita';

            await scheduleRepo.save(schedule);
          }
        }
      }

      const selectedTreatments = treatments.sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const treatment of selectedTreatments) {
        for (let day = 0; day < 7; day++) {
          const scheduleDate = new Date(today);
          scheduleDate.setDate(scheduleDate.getDate() + day);
          
          const timesPerDay = Math.floor(Math.random() * 2) + 1;
          for (let t = 0; t < timesPerDay; t++) {
            const [hours, minutes] = getRandomTime().split(':').map(Number);
            scheduleDate.setHours(hours, minutes, 0, 0);

            const schedule = new Schedule();
            schedule.patientId = patient.id!;
            schedule.assignedToId = assignedNurse.id;
            schedule.type = ScheduleType.TREATMENT;
            schedule.scheduledTime = new Date(scheduleDate);
            schedule.description = treatment;
            schedule.status = ScheduleStatus.PENDING;
            schedule.notes = 'Tratamiento programado';

            await scheduleRepo.save(schedule);
          }
        }
      }

      console.log(`✅ Agregados tratamientos y medicamentos a ${patient.firstName} ${patient.lastName}`);
    }

    console.log('\n✅ Seed completado exitosamente!');
    console.log(`📊 Pacientes nuevos creados: ${newPatients.length}`);
    console.log(`💊 Medicamentos y tratamientos agregados a ${allPatients.length} pacientes`);

  } catch (error) {
    console.error('❌ Error en seed:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seedPatientsAndTreatments();

