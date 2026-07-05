# Plan: DUCA + extracción de documentos con AI + estandarización a USD

> Documento de planificación. **No implementar todo de una vez** — está dividido en fases
> independientes, cada una cabe en una sesión y termina con la app funcionando.
> Contexto: ContainerGT, plataforma de transporte de contenedores en Guatemala
> (Next.js 14 App Router + Supabase + Tailwind). Empezamos especializados en
> Guatemala/DUCA, pero con flexibilidad para otros países.

---

## 1. Estado actual (lo que existe hoy)

### Flujo del importador/exportador

1. El cliente llena a mano **"Publicar nueva carga"** (`src/components/importador/PublicarCargaForm.tsx`
   → server action `publishCarga` en `src/app/(dashboard)/importador/actions.ts`).
2. Los transportistas ofertan (`bids`).
3. El cliente acepta una oferta (`acceptBid`) y **el movimiento se crea automáticamente**
   (insert en `movimientos` con `etapa_actual: 0`).

**Implicación clave:** el formulario donde la AI ahorra clicks es el de *Publicar carga*,
no el del movimiento — el movimiento ya es automático. La DUCA y las facturas alimentan
la publicación de la carga (y quedan guardadas como documentos de esa carga).

### Moneda

- Los montos (`bids.monto`, `cargas.tarifa_referencia`, `tarifas_ruta.tarifa_minima`)
  son `numeric` sin columna de moneda.
- La UI muestra **"Q"** (quetzales) hardcodeado en: `BidsPanel.tsx:244`, `BidModal.tsx:124,164`,
  `CargaCard.tsx:77`, `Sidebar.tsx:374`, `TransportistaView.tsx:146,152` y el placeholder
  de `PublicarCargaForm.tsx:171`.
- La página de billing (`BillingView.tsx`) ya está en USD.

### AI

- Ya existe `src/lib/ai/analyze.ts`: usa `@anthropic-ai/sdk` (ya en `package.json`) con
  `ANTHROPIC_API_KEY` para evaluar riesgo de transportistas. Tiene el patrón de fallback
  cuando no hay API key configurada — replicarlo.

### Lo que NO existe todavía

- Supabase Storage (ningún bucket).
- Tabla de documentos.
- Campos DUCA en `cargas`.
- Ningún endpoint/action de extracción.

### Cosas existentes que nos sirven

- `cargas` ya tiene `bl_numero`, `numero_contenedor`, `mercancia`, `naviera`, `peso_tm` —
  destinos naturales del mapeo de extracción.
- `carga_estado` ya incluye `"borrador"` (sin uso actual) — útil si algún día queremos
  guardar borradores pre-publicación.
- `puertos.pais` ya existe — base para multi-país.
- RLS ya montado con patrón `profiles.empresa_id` + `is_admin()` (ver
  `supabase/migrations/20260610_rls_minimo_e_indices.sql`).

---

## 2. Decisión: todo en USD

**Justificación de negocio (confirmada):** la DUCA declara valores en aduana en USD, la
industria naviera cotiza en USD, y USD nos deja salir a El Salvador/Honduras/CR sin tocar nada.

### Qué cambia

1. **Convención de plataforma:** todo monto en la base de datos ES USD. Documentarlo en
   el README/CLAUDE.md.
2. **Columna de moneda para flexibilidad futura** (barato ahora, doloroso después):
   ```sql
   ALTER TABLE public.bids         ADD COLUMN moneda char(3) NOT NULL DEFAULT 'USD';
   ALTER TABLE public.cargas       ADD COLUMN moneda char(3) NOT NULL DEFAULT 'USD';
   ALTER TABLE public.tarifas_ruta ADD COLUMN moneda char(3) NOT NULL DEFAULT 'USD';
   ```
   No se agrega UI para elegir moneda — siempre USD por ahora.
3. **Helper central** `src/lib/money.ts`:
   ```ts
   export function formatUSD(n: number) {
     return new Intl.NumberFormat("es-GT", {
       style: "currency", currency: "USD", maximumFractionDigits: 0,
     }).format(n); // → "US$1,250"
   }
   ```
   Reemplazar TODOS los `Q ${x.toLocaleString("es-GT")}` listados arriba por `formatUSD(x)`.
4. **Labels de formularios:** placeholder `"Q 0.00 — vacío para subasta abierta"` →
   `"US$ 0 — vacío para subasta abierta"`; hints en BidModal igual.
5. **Datos existentes:** son datos de prueba/seed — NO convertir con tipo de cambio,
   solo re-etiquetar. (Si hubiera datos reales en producción habría que decidir
   conversión ~Q7.75/USD, pero no es el caso.)

