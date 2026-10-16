import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jeonzbisrwukbpvydcyh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_c4VeVqtYXYGMtzTBoBfiKg_gCf_vut-';
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el && typeof value === 'string' && value.trim()) el.textContent = value;
}

function renderClients(clients) {
  const track = document.querySelector('#clientTrack');
  if (!track || !Array.isArray(clients) || !clients.length) return;
  const valid = clients.filter(client => client && client.name && client.logo && /^https:\/\//i.test(client.logo));
  if (!valid.length) return;
  const makeGroup = hidden => {
    const group = document.createElement('div');
    group.className = 'client-group';
    if (hidden) group.setAttribute('aria-hidden', 'true');
    valid.forEach(client => {
      const figure = document.createElement('figure');
      figure.className = 'client-logo';
      const img = document.createElement('img');
      img.src = client.logo;
      img.alt = `Logo de ${client.name}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      const caption = document.createElement('figcaption');
      caption.textContent = client.name;
      figure.append(img, caption);
      group.appendChild(figure);
    });
    return group;
  };
  track.replaceChildren(makeGroup(false), makeGroup(true));
}

function applyContent(content) {
  setText('.hero h1', content.heroTitle);
  setText('.hero-copy', content.heroText);
  setText('.services .sectionhead h2', content.servicesTitle);
  setText('.services .sectionhead > p', content.servicesIntro);
  if (Array.isArray(content.services)) {
    document.querySelectorAll('.service-grid .service').forEach((card, index) => {
      const service = content.services[index];
      if (!service) return;
      const title = card.querySelector('h3');
      const description = card.querySelector('p');
      if (title && service.title) title.textContent = service.title;
      if (description && service.description) description.textContent = service.description;
    });
  }
  setText('.aboutcopy h2', content.aboutTitle);
  if (Array.isArray(content.aboutParagraphs)) {
    document.querySelectorAll('.aboutcopy > p').forEach((p, index) => {
      if (content.aboutParagraphs[index]) p.textContent = content.aboutParagraphs[index];
    });
  }
  setText('.contact h2', content.contactTitle);
  setText('.contactgrid > div > p', content.contactIntro);
  const links = document.querySelectorAll('.contactdetails a');
  if (links[0] && content.phone) { links[0].href = `tel:${content.phone.replace(/[^+\d]/g, '')}`; links[0].lastChild.textContent = content.phone; }
  if (links[1] && content.email) { links[1].href = `mailto:${content.email}`; links[1].lastChild.textContent = content.email; }
  if (links[2] && content.mapUrl) links[2].href = content.mapUrl;
  if (links[3] && content.website) { links[3].href = content.website; links[3].lastChild.textContent = new URL(content.website).hostname.replace(/^www\./, ''); }
  renderClients(content.clients);
}

try {
  const { data, error } = await db.from('site_content').select('content').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (data?.content) applyContent(data.content);
} catch (error) {
  console.info('Se muestra el contenido local mientras se conecta el administrador.', error.message);
}

