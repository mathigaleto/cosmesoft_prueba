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
  if (window.html2canvas && window.jspdf?.jsPDF) return Promise.resolve({html2canvas: window.html2canvas, jsPDF: window.jspdf.jsPDF});
  if (!pdfLibraryPromise) pdfLibraryPromise = Promise.all([
    window.html2canvas ? Promise.resolve() : new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = resolve; script.onerror = () => reject(new Error('No se pudo cargar el renderizador de páginas.')); document.head.appendChild(script);
    }),
    window.jspdf?.jsPDF ? Promise.resolve() : new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve; script.onerror = () => reject(new Error('No se pudo cargar el generador de PDF.')); document.head.appendChild(script);
    })
  ]).then(() => {
    if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error('No se pudieron iniciar las herramientas del PDF.');
    return {html2canvas: window.html2canvas, jsPDF: window.jspdf.jsPDF};
  });
  return pdfLibraryPromise;
}

export async function openClientCvPdf(cv, clients = []) {
  const data = cv && Array.isArray(cv.items) ? cv : {title: 'Experiencias en implementación de PingERP', intro: '', items: []};
  if (!data.items.some(entry => entry && String(entry.company || '').trim())) {
    window.alert('No hay experiencias cargadas para exportar. Esperá a que termine la carga del CV e intentá de nuevo.');
    return;
  }
  const adminModalWasOpen = document.body.classList.contains('cv-admin-open');
  if (adminModalWasOpen) document.body.classList.remove('cv-admin-open');
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.dataset.cvPdfRender = 'true';
  host.style.cssText = 'position:fixed;left:0;top:0;width:703px;padding:0;margin:0;background:#fff;color:#202124;font:14px/1.5 Arial,sans-serif;box-sizing:border-box;pointer-events:none;opacity:0;z-index:-1';
  const style = document.createElement('style');
  style.textContent = `
    *{box-sizing:border-box}
    .cv-pdf-title{font-size:28px;line-height:1.2;margin:0 0 8px;color:#171b22}
    .cv-pdf-intro{margin:0 0 22px;color:#59616b}
    .cv-pdf-grid{display:block}
    .cv-pdf-page{width:703px;background:#fff;color:#202124;font:14px/1.5 Arial,sans-serif}
    .cv-pdf-card{break-inside:avoid;page-break-inside:avoid;display:grid;grid-template-columns:136px minmax(0,1fr);gap:18px;align-items:center;margin:0 0 14px;padding:16px;border:1.25px solid transparent;border-radius:14px;background:#fff;box-shadow:none}
    .cv-pdf-logo{width:124px;height:100px;display:flex;align-items:center;justify-content:center;padding:8px;border:1.25px solid #c4ceda;border-radius:11px;background:#f9fafb}
    .cv-pdf-logo img{display:block;width:auto!important;height:auto!important;max-width:106px!important;max-height:82px!important;object-fit:contain}
    .cv-pdf-card h2{font-size:18px;line-height:1.3;margin:0 0 6px;color:#171b22}
    .cv-pdf-pill{display:inline-block;margin-bottom:6px;padding:3px 9px;border-radius:20px;background:#eef3f4;color:#24343a;font-size:11px;font-weight:bold}
    .cv-pdf-fact{font-size:12px;line-height:1.5;margin:5px 0;color:#424b55}
    .cv-pdf-card ul,.cv-pdf-card ol{padding-left:18px}
    .cv-pdf-card p,.cv-pdf-card li{orphans:3;widows:3}
  `;
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'status'); overlay.setAttribute('aria-live', 'polite');
  overlay.style.cssText = 'position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);z-index:11001;display:flex;align-items:center;justify-content:center;gap:10px;max-width:calc(100vw - 28px);padding:10px 14px;border:1px solid #ffffff2b;border-radius:14px;background:#1b1b1beF;color:#fff;box-shadow:0 6px 24px #0003;font:500 14px/1.4 Arial,sans-serif';
  const pending = document.createElement('span'); pending.textContent = 'Preparando el PDF…'; overlay.appendChild(pending);
  const title = document.createElement('h1'); title.className = 'cv-pdf-title'; title.textContent = data.title || 'Experiencias en implementación de PingERP';
  const intro = document.createElement('p'); intro.className = 'cv-pdf-intro'; intro.textContent = data.intro || '';
  const grid = document.createElement('main'); grid.className = 'cv-pdf-grid';
  for (const item of data.items.filter(entry => entry && entry.company)) {
    const card = document.createElement('article'); card.className = 'cv-pdf-card';
    const logoUrl = findClientLogo(item, clients);
    const logo = document.createElement('div'); logo.className = 'cv-pdf-logo';
    if (logoUrl) { const image = document.createElement('img'); image.crossOrigin = 'anonymous'; image.src = logoUrl; image.alt = 'Logo de ' + item.company; logo.appendChild(image); }
    card.appendChild(logo);
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
    const {html2canvas, jsPDF} = await loadPdfLibrary();
    await document.fonts?.ready;
    await Promise.all([...host.querySelectorAll('img')].map(image => image.decode?.().catch(() => {}) || Promise.resolve()));
    const pageLimit = 273 / 186 * 703;
    const titleStyle = getComputedStyle(title), introStyle = getComputedStyle(intro);
    const headerHeight = title.getBoundingClientRect().height + parseFloat(titleStyle.marginBottom || 0) + intro.getBoundingClientRect().height + parseFloat(introStyle.marginBottom || 0);
    const groups = [{cards: [], used: headerHeight, header: true}];
    for (const card of [...grid.querySelectorAll('.cv-pdf-card')]) {
      const cardStyle = getComputedStyle(card);
      const height = card.getBoundingClientRect().height + parseFloat(cardStyle.marginBottom || 0);
      let group = groups[groups.length - 1];
      if (group.cards.length && group.used + height > pageLimit) { group = {cards: [], used: 0, header: false}; groups.push(group); }
      group.cards.push(card); group.used += height;
    }
    const pdf = new jsPDF({unit: 'mm', format: 'a4', orientation: 'portrait', compress: true});
    pdf.setProperties({title: data.title || 'Experiencias en implementación de PingERP'});
    for (const [index, group] of groups.entries()) {
      const page = document.createElement('section'); page.className = 'cv-pdf-page';
      page.style.cssText = 'position:relative;left:auto;top:auto;width:703px;z-index:auto;background:#fff';
      if (group.header) page.append(title, intro);
      const pageGrid = document.createElement('main'); pageGrid.className = 'cv-pdf-grid';
      pageGrid.append(...group.cards); page.appendChild(pageGrid); host.appendChild(page);
      const pageHeight = page.scrollHeight;
      const pageRect = page.getBoundingClientRect();
      const cardFrames = group.cards.map(card => {
        const rect = card.getBoundingClientRect();
        return {x: rect.left - pageRect.left, y: rect.top - pageRect.top, width: rect.width, height: rect.height};
      });
      const canvas = await html2canvas(page, {scale: 3, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, x: pageRect.left, y: pageRect.top, width: 703, height: pageHeight, windowWidth: 703, windowHeight: Math.max(window.innerHeight, pageHeight), onclone: clonedDocument => { const renderHost = clonedDocument.querySelector('[data-cv-pdf-render]'); if (renderHost) { renderHost.style.opacity = '1'; renderHost.style.zIndex = '1'; } }});
      if (index > 0) pdf.addPage('a4', 'portrait');
      const pageWidthMm = 186, maxHeightMm = 273;
      let imageHeightMm = canvas.height / canvas.width * pageWidthMm, imageWidthMm = pageWidthMm;
      if (imageHeightMm > maxHeightMm) { const fit = maxHeightMm / imageHeightMm; imageHeightMm = maxHeightMm; imageWidthMm *= fit; }
      const x = (210 - imageWidthMm) / 2;
      const y = 12, scale = imageWidthMm / 703;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, imageWidthMm, imageHeightMm);
      // Draw each company frame as PDF vector after the page image. Canvas rasterization
      // can drop thin horizontal strokes at page/viewport boundaries in some browsers.
      pdf.setDrawColor(25, 25, 25);
      pdf.setLineWidth(0.45);
      for (const frame of cardFrames) {
        const inset = 0.35;
        pdf.roundedRect(
          x + frame.x * scale + inset,
          y + frame.y * scale + inset,
          frame.width * scale - inset * 2,
          frame.height * scale - inset * 2,
          3.7,
          3.7,
          'S'
        );
      }
      page.remove(); canvas.width = 0; canvas.height = 0;
    }
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    overlay.replaceChildren();
    const ready = document.createElement('span'); ready.textContent = 'PDF listo';
    const download = document.createElement('a'); download.href = pdfUrl; download.download = 'Experiencias-PingERP.pdf'; download.textContent = 'Descargar';
    download.style.cssText = 'display:inline-flex;align-items:center;min-height:38px;padding:0 10px;border-radius:8px;background:#fff;color:#171717;font-weight:700;text-decoration:none;white-space:nowrap';
    const open = document.createElement('a'); open.href = pdfUrl; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Abrir';
    open.style.cssText = 'color:#fff;font-weight:700;text-underline-offset:3px;white-space:nowrap';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Cerrar'); close.style.cssText = 'border:0;background:transparent;color:#fff;font-size:21px;line-height:1;cursor:pointer;padding:0 2px';
    close.addEventListener('click', () => { URL.revokeObjectURL(pdfUrl); overlay.remove(); });
    overlay.append(ready, download, open, close);
    const mobileDownload = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobileDownload) { ready.textContent = 'PDF listo. Tocá Guardar PDF para descargarlo.'; download.textContent = 'Guardar PDF'; }
    else download.click();
    window.setTimeout(() => { if (overlay.isConnected) { URL.revokeObjectURL(pdfUrl); overlay.remove(); } }, mobileDownload ? 120000 : 20000);
  } catch (error) {
    console.error('No se pudo descargar el CV en PDF', error);
    pending.textContent = 'No se pudo crear el PDF. Recargá e intentá otra vez.';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Cerrar'); close.style.cssText = 'border:0;background:transparent;color:#fff;font-size:21px;line-height:1;cursor:pointer;padding:0 2px'; close.addEventListener('click', () => overlay.remove()); overlay.appendChild(close);
  } finally {
    host.remove();
    if (adminModalWasOpen && document.getElementById('clientCvAdminModal')?.hidden === false) document.body.classList.add('cv-admin-open');
  }
}
