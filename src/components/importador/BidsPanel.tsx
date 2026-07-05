"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { acceptBid, rejectBid } from "@/app/(dashboard)/importador/actions";
import { createClient } from "@/lib/supabase/client";
import { formatUSD } from "@/lib/money";
import type { CargaResumen } from "@/app/(dashboard)/importador/page";

const CONTENEDOR_LABEL: Record<string, string> = {
  "20_dry": "20' Dry",
  "40_dry": "40' Dry",
  "40_hc": "40' HC",
  reefer: "Reefer",
  open_top: "Open Top",
  flat_rack: "Flat Rack",
  "45": "45'",
};

const TIEMPO_LABEL: Record<string, string> = {
  menos_2h: "< 2 hrs",
  "2_4h": "2-4 hrs",
  mismo_dia: "Mismo día",
};

type BidRow = {
  id: string;
  monto: number;
  tiempo_respuesta: string;
  nota: string | null;
  estado: string;
  created_at: string;
  empresa: {
    id: string;
    nombre: string;
    score_plataforma: number | null;
    total_evaluaciones: number | null;
  } | null;
  flota_libres: number;
};

export default function BidsPanel({ carga }: { carga: CargaResumen | null }) {
  const [bids, setBids] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!carga) return;
    fetchBids(carga.id);

    // Realtime: refresh when new bids arrive for this carga
    const supabase = createClient();
    const channel = supabase
      .channel(`bids_carga_${carga.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `carga_id=eq.${carga.id}`,
        },
        () => {
          fetchBids(carga.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carga?.id]);

  async function fetchBids(cargaId: string) {
    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("bids")
      .select(`
        id, monto, tiempo_respuesta, nota, estado, created_at,
        empresa:empresas(id, nombre, score_plataforma, total_evaluaciones)
      `)
      .eq("carga_id", cargaId)
      .eq("estado", "pendiente")
      .order("monto", { ascending: true });

    if (data) {
      // Get free truck count per empresa
      type EmpresaRef = { id: string };
      const empresaIds = data
        .map((b) => (b.empresa as unknown as EmpresaRef)?.id)
        .filter(Boolean);

      const libresMap: Record<string, number> = {};
      if (empresaIds.length > 0) {
        const supabase2 = createClient();
        const { data: flota } = await supabase2
          .from("flota")
          .select("empresa_id, estado")
          .in("empresa_id", empresaIds)
          .eq("estado", "libre")
          .eq("tipo", "cabezal");

        flota?.forEach((f) => {
          libresMap[f.empresa_id] = (libresMap[f.empresa_id] ?? 0) + 1;
        });
      }

      setBids(
        data.map((b) => ({
          id: b.id,
          monto: b.monto,
          tiempo_respuesta: b.tiempo_respuesta,
          nota: b.nota,
          estado: b.estado,
          created_at: b.created_at,
          empresa: b.empresa as unknown as BidRow["empresa"],
          flota_libres: libresMap[(b.empresa as unknown as EmpresaRef)?.id ?? ""] ?? 0,
        }))
      );
    }

    setLoading(false);
  }

  async function handleAccept(bidId: string) {
    if (!carga) return;
    setActing(bidId);
    const result = await acceptBid(bidId, carga.id);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(
        "Oferta aceptada — transportista notificado y movimiento creado"
      );
    }
    await fetchBids(carga.id);
    setActing(null);
  }

  async function handleReject(bidId: string) {
    if (!carga) return;
    setActing(bidId);
    const result = await rejectBid(bidId);
    if (result?.error) toast.error(result.error);
    await fetchBids(carga.id);
    setActing(null);
  }

  if (!carga) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-5 text-center">
        <i className="ti ti-gavel text-4xl text-gray-100 block mb-3" />
        <p className="text-sm text-gray-400 font-medium">
          Selecciona una carga activa
        </p>
        <p className="text-xs text-gray-200 mt-1.5">
          Verás aquí las ofertas recibidas para revisarlas y aceptarlas.
        </p>
      </div>
    );
  }

  const isSubastable = carga.estado === "publicada" || carga.estado === "en_subasta";
  const isAssigned = carga.estado === "asignada" || carga.estado === "en_transito";
  const contenedorLabel = CONTENEDOR_LABEL[carga.tipo_contenedor] ?? carga.tipo_contenedor;
  const rutaLabel = `${carga.puerto?.nombre ?? "Puerto"} → ${carga.destino_direccion}`;

  return (
    <div className="p-[18px]">
      {/* Header */}
      <p className="text-[13px] font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
        <i className="ti ti-gavel text-teal-400" />
        {isSubastable ? "Ofertas recibidas" : "Carga seleccionada"}
        {carga.numero && (
          <span className="text-gray-200 font-normal"> — #{carga.numero}</span>
        )}
      </p>

      {/* Carga summary */}
      <div className="bg-gray-50 rounded-md p-3 mb-4 text-[12px] text-gray-400 leading-6">
        <p>
          <span className="text-gray-800 font-semibold">{rutaLabel}</span>
        </p>
        <p>
          {contenedorLabel}
          {carga.peso_tm ? ` · ${carga.peso_tm} TM` : ""}
          {carga.sobrepeso && (
            <span className="ml-1.5 text-amber-600 font-semibold">
              ⚠ sobrepeso
            </span>
          )}
        </p>
      </div>

      {/* Assigned state */}
      {isAssigned && (
        <div className="py-6 text-center">
          <i className="ti ti-circle-check text-3xl text-teal-400 block mb-2" />
          <p className="text-sm font-semibold text-teal-600">
            {carga.estado === "en_transito" ? "En tránsito" : "Transportista asignado"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Carga #{carga.numero ?? carga.id.slice(0, 8)}
          </p>
        </div>
      )}

      {/* Bids list */}
      {isSubastable && (
        <>
          {loading ? (
            <div className="py-8 text-center">
              <i className="ti ti-loader-2 text-2xl text-gray-200 animate-spin block mb-2" />
              <p className="text-xs text-gray-200">Cargando ofertas…</p>
            </div>
          ) : bids.length === 0 ? (
            <div className="py-8 text-center">
              <i className="ti ti-clock text-3xl text-gray-100 block mb-2" />
              <p className="text-sm text-gray-400 font-medium">
                Sin ofertas aún
              </p>
              <p className="text-xs text-gray-200 mt-1">
                Los transportistas verán esta carga en su tablero
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bids.map((bid, idx) => (
                <div
                  key={bid.id}
                  className={`rounded-md border px-3 py-2.5 ${
                    idx === 0
                      ? "bg-teal-50 border-teal-100"
                      : "bg-gray-50 border-[rgba(68,68,65,0.12)]"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px] font-semibold text-gray-800 truncate max-w-[160px]">
                      {bid.empresa?.nombre ?? "Transportista"}
                    </span>
                    <span className="text-base font-semibold text-teal-600">
                      {formatUSD(bid.monto)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5 mb-2 text-[11px] text-gray-400">
                    {bid.empresa?.score_plataforma != null && (
                      <span>
                        <span className="text-amber-400">★</span>{" "}
                        {bid.empresa.score_plataforma.toFixed(1)}
                        {bid.empresa.total_evaluaciones
                          ? ` (${bid.empresa.total_evaluaciones})`
                          : ""}
                      </span>
                    )}
                    <span>
                      Responde {TIEMPO_LABEL[bid.tiempo_respuesta] ?? bid.tiempo_respuesta}
                    </span>
                    {bid.flota_libres > 0 && (
                      <span>{bid.flota_libres} unidades libres</span>
                    )}
                    {!bid.empresa?.score_plataforma && (
                      <span className="text-amber-600">Nuevo en plataforma</span>
                    )}
                  </div>
                  {bid.nota && (
                    <p className="text-[11px] text-gray-400 italic mb-2 line-clamp-2">
                      &ldquo;{bid.nota}&rdquo;
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAccept(bid.id)}
                      disabled={acting === bid.id}
                      className="flex-1 py-1.5 bg-teal-400 text-white rounded text-[12px] font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60"
                    >
                      {acting === bid.id ? "..." : "✓ Aceptar"}
                    </button>
                    <button
                      onClick={() => handleReject(bid.id)}
                      disabled={acting === bid.id}
                      className="flex-1 py-1.5 bg-white text-gray-400 border border-[rgba(68,68,65,0.12)] rounded text-[12px] hover:text-gray-600 transition-colors disabled:opacity-60"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
