import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class ShiftHandoverPerShiftAndAdminNotes1780300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hn = await queryRunner.hasTable('shift_handover_notes');
    if (hn) {
      const hasSlot = await queryRunner.hasColumn('shift_handover_notes', 'shift_slot');
      if (!hasSlot) {
        await queryRunner.query(`
          ALTER TABLE \`shift_handover_notes\`
          ADD COLUMN \`shift_slot\` VARCHAR(16) NOT NULL DEFAULT 'morning'
        `);
      }
      const table = await queryRunner.getTable('shift_handover_notes');
      if (!table?.indices.some((i) => i.name === 'IDX_shift_handover_areaId_fk')) {
        await queryRunner.createIndex(
          'shift_handover_notes',
          new TableIndex({
            name: 'IDX_shift_handover_areaId_fk',
            columnNames: ['areaId'],
            isUnique: false,
          })
        );
      }
      if (table?.indices.some((i) => i.name === 'UQ_shift_handover_area_date')) {
        await queryRunner.dropIndex('shift_handover_notes', 'UQ_shift_handover_area_date');
      }
      const afterDrop = await queryRunner.getTable('shift_handover_notes');
      if (!afterDrop?.indices.some((i) => i.name === 'UQ_shift_handover_area_date_slot')) {
        await queryRunner.createIndex(
          'shift_handover_notes',
          new TableIndex({
            name: 'UQ_shift_handover_area_date_slot',
            columnNames: ['areaId', 'note_date', 'shift_slot'],
            isUnique: true,
          })
        );
      }
    }

    const adminExists = await queryRunner.hasTable('admin_handover_notes');
    if (!adminExists) {
      await queryRunner.createTable(
        new Table({
          name: 'admin_handover_notes',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'note_date',
              type: 'date',
              isNullable: false,
            },
            {
              name: 'shift_slot',
              type: 'varchar',
              length: '16',
              isNullable: false,
            },
            {
              name: 'body',
              type: 'text',
              isNullable: false,
            },
            {
              name: 'author_user_id',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );

      await queryRunner.createForeignKey(
        'admin_handover_notes',
        new TableForeignKey({
          columnNames: ['author_user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        })
      );

      await queryRunner.createIndex(
        'admin_handover_notes',
        new TableIndex({
          name: 'UQ_admin_handover_date_slot',
          columnNames: ['note_date', 'shift_slot'],
          isUnique: true,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminExists = await queryRunner.hasTable('admin_handover_notes');
    if (adminExists) {
      await queryRunner.dropTable('admin_handover_notes', true, true, true);
    }

    const hn = await queryRunner.hasTable('shift_handover_notes');
    if (!hn) {
      return;
    }
    let t = await queryRunner.getTable('shift_handover_notes');
    if (t?.indices.some((i) => i.name === 'UQ_shift_handover_area_date_slot')) {
      await queryRunner.dropIndex('shift_handover_notes', 'UQ_shift_handover_area_date_slot');
    }
    if (await queryRunner.hasColumn('shift_handover_notes', 'shift_slot')) {
      await queryRunner.dropColumn('shift_handover_notes', 'shift_slot');
    }
    t = await queryRunner.getTable('shift_handover_notes');
    if (t?.indices.some((i) => i.name === 'IDX_shift_handover_areaId_fk')) {
      await queryRunner.dropIndex('shift_handover_notes', 'IDX_shift_handover_areaId_fk');
    }
    t = await queryRunner.getTable('shift_handover_notes');
    if (!t?.indices.some((i) => i.name === 'UQ_shift_handover_area_date')) {
      await queryRunner.createIndex(
        'shift_handover_notes',
        new TableIndex({
          name: 'UQ_shift_handover_area_date',
          columnNames: ['areaId', 'note_date'],
          isUnique: true,
        })
      );
    }
  }
}
