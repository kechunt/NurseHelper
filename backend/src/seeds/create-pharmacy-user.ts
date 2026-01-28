import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';

const createPharmacyUser = async () => {
  try {
    await AppDataSource.initialize();
    console.log('🌱 Conectado a la base de datos...');

    const userRepo = AppDataSource.getRepository(User);

    // Verificar si el usuario ya existe
    const existingUser = await userRepo.findOne({
      where: { username: 'farmacia' },
    });

    if (existingUser) {
      console.log('⚠️  El usuario "farmacia" ya existe. Actualizando contraseña...');
      existingUser.password = 'password123'; // Se hasheará automáticamente
      existingUser.role = UserRole.PHARMACY;
      existingUser.isActive = true;
      await userRepo.save(existingUser);
      console.log('✅ Usuario "farmacia" actualizado exitosamente');
    } else {
      // Crear nuevo usuario
      const pharmacyUser = new User();
      pharmacyUser.username = 'farmacia';
      pharmacyUser.email = 'farmacia@nursehelper.com';
      pharmacyUser.password = 'password123'; // Se hasheará automáticamente en BeforeInsert
      pharmacyUser.firstName = 'Farmacia';
      pharmacyUser.lastName = 'Central';
      pharmacyUser.role = UserRole.PHARMACY;
      pharmacyUser.isActive = true;

      await userRepo.save(pharmacyUser);
      console.log('✅ Usuario "farmacia" creado exitosamente');
    }

    console.log('\n📋 Credenciales de acceso:');
    console.log('   Usuario: farmacia');
    console.log('   Contraseña: password123');
    console.log('   Rol: pharmacy');
    console.log('   Dashboard: /pharmacy\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error al crear usuario de farmacia:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
};

createPharmacyUser();



















