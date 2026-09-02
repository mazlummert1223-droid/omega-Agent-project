const SANDBOX_RUNTIME = `
<script>
(() => {
  const send = (type, payload = {}) => {
    try { window.parent.postMessage({ source: 'omega-sandbox', type, ...payload }, '*'); } catch {}
  };
  window.addEventListener('error', event => send('error', {
    message: event.message || 'Beklenmeyen JavaScript hatası',
    line: event.lineno || 0
  }));
  window.addEventListener('unhandledrejection', event => send('error', {
    message: String(event.reason?.message || event.reason || 'İşlenmemiş Promise hatası')
  }));
  window.addEventListener('load', () => send('ready'));
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    send('log', { message: args.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ') });
  };
})();
</script>`;

export function normalizeSandboxHtml(source: string): string {
  const raw = String(source || '').trim();
  const fenced = raw.match(/^```(?:html|xml)?\s*([\s\S]*?)\s*```$/i);
  const html = (fenced?.[1] || raw).trim();
  if (!html) return '<!doctype html><html><body><p>Önizlenecek kod yok.</p></body></html>';
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, `${SANDBOX_RUNTIME}</body>`);
  return `${html}${SANDBOX_RUNTIME}`;
}