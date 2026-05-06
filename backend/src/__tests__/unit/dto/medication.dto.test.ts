import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AddMedicationDto,
  AddTreatmentDto,
  DeleteMedicationDto,
  MarkNotCompletedDto,
  PostponeTaskDto,
  SuspendMedicationDto,
} from '../../../dto/medication.dto';

describe('medication.dto', () => {
  it('AddMedicationDto acepta payload válido y transforma patientId a número', async () => {
    const dto = plainToInstance(AddMedicationDto, {
      patientId: '12',
      medication: 'Paracetamol',
      dosage: '500mg',
      times: ['08:00', '20:00'],
      duration: 5,
      durationUnit: 'days',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.patientId).toBe(12);
  });

  it('AddMedicationDto rechaza durationUnit inválido', async () => {
    const dto = plainToInstance(AddMedicationDto, {
      patientId: 12,
      medication: 'Paracetamol',
      dosage: '500mg',
      times: ['08:00'],
      durationUnit: 'years',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'durationUnit')).toBe(true);
  });

  it('Suspend/Delete/MarkNotCompleted exigen razón mínima de 10 caracteres', async () => {
    const suspend = plainToInstance(SuspendMedicationDto, { reason: 'corta' });
    const del = plainToInstance(DeleteMedicationDto, { reason: 'corta' });
    const mark = plainToInstance(MarkNotCompletedDto, { reasonNotAdministered: 'corta' });

    const suspendErrors = await validate(suspend);
    const deleteErrors = await validate(del);
    const markErrors = await validate(mark);

    expect(suspendErrors.some((e) => e.property === 'reason')).toBe(true);
    expect(deleteErrors.some((e) => e.property === 'reason')).toBe(true);
    expect(markErrors.some((e) => e.property === 'reasonNotAdministered')).toBe(true);
  });

  it('AddTreatmentDto transforma daysOfWeek y valida scheduleType', async () => {
    const dto = plainToInstance(AddTreatmentDto, {
      patientId: '5',
      description: 'Curación',
      scheduleType: 'recurring',
      times: ['09:00'],
      daysOfWeek: ['1', '3', '5'],
      duration: 2,
      durationUnit: 'weeks',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.patientId).toBe(5);
    expect(dto.daysOfWeek).toEqual([1, 3, 5]);
  });

  it('PostponeTaskDto rechaza fecha inválida', async () => {
    const dto = plainToInstance(PostponeTaskDto, { newDateTime: 'no-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newDateTime')).toBe(true);
  });
});
