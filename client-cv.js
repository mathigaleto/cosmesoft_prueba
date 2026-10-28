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
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(21);
    const titleLines = pdf.splitTextToSize(data.title || 'Experiencias en implementación de PingERP', contentWidth);
    let y = 16; pdf.text(titleLines, pageWidth / 2, y, {align: 'center'}); y += titleLines.length * 8;
    if (data.intro) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
      const introWidth = contentWidth - 14;
      const introLines = pdf.splitTextToSize(String(data.intro), introWidth);
      pdf.setTextColor(77, 84, 92);
      pdf.text(introLines, margin + 7, y + 2, {lineHeightFactor: 1.2});
      y += introLines.length * 4.8 + 7;
    } else y += 3;

    const prepared = await Promise.all(items.map(async item => ({item, logo: await loadLogoPng(findClientLogo(item, clients))})));
    const cardWidth = (contentWidth - 6) / 2;
    const cards = prepared.map(({item, logo}, index) => {
      const x = margin + (index % 2) * (cardWidth + 6), textX = x + 29, textWidth = cardWidth - 34;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11.5);
      const nameLines = pdf.splitTextToSize(item.company, textWidth);
      const solution = String(item.solution || '').trim() || 'PingERP';
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
      const solutionLines = pdf.splitTextToSize(solution, textWidth - 4);
      const info = [];
      if (item.sector) info.push(`Rubro: ${item.sector}`);
      if (item.location) info.push(`Ubicación: ${item.location}`);
      const description = cvDescriptionText(item.description || '');
      if (description) info.push(description);
      const infoLines = [];
      for (const paragraph of info) {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
        infoLines.push(...pdf.splitTextToSize(paragraph, textWidth));
      }
      const cardHeight = Math.max(37, 6 + nameLines.length * 4.5 + 2 + Math.max(5, solutionLines.length * 3.7) + 3 + infoLines.length * 3.8 + 5);
      return {item, logo, x, textX, textWidth, nameLines, solution, solutionLines, infoLines, cardHeight};
    });
    for (let row = 0; row < cards.length; row += 2) {
      const rowCards = cards.slice(row, row + 2), rowHeight = Math.max(...rowCards.map(card => card.cardHeight));
      if (y + rowHeight > pageHeight - margin) { pdf.addPage('a4', 'portrait'); y = margin; }
      for (const card of rowCards) {
        const {item, logo, x, textX, textWidth, nameLines, solution, solutionLines, infoLines} = card;
        pdf.setDrawColor(25, 25, 25); pdf.setLineWidth(0.4); pdf.roundedRect(x, y, cardWidth, rowHeight, 2.8, 2.8, 'S');
        const logoW = 20, logoH = 18, logoX = x + 4, logoY = y + (rowHeight - logoH) / 2;
        pdf.setFillColor(249, 250, 251); pdf.setDrawColor(25, 25, 25); pdf.roundedRect(logoX, logoY, logoW, logoH, 2, 2, 'FD');
        if (logo) {
          const ratio = Math.min((logoW - 3) / logo.width, (logoH - 3) / logo.height);
          const width = logo.width * ratio, height = logo.height * ratio;
          pdf.addImage(logo.data, 'PNG', logoX + (logoW - width) / 2, logoY + (logoH - height) / 2, width, height);
        } else {
          pdf.setTextColor(65, 65, 65); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
          pdf.text(item.company.trim().slice(0, 2).toUpperCase(), logoX + logoW / 2, logoY + logoH / 2 + 1.5, {align: 'center'});
        }
        pdf.setTextColor(23, 27, 34); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11.5);
        pdf.text(nameLines, textX, y + 5.2, {lineHeightFactor: 1.05});
        let textY = y + 5.2 + nameLines.length * 4.5 + 1.5;
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); const solutionWidth = Math.min(textWidth, Math.max(17, ...solutionLines.map(line => pdf.getTextWidth(line) + 5)));
        const solutionHeight = Math.max(5, solutionLines.length * 3.7 + 1);
        pdf.setFillColor(235, 241, 241); pdf.setDrawColor(221, 229, 230); pdf.roundedRect(textX, textY - 3.5, solutionWidth, solutionHeight, 1.8, 1.8, 'FD');
        pdf.setTextColor(31, 47, 51); pdf.text(solutionLines, textX + 2.5, textY, {lineHeightFactor: 1.05});
        textY += solutionHeight + 2;
        if (infoLines.length) {
          pdf.setTextColor(66, 75, 85); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
          pdf.text(infoLines, textX, textY, {lineHeightFactor: 1.05});
        }
      }
      y += rowHeight + 4;
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
