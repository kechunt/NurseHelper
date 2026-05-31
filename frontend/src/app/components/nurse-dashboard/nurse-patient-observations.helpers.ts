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
