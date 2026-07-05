-- ============================================================
-- Documentos de carga (DUCA, facturas de proveedor, BL, packing
-- list) + campos DUCA en cargas.
--
-- Permite que el importador/exportador suba documentos para que
-- una AI extraiga los datos y pre-popule el formulario de
-- "Publicar carga" (ver docs/PLAN_DUCA_AI.md §4).
-- ============================================================

-- Tipo de documento aduanero/comercial
CREATE TYPE public.documento_tipo AS ENUM (
  'duca', 'factura_proveedor', 'bl', 'packing_list', 'otro'
);

CREATE TABLE public.documentos_carga (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        uuid NOT NULL REFERENCES public.empresas(id),
  carga_id          uuid REFERENCES public.cargas(id), -- NULL hasta que se publique la carga
  tipo              public.documento_tipo NOT NULL DEFAULT 'otro',
  storage_path      text NOT NULL,
  nombre_archivo    text NOT NULL,
  mime_type         text NOT NULL,
  extraccion        jsonb, -- JSON completo devuelto por la AI
  estado_extraccion text NOT NULL DEFAULT 'pendiente'
    CHECK (estado_extraccion IN ('pendiente','procesando','completada','error')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_carga_empresa ON public.documentos_carga (empresa_id, created_at DESC);
CREATE INDEX idx_documentos_carga_carga   ON public.documentos_carga (carga_id) WHERE carga_id IS NOT NULL;

-- RLS: mismo patrón que cargas — cada empresa ve/crea solo sus documentos
ALTER TABLE public.documentos_carga ENABLE ROW LEVEL SECURITY;

CREATE POLICY doc_select_own ON public.documentos_carga FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY doc_insert_own ON public.documentos_carga FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY doc_update_own ON public.documentos_carga FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY documentos_carga_admin_all ON public.documentos_carga FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Campos DUCA en cargas (el detalle completo vive en documentos_carga.extraccion)
ALTER TABLE public.cargas
  ADD COLUMN duca_numero         text,
  ADD COLUMN duca_tipo           text CHECK (duca_tipo IN ('D','F','T')), -- DUCA-D/F/T
  ADD COLUMN valor_mercancia_usd numeric,
  ADD COLUMN pais_origen         text; -- ISO 3166-1 alpha-2, p.ej. 'CN', 'US'

-- ============================================================
-- Storage: bucket privado para documentos aduaneros/comerciales
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Paths: {empresa_id}/{uuid}-{nombre_original} — el primer segmento es la empresa dueña
CREATE POLICY documentos_storage_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY documentos_storage_select_own ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND (storage.foldername(name))[1] IN (
      SELECT empresa_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY documentos_storage_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos' AND public.is_admin())
  WITH CHECK (bucket_id = 'documentos' AND public.is_admin());
