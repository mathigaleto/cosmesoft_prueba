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
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!pdfLibraryPromise) pdfLibraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('No se pudo iniciar el generador de PDF.'));
    script.onerror = () => reject(new Error('No se pudo cargar el generador de PDF.'));
    document.head.appendChild(script);
  });
  return pdfLibraryPromise;
}

function cvDescriptionText(value = '') {
  const parsed = new DOMParser().parseFromString(String(value), 'text/html');
  parsed.body.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  parsed.body.querySelectorAll('li').forEach(node => node.prepend('• '));
  parsed.body.querySelectorAll('p,li,div').forEach(node => node.append('\n'));
  return (parsed.body.textContent || '').replace(/\u00a0/g, ' ').replace(/[\t ]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function loadLogoPng(url) {
  if (!url) return null;
  let objectUrl = '';
  try {
    const response = await fetch(url, {mode: 'cors', cache: 'force-cache'});
    if (!response.ok) return null;
    objectUrl = URL.createObjectURL(await response.blob());
    const image = new Image(); image.src = objectUrl; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, image.naturalWidth); canvas.height = Math.max(1, image.naturalHeight);
    canvas.getContext('2d').drawImage(image, 0, 0);
    return {data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height};
  } catch { return null; }
  finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
}

export async function openClientCvPdf(cv, clients = []) {
  const data = cv && Array.isArray(cv.items) ? cv : {title: 'Experiencias en implementación de PingERP', intro: '', items: []};
  const items = data.items.filter(entry => entry && String(entry.company || '').trim());
  if (!items.length) { window.alert('No hay experiencias cargadas para exportar. Esperá a que termine la carga del CV e intentá de nuevo.'); return; }

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'status'); overlay.setAttribute('aria-live', 'polite');
  overlay.style.cssText = 'position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:11001;display:flex;align-items:center;justify-content:center;gap:10px;max-width:calc(100vw - 24px);padding:10px 14px;border:1px solid #ffffff2b;border-radius:14px;background:#1b1b1bef;color:#fff;box-shadow:0 6px 24px #0003;font:500 14px/1.4 Arial,sans-serif';
  const pending = document.createElement('span'); pending.textContent = 'Preparando el PDF…'; overlay.appendChild(pending); document.body.appendChild(overlay);
  let pdfUrl = '';
  try {
    const jsPDF = await loadPdfLibrary();
    const pdf = new jsPDF({unit: 'mm', format: 'a4', orientation: 'portrait', compress: true});
    const pageWidth = 210, pageHeight = 297, margin = 9, contentWidth = pageWidth - margin * 2;
    pdf.setProperties({title: data.title || 'Experiencias en implementación de PingERP'});
    const drawWrapped = (text, x, y, width, size, style = 'normal', lineHeight = 5.2) => {
      pdf.setFont('helvetica', style); pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(String(text || ''), width);
      pdf.text(lines, x, y);
      return y + lines.length * lineHeight;
    };
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18);
    const titleLines = pdf.splitTextToSize(data.title || 'Experiencias en implementación de PingERP', contentWidth);
    let y = 15; pdf.text(titleLines, margin, y); y += titleLines.length * 7;
    if (data.intro) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
      const introWidth = contentWidth - 28;
      const introLines = pdf.splitTextToSize(String(data.intro), introWidth);
      pdf.setTextColor(77, 84, 92);
      pdf.text(introLines, pageWidth / 2, y + 2, {align: 'center', lineHeightFactor: 1.25});
      y += introLines.length * 5 + 7;
    } else y += 3;

    const prepared = await Promise.all(items.map(async item => ({item, logo: await loadLogoPng(findClientLogo(item, clients))})));
    for (const {item, logo} of prepared) {
      const textX = margin + 44, textWidth = contentWidth - 52;
      const info = [];
      if (item.sector) info.push(`Rubro: ${item.sector}`);
      if (item.location) info.push(`Ubicación: ${item.location}`);
      const description = cvDescriptionText(item.description || '');
      if (description) info.push(description);
      const textLines = [];
      for (const paragraph of info) {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
        const wrapped = pdf.splitTextToSize(paragraph, textWidth);
        textLines.push(...wrapped);
      }
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
      const nameLines = pdf.splitTextToSize(item.company, textWidth);
      const badgeGap = 2.5, badgeHeight = 5.5;
      const cardHeight = Math.max(35, 8 + nameLines.length * 5.4 + badgeGap + badgeHeight + textLines.length * 4.6 + 5);
      if (y + cardHeight > pageHeight - margin) { pdf.addPage('a4', 'portrait'); y = margin; }
      pdf.setDrawColor(25, 25, 25); pdf.setLineWidth(0.45); pdf.roundedRect(margin, y, contentWidth, cardHeight, 3.5, 3.5, 'S');
      const logoX = margin + 5, logoY = y + 5, logoW = 31, logoH = Math.min(24, cardHeight - 10);
      pdf.setFillColor(249, 250, 251); pdf.setDrawColor(25, 25, 25); pdf.roundedRect(logoX, logoY, logoW, logoH, 2.5, 2.5, 'FD');
      if (logo) {
        const ratio = Math.min((logoW - 4) / logo.width, (logoH - 4) / logo.height);
        const width = logo.width * ratio, height = logo.height * ratio;
        pdf.addImage(logo.data, 'PNG', logoX + (logoW - width) / 2, logoY + (logoH - height) / 2, width, height);
      } else {
        pdf.setTextColor(65, 65, 65); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
        pdf.text(item.company.trim().slice(0, 2).toUpperCase(), logoX + logoW / 2, logoY + logoH / 2 + 2, {align: 'center'});
      }
      pdf.setTextColor(23, 27, 34); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
      pdf.text(nameLines, textX, y + 7.5);
      const badgeY = y + 7.5 + nameLines.length * 5.4 + badgeGap;
      pdf.setFillColor(235, 241, 241); pdf.setDrawColor(235, 241, 241); pdf.roundedRect(textX, badgeY - 3.7, 16, badgeHeight, 2.6, 2.6, 'FD');
      pdf.setTextColor(31, 47, 51); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text('OTV', textX + 8, badgeY, {align: 'center'});
      let textY = badgeY + 5.7;
      if (textLines.length) {
        pdf.setTextColor(66, 75, 85); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
        pdf.text(textLines, textX, textY, {lineHeightFactor: 1.2});
      }
      pdf.setTextColor(23, 27, 34); y += cardHeight + 4;
    }

    const pdfBlob = pdf.output('blob');
    if (pdfBlob.size < 1000) throw new Error('El PDF generado está vacío. Volvé a intentar.');
    const signature = new TextDecoder().decode(await pdfBlob.slice(0, 5).arrayBuffer());
    if (signature !== '%PDF-') throw new Error('El archivo generado no tiene un formato PDF válido.');
    pdfUrl = URL.createObjectURL(pdfBlob);
    overlay.replaceChildren();
    const ready = document.createElement('span'); ready.textContent = 'PDF listo';
    const download = document.createElement('a'); download.href = pdfUrl; download.download = 'Experiencias-PingERP.pdf'; download.textContent = 'Descargar';
    download.style.cssText = 'display:inline-flex;align-items:center;min-height:38px;padding:0 10px;border-radius:8px;background:#fff;color:#171717;font-weight:700;text-decoration:none;white-space:nowrap';
    const open = document.createElement('a'); open.href = pdfUrl; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'Abrir PDF';
    open.style.cssText = 'color:#fff;font-weight:700;text-underline-offset:3px;white-space:nowrap';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Cerrar'); close.style.cssText = 'border:0;background:transparent;color:#fff;font-size:21px;line-height:1;cursor:pointer;padding:0 2px';
    close.addEventListener('click', () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); overlay.remove(); });
    overlay.append(ready, download, open, close);
    const mobileDownload = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobileDownload) { ready.textContent = 'PDF listo. Elegí Abrir PDF o Guardar.'; download.textContent = 'Guardar'; }
    else download.click();
    window.setTimeout(() => { if (overlay.isConnected) { if (pdfUrl) URL.revokeObjectURL(pdfUrl); overlay.remove(); } }, 300000);
  } catch (error) {
    console.error('No se pudo generar el CV en PDF', error);
    pending.textContent = error?.message || 'No se pudo crear el PDF. Revisá la conexión e intentá de nuevo.';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Cerrar'); close.style.cssText = 'border:0;background:transparent;color:#fff;font-size:21px;line-height:1;cursor:pointer;padding:0 2px';
    close.addEventListener('click', () => overlay.remove()); overlay.appendChild(close);
  }
}
