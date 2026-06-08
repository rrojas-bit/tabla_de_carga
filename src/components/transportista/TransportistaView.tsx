"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import CargaCard from "./CargaCard";
import BidModal from "./BidModal";
import { createClient } from "@/lib/supabase/client";
import type { CargaRow } from "@/app/(dashboard)/transportista/page";

type Empresa = {
  id: string;
  nombre: string;
  score_plataforma: number | null;
  total_evaluaciones: number | null;
} | null;

type FlotaItem = {
  id: string;
  placa: string;
  tipo: string;
  tipo_chassis: string | null;
  marca: string | null;
  modelo: string | null;
  estado: string;
};

type TarifaRuta = {
  id: string;
  origen: string;
  destino: string;
  tarifa_minima: number;
};

type Props = {
  empresa: Empresa;
  empresaEstado?: string;
  flota: FlotaItem[];
  tarifas: TarifaRuta[];
  autoAsignacion: boolean;
  cargas: CargaRow[];
  statsCargas: number;
};

type Filter = "todas" | "importacion" | "exportacion" | "reefer";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "importacion", label: "Importación" },
  { value: "exportacion", label: "Exportación" },
  { value: "reefer", label: "Reefer" },
];

export default function TransportistaView({
  empresa,
  empresaEstado,
  flota,
  tarifas,
  autoAsignacion,
  cargas: initialCargas,
  statsCargas,
}: Props) {
  const [filter, setFilter] = useState<Filter>("todas");
  const [bidCarga, setBidCarga] = useState<CargaRow | null>(null);
  const [cargas, setCargas] = useState<CargaRow[]>(initialCargas);
  const [newCargaAlert, setNewCargaAlert] = useState(false);

  // Realtime subscription for new cargas
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("cargas_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cargas",
          filter: "estado=eq.publicada",
        },
        (payload) => {
          setCargas((prev) => {
            const already = prev.find((c) => c.id === payload.new.id);
            if (already) return prev;
            return [payload.new as unknown as CargaRow, ...prev];
          });
          setNewCargaAlert(true);
          setTimeout(() => setNewCargaAlert(false), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isPendiente = empresaEstado === "pendiente_calificacion";

  const filtered = cargas.filter((c) => {
    if (filter === "importacion") return c.tipo_operacion === "importacion";
    if (filter === "exportacion") return c.tipo_operacion === "exportacion";
    if (filter === "reefer") return c.tipo_contenedor === "reefer";
    return true;
  });

  const score = empresa?.score_plataforma;
  const evaluaciones = empresa?.total_evaluaciones ?? 0;

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <Sidebar
        flota={flota}
        tarifas={tarifas}
        autoAsignacion={autoAsignacion}
      />

      {/* Main content */}
      <main className="flex-1 p-6 bg-bg overflow-y-auto">
        {/* Pending approval banner */}
        {isPendiente && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
            <i className="ti ti-clock-hour-4 text-amber-400 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-amber-600">
                Cuenta en revisión
              </p>
              <p className="text-[12px] text-amber-600 mt-0.5 leading-5">
                Tu empresa está siendo evaluada por el equipo de ContainerGT. Una vez aprobada, podrás hacer ofertas en cargas. Mientras tanto, puedes ver las publicaciones disponibles.
              </p>
            </div>
          </div>
        )}

        {/* New carga Realtime alert */}
        {newCargaAlert && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-100 rounded-md flex items-center gap-2 text-[13px] text-teal-600 font-medium animate-pulse">
            <i className="ti ti-bell-ringing" />
            Nueva carga publicada — aparece al inicio de la lista
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Este mes"
            value={statsCargas.toString()}
            sub="cargas completadas"
          />
          <StatCard
            label="Score plataforma"
            value={
              score != null ? (
                <span>
                  {score.toFixed(1)}{" "}
                  <span className="text-[15px] text-amber-400">★</span>
                </span>
              ) : (
                "—"
              )
            }
            sub={
              evaluaciones > 0
                ? `${evaluaciones} evaluaciones`
                : "Sin evaluaciones aún"
            }
          />
          <StatCard
            label="Empresa"
            value={
              <span className="text-[15px] font-semibold truncate">
                {empresa?.nombre ?? "—"}
              </span>
            }
            sub="cuenta activa"
          />
        </div>

        {/* Section header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[15px] font-semibold text-gray-800">
            Cargas disponibles
          </h2>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 rounded-full text-[12px] border transition-all ${
                  filter === f.value
                    ? "bg-teal-50 border-teal-100 text-teal-600"
                    : "bg-white border-[rgba(68,68,65,0.12)] text-gray-400 hover:text-gray-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cargas list */}
        {filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          filtered.map((carga) => (
            <CargaCard
              key={carga.id}
              carga={carga}
              onBid={(c) => setBidCarga(c)}
            />
          ))
        )}
      </main>

      {/* Bid modal */}
      {bidCarga && (
        <BidModal
          carga={bidCarga}
          flota={flota}
          onClose={() => setBidCarga(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-md border border-[rgba(68,68,65,0.12)] px-4 py-3.5">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className="text-[22px] font-semibold text-gray-800 leading-tight">
        {value}
      </p>
      <p className="text-[11px] text-teal-400 mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const msgs: Record<Filter, string> = {
    todas: "No hay cargas disponibles en este momento",
    importacion: "No hay importaciones disponibles",
    exportacion: "No hay exportaciones disponibles",
    reefer: "No hay cargas reefer disponibles",
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <i className="ti ti-box-off text-5xl text-gray-100 mb-3 block" />
      <p className="text-sm text-gray-400 font-medium">{msgs[filter]}</p>
      <p className="text-xs text-gray-200 mt-1.5">
        Las cargas se actualizan en tiempo real — vuelve pronto
      </p>
    </div>
  );
}
