/** Fragmento de usuario de sesión necesario para la cabecera del dashboard enfermería. */
export type NurseDashboardHeaderUserLike = {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

export function nurseDashboardHeaderUserDisplayName(
  user: NurseDashboardHeaderUserLike | null | undefined,
  fallbackNurseName: string
): string {
  if (user) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }
  return fallbackNurseName;
}

export function nurseDashboardHeaderUserPhoneLine(phone: unknown): string | null {
  const s = phone != null ? String(phone).trim() : '';
  return s.length > 0 ? s : null;
}
