"use client";

import { useState, useTransition } from "react";
import { aprobarEmpresa, rechazarEmpresa, analizarConIA } from "@/app/(dashboard)/admin/actions";
import type { EmpresaPendiente } from "@/app/(dashboard)/admin/page";
import type { AnalisisResult } from "@/lib/ai/analyze";

type EmpresaActiva = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  score_plataforma: number | null;
  total_evaluaciones: number | null;
  created_at: string;
};

type Props = {
  pendientes: EmpresaPendiente[];
  activas: EmpresaActiva[];
};

type Tab = "pendientes" | "activas";

const RIESGO_COLOR: Record<string, string> = {
  bajo: "bg-teal-50 text-teal-600 border-teal-100",
  medio: "bg-amber-50 text-amber-600 border-amber-100",
  alto: "bg-coral-50 text-coral-600 border-coral-100",
};

const RECOMENDACION_COLOR: Record<string, string> = {
  aprobar: "text-teal-600",
  aprobar_con_condiciones: "text-amber-600",
  rechazar: "text-coral-600",
};

const RECOMENDACION_LABEL: Record<string, string> = {
  aprobar: "Aprobar",
  aprobar_con_condiciones: "Aprobar con condiciones",
  rechazar: "Rechazar",
};

export default function AdminView({ pendientes, activas }: Props) {
  const [tab, setTab] = useState<Tab>("pendientes");
  const [selected, setSelected] = useState<EmpresaPendiente | null>(
    pendientes[0] ?? null
  );
  const [analisis, setAnalisis] = useState<Record<string, AnalisisResult>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [rechazarId, setRechazarId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  useTransition();

  async function handleAnalizar(empresaId: string) {
    setAnalyzing(empresaId);
    const { result, error } = await analizarConIA(empresaId);
    if (result) {
      setAnalisis((prev) => ({ ...prev, [empresaId]: result }));
    } else {
      alert("Error en análisis IA: " + error);
    }
    setAnalyzing(null);
  }

  async function handleAprobar(empresaId: string) {
    setActing(empresaId);
    const res = await aprobarEmpresa(empresaId);
    if (res?.error) alert(res.error);
    setActing(null);
  }

  async function handleRechazar() {
    if (!rechazarId || !motivoRechazo.trim()) return;
    setActing(rechazarId);
    const res = await rechazarEmpresa(rechazarId, motivoRechazo);
    if (res?.error) alert(res.error);
    setRechazarId(null);
    setMotivoRechazo("");
    setActing(null);
  }

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Left: list */}
      <aside className="w-[300px] min-w-[300px] bg-white border-r border-[rgba(68,68,65,0.12)] overflow-y-auto h-[calc(100vh-56px)] sticky top-[56px]">
        <div className="p-4 border-b border-[rgba(68,68,65,0.12)]">
          <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
            {(["pendientes", "activas"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-all capitalize ${
                  tab === t
                    ? "bg-white text-gray-800 border border-[rgba(68,68,65,0.12)]"
                    : "text-gray-400"
                }`}
              >
                {t === "pendientes"
                  ? `Pendientes${pendientes.length > 0 ? ` (${pendientes.length})` : ""}`
                  : `Activas (${activas.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="py-2">
          {tab === "pendientes" ? (
            pendientes.length === 0 ? (
              <div className="py-10 text-center px-4">
                <i className="ti ti-circle-check text-3xl text-teal-100 block mb-2" />
                <p className="text-sm text-gray-400">Sin pendientes</p>
              </div>
            ) : (
              pendientes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className={`w-full text-left px-4 py-3 border-b border-[rgba(68,68,65,0.06)] transition-all ${
                    selected?.id === e.id
                      ? "bg-teal-50 border-l-2 border-l-teal-400"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <p className="text-[13px] font-semibold text-gray-800 truncate">
                    {e.nombre}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {e.tipo} · {new Date(e.created_at).toLocaleDateString("es-GT")}
                  </p>
                  {analisis[e.id] && (
                    <span
                      className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                        RIESGO_COLOR[analisis[e.id].riesgo]
                      }`}
                    >
                      Riesgo {analisis[e.id].riesgo}
                    </span>
                  )}
                </button>
              ))
            )
          ) : (
            activas.map((e) => (
              <div
                key={e.id}
                className="px-4 py-3 border-b border-[rgba(68,68,65,0.06)]"
              >
                <div className="flex justify-between items-start">
                  <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[180px]">
                    {e.nombre}
                  </p>
                  {e.score_plataforma != null && (
                    <span className="text-[11px] text-amber-400 font-semibold">
                      ★ {e.score_plataforma.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{e.tipo}</p>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Right: detail panel */}
      <main className="flex-1 p-6 bg-bg overflow-y-auto">
        {tab === "pendientes" && selected ? (
          <PendienteDetail
            empresa={selected}
            analisis={analisis[selected.id]}
            analyzing={analyzing === selected.id}
            acting={acting === selected.id}
            onAnalizar={() => handleAnalizar(selected.id)}
            onAprobar={() => handleAprobar(selected.id)}
            onRechazar={() => setRechazarId(selected.id)}
          />
        ) : tab === "activas" ? (
          <div className="flex items-center justify-center h-60">
            <div className="text-center">
              <i className="ti ti-building-store text-4xl text-gray-100 block mb-2" />
              <p className="text-sm text-gray-400">
                {activas.length} empresas activas en la plataforma
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-60">
            <p className="text-sm text-gray-400">Selecciona una empresa</p>
          </div>
        )}
      </main>

      {/* Rechazo modal */}
      {rechazarId && (
        <div
          className="fixed inset-0 bg-black/30 z-[999] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setRechazarId(null)}
        >
          <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Rechazar empresa
            </h2>
            <div className="mb-4">
              <label className="block text-[12px] text-gray-400 mb-1">
                Motivo del rechazo
              </label>
              <textarea
                rows={3}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej. Documentos incompletos, seguro vencido…"
                className="w-full px-3 py-2 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-[13px] text-gray-800 focus:outline-none focus:border-teal-100 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRechazarId(null)}
                className="flex-1 py-2.5 border border-[rgba(68,68,65,0.12)] rounded-md text-[13px] text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={!motivoRechazo.trim() || acting !== null}
                className="flex-[2] py-2.5 bg-coral-400 text-white rounded-md text-[13px] font-semibold hover:bg-coral-600 transition-colors disabled:opacity-60"
              >
                {acting ? "..." : "Rechazar empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Detail panel ----

type DetailProps = {
  empresa: EmpresaPendiente;
  analisis?: AnalisisResult;
  analyzing: boolean;
  acting: boolean;
  onAnalizar: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
};

function PendienteDetail({
  empresa,
  analisis,
  analyzing,
  acting,
  onAnalizar,
  onAprobar,
  onRechazar,
}: DetailProps) {
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{empresa.nombre}</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {empresa.tipo} · RTU: {empresa.rtu ?? "No proporcionado"}
            {empresa.telefono_whatsapp && (
              <span className="ml-2">· WA: {empresa.telefono_whatsapp}</span>
            )}
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-600 font-semibold">
          Pendiente calificación
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          ["Unidades en flota", empresa.total_flota.toString(), "ti-truck"],
          ["Pilotos registrados", empresa.total_pilotos.toString(), "ti-steering-wheel"],
          [
            "Seguro terceros",
            empresa.perfil?.seguro_terceros_vigente === true
              ? "Vigente"
              : empresa.perfil?.seguro_terceros_vigente === false
                ? "No"
                : "No declarado",
            "ti-shield-check",
          ],
        ].map(([label, value, icon]) => (
          <div
            key={label}
            className="bg-white rounded-md border border-[rgba(68,68,65,0.12)] px-4 py-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <i className={`ti ${icon} text-gray-200 text-[14px]`} />
              <span className="text-[11px] text-gray-400">{label}</span>
            </div>
            <p className="text-[18px] font-semibold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Perfil check */}
      {empresa.perfil && (
        <div className="bg-white rounded-md border border-[rgba(68,68,65,0.12)] p-4 mb-5">
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Perfil de transportista
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Seguro de terceros vigente", empresa.perfil.seguro_terceros_vigente],
              ["Inspección de cabezal", empresa.perfil.inspeccion_cabezal],
              ["Auto-asignación activada", empresa.perfil.auto_asignacion_activa],
            ].map(([label, val]) => (
              <div key={String(label)} className="flex items-center gap-2">
                <i
                  className={`ti text-[14px] ${
                    val === true
                      ? "ti-circle-check text-teal-400"
                      : val === false
                        ? "ti-circle-x text-coral-400"
                        : "ti-circle-dashed text-gray-200"
                  }`}
                />
                <span className="text-[12px] text-gray-600">{label as string}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {!analisis ? (
        <button
          onClick={onAnalizar}
          disabled={analyzing}
          className="w-full py-3 mb-5 bg-white border border-[rgba(68,68,65,0.12)] rounded-md text-[13px] font-medium text-gray-600 hover:border-teal-100 hover:text-teal-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {analyzing ? (
            <>
              <i className="ti ti-loader-2 animate-spin" />
              Analizando con IA…
            </>
          ) : (
            <>
              <i className="ti ti-sparkles text-teal-400" />
              Analizar con IA
            </>
          )}
        </button>
      ) : (
        <div className="bg-white rounded-md border border-[rgba(68,68,65,0.12)] p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <i className="ti ti-sparkles text-teal-400 text-lg" />
            <p className="text-[14px] font-semibold text-gray-800">
              Análisis de IA
            </p>
            <span
              className={`ml-auto text-[12px] px-2.5 py-1 rounded-md border font-semibold ${
                RIESGO_COLOR[analisis.riesgo]
              }`}
            >
              Riesgo {analisis.riesgo}
            </span>
          </div>

          <p className="text-[13px] text-gray-600 mb-4 leading-relaxed bg-gray-50 rounded-md p-3">
            {analisis.razon}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-3">
            {analisis.positivos.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-teal-600 mb-2 uppercase tracking-wide">
                  Factores positivos
                </p>
                {analisis.positivos.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1.5">
                    <i className="ti ti-circle-check text-teal-400 text-[13px] mt-0.5 flex-shrink-0" />
                    <span className="text-[12px] text-gray-600">{p}</span>
                  </div>
                ))}
              </div>
            )}
            {analisis.riesgos.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-coral-600 mb-2 uppercase tracking-wide">
                  Factores de riesgo
                </p>
                {analisis.riesgos.map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5 mb-1.5">
                    <i className="ti ti-alert-circle text-coral-400 text-[13px] mt-0.5 flex-shrink-0" />
                    <span className="text-[12px] text-gray-600">{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[12px] text-gray-400 pt-3 border-t border-[rgba(68,68,65,0.08)]">
            Recomendación:{" "}
            <span
              className={`font-semibold ${
                RECOMENDACION_COLOR[analisis.recomendacion]
              }`}
            >
              {RECOMENDACION_LABEL[analisis.recomendacion]}
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onRechazar}
          disabled={acting}
          className="flex-1 py-3 border border-coral-100 bg-coral-50 text-coral-600 rounded-md text-[14px] font-semibold hover:bg-coral-100 transition-colors disabled:opacity-60"
        >
          Rechazar
        </button>
        <button
          onClick={onAprobar}
          disabled={acting}
          className="flex-[2] py-3 bg-teal-400 text-white rounded-md text-[14px] font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60"
        >
          {acting ? "Procesando…" : "✓ Aprobar empresa"}
        </button>
      </div>
    </div>
  );
}
