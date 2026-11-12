"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { tomarCarga } from "@/app/(dashboard)/transportista/actions";
import type { CargaRow } from "@/app/(dashboard)/transportista/page";
import { CONTENEDOR_LABEL } from "@/lib/labels";

type FlotaItem = {
  id: string;
  placa: string;
  tipo: string;
  estado: string;
};

type Props = {
  carga: CargaRow;
  flota: FlotaItem[];
  onClose: () => void;
  onTomada: (cargaId: string) => void;
};

const inputCls =
  "w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-[13px] text-gray-800 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50";

export default function TomarCargaModal({ carga, flota, onClose, onTomada }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [cabezalId, setCabezalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const tarifa = carga.tarifa_referencia ?? 0;
  const tarifaLabel = `Q ${tarifa.toLocaleString("es-GT")}`;
  const cabezalesLibres = flota.filter(
    (f) => f.tipo === "cabezal" && f.estado === "libre"
  );
  const isImport = carga.tipo_operacion === "importacion";
  const rutaLabel = isImport
    ? `${carga.puerto?.nombre ?? "Puerto"} → ${carga.destino_direccion}`
    : `${carga.destino_direccion} → ${carga.puerto?.nombre ?? "Puerto"}`;

  async function confirmar() {
    setLoading(true);
    setError(null);
    const result = await tomarCarga(carga.id, cabezalId || null);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    toast.success(`¡Carga tomada por ${tarifaLabel}! Ya está asignada a tu empresa.`);
    onTomada(carga.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "var(--scrim)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tomar-modal-title"
        className="bg-white p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--elevation-4)",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="tomar-modal-title" className="text-base font-semibold text-gray-800">
            Tomar carga
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        <div className="bg-gray-50 rounded-md p-3 mb-4 text-[12px] text-gray-400 leading-7">
          <p>
            <strong className="text-gray-800">
              {isImport ? "Importación" : "Exportación"}
            </strong>{" "}
            {carga.numero ? `· #${carga.numero}` : ""}
          </p>
          {carga.mercancia && (
            <p>
              <strong className="text-gray-800">Mercancía:</strong> {carga.mercancia}
            </p>
          )}
          <p>
            <strong className="text-gray-800">Ruta:</strong> {rutaLabel}
          </p>
          <p>
            <strong className="text-gray-800">Contenedor:</strong>{" "}
            {CONTENEDOR_LABEL[carga.tipo_contenedor] ?? carga.tipo_contenedor}
          </p>
          {carga.sobrepeso && (
            <p className="text-amber-600 font-semibold">
              ⚠ Sobrepeso — requiere chassis de 3 ejes
            </p>
          )}
        </div>

        <div
          className="mb-4 p-3 rounded-md text-[12px] leading-relaxed"
          style={{
            background: "var(--color-primary-weak)",
            color: "var(--text-strong)",
          }}
        >
          Aceptas la tarifa publicada de <strong>{tarifaLabel}</strong>. La carga
          queda <strong>asignada a tu empresa de inmediato</strong>, sin esperar
          al cliente, y las demás ofertas se cierran.
        </div>

        {error && (
          <div
            role="alert"
            className="mb-3 p-2.5 bg-coral-50 border border-coral-100 rounded-md text-[12px] text-coral-600"
          >
            {error}
          </div>
        )}

        {cabezalesLibres.length > 0 && (
          <div className="mb-4">
            <label htmlFor="tomar-cabezal" className="block text-[12px] text-gray-400 mb-1">
              Cabezal asignado (opcional)
            </label>
            <select
              id="tomar-cabezal"
              value={cabezalId}
              onChange={(e) => setCabezalId(e.target.value)}
              className={inputCls}
            >
              <option value="">Definir después</option>
              {cabezalesLibres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.placa}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-[rgba(68,68,65,0.12)] rounded-md text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={confirmar}
            disabled={loading}
            className="flex-[2] py-2.5 text-white rounded-[var(--radius-md)] text-[13px] font-semibold transition-colors disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {loading ? "Asignando…" : `Confirmar · ${tarifaLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
