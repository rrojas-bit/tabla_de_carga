"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Sidebar from "./Sidebar";
import CargaCard from "./CargaCard";
import BidModal from "./BidModal";
import MisOfertas from "./MisOfertas";
import { createClient } from "@/lib/supabase/client";
import type { CargaRow, MiOferta } from "@/app/(dashboard)/transportista/page";

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
  misOfertas: MiOferta[];
  ingresosMes: number;
  ingresosMesAnterior: number;
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
  misOfertas,
  ingresosMes,
  ingresosMesAnterior,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("todas");
  const [tab, setTab] = useState<"disponibles" | "ofertas">("disponibles");
  const [bidCarga, setBidCarga] = useState<CargaRow | null>(null);
  const [cargas, setCargas] = useState<CargaRow[]>(initialCargas);
  const [newCargasCount, setNewCargasCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialCargas.length >= 30);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("cargas")
      .select(`
        id, numero, tipo_operacion, tipo_contenedor, peso_tm, sobrepeso, mercancia,
        tarifa_referencia, destino_direccion, fecha_disponible, naviera, estado,
        puerto:puertos(id, nombre, codigo),
        bids!bids_carga_id_fkey(count)
      `)
      .in("estado", ["publicada", "en_subasta"])
      .order("created_at", { ascending: false })
      .range(cargas.length, cargas.length + 29);

    const nuevas = ((data ?? []) as unknown as CargaRow[]).filter(
      (n) => !cargas.find((c) => c.id === n.id)
    );
    setCargas((prev) => [...prev, ...nuevas]);
    setHasMore((data?.length ?? 0) >= 30);
    setLoadingMore(false);
  }

  // Realtime: new cargas + bid results for this empresa
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
            setNewCargasCount((n) => n + 1);
            return [payload.new as unknown as CargaRow, ...prev];
          });
        }
      )
      .subscribe();

    // Notify when a bid of this empresa changes estado
    let bidsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (empresa?.id) {
      bidsChannel = supabase
        .channel("mis_bids_realtime")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bids",
            filter: `empresa_id=eq.${empresa.id}`,
          },
          (payload) => {
            const estado = payload.new.estado as string;
            const monto = payload.new.monto as number;
            if (estado === "aceptada") {
              toast.success(
                `¡Tu oferta de Q ${monto.toLocaleString("es-GT")} fue aceptada! La carga es tuya.`,
                { duration: 10000 }
              );
              router.refresh();
            } else if (estado === "rechazada") {
              toast.info(
                `Tu oferta de Q ${monto.toLocaleString("es-GT")} no fue seleccionada.`
              );
              router.refresh();
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (bidsChannel) supabase.removeChannel(bidsChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresa?.id]);

  const isPendiente = empresaEstado === "pendiente_calificacion";

  const filtered = cargas.filter((c) => {
    if (filter === "importacion") return c.tipo_operacion === "importacion";
    if (filter === "exportacion") return c.tipo_operacion === "exportacion";
    if (filter === "reefer") return c.tipo_contenedor === "reefer";
    return true;
  });

  const score = empresa?.score_plataforma;
  const evaluaciones = empresa?.total_evaluaciones ?? 0;

  const variacion =
    ingresosMesAnterior > 0
      ? Math.round(
          ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100
        )
      : null;
  const ofertasPendientes = misOfertas.filter(
    (o) => o.estado === "pendiente"
  ).length;

  const loadMoreBtn = hasMore && tab === "disponibles" && (
    <button
      onClick={loadMore}
      disabled={loadingMore}
      className="w-full py-3 mt-2 bg-white border border-[rgba(68,68,65,0.12)] rounded-lg text-[13px] text-gray-400 hover:text-teal-600 hover:border-teal-100 transition-colors disabled:opacity-60"
    >
      {loadingMore ? "Cargando…" : "Cargar más cargas"}
    </button>
  );

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <Sidebar
        flota={flota}
        tarifas={tarifas}
        autoAsignacion={autoAsignacion}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 bg-bg overflow-y-auto">
        {/* Mobile: open sidebar (flota/tarifas) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden mb-4 w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-[rgba(68,68,65,0.12)] rounded-lg text-[13px] font-semibold text-gray-600"
        >
          <i className="ti ti-truck text-[16px] text-teal-400" aria-hidden="true" />
          Mi flota y tarifas
        </button>

        {/* Pending approval banner */}
        {isPendiente && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
            <i
              className="ti ti-clock-hour-4 text-amber-400 text-xl flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
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

        {/* New cargas Realtime alert — persists until dismissed */}
        {newCargasCount > 0 && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-100 rounded-md flex items-center gap-2 text-[13px] text-teal-600 font-medium">
            <i className="ti ti-bell-ringing" aria-hidden="true" />
            <span className="flex-1">
              {newCargasCount === 1
                ? "1 carga nueva publicada — aparece al inicio de la lista"
                : `${newCargasCount} cargas nuevas publicadas — aparecen al inicio de la lista`}
            </span>
            <button
              onClick={() => setNewCargasCount(0)}
              className="text-teal-600 hover:text-teal-800 p-0.5"
              aria-label="Descartar aviso"
            >
              <i className="ti ti-x text-[14px]" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Este mes"
            value={statsCargas.toString()}
            sub="cargas completadas"
          />
          <StatCard
            label="Ingresos mes"
            value={`Q ${ingresosMes.toLocaleString("es-GT")}`}
            sub={
              variacion != null
                ? `${variacion >= 0 ? "+" : ""}${variacion}% vs mes anterior`
                : "Sin datos del mes anterior"
            }
            subTone={variacion != null && variacion < 0 ? "negative" : "positive"}
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
        </div>

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="flex gap-1">
            <button
              onClick={() => setTab("disponibles")}
              className={`px-3 py-1.5 rounded-md text-[14px] font-semibold transition-colors ${
                tab === "disponibles"
                  ? "text-gray-800"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Cargas disponibles
            </button>
            <button
              onClick={() => setTab("ofertas")}
              className={`px-3 py-1.5 rounded-md text-[14px] font-semibold transition-colors ${
                tab === "ofertas"
                  ? "text-gray-800"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Mis ofertas
              {ofertasPendientes > 0 && (
                <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">
                  {ofertasPendientes}
                </span>
              )}
            </button>
          </div>
          {tab === "disponibles" && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1 rounded-full text-[12px] border transition-all whitespace-nowrap flex-shrink-0 ${
                    filter === f.value
                      ? "bg-teal-50 border-teal-100 text-teal-600"
                      : "bg-white border-[rgba(68,68,65,0.12)] text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {tab === "ofertas" ? (
          <MisOfertas ofertas={misOfertas} />
        ) : filtered.length === 0 ? (
          <>
            <EmptyState filter={filter} hasMore={hasMore} />
            {loadMoreBtn}
          </>
        ) : (
          <>
            {filtered.map((carga) => (
              <CargaCard
                key={carga.id}
                carga={carga}
                onBid={(c) => setBidCarga(c)}
                disabled={isPendiente}
              />
            ))}
            {loadMoreBtn}
          </>
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
  subTone = "positive",
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  subTone?: "positive" | "negative";
}) {
  return (
    <div className="bg-white rounded-md border border-[rgba(68,68,65,0.12)] px-4 py-3.5">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className="text-[22px] font-semibold text-gray-800 leading-tight">
        {value}
      </p>
      <p
        className={`text-[11px] mt-0.5 ${
          subTone === "negative" ? "text-coral-600" : "text-teal-400"
        }`}
      >
        {sub}
      </p>
    </div>
  );
}

function EmptyState({ filter, hasMore }: { filter: Filter; hasMore: boolean }) {
  const msgs: Record<Filter, string> = {
    todas: "No hay cargas disponibles en este momento",
    importacion: "No hay importaciones disponibles",
    exportacion: "No hay exportaciones disponibles",
    reefer: "No hay cargas reefer disponibles",
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <i className="ti ti-box-off text-5xl text-gray-100 mb-3 block" aria-hidden="true" />
      <p className="text-sm text-gray-400 font-medium">{msgs[filter]}</p>
      <p className="text-xs text-gray-400 mt-1.5">
        {hasMore && filter !== "todas"
          ? "Puede haber más en cargas anteriores — usa «Cargar más»"
          : "Las cargas se actualizan en tiempo real — vuelve pronto"}
      </p>
    </div>
  );
}
