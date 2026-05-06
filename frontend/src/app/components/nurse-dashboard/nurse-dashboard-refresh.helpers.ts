export function shouldRefreshSelectedPatientAfterSave(input: {
  showPatientModal: boolean;
  selectedPatientId: string | null | undefined;
  affectedPatientId: number;
}): boolean {
  if (!input.showPatientModal || !input.selectedPatientId) {
    return false;
  }
  const selectedId = Number.parseInt(input.selectedPatientId, 10);
  return Number.isFinite(selectedId) && selectedId === input.affectedPatientId;
}

export function taskMutationsShouldReloadHistory(options: {
  reloadDayHistory?: boolean;
}): boolean {
  return !!options.reloadDayHistory;
}
