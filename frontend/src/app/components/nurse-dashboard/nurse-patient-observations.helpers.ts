/** Líneas no vacías conservando el texto tal cual (p. ej. `[fecha] nota` en observaciones médicas). */
export function splitObservationLines(text: string | undefined | null): string[] {
  if (!text?.trim()) {
    return [];
  }
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Líneas de texto para la vista de lista de observaciones generales (sin prefijo [timestamp]). */
export function parseObservationsDisplayList(
  generalObservations: string | undefined | null
): string[] {
  if (!generalObservations) {
    return [];
  }
  return generalObservations
    .split('\n')
    .filter((obs) => obs.trim().length > 0)
    .map((obs) => {
      const timestampPattern = /^\[.*?\]\s*/;
      return obs.replace(timestampPattern, '').trim();
    })
    .filter((obs) => obs.length > 0);
}
