"use client";

import { useState, useTransition } from "react";
import { toggleAutoAsignacion } from "@/app/(dashboard)/transportista/actions";

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
  flota: FlotaItem[];
  tarifas: TarifaRuta[];
  autoAsignacion: boolean;
};

const ESTADO_BADGE: Record<string, string> = {
  libre: "bg-teal-50 text-teal-600",
  en_ruta: "bg-amber-50 text-amber-600",
  mantenimiento: "bg-coral-50 text-coral-600",
};

const ESTADO_LABEL: Record<string, string> = {
  libre: "Libre",
  en_ruta: "En ruta",
  mantenimiento: "Mantenimiento",
};

const CHASSIS_LABEL: Record<string, string> = {
  "20_dry": "Chassis 20'",
  "40_dry": "Chassis 40'",
  "40_hc": "Chassis 40' HC",
  reefer: "Chassis Reefer",
  open_top: "Chassis Open Top",
  flat_rack: "Flat Rack",
  "3_ejes": "Chassis 3 ejes",
};

export default function Sidebar({ flota, tarifas, autoAsignacion }: Props) {
  const [autoOn, setAutoOn] = useState(autoAsignacion);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const newVal = !autoOn;
    setAutoOn(newVal);
    startTransition(() => {
      toggleAutoAsignacion(newVal);
    });
  }

  const cabezales = flota.filter((f) => f.tipo === "cabezal");
  const chassis = flota.filter((f) => f.tipo === "chassis");

  return (
    <aside className="w-[260px] min-w-[260px] bg-white border-r border-[rgba(68,68,65,0.12)] p-[18px] overflow-y-auto h-[calc(100vh-56px)] sticky top-[56px]">
      {/* Auto-asignación toggle */}
      <div className="mb-5">
        <div
          className={`flex items-center justify-between px-3 py-2.5 rounded-md border mb-1.5 ${
            autoOn
              ? "bg-teal-50 border-teal-100"
              : "bg-gray-50 border-[rgba(68,68,65,0.12)]"
          }`}
        >
          <div>
            <p
              className={`text-[13px] font-semibold ${autoOn ? "text-teal-600" : "text-gray-600"}`}
            >
              Auto-asignación
            </p>
            <p
              className={`text-[11px] mt-0.5 ${autoOn ? "text-teal-400" : "text-gray-400"}`}
            >
              {autoOn ? "Recibe cargas automático" : "Asignación manual"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`w-9 h-[21px] rounded-full relative transition-colors flex-shrink-0 ${
              autoOn ? "bg-teal-400" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-[2px] w-[17px] h-[17px] bg-white rounded-full shadow-sm transition-all ${
                autoOn ? "right-[2px]" : "left-[2px]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Flota */}
      {(cabezales.length > 0 || chassis.length > 0) && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-gray-200 uppercase tracking-[0.7px] mb-2">
            Mi flota
          </p>

          {cabezales.length > 0 && (
            <>
              {cabezales.length > 0 && chassis.length > 0 && (
                <p className="text-[10px] text-gray-200 uppercase tracking-wide mb-1.5">
                  Cabezales
                </p>
              )}
              {cabezales.map((item) => (
                <FlotaCard key={item.id} item={item} />
              ))}
            </>
          )}

          {chassis.length > 0 && (
            <div className={cabezales.length > 0 ? "mt-2" : ""}>
              {cabezales.length > 0 && (
                <p className="text-[10px] text-gray-200 uppercase tracking-wide mb-1.5 mt-2">
                  Chassis
                </p>
              )}
              {chassis.map((item) => (
                <FlotaCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {flota.length === 0 && (
        <div className="mb-5 py-4 text-center">
          <i className="ti ti-truck-off text-2xl text-gray-100 block mb-1.5" />
          <p className="text-[11px] text-gray-200">Sin unidades registradas</p>
        </div>
      )}

      {/* Tarifas mínimas */}
      {tarifas.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-200 uppercase tracking-[0.7px] mb-2">
            Tarifa mínima por ruta
          </p>
          {tarifas.map((t) => (
            <div
              key={t.id}
              className="bg-gray-50 rounded-md px-3 py-2 mb-1.5"
            >
              <p className="text-[11px] text-gray-400 mb-0.5">
                {t.origen} → {t.destino}
              </p>
              <p className="text-sm font-semibold text-teal-600">
                Q {t.tarifa_minima.toLocaleString("es-GT")}
              </p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function FlotaCard({ item }: { item: FlotaItem }) {
  const sub =
    item.tipo === "cabezal"
      ? [item.marca, item.modelo].filter(Boolean).join(" ")
      : item.tipo_chassis
        ? CHASSIS_LABEL[item.tipo_chassis] ?? item.tipo_chassis
        : "Chassis";

  return (
    <div className="bg-gray-50 rounded-md px-3 py-2 mb-1.5">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[13px] font-semibold text-gray-800">
          {item.placa}
        </span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded font-medium ${
            ESTADO_BADGE[item.estado] ?? "bg-gray-100 text-gray-400"
          }`}
        >
          {ESTADO_LABEL[item.estado] ?? item.estado}
        </span>
      </div>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
