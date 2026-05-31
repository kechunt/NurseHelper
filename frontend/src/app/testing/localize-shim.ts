/** Shim de $localize para specs sin compilación i18n completa. */
export function ensureLocalizeShim(): void {
  const g = globalThis as typeof globalThis & { $localize?: typeof $localize };
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = ((strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '')) as typeof $localize;
}
