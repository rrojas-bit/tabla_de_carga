"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { submitBid } from "@/app/(dashboard)/transportista/actions";
import type { CargaRow } from "@/app/(dashboard)/transportista/page";
import { CONTENEDOR_LABEL } from "@/lib/labels";

type FlotaItem = {
  id: string;
  placa: string;
  tipo: string;
  estado: string;
};

type Props = {
  carga: CargaRow | null;
  flota: FlotaItem[];
  onClose: () => void;
};

const TIEMPO_LABELS: Record<string, string> = {
  menos_2h: "Respondo en menos de 2 horas",
  "2_4h": "Respondo en 2-4 horas",
  mismo_dia: "Respondo el mismo día",
};

const inputCls =
  "w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-[13px] text-gray-800 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50";

export default function BidModal({ carga, flota, onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    montoRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!carga) return null;

  const cabezalesLibres = flota.filter(
    (f) => f.tipo === "cabezal" && f.estado === "libre"
  );
  const isImport = carga.tipo_operacion === "importacion";
  const rutaLabel = isImport
    ? `${carga.puerto?.nombre ?? "Puerto"} → ${carga.destino_direccion}`
    : `${carga.destino_direccion} → ${carga.puerto?.nombre ?? "Puerto"}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(formRef.current);
    const result = await submitBid(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    toast.success("Oferta enviada — te notificaremos si es aceptada");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-[999] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bid-modal-title"
        className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 id="bid-modal-title" className="text-base font-semibold text-gray-800">
            Hacer oferta
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Carga info */}
        <div className="bg-gray-50 rounded-md p-3 mb-4 text-[12px] text-gray-400 leading-7">
          <p>
            <strong className="text-gray-800">
              {isImport ? "Importación" : "Exportación"}
            </strong>{" "}
            {carga.numero ? `· #${carga.numero}` : ""}
          </p>
          {carga.mercancia && (
            <p>
              <strong className="text-gray-800">Mercancía:</strong>{" "}
              {carga.mercancia}
            </p>
          )}
          <p>
            <strong className="text-gray-800">Ruta:</strong> {rutaLabel}
          </p>
          <p>
            <strong className="text-gray-800">Contenedor:</strong>{" "}
            {CONTENEDOR_LABEL[carga.tipo_contenedor] ?? carga.tipo_contenedor}
          </p>
          {carga.tarifa_referencia && (
            <p>
              <strong className="text-gray-800">Referencia:</strong> Q{" "}
              {carga.tarifa_referencia.toLocaleString("es-GT")}
            </p>
          )}
          {carga.sobrepeso && (
            <p className="text-amber-600 font-semibold">
              ⚠ Sobrepeso — requiere chassis de 3 ejes
            </p>
          )}
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-coral-50 border border-coral-100 rounded-md text-[12px] text-coral-600">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit}>
          <input type="hidden" name="carga_id" value={carga.id} />

          <div className="mb-3">
            <label htmlFor="bid-monto" className="block text-[12px] text-gray-400 mb-1">
              Tu oferta (Q)
            </label>
            <input
              id="bid-monto"
              ref={montoRef}
              type="number"
              name="monto"
              required
              min={1}
              step={50}
              placeholder={
                carga.tarifa_referencia
                  ? `Ej. ${carga.tarifa_referencia}`
                  : "Ej. 3200"
              }
              className={inputCls}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {carga.tarifa_referencia
                ? `Tarifa de referencia: Q ${carga.tarifa_referencia.toLocaleString("es-GT")}`
                : "El cliente evalúa y elige la mejor oferta"}
            </p>
          </div>

          {cabezalesLibres.length > 0 && (
            <div className="mb-3">
              <label htmlFor="bid-cabezal" className="block text-[12px] text-gray-400 mb-1">
                Cabezal disponible (opcional)
              </label>
              <select id="bid-cabezal" name="cabezal_id" className={inputCls}>
                <option value="">Sin especificar</option>
                {cabezalesLibres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.placa}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="bid-tiempo" className="block text-[12px] text-gray-400 mb-1">
              Tiempo de respuesta
            </label>
            <select
              id="bid-tiempo"
              name="tiempo_respuesta"
              defaultValue="menos_2h"
              className={inputCls}
            >
              {Object.entries(TIEMPO_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="bid-nota" className="block text-[12px] text-gray-400 mb-1">
              Nota (opcional)
            </label>
            <textarea
              id="bid-nota"
              name="nota"
              rows={2}
              placeholder="Cualquier detalle relevante para el cliente…"
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-2">
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
              {loading ? "Enviando..." : "Enviar oferta →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
