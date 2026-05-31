import { splitObservationLines } from './nurse-patient-observations.helpers';

describe('splitObservationLines', () => {
  it('devuelve vacío con null o texto vacío', () => {
    expect(splitObservationLines(undefined)).toEqual([]);
    expect(splitObservationLines(null)).toEqual([]);
    expect(splitObservationLines('   ')).toEqual([]);
  });

  it('preserva el contenido de cada línea (incluye prefijos de fecha)', () => {
    const input = '[05/05/2026] Estable\n  Segunda línea  ';
    expect(splitObservationLines(input)).toEqual(['[05/05/2026] Estable', 'Segunda línea']);
  });
});
