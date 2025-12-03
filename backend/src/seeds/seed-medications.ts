import { AppDataSource } from '../data-source';
import { Medication, MedicationStatus } from '../entities/Medication';

const seedMedications = async () => {
  try {
    await AppDataSource.initialize();
    console.log('🌱 Conectado a la base de datos para seeding de medicamentos...');

    const medicationRepo = AppDataSource.getRepository(Medication);

    // Verificar si ya hay medicamentos
    const existingCount = await medicationRepo.count();
    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} medicamentos en la base de datos.`);
      console.log('¿Deseas agregar más medicamentos? (S/N)');
      await AppDataSource.destroy();
      return;
    }

    const medications = [
      { name: 'Paracetamol', dosage: '500mg', stock: 500, minStock: 100, location: 'A-01', expiryDate: '2025-12-31', description: 'Analgésico y antipirético' },
      { name: 'Ibuprofeno', dosage: '400mg', stock: 300, minStock: 100, location: 'A-02', expiryDate: '2025-12-31', description: 'Antiinflamatorio no esteroideo' },
      { name: 'Enalapril', dosage: '10mg', stock: 200, minStock: 50, location: 'B-12', expiryDate: '2025-12-31', description: 'Antihipertensivo' },
      { name: 'Aspirina', dosage: '100mg', stock: 400, minStock: 80, location: 'A-05', expiryDate: '2025-12-31', description: 'Antiagregante plaquetario' },
      { name: 'Insulina NPH', dosage: '100UI/ml', stock: 50, minStock: 20, location: 'REFRI-01', expiryDate: '2025-06-30', description: 'Insulina de acción intermedia' },
      { name: 'Furosemida', dosage: '40mg', stock: 250, minStock: 60, location: 'B-08', expiryDate: '2025-12-31', description: 'Diurético' },
      { name: 'Amoxicilina', dosage: '500mg', stock: 150, minStock: 50, location: 'C-15', expiryDate: '2025-12-31', description: 'Antibiótico' },
      { name: 'Salbutamol', dosage: '100mcg/puff', stock: 80, minStock: 15, location: 'D-03', expiryDate: '2026-12-31', description: 'Broncodilatador' },
      { name: 'Omeprazol', dosage: '20mg', stock: 350, minStock: 100, location: 'A-10', expiryDate: '2025-12-31', description: 'Inhibidor de bomba de protones' },
      { name: 'Metformina', dosage: '850mg', stock: 280, minStock: 80, location: 'B-05', expiryDate: '2025-12-31', description: 'Antidiabético oral' },
      { name: 'Atorvastatina', dosage: '20mg', stock: 180, minStock: 50, location: 'B-15', expiryDate: '2025-12-31', description: 'Hipolipemiante' },
      { name: 'Losartán', dosage: '50mg', stock: 220, minStock: 60, location: 'B-20', expiryDate: '2025-12-31', description: 'Antihipertensivo' },
      { name: 'Metoclopramida', dosage: '10mg', stock: 150, minStock: 40, location: 'C-08', expiryDate: '2025-12-31', description: 'Antiemético' },
      { name: 'Diazepam', dosage: '5mg', stock: 100, minStock: 30, location: 'E-01', expiryDate: '2025-12-31', description: 'Ansiolítico y relajante muscular' },
      { name: 'Morfina', dosage: '10mg/ml', stock: 25, minStock: 10, location: 'E-05', expiryDate: '2025-12-31', description: 'Analgésico opioide' },
      { name: 'Heparina', dosage: '5000UI/ml', stock: 60, minStock: 20, location: 'REFRI-02', expiryDate: '2025-12-31', description: 'Anticoagulante' },
      { name: 'Warfarina', dosage: '5mg', stock: 120, minStock: 40, location: 'C-12', expiryDate: '2025-12-31', description: 'Anticoagulante oral' },
      { name: 'Digoxina', dosage: '0.25mg', stock: 90, minStock: 25, location: 'D-10', expiryDate: '2025-12-31', description: 'Cardiotónico' },
      { name: 'Levotiroxina', dosage: '50mcg', stock: 140, minStock: 50, location: 'A-15', expiryDate: '2025-12-31', description: 'Hormona tiroidea' },
      { name: 'Prednisona', dosage: '5mg', stock: 200, minStock: 60, location: 'B-25', expiryDate: '2025-12-31', description: 'Corticosteroide' },
    ];

    const medicationsToSave: Medication[] = [];

    for (const medData of medications) {
      const medication = new Medication();
      medication.name = medData.name;
      medication.dosage = medData.dosage;
      medication.description = medData.description;
      medication.stock = medData.stock;
      medication.minStock = medData.minStock;
      medication.location = medData.location;
      medication.expiryDate = new Date(medData.expiryDate);
      medication.isActive = true;

      // Determinar estado según stock
      if (medication.stock === 0) {
        medication.status = MedicationStatus.OUT_OF_STOCK;
      } else if (medication.stock < medication.minStock) {
        medication.status = MedicationStatus.LOW_STOCK;
      } else {
        medication.status = MedicationStatus.AVAILABLE;
      }

      medicationsToSave.push(medication);
    }

    await medicationRepo.save(medicationsToSave);

    console.log(`✅ ${medicationsToSave.length} medicamentos creados exitosamente en la base de datos`);
    console.log(`📊 Resumen:`);
    console.log(`   - Disponibles: ${medicationsToSave.filter(m => m.status === MedicationStatus.AVAILABLE).length}`);
    console.log(`   - Stock bajo: ${medicationsToSave.filter(m => m.status === MedicationStatus.LOW_STOCK).length}`);
    console.log(`   - Sin stock: ${medicationsToSave.filter(m => m.status === MedicationStatus.OUT_OF_STOCK).length}`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error al crear medicamentos:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
};

seedMedications();



