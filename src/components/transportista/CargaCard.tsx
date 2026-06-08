"use client";

import type { CargaRow } from "@/app/(dashboard)/transportista/page";

const CONTENEDOR_LABEL: Record<string, string> = {
  "20_dry": "20' Dry",
  "40_dry": "40' Dry",
  "40_hc": "40' HC",
  reefer: "Reefer",
  open_top: "Open Top",
  flat_rack: "Flat Rack",
  "45": "45'",
};

function diasRestantes(fecha: string): string {
  const diff = Math.ceil(
    (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Vencida";
  if (diff === 0) return "Hoy";
  if (diff === 1) return "1 día restante";
  return `${diff} días restantes`;
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-GT", {
    day: "numeric",
    month: "short",
  });
}

type Props = {
  carga: CargaRow;
  onBid: (carga: CargaRow) => void;
};

export default function CargaCard({ carga, onBid }: Props) {
  const isImport = carga.tipo_operacion === "importacion";
  const bidCount = carga.bids?.[0]?.count ?? 0;
  const contenedorLabel = CONTENEDOR_LABEL[carga.tipo_contenedor] ?? carga.tipo_contenedor;

  const origen = isImport
    ? carga.puerto?.nombre ?? "Puerto"
    : carga.destino_direccion;
  const destino = isImport
    ? carga.destino_direccion
    : carga.puerto?.nombre ?? "Puerto";

  return (
    <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-[17px] mb-2.5 hover:border-gray-100 transition-colors">
      {/* Top row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] px-2.5 py-[3px] rounded font-semibold ${
              isImport
                ? "bg-blue-50 text-blue-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            {isImport ? "Importación" : "Exportación"}
          </span>
          {carga.numero && (
            <span className="text-[12px] text-gray-200">#{carga.numero}</span>
          )}
        </div>

        <div className="text-right">
          {carga.tarifa_referencia ? (
            <>
              <p className="text-[11px] text-gray-200">Tarifa ofrecida</p>
              <p className="text-[19px] font-semibold text-teal-600 leading-tight">
                Q {carga.tarifa_referencia.toLocaleString("es-GT")}
              </p>
              <p className="text-[11px] text-gray-200">o haz tu oferta</p>
            </>
          ) : (
            <>
              <p className="text-[11px] text-gray-200">Tarifa referencia</p>
              <p className="text-[15px] font-semibold text-gray-400 leading-tight">
                Abierta
              </p>
              <p className="text-[11px] text-gray-200">cliente evalúa ofertas</p>
            </>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mb-3">
        <i
          className={`text-[15px] ${
            isImport ? "ti ti-anchor text-teal-400" : "ti ti-building-factory text-amber-400"
          }`}
        />
        <span className="text-[13px] font-medium text-gray-800 truncate max-w-[140px]">
          {origen}
        </span>
        <div className="flex-1 h-px bg-gray-100 relative">
          <span className="absolute -right-[5px] top-[-4px] border-[5px] border-transparent border-l-gray-100" />
        </div>
        <i
          className={`text-[15px] ${
            isImport
              ? "ti ti-building-warehouse text-blue-400"
              : "ti ti-anchor text-teal-400"
          }`}
        />
        <span className="text-[13px] font-medium text-gray-800 truncate max-w-[140px]">
          {destino}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3.5 mb-0">
        <span className="flex items-center gap-1 text-[12px] text-gray-400">
          <i className="ti ti-box text-[14px] text-gray-200" />
          {contenedorLabel}
        </span>

        {carga.peso_tm != null && (
          <span className="flex items-center gap-1 text-[12px]">
            <i className="ti ti-weight text-[14px] text-gray-200" />
            {carga.sobrepeso ? (
              <>
                <span className="text-gray-400">{carga.peso_tm} TM —</span>{" "}
                <span className="text-amber-600 font-semibold">sobrepeso</span>
              </>
            ) : (
              <span className="text-gray-400">
                {carga.peso_tm} TM — sin sobrepeso
              </span>
            )}
          </span>
        )}

        <span className="flex items-center gap-1 text-[12px] text-gray-400">
          <i className="ti ti-calendar text-[14px] text-gray-200" />
          Disponible {formatFecha(carga.fecha_disponible)}
        </span>

        {carga.naviera && (
          <span className="flex items-center gap-1 text-[12px] text-gray-400">
            <i className="ti ti-ship text-[14px] text-gray-200" />
            {carga.naviera}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-[rgba(68,68,65,0.12)]">
        <span className="text-[12px] text-gray-200">
          {bidCount === 0
            ? "Sin ofertas aún — sé el primero"
            : `${bidCount} ${bidCount === 1 ? "oferta" : "ofertas"} · ${diasRestantes(carga.fecha_disponible)}`}
        </span>
        <button
          onClick={() => onBid(carga)}
          className="px-4 py-2 bg-teal-400 text-white rounded-md text-[13px] font-semibold hover:bg-teal-600 transition-colors"
        >
          Hacer oferta
        </button>
      </div>
    </div>
  );
}
