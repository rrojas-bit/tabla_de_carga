"use client";

import { useState } from "react";
import type { PilotoItem, Viaje } from "@/app/(dashboard)/transportista/page";
import AsignarViajeModal from "./AsignarViajeModal";
import { CONTENEDOR_LABEL } from "@/lib/labels";
import { getEtapas } from "@/lib/etapas";

export type ViajeFase = "por_iniciar" | "en_curso" | "completado";

type FlotaItem = { id: string; placa: string; tipo: string; estado: string };

export function sinPiloto(v: Viaje): boolean {
  return v.estado !== "entregada" && !v.movimientos?.[0]?.piloto;
}

export function faseDeViaje(v: Viaje): ViajeFase {
  if (v.estado === "entregada") return "completado";
  const mov = v.movimientos?.[0];
  if (!mov) return "por_iniciar";
  const avances = Array.isArray(mov.historial) ? mov.historial.length : 0;
  return mov.etapa_actual === 0 && avances <= 1 ? "por_iniciar" : "en_curso";
}

const FASES: { value: ViajeFase; label: string }[] = [
  { value: "por_iniciar", label: "Por iniciar" },
  { value: "en_curso", label: "En curso" },
  { value: "completado", label: "Completados" },
];

const EMPTY: Record<ViajeFase, string> = {
  por_iniciar: "No tienes viajes por iniciar. Toma una carga o espera a que acepten tus ofertas.",
  en_curso: "No hay viajes en curso en este momento.",
  completado: "Aún no tienes viajes completados.",
};

function formatFecha(fecha: string) {
  return new Date(fecha + (fecha.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-GT", {
    day: "numeric",
    month: "short",
  });
}

export default function MisViajes({
  viajes,
  pilotos,
  flota,
}: {
  viajes: Viaje[];
  pilotos: PilotoItem[];
  flota: FlotaItem[];
}) {
  const [asignar, setAsignar] = useState<Viaje | null>(null);
  const counts = {
    por_iniciar: viajes.filter((v) => faseDeViaje(v) === "por_iniciar").length,
    en_curso: viajes.filter((v) => faseDeViaje(v) === "en_curso").length,
    completado: viajes.filter((v) => faseDeViaje(v) === "completado").length,
  };
  const [fase, setFase] = useState<ViajeFase>(
    counts.por_iniciar > 0 || counts.en_curso === 0 ? "por_iniciar" : "en_curso"
  );

  const lista = viajes
    .filter((v) => faseDeViaje(v) === fase)
    .sort((a, b) => {
      // Pendientes de piloto siempre arriba
      const pa = Number(sinPiloto(b)) - Number(sinPiloto(a));
      if (pa !== 0) return pa;
      return fase === "completado"
        ? b.updated_at.localeCompare(a.updated_at)
        : a.fecha_disponible.localeCompare(b.fecha_disponible);
    });

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
        {FASES.map((f) => (
          <button
            key={f.value}
            onClick={() => setFase(f.value)}
            aria-pressed={fase === f.value}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] border transition-all whitespace-nowrap flex-shrink-0 font-medium"
            style={
              fase === f.value
                ? {
                    background: "var(--color-primary-weak)",
                    borderColor: "var(--color-primary-border)",
                    color: "var(--color-primary)",
                  }
                : {
                    background: "var(--surface-card)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-muted)",
                  }
            }
          >
            {f.label}
            <span className="tabular-nums opacity-80">{counts[f.value]}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-14">
          <i className="ti ti-truck text-4xl block mb-3" style={{ color: "var(--text-faint)" }} aria-hidden="true" />
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            {EMPTY[fase]}
          </p>
        </div>
      ) : (
        lista.map((v) => (
          <ViajeCard key={v.id} viaje={v} fase={fase} onAsignar={() => setAsignar(v)} />
        ))
      )}

      {asignar && (
        <AsignarViajeModal
          viaje={asignar}
          pilotos={pilotos}
          flota={flota}
          onClose={() => setAsignar(null)}
        />
      )}
    </div>
  );
}

