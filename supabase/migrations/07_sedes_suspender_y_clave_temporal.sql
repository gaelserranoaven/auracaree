-- APLICADA el 02-oct-2026 en el proyecto `auracare` (ohzptabssphpclcadvrj).
-- 07 · Suspender sedes (nunca eliminarlas) y cuentas creadas por el SuperAdmin con clave temporal.
-- Efecto:
--   1. Las sedes no se eliminan: un trigger bloquea DELETE/TRUNCATE (también a accesos directos). Toda la
--      información, la cadena de notas y la auditoría se conservan (Res. 1995 de 1999, revisión forense).
--   2. sedes.activa + motivo/quién/cuándo de la suspensión. Una sede suspendida desaparece de la operación y
--      su personal pierde el acceso (puede_sede exige sede activa salvo al SuperAdmin). Solo el SuperAdmin
--      suspende o reactiva; cada cambio queda en la auditoría (trigger audit_sedes).
--   3. perfiles.debe_cambiar_clave: la Edge Function crear-usuario lo pone en true; el usuario solo puede
--      apagarlo (al cambiar su clave). Nadie más que un SuperAdmin puede encenderlo.

-- ============ 1. Sedes: nunca se eliminan ============
create trigger sedes_no_delete before delete on public.sedes
  for each row execute function private.inmutable();
create trigger sedes_no_truncate before truncate on public.sedes
  for each statement execute function private.inmutable();

-- ============ 2. Suspensión ============
alter table public.sedes
  add column activa boolean not null default true,
  add column motivo_suspension text check (motivo_suspension is null or char_length(motivo_suspension) <= 500),
  add column suspendida_en timestamptz,
  add column suspendida_por uuid references auth.users(id);
grant update (activa, motivo_suspension) on public.sedes to authenticated;  -- la política sedes_update ya exige SuperAdmin

create or replace function private.sedes_antes_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.activa is distinct from old.activa then
    if not new.activa then
      if char_length(trim(coalesce(new.motivo_suspension, ''))) < 5 then
        raise exception 'Indica el motivo de la suspensión (mínimo 5 caracteres)' using errcode = '23514';
      end if;
      new.suspendida_en := now();
      new.suspendida_por := (select auth.uid());
    else
      -- Al reactivar se limpia el estado actual; el historial completo queda en la auditoría
      new.motivo_suspension := null;
      new.suspendida_en := null;
      new.suspendida_por := null;
    end if;
  elsif new.motivo_suspension is distinct from old.motivo_suspension then
    raise exception 'El motivo solo se registra al suspender la sede' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger sedes_before_update before update on public.sedes
  for each row execute function private.sedes_antes_update();

create or replace function private.puede_sede(s text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = (select auth.uid()) and p.estado = 'activo'
      and (p.rol_id = 'superadmin'
           or (p.sede_id = s and exists (select 1 from public.sedes x where x.id = s and x.activa)))
  )
$$;

-- ============ 3. Clave temporal: cambio obligatorio ============
alter table public.perfiles add column debe_cambiar_clave boolean not null default false;
grant update (debe_cambiar_clave) on public.perfiles to authenticated;

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
  -- El propio usuario solo puede apagar la marca (al cambiar su clave), nunca encenderla
  if (select auth.uid()) is not null and not es_admin and new.debe_cambiar_clave and not old.debe_cambiar_clave then
    raise exception 'Solo un SuperAdmin puede exigir cambio de clave' using errcode = '42501';
  end if;
  if old.rol_id = 'superadmin' and old.estado = 'activo'
     and (new.rol_id <> 'superadmin' or new.estado <> 'activo')
     and not exists (select 1 from public.perfiles where rol_id = 'superadmin' and estado = 'activo' and id <> old.id) then
    raise exception 'Debe existir al menos un SuperAdmin activo' using errcode = '23514';
  end if;
  return new;
end $$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