---

## 3. Decisión: proveedor de AI (Gemini vs Claude)

Números reales por documento (DUCA típica: PDF de 2–4 páginas ≈ 6–8K tokens de entrada,
~800 de salida):

| Opción | Precio (in/out por millón) | Costo aprox. por documento | 1,000 docs/mes |
|---|---|---|---|
| Claude Haiku 4.5 | $1 / $5 | ~$0.011 | ~$11 |
| Gemini 2.5 Flash | ~$0.30 / $2.50 * | ~$0.004 | ~$4 |

\* Precio de Gemini según datos de entrenamiento — verificar precio vigente antes de decidir.

**Sí, Gemini es ~2–3× más barato por token. Pero la diferencia absoluta es < 1 centavo
por documento**, y elegir Claude elimina costos de integración reales:

- El proyecto **ya tiene** `@anthropic-ai/sdk` instalado, `ANTHROPIC_API_KEY` configurada
  y un patrón funcionando en `src/lib/ai/analyze.ts`. Gemini = segundo SDK, segunda API key,
  segunda facturación.
- Claude Haiku 4.5 soporta **PDF nativo** (bloques `document` base64, hasta 32MB) y
  **structured outputs** (`output_config.format` con JSON schema) → el JSON de salida está
  **garantizado válido contra nuestro schema**, sin el regex-matching frágil que hoy usa
  `analyze.ts`. Ambos proveedores son sólidos en interpretación visual de documentos a
  este nivel de dificultad (formularios estructurados con texto impreso).

**Recomendación: empezar con Claude Haiku 4.5** y diseñar `src/lib/ai/extract.ts` con una
interfaz limpia (`extraerDocumento(bytes, mimeType) → ExtraccionResult`) de forma que
cambiar el proveedor a Gemini sea tocar UN archivo si el volumen algún día hace material
la diferencia de costo (a partir de ~10K docs/mes empieza a importar).

---

## 4. Arquitectura de la funcionalidad

### 4.1 Modelo de datos (migración nueva)

```sql
-- Tipo de documento aduanero/comercial
CREATE TYPE public.documento_tipo AS ENUM (
  'duca', 'factura_proveedor', 'bl', 'packing_list', 'otro'
);

CREATE TABLE public.documentos_carga (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     uuid NOT NULL REFERENCES public.empresas(id),
  carga_id       uuid REFERENCES public.cargas(id),  -- NULL hasta que se publique la carga
  tipo           public.documento_tipo NOT NULL DEFAULT 'otro',
  storage_path   text NOT NULL,          -- ruta en el bucket
  nombre_archivo text NOT NULL,
  mime_type      text NOT NULL,
  extraccion     jsonb,                  -- JSON completo devuelto por la AI
  estado_extraccion text NOT NULL DEFAULT 'pendiente'
    CHECK (estado_extraccion IN ('pendiente','procesando','completada','error')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_carga_empresa ON public.documentos_carga (empresa_id, created_at DESC);
CREATE INDEX idx_documentos_carga_carga   ON public.documentos_carga (carga_id) WHERE carga_id IS NOT NULL;

-- RLS: cada empresa ve/crea solo sus documentos (mismo patrón que cargas)
ALTER TABLE public.documentos_carga ENABLE ROW LEVEL SECURITY;
CREATE POLICY doc_select_own ON public.documentos_carga FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY doc_insert_own ON public.documentos_carga FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY doc_update_own ON public.documentos_carga FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid()));
-- + policy admin_all como en las demás tablas

-- Campos DUCA en cargas (mínimos; el detalle completo vive en documentos_carga.extraccion)
ALTER TABLE public.cargas
  ADD COLUMN duca_numero        text,
  ADD COLUMN duca_tipo          text CHECK (duca_tipo IN ('D','F','T')),  -- DUCA-D/F/T
  ADD COLUMN valor_mercancia_usd numeric,
  ADD COLUMN pais_origen        text;   -- ISO 3166-1 alpha-2, p.ej. 'CN', 'US'
```

**Storage:** bucket privado `documentos` en Supabase Storage.
- Estructura de paths: `{empresa_id}/{uuid}-{nombre_original}`.
- Policies de storage: INSERT/SELECT solo si el primer segmento del path == empresa del
  usuario (patrón estándar `storage.foldername(name)[1]`), + acceso admin.
