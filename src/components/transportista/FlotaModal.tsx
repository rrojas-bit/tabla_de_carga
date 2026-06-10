"use client";

import { useState, useRef } from "react";
import { addFlotaUnit } from "@/app/(dashboard)/transportista/actions";

const CHASSIS_OPTIONS = [
  { value: "20_dry", label: "Chassis 20'" },
  { value: "40_dry", label: "Chassis 40'" },
  { value: "40_hc", label: "Chassis 40' HC" },
  { value: "reefer", label: "Chassis Reefer" },
  { value: "open_top", label: "Chassis Open Top" },
  { value: "flat_rack", label: "Flat Rack" },
  { value: "3_ejes", label: "Chassis 3 ejes (sobrepeso)" },
];

export default function FlotaModal({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<"cabezal" | "chassis">("cabezal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setLoading(true);
    setError(null);

    const result = await addFlotaUnit(new FormData(formRef.current));

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-[999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-gray-800">
            Agregar unidad
          </h2>
          <button
            onClick={onClose}
            className="text-gray-200 hover:text-gray-400 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-coral-50 border border-coral-100 rounded-md text-[12px] text-coral-600">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-[12px] text-gray-400 mb-1">
              Tipo de unidad
            </label>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "cabezal" | "chassis")}
              className={inputCls}
            >
              <option value="cabezal">Cabezal</option>
              <option value="chassis">Chassis</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[12px] text-gray-400 mb-1">
              Placa
            </label>
            <input
              type="text"
              name="placa"
              required
              placeholder="Ej. C-492 BJK"
              className={inputCls}
            />
          </div>

          {tipo === "chassis" ? (
            <div className="mb-3">
              <label className="block text-[12px] text-gray-400 mb-1">
                Tipo de chassis
              </label>
              <select name="tipo_chassis" required className={inputCls}>
                {CHASSIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[12px] text-gray-400 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    name="marca"
                    placeholder="Ej. Kenworth"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-gray-400 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    name="modelo"
                    placeholder="Ej. T680"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-[12px] text-gray-400 mb-1">
                  Año
                </label>
                <input
                  type="number"
                  name="anno"
                  min={1980}
                  max={new Date().getFullYear() + 1}
                  placeholder="Ej. 2019"
                  className={inputCls}
                />
              </div>
            </>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[rgba(68,68,65,0.12)] rounded-md text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 bg-teal-400 text-white rounded-md text-[13px] font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Agregar unidad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-[13px] text-gray-800 focus:outline-none focus:border-teal-100";
