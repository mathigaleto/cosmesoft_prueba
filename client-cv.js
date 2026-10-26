const RICH_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'UL', 'OL', 'LI']);

export function sanitizeRichHtml(value = '') {
  const parsed = new DOMParser().parseFromString(String(value), 'text/html');
  const cleanChildren = parent => [...parent.childNodes].map(node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    if (!RICH_TAGS.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      fragment.append(...cleanChildren(node));
      return fragment;
    }
    const clean = document.createElement(node.tagName.toLowerCase());
    clean.append(...cleanChildren(node));
    return clean;
  });
  const fragment = document.createDocumentFragment();
  fragment.append(...cleanChildren(parsed.body));
  const wrapper = document.createElement('div'); wrapper.append(fragment);
  return wrapper.innerHTML;
}

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function findClientLogo(item, clients = []) {
  if (/^https:\/\//i.test(item?.logo || '')) return item.logo;
  const wanted = normalize(item?.logoClient || item?.company);
  if (!wanted) return '';
  const exact = clients.find(client => normalize(client?.name) === wanted);
  if (exact && /^https:\/\//i.test(exact.logo || '')) return exact.logo;
  const close = clients.find(client => {
    const name = normalize(client?.name);
    return name && (name.includes(wanted) || wanted.includes(name)) && Math.min(name.length, wanted.length) >= 6;
  });
  return close && /^https:\/\//i.test(close.logo || '') ? close.logo : '';
}

export function openClientCvPdf(cv, clients = []) {
  const data = cv && Array.isArray(cv.items) ? cv : {title: 'Experiencias en implementación de PingERP', intro: '', items: []};
  const printWindow = window.open('', '_blank');
  if (!printWindow) { window.alert('Permití las ventanas emergentes para exportar el PDF.'); return; }
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const rows = data.items.filter(item => item && item.company).map(item => {
    const logo = findClientLogo(item, clients);
    return `<article class="card">${logo ? `<img src="${escape(logo)}" alt="Logo de ${escape(item.company)}">` : ''}<div><h2>${escape(item.company)}</h2><span class="pill">${escape(item.solution || 'PingERP')}</span>${item.sector ? `<p><b>Rubro:</b> ${escape(item.sector)}</p>` : ''}${item.location ? `<p><b>Ubicación:</b> ${escape(item.location)}</p>` : ''}${item.description ? `<div>${sanitizeRichHtml(item.description)}</div>` : ''}</div></article>`;
  }).join('');
  printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(data.title)}</title><base href="${escape(location.origin)}/"><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#202124;margin:0}header{margin-bottom:24px}header p{color:#555}h1{font-size:28px;line-height:1.2;margin:0 0 8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{break-inside:avoid;display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:start;padding:14px;border:1px solid #dedede;border-radius:12px;margin:0 0 12px}.card img{width:88px;height:76px;object-fit:contain}.card h2{font-size:17px;margin:0 0 5px}.pill{display:inline-block;margin-bottom:5px;padding:3px 9px;border-radius:20px;background:#edf2f1;font-size:11px;font-weight:bold}.card p{font-size:12px;margin:4px 0;color:#444}.card b{color:#222}.card ul,.card ol{padding-left:18px}.card p,.card li{orphans:3;widows:3}@media print{.card{box-shadow:none}}</style></head><body><header><h1>${escape(data.title)}</h1><p>${escape(data.intro)}</p></header><main class="grid">${rows}</main><script>window.addEventListener('load',()=>{Promise.all([...document.images].map(image=>image.decode?.().catch(()=>{})||Promise.resolve())).then(()=>setTimeout(()=>window.print(),250))});<\/script></body></html>`);
  printWindow.document.close();
}
