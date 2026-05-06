import { parseObservationsDisplayList, splitObservationLines } from './nurse-patient-observations.helpers';

describe('parseObservationsDisplayList', () => {
  it('devuelve vacío con null/undefined/cadena vacía', () => {
    expect(parseObservationsDisplayList(undefined)).toEqual([]);
    expect(parseObservationsDisplayList(null)).toEqual([]);
    expect(parseObservationsDisplayList('')).toEqual([]);
  });

  it('separa por líneas y quita vacías', () => {
    const input = 'Primera observacion\n\n  \nSegunda observacion';
    expect(parseObservationsDisplayList(input)).toEqual([
      'Primera observacion',
      'Segunda observacion',
    ]);
  });

  it('elimina prefijo [timestamp] al inicio de cada línea', () => {
    const input = '[2026-05-04 08:30] Control de signos\n[abc]  Con dolor leve';
    expect(parseObservationsDisplayList(input)).toEqual([
      'Control de signos',
      'Con dolor leve',
    ]);
  });

  it('conserva texto normal cuando no hay prefijo entre corchetes', () => {
    const input = 'Observacion libre\n[NoCierra observacion';
    expect(parseObservationsDisplayList(input)).toEqual([
      'Observacion libre',
      '[NoCierra observacion',
    ]);
  });
});

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
