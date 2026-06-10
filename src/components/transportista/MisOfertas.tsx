"use client";

import { useState } from "react";
import { withdrawBid } from "@/app/(dashboard)/transportista/actions";
import type { MiOferta } from "@/app/(dashboard)/transportista/page";

const CONTENEDOR_LABEL: Record<string, string> = {
  "20_dry": "20' Dry",
  "40_dry": "40' Dry",
  "40_hc": "40' HC",
  reefer: "Reefer",
  open_top: "Open Top",
  flat_rack: "Flat Rack",
  "45": "45'",
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-600",
  aceptada: "bg-teal-50 text-teal-600",
  rechazada: "bg-coral-50 text-coral-600",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada ✓",
  rechazada: "Rechazada",
};

export default function MisOfertas({ ofertas }: { ofertas: MiOferta[] }) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  async function handleWithdraw(bidId: string) {
    setWithdrawing(bidId);
    const result = await withdrawBid(bidId);
    if (result?.success) {
      setHidden((prev) => new Set(prev).add(bidId));
    }
    setWithdrawing(null);
  }

  const visible = ofertas.filter((o) => !hidden.has(o.id));

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <i className="ti ti-gavel text-5xl text-gray-100 mb-3 block" />
        <p className="text-sm text-gray-400 font-medium">
          No has hecho ofertas aún
        </p>
        <p className="text-xs text-gray-200 mt-1.5">
          Tus ofertas y su estado aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {visible.map((oferta) => {
        const carga = oferta.carga;
        const isImport = carga?.tipo_operacion === "importacion";
        const ruta = carga
          ? isImport
            ? `${carga.puerto?.nombre ?? "Puerto"} → ${carga.destino_direccion}`
            : `${carga.destino_direccion} → ${carga.puerto?.nombre ?? "Puerto"}`
          : "—";

        return (
          <div
            key={oferta.id}
            className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                    ESTADO_BADGE[oferta.estado] ?? "bg-gray-50 text-gray-400"
                  }`}
                >
                  {ESTADO_LABEL[oferta.estado] ?? oferta.estado}
                </span>
                {carga?.numero && (
                  <span className="text-[12px] text-gray-200">
                    #{carga.numero}
                  </span>
                )}
              </div>
              <span className="text-base font-semibold text-teal-600">
                Q {oferta.monto.toLocaleString("es-GT")}
              </span>
            </div>

            <p className="text-[13px] font-medium text-gray-800 mb-1">
              {ruta}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
              {carga && (
                <span>
                  {CONTENEDOR_LABEL[carga.tipo_contenedor] ??
                    carga.tipo_contenedor}
                </span>
              )}
              <span>
                Enviada{" "}
                {new Date(oferta.created_at).toLocaleDateString("es-GT", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {oferta.estado === "pendiente" && (
                <button
                  onClick={() => handleWithdraw(oferta.id)}
                  disabled={withdrawing === oferta.id}
                  className="ml-auto text-coral-600 hover:underline disabled:opacity-60"
                >
                  {withdrawing === oferta.id ? "Retirando…" : "Retirar oferta"}
                </button>
              )}
              {oferta.estado === "aceptada" && (
                <span className="ml-auto text-teal-600 font-semibold">
                  ¡Ganaste esta carga!
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