function ViajeCard({
  viaje,
  fase,
  onAsignar,
}: {
  viaje: Viaje;
  fase: ViajeFase;
  onAsignar: () => void;
}) {
  const pendientePiloto = sinPiloto(viaje);
  const isImport = viaje.tipo_operacion === "importacion";
  const puerto = viaje.puerto?.nombre ?? "Puerto";
  const origen = isImport ? puerto : viaje.destino_direccion;
  const destino = isImport ? viaje.destino_direccion : puerto;
  const mov = viaje.movimientos?.[0];
  const etapas = getEtapas(mov?.tipo_flujo ?? viaje.tipo_operacion);
  const total = etapas.length;
  const actual = fase === "completado" ? total - 1 : Math.min(mov?.etapa_actual ?? 0, total - 1);
  const pct = fase === "completado" ? 100 : Math.round(((actual + 1) / total) * 100);
  const monto = viaje.bid?.monto;

  return (
    <div
      className="bg-white rounded-[var(--radius-lg)] mb-2.5 overflow-hidden"
      style={{ border: `1px solid ${pendientePiloto ? "var(--amber-600)" : "var(--border-default)"}` }}
    >
      {pendientePiloto && (
        <div
          className="flex items-center justify-between gap-3 px-[17px] py-2.5"
          style={{ background: "var(--amber-50)", borderBottom: "1px solid var(--amber-600)" }}
          role="status"
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--amber-600)" }}>
            <i className="ti ti-alert-triangle text-[16px]" aria-hidden="true" />
            Pendiente asignar piloto
          </span>
          <button
            onClick={onAsignar}
            className="px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-semibold text-white flex-shrink-0"
            style={{ background: "var(--amber-600)" }}
          >
            Asignar piloto
          </button>
        </div>
      )}
      <div className="p-[17px]">
      {/* Encabezado */}
      <div className="flex justify-between items-start gap-3 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-[11px] px-2.5 py-[3px] rounded-[var(--radius-sm)] font-semibold"
              style={
                isImport
                  ? { background: "var(--status-import-bg)", color: "var(--status-import-fg)" }
                  : { background: "var(--status-export-bg)", color: "var(--status-export-fg)" }
              }
            >
              {isImport ? "Importación" : "Exportación"}
            </span>
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              {CONTENEDOR_LABEL[viaje.tipo_contenedor] ?? viaje.tipo_contenedor}
              {viaje.numero ? ` · #${viaje.numero}` : ""}
            </span>
          </div>
          <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-strong)" }}>
            {origen} <span style={{ color: "var(--text-faint)" }}>→</span> {destino}
          </p>
          {viaje.mercancia && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {viaje.mercancia}
            </p>
          )}
        </div>
        {monto != null && (
          <div className="text-right flex-shrink-0">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Acordado</p>
            <p className="text-[17px] font-semibold tabular-nums" style={{ color: "var(--text-strong)" }}>
              Q {monto.toLocaleString("es-GT")}
            </p>
          </div>
        )}
      </div>

      {/* Progreso */}
      <div className="mb-2.5">
        <div className="flex justify-between text-[12px] mb-1">
          <span className="font-medium truncate" style={{ color: "var(--text-strong)" }}>
            {fase === "completado" ? "Entregado ✓" : etapas[actual]}
          </span>
          <span className="tabular-nums flex-shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
            {fase === "completado" ? total : actual + 1}/{total}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--surface-sunk)" }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Avance del viaje"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: fase === "completado" ? "var(--status-success-fg, var(--color-primary))" : "var(--color-primary)",
            }}
          />
        </div>
      </div>

      {pendientePiloto && (
        <p className="flex items-center gap-1 text-[11px] -mt-1 mb-2.5" style={{ color: "var(--text-muted)" }}>
          <i className="ti ti-lock text-[13px]" aria-hidden="true" />
          No puede avanzar de etapa hasta asignar un piloto
        </p>
      )}

      {/* Pie: fecha, cabezal, piloto */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1 pt-2.5 text-[12px]"
        style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-muted)" }}
      >
        <span className="flex items-center gap-1">
          <i className="ti ti-calendar text-[14px]" aria-hidden="true" />
          {fase === "completado"
            ? `Entregado ${formatFecha(viaje.updated_at.slice(0, 10))}`
            : `Disponible ${formatFecha(viaje.fecha_disponible)}`}
        </span>
        {mov?.cabezal ? (
          <span className="flex items-center gap-1">
            <i className="ti ti-truck text-[14px]" aria-hidden="true" />
            {mov.cabezal.placa}
          </span>
        ) : (
          fase !== "completado" && (
            <span className="flex items-center gap-1 font-medium" style={{ color: "var(--amber-600, #b45309)" }}>
              <i className="ti ti-alert-triangle text-[14px]" aria-hidden="true" />
              Sin cabezal asignado
            </span>
          )
        )}
        {mov?.piloto ? (
          <span className="flex items-center gap-1">
            <i className="ti ti-user text-[14px]" aria-hidden="true" />
            {mov.piloto.nombre_completo}
          </span>
        ) : (
          fase !== "completado" && (
            <span className="flex items-center gap-1 font-medium" style={{ color: "var(--amber-600, #b45309)" }}>
              <i className="ti ti-alert-triangle text-[14px]" aria-hidden="true" />
              Sin piloto asignado
            </span>
          )
        )}
      </div>
      </div>
    </div>
  );
}
