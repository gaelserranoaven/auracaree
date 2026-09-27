-- APLICADA en el proyecto `auracare` (ohzptabssphpclcadvrj).
-- ============ Columnas nuevas ============
alter table public.residentes
  add column estado text not null default 'activo' check (estado in ('activo','egresado')),
  add column fecha_egreso date,
  add column motivo_egreso text,
  add column rangos jsonb not null default '{}'::jsonb;
create unique index residentes_doc_por_sede_uq on public.residentes (sede_id, doc)
  where doc is not null and doc not in ('', 'CC s/n');

alter table public.notas add column autor_id uuid references auth.users(id), add column seq bigint;
alter table public.alertas
  add column atendida_por uuid references auth.users(id),
  add column atendida_en timestamptz,
  add column nota_id text;
alter table public.entregas add column quien_id uuid references auth.users(id);
alter table public.pertenencias
  add column registrado_por uuid default auth.uid() references auth.users(id),
  add column devuelta_por uuid references auth.users(id);
alter table public.asistencias
  add column registrado_por uuid references auth.users(id),
  add column actualizado_en timestamptz not null default now();
alter table public.actividades add column registrado_por uuid default auth.uid() references auth.users(id);

alter table public.asistencias alter column fecha set default ((now() at time zone 'America/Bogota')::date);
alter table public.actividades alter column fecha set default ((now() at time zone 'America/Bogota')::date);
alter table public.entregas alter column fecha set default ((now() at time zone 'America/Bogota')::date);
alter table public.pertenencias alter column fecha_recibo set default ((now() at time zone 'America/Bogota')::date);

-- Secuencia por sede para notas (orden determinista de la cadena de hash)
update public.notas n set seq = x.rn
from (select id, row_number() over (partition by sede_id order by created_at, id) as rn from public.notas) x
where x.id = n.id;
alter table public.notas alter column seq set not null;
alter table public.notas add constraint notas_sede_seq_uq unique (sede_id, seq);
alter table public.notas add constraint notas_desc_min check (char_length(coalesce(descripcion,'')) >= 10) not valid;
alter table public.notas add constraint notas_tipo_ck check (tipo in
  ('evolucion','novedad_salud','ingreso','administracion_medicamento','activacion_emergencia','actividad_salud','general_jornada')) not valid;

-- ============ Tablas de referencia (fuente única de verdad) ============
create table public.rangos_clinicos (
  parametro text primary key,
  lbl text not null, uni text not null,
  v_min numeric not null, v_max numeric not null, c_min numeric not null, c_max numeric not null,
  normal text not null, vig text not null, crit text not null
);
insert into public.rangos_clinicos values
 ('ta_s','TA sistólica','mmHg',100,139,90,160,'100–139','140–159 o 90–99','<90 o ≥160'),
 ('ta_d','TA diastólica','mmHg',60,89,50,100,'60–89','90–99 o 50–59','<50 o ≥100'),
 ('fc','Frec. cardiaca','lpm',60,100,50,120,'60–100','101–119 o 50–59','<50 o ≥120'),
 ('fr','Frec. respiratoria','rpm',12,20,10,25,'12–20','21–24 o 10–11','<10 o ≥25'),
 ('temp','Temperatura','°C',36.0,37.5,35.0,38.5,'36.0–37.5','37.6–38.4 o 35.0–35.9','<35.0 o ≥38.5'),
 ('spo2','Saturación O₂','%',94,100,90,101,'94–100','90–93','<90'),
 ('glu','Glucometría','mg/dL',70,140,60,200,'70–140','141–199 o 60–69','<60 o ≥200');

create table public.elementos_dotacion (
  key text primary key, nombre text not null, regla text not null,
  lim_persona_mes int, lim_unidad_mes int
);
insert into public.elementos_dotacion values
 ('DESODORANTE','Desodorante barra/roll-on','Máximo 1 al mes por persona',1,null),
 ('ROPA_INTERIOR','Ropa interior','A necesidad · máx. 10 entregas/mes por unidad',null,10),
 ('MEDIAS','Par de medias algodón 100%','A necesidad (frío o estado de salud)',null,null),
 ('CEPILLO','Cepillo de dientes con estuche','1 por mes o reposición a los 3 meses',1,null),
 ('MAQUINA_AFEITAR','Máquina de afeitar desechable','Se entrega a hombres y mujeres',null,null);

