-- APLICADA en el proyecto `auracare` (ohzptabssphpclcadvrj).
-- ============ Inmutabilidad genérica ============
create or replace function private.inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Registro inmutable: no se permite % en %', tg_op, tg_table_name using errcode = '42501';
end $$;

create trigger notas_no_update_delete before update or delete on public.notas
  for each row execute function private.inmutable();
create trigger notas_no_truncate before truncate on public.notas
  for each statement execute function private.inmutable();
create trigger entregas_no_update_delete before update or delete on public.entregas
  for each row execute function private.inmutable();
create trigger entregas_turno_no_update_delete before update or delete on public.entregas_turno
  for each row execute function private.inmutable();
create trigger auditoria_no_update_delete before update or delete on public.auditoria
  for each row execute function private.inmutable();
create trigger auditoria_no_truncate before truncate on public.auditoria
  for each statement execute function private.inmutable();

-- ============ NOTAS: sellado en servidor ============
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
  new.jornada := private.jornada_actual();
  new.vigente := true;
  new.e2ee := false;
  new.descripcion_cifrada := null;
  new.signos := coalesce(new.signos, '{}'::jsonb);
  new.prev_hash := coalesce(prev, 'GENESIS');
  new.hash := private.hash_nota(new);
  return new;
end $$;

create trigger notas_before_insert before insert on public.notas
  for each row execute function private.notas_antes_insert();

