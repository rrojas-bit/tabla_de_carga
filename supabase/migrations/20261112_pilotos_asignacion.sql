-- ============================================================
-- Pilotos: registro por la empresa, asignación a viajes, y bloqueo
-- de avance de etapas sin piloto asignado.
-- ============================================================

-- Registrar (o vincular, si el DPI ya existe) un piloto a la empresa
-- del usuario. SECURITY DEFINER porque la política de SELECT de pilotos
-- exige el vínculo piloto_empresa, que aún no existe al insertar.
create or replace function public.registrar_piloto(
  p_nombre text,
  p_dpi text,
  p_telefono text default null,
  p_licencia_tipo text default null,
  p_licencia_vencimiento date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_piloto_id uuid;
  v_dpi text := regexp_replace(coalesce(p_dpi, ''), '\s', '', 'g');
begin
  select p.empresa_id into v_empresa_id
  from public.profiles p
  where p.id = auth.uid() and p.rol = 'transportista' and p.empresa_id is not null;

  if v_empresa_id is null then
    raise exception 'Solo transportistas pueden registrar pilotos' using errcode = '42501';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El nombre del piloto es obligatorio';
  end if;
  if v_dpi !~ '^\d{13}$' then
    raise exception 'El DPI debe tener 13 dígitos';
  end if;

  select id into v_piloto_id from public.pilotos where dpi = v_dpi limit 1;

  if v_piloto_id is null then
    insert into public.pilotos (nombre_completo, dpi, telefono, licencia_tipo, licencia_vencimiento)
    values (trim(p_nombre), v_dpi, nullif(trim(p_telefono), ''),
            nullif(trim(p_licencia_tipo), ''), p_licencia_vencimiento)
    returning id into v_piloto_id;
  end if;

  if exists (select 1 from public.piloto_empresa
             where piloto_id = v_piloto_id and empresa_id = v_empresa_id) then
    update public.piloto_empresa set activo = true, fecha_fin = null
    where piloto_id = v_piloto_id and empresa_id = v_empresa_id;
  else
    insert into public.piloto_empresa (piloto_id, empresa_id, activo, fecha_inicio)
    values (v_piloto_id, v_empresa_id, true, current_date);
  end if;

  return v_piloto_id;
end;
$$;

-- Asignar piloto (obligatorio) y cabezal (opcional) a un viaje propio.
create or replace function public.asignar_viaje(
  p_movimiento_id uuid,
  p_piloto_id uuid,
  p_cabezal_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  select p.empresa_id into v_empresa_id
  from public.profiles p where p.id = auth.uid();

  if v_empresa_id is null or not exists (
    select 1 from public.movimientos m join public.cargas c on c.id = m.carga_id
    where m.id = p_movimiento_id and c.transportista_asignado_id = v_empresa_id
  ) then
    raise exception 'Viaje no encontrado' using errcode = '42501';
  end if;

  if not exists (select 1 from public.piloto_empresa
                 where piloto_id = p_piloto_id and empresa_id = v_empresa_id and activo) then
    raise exception 'El piloto no pertenece a tu empresa' using errcode = '42501';
  end if;

  if p_cabezal_id is not null and not exists (
    select 1 from public.flota
    where id = p_cabezal_id and empresa_id = v_empresa_id and tipo = 'cabezal' and activo
  ) then
    raise exception 'El cabezal no pertenece a tu flota' using errcode = '42501';
  end if;

  update public.movimientos
    set piloto_id = p_piloto_id,
        cabezal_id = coalesce(p_cabezal_id, cabezal_id)
    where id = p_movimiento_id;
end;
$$;

revoke execute on function public.registrar_piloto(text, text, text, text, date) from public, anon;
grant execute on function public.registrar_piloto(text, text, text, text, date) to authenticated;
revoke execute on function public.asignar_viaje(uuid, uuid, uuid) from public, anon;
grant execute on function public.asignar_viaje(uuid, uuid, uuid) to authenticated;

-- Regla: un viaje no puede avanzar de etapa sin piloto asignado.
-- Además, por actualización directa, el piloto debe ser de la empresa
-- transportista del viaje (admins y service_role exentos).
create or replace function public.validar_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.etapa_actual > old.etapa_actual and new.piloto_id is null then
    raise exception 'Asigna un piloto antes de avanzar el viaje' using errcode = '23514';
  end if;

  if new.piloto_id is distinct from old.piloto_id and new.piloto_id is not null
     and auth.uid() is not null and not public.is_admin()
     and not exists (
       select 1 from public.piloto_empresa pe join public.cargas c
         on c.transportista_asignado_id = pe.empresa_id
       where c.id = new.carga_id and pe.piloto_id = new.piloto_id and pe.activo
     ) then
    raise exception 'El piloto no pertenece a la empresa del viaje' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.validar_movimiento() from public, anon, authenticated;

drop trigger if exists trg_validar_movimiento on public.movimientos;
create trigger trg_validar_movimiento
  before update on public.movimientos
  for each row execute function public.validar_movimiento();

-- Estado de la carga según el avance del viaje. Antes lo hacía la app
-- con un UPDATE a cargas que el transportista no tiene permitido por RLS
-- (fallaba en silencio y la carga nunca quedaba "entregada").
create or replace function public.sync_estado_carga()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int := case new.tipo_flujo when 'exportacion' then 6 else 5 end;
begin
  if new.etapa_actual is distinct from old.etapa_actual then
    if new.etapa_actual >= v_max then
      update public.cargas set estado = 'entregada'
      where id = new.carga_id and estado in ('asignada', 'en_transito');
    elsif new.etapa_actual > 0 then
      update public.cargas set estado = 'en_transito'
      where id = new.carga_id and estado = 'asignada';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_estado_carga() from public, anon, authenticated;

drop trigger if exists trg_sync_estado_carga on public.movimientos;
create trigger trg_sync_estado_carga
  after update on public.movimientos
  for each row execute function public.sync_estado_carga();
