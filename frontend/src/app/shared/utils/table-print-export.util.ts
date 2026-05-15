export interface PrintTableDocumentOptions {
  title: string;
  generatedAtLabel: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  emptyWarning?: () => void;
  onPrintWindowBlocked?: () => void;
}

function escapeHtml(value: string | number): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Abre ventana de impresión con tabla HTML (mismo patrón que panel farmacia). */
export function printTableDocument(options: PrintTableDocumentOptions): void {
  const { title, generatedAtLabel, headers, rows, emptyWarning, onPrintWindowBlocked } = options;

  if (!rows.length) {
    emptyWarning?.();
    return;
  }

  const now = new Date().toLocaleString('es-ES');
  const thead = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 16px; color: #1a202c; }
      h1 { margin: 0 0 6px; font-size: 18px; }
      p { margin: 0 0 12px; color: #4a5568; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e0; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #edf2f7; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(generatedAtLabel)} ${escapeHtml(now)}</p>
    <table>
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
    <script>window.onload = () => { window.print(); };</script>
  </body>
</html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    onPrintWindowBlocked?.();
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