create table public.entregas_turno (
  id text primary key default gen_random_uuid()::text,
  sede_id text not null references public.sedes(id),
  jornada text not null check (jornada in ('dia','noche')),
  fecha date not null,
  observaciones text not null check (char_length(trim(observaciones)) >= 5),
  firmado_por uuid not null references auth.users(id),
  firmado_por_nombre text not null,
  created_at timestamptz not null default now()
);

create table public.auditoria (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid(),
  accion text not null,
  tabla text,
  registro_id text,
  sede_id text,
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index auditoria_created_idx on public.auditoria (created_at desc);
create index auditoria_sede_idx on public.auditoria (sede_id, created_at desc);

-- ============ Funciones ============
create or replace function private.jornada_actual() returns text
language sql stable set search_path = '' as $$
  select case when extract(hour from (now() at time zone 'America/Bogota')) >= 6
               and extract(hour from (now() at time zone 'America/Bogota')) < 18 then 'dia' else 'noche' end
$$;

create or replace function private.persona_en_sede(pid text, sid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.residentes r where r.id = pid and r.sede_id = sid)
$$;

create or replace function private.hash_nota(n public.notas) returns text
language sql stable set search_path = '' as $$
  select encode(extensions.digest(convert_to(concat_ws('|',
    n.prev_hash, n.id, n.sede_id, n.seq::text, coalesce(n.persona_id,''), n.tipo,
    to_char(n.fecha,'YYYY-MM-DD'), coalesce(n.hora,''), coalesce(n.descripcion,''),
    n.signos::text, coalesce(n.autor_id::text,''),
    to_char(n.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US')
  ), 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function private.estado_signo(k text, n numeric, ov jsonb) returns text
language plpgsql stable set search_path = '' as $$
declare r public.rangos_clinicos; vmin numeric; vmax numeric; cmin numeric; cmax numeric;
begin
  select * into r from public.rangos_clinicos where parametro = k;
  if not found then return 'ok'; end if;
  vmin := coalesce((ov -> k ->> 'v_min')::numeric, r.v_min);
  vmax := coalesce((ov -> k ->> 'v_max')::numeric, r.v_max);
  cmin := coalesce((ov -> k ->> 'c_min')::numeric, r.c_min);
  cmax := coalesce((ov -> k ->> 'c_max')::numeric, r.c_max);
  if n < cmin or n >= cmax then return 'c';
  elsif n < vmin or n > vmax then return 'v';
  else return 'ok'; end if;
end $$;

create or replace function private.validar_signos(s jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; n numeric; lo numeric; hi numeric;
begin
  if s is null or jsonb_typeof(s) <> 'object' then
    raise exception 'Los signos deben ser un objeto' using errcode = '22023';
  end if;
  for k, v in select key, value from jsonb_each(s) loop
    select t.l, t.h into lo, hi from (values
      ('ta_s',40,300),('ta_d',20,200),('fc',20,250),('fr',4,80),
      ('temp',30,43),('spo2',40,100),('glu',10,800),('dolor',0,10)) as t(k2,l,h) where t.k2 = k;
    if not found then raise exception 'Parámetro de signo desconocido: %', k using errcode = '22023'; end if;
    if jsonb_typeof(v) <> 'number' then raise exception 'Valor no numérico para %', k using errcode = '22023'; end if;
    n := (v #>> '{}')::numeric;
    if n < lo or n > hi then
      raise exception 'Valor fuera de rango plausible para % (% a %)', k, lo, hi using errcode = '22003';
    end if;
  end loop;
end $$;

-- ============ Backfill de la cadena de hash de notas existentes (antes de activar inmutabilidad) ============
do $$
declare s text; r public.notas; prev text;
begin
  for s in select distinct sede_id from public.notas loop
    prev := 'GENESIS';
    for r in select * from public.notas where sede_id = s order by seq loop
      r.prev_hash := prev;
      r.hash := private.hash_nota(r);
      update public.notas set prev_hash = r.prev_hash, hash = r.hash, e2ee = false,
             descripcion_cifrada = null where id = r.id;
      prev := r.hash;
    end loop;
  end loop;
end $$;
