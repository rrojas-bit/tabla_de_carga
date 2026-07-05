"use client";

import { useState, useRef } from "react";
import { publishCarga } from "@/app/(dashboard)/importador/actions";
import SubirDocumentos from "./SubirDocumentos";
import type { ExtraccionDocumento } from "@/lib/ai/extract";

type Puerto = { id: string; nombre: string; codigo: string };

const CONTENEDOR_OPTIONS = [
  { value: "20_dry", label: "20' Dry" },
  { value: "40_dry", label: "40' Dry" },
  { value: "40_hc", label: "40' HC" },
  { value: "reefer", label: "Reefer" },
  { value: "open_top", label: "Open Top" },
  { value: "flat_rack", label: "Flat Rack" },
  { value: "45", label: "45'" },
];

const NAVIERAS = ["MSC", "Maersk", "Hapag-Lloyd", "COSCO", "Evergreen", "CMA CGM", "Yang Ming", "Otra"];

// Mapea nombres de campo de la extracción de IA a nombres de campo del formulario
// cuando no coinciden 1:1 (para resaltar campos_dudosos).
const DUDOSO_A_CAMPO: Record<string, string> = {
  peso_bruto_kg: "peso_tm",
  valor_usd: "valor_mercancia_usd",
};

export default function PublicarCargaForm({
  puertos,
  empresaId,
}: {
  puertos: Puerto[];
  empresaId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Campos que la IA puede pre-poblar
  const [tipoOperacion, setTipoOperacion] = useState("importacion");
  const [puertoId, setPuertoId] = useState("");
  const [tipoContenedor, setTipoContenedor] = useState("20_dry");
  const [pesoTM, setPesoTM] = useState<number | null>(null);
  const [naviera, setNaviera] = useState("");
  const [mercancia, setMercancia] = useState("");
  const [ducaNumero, setDucaNumero] = useState("");
  const [ducaTipo, setDucaTipo] = useState("");
  const [valorMercancia, setValorMercancia] = useState("");
  const [paisOrigen, setPaisOrigen] = useState("");

  const [documentoIds, setDocumentoIds] = useState<string[]>([]);
  const [camposPoblados, setCamposPoblados] = useState<Set<string>>(new Set());
  const [camposDudosos, setCamposDudosos] = useState<Set<string>>(new Set());

  const sobrepeso = pesoTM != null && pesoTM > 21;

  function limpiarResaltado(campo: string) {
    setCamposPoblados((prev) => {
      if (!prev.has(campo)) return prev;
      const next = new Set(prev);
      next.delete(campo);
      return next;
    });
    setCamposDudosos((prev) => {
      if (!prev.has(campo)) return prev;
      const next = new Set(prev);
      next.delete(campo);
      return next;
    });
  }

  function campoCls(campo: string) {
    if (camposDudosos.has(campo)) return " border-amber-300 bg-amber-50/40";
    if (camposPoblados.has(campo)) return " border-teal-200 bg-teal-50/40";
    return "";
  }

  function handleDocumentoSubido(documentoId: string) {
    setDocumentoIds((prev) => [...prev, documentoId]);
  }

  function handleExtraccion(nueva: ExtraccionDocumento) {
    const poblados = new Set<string>();

    if (nueva.tipo_operacion) {
      setTipoOperacion(nueva.tipo_operacion);
      poblados.add("tipo_operacion");
    }
    if (nueva.aduana) {
      const aduanaLower = nueva.aduana.toLowerCase();
      const match = puertos.find(
        (p) =>
          p.nombre.toLowerCase().includes(aduanaLower) ||
          aduanaLower.includes(p.nombre.toLowerCase())
      );
      if (match) {
        setPuertoId(match.id);
        poblados.add("puerto_id");
      }
    }
    if (nueva.tipo_contenedor) {
      setTipoContenedor(nueva.tipo_contenedor);
      poblados.add("tipo_contenedor");
    }
    if (nueva.peso_bruto_kg != null) {
      setPesoTM(Math.round((nueva.peso_bruto_kg / 1000) * 10) / 10);
      poblados.add("peso_tm");
    }
    if (nueva.naviera) {
      const navieraLower = nueva.naviera.toLowerCase();
      const match = NAVIERAS.find(
        (n) => n !== "Otra" && n.toLowerCase() === navieraLower
      );
      if (match) {
        setNaviera(match);
        poblados.add("naviera");
      }
    }
    if (nueva.mercancia) {
      setMercancia(nueva.mercancia);
      poblados.add("mercancia");
    }
    if (nueva.duca_numero) {
      setDucaNumero(nueva.duca_numero);
      poblados.add("duca_numero");
    }
    if (nueva.duca_tipo) {
      setDucaTipo(nueva.duca_tipo);
    }
    if (nueva.valor_usd != null) {
      setValorMercancia(String(nueva.valor_usd));
      poblados.add("valor_mercancia_usd");
    }
    if (nueva.pais_origen) {
      setPaisOrigen(nueva.pais_origen.toUpperCase());
      poblados.add("pais_origen");
    }

    setCamposPoblados((prev) => {
      const next = new Set(prev);
      poblados.forEach((c) => next.add(c));
      return next;
    });

    const dudososMapeados = nueva.campos_dudosos
      .map((c) => DUDOSO_A_CAMPO[c] ?? c)
      .filter((c) => poblados.has(c));
    if (dudososMapeados.length > 0) {
      setCamposDudosos((prev) => {
        const next = new Set(prev);
        dudososMapeados.forEach((c) => next.add(c));
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await publishCarga(new FormData(formRef.current));

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      formRef.current.reset();
      setTipoOperacion("importacion");
      setPuertoId("");
      setTipoContenedor("20_dry");
      setPesoTM(null);
      setNaviera("");
      setMercancia("");
      setDucaNumero("");
      setDucaTipo("");
      setValorMercancia("");
      setPaisOrigen("");
      setDocumentoIds([]);
      setCamposPoblados(new Set());
      setCamposDudosos(new Set());
      setResetKey((k) => k + 1);
      setTimeout(() => setSuccess(false), 4000);
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-5 mb-4">
      <p className="text-[14px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <i className="ti ti-plus-circle text-teal-400" />
        Publicar nueva carga
      </p>

      {success && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-100 rounded-md text-[12px] text-teal-600 flex items-center gap-2">
          <i className="ti ti-circle-check" />
          Carga publicada — los transportistas ya pueden hacer ofertas.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-coral-50 border border-coral-100 rounded-md text-[12px] text-coral-600">
          {error}
        </div>
      )}

      <SubirDocumentos
        key={resetKey}
        empresaId={empresaId}
        onDocumentoSubido={handleDocumentoSubido}
        onExtraccion={handleExtraccion}
      />

      <form ref={formRef} onSubmit={handleSubmit}>
        {documentoIds.map((id) => (
          <input key={id} type="hidden" name="documento_id" value={id} />
        ))}
        <input type="hidden" name="duca_tipo" value={ducaTipo} />

        {/* Row 1: tipo + puerto */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Tipo de operación">
            <select
              name="tipo_operacion"
              className={selectCls + campoCls("tipo_operacion")}
              value={tipoOperacion}
              onChange={(e) => {
                setTipoOperacion(e.target.value);
                limpiarResaltado("tipo_operacion");
              }}
              required
            >
              <option value="importacion">Importación</option>
              <option value="exportacion">Exportación</option>
            </select>
          </Field>
          <Field label="Puerto">
            <select
              name="puerto_id"
              className={selectCls + campoCls("puerto_id")}
              value={puertoId}
              onChange={(e) => {
                setPuertoId(e.target.value);
                limpiarResaltado("puerto_id");
              }}
              required
            >
              <option value="">Seleccionar…</option>
              {puertos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Row 2: contenedor + peso + naviera */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field label="Tipo contenedor">
            <select
              name="tipo_contenedor"
              className={selectCls + campoCls("tipo_contenedor")}
              value={tipoContenedor}
              onChange={(e) => {
                setTipoContenedor(e.target.value);
                limpiarResaltado("tipo_contenedor");
              }}
              required
            >
              {CONTENEDOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Peso estimado (TM)">
            <input
              type="number"
              name="peso_tm"
              step="0.1"
              min="0"
              max="50"
              placeholder="Ej. 18.5"
              className={inputCls + campoCls("peso_tm")}
              value={pesoTM ?? ""}
              onChange={(e) => {
                setPesoTM(e.target.value ? parseFloat(e.target.value) : null);
                limpiarResaltado("peso_tm");
              }}
            />
          </Field>
          <Field label="Naviera">
            <select
              name="naviera"
              className={selectCls + campoCls("naviera")}
              value={naviera}
              onChange={(e) => {
                setNaviera(e.target.value);
                limpiarResaltado("naviera");
              }}
            >
              <option value="">No especificada</option>
              {NAVIERAS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Sobrepeso alert */}
        {sobrepeso && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-md text-[12px] text-amber-600 flex items-start gap-2">
            <i className="ti ti-alert-triangle mt-0.5 flex-shrink-0" />
            <span>
              Peso sobre 21 TM — se aplicará cargo adicional por sobrepeso. El
              transportista debe contar con chassis de 3 ejes y habilitación.
            </span>
          </div>
        )}

        {/* Row 3: mercancía */}
        <div className="mb-3">
          <Field label="Mercancía (opcional)">
            <input
              type="text"
              name="mercancia"
              placeholder="Ej. Café en grano, Frijol negro, Concentrado…"
              className={inputCls + campoCls("mercancia")}
              value={mercancia}
              onChange={(e) => {
                setMercancia(e.target.value);
                limpiarResaltado("mercancia");
              }}
            />
          </Field>
        </div>

        {/* Row 4: destino + fecha */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Destino / Bodega">
            <input
              type="text"
              name="destino_direccion"
              required
              placeholder="Dirección de entrega final"
              className={inputCls}
            />
          </Field>
          <Field label="Fecha disponible">
            <input
              type="date"
              name="fecha_disponible"
              required
              className={inputCls}
              min={new Date().toISOString().split("T")[0]}
            />
          </Field>
        </div>

        {/* Row 5: tarifa + modo */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field
            label="Tarifa referencia (opcional — piso de subasta)"
            hint="Sin tarifa, los transportistas hacen sus ofertas y tú eliges."
          >
            <input
              type="number"
              name="tarifa_referencia"
              step="50"
              min="0"
              placeholder="US$ 0 — vacío para subasta abierta"
              className={inputCls}
            />
          </Field>
          <Field label="Modo de asignación">
            <select name="modo_asignacion" className={selectCls}>
              <option value="manual">Manual — yo elijo al transportista</option>
              <option value="automatico">Automático — mejor postor</option>
            </select>
          </Field>
        </div>

        {/* Row 6: seguro + GPS */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Seguro a la carga">
            <select name="seguro_carga" className={selectCls}>
              <option value="">No especificado</option>
              <option value="si">Sí — con cobertura</option>
              <option value="no">No</option>
            </select>
          </Field>
          <Field label="GPS en tiempo real">
            <select name="gps_requerido" className={selectCls}>
              <option value="no">No requerido (estados manuales)</option>
              <option value="si">Sí — pago adicional por tracking</option>
            </select>
          </Field>
        </div>

        {/* Row 7: datos DUCA */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.5px] mb-3">
            Datos aduaneros (opcional)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Número DUCA">
              <input
                type="text"
                name="duca_numero"
                placeholder="Ej. GT-2026-123456"
                className={inputCls + campoCls("duca_numero")}
                value={ducaNumero}
                onChange={(e) => {
                  setDucaNumero(e.target.value);
                  limpiarResaltado("duca_numero");
                }}
              />
            </Field>
            <Field label="Valor mercancía (USD)">
              <input
                type="number"
                name="valor_mercancia_usd"
                step="0.01"
                min="0"
                placeholder="Ej. 15000"
                className={inputCls + campoCls("valor_mercancia_usd")}
                value={valorMercancia}
                onChange={(e) => {
                  setValorMercancia(e.target.value);
                  limpiarResaltado("valor_mercancia_usd");
                }}
              />
            </Field>
            <Field label="País de origen">
              <input
                type="text"
                name="pais_origen"
                placeholder="Ej. CN, US, MX"
                maxLength={2}
                className={inputCls + campoCls("pais_origen")}
                value={paisOrigen}
                onChange={(e) => {
                  setPaisOrigen(e.target.value.toUpperCase());
                  limpiarResaltado("pais_origen");
                }}
              />
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-teal-400 text-white rounded-md text-[14px] font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Publicando..." : "Publicar carga →"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] text-gray-400 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-200 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-[13px] text-gray-800 focus:outline-none focus:border-teal-100";
const selectCls = inputCls;
