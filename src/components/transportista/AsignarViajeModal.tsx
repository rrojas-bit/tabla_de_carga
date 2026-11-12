"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { asignarViaje, registrarPiloto } from "@/app/(dashboard)/transportista/actions";
import type { PilotoItem, Viaje } from "@/app/(dashboard)/transportista/page";

type FlotaItem = { id: string; placa: string; tipo: string; estado: string };

type Props = {
  viaje: Viaje;
  pilotos: PilotoItem[];
  flota: FlotaItem[];
  onClose: () => void;
};

const inputCls =
  "w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-[13px] text-gray-800 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50";
const labelCls = "block text-[12px] text-gray-400 mb-1";

export default function AsignarViajeModal({ viaje, pilotos: pilotosIniciales, flota, onClose }: Props) {
  const router = useRouter();
  const mov = viaje.movimientos?.[0];

  const [pilotos, setPilotos] = useState(pilotosIniciales);
  const [pilotoId, setPilotoId] = useState(pilotosIniciales.length === 1 ? pilotosIniciales[0].id : "");
  const [cabezalId, setCabezalId] = useState("");
  const [nuevo, setNuevo] = useState(pilotosIniciales.length === 0);
  const [form, setForm] = useState({ nombre: "", dpi: "", telefono: "", licenciaTipo: "", licenciaVencimiento: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const cabezales = flota.filter((f) => f.tipo === "cabezal");
  const sinCabezal = !mov?.cabezal;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!mov) return;
    setLoading(true);
    setError(null);

    let id = pilotoId;
    if (nuevo) {
      const r = await registrarPiloto(form);
      if (r.error || !r.pilotoId) {
        setError(r.error ?? "No se pudo registrar el piloto");
        setLoading(false);
        return;
      }
      id = r.pilotoId;
      setPilotos((prev) => [...prev, { id, nombre_completo: form.nombre.trim(), telefono: form.telefono || null }]);
      setPilotoId(id);
      setNuevo(false);
    }

    if (!id) {
      setError("Elige un piloto.");
      setLoading(false);
      return;
    }

    const r = await asignarViaje(mov.id, id, cabezalId || null);
    if (r.error) {
      setError(r.error);
      setLoading(false);
      return;
    }
    toast.success("Piloto asignado. El viaje ya puede avanzar.");
    router.refresh();
    onClose();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "var(--scrim)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={guardar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asignar-title"
        className="bg-white p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--elevation-4)" }}
      >
        <div className="flex justify-between items-center mb-1">
          <h2 id="asignar-title" className="text-base font-semibold text-gray-800">
            Asignar piloto
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">
            ×
          </button>
        </div>
        <p className="text-[12px] text-gray-400 mb-4">
          {viaje.numero ? `#${viaje.numero} · ` : ""}El viaje no puede avanzar de etapa hasta tener piloto.
        </p>

        {error && (
          <div role="alert" className="mb-3 p-2.5 bg-coral-50 border border-coral-100 rounded-md text-[12px] text-coral-600">
            {error}
          </div>
        )}

        {!nuevo ? (
          <div className="mb-3">
            <label htmlFor="asg-piloto" className={labelCls}>Piloto</label>
            <select id="asg-piloto" required value={pilotoId} onChange={(e) => setPilotoId(e.target.value)} className={inputCls}>
              <option value="" disabled>Elige un piloto…</option>
              {pilotos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_completo}{p.telefono ? ` · ${p.telefono}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNuevo(true)}
              className="mt-2 text-[12px] font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              + Registrar piloto nuevo
            </button>
          </div>
        ) : (
          <fieldset className="mb-3 p-3 rounded-md" style={{ border: "1px solid var(--border-default)" }}>
            <legend className="px-1 text-[12px] font-semibold text-gray-800">Piloto nuevo</legend>
            <div className="mb-2.5">
              <label htmlFor="np-nombre" className={labelCls}>Nombre completo</label>
              <input id="np-nombre" required value={form.nombre} onChange={set("nombre")} className={inputCls} autoComplete="off" />
            </div>
            <div className="mb-2.5">
              <label htmlFor="np-dpi" className={labelCls}>DPI (13 dígitos)</label>
              <input id="np-dpi" required inputMode="numeric" pattern="[0-9 ]{13,17}" value={form.dpi} onChange={set("dpi")} placeholder="1234 56789 0101" className={inputCls} />
            </div>
            <div className="mb-2.5">
              <label htmlFor="np-tel" className={labelCls}>Teléfono (WhatsApp)</label>
              <input id="np-tel" type="tel" inputMode="tel" value={form.telefono} onChange={set("telefono")} placeholder="5555 5555" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="np-lic" className={labelCls}>Licencia</label>
                <select id="np-lic" value={form.licenciaTipo} onChange={set("licenciaTipo")} className={inputCls}>
                  <option value="">—</option>
                  <option value="A">Tipo A</option>
                  <option value="B">Tipo B</option>
                  <option value="C">Tipo C</option>
                </select>
              </div>
              <div>
                <label htmlFor="np-venc" className={labelCls}>Vence</label>
                <input id="np-venc" type="date" value={form.licenciaVencimiento} onChange={set("licenciaVencimiento")} className={inputCls} />
              </div>
            </div>
            {pilotos.length > 0 && (
              <button type="button" onClick={() => setNuevo(false)} className="mt-2 text-[12px] text-gray-400 hover:text-gray-600">
                ← Elegir uno existente
              </button>
            )}
          </fieldset>
        )}

        {cabezales.length > 0 && (
          <div className="mb-4">
            <label htmlFor="asg-cabezal" className={labelCls}>
              Cabezal {sinCabezal ? "(recomendado)" : `(actual: ${mov?.cabezal?.placa})`}
            </label>
            <select id="asg-cabezal" value={cabezalId} onChange={(e) => setCabezalId(e.target.value)} className={inputCls}>
              <option value="">{sinCabezal ? "Definir después" : "Mantener actual"}</option>
              {cabezales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.placa}{c.estado !== "libre" ? ` (${c.estado.replace("_", " ")})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[rgba(68,68,65,0.12)] rounded-md text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-2.5 text-white rounded-[var(--radius-md)] text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {loading ? "Guardando…" : nuevo ? "Registrar y asignar" : "Asignar piloto"}
          </button>
        </div>
      </form>
    </div>
  );
}
