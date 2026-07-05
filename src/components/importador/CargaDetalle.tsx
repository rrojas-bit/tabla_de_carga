"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCarga, cancelCarga } from "@/app/(dashboard)/importador/actions";
import { getEtapas } from "@/lib/etapas";
import { formatUSD } from "@/lib/money";
import type {
  CargaDetalleRow,
  MovimientoResumen,
} from "@/app/(dashboard)/importador/carga/[id]/page";

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
  publicada: "bg-gray-50 text-gray-400",
  en_subasta: "bg-amber-50 text-amber-600",
  asignada: "bg-teal-50 text-teal-600",
  en_transito: "bg-blue-50 text-blue-600",
  entregada: "bg-teal-50 text-teal-600",
  cancelada: "bg-coral-50 text-coral-600",
};

const ESTADO_LABEL: Record<string, string> = {
  publicada: "Publicada",
  en_subasta: "En subasta",
  asignada: "Asignada",
  en_transito: "En tránsito",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

const NAVIERAS = ["MSC", "Maersk", "Hapag-Lloyd", "COSCO", "Evergreen", "CMA CGM", "Yang Ming", "Otra"];

type Props = {
  carga: CargaDetalleRow;
  movimiento: MovimientoResumen | null;
};

export default function CargaDetalle({ carga, movimiento }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pesoTM, setPesoTM] = useState<number | null>(carga.peso_tm);

  const editable =
    carga.estado === "publicada" || carga.estado === "en_subasta";
  const isImport = carga.tipo_operacion === "importacion";
  const sobrepeso = pesoTM != null && pesoTM > 21;

  const ruta = isImport
    ? `${carga.puerto?.nombre ?? "Puerto"} → ${carga.destino_direccion}`
    : `${carga.destino_direccion} → ${carga.puerto?.nombre ?? "Puerto"}`;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setSaving(true);

    const result = await updateCarga(carga.id, new FormData(formRef.current));

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Carga actualizada");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleCancel() {
    if (!confirm("¿Cancelar esta carga? Las ofertas pendientes serán rechazadas.")) return;
    setCancelling(true);
    const result = await cancelCarga(carga.id);
    if (result?.error) {
      toast.error(result.error);
      setCancelling(false);
    } else {
      toast.success("Carga cancelada");
      router.push("/importador");
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Breadcrumb + header */}
      <div className="mb-5">
        <Link
          href="/importador"
          className="text-[12px] text-gray-400 hover:text-teal-600 transition-colors flex items-center gap-1 mb-3"
        >
          <i className="ti ti-arrow-left" />
          Volver a mis cargas
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-[11px] px-2.5 py-[3px] rounded font-semibold ${
                isImport
                  ? "bg-blue-50 text-blue-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {isImport ? "Importación" : "Exportación"}
            </span>
            <h1 className="text-lg font-semibold text-gray-800">
              {carga.numero ? `#${carga.numero}` : carga.id.slice(0, 8)}
            </h1>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                ESTADO_BADGE[carga.estado] ?? "bg-gray-50 text-gray-400"
              }`}
            >
              {ESTADO_LABEL[carga.estado] ?? carga.estado}
            </span>
          </div>
          {editable && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-[12px] text-coral-600 hover:underline disabled:opacity-60"
            >
              {cancelling ? "Cancelando…" : "Cancelar carga"}
            </button>
          )}
        </div>
        <p className="text-[13px] text-gray-400 mt-1">{ruta}</p>
      </div>

      {/* Transportista asignado */}
      {carga.transportista && (
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 mb-4 flex items-center gap-3">
          <i className="ti ti-truck text-teal-400 text-xl" />
          <div>
            <p className="text-[13px] font-semibold text-teal-600">
              {carga.transportista.nombre}
              {carga.transportista.score_plataforma != null && (
                <span className="ml-2 font-normal">
                  <span className="text-amber-400">★</span>{" "}
                  {carga.transportista.score_plataforma.toFixed(1)}
                </span>
              )}
            </p>
            <p className="text-[11px] text-teal-400">Transportista asignado</p>
          </div>
        </div>
      )}

      {/* Datos DUCA / documentos aduaneros (solo lectura) */}
      {(carga.duca_numero || carga.valor_mercancia_usd != null || carga.pais_origen || carga.mercancia) && (
        <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-5 mb-4">
          <p className="text-[13px] font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i className="ti ti-file-invoice text-teal-400" />
            Datos aduaneros
          </p>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {carga.mercancia && (
              <div>
                <p className="text-gray-400 mb-0.5">Mercancía</p>
                <p className="text-gray-800 font-medium">{carga.mercancia}</p>
              </div>
            )}
            {carga.duca_numero && (
              <div>
                <p className="text-gray-400 mb-0.5">
                  DUCA{carga.duca_tipo ? `-${carga.duca_tipo}` : ""}
                </p>
                <p className="text-gray-800 font-medium">{carga.duca_numero}</p>
              </div>
            )}
            {carga.valor_mercancia_usd != null && (
              <div>
                <p className="text-gray-400 mb-0.5">Valor mercancía</p>
                <p className="text-gray-800 font-medium">
                  {formatUSD(carga.valor_mercancia_usd)}
                </p>
              </div>
            )}
            {carga.pais_origen && (
              <div>
                <p className="text-gray-400 mb-0.5">País de origen</p>
                <p className="text-gray-800 font-medium">{carga.pais_origen}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progreso del viaje */}
      {movimiento && (
        <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-5 mb-4">
          <p className="text-[13px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <i className="ti ti-route text-teal-400" />
            Progreso del viaje —{" "}
            {movimiento.tipo_flujo === "importacion"
              ? "Importación (6 etapas)"
              : "Exportación (7 etapas)"}
          </p>
          <EtapasTimeline movimiento={movimiento} />
        </div>
      )}

      {/* Form de edición / detalle */}
      <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-5">
        <p className="text-[13px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className={`ti ${editable ? "ti-pencil" : "ti-file-description"} text-teal-400`} />
          {editable ? "Editar carga" : "Detalle de la carga"}
        </p>

        {!editable && (
          <p className="text-[11px] text-gray-200 mb-4 -mt-2">
            La carga ya tiene transportista asignado — los datos no se pueden modificar.
          </p>
        )}

        <form ref={formRef} onSubmit={handleSave}>
          <fieldset disabled={!editable} className="disabled:opacity-70">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Contenedor">
                <input
                  type="text"
                  disabled
                  value={CONTENEDOR_LABEL[carga.tipo_contenedor] ?? carga.tipo_contenedor}
                  className={inputCls}
                />
              </Field>
              <Field label="Peso estimado (TM)">
                <input
                  type="number"
                  name="peso_tm"
                  step="0.1"
                  min="0"
                  max="50"
                  defaultValue={carga.peso_tm ?? ""}
                  onChange={(e) =>
                    setPesoTM(e.target.value ? parseFloat(e.target.value) : null)
                  }
                  className={inputCls}
                />
              </Field>
            </div>

            {sobrepeso && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-md text-[12px] text-amber-600 flex items-start gap-2">
                <i className="ti ti-alert-triangle mt-0.5 flex-shrink-0" />
                <span>
                  Peso sobre 21 TM — cargo adicional por sobrepeso. Requiere
                  chassis de 3 ejes.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label={isImport ? "Destino / Bodega" : "Origen / Planta"}>
                <input
                  type="text"
                  name="destino_direccion"
                  required
                  defaultValue={carga.destino_direccion}
                  className={inputCls}
                />
              </Field>
              <Field label="Fecha disponible">
                <input
                  type="date"
                  name="fecha_disponible"
                  required
                  defaultValue={carga.fecha_disponible}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Tarifa referencia (USD)">
                <input
                  type="number"
                  name="tarifa_referencia"
                  step="50"
                  min="0"
                  defaultValue={carga.tarifa_referencia ?? ""}
                  placeholder="Vacío = subasta abierta"
                  className={inputCls}
                />
              </Field>
              <Field label="Naviera">
                <select
                  name="naviera"
                  defaultValue={carga.naviera ?? ""}
                  className={inputCls}
                >
                  <option value="">No especificada</option>
                  {NAVIERAS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Modo de asignación">
                <select
                  name="modo_asignacion"
                  defaultValue={carga.modo_asignacion}
                  className={inputCls}
                >
                  <option value="manual">Manual — yo elijo</option>
                  <option value="automatico">Automático — mejor postor</option>
                </select>
              </Field>
              <Field label="Publicada">
                <input
                  type="text"
                  disabled
                  value={new Date(carga.created_at).toLocaleDateString("es-GT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="mb-4">
              <Field label="Notas para el transportista">
                <textarea
                  name="notas"
                  rows={3}
                  defaultValue={carga.notas ?? ""}
                  placeholder="Instrucciones especiales, requisitos de equipo, horarios de bodega…"
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>

            {editable && (
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-teal-400 text-white rounded-md text-[14px] font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            )}
          </fieldset>
        </form>
      </div>
    </main>
  );
}

function EtapasTimeline({ movimiento }: { movimiento: MovimientoResumen }) {
  const etapas = getEtapas(movimiento.tipo_flujo);

  function getHora(idx: number): string | null {
    const entry = movimiento.historial?.find((h) => h.etapa === idx);
    if (!entry) return null;
    return new Date(entry.timestamp).toLocaleTimeString("es-GT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      {etapas.map((nombre, idx) => {
        const isDone = idx < movimiento.etapa_actual;
        const isActive = idx === movimiento.etapa_actual;
        const hora = isDone || isActive ? getHora(idx) : null;

        return (
          <div key={idx} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center">
              <div
                className={`w-[17px] h-[17px] rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDone
                    ? "bg-teal-400"
                    : isActive
                      ? "bg-teal-400 border-[2.5px] border-teal-100"
                      : "bg-gray-50 border border-gray-100"
                }`}
              >
                {isDone && <i className="ti ti-check text-white text-[10px]" />}
              </div>
              {idx < etapas.length - 1 && (
                <div
                  className={`w-px h-5 my-0.5 ${isDone ? "bg-teal-400" : "bg-gray-100"}`}
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
              {hora && <p className="text-[10px] text-gray-200 mt-0.5">{hora}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-[13px] text-gray-800 focus:outline-none focus:border-teal-100 disabled:text-gray-400";
