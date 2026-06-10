-- ============================================================
-- RLS mínimo necesario + índices para volumen alto
-- Applied: 2026-06-10
-- ============================================================

-- 1. CRÍTICO: movimientos no tenía política INSERT.
--    El cliente (importador/exportador) crea el movimiento al aceptar una oferta.
CREATE POLICY mov_insert_cliente ON public.movimientos
  FOR INSERT TO authenticated
  WITH CHECK (
    carga_id IN (
      SELECT id FROM public.cargas
      WHERE cliente_empresa_id IN (
        SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- 2. Cerrar INSERT abierto en empresas.
--    El registro usa service_role (bypassa RLS), no necesita esta política.
DROP POLICY IF EXISTS empresas_insert_own ON public.empresas;

-- 3. Cerrar INSERT abierto en pilotos.
--    Solo usuarios con empresa vinculada pueden registrar pilotos.
DROP POLICY IF EXISTS pilotos_insert ON public.pilotos;
CREATE POLICY pilotos_insert ON public.pilotos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND empresa_id IS NOT NULL
    )
  );

-- 4. Bypass admin/staff.
--    SECURITY DEFINER para evitar recursión en policies de profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol IN ('admin', 'staff')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'empresas','profiles','transportista_perfil','flota','pilotos',
    'piloto_empresa','flags_piloto','tarifas_ruta','cargas','bids',
    'movimientos','notificaciones','puertos'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY admin_all ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t
    );
  END LOOP;
END $$;

-- 5. Funciones SECURITY DEFINER: fijar search_path y quitar acceso vía RPC público.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.generar_numero_carga() SET search_path = public;
ALTER FUNCTION public.set_carga_numero() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.create_empresa_on_signup(uuid, text, text, text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generar_numero_carga() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_carga_numero() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_empresa_on_signup(uuid, text, text, text) FROM anon, authenticated, public;

-- 6. Índices para volumen alto.
--    idx_profiles_empresa es el más crítico: lo usa cada subconsulta de RLS.
CREATE INDEX IF NOT EXISTS idx_profiles_empresa ON public.profiles (empresa_id);
CREATE INDEX IF NOT EXISTS idx_cargas_estado_created ON public.cargas (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cargas_cliente ON public.cargas (cliente_empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cargas_transportista ON public.cargas (transportista_asignado_id)
  WHERE transportista_asignado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bids_carga_estado ON public.bids (carga_id, estado);
CREATE INDEX IF NOT EXISTS idx_bids_empresa_created ON public.bids (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_carga ON public.movimientos (carga_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_bid ON public.movimientos (bid_id);
CREATE INDEX IF NOT EXISTS idx_flota_empresa ON public.flota (empresa_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_tarifas_empresa ON public.tarifas_ruta (empresa_id);
CREATE INDEX IF NOT EXISTS idx_notif_usuario_noleida ON public.notificaciones (usuario_id) WHERE leida = false;
CREATE INDEX IF NOT EXISTS idx_piloto_empresa_empresa ON public.piloto_empresa (empresa_id);
CREATE INDEX IF NOT EXISTS idx_flags_piloto_piloto ON public.flags_piloto (piloto_id);
