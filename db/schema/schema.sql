-- =====================================================================
-- iPhone Connection · Esquema real V1
-- Doc 02 (arquitectura) · Doc 00 §7.3 + ADR-001 (estados)
-- Postgres / Supabase. Convenciones: snake_case, singular, uuid, centavos.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";      -- reservado para el asistente (V3)

-- ---------- tipos canónicos ----------
create type estado_unidad      as enum ('nuevo_sellado','seleccionado_a','seleccionado_b','seleccionado_c');
create type disponibilidad     as enum ('disponible','por_encargo','sin_stock');
create type origen_unidad      as enum ('propio','proveedor');
create type nivel_ficha        as enum ('premium','estandar','simple');
create type nivel_confianza    as enum ('canonico','observado','inferido');
create type estado_publicacion as enum ('borrador','publicado','pausado','vendido');

-- ---------- capa A · canónica ----------
create table marca (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  slug          text not null unique,
  peso          int  not null default 0,     -- jerarquía configurable (Apple = mayor)
  destacada     boolean not null default false,
  nivel         nivel_ficha not null default 'estandar',
  creado_en     timestamptz not null default now()
);

create table categoria (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  slug          text not null unique,
  peso          int  not null default 0,
  orden         int  not null default 0,
  nivel         nivel_ficha not null default 'estandar',
  minimo_publicar int not null default 6,    -- guardrail: no publicar categorías flacas
  creado_en     timestamptz not null default now()
);

-- specs como DATO, no como columnas: agregar una categoría es insertar filas
create table spec_definicion (
  id            uuid primary key default gen_random_uuid(),
  clave         text not null unique,
  etiqueta      text not null,
  tipo          text not null check (tipo in ('numero','texto','booleano','enum')),
  unidad        text,
  filtrable     boolean not null default false,
  comparable    boolean not null default false,
  orden         int not null default 0
);

create table categoria_spec (
  categoria_id  uuid not null references categoria(id) on delete cascade,
  spec_id       uuid not null references spec_definicion(id) on delete cascade,
  obligatoria   boolean not null default false,
  primary key (categoria_id, spec_id)
);

create table modelo_base (
  id            uuid primary key default gen_random_uuid(),
  marca_id      uuid not null references marca(id),
  categoria_id  uuid not null references categoria(id),
  nombre        text not null,
  slug          text not null unique,
  anio          int,
  -- gobernanza de procedencia (Doc: sin estos campos no se guarda nada)
  fuente            text,
  url_fuente        text,
  verificado_por    text,
  fecha_verificacion date,
  confianza     nivel_confianza not null default 'canonico',
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table spec_valor (
  modelo_base_id uuid not null references modelo_base(id) on delete cascade,
  spec_id        uuid not null references spec_definicion(id),
  valor_numero   numeric,
  valor_texto    text,
  valor_booleano boolean,
  primary key (modelo_base_id, spec_id)
);

-- ---------- producto y unidad ----------
create table producto (
  id            uuid primary key default gen_random_uuid(),
  modelo_base_id uuid not null references modelo_base(id),
  slug          text not null unique,
  estado_pub    estado_publicacion not null default 'borrador',
  creado_en     timestamptz not null default now()
);

create table variante (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references producto(id) on delete cascade,
  capacidad_gb  int,
  color         text,
  unique (producto_id, capacidad_gb, color)
);

create table unidad (
  id            uuid primary key default gen_random_uuid(),
  variante_id   uuid not null references variante(id),
  ref           text not null unique,             -- referencia pública #A104
  imei          text unique,                      -- V2
  estado        estado_unidad not null,
  bateria       int check (bateria between 0 and 100),
  defecto_declarado text,                         -- ADR-001 · público
  costo_centavos int,                             -- NUNCA sale al bundle público
  costo_moneda  text not null default 'USD',
  precio_centavos int not null,
  origen        origen_unidad not null default 'proveedor',
  disponibilidad disponibilidad not null default 'por_encargo',
  estado_pub    estado_publicacion not null default 'borrador',
  actualizado_en timestamptz not null default now(),
  creado_en     timestamptz not null default now(),
  -- Doc 00 + ADR-001: un usado sin batería declarada no puede publicarse
  constraint bateria_obligatoria_en_usados
    check (estado = 'nuevo_sellado' or bateria is not null)
);

create index on unidad (variante_id);
create index on unidad (estado_pub, disponibilidad);

-- ---------- precios ----------
create table tipo_cambio (
  id            uuid primary key default gen_random_uuid(),
  valor         numeric not null,
  vigente_desde timestamptz not null default now()
);

create table regla_precio (
  id            uuid primary key default gen_random_uuid(),
  categoria_id  uuid references categoria(id),
  margen        numeric not null default 0.15,
  minimo_centavos int,
  maximo_centavos int,
  umbral_revision numeric not null default 0.15
);

-- ---------- garantías versionadas (Doc 00 · no es conocimiento, es documento legal) ----------
create table garantia_version (
  id            uuid primary key default gen_random_uuid(),
  version       int not null unique,
  texto         text not null,
  meses_sellado int not null default 12,
  meses_usado   int not null default 6,
  vigente_desde date not null,
  vigente_hasta date
);

-- ---------- leads ----------
create table lead (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('aviso_stock','consulta')),
  unidad_id     uuid references unidad(id),
  contacto      text not null,
  mensaje       text,
  creado_en     timestamptz not null default now()
);

