import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jeonzbisrwukbpvydcyh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_c4VeVqtYXYGMtzTBoBfiKg_gCf_vut-';
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el && typeof value === 'string') el.textContent = value;
}

function setLinkLabel(selector, value) {
  const el = document.querySelector(selector);
  if (!el || !value) return;
  const text = [...el.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
  if (text) text.nodeValue = ` ${value} `;
  else el.prepend(document.createTextNode(`${value} `));
}

function renderClients(clients) {
  const track = document.querySelector('#clientTrack');
  if (!track || !Array.isArray(clients)) return;
  const section = track.closest('.clients');
  if (!clients.length) { track.replaceChildren(); if (section) section.hidden = true; return; }
  const valid = clients.filter(client => client && client.name && client.logo && /^https:\/\//i.test(client.logo));
  if (!valid.length) { track.replaceChildren(); if (section) section.hidden = true; return; }
  if (section) section.hidden = false;
  const makeGroup = hidden => {
    const group = document.createElement('div');
    group.className = 'client-group';
    if (hidden) group.setAttribute('aria-hidden', 'true');
    valid.forEach(client => {
      const figure = document.createElement('figure'); figure.className = 'client-logo';
      const logoName = client.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (logoName.includes('organizacion de los estados') || logoName.startsWith('oea')) figure.classList.add('client-logo--oea');
      if (logoName === 'cosmesoft') figure.classList.add('client-logo--cosmesoft');
      if (logoName.includes('ruta 10')) figure.classList.add('client-logo--ruta');
      if (logoName === 'shell') figure.classList.add('client-logo--shell');
      const img = document.createElement('img');
      // Older Supabase content still points to this project's former GitHub Pages
      // hostname. Rebase those bundled client assets to the site currently serving
      // the page, so the same committed logos work on the Linux deployment too.
      let logoUrl = client.logo;
      try {
        const parsedLogo = new URL(client.logo);
        const oldRepoPrefix = '/cosmesoft_prueba/assets/clients/';
        if (parsedLogo.hostname === 'mathigaleto.github.io' && parsedLogo.pathname.startsWith(oldRepoPrefix)) {
          logoUrl = `${location.origin}/assets/clients/${parsedLogo.pathname.slice(oldRepoPrefix.length)}${parsedLogo.search}`;
        }
      } catch {}
      img.src = logoUrl; img.alt = `Logo de ${client.name}`; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => {
        if (logoUrl !== client.logo) return;
        try {
          const parsedLogo = new URL(client.logo);
          if (parsedLogo.hostname === 'mathigaleto.github.io' && parsedLogo.pathname.startsWith('/cosmesoft_prueba/assets/clients/')) {
            img.src = `${location.origin}/assets/clients/${parsedLogo.pathname.split('/').pop()}${parsedLogo.search}`;
          }
        } catch {}
      }, { once: true });
      const fitLogo = () => { if (img.naturalWidth > img.naturalHeight * 2.45) figure.classList.add('client-logo--wide'); };
      img.addEventListener('load', fitLogo, { once: true });
      if (img.complete) fitLogo();
      const caption = document.createElement('figcaption'); caption.textContent = client.name;
      figure.append(img, caption); group.appendChild(figure);
    });
    return group;
  };
  track.replaceChildren(makeGroup(false), makeGroup(true));
  track.getAnimations().forEach(animation => animation.cancel());
  track.style.animation = 'none'; void track.offsetWidth; track.style.animation = '';
}

function renderCompanyProfiles(profiles) {
  const grid = document.querySelector('#companyProfilesGrid');
  if (!grid || !Array.isArray(profiles)) return;
  const valid = profiles.filter(item => item && item.name && item.sector && item.description);
  const section = grid.closest('.company-cases');
  if (!valid.length) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;
  grid.replaceChildren(...valid.map(item => {
    const card = document.createElement('article'); card.className = 'company-case reveal';
    const sector = document.createElement('p'); sector.className = 'company-case-sector'; sector.textContent = item.sector;
    const title = document.createElement('h3'); title.textContent = item.name;
    const description = document.createElement('p'); description.textContent = item.description;
    card.append(sector, title, description);
    return card;
  }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    grid.querySelectorAll('.reveal').forEach(card => observer.observe(card));
  } else grid.querySelectorAll('.reveal').forEach(card => card.classList.add('visible'));
}

function updateItems(selector, items, fields, className) {
  const container = document.querySelector(selector);
  if (!container || !Array.isArray(items) || !items.length) return;
  let cards = [...container.children];
  while (cards.length < items.length && cards.length) {
    const copy = cards[0].cloneNode(true); copy.classList.add('visible'); container.appendChild(copy); cards.push(copy);
  }
  cards.forEach((card, index) => {
    const item = items[index];
    if (!item) { card.hidden = true; return; }
    card.hidden = false;
    if (className === 'project') {
      card.dataset.kind = ['system', 'app', 'site'].includes(item.kind) ? item.kind : 'system';
      const art = card.querySelector('.project-art');
      if (art) {
        if (!art.dataset.defaultMarkup) art.dataset.defaultMarkup = art.innerHTML;
        if (item.image && /^https:\/\//i.test(item.image)) {
          const image = document.createElement('img'); image.src = item.image; image.alt = item.title ? 'Imagen de ' + item.title : 'Imagen del proyecto'; image.loading = 'lazy'; image.decoding = 'async';
          art.replaceChildren(image); art.classList.add('has-custom-image');
        } else { art.innerHTML = art.dataset.defaultMarkup; art.classList.remove('has-custom-image'); }
      }
    }
    fields.forEach(([selectorInCard, key]) => { const el = card.querySelector(selectorInCard); if (el && item[key] != null) el.textContent = item[key]; });
  });
}

const EXTRA_TARGETS = {
  heroEyebrow: ['.hero .eyebrow'], heroPrimaryCta: ['.hero .actions a:first-child', true], heroSecondaryCta: ['.hero .actions a:last-child', true], proofBadge1: ['.avatars i:nth-child(1)'], proofBadge2: ['.avatars i:nth-child(2)'], proofBadge3: ['.avatars i:nth-child(3)'], proofline: ['.proofline > span'],
  moreEyebrow: ['.morecopy .eyebrow'], moreTitle: ['.morecopy h2'], moreIntro: ['.morecopy > p'],
  benefit1Title: ['.benefits .benefit:nth-child(1) b'], benefit1Text: ['.benefits .benefit:nth-child(1) span'], benefit2Title: ['.benefits .benefit:nth-child(2) b'], benefit2Text: ['.benefits .benefit:nth-child(2) span'], benefit3Title: ['.benefits .benefit:nth-child(3) b'], benefit3Text: ['.benefits .benefit:nth-child(3) span'],
  reportTitle: ['.report-top strong'], reportBadge: ['.report-top span'], reportMetric: ['.report-num'], reportNote: ['.report-note'], reportBottom: ['.report-bottom span:first-child'], reportPill: ['.report-bottom .pill'],
  heroArtLabel: ['.fc1 .card-label'], heroArtMetric: ['.fc1 .metric'], heroWindowTitle: ['.window-top > span:first-child'], heroWindowHeading: ['.dash-title'], heroWindowText: ['.dash-sub'], heroCardLabel: ['.fc2 .card-label'], heroCardText: ['.fc2 > div:nth-child(2)'], heroCardSubtext: ['.fc2 > div:nth-child(3)'], heroArtFooter: ['.fc3'],
  worksEyebrow: ['.works .eyebrow'], worksTitle: ['.works .sectionhead h2'], filterAll: ['.filter[data-filter="all"]', true], filterApps: ['.filter[data-filter="app"]', true], filterSystems: ['.filter[data-filter="system"]', true], filterSites: ['.filter[data-filter="site"]', true], caseNote: ['.case-note'],
  processEyebrow: ['.process .eyebrow'], processTitle: ['.process .sectionhead h2'], processIntro: ['.process .sectionhead > p'],

  trustIntro: ['.trustlabel'], trustCategory1: ['.trustlogos span:nth-child(1)'], trustCategory2: ['.trustlogos span:nth-child(2)'], trustCategory3: ['.trustlogos span:nth-child(3)'], trustCategory4: ['.trustlogos span:nth-child(4)'], clientsTitle: ['.clients-title'], companyCasesEyebrow: ['.company-cases .eyebrow'], companyCasesTitle: ['#companyCasesTitle'], companyCasesIntro: ['.company-cases .sectionhead > p'], companyCasesSource: ['.company-cases-source'],
  aboutEyebrow: ['.aboutcopy .eyebrow'], aboutBadge: ['.about-badge'], contactEyebrow: ['.contact .eyebrow'],
  navServices: ['.links a[href="#servicios"]', true], navWorks: ['.links a[href="#trabajos"]', true], navProcess: ['.links a[href="#proceso"]', true], navAbout: ['.links a[href="#nosotros"]', true], navContact: ['.navcta', true], serviceEyebrow: ['.services .eyebrow'],
  serviceLink1: ['.service-grid .service:nth-child(1) .textlink', true], serviceLink2: ['.service-grid .service:nth-child(2) .textlink', true], serviceLink3: ['.service-grid .service:nth-child(3) .textlink', true], mapLabel: ['.map-float', true], socialInstagram: ['.social-pop a:nth-child(1)'], socialFacebook: ['.social-pop a:nth-child(2)'], socialWhatsapp: ['.social-pop a:nth-child(3)'], contactMapLabel: ['.contactdetails a:nth-child(3)', true], contactWebsiteLabel: ['.contactdetails a:nth-child(4)', true],
  footerServices: ['.footerlinks a[href="#servicios"]'], footerWorks: ['.footerlinks a[href="#trabajos"]'], footerContact: ['.footerlinks a[href="#contacto"]'], footerWebsite: ['.footerlinks a[href^="https://prueba.cosmesoft.com.py"]', true],
  formNameLabel: ['label[for="nombre"]'], formCompanyLabel: ['label[for="empresa"]'], formEmailLabel: ['label[for="email"]'], formMessageLabel: ['label[for="mensaje"]'], formButton: ['#contactForm button', true], formHint: ['.formhint'], footerText: ['#footerCopy']
};

function applyContent(content) {
  setText('.hero h1', content.heroTitle);
  setText('.hero-copy', content.heroText);
  setText('.services .sectionhead h2', content.servicesTitle);
  setText('.services .sectionhead > p', content.servicesIntro);
  if (Array.isArray(content.services)) document.querySelectorAll('.service-grid .service').forEach((card, index) => {
    const service = content.services[index]; if (!service) return;
    setTextFor(card, 'h3', service.title); setTextFor(card, 'p', service.description);
    const link = card.querySelector('.textlink'); if (link && service.link) { const node=[...link.childNodes].find(n=>n.nodeType===Node.TEXT_NODE); if(node)node.nodeValue=`${service.link} `; }
  });
  setText('.aboutcopy h2', content.aboutTitle);
  if (Array.isArray(content.aboutParagraphs)) {
    const column = document.querySelector('.aboutcopy'); const existing = [...column.querySelectorAll(':scope > p')];
    content.aboutParagraphs.forEach((text,index)=>{let p=existing[index];if(!p){p=document.createElement('p');column.querySelector('.aboutfacts').before(p)}p.textContent=text;});
    existing.slice(content.aboutParagraphs.length).forEach(p=>p.hidden=true);
  }
  setText('.contact h2', content.contactTitle); setText('.contactgrid > div > p', content.contactIntro);
  const links = document.querySelectorAll('.contactdetails a');
  if (links[0] && content.phone) { links[0].href = `tel:${content.phone.replace(/[^+\d]/g, '')}`; links[0].lastChild.textContent = content.phone; }
  if (links[1] && content.email) { links[1].href = `mailto:${content.email}`; links[1].lastChild.textContent = content.email; }
  if (links[2] && content.mapUrl) links[2].href = content.mapUrl;
  if (links[3] && content.website) { links[3].href = content.website; try{links[3].lastChild.textContent = new URL(content.website).hostname.replace(/^www\./, '');}catch{}}
  if (Array.isArray(content.extraText)) content.extraText = Object.fromEntries(content.extraText);
  if (content.extraText) Object.entries(content.extraText).forEach(([key,value])=>{
    const target=EXTRA_TARGETS[key];if(!target||typeof value!=='string')return;
    if(target[1])setLinkLabel(target[0],value);else setText(target[0],value);
  });
  const placeholders={formNamePlaceholder:'#nombre',formCompanyPlaceholder:'#empresa',formEmailPlaceholder:'#email',formMessagePlaceholder:'#mensaje'};
  Object.entries(placeholders).forEach(([key,selector])=>{const input=document.querySelector(selector);if(input&&content.extraText?.[key])input.placeholder=content.extraText[key];});
  if(content.instagramUrl)document.querySelector('.social-pop a:nth-child(1)')?.setAttribute('href',content.instagramUrl);
  if(content.facebookUrl)document.querySelector('.social-pop a:nth-child(2)')?.setAttribute('href',content.facebookUrl);
  if(content.whatsappUrl)document.querySelector('.social-pop a:nth-child(3)')?.setAttribute('href',content.whatsappUrl);
  if(content.headerLogo){const logo=document.querySelector('.nav .brand-logo');if(logo)logo.src=content.headerLogo;}
  if(content.footerLogo){const logo=document.querySelector('.footer-logo');if(logo)logo.src=content.footerLogo;}
  if(Array.isArray(content.benefits))updateItems('.benefits',content.benefits,[['b','title'],['span','description']]);
  if(Array.isArray(content.projects))updateItems('.project-grid',content.projects,[['h3','title'],['p','description'],['.tag','tag']],'project');
  if(Array.isArray(content.steps))updateItems('.steps',content.steps,[['h3','title'],['p','description']]);
  if(Array.isArray(content.facts))updateItems('.aboutfacts',content.facts,[['b','title'],['span','description']]);
  const setCustomImage = (selector, url) => {
    const box = document.querySelector(selector); if (!box) return;
    box.querySelector(':scope > .custom-art-image')?.remove();
    if (!url || !/^https:\/\//i.test(url)) { box.classList.remove('has-custom-image'); return; }
    const image = document.createElement('img'); image.className = 'custom-art-image'; image.src = url; image.alt = ''; image.setAttribute('aria-hidden', 'true'); image.loading = 'lazy'; image.decoding = 'async';
    box.prepend(image); box.classList.add('has-custom-image');
  };
  setCustomImage('.hero-art', content.heroImage);
  setCustomImage('.chart', content.heroChartImage);
  setCustomImage('.aboutvisual', content.aboutImage);
  setCustomImage('.report-graph', content.reportGraphImage);
  renderClients(content.clients); renderCompanyProfiles(content.companyProfiles);
}

function setTextFor(root, selector, value) { const el=root.querySelector(selector);if(el&&value)el.textContent=value; }
const editableImageStyle = document.createElement('style');
editableImageStyle.textContent = '.proofline{max-width:560px;gap:14px}.avatars{flex:none;gap:4px}.avatars i{width:34px;height:34px;margin-left:0;font-size:10px;box-shadow:0 1px 4px #0000000d}.proofline>span{max-width:430px;line-height:1.5}@media(max-width:640px){.proofline{align-items:flex-start;gap:10px;margin-top:28px}.avatars i{width:32px;height:32px}.proofline>span{font-size:13px}}.custom-art-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.hero-art.has-custom-image>.orb,.hero-art.has-custom-image>.float-card,.hero-art.has-custom-image>.app-window{display:none}.chart.has-custom-image>svg{display:none}.aboutvisual.has-custom-image>.orb2,.aboutvisual.has-custom-image:before,.aboutvisual.has-custom-image:after{display:none}.report-graph.has-custom-image>svg{display:none}.project-art.has-custom-image{background:#eee}.project-art.has-custom-image img{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover}';
editableImageStyle.textContent += '.client-logo{width:178px;flex-basis:178px;min-height:150px;padding:12px}.client-logo img{height:82px;max-width:100%;object-fit:contain}.client-logo--wide{width:236px!important;flex-basis:236px!important}.client-logo--wide img{height:76px}@media(max-width:560px){.client-logo{width:154px;flex-basis:154px;min-height:136px;padding:10px}.client-logo img{height:70px}.client-logo--wide{width:210px!important;flex-basis:210px!important}.client-logo--wide img{height:68px}}.company-cases{background:#f2f2f0}.company-cases-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:36px}.company-case{min-height:235px;padding:26px;border:1px solid #dededb;border-radius:18px;background:#fff}.company-case-sector{margin:0 0 22px;color:#6d6d6d;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.company-case h3{margin:0 0 12px;font:700 22px Manrope,sans-serif;letter-spacing:-.04em;color:#161616}.company-case>p:last-child{margin:0;color:#5f5f5f;line-height:1.65}.company-cases-source{margin:24px 0 0;color:#717171;font-size:12px}@media(max-width:760px){.company-cases-grid{grid-template-columns:1fr}.company-case{min-height:0;padding:22px}.company-case-sector{margin-bottom:12px}}body[data-theme="dark"] .company-cases{background:#191919}body[data-theme="dark"] .company-case{background:#252525;border-color:#444}body[data-theme="dark"] .company-case h3{color:#f6f6f6}body[data-theme="dark"] .company-case>p:last-child{color:#d1d1d1}body[data-theme="dark"] .company-case-sector{color:#bdbdbd}body[data-theme="dark"] .company-cases-source{color:#c3c3c3}';
editableImageStyle.textContent += '.client-logo--oea{width:220px!important;flex-basis:220px!important;min-height:178px!important}.client-logo--oea img{height:112px!important}.client-logo--ruta{width:360px!important;flex-basis:360px!important}.client-logo--ruta img{height:100px!important}.client-logo--shell{width:190px!important;flex-basis:190px!important;min-height:162px!important}.client-logo--shell img{height:100px!important}@media(max-width:560px){.client-logo--oea{width:186px!important;flex-basis:186px!important;min-height:156px!important}.client-logo--oea img{height:92px!important}.client-logo--ruta{width:310px!important;flex-basis:310px!important}.client-logo--ruta img{height:88px!important}.client-logo--shell{width:164px!important;flex-basis:164px!important;min-height:144px!important}.client-logo--shell img{height:86px!important}}';
editableImageStyle.textContent += '.client-logo--cosmesoft{width:236px!important;flex-basis:236px!important}.client-logo--cosmesoft img{height:76px!important}@media(max-width:560px){.client-logo--cosmesoft{width:210px!important;flex-basis:210px!important}.client-logo--cosmesoft img{height:68px!important}}';
document.head.appendChild(editableImageStyle);


// Manual company carousel controls: pause at the first logo and allow bounded scrolling.
const manualMarqueeStyle = document.createElement('style');
manualMarqueeStyle.textContent = `
  .client-marquee.is-manual { overflow-x:auto!important; overflow-y:hidden!important; mask-image:none!important; -webkit-mask-image:none!important; scrollbar-width:thin; -webkit-overflow-scrolling:touch; overscroll-behavior-x:contain; touch-action:pan-x; cursor:grab; }
  .client-marquee.is-manual.is-dragging { cursor:grabbing; }
  .client-marquee.is-manual .client-track { animation:none!important; transform:none!important; will-change:auto!important; }
  .client-marquee.is-manual .client-group[aria-hidden="true"] { display:none!important; }
  .client-marquee.is-manual .client-group { padding-right:0!important; }
`;
document.head.appendChild(manualMarqueeStyle);
const manualMarquee = document.querySelector('#clientMarquee');
const manualMarqueeTrack = document.querySelector('#clientTrack');
const manualMarqueeButton = document.querySelector('#marqueeToggle');
if (manualMarquee && manualMarqueeTrack && manualMarqueeButton) {
  const toggleManualMarquee = paused => {
    manualMarqueeTrack.classList.toggle('is-paused', paused);
    manualMarquee.classList.toggle('is-manual', paused);
    if (paused) {
      manualMarquee.scrollLeft = 0;
      manualMarqueeTrack.getAnimations().forEach(animation => animation.cancel());
      manualMarqueeTrack.style.animation = 'none';
      manualMarqueeTrack.style.transform = 'none';
    } else {
      manualMarquee.scrollLeft = 0;
      manualMarqueeTrack.style.animation = '';
      manualMarqueeTrack.style.transform = '';
      void manualMarqueeTrack.offsetWidth;
      manualMarqueeTrack.getAnimations().forEach(animation => animation.play());
    }
    manualMarqueeButton.setAttribute('aria-pressed', String(paused));
    manualMarqueeButton.setAttribute('aria-label', paused ? 'Reanudar movimiento de empresas' : 'Pausar movimiento de empresas');
    manualMarqueeButton.textContent = paused ? 'Reanudar' : 'Pausar';
  };
  manualMarqueeButton.addEventListener('click', event => {
    event.stopImmediatePropagation();
    toggleManualMarquee(!manualMarquee.classList.contains('is-manual'));
  }, true);
  manualMarquee.addEventListener('touchstart', event => {
    if (!manualMarquee.classList.contains('is-manual')) toggleManualMarquee(true);
    event.stopImmediatePropagation();
  }, { capture:true, passive:true });
  let dragOriginX = 0, dragOriginScroll = 0, isDragging = false;
  manualMarquee.addEventListener('mousedown', event => {
    if (!manualMarquee.classList.contains('is-manual') || event.button !== 0) return;
    isDragging = true; dragOriginX = event.clientX; dragOriginScroll = manualMarquee.scrollLeft;
    manualMarquee.classList.add('is-dragging'); event.preventDefault();
  });
  window.addEventListener('mousemove', event => {
    if (isDragging) manualMarquee.scrollLeft = dragOriginScroll - (event.clientX - dragOriginX);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false; manualMarquee.classList.remove('is-dragging');
  });
}

try {
  const { data, error } = await db.from('site_content').select('content').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (data?.content) applyContent(data.content);
} catch (error) {
  console.info('Se muestra el contenido local mientras se conecta el administrador.', error.message);
}
