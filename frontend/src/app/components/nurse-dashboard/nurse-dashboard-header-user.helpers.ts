/** Fragmento de usuario de sesión necesario para la cabecera del dashboard enfermería. */
export type NurseDashboardHeaderUserLike = {
  firstName?: string | null;
  lastName?: string | null;
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
