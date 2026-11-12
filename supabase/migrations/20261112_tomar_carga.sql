-- ============================================================
-- "Tomar carga": un transportista acepta la tarifa publicada y la carga
-- queda asignada de inmediato (el primero que la toma se la queda).
-- SECURITY DEFINER porque el transportista no puede actualizar cargas
-- ajenas por RLS; las validaciones van aquí dentro.
-- ============================================================
create or replace function public.tomar_carga(
  p_carga_id uuid,
  p_cabezal_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_carga public.cargas%rowtype;
  v_bid_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select p.empresa_id into v_empresa_id
  from public.profiles p
  join public.empresas e on e.id = p.empresa_id
  where p.id = auth.uid()
    and p.rol = 'transportista'
    and e.estado = 'activo';

  if v_empresa_id is null then
    raise exception 'Solo transportistas con cuenta aprobada pueden tomar cargas'
      using errcode = '42501';
  end if;

  if p_cabezal_id is not null and not exists (
    select 1 from public.flota f
    where f.id = p_cabezal_id and f.empresa_id = v_empresa_id
  ) then
    raise exception 'El cabezal no pertenece a tu flota' using errcode = '42501';
  end if;

  -- Bloquea la fila: si dos transportistas toman a la vez, el segundo
  -- espera y luego ve la carga ya asignada.
  select * into v_carga from public.cargas where id = p_carga_id for update;

  if not found then
    raise exception 'Carga no encontrada';
  end if;
  if v_carga.estado not in ('publicada', 'en_subasta') then
    raise exception 'Esta carga ya fue tomada por otro transportista';
  end if;
  if v_carga.tarifa_referencia is null then
    raise exception 'Esta carga no tiene tarifa publicada; haz una oferta';
  end if;
  if v_carga.fecha_disponible < current_date then
    raise exception 'Esta carga ya venció';
  end if;

  -- Reusar la oferta pendiente propia si existe; si no, crear una.
  select id into v_bid_id from public.bids
  where carga_id = p_carga_id and empresa_id = v_empresa_id and estado = 'pendiente'
  limit 1;

  if v_bid_id is not null then
    update public.bids
      set monto = v_carga.tarifa_referencia,
          estado = 'aceptada',
          cabezal_id = coalesce(p_cabezal_id, cabezal_id),
          nota = coalesce(nota, 'Tomada a tarifa publicada')
      where id = v_bid_id;
  else
    insert into public.bids (carga_id, empresa_id, monto, cabezal_id, tiempo_respuesta, estado, nota)
    values (p_carga_id, v_empresa_id, v_carga.tarifa_referencia, p_cabezal_id,
            'menos_2h', 'aceptada', 'Tomada a tarifa publicada')
    returning id into v_bid_id;
  end if;

  update public.bids set estado = 'rechazada'
  where carga_id = p_carga_id and id <> v_bid_id and estado = 'pendiente';

  update public.cargas
    set estado = 'asignada',
        bid_ganador_id = v_bid_id,
        transportista_asignado_id = v_empresa_id
    where id = p_carga_id;

  insert into public.movimientos (carga_id, bid_id, cabezal_id, tipo_flujo, etapa_actual, historial)
  values (
    p_carga_id, v_bid_id, p_cabezal_id, v_carga.tipo_operacion::text::public.flujo_tipo, 0,
    jsonb_build_array(jsonb_build_object(
      'etapa', 0, 'timestamp', now(), 'method', 'tomar_carga'))
  );

  return v_bid_id;
end;
$$;

revoke execute on function public.tomar_carga(uuid, uuid) from public, anon;
grant execute on function public.tomar_carga(uuid, uuid) to authenticated;