-- Actualiza último estado/histórico del residente y genera alertas (rangos desde tabla, con override por residente)
create or replace function private.notas_despues_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text; v jsonb; n numeric; e text; h jsonb; arr jsonb; ov jsonb;
begin
  if new.persona_id is null or new.signos = '{}'::jsonb then return null; end if;
  select coalesce(r.hist, '{}'::jsonb), coalesce(r.rangos, '{}'::jsonb) into h, ov
    from public.residentes r where r.id = new.persona_id;
  for k, v in select key, value from jsonb_each(new.signos) loop
    n := (v #>> '{}')::numeric;
    if k <> 'dolor' then
      arr := coalesce(h -> k, '[]'::jsonb) || to_jsonb(n);
      if jsonb_array_length(arr) > 12 then
        select jsonb_agg(x.e order by x.o) into arr
          from jsonb_array_elements(arr) with ordinality as x(e, o)
          where x.o > jsonb_array_length(arr) - 12;
      end if;
      h := jsonb_set(h, array[k], arr, true);
      e := private.estado_signo(k, n, ov);
      if e in ('c', 'v') then
        insert into public.alertas (id, sede_id, persona_id, parametro, valor, sev, estado, hora, nota_id)
        values (gen_random_uuid()::text, new.sede_id, new.persona_id, k, n,
                case e when 'c' then 'critica' else 'vigilancia' end, 'activa', new.hora, new.id);
      end if;
    end if;
  end loop;
  update public.residentes set signos = coalesce(signos, '{}'::jsonb) || new.signos, hist = h where id = new.persona_id;
  return null;
end $$;

create trigger notas_after_insert after insert on public.notas
  for each row execute function private.notas_despues_insert();

-- Verificación de integridad de la cadena (invoker: respeta RLS)
create or replace function public.verificar_cadena_notas(p_sede text)
returns table (total int, validas int, primera_rota text)
language plpgsql stable security invoker set search_path = '' as $$
declare r public.notas; prev text := 'GENESIS'; n int := 0; ok int := 0; rota text;
begin
  for r in select * from public.notas where sede_id = p_sede order by seq loop
    n := n + 1;
    if r.prev_hash is not distinct from prev and r.hash = private.hash_nota(r) then
      ok := ok + 1;
    elsif rota is null then
      rota := r.id;
    end if;
    prev := r.hash;
  end loop;
  return query select n, ok, rota;
end $$;
revoke execute on function public.verificar_cadena_notas(text) from public, anon;
grant execute on function public.verificar_cadena_notas(text) to authenticated;

-- ============ ALERTAS: solo activa -> atendida, con sello de quién ============
create or replace function private.alertas_antes_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.estado = 'atendida' then
    raise exception 'La alerta ya fue atendida' using errcode = '23514';
  end if;
  if new.estado <> 'atendida' then
    raise exception 'Solo se permite marcar la alerta como atendida' using errcode = '23514';
  end if;
  new.atendida_por := (select auth.uid());
  new.atendida_en := now();
  return new;
end $$;
create trigger alertas_before_update before update on public.alertas
  for each row execute function private.alertas_antes_update();

-- ============ ENTREGAS de dotación: sello + límites de la tabla de reglas ============
create or replace function private.entregas_antes_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.perfiles; el public.elementos_dotacion; hoy date := (now() at time zone 'America/Bogota')::date; usado numeric;
begin
  select * into p from public.perfiles where id = (select auth.uid()) and estado = 'activo';
  if p.id is null then raise exception 'Sesión no válida o cuenta inactiva' using errcode = '42501'; end if;
  select * into el from public.elementos_dotacion where key = new.elemento;
  if not found then raise exception 'Elemento de dotación desconocido' using errcode = '22023'; end if;
  if new.persona_id is not null and not private.persona_en_sede(new.persona_id, new.sede_id) then
    raise exception 'La persona mayor no pertenece a esta sede' using errcode = '23503';
  end if;
  perform pg_advisory_xact_lock(hashtext('entregas:' || new.sede_id));
  if el.lim_persona_mes is not null and new.persona_id is not null then
    select coalesce(sum(cantidad), 0) into usado from public.entregas
      where persona_id = new.persona_id and elemento = new.elemento and date_trunc('month', fecha) = date_trunc('month', hoy);
    if usado + new.cantidad > el.lim_persona_mes then
      raise exception 'Límite mensual por persona superado para "%" (máx. %)', el.nombre, el.lim_persona_mes using errcode = '23514';
    end if;
  end if;
  if el.lim_unidad_mes is not null then
    select coalesce(sum(cantidad), 0) into usado from public.entregas
      where sede_id = new.sede_id and elemento = new.elemento and date_trunc('month', fecha) = date_trunc('month', hoy);
    if usado + new.cantidad > el.lim_unidad_mes then
      raise exception 'Límite mensual por unidad superado para "%" (máx. %)', el.nombre, el.lim_unidad_mes using errcode = '23514';
    end if;
  end if;
  new.id := gen_random_uuid()::text;
  new.fecha := hoy;
  new.quien := p.nombre;
  new.quien_id := p.id;
  new.created_at := now();
  return new;
end $$;
alter table public.entregas add constraint entregas_cantidad_ck check (cantidad between 1 and 100) not valid;
create trigger entregas_before_insert before insert on public.entregas
  for each row execute function private.entregas_antes_insert();

-- ============ ENTREGA DE TURNO ============
create or replace function private.entregas_turno_antes_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.perfiles;
begin
  select * into p from public.perfiles where id = (select auth.uid()) and estado = 'activo';
  if p.id is null then raise exception 'Sesión no válida o cuenta inactiva' using errcode = '42501'; end if;
  new.id := gen_random_uuid()::text;
  new.fecha := (now() at time zone 'America/Bogota')::date;
  new.jornada := private.jornada_actual();
  new.firmado_por := p.id;
  new.firmado_por_nombre := p.nombre;
  new.created_at := now();
  return new;
end $$;
create trigger entregas_turno_before_insert before insert on public.entregas_turno
  for each row execute function private.entregas_turno_antes_insert();

-- ============ PERTENENCIAS ============
create or replace function private.pertenencias_antes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.persona_id is not null and not private.persona_en_sede(new.persona_id, new.sede_id) then
      raise exception 'La persona mayor no pertenece a esta sede' using errcode = '23503';
    end if;
    new.id := gen_random_uuid()::text;
    new.estado := 'en_custodia';
    new.fecha_dev := null;
    new.fecha_recibo := (now() at time zone 'America/Bogota')::date;
    new.registrado_por := (select auth.uid());
  else
    if old.estado = 'devuelta' then raise exception 'La devolución ya fue registrada' using errcode = '23514'; end if;
    if new.estado <> 'devuelta' then raise exception 'Solo se permite registrar la devolución' using errcode = '23514'; end if;
    new.fecha_dev := (now() at time zone 'America/Bogota')::date;
    new.devuelta_por := (select auth.uid());
  end if;
  return new;
end $$;
create trigger pertenencias_before before insert or update on public.pertenencias
  for each row execute function private.pertenencias_antes();

-- ============ ASISTENCIAS: solo del día actual (Bogotá) ============
create or replace function private.asistencias_antes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.fecha <> (now() at time zone 'America/Bogota')::date then
      raise exception 'La asistencia solo se registra para el día actual' using errcode = '23514';
    end if;
    if not private.persona_en_sede(new.persona_id, new.sede_id) then
      raise exception 'La persona mayor no pertenece a esta sede' using errcode = '23503';
    end if;
  else
    if old.fecha <> (now() at time zone 'America/Bogota')::date then
      raise exception 'No se puede modificar la asistencia de días anteriores' using errcode = '23514';
    end if;
  end if;
  new.registrado_por := (select auth.uid());
  new.actualizado_en := now();
  return new;
end $$;
create trigger asistencias_before before insert or update on public.asistencias
  for each row execute function private.asistencias_antes();

-- ============ AUDITORÍA de cambios sensibles ============
create or replace function private.auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare j_new jsonb := to_jsonb(new); j_old jsonb; det jsonb; rid text; sid text;
begin
  rid := coalesce(j_new ->> 'id', j_new ->> 'sede_id', j_new ->> 'parametro', j_new ->> 'key');
  sid := coalesce(j_new ->> 'sede_id', case when tg_table_name = 'sedes' then j_new ->> 'id' end);
  if tg_op = 'UPDATE' then
    j_old := to_jsonb(old);
    if tg_table_name in ('perfiles', 'sedes', 'config_sedes', 'rangos_clinicos', 'elementos_dotacion') then
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into det
        from jsonb_each(j_new) where j_old -> key is distinct from value;
    else
      select jsonb_build_object('campos', coalesce(jsonb_agg(key), '[]'::jsonb)) into det
        from jsonb_each(j_new) where j_old -> key is distinct from value;
    end if;
  else
    det := '{}'::jsonb;
  end if;
  insert into public.auditoria (user_id, accion, tabla, registro_id, sede_id, detalle)
  values ((select auth.uid()), lower(tg_op), tg_table_name, rid, sid, det);
  return null;
end $$;

create trigger audit_perfiles after insert or update on public.perfiles for each row execute function private.auditar();
create trigger audit_residentes after insert or update on public.residentes for each row execute function private.auditar();
create trigger audit_sedes after insert or update on public.sedes for each row execute function private.auditar();
create trigger audit_config after insert or update on public.config_sedes for each row execute function private.auditar();
create trigger audit_rangos after update on public.rangos_clinicos for each row execute function private.auditar();
create trigger audit_elementos after update on public.elementos_dotacion for each row execute function private.auditar();
