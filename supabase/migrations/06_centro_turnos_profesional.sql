-- APLICADA el 01-oct-2026 en el proyecto `auracare` (ohzptabssphpclcadvrj).
-- 06 · Centro Día/Noche como jornada registrada, recepción de turno firmada y rol Profesional.
-- Efecto:
--   1. Nuevo rol 'profesional' (psicosocial: entrega turno sobre sucesos con los usuarios, convivencia y novedades del servicio).
--   2. Nuevo tipo de nota 'convivencia' (discusiones, conflictos entre usuarios).
--   3. La jornada de notas y actas es la del centro elegido en la app (Centro Día / Centro Noche); si el cliente
--      no la envía o es inválida, se usa la hora de Bogotá como antes. La jornada NO forma parte del hash de la nota.
--   4. Actas de entrega con el cargo de quien firma.
--   5. Tabla recepciones_turno: quien llega lee el acta y firma "Recibí turno" (inmutable; varios pueden firmar la misma acta).

-- ============ 1. Rol Profesional ============
alter table public.perfiles drop constraint perfiles_rol_id_check;
alter table public.perfiles add constraint perfiles_rol_id_check
  check (rol_id in ('auxiliar','superadmin','admin_sede','admin_turno','auditor','medico','profesional'));

create or replace function private.rol_label(r text) returns text
language sql immutable set search_path = '' as $$
  select case r
    when 'auxiliar' then 'Auxiliar de Enfermería'
    when 'superadmin' then 'Administrador General / SuperAdmin'
    when 'admin_sede' then 'Administrador de Sede'
    when 'admin_turno' then 'Administrador de Turno'
    when 'auditor' then 'Auditor de Inventario / Interventoría SDIS'
    when 'medico' then 'Médico / Jefe de Enfermería'
    when 'profesional' then 'Profesional Psicosocial'
    else r end
$$;

-- ============ 2. Tipo de nota de convivencia ============
alter table public.notas drop constraint notas_tipo_ck;
alter table public.notas add constraint notas_tipo_ck check (tipo in
  ('evolucion','novedad_salud','ingreso','administracion_medicamento','activacion_emergencia','actividad_salud','general_jornada','convivencia')) not valid;

-- ============ 3. Jornada elegida (centro) ============
create or replace function private.jornada_o_reloj(j text) returns text
language sql stable set search_path = '' as $$
  select case when j in ('dia','noche') then j else private.jornada_actual() end
$$;

create or replace function private.notas_antes_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.perfiles; prev text; loc timestamp := (now() at time zone 'America/Bogota');
begin
  select * into p from public.perfiles where id = (select auth.uid()) and estado = 'activo';
  if p.id is null then raise exception 'Sesión no válida o cuenta inactiva' using errcode = '42501'; end if;

  perform private.validar_signos(coalesce(new.signos, '{}'::jsonb));
  if new.persona_id is not null and not private.persona_en_sede(new.persona_id, new.sede_id) then
    raise exception 'La persona mayor no pertenece a esta sede' using errcode = '23503';
  end if;
  if new.persona_id is not null and exists (select 1 from public.residentes where id = new.persona_id and estado <> 'activo') then
    raise exception 'La persona mayor está egresada' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtext('notas:' || new.sede_id));
  select coalesce(max(seq), 0) + 1 into new.seq from public.notas where sede_id = new.sede_id;
  select n.hash into prev from public.notas n where n.sede_id = new.sede_id and n.seq = new.seq - 1;

  new.id := gen_random_uuid()::text;
  new.autor_id := p.id;
  new.autor := p.nombre || ' (' || private.rol_label(p.rol_id) || ')';
  new.cargo := private.rol_label(p.rol_id);
  new.created_at := clock_timestamp();
  new.fecha := loc::date;
  new.hora := to_char(loc, 'HH24:MI');
  new.jornada := private.jornada_o_reloj(new.jornada);
  new.vigente := true;
  new.e2ee := false;
  new.descripcion_cifrada := null;
  new.signos := coalesce(new.signos, '{}'::jsonb);
  new.prev_hash := coalesce(prev, 'GENESIS');
  new.hash := private.hash_nota(new);
  return new;
