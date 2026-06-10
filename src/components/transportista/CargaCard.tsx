"use client";

import type { CargaRow } from "@/app/(dashboard)/transportista/page";
import { CONTENEDOR_LABEL } from "@/lib/labels";

function diasRestantes(fecha: string): { label: string; vencida: boolean } {
  const diff = Math.ceil(
    (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return { label: "Vencida", vencida: true };
  if (diff === 0) return { label: "Hoy", vencida: false };
  if (diff === 1) return { label: "1 día restante", vencida: false };
  return { label: `${diff} días restantes`, vencida: false };
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
  disabled?: boolean;
};

export default function CargaCard({ carga, onBid, disabled = false }: Props) {
  const isImport = carga.tipo_operacion === "importacion";
  const bidCount = carga.bids?.[0]?.count ?? 0;
  const contenedorLabel = CONTENEDOR_LABEL[carga.tipo_contenedor] ?? carga.tipo_contenedor;
  const { label: restanteLabel, vencida } = diasRestantes(carga.fecha_disponible);

  const origen = isImport
    ? carga.puerto?.nombre ?? "Puerto"
    : carga.destino_direccion;
  const destino = isImport
    ? carga.destino_direccion
    : carga.puerto?.nombre ?? "Puerto";

  const bidDisabled = disabled || vencida;

  return (
    <div
      className={`bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-[17px] mb-2.5 transition-colors ${
        vencida ? "opacity-60" : "hover:border-gray-100"
      }`}
    >
      {/* Top row */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={`text-[11px] px-2.5 py-[3px] rounded font-semibold ${
              isImport
                ? "bg-blue-50 text-blue-600"
                : "bg-amber-50 text-amber-600"
            }`}
          >
            {isImport ? "Importación" : "Exportación"}
          </span>
          {vencida && (
            <span className="text-[11px] px-2.5 py-[3px] rounded font-semibold bg-coral-50 text-coral-600">
              Vencida
            </span>
          )}
          {carga.numero && (
            <span className="text-[12px] text-gray-400">#{carga.numero}</span>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          {carga.tarifa_referencia ? (
            <>
              <p className="text-[11px] text-gray-400">Tarifa ofrecida</p>
              <p className="text-[19px] font-semibold text-teal-600 leading-tight">
                Q {carga.tarifa_referencia.toLocaleString("es-GT")}
              </p>
              <p className="text-[11px] text-gray-400">o haz tu oferta</p>
            </>
          ) : (
            <>
              <p className="text-[11px] text-gray-400">Tarifa referencia</p>
              <p className="text-[15px] font-semibold text-gray-400 leading-tight">
                Abierta
              </p>
              <p className="text-[11px] text-gray-400">cliente evalúa ofertas</p>
            </>
          )}
        </div>
      </div>

      {/* Mercancía */}
      {carga.mercancia && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-gray-800 mb-2.5">
          <i className="ti ti-package text-[15px] text-teal-400" aria-hidden="true" />
          {carga.mercancia}
        </p>
      )}

      {/* Route */}
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <i
          className={`text-[15px] flex-shrink-0 ${
            isImport ? "ti ti-anchor text-teal-400" : "ti ti-building-factory text-amber-400"
          }`}
          aria-hidden="true"
        />
        <span
          className="text-[13px] font-medium text-gray-800 truncate max-w-[140px] sm:max-w-[200px]"
          title={origen}
        >
          {origen}
        </span>
        <div className="flex-1 min-w-[16px] h-px bg-gray-100 relative">
          <span className="absolute -right-[5px] top-[-4px] border-[5px] border-transparent border-l-gray-100" />
        </div>
        <i
          className={`text-[15px] flex-shrink-0 ${
            isImport
              ? "ti ti-building-warehouse text-blue-400"
              : "ti ti-anchor text-teal-400"
          }`}
          aria-hidden="true"
        />
        <span
          className="text-[13px] font-medium text-gray-800 truncate max-w-[140px] sm:max-w-[200px]"
          title={destino}
        >
          {destino}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3.5 mb-0">
        <span className="flex items-center gap-1 text-[12px] text-gray-400">
          <i className="ti ti-box text-[14px] text-gray-200" aria-hidden="true" />
          {contenedorLabel}
        </span>

        {carga.peso_tm != null && (
          <span className="flex items-center gap-1 text-[12px]">
            <i className="ti ti-weight text-[14px] text-gray-200" aria-hidden="true" />
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
          <i className="ti ti-calendar text-[14px] text-gray-200" aria-hidden="true" />
          Disponible {formatFecha(carga.fecha_disponible)}
        </span>

        {carga.naviera && (
          <span className="flex items-center gap-1 text-[12px] text-gray-400">
            <i className="ti ti-ship text-[14px] text-gray-200" aria-hidden="true" />
            {carga.naviera}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center gap-3 mt-3 pt-3 border-t border-[rgba(68,68,65,0.12)]">
        <span className="text-[12px] text-gray-400">
          {bidCount === 0
            ? "Sin ofertas aún — sé el primero"
            : `${bidCount} ${bidCount === 1 ? "oferta" : "ofertas"} · ${restanteLabel}`}
        </span>
        <button
          onClick={() => onBid(carga)}
          disabled={bidDisabled}
          title={
            disabled
              ? "Tu cuenta está en revisión — podrás ofertar al ser aprobada"
              : vencida
                ? "Esta carga ya venció"
                : undefined
          }
          className="px-4 py-2 bg-teal-400 text-white rounded-md text-[13px] font-semibold hover:bg-teal-600 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed flex-shrink-0"
        >
          {disabled ? "Cuenta en revisión" : vencida ? "Vencida" : "Hacer oferta"}
        </button>
      </div>
    </div>
  );
}
