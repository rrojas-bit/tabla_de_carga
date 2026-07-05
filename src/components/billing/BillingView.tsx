"use client";

import { useState } from "react";

type Empresa = {
  id: string;
  nombre: string;
  estado: string;
  tipo: string;
} | null;

type Props = {
  rol: string;
  empresa: Empresa;
  nombreUsuario: string;
};

const PLANES_TRANSPORTISTA = [
  {
    id: "basico",
    nombre: "Básico",
    precio: 49,
    moneda: "USD",
    periodo: "mes",
    descripcion: "Para transportistas independientes que están empezando",
    features: [
      "Hasta 10 ofertas por mes",
      "Acceso a cargas publicadas",
      "Perfil de empresa básico",
      "Soporte por email",
    ],
    limitaciones: ["Sin auto-asignación", "Sin análisis de rutas"],
    destacado: false,
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: 99,
    moneda: "USD",
    periodo: "mes",
    descripcion: "El plan más popular para flotas en crecimiento",
    features: [
      "Ofertas ilimitadas",
      "Auto-asignación de cargas",
      "Hasta 15 vehículos en flota",
      "Análisis de rutas y tarifas",
      "Notificaciones WhatsApp",
      "Soporte prioritario",
    ],
    limitaciones: [],
    destacado: true,
  },
  {
    id: "enterprise",
    nombre: "Enterprise",
    precio: 149,
    moneda: "USD",
    periodo: "mes",
    descripcion: "Para flotas grandes con necesidades avanzadas",
    features: [
      "Todo lo del plan Pro",
      "Flota ilimitada",
      "API de integración",
      "Reportes personalizados",
      "Gestor de cuenta dedicado",
      "SLA garantizado",
    ],
    limitaciones: [],
    destacado: false,
  },
];