end $$;

-- ============ 4. Actas con cargo y jornada elegida ============
alter table public.entregas_turno add column firmado_por_cargo text;

create or replace function private.entregas_turno_antes_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.perfiles;
begin
  select * into p from public.perfiles where id = (select auth.uid()) and estado = 'activo';
  if p.id is null then raise exception 'Sesión no válida o cuenta inactiva' using errcode = '42501'; end if;
  new.id := gen_random_uuid()::text;
  new.fecha := (now() at time zone 'America/Bogota')::date;
  new.jornada := private.jornada_o_reloj(new.jornada);
  new.firmado_por := p.id;
  new.firmado_por_nombre := p.nombre;
  new.firmado_por_cargo := private.rol_label(p.rol_id);
  new.created_at := now();
  return new;
end $$;

-- ============ 5. Recepción de turno ============
create table public.recepciones_turno (
  id text primary key default gen_random_uuid()::text,
  entrega_id text not null references public.entregas_turno(id),
  sede_id text not null references public.sedes(id),
  jornada text not null check (jornada in ('dia','noche')),
  fecha date not null,
  observaciones text check (observaciones is null or char_length(observaciones) <= 2000),
  recibido_por uuid not null references auth.users(id),
  recibido_por_nombre text not null,
  recibido_por_cargo text not null,
  created_at timestamptz not null default now(),
  unique (entrega_id, recibido_por)
);
create index recepciones_turno_sede_idx on public.recepciones_turno (sede_id, created_at desc);

create or replace function private.recepciones_turno_antes_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.perfiles; e public.entregas_turno;
begin
  select * into p from public.perfiles where id = (select auth.uid()) and estado = 'activo';
  if p.id is null then raise exception 'Sesión no válida o cuenta inactiva' using errcode = '42501'; end if;
  select * into e from public.entregas_turno where id = new.entrega_id;
  if e.id is null then raise exception 'El acta de entrega no existe' using errcode = '23503'; end if;
  if e.sede_id <> new.sede_id then raise exception 'El acta no pertenece a esta sede' using errcode = '23503'; end if;
  if e.firmado_por = p.id then raise exception 'No puedes recibir un turno que tú mismo entregaste' using errcode = '23514'; end if;
  if exists (select 1 from public.recepciones_turno where entrega_id = new.entrega_id and recibido_por = p.id) then
    raise exception 'Ya firmaste el recibo de este turno' using errcode = '23505';
  end if;
  new.id := gen_random_uuid()::text;
  new.fecha := (now() at time zone 'America/Bogota')::date;
  new.jornada := private.jornada_o_reloj(new.jornada);
  new.observaciones := nullif(trim(coalesce(new.observaciones, '')), '');
  new.recibido_por := p.id;
  new.recibido_por_nombre := p.nombre;
  new.recibido_por_cargo := private.rol_label(p.rol_id);
  new.created_at := now();
  return new;
end $$;
create trigger recepciones_turno_before_insert before insert on public.recepciones_turno
  for each row execute function private.recepciones_turno_antes_insert();
create trigger recepciones_turno_no_update_delete before update or delete on public.recepciones_turno
  for each row execute function private.inmutable();

alter table public.recepciones_turno enable row level security;
grant select, insert on public.recepciones_turno to authenticated;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ============ 6. RLS: permisos del rol Profesional ============
alter policy notas_insert on public.notas
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','medico','profesional','superadmin'));
alter policy asistencias_insert on public.asistencias
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','superadmin'));
alter policy asistencias_update on public.asistencias
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','superadmin'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','superadmin'));
alter policy actividades_insert on public.actividades
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','superadmin'));
alter policy actividades_update on public.actividades
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','superadmin'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','superadmin'));
alter policy turno_select on public.entregas_turno
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','medico','superadmin'));
alter policy turno_insert on public.entregas_turno
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','medico','superadmin'));

create policy recepcion_select on public.recepciones_turno for select to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','medico','superadmin'));
create policy recepcion_insert on public.recepciones_turno for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','profesional','admin_sede','admin_turno','medico','superadmin'));

alter publication supabase_realtime add table public.recepciones_turno;
