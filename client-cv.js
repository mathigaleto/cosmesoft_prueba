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
  const company = normalize(item?.logoClient || item?.company);
  if (/(^|\s)w\s*7(\s|$)/i.test(company)) return '/assets/clients/dobleu-seven.webp?v=w7-cv-20261026';
  const wanted = company;
  if (!wanted) return '';
  const exact = clients.find(client => normalize(client?.name) === wanted);
  if (exact && /^https:\/\//i.test(exact.logo || '')) return exact.logo;
  const close = clients.find(client => {
    const name = normalize(client?.name);
    return name && (name.includes(wanted) || wanted.includes(name)) && Math.min(name.length, wanted.length) >= 6;
  });
  return close && /^https:\/\//i.test(close.logo || '') ? close.logo : '';
}

let pdfLibraryPromise;

function loadPdfLibrary() {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (!pdfLibraryPromise) pdfLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
    script.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('No se pudo iniciar el generador PDF.'));
    script.onerror = () => reject(new Error('No se pudo cargar el generador PDF.'));
    document.head.appendChild(script);
  });
  return pdfLibraryPromise;
}

export async function openClientCvPdf(cv, clients = []) {
  const data = cv && Array.isArray(cv.items) ? cv : {title: 'Experiencias en implementación de PingERP', intro: '', items: []};
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:relative;left:auto;top:auto;width:703px;padding:0;margin:0 auto;background:#fff;color:#202124;font:14px/1.5 Arial,sans-serif;box-sizing:border-box';
  const style = document.createElement('style');
  style.textContent = '*{box-sizing:border-box}.cv-pdf-title{font-size:28px;line-height:1.2;margin:0 0 8px}.cv-pdf-intro{margin:0 0 22px;color:#555}.cv-pdf-grid{display:block}.cv-pdf-card{break-inside:avoid;page-break-inside:avoid;display:grid;grid-template-columns:92px minmax(0,1fr);gap:14px;align-items:start;margin:0 0 12px;padding:14px;border:1px solid #dedede;border-radius:12px;background:#fff}.cv-pdf-card img{width:88px;height:76px;object-fit:contain}.cv-pdf-card h2{font-size:17px;line-height:1.3;margin:0 0 5px}.cv-pdf-pill{display:inline-block;margin-bottom:5px;padding:3px 9px;border-radius:20px;background:#edf2f1;font-size:11px;font-weight:bold}.cv-pdf-fact{font-size:12px;margin:4px 0;color:#444}.cv-pdf-card ul,.cv-pdf-card ol{padding-left:18px}.cv-pdf-card p,.cv-pdf-card li{orphans:3;widows:3}';
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'status'); overlay.setAttribute('aria-live', 'polite');
  overlay.textContent = 'Preparando el PDF…';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:11001;display:grid;place-items:center;background:rgba(255,255,255,.96);color:#222;font:600 16px Arial,sans-serif';
  const title = document.createElement('h1'); title.className = 'cv-pdf-title'; title.textContent = data.title || 'Experiencias en implementación de PingERP';
  const intro = document.createElement('p'); intro.className = 'cv-pdf-intro'; intro.textContent = data.intro || '';
  const grid = document.createElement('main'); grid.className = 'cv-pdf-grid';
  for (const item of data.items.filter(entry => entry && entry.company)) {
    const card = document.createElement('article'); card.className = 'cv-pdf-card';
    const logoUrl = findClientLogo(item, clients);
    if (logoUrl) { const image = document.createElement('img'); image.crossOrigin = 'anonymous'; image.src = logoUrl; image.alt = 'Logo de ' + item.company; card.appendChild(image); }
    else { const empty = document.createElement('span'); empty.setAttribute('aria-hidden', 'true'); card.appendChild(empty); }
    const content = document.createElement('div');
    const company = document.createElement('h2'); company.textContent = item.company; content.appendChild(company);
    const solution = document.createElement('span'); solution.className = 'cv-pdf-pill'; solution.textContent = item.solution || 'PingERP'; content.appendChild(solution);
    [['Rubro', item.sector], ['Ubicación', item.location]].forEach(([label, value]) => {
      if (!value) return;
      const line = document.createElement('p'); line.className = 'cv-pdf-fact';
      const strong = document.createElement('strong'); strong.textContent = label + ': ';
      line.append(strong, document.createTextNode(value)); content.appendChild(line);
    });
    if (item.description) { const description = document.createElement('div'); description.className = 'cv-pdf-fact'; description.innerHTML = sanitizeRichHtml(item.description); content.appendChild(description); }
    card.appendChild(content); grid.appendChild(card);
  }
  host.append(style, title, intro, grid); document.body.append(host, overlay);
  try {
    const html2pdf = await loadPdfLibrary();
    await Promise.all([...host.querySelectorAll('img')].map(image => image.decode?.().catch(() => {}) || Promise.resolve()));
    const pdfBlob = await html2pdf().set({
      margin: [12, 12, 12, 12],
      image: {type: 'jpeg', quality: 0.98},
      html2canvas: {scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0},
      jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait', compress: true},
      pagebreak: {mode: ['css', 'legacy'], avoid: '.cv-pdf-card'}
    }).from(host).outputPdf('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    overlay.replaceChildren();
    const panel = document.createElement('section');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.style.cssText = 'width:min(92vw,460px);padding:28px;border:1px solid #ddd;border-radius:16px;background:#fff;box-shadow:0 12px 48px #0003;text-align:center';
    const ready = document.createElement('h2'); ready.textContent = 'El PDF está listo'; ready.style.cssText = 'margin:0 0 8px;font-size:22px';
    const note = document.createElement('p'); note.textContent = 'Si no se descargó automáticamente, elegí “Descargar PDF”.'; note.style.cssText = 'margin:0 0 20px;font-weight:400;color:#555';
    const actions = document.createElement('div'); actions.style.cssText = 'display:flex;justify-content:center;flex-wrap:wrap;gap:10px';
    const download = document.createElement('a'); download.href = pdfUrl; download.download = 'Experiencias-PingERP.pdf'; download.textContent = 'Descargar PDF';
    download.style.cssText = 'padding:11px 18px;border-radius:24px;background:#171717;color:#fff;text-decoration:none;font-weight:700';
    const open = document.createElement('a'); open.href = pdfUrl; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Abrir PDF';
    open.style.cssText = 'padding:11px 18px;border:1px solid #ccc;border-radius:24px;color:#171717;text-decoration:none;font-weight:700';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Cerrar'; close.style.cssText = 'margin-top:18px;padding:8px 14px;border:0;background:transparent;color:#555;text-decoration:underline;cursor:pointer';
    close.addEventListener('click', () => { URL.revokeObjectURL(pdfUrl); overlay.remove(); });
    actions.append(download, open); panel.append(ready, note, actions, close); overlay.appendChild(panel);
    download.click();
  } catch (error) {
    console.error('No se pudo descargar el CV en PDF', error);
    overlay.textContent = 'No se pudo crear el PDF. Recargá el admin e intentá otra vez.';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Cerrar'; close.addEventListener('click', () => overlay.remove());
    overlay.appendChild(close);
  } finally {
    host.remove();
  }
}
