"use client";

import { useState } from "react";
import PublicarCargaForm from "./PublicarCargaForm";
import BidsPanel from "./BidsPanel";
import { cancelCarga } from "@/app/(dashboard)/importador/actions";
import type { CargaResumen } from "@/app/(dashboard)/importador/page";

type Puerto = { id: string; nombre: string; codigo: string };

type Props = {
  puertos: Puerto[];
  misCargas: CargaResumen[];
};

const ESTADO_BADGE: Record<string, string> = {
  publicada: "bg-gray-50 text-gray-400",
  en_subasta: "bg-amber-50 text-amber-600",
  asignada: "bg-teal-50 text-teal-600",
  en_transito: "bg-blue-50 text-blue-600",
  entregada: "bg-teal-50 text-teal-600",
};

const ESTADO_LABEL: Record<string, string> = {
  publicada: "Publicada",
  en_subasta: "En subasta",
  asignada: "Asignada",
  en_transito: "En tránsito",
  entregada: "Entregada",
};

const CONTENEDOR_LABEL: Record<string, string> = {
  "20_dry": "20' Dry",
  "40_dry": "40' Dry",
  "40_hc": "40' HC",
  reefer: "Reefer",
  open_top: "Open Top",
  flat_rack: "Flat Rack",
  "45": "45'",
};

export default function ImportadorView({ puertos, misCargas }: Props) {
  const [selectedCargaId, setSelectedCargaId] = useState<string | null>(
    misCargas.find((c) => c.estado === "en_subasta" || c.estado === "publicada")?.id ?? null
  );
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());

  const visibleCargas = misCargas.filter((c) => !cancelled.has(c.id));
  const selectedCarga = visibleCargas.find((c) => c.id === selectedCargaId) ?? null;

  async function handleCancel(cargaId: string) {
    if (!confirm("¿Cancelar esta carga? Las ofertas pendientes serán rechazadas.")) return;
    setCancelling(cargaId);
    const result = await cancelCarga(cargaId);
    if (result?.success) {
      setCancelled((prev) => new Set(prev).add(cargaId));
      if (selectedCargaId === cargaId) setSelectedCargaId(null);
    }
    setCancelling(null);
  }

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Main: form + cargas list */}
      <main className="flex-1 p-6 bg-bg overflow-y-auto">
        <PublicarCargaForm puertos={puertos} />

        {visibleCargas.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-semibold text-gray-200 uppercase tracking-[0.7px] mb-3">
              Mis cargas activas
            </p>
            <div className="space-y-2">
              {visibleCargas.map((c) => {
                const cancelable =
                  c.estado === "publicada" || c.estado === "en_subasta";
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCargaId(c.id)}
                    className={`w-full text-left bg-white rounded-md border px-4 py-3 transition-all cursor-pointer ${
                      selectedCargaId === c.id
                        ? "border-teal-100 ring-1 ring-teal-100"
                        : "border-[rgba(68,68,65,0.12)] hover:border-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] text-gray-200">
                        {c.numero ? `#${c.numero}` : c.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          ESTADO_BADGE[c.estado] ?? "bg-gray-50 text-gray-400"
                        }`}
                      >
                        {ESTADO_LABEL[c.estado] ?? c.estado}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-800 mb-1">
                      {c.puerto?.nombre ?? "Puerto"} → {c.destino_direccion}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>
                        {CONTENEDOR_LABEL[c.tipo_contenedor] ?? c.tipo_contenedor}
                        {c.peso_tm ? ` · ${c.peso_tm} TM` : ""}
                      </span>
                      <span>
                        {(c.bids?.[0]?.count ?? 0) > 0
                          ? `${c.bids[0].count} ${c.bids[0].count === 1 ? "oferta" : "ofertas"}`
                          : "Sin ofertas aún"}
                      </span>
                      {cancelable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(c.id);
                          }}
                          disabled={cancelling === c.id}
                          className="ml-auto text-coral-600 hover:underline disabled:opacity-60"
                        >
                          {cancelling === c.id ? "Cancelando…" : "Cancelar"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Right sidebar: bids panel */}
      <aside className="w-[330px] min-w-[330px] border-l border-[rgba(68,68,65,0.12)] bg-white overflow-y-auto h-[calc(100vh-56px)] sticky top-[56px]">
        <BidsPanel carga={selectedCarga} />
      </aside>
    </div>
  );
}
