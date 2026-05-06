import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { logger } from '../utils/logger';

const createPharmacyUser = async () => {
  try {
    await AppDataSource.initialize();
    logger.info('🌱 Conectado a la base de datos...');

    const userRepo = AppDataSource.getRepository(User);

    // Verificar si el usuario ya existe
    const existingUser = await userRepo.findOne({
      where: { username: 'farmacia' },
    });

    if (existingUser) {
      logger.info('⚠️  El usuario "farmacia" ya existe. Actualizando contraseña...');
      existingUser.password = 'password123'; // Se hasheará automáticamente
      existingUser.role = UserRole.PHARMACY;
      existingUser.isActive = true;
      await userRepo.save(existingUser);
      logger.info('✅ Usuario "farmacia" actualizado exitosamente');
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
      logger.info('✅ Usuario "farmacia" creado exitosamente');
    }

    logger.info('\n📋 Credenciales de acceso:');
    logger.info('   Usuario: farmacia');
    logger.info('   Contraseña: password123');
    logger.info('   Rol: pharmacy');
    logger.info('   Dashboard: /pharmacy\n');

    await AppDataSource.destroy();
  } catch (error) {
    logger.error('❌ Error al crear usuario de farmacia:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
};

createPharmacyUser();



















