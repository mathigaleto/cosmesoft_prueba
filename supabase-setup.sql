-- Ejecutar una vez en Supabase: SQL Editor > New query > Run.
-- Solo mathigaleto@gmail.com puede modificar el contenido; la web pública solo puede leerlo.

create table if not exists public.site_content (
  id integer primary key check (id = 1),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
grant update on public.site_content to authenticated;

drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content"
  on public.site_content for select to anon, authenticated using (true);

drop policy if exists "Only Cosmesoft admin can update site content" on public.site_content;
create policy "Only Cosmesoft admin can update site content"
  on public.site_content for update to authenticated
  using ((select auth.jwt() ->> 'email') = 'mathigaleto@gmail.com')
  with check ((select auth.jwt() ->> 'email') = 'mathigaleto@gmail.com');

insert into public.site_content (id, content) values (1, '{
  "heroTitle":"Ideas que se convierten en soluciones.",
  "heroText":"Creamos software, sistemas web y experiencias digitales a medida para que tu negocio avance con tecnología que sí resuelve.",
  "servicesTitle":"Tecnología para moverte adelante.",
  "servicesIntro":"Nos involucramos desde el primer desafío hasta la solución en marcha. Elegimos el camino técnico que mejor se adapta a tu operación.",
  "services":[
    {"title":"Desarrollo de software","description":"Sistemas y aplicaciones diseñados alrededor de tus procesos, tus objetivos y las personas que los usan."},
    {"title":"Consultoría tecnológica","description":"Evaluamos herramientas, procesos y alternativas para ayudarte a tomar decisiones tecnológicas con claridad."},
    {"title":"Infraestructura tecnológica","description":"El respaldo técnico y la infraestructura necesarios para convertir tu visión en una solución preparada para crecer."}
  ],
  "aboutTitle":"Un equipo cercano. Una visión inteligente.",
  "aboutParagraphs":[
    "Somos una empresa paraguaya conformada por un equipo de trabajo que ofrece soluciones eficaces, dinámicas e inteligentes. Combinamos conocimiento técnico con una comprensión profunda de cada necesidad.",
    "Trabajamos con responsabilidad y profesionalismo para transformar ideas en herramientas útiles para las personas y los negocios."
  ],
  "contactTitle":"Tu próxima idea empieza con una conversación.",
  "contactIntro":"Contanos qué necesitás. Estamos para escucharte, entender el desafío y explorar juntos el camino.",
  "phone":"+595 985 291 060",
  "email":"contacto@cosmesoft.com.py",
  "mapUrl":"https://maps.app.goo.gl/X7Y8Stce1qh8MJxH7",
  "website":"https://www.cosmesoft.com.py/",
  "clients":[
    {"name":"C&C","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-cyc-768x768.png"},
    {"name":"CEAMSO","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-ceamso-768x768.png"},
    {"name":"Santa Fé Empanadas","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-santaFe-768x768.png"},
    {"name":"Monitor","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-monitor-768x768.png"},
    {"name":"MATIZ S.A.","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-matiz-768x768.png"},
    {"name":"Fundación Saraki","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-saraki-768x768.png"},
    {"name":"DNCP","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-dncp-768x768.png"},
    {"name":"Contraloría General de la República","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-contraloria-768x768.png"},
    {"name":"Importadora ND S.A.","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-nd-1-768x768.png"},
    {"name":"Motopiezas","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/logo-motopiezas-768x768.png"},
    {"name":"anubesport","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-anube-768x768.png"},
    {"name":"Pedazo de Cielo Posada","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-cielo-768x768.png"},
    {"name":"Cloragua NABG","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-cloragua-768x768.png"},
    {"name":"Masquelier Medicina Integrativa","logo":"https://www.cosmesoft.com.py/wp-content/uploads/2018/08/client-masquelier-768x768.png"}
  ]
}'::jsonb)
on conflict (id) do nothing;

