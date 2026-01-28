import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserFieldsAndPharmacyRole1733500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna maxPatients si no existe
    const maxPatientsColumn = await queryRunner.getTable('users');
    const hasMaxPatients = maxPatientsColumn?.findColumnByName('maxPatients');
    
    if (!hasMaxPatients) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'maxPatients',
          type: 'int',
          isNullable: true,
        })
      );
    }

    // Agregar columna assignedAreaId si no existe
    const assignedAreaIdColumn = await queryRunner.getTable('users');
    const hasAssignedAreaId = assignedAreaIdColumn?.findColumnByName('assignedAreaId');
    
    if (!hasAssignedAreaId) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'assignedAreaId',
          type: 'int',
          isNullable: true,
        })
      );
    }

    // Actualizar el enum del rol para incluir 'pharmacy'
    // Primero verificamos si el enum ya tiene 'pharmacy'
    const table = await queryRunner.getTable('users');
    const roleColumn = table?.findColumnByName('role');
    
    if (roleColumn && roleColumn.type === 'enum') {
      // En MySQL, necesitamos modificar la columna para agregar el nuevo valor al enum
      await queryRunner.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('admin', 'nurse', 'supervisor', 'pharmacy') 
        NOT NULL DEFAULT 'nurse'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir el enum del rol (remover 'pharmacy')
    await queryRunner.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'nurse', 'supervisor') 
      NOT NULL DEFAULT 'nurse'
    `);

    // Remover columna assignedAreaId si existe
    const assignedAreaIdColumn = await queryRunner.getTable('users');
    const hasAssignedAreaId = assignedAreaIdColumn?.findColumnByName('assignedAreaId');
    
    if (hasAssignedAreaId) {
      await queryRunner.dropColumn('users', 'assignedAreaId');
    }

    // Remover columna maxPatients si existe
    const maxPatientsColumn = await queryRunner.getTable('users');
    const hasMaxPatients = maxPatientsColumn?.findColumnByName('maxPatients');
    
    if (hasMaxPatients) {
      await queryRunner.dropColumn('users', 'maxPatients');
    }
  }
}
