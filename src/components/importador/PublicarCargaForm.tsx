"use client";

import { useState, useRef } from "react";
import { publishCarga } from "@/app/(dashboard)/importador/actions";

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

export default function PublicarCargaForm({ puertos }: { puertos: Puerto[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pesoTM, setPesoTM] = useState<number | null>(null);

  const sobrepeso = pesoTM != null && pesoTM > 21;

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
      setPesoTM(null);
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

      <form ref={formRef} onSubmit={handleSubmit}>
        {/* Row 1: tipo + puerto */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Tipo de operación">
            <select name="tipo_operacion" className={selectCls} required>
              <option value="importacion">Importación</option>
              <option value="exportacion">Exportación</option>
            </select>
          </Field>
          <Field label="Puerto">
            <select name="puerto_id" className={selectCls} required>
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
            <select name="tipo_contenedor" className={selectCls} required>
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
              className={inputCls}
              onChange={(e) =>
                setPesoTM(e.target.value ? parseFloat(e.target.value) : null)
              }
            />
          </Field>
          <Field label="Naviera">
            <select name="naviera" className={selectCls}>
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

        {/* Row 3: destino + fecha */}
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

        {/* Row 4: tarifa + modo */}
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
              placeholder="Q 0.00 — vacío para subasta abierta"
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

        {/* Row 5: seguro + GPS */}
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
