import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddPerformanceIndexes1733300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices para la tabla schedules
    await queryRunner.createIndex(
      'schedules',
      new TableIndex({
        name: 'IDX_SCHEDULE_PATIENT_ID',
        columnNames: ['patientId'],
      })
    );

    await queryRunner.createIndex(
      'schedules',
      new TableIndex({
        name: 'IDX_SCHEDULE_SCHEDULED_TIME',
        columnNames: ['scheduledTime'],
      })
    );

    await queryRunner.createIndex(
      'schedules',
      new TableIndex({
        name: 'IDX_SCHEDULE_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'schedules',
      new TableIndex({
        name: 'IDX_SCHEDULE_PATIENT_STATUS',
        columnNames: ['patientId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'schedules',
      new TableIndex({
        name: 'IDX_SCHEDULE_PATIENT_TIME',
        columnNames: ['patientId', 'scheduledTime'],
      })
    );

    await queryRunner.createIndex(
      'schedules',
      new TableIndex({
        name: 'IDX_SCHEDULE_ASSIGNED_TO',
        columnNames: ['assignedToId'],
      })
    );

    await queryRunner.createIndex(
      'schedules',
      new TableIndex({
        name: 'IDX_SCHEDULE_TYPE_STATUS',
        columnNames: ['type', 'status'],
      })
    );

    // Índices para la tabla administration_history
    await queryRunner.createIndex(
      'administration_history',
      new TableIndex({
        name: 'IDX_ADMIN_HISTORY_PATIENT_ID',
        columnNames: ['patientId'],
      })
    );

    await queryRunner.createIndex(
      'administration_history',
      new TableIndex({
        name: 'IDX_ADMIN_HISTORY_SCHEDULED_TIME',
        columnNames: ['scheduledTime'],
      })
    );

    await queryRunner.createIndex(
      'administration_history',
      new TableIndex({
        name: 'IDX_ADMIN_HISTORY_ADMINISTERED_BY',
        columnNames: ['administeredById'],
      })
    );

    await queryRunner.createIndex(
      'administration_history',
      new TableIndex({
        name: 'IDX_ADMIN_HISTORY_PATIENT_TIME',
        columnNames: ['patientId', 'scheduledTime'],
      })
    );

    await queryRunner.createIndex(
      'administration_history',
      new TableIndex({
        name: 'IDX_ADMIN_HISTORY_SCHEDULE_ID',
        columnNames: ['scheduleId'],
      })
    );

    // Índices para la tabla beds
    await queryRunner.createIndex(
      'beds',
      new TableIndex({
        name: 'IDX_BED_AREA_ID',
        columnNames: ['areaId'],
      })
    );

    await queryRunner.createIndex(
      'beds',
      new TableIndex({
        name: 'IDX_BED_PATIENT_ID',
        columnNames: ['patientId'],
      })
    );

    await queryRunner.createIndex(
      'beds',
      new TableIndex({
        name: 'IDX_BED_AREA_ACTIVE',
        columnNames: ['areaId', 'isActive'],
      })
    );

    await queryRunner.createIndex(
      'beds',
      new TableIndex({
        name: 'IDX_BED_PATIENT_ACTIVE',
        columnNames: ['patientId', 'isActive'],
      })
    );

    // Índices para la tabla patients
    await queryRunner.createIndex(
      'patients',
      new TableIndex({
        name: 'IDX_PATIENT_IS_ACTIVE',
        columnNames: ['isActive'],
      })
    );

    await queryRunner.createIndex(
      'patients',
      new TableIndex({
        name: 'IDX_PATIENT_LAST_NAME',
        columnNames: ['lastName'],
      })
    );

    // Índices para la tabla medication_requests
    await queryRunner.createIndex(
      'medication_requests',
      new TableIndex({
        name: 'IDX_MED_REQ_STATUS',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'medication_requests',
      new TableIndex({
        name: 'IDX_MED_REQ_REQUESTED_BY',
        columnNames: ['requestedById'],
      })
    );

    await queryRunner.createIndex(
      'medication_requests',
      new TableIndex({
        name: 'IDX_MED_REQ_MEDICATION_ID',
        columnNames: ['medicationId'],
      })
    );

    await queryRunner.createIndex(
      'medication_requests',
      new TableIndex({
        name: 'IDX_MED_REQ_STATUS_PRIORITY',
        columnNames: ['status', 'priority'],
      })
    );

    await queryRunner.createIndex(
      'medication_requests',
      new TableIndex({
        name: 'IDX_MED_REQ_CREATED_AT',
        columnNames: ['createdAt'],
      })
    );

    // Índices para la tabla delivery_history
    await queryRunner.createIndex(
      'delivery_history',
      new TableIndex({
        name: 'IDX_DELIVERY_DELIVERED_AT',
        columnNames: ['deliveredAt'],
      })
    );

    await queryRunner.createIndex(
      'delivery_history',
      new TableIndex({
        name: 'IDX_DELIVERY_MEDICATION_ID',
        columnNames: ['medicationId'],
      })
    );

    await queryRunner.createIndex(
      'delivery_history',
      new TableIndex({
        name: 'IDX_DELIVERY_REQUESTED_BY',
        columnNames: ['requestedById'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índices de schedules
    await queryRunner.dropIndex('schedules', 'IDX_SCHEDULE_PATIENT_ID');
    await queryRunner.dropIndex('schedules', 'IDX_SCHEDULE_SCHEDULED_TIME');
    await queryRunner.dropIndex('schedules', 'IDX_SCHEDULE_STATUS');
    await queryRunner.dropIndex('schedules', 'IDX_SCHEDULE_PATIENT_STATUS');
    await queryRunner.dropIndex('schedules', 'IDX_SCHEDULE_PATIENT_TIME');
    await queryRunner.dropIndex('schedules', 'IDX_SCHEDULE_ASSIGNED_TO');
    await queryRunner.dropIndex('schedules', 'IDX_SCHEDULE_TYPE_STATUS');

    // Eliminar índices de administration_history
    await queryRunner.dropIndex('administration_history', 'IDX_ADMIN_HISTORY_PATIENT_ID');
    await queryRunner.dropIndex('administration_history', 'IDX_ADMIN_HISTORY_SCHEDULED_TIME');
    await queryRunner.dropIndex('administration_history', 'IDX_ADMIN_HISTORY_ADMINISTERED_BY');
    await queryRunner.dropIndex('administration_history', 'IDX_ADMIN_HISTORY_PATIENT_TIME');
    await queryRunner.dropIndex('administration_history', 'IDX_ADMIN_HISTORY_SCHEDULE_ID');

    // Eliminar índices de beds
    await queryRunner.dropIndex('beds', 'IDX_BED_AREA_ID');
    await queryRunner.dropIndex('beds', 'IDX_BED_PATIENT_ID');
    await queryRunner.dropIndex('beds', 'IDX_BED_AREA_ACTIVE');
    await queryRunner.dropIndex('beds', 'IDX_BED_PATIENT_ACTIVE');

    // Eliminar índices de patients
    await queryRunner.dropIndex('patients', 'IDX_PATIENT_IS_ACTIVE');
    await queryRunner.dropIndex('patients', 'IDX_PATIENT_LAST_NAME');

    // Eliminar índices de medication_requests
    await queryRunner.dropIndex('medication_requests', 'IDX_MED_REQ_STATUS');
    await queryRunner.dropIndex('medication_requests', 'IDX_MED_REQ_REQUESTED_BY');
    await queryRunner.dropIndex('medication_requests', 'IDX_MED_REQ_MEDICATION_ID');
    await queryRunner.dropIndex('medication_requests', 'IDX_MED_REQ_STATUS_PRIORITY');
    await queryRunner.dropIndex('medication_requests', 'IDX_MED_REQ_CREATED_AT');

    // Eliminar índices de delivery_history
    await queryRunner.dropIndex('delivery_history', 'IDX_DELIVERY_DELIVERED_AT');
    await queryRunner.dropIndex('delivery_history', 'IDX_DELIVERY_MEDICATION_ID');
    await queryRunner.dropIndex('delivery_history', 'IDX_DELIVERY_REQUESTED_BY');
  }
}
