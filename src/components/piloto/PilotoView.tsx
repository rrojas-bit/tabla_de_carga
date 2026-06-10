"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { avanzarEtapa } from "@/app/(dashboard)/piloto/actions";
import { ETAPAS_IMPORTACION, ETAPAS_EXPORTACION } from "@/lib/etapas";
import type { MovimientoFull, FlagRow } from "@/app/(dashboard)/piloto/page";

const ETAPAS_IMPORT = [...ETAPAS_IMPORTACION];
const ETAPAS_EXPORT = [...ETAPAS_EXPORTACION];

// Texto del botón = la etapa a la que avanzas (siguiente)
const NEXT_LABELS_IMPORT = ETAPAS_IMPORT.slice(1);
const NEXT_LABELS_EXPORT = ETAPAS_EXPORT.slice(1);

const CONTENEDOR_LABEL: Record<string, string> = {
  "20_dry": "20' Dry",
  "40_dry": "40' Dry",
  "40_hc": "40' HC",
  reefer: "Reefer",
  open_top: "Open Top",
  flat_rack: "Flat Rack",
  "45": "45'",
};

const FLAG_TIPO_LABEL: Record<string, string> = {
  robo: "Robo de carga",
  abandono_carga: "Abandono de carga",
  dano_equipo: "Daño a equipo",
  otro: "Incidente reportado",
};

type Props = {
  movimiento: MovimientoFull | null;
  flags: FlagRow[];
};

