import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AddMedicationDto,
  DeleteMedicationDto,
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

  it('Suspend/Delete exigen razón mínima de 10 caracteres', async () => {
    const suspend = plainToInstance(SuspendMedicationDto, { reason: 'corta' });
    const del = plainToInstance(DeleteMedicationDto, { reason: 'corta' });

    const suspendErrors = await validate(suspend);
    const deleteErrors = await validate(del);

    expect(suspendErrors.some((e) => e.property === 'reason')).toBe(true);
    expect(deleteErrors.some((e) => e.property === 'reason')).toBe(true);
  });
});