-- ---------- capa B · propietaria (el activo real) ----------
create table observacion (
  id            uuid primary key default gen_random_uuid(),
  modelo_base_id uuid references modelo_base(id),
  unidad_id     uuid references unidad(id),
  tipo          text not null check (tipo in ('incidencia','pregunta_cliente','nota_tecnica')),
  texto         text not null,
  visibilidad   text not null default 'interna' check (visibilidad in ('interna','publica')),
  creado_en     timestamptz not null default now()
);

create table precio_historico (
  id            uuid primary key default gen_random_uuid(),
  modelo_base_id uuid not null references modelo_base(id),
  costo_centavos int,
  precio_centavos int,
  registrado_en timestamptz not null default now()
);

-- ---------- capa C · editorial ----------
create table contenido_generado (
  id            uuid primary key default gen_random_uuid(),
  modelo_base_id uuid not null references modelo_base(id),
  campo         text not null,          -- descripcion_comercial | meta_titulo | faq | ...
  texto         text not null,
  estado        text not null default 'borrador' check (estado in ('borrador','aprobado','descartado')),
  version       int not null default 1,
  aprobado_por  text,
  creado_en     timestamptz not null default now()
);

-- ---------- núcleo · outbox de eventos (Doc 02 §4) ----------
create table evento (
  id            bigserial primary key,
  tipo          text not null,
  entidad       text not null,
  entidad_id    uuid,
  payload       jsonb not null default '{}'::jsonb,
  actor         text,
  ocurrido_en   timestamptz not null default now(),
  procesado_en  timestamptz,
  intentos      int not null default 0,
  error         text
);

create index on evento (procesado_en) where procesado_en is null;

-- ---------- RLS: por defecto todo cerrado ----------
alter table unidad   enable row level security;
alter table producto enable row level security;
alter table lead     enable row level security;

-- lo público se expone por vista, nunca por acceso directo a la tabla
create view catalogo_publico as
select u.ref, u.estado, u.bateria, u.defecto_declarado, u.precio_centavos,
       u.disponibilidad, u.actualizado_en,
       v.capacidad_gb, v.color, mb.nombre as modelo, mb.slug as modelo_slug,
       m.nombre as marca, c.nombre as categoria
from unidad u
join variante v      on v.id = u.variante_id
join producto p      on p.id = v.producto_id
join modelo_base mb  on mb.id = p.modelo_base_id
join marca m         on m.id = mb.marca_id
join categoria c     on c.id = mb.categoria_id
where u.estado_pub = 'publicado';
