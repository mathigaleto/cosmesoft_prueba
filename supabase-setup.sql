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
  "phone":"+595 994 618 000",
  "email":"gdb@cosmesoft.com.py",
  "mapUrl":"https://maps.app.goo.gl/X7Y8Stce1qh8MJxH7",
  "website":"https://prueba.cosmesoft.com.py/",
  "clients":[
    {"name":"Multi Envíos Sociedad Anónima","logo":"https://prueba.cosmesoft.com.py/assets/clients/multienvios.webp"},
    {"name":"Jaraha Encomiendas","logo":"https://prueba.cosmesoft.com.py/assets/clients/jaraha-encomiendas.webp"},
    {"name":"Estopas Total","logo":"https://prueba.cosmesoft.com.py/assets/clients/estopas-total.webp"},
    {"name":"Alsetec","logo":"https://prueba.cosmesoft.com.py/assets/clients/alsetec.webp"},
    {"name":"CeConsult","logo":"https://prueba.cosmesoft.com.py/assets/clients/ceconsult.webp"},
    {"name":"Dableyu Seven Encomiendas Express","logo":"https://prueba.cosmesoft.com.py/assets/clients/dobleu-seven.webp"},
    {"name":"RE/MAX Paraguay","logo":"https://prueba.cosmesoft.com.py/assets/clients/remax-paraguay.webp"},
    {"name":"Grupo Miaterra","logo":"https://prueba.cosmesoft.com.py/assets/clients/grupo-miaterra.webp"},
    {"name":"Filtrona","logo":"https://prueba.cosmesoft.com.py/assets/clients/filtrona.webp"},
    {"name":"GS Concretos","logo":"https://prueba.cosmesoft.com.py/assets/clients/gs-concretos.webp"},
    {"name":"Occidental Express","logo":"https://prueba.cosmesoft.com.py/assets/clients/occidental-express.webp"},
    {"name":"Organización de los Estados Americanos","logo":"https://prueba.cosmesoft.com.py/assets/clients/oea.webp"},
    {"name":"Ruta 10 S.R.L.","logo":"https://prueba.cosmesoft.com.py/assets/clients/ruta-10.webp"},
    {"name":"Matiz S.A.E.","logo":"https://prueba.cosmesoft.com.py/assets/clients/matiz.webp"},
    {"name":"Monitor","logo":"https://prueba.cosmesoft.com.py/assets/clients/monitor-soft.webp"},
    {"name":"T&C","logo":"https://prueba.cosmesoft.com.py/assets/clients/tc.webp"},
    {"name":"Hard & Soft S.A.","logo":"https://prueba.cosmesoft.com.py/assets/clients/hard-soft.webp"},
    {"name":"Reino Frío","logo":"https://prueba.cosmesoft.com.py/assets/clients/reino-frio.webp"},
    {"name":"Salesianos Paraguay","logo":"https://prueba.cosmesoft.com.py/assets/clients/salesianos-paraguay.webp"},
    {"name":"Fundación Saraki","logo":"https://prueba.cosmesoft.com.py/assets/clients/fundacion-saraki.webp"},
    {"name":"Ingenio Azucarero La Felsina A.C.S.A.","logo":"https://prueba.cosmesoft.com.py/assets/clients/ingenio-la-felsina.webp"},
    {"name":"Shell","logo":"https://prueba.cosmesoft.com.py/assets/clients/shell.webp"}
  ]
}'::jsonb)
on conflict (id) do nothing;

-- Almacenamiento público de imágenes: cualquiera puede verlas, solo la cuenta
-- administradora puede subir, reemplazar o borrar archivos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view Cosmesoft site images" on storage.objects;
create policy "Anyone can view Cosmesoft site images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "Cosmesoft admin can upload site images" on storage.objects;
create policy "Cosmesoft admin can upload site images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-images'
    and (select auth.jwt() ->> 'email') = 'mathigaleto@gmail.com'
  );

drop policy if exists "Cosmesoft admin can update site images" on storage.objects;
create policy "Cosmesoft admin can update site images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'site-images'
    and (select auth.jwt() ->> 'email') = 'mathigaleto@gmail.com'
  )
  with check (
    bucket_id = 'site-images'
    and (select auth.jwt() ->> 'email') = 'mathigaleto@gmail.com'
  );

drop policy if exists "Cosmesoft admin can delete site images" on storage.objects;
create policy "Cosmesoft admin can delete site images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'site-images'
    and (select auth.jwt() ->> 'email') = 'mathigaleto@gmail.com'
  );


