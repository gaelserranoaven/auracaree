-- APLICADA en el proyecto `auracare` (ohzptabssphpclcadvrj).
-- Esquema privado: no expuesto por PostgREST, aloja helpers usados por las políticas RLS
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Perfiles ligados a Supabase Auth (reemplaza la tabla propia "usuarios")
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  rol_id text not null default 'auxiliar'
    check (rol_id in ('auxiliar','superadmin','admin_sede','admin_turno','auditor','medico')),
  sede_id text references public.sedes(id) on update cascade,
  jornada_permitida text not null default 'ambos' check (jornada_permitida in ('ambos','dia','noche')),
  estado text not null default 'pendiente' check (estado in ('pendiente','activo','suspendido')),
  created_at timestamptz not null default now()
);
alter table public.perfiles enable row level security;

-- Helpers (SECURITY DEFINER para poder leer perfiles sin recursión de RLS)
create or replace function private.rol() returns text
language sql stable security definer set search_path = '' as $$
  select p.rol_id from public.perfiles p where p.id = (select auth.uid()) and p.estado = 'activo'
$$;

create or replace function private.tiene_rol(variadic roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.rol() = any(roles), false)
$$;

create or replace function private.puede_sede(s text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.estado = 'activo'
      and (p.rol_id = 'superadmin' or p.sede_id = s)
  )
$$;

create or replace function private.rol_label(r text) returns text
language sql immutable set search_path = '' as $$
  select case r
    when 'auxiliar' then 'Auxiliar de Enfermería'
    when 'superadmin' then 'Administrador General / SuperAdmin'
    when 'admin_sede' then 'Administrador de Sede'
    when 'admin_turno' then 'Administrador de Turno'
    when 'auditor' then 'Auditor de Inventario / Interventoría SDIS'
    when 'medico' then 'Médico / Jefe de Enfermería'
    else r end
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Alta automática de perfil: SIEMPRE pendiente/auxiliar (nunca se confía en metadata del cliente para rol)
create or replace function private.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(coalesce(new.email,''), '@', 1)), 80)
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.nuevo_usuario();

-- Protección: solo SuperAdmin cambia rol/sede/jornada/estado; nunca se elimina al último SuperAdmin
create or replace function private.guardar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
declare es_admin boolean := coalesce(private.rol() = 'superadmin', false);
begin
  if (select auth.uid()) is not null and not es_admin and (
       new.id <> old.id or new.email <> old.email or new.rol_id <> old.rol_id
       or new.sede_id is distinct from old.sede_id
       or new.jornada_permitida <> old.jornada_permitida or new.estado <> old.estado) then
    raise exception 'Solo un SuperAdmin puede modificar rol, sede, jornada o estado' using errcode = '42501';
  end if;
  if old.rol_id = 'superadmin' and old.estado = 'activo'
     and (new.rol_id <> 'superadmin' or new.estado <> 'activo')
     and not exists (select 1 from public.perfiles where rol_id = 'superadmin' and estado = 'activo' and id <> old.id) then
    raise exception 'Debe existir al menos un SuperAdmin activo' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger perfiles_guard before update on public.perfiles
for each row execute function private.guardar_perfil();
