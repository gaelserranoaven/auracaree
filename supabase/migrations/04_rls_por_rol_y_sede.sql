-- PENDIENTE DE APLICAR (el clasificador de Claude Code bloqueó su ejecución vía MCP).
-- Aplicar en el SQL Editor de Supabase, o autorizar a Claude a ejecutarla.
-- Efecto: elimina el acceso abierto "acceso_demo_*" y deja RLS por rol y sede.
-- La migración 04a (habilitar RLS en las 4 tablas nuevas) YA fue aplicada.

-- ============ Quitar acceso demo abierto ============
drop policy if exists acceso_demo_actividades on public.actividades;
drop policy if exists acceso_demo_alertas on public.alertas;
drop policy if exists acceso_demo_asistencias on public.asistencias;
drop policy if exists acceso_demo_config_sedes on public.config_sedes;
drop policy if exists acceso_demo_entregas on public.entregas;
drop policy if exists acceso_demo_notas on public.notas;
drop policy if exists acceso_demo_pertenencias on public.pertenencias;
drop policy if exists acceso_demo_residentes on public.residentes;
drop policy if exists acceso_demo_sedes on public.sedes;

-- ============ Privilegios mínimos (anon sin acceso a nada) ============
revoke all on all tables in schema public from anon, authenticated;
grant select on public.sedes, public.perfiles, public.residentes, public.notas, public.alertas,
  public.asistencias, public.actividades, public.entregas, public.pertenencias, public.config_sedes,
  public.rangos_clinicos, public.elementos_dotacion, public.entregas_turno, public.auditoria to authenticated;
grant insert on public.sedes, public.residentes, public.notas, public.asistencias, public.actividades,
  public.entregas, public.pertenencias, public.config_sedes, public.entregas_turno, public.auditoria to authenticated;
grant update (nombre, cupos) on public.sedes to authenticated;
grant update (nombre, rol_id, sede_id, jornada_permitida, estado) on public.perfiles to authenticated;
grant update (nombres, apellidos, doc, edad, dx, estado, fecha_egreso, motivo_egreso, rangos) on public.residentes to authenticated;
grant update (estado) on public.alertas to authenticated;
grant update (estado, motivo) on public.asistencias to authenticated;
grant update (nombre, linea, profesional, participacion) on public.actividades to authenticated;
grant update (estado, obs) on public.pertenencias to authenticated;
grant update (glu, dolor) on public.config_sedes to authenticated;
grant update on public.rangos_clinicos, public.elementos_dotacion to authenticated;

-- ============ Políticas (todas TO authenticated) ============
create policy perfiles_select on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or private.tiene_rol('superadmin'));
create policy perfiles_update on public.perfiles for update to authenticated
  using (id = (select auth.uid()) or private.tiene_rol('superadmin'))
  with check (id = (select auth.uid()) or private.tiene_rol('superadmin'));

create policy sedes_select on public.sedes for select to authenticated using (private.puede_sede(id));
create policy sedes_insert on public.sedes for insert to authenticated with check (private.tiene_rol('superadmin'));
create policy sedes_update on public.sedes for update to authenticated
  using (private.tiene_rol('superadmin')) with check (private.tiene_rol('superadmin'));

create policy config_select on public.config_sedes for select to authenticated using (private.puede_sede(sede_id));
create policy config_insert on public.config_sedes for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('superadmin','admin_sede'));
create policy config_update on public.config_sedes for update to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('superadmin','admin_sede'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('superadmin','admin_sede'));

create policy residentes_select on public.residentes for select to authenticated using (private.puede_sede(sede_id));
create policy residentes_insert on public.residentes for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('superadmin','admin_sede','admin_turno'));
create policy residentes_update on public.residentes for update to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('superadmin','admin_sede','admin_turno','medico'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('superadmin','admin_sede','admin_turno','medico'));

create policy notas_select on public.notas for select to authenticated using (private.puede_sede(sede_id));
create policy notas_insert on public.notas for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','medico','superadmin'));

create policy alertas_select on public.alertas for select to authenticated using (private.puede_sede(sede_id));
create policy alertas_update on public.alertas for update to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','medico','admin_sede','admin_turno','superadmin'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','medico','admin_sede','admin_turno','superadmin'));

create policy asistencias_select on public.asistencias for select to authenticated using (private.puede_sede(sede_id));
create policy asistencias_insert on public.asistencias for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'));
create policy asistencias_update on public.asistencias for update to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'));

create policy actividades_select on public.actividades for select to authenticated using (private.puede_sede(sede_id));
create policy actividades_insert on public.actividades for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'));
create policy actividades_update on public.actividades for update to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'));

create policy entregas_select on public.entregas for select to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin','auditor'));
create policy entregas_insert on public.entregas for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'));

create policy pert_select on public.pertenencias for select to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin','auditor'));
create policy pert_insert on public.pertenencias for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'));
create policy pert_update on public.pertenencias for update to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'))
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','superadmin'));

create policy turno_select on public.entregas_turno for select to authenticated
  using (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','medico','superadmin'));
create policy turno_insert on public.entregas_turno for insert to authenticated
  with check (private.puede_sede(sede_id) and private.tiene_rol('auxiliar','admin_sede','admin_turno','medico','superadmin'));

create policy rangos_select on public.rangos_clinicos for select to authenticated using (private.rol() is not null);
create policy rangos_update on public.rangos_clinicos for update to authenticated
  using (private.tiene_rol('superadmin')) with check (private.tiene_rol('superadmin'));
create policy elementos_select on public.elementos_dotacion for select to authenticated using (private.rol() is not null);
create policy elementos_update on public.elementos_dotacion for update to authenticated
  using (private.tiene_rol('superadmin')) with check (private.tiene_rol('superadmin'));

create policy auditoria_insert on public.auditoria for insert to authenticated
  with check (user_id = (select auth.uid()) and private.rol() is not null);
create policy auditoria_select on public.auditoria for select to authenticated
  using (private.tiene_rol('superadmin') or (private.tiene_rol('auditor') and private.puede_sede(sede_id)));

-- ============ Auditoría: no registrar el ruido de signos/hist que escriben las notas ============
create or replace function private.auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j_new jsonb := to_jsonb(new); j_old jsonb; det jsonb; rid text; sid text; cambios text[];
begin
  rid := coalesce(j_new ->> 'id', j_new ->> 'sede_id', j_new ->> 'parametro', j_new ->> 'key');
  sid := coalesce(j_new ->> 'sede_id', case when tg_table_name = 'sedes' then j_new ->> 'id' end);
  if tg_op = 'UPDATE' then
    j_old := to_jsonb(old);
    select array_agg(key) into cambios from jsonb_each(j_new) where j_old -> key is distinct from value;
    if cambios is null then return null; end if;
    if tg_table_name = 'residentes' and cambios <@ array['signos','hist'] then return null; end if;
    if tg_table_name in ('perfiles','sedes','config_sedes','rangos_clinicos','elementos_dotacion') then
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into det
        from jsonb_each(j_new) where j_old -> key is distinct from value;
    else
      det := jsonb_build_object('campos', to_jsonb(cambios));
    end if;
  else
    det := '{}'::jsonb;
  end if;
  insert into public.auditoria (user_id, accion, tabla, registro_id, sede_id, detalle)
  values ((select auth.uid()), lower(tg_op), tg_table_name, rid, sid, det);
  return null;
end $$;

-- ============ Realtime ============
alter publication supabase_realtime add table public.notas, public.alertas, public.asistencias,
  public.entregas, public.pertenencias, public.entregas_turno, public.residentes, public.actividades;
