/* Utilitários de interface: escape de HTML (todo texto vindo de save é escapado), dinheiro e avisos rápidos */

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const money = v => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('pt-BR')}`;

export function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v; else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  if (html) node.innerHTML = html;
  return node;
}

let toastArea = null;
export function toast(message, kind = '') {
  if (!toastArea) { toastArea = el('div', { class: 'toast-area', role: 'status', 'aria-live': 'polite' }); document.getElementById('ui').append(toastArea); }
  const t = el('div', { class: `toast ${kind}` });
  t.textContent = message;
  toastArea.prepend(t);
  while (toastArea.children.length > 5) toastArea.lastChild.remove();
  setTimeout(() => t.remove(), 4200);
}

/* Faz o navegador baixar um texto como arquivo */
export function downloadText(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