export default function BillingView({ rol, empresa, nombreUsuario }: Props) {
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(null);

  const esTransportista = rol === "transportista";
  const esImportadorExportador =
    rol === "importador" || empresa?.tipo === "importador" || empresa?.tipo === "exportador" || empresa?.tipo === "mixto";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-bg px-6 py-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-gray-800">
            Planes y facturación
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            Gestiona tu suscripción y métodos de pago
          </p>
        </div>

        {/* Current plan banner */}
        <div className="bg-white border border-[rgba(68,68,65,0.12)] rounded-lg p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
              <i className="ti ti-receipt text-teal-500 text-xl" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">
                Plan actual:{" "}
                <span className="text-teal-600">Período de prueba</span>
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {nombreUsuario} · {empresa?.nombre ?? "Sin empresa"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-md">
            <i className="ti ti-clock text-amber-500 text-sm" />
            <span className="text-[12px] text-amber-600 font-medium">
              Próximamente disponible
            </span>
          </div>
        </div>

        {esTransportista && (
          <TransportistaPricing
            planSeleccionado={planSeleccionado}
            onSelect={setPlanSeleccionado}
          />
        )}

        {esImportadorExportador && !esTransportista && (
          <ImportadorPricing />
        )}

        {/* Payment history */}
        <div className="mt-10">
          <h2 className="text-[15px] font-semibold text-gray-800 mb-4">
            Historial de pagos
          </h2>
          <div className="bg-white border border-[rgba(68,68,65,0.12)] rounded-lg overflow-hidden">
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <i className="ti ti-file-invoice text-5xl text-gray-100 mb-3 block" />
              <p className="text-sm text-gray-400 font-medium">
                Sin pagos registrados
              </p>
              <p className="text-xs text-gray-200 mt-1.5">
                Aquí aparecerán tus facturas una vez actives un plan
              </p>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
          <i className="ti ti-info-circle text-blue-400 text-lg flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] text-blue-600 leading-5">
              Los precios están en USD. Para Guatemala aplicamos el tipo de
              cambio vigente al momento del pago. El sistema de pagos estará
              disponible próximamente — te notificaremos por WhatsApp y email
              cuando esté listo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransportistaPricing({
  onSelect,
}: {
  planSeleccionado?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-gray-800">
          Planes para transportistas
        </h2>
        <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
          <i className="ti ti-shield-check text-teal-400" />
          Pago seguro · Cancela cuando quieras
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {PLANES_TRANSPORTISTA.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-lg border transition-all ${
              plan.destacado
                ? "border-teal-200 shadow-sm ring-1 ring-teal-100"
                : "border-[rgba(68,68,65,0.12)]"
            }`}
          >
            {plan.destacado && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-teal-500 text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">
                  Más popular
                </span>
              </div>
            )}

            <div className="p-5">
              <p className="text-[13px] font-semibold text-gray-800">
                {plan.nombre}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-4">
                {plan.descripcion}
              </p>

              <div className="mt-4 mb-5">
                <span className="text-[32px] font-semibold text-gray-800">
                  ${plan.precio}
                </span>
                <span className="text-[13px] text-gray-400 ml-1">
                  / {plan.periodo}
                </span>
              </div>

              <button
                onClick={() => onSelect(plan.id)}
                disabled
                className={`w-full py-2 rounded-md text-[13px] font-medium transition-all cursor-not-allowed opacity-60 ${
                  plan.destacado
                    ? "bg-teal-500 text-white"
                    : "bg-gray-50 border border-[rgba(68,68,65,0.12)] text-gray-600"
                }`}
              >
                Próximamente
              </button>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <i className="ti ti-check text-teal-500 text-sm flex-shrink-0 mt-0.5" />
                    <span className="text-[12px] text-gray-600">{f}</span>
                  </li>
                ))}
                {plan.limitaciones.map((l) => (
                  <li key={l} className="flex items-start gap-2">
                    <i className="ti ti-x text-gray-200 text-sm flex-shrink-0 mt-0.5" />
                    <span className="text-[12px] text-gray-300">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportadorPricing() {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-gray-800 mb-5">
        Precios para importadores / exportadores
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Pay per load */}
        <div className="bg-white border border-[rgba(68,68,65,0.12)] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <i className="ti ti-package text-blue-500 text-lg" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">
                Pago por carga
              </p>
              <p className="text-[11px] text-gray-400">Sin suscripción</p>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-[28px] font-semibold text-gray-800">
              $150
            </span>
            <span className="text-[13px] text-gray-400 ml-1">/ carga</span>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              "Publica una carga",
              "Recibe ofertas de transportistas",
              "Asignación y seguimiento",
              "Notificaciones en tiempo real",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <i className="ti ti-check text-teal-500 text-sm flex-shrink-0 mt-0.5" />
                <span className="text-[12px] text-gray-600">{f}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="w-full py-2 rounded-md text-[13px] font-medium bg-gray-50 border border-[rgba(68,68,65,0.12)] text-gray-400 cursor-not-allowed opacity-60"
          >
            Próximamente
          </button>
        </div>

        {/* Monthly subscription */}
        <div className="bg-white border border-teal-200 rounded-lg p-5 ring-1 ring-teal-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
              <i className="ti ti-star text-teal-500 text-lg" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">
                Suscripción mensual
              </p>
              <p className="text-[11px] text-gray-400">Cargas ilimitadas</p>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-[28px] font-semibold text-gray-800">
              $899
            </span>
            <span className="text-[13px] text-gray-400 ml-1">/ mes</span>
            <span className="ml-2 text-[11px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
              Ahorra 40%
            </span>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              "Cargas ilimitadas",
              "Todas las funciones del plan básico",
              "Reportes mensuales",
              "Soporte prioritario",
              "API de integración",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <i className="ti ti-check text-teal-500 text-sm flex-shrink-0 mt-0.5" />
                <span className="text-[12px] text-gray-600">{f}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="w-full py-2 rounded-md text-[13px] font-medium bg-teal-500 text-white cursor-not-allowed opacity-60"
          >
            Próximamente
          </button>
        </div>
      </div>
    </div>
  );
}
