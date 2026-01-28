import { AppDataSource } from '../src/data-source';
import { User, UserRole } from '../src/entities/User';
import { Schedule } from '../src/entities/Schedule';
import { NurseShift } from '../src/entities/NurseShift';

async function deleteInactiveNurses() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await AppDataSource.initialize();
    console.log('✅ Conectado a la base de datos');

    const userRepository = AppDataSource.getRepository(User);
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    const nurseShiftRepository = AppDataSource.getRepository(NurseShift);

    // Buscar todas las enfermeras inactivas
    console.log('🔍 Buscando enfermeras inactivas...');
    const inactiveNurses = await userRepository.find({
      where: {
        role: UserRole.NURSE,
        isActive: false
      }
    });

    if (inactiveNurses.length === 0) {
      console.log('✅ No se encontraron enfermeras inactivas para eliminar');
      await AppDataSource.destroy();
      return;
    }

    console.log(`📊 Encontradas ${inactiveNurses.length} enfermera(s) inactiva(s):`);
    inactiveNurses.forEach((nurse, index) => {
      console.log(`   ${index + 1}. ${nurse.firstName} ${nurse.lastName} (ID: ${nurse.id}, Usuario: ${nurse.username})`);
    });

    // Confirmar antes de eliminar
    console.log('\n⚠️  ADVERTENCIA: Esta acción eliminará permanentemente:');
    console.log(`   - ${inactiveNurses.length} enfermera(s) inactiva(s)`);
    
    // Contar registros relacionados
    let schedulesCount = 0;
    let shiftsCount = 0;
    
    for (const nurse of inactiveNurses) {
      const schedules = await scheduleRepository.count({ where: { assignedToId: nurse.id } });
      const shifts = await nurseShiftRepository.count({ where: { nurseId: nurse.id } });
      schedulesCount += schedules;
      shiftsCount += shifts;
    }

    if (schedulesCount > 0) {
      console.log(`   - ${schedulesCount} horario(s)/tarea(s) asignada(s)`);
    }
    if (shiftsCount > 0) {
      console.log(`   - ${shiftsCount} turno(s) asignado(s)`);
    }

    console.log('\n💡 Para confirmar la eliminación, ejecuta este script con el argumento --confirm');
    console.log('   Ejemplo: npm run delete-inactive-nurses -- --confirm');

    // Verificar si se pasó el flag --confirm
    const args = process.argv.slice(2);
    if (!args.includes('--confirm')) {
      console.log('\n❌ Operación cancelada. Usa --confirm para proceder.');
      await AppDataSource.destroy();
      return;
    }

    console.log('\n🗑️  Iniciando eliminación...');

    // Eliminar registros relacionados primero
    for (const nurse of inactiveNurses) {
      // Eliminar schedules asignados
      await scheduleRepository.delete({ assignedToId: nurse.id });
      console.log(`   ✓ Eliminados schedules de enfermera ID ${nurse.id}`);

      // Eliminar turnos asignados
      await nurseShiftRepository.delete({ nurseId: nurse.id });
      console.log(`   ✓ Eliminados turnos de enfermera ID ${nurse.id}`);
    }

    // Eliminar las enfermeras
    const deleteResult = await userRepository.remove(inactiveNurses);
    console.log(`\n✅ Eliminadas ${deleteResult.length} enfermera(s) inactiva(s) exitosamente`);

    await AppDataSource.destroy();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error al eliminar enfermeras inactivas:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

deleteInactiveNurses();