- Límite de tamaño del bucket: 10 MB por archivo, MIME permitidos:
  `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.

Nota DUCA: la Declaración Única Centroamericana es el formato estándar de **toda
Centroamérica** desde 2019 (DUCA-D importación/exportación definitiva, DUCA-F comercio
intra-centroamericano, DUCA-T tránsito). Especializarnos en DUCA ya nos cubre GT, SV, HN,
NI y CR — la "flexibilidad para otros países" viene casi gratis.

### 4.2 Extracción con AI — `src/lib/ai/extract.ts`

- Modelo: `claude-haiku-4-5` (mismo proveedor que `analyze.ts`).
- Entrada: bytes del archivo + mime type. PDFs van como bloque
  `{type: "document", source: {type: "base64", media_type: "application/pdf", data}}`;
  imágenes como bloque `image`. El bloque documento va ANTES del texto del prompt.
- Salida: usar **structured outputs** (`output_config: {format: {type: "json_schema", schema}}`)
  — NO regex sobre texto libre. Schema propuesto (genérico, sirve para DUCA, factura y BL):

```ts
export type ExtraccionDocumento = {
  tipo_documento: "duca" | "factura_proveedor" | "bl" | "packing_list" | "otro";
  confianza: "alta" | "media" | "baja";
  // Aduanero (DUCA)
  duca_numero: string | null;
  duca_tipo: "D" | "F" | "T" | null;
  tipo_operacion: "importacion" | "exportacion" | null;
  aduana: string | null;              // nombre/código de aduana de entrada o salida
  pais_origen: string | null;         // ISO-2
  pais_destino: string | null;        // ISO-2
  // Carga
  numero_contenedor: string | null;   // formato ISO 6346, p.ej. MSKU1234567
  tipo_contenedor: "20_dry"|"40_dry"|"40_hc"|"reefer"|"open_top"|"flat_rack"|"45"|null;
  peso_bruto_kg: number | null;       // el server lo convierte a TM (÷1000)
  marchamo: string | null;            // precinto/sello
  mercancia: string | null;           // descripción corta de la mercancía
  valor_usd: number | null;           // valor FOB/CIF/aduana en USD
  // Transporte
  bl_numero: string | null;
  naviera: string | null;
  campos_dudosos: string[];           // nombres de campos con baja confianza
};
```

- Prompt: contexto Guatemala/Centroamérica, pedir `null` cuando el dato no aparece
  (nunca inventar), y `campos_dudosos` para que la UI los resalte.
- Fallback sin API key: devolver extracción vacía con mensaje (mismo patrón que `analyze.ts`).
- Validación post-AI en el server: clamp de peso (0–50 TM), validar `tipo_contenedor`
  contra el enum, formato de contenedor ISO 6346, `valor_usd >= 0`.

### 4.3 Flujo de subida — evitar el límite de server actions

⚠️ **Restricción técnica importante:** los server actions de Next.js tienen body limit de
**1 MB por defecto** — un PDF no pasa. Solución recomendada (mejor que subir el límite):

1. **Cliente sube directo a Supabase Storage** con el client browser
   (`supabase.storage.from("documentos").upload(path, file)`) — RLS de storage protege.
2. Cliente inserta fila en `documentos_carga` (estado `pendiente`) y llama al server action
   `procesarDocumento(documentoId)` pasando solo el ID.
3. El server action (con el server client autenticado) descarga el archivo de Storage,
   llama `extraerDocumento()`, guarda `extraccion` + `estado_extraccion: 'completada'`,
   y devuelve el JSON al cliente.
4. Cliente pre-llena el formulario.

Tiempo esperado de extracción: ~5–15 s con Haiku. Mostrar estado "Leyendo documento…" en la UI.

### 4.4 UX en `PublicarCargaForm`

1. **Arriba del formulario**, nueva sección: *"📄 ¿Tienes la DUCA o factura? Súbela y
   llenamos el formulario por ti"* — dropzone/input file (acepta PDF/JPG/PNG, múltiples
   archivos: DUCA + factura + BL).
2. Al completar la extracción:
   - Pre-llenar: `tipo_operacion`, `puerto` (match de aduana/puerto contra tabla `puertos`
     por nombre — si no hay match, dejar vacío), `tipo_contenedor`, `peso_tm`, `naviera`,
     `mercancia`, y los nuevos `duca_numero`, `valor_mercancia_usd`, `pais_origen`.
   - Resaltar los campos populados (borde/fondo teal suave) y los `campos_dudosos`
     (borde ámbar + tooltip "verifica este dato").
   - **Todo queda editable** — el usuario revisa y da click en "Publicar carga" como hoy.
3. Al publicar, `publishCarga` además:
   - Guarda los nuevos campos DUCA en `cargas`.
   - Actualiza `documentos_carga.carga_id` con el ID de la carga creada (vincular los
     documentos subidos en esa sesión de formulario).
4. Si la extracción falla o el usuario no sube nada → formulario manual como siempre
   (cero regresión).

**Campos que la DUCA normalmente NO trae** y siguen siendo manuales: `destino_direccion`
(bodega final), `fecha_disponible`, `tarifa_referencia`, `modo_asignacion`, `seguro_carga`,
`gps_requerido`.

### 4.5 Protecciones

- Validar MIME y tamaño en cliente Y en policies de storage.
- Rate limit simple: máx. ~30 extracciones por empresa por día (contar filas de
  `documentos_carga` del día en el server action antes de llamar la AI).
- Nunca confiar en la extracción para campos con implicación legal sin revisión: el flujo
  siempre pasa por el formulario editable (ya cumplido por diseño).
- Los documentos pueden contener datos sensibles (NIT, valores) → bucket privado, nunca
  URLs públicas; usar signed URLs de corta duración solo si hay que previsualizar.

---

## 5. Fases de implementación (para las sesiones con Sonnet)

Cada fase es independiente y deja la app funcionando. Orden recomendado:

### Fase 0 — Estandarización a USD (chica, sin dependencias)
- [ ] Migración: columnas `moneda` default `'USD'` en `bids`, `cargas`, `tarifas_ruta`.
- [ ] `src/lib/money.ts` con `formatUSD()`.
- [ ] Reemplazar los 7 sitios con "Q" hardcodeado (lista en §1-Moneda) + placeholders.
- [ ] Actualizar `src/types/database.ts` (regenerar tipos con MCP `generate_typescript_types`).
- **Criterio de aceptación:** ninguna vista muestra "Q"; ofertas y tarifas se muestran "US$".

### Fase 1 — Datos y Storage
- [ ] Migración de §4.1 completa (enum, tabla, índices, RLS, columnas en `cargas`).
- [ ] Crear bucket `documentos` privado + policies de storage.
- [ ] Regenerar tipos.
- **Criterio:** subir un archivo a mano vía cliente supabase funciona y RLS bloquea
  el acceso cruzado entre empresas.

### Fase 2 — Extracción AI
- [ ] `src/lib/ai/extract.ts` según §4.2 (Haiku 4.5, PDF/imagen, structured outputs,
      fallback sin API key).
- [ ] Server action `procesarDocumento(documentoId)` en `importador/actions.ts`
      (descarga de storage → extrae → guarda → devuelve).
- [ ] Validación post-extracción + rate limit.
- **Criterio:** con una DUCA de prueba (PDF), el action devuelve JSON válido con los
  campos correctos.

### Fase 3 — UI de subida y pre-llenado
- [ ] Componente `SubirDocumentos.tsx` (dropzone, subida directa a storage, estados:
      subiendo → leyendo → listo/error).
- [ ] Integrar en `PublicarCargaForm`: pre-llenado + resaltado de campos AI/dudosos.
- [ ] `publishCarga`: persistir campos DUCA + vincular `documentos_carga.carga_id`.
- [ ] Mostrar DUCA/valor en `CargaDetalle` (solo lectura).
- **Criterio:** flujo completo — subir DUCA → formulario populado → editar → publicar →
  carga con `duca_numero` y documentos vinculados.

### Fase 4 — Extensiones (backlog, no ahora)
- Subir documentos después de publicada la carga (página de detalle) — útil para
  exportación donde la DUCA sale al final (etapa "En puerto (esperando documentos)").
- DUCA-T (tránsito) y campos de multi-país adicionales.
- Cambiar proveedor a Gemini si el volumen lo justifica (solo tocar `extract.ts`).
- Notificar al transportista cuando los documentos estén completos.

---

## 6. Decisiones ya tomadas (no re-abrir en implementación)

| Decisión | Valor |
|---|---|
| Moneda | USD en toda la plataforma; columna `moneda` default `'USD'` sin UI de selección |
| Datos Q existentes | Re-etiquetar (son datos de prueba), no convertir |
| Proveedor AI | Claude Haiku 4.5 (`claude-haiku-4-5`), swappeable vía interfaz en `extract.ts` |
| Formato salida AI | Structured outputs con JSON schema — no regex |
| Subida de archivos | Directa del browser a Supabase Storage; server action solo recibe el ID |
| Punto de integración | Formulario "Publicar carga" (el movimiento se crea solo al aceptar oferta) |
| Alcance países | DUCA = estándar centroamericano; schema de extracción genérico |
