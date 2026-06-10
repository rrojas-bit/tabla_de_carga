"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  toggleAutoAsignacion,
  updateFlotaEstado,
  removeFlotaUnit,
  addTarifaRuta,
  deleteTarifaRuta,
} from "@/app/(dashboard)/transportista/actions";
import FlotaModal from "./FlotaModal";
import { CHASSIS_LABEL } from "@/lib/labels";

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
  open?: boolean;
  onClose?: () => void;
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

const ESTADOS: Array<"libre" | "en_ruta" | "mantenimiento"> = [
  "libre",
  "en_ruta",
  "mantenimiento",
];

export default function Sidebar({
  flota,
  tarifas,
  autoAsignacion,
  open = false,
  onClose,
}: Props) {
  const [autoOn, setAutoOn] = useState(autoAsignacion);
  const [isPending, startTransition] = useTransition();
  const [showFlotaModal, setShowFlotaModal] = useState(false);
  const [showTarifaForm, setShowTarifaForm] = useState(false);

  function handleToggle() {
    const newVal = !autoOn;
    setAutoOn(newVal);
    startTransition(async () => {
      const result = await toggleAutoAsignacion(newVal);
      if (result?.error) {
        setAutoOn(!newVal);
        toast.error(result.error);
      }
    });
  }

  const cabezales = flota.filter((f) => f.tipo === "cabezal");
  const chassis = flota.filter((f) => f.tipo === "chassis");

  const content = (
    <>
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
            role="switch"
            aria-checked={autoOn}
            aria-label="Auto-asignación de cargas"
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
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.7px]">
            Mi flota
          </p>
          <button
            onClick={() => setShowFlotaModal(true)}
            className="text-[11px] text-teal-600 font-semibold hover:underline flex items-center gap-0.5"
          >
            <i className="ti ti-plus text-[12px]" aria-hidden="true" />
            Agregar
          </button>
        </div>

        {cabezales.length > 0 && (
          <>
            {cabezales.length > 0 && chassis.length > 0 && (
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">
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
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5 mt-2">
                Chassis
              </p>
            )}
            {chassis.map((item) => (
              <FlotaCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {flota.length === 0 && (
          <div className="py-4 text-center">
            <i className="ti ti-truck-off text-2xl text-gray-100 block mb-1.5" aria-hidden="true" />
            <p className="text-[11px] text-gray-400 mb-2">
              Sin unidades registradas
            </p>
            <button
              onClick={() => setShowFlotaModal(true)}
              className="text-[11px] text-teal-600 font-semibold hover:underline"
            >
              + Registrar primera unidad
            </button>
          </div>
        )}
      </div>

      {/* Tarifas mínimas */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.7px]">
            Tarifa mínima por ruta
          </p>
          <button
            onClick={() => setShowTarifaForm((v) => !v)}
            className="text-[11px] text-teal-600 font-semibold hover:underline flex items-center gap-0.5"
          >
            <i
              className={`ti ${showTarifaForm ? "ti-x" : "ti-plus"} text-[12px]`}
              aria-hidden="true"
            />
            {showTarifaForm ? "Cerrar" : "Agregar"}
          </button>
        </div>

        {showTarifaForm && (
          <TarifaForm onDone={() => setShowTarifaForm(false)} />
        )}

        {tarifas.map((t) => (
          <TarifaCard key={t.id} tarifa={t} />
        ))}

        {tarifas.length === 0 && !showTarifaForm && (
          <p className="text-[11px] text-gray-400 text-center py-2">
            Sin tarifas configuradas — se usan para auto-asignación
          </p>
        )}
      </div>

      {showFlotaModal && (
        <FlotaModal onClose={() => setShowFlotaModal(false)} />
      )}
    </>
  );

  return (
    <>
      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-white p-[18px] overflow-y-auto transition-transform md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mi flota y tarifas"
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-[14px] font-semibold text-gray-800">
            Mi flota y tarifas
          </p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Cerrar panel"
          >
            <i className="ti ti-x text-[18px]" aria-hidden="true" />
          </button>
        </div>
        {content}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-[260px] min-w-[260px] bg-white border-r border-[rgba(68,68,65,0.12)] p-[18px] overflow-y-auto h-[calc(100vh-56px)] sticky top-[56px]">
        {content}
      </aside>
    </>
  );
}

function FlotaCard({ item }: { item: FlotaItem }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const sub =
    item.tipo === "cabezal"
      ? [item.marca, item.modelo].filter(Boolean).join(" ")
      : item.tipo_chassis
        ? CHASSIS_LABEL[item.tipo_chassis] ?? item.tipo_chassis
        : "Chassis";

  async function handleEstado(estado: "libre" | "en_ruta" | "mantenimiento") {
    setBusy(true);
    const result = await updateFlotaEstado(item.id, estado);
    if (result?.error) toast.error(result.error);
    setMenuOpen(false);
    setBusy(false);
  }

  async function handleRemove() {
    setBusy(true);
    const result = await removeFlotaUnit(item.id);
    if (result?.error) toast.error(result.error);
    else toast.success(`Unidad ${item.placa} dada de baja`);
    setMenuOpen(false);
    setBusy(false);
  }

  return (
    <div className="bg-gray-50 rounded-md px-3 py-2 mb-1.5 relative" ref={menuRef}>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[13px] font-semibold text-gray-800">
          {item.placa}
        </span>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer ${
            ESTADO_BADGE[item.estado] ?? "bg-gray-100 text-gray-400"
          }`}
          title="Cambiar estado"
        >
          {ESTADO_LABEL[item.estado] ?? item.estado}
          <i className="ti ti-chevron-down text-[9px] ml-0.5" aria-hidden="true" />
        </button>
      </div>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-2 top-8 bg-white rounded-md border border-gray-100 shadow-lg py-1 z-50 w-36"
        >
          {ESTADOS.filter((e) => e !== item.estado).map((e) => (
            <button
              key={e}
              role="menuitem"
              onClick={() => handleEstado(e)}
              disabled={busy}
              className="w-full text-left px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
            >
              {ESTADO_LABEL[e]}
            </button>
          ))}
          <button
            role="menuitem"
            onClick={handleRemove}
            disabled={busy}
            className="w-full text-left px-3 py-1.5 text-[12px] text-coral-600 hover:bg-coral-50 border-t border-gray-100"
          >
            Dar de baja
          </button>
        </div>
      )}
    </div>
  );
}

function TarifaCard({ tarifa }: { tarifa: TarifaRuta }) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const result = await deleteTarifaRuta(tarifa.id);
    if (result?.error) toast.error(result.error);
    setBusy(false);
  }

  return (
    <div className="bg-gray-50 rounded-md px-3 py-2 mb-1.5 group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">
            {tarifa.origen} → {tarifa.destino}
          </p>
          <p className="text-sm font-semibold text-teal-600">
            Q {tarifa.tarifa_minima.toLocaleString("es-GT")}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-gray-400 hover:text-coral-600 sm:text-gray-200 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1"
          title="Eliminar tarifa"
          aria-label={`Eliminar tarifa ${tarifa.origen} a ${tarifa.destino}`}
        >
          <i className="ti ti-trash text-[14px]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function TarifaForm({ onDone }: { onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setLoading(true);
    setError(null);

    const result = await addTarifaRuta(new FormData(formRef.current));

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onDone();
  }

  const inputCls =
    "w-full px-2.5 py-1.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-white text-[12px] text-gray-800 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-gray-50 rounded-md p-2.5 mb-2 space-y-1.5"
    >
      {error && <p className="text-[11px] text-coral-600">{error}</p>}
      <input
        type="text"
        name="origen"
        required
        placeholder="Origen — Ej. Puerto Quetzal"
        className={inputCls}
      />
      <input
        type="text"
        name="destino"
        required
        placeholder="Destino — Ej. Zona 12, CDGT"
        className={inputCls}
      />
      <input
        type="number"
        name="tarifa_minima"
        required
        min={1}
        step={50}
        placeholder="Tarifa mínima (Q)"
        className={inputCls}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-1.5 bg-teal-400 text-white rounded-md text-[12px] font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60"
      >
        {loading ? "Guardando…" : "Guardar tarifa"}
      </button>
    </form>
  );
}