export default function PilotoView({ movimiento, flags }: Props) {
  const [etapa, setEtapa] = useState(movimiento?.etapa_actual ?? 0);
  const [isPending, startTransition] = useTransition();

  const esImport = (movimiento?.tipo_flujo ?? "importacion") === "importacion";
  const etapas = esImport ? ETAPAS_IMPORT : ETAPAS_EXPORT;
  const nextLabels = esImport ? NEXT_LABELS_IMPORT : NEXT_LABELS_EXPORT;

  const isCompleted = etapa >= etapas.length - 1;

  function handleAvanzar() {
    if (!movimiento || isCompleted) return;
    const etapaAnterior = etapa;
    const nuevaEtapa = etapa + 1;
    setEtapa(nuevaEtapa); // Optimistic update
    startTransition(async () => {
      const result = await avanzarEtapa(movimiento.id, etapaAnterior);
      if (result?.error) {
        setEtapa(etapaAnterior);
        toast.error(result.error);
        return;
      }
      if (nuevaEtapa >= etapas.length - 1) {
        toast.success(
          esImport
            ? "Entrega confirmada — viaje completado"
            : "Gate-in completado — viaje finalizado"
        );
      } else {
        toast.success(`Etapa actualizada: ${etapas[nuevaEtapa]}`);
      }
    });
  }

  // Format timestamp from historial
  function getHoraEtapa(idx: number): string | null {
    const entry = movimiento?.historial?.find((h) => h.etapa === idx);
    if (!entry) return null;
    const d = new Date(entry.timestamp);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m} ${ampm}`;
  }

  const carga = movimiento?.carga;
  const piloto = movimiento?.piloto;
  const cabezal = movimiento?.cabezal;

  const ruta = carga
    ? esImport
      ? `${carga.puerto?.nombre ?? "Puerto"} → ${carga.destino_direccion}`
      : `${carga.destino_direccion} → ${carga.puerto?.nombre ?? "Puerto"}`
    : null;

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Left: Phone mockup */}
      <div className="flex-1 bg-bg flex justify-center items-start pt-8 pb-8 px-6">
        {movimiento ? (
          <PhoneMockup
            piloto={piloto ?? null}
            cabezal={cabezal ?? null}
            carga={carga ?? null}
            ruta={ruta}
            etapas={etapas}
            etapaActual={etapa}
            nextLabel={isCompleted ? "Viaje completado ✓" : nextLabels[etapa] ?? "Siguiente paso"}
            onNext={handleAvanzar}
            isPending={isPending}
            isCompleted={isCompleted}
            getHoraEtapa={getHoraEtapa}
          />
        ) : (
          <div className="text-center py-20">
            <div
              className="w-[288px] bg-white rounded-[26px] border-2 border-gray-100 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.09)] mx-auto"
            >
              <div className="bg-teal-600 px-4 py-4">
                <p className="text-white/60 text-[11px] mb-1">ContainerGT Piloto</p>
                <p className="text-white text-[15px] font-semibold">Sin asignación activa</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-100" />
                  <p className="text-white/70 text-[11px]">Esperando carga</p>
                </div>
              </div>
              <div className="p-4 text-center py-10">
                <i className="ti ti-truck-off text-4xl text-gray-100 block mb-3" />
                <p className="text-sm text-gray-400">No hay cargas en tránsito</p>
                <p className="text-xs text-gray-200 mt-1">
                  Cuando acepten una oferta tuya, aparecerá aquí
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Pilot info panel */}
      <aside className="w-[320px] min-w-[320px] border-l border-[rgba(68,68,65,0.12)] bg-white overflow-y-auto h-[calc(100vh-56px)] sticky top-[56px] p-[18px]">
        <p className="text-[14px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className="ti ti-id-badge text-teal-400" />
          Perfil del piloto
        </p>

        {piloto ? (
          <>
            <div className="bg-gray-50 rounded-md p-3 mb-3">
              {[
                ["Nombre", piloto.nombre_completo],
                ["DPI", piloto.dpi],
                [
                  "Licencia",
                  [
                    piloto.licencia_tipo ? `Tipo ${piloto.licencia_tipo}` : null,
                    piloto.licencia_vencimiento
                      ? `· Vence ${new Date(piloto.licencia_vencimiento).toLocaleDateString("es-GT", { month: "short", year: "numeric" })}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || "—",
                ],
                [
                  "Viajes completados",
                  piloto.total_viajes?.toString() ?? "0",
                ],
                [
                  "Score plataforma",
                  piloto.score_plataforma
                    ? `${piloto.score_plataforma.toFixed(1)} ★`
                    : "Sin evaluaciones",
                ],
              ].map(([key, val]) => (
                <div
                  key={key}
                  className="flex justify-between py-1 border-b border-[rgba(68,68,65,0.06)] last:border-0"
                >
                  <span className="text-[12px] text-gray-400">{key}</span>
                  <span className="text-[12px] font-semibold text-gray-800">
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* Flags */}
            {flags.length > 0 && (
              <div className="mb-4 space-y-2">
                {flags.map((f) => (
                  <div
                    key={f.id}
                    className="bg-coral-50 rounded-md p-3 border border-coral-100 flex gap-2 items-start"
                  >
                    <i className="ti ti-alert-circle text-coral-400 text-base flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] text-coral-600 leading-5">
                        <strong>{FLAG_TIPO_LABEL[f.tipo] ?? f.tipo}.</strong>{" "}
                        {f.descripcion ?? "Sin descripción adicional."}
                        {f.en_disputa && " En disputa — revisión pendiente."}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          f.verificado
                            ? "bg-coral-100 text-coral-600"
                            : "bg-coral-100 text-coral-600"
                        }`}
                      >
                        {f.verificado ? "Verificado" : "No verificado"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <i className="ti ti-user-off text-3xl text-gray-100 block mb-2" />
            <p className="text-sm text-gray-400">Sin piloto asignado</p>
            <p className="text-xs text-gray-200 mt-1">
              El transportista asigna al piloto al iniciar el viaje
            </p>
          </div>
        )}

        {/* Notifications section */}
        {movimiento && (
          <>
            <p className="text-[10px] font-semibold text-gray-200 uppercase tracking-[0.7px] mb-3 mt-2">
              Notificaciones automáticas al cliente
            </p>
            <NotifTimeline esImport={esImport} historial={movimiento.historial ?? []} />
          </>
        )}
      </aside>
    </div>
  );
}

// ---- Phone Mockup Component ----

type PhoneProps = {
  piloto: MovimientoFull["piloto"];
  cabezal: MovimientoFull["cabezal"];
  carga: MovimientoFull["carga"];
  ruta: string | null;
  etapas: string[];
  etapaActual: number;
  nextLabel: string;
  onNext: () => void;
  isPending: boolean;
  isCompleted: boolean;
  getHoraEtapa: (idx: number) => string | null;
};

function PhoneMockup({
  piloto,
  cabezal,
  carga,
  ruta,
  etapas,
  etapaActual,
  nextLabel,
  onNext,
  isPending,
  isCompleted,
  getHoraEtapa,
}: PhoneProps) {
  return (
    <div className="w-[288px] bg-white rounded-[26px] border-2 border-gray-100 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.09)]">
      {/* Header */}
      <div className="bg-teal-600 px-4 py-4">
        <p className="text-white/60 text-[11px] mb-1">ContainerGT Piloto</p>
        <p className="text-white text-[15px] font-semibold">
          {piloto?.nombre_completo ?? "Piloto"}
          {cabezal ? ` — ${cabezal.placa}` : ""}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isCompleted ? "bg-teal-100" : "bg-teal-100 animate-pulse-dot"
            }`}
          />
          <p className="text-white/70 text-[11px]">
            {isCompleted ? "Viaje completado" : "GPS activo · En ruta"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Carga info */}
        {carga && (
          <div className="bg-gray-50 rounded-md px-3 py-2.5 mb-4">
            <p className="text-[10px] text-gray-200 mb-0.5">Carga asignada</p>
            <p className="text-[13px] font-semibold text-gray-800">
              {carga.numero_contenedor
                ? `${carga.numero_contenedor} · `
                : ""}
              {CONTENEDOR_LABEL[carga.tipo_contenedor] ?? carga.tipo_contenedor}
            </p>
            {ruta && (
              <p className="text-[11px] text-gray-400 mt-0.5">{ruta}</p>
            )}
          </div>
        )}

        {/* Etapas */}
        <div className="mb-4">
          {etapas.map((nombre, idx) => {
            const isDone = idx < etapaActual;
            const isActive = idx === etapaActual;
            const hora = isDone || isActive ? getHoraEtapa(idx) : null;

            return (
              <div key={idx} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <div
                    className={`w-[17px] h-[17px] rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone
                        ? "bg-teal-400"
                        : isActive
                          ? "bg-teal-400 border-[2.5px] border-teal-100 animate-pulse-dot"
                          : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    {isDone && (
                      <i className="ti ti-check text-white text-[10px]" />
                    )}
                  </div>
                  {/* Connector */}
                  {idx < etapas.length - 1 && (
                    <div
                      className={`w-px h-5 my-0.5 ${
                        isDone ? "bg-teal-400" : "bg-gray-100"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pt-[1px] pb-2">
                  <p
                    className={`text-[12px] font-medium leading-tight ${
                      isDone
                        ? "text-teal-600"
                        : isActive
                          ? "text-gray-800"
                          : "text-gray-200 font-normal"
                    }`}
                  >
                    {nombre}
                  </p>
                  {hora && (
                    <p className="text-[10px] text-gray-200 mt-0.5">{hora}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <button
          onClick={onNext}
          disabled={isPending || isCompleted}
          className={`w-full py-3 rounded-md text-[14px] font-semibold flex items-center justify-center gap-2 mb-2 transition-colors ${
            isCompleted
              ? "bg-teal-50 text-teal-600 cursor-default"
              : "bg-teal-400 text-white hover:bg-teal-600 disabled:opacity-60"
          }`}
        >
          {!isCompleted && (
            <i className="ti ti-circle-arrow-right" />
          )}
          {isPending ? "Actualizando..." : nextLabel}
        </button>

        <button className="w-full py-2.5 bg-gray-50 text-gray-400 border border-[rgba(68,68,65,0.12)] rounded-md text-[13px] flex items-center justify-center gap-1.5 hover:text-gray-600 transition-colors">
          <i className="ti ti-microphone text-coral-400" />
          Reportar por voz
        </button>
      </div>
    </div>
  );
}

// ---- Notification Timeline ----

type HistorialEntry = { etapa: number; timestamp: string; method: string };

function NotifTimeline({
  esImport,
  historial,
}: {
  esImport: boolean;
  historial: HistorialEntry[];
}) {
  const notifs = historial.slice(0, 3).map((h) => {
    const d = new Date(h.timestamp);
    const timeStr = d.toLocaleTimeString("es-GT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const etapaNames = esImport ? ETAPAS_IMPORT : ETAPAS_EXPORT;
    return {
      icon: h.etapa >= 3 ? "ni-amber" : "ni-teal",
      tabler: h.etapa >= 3 ? "ti ti-clock" : "ti ti-circle-check",
      texto: etapaNames[h.etapa] ?? `Etapa ${h.etapa}`,
      time: `Hoy ${timeStr}`,
    };
  });

  if (notifs.length === 0) {
    return (
      <p className="text-[11px] text-gray-200 text-center py-4">
        Sin notificaciones aún
      </p>
    );
  }

  return (
    <div>
      {notifs.map((n, i) => (
        <div
          key={i}
          className="flex gap-2.5 py-2.5 border-b border-[rgba(68,68,65,0.08)] last:border-0 items-start"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              n.icon === "ni-teal" ? "bg-teal-50" : "bg-amber-50"
            }`}
          >
            <i
              className={`${n.tabler} text-[17px] ${
                n.icon === "ni-teal" ? "text-teal-400" : "text-amber-400"
              }`}
            />
          </div>
          <div>
            <p className="text-[12px] text-gray-400 leading-5">
              <strong className="text-gray-800">{n.texto}.</strong> Notificación
              enviada al cliente.
            </p>
            <p className="text-[10px] text-gray-200 mt-0.5">{n.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
