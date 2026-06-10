// Etapas de viaje por tipo de flujo — spec ContainerGT v1 §9

export const ETAPAS_IMPORTACION = [
  "En ruta → Puerto",
  "Retiro de contenedor en puerto",
  "En ruta → Patio o Bodega destino",
  "Llegada a destino",
  "Descarga completada",
  "Entrega confirmada ✓",
] as const;

export const ETAPAS_EXPORTACION = [
  "En ruta → Patio naviera (vacío)",
  "Recogida de contenedor vacío",
  "En ruta → Planta exportador",
  "Posicionando / cargando",
  "En ruta → Puerto",
  "En puerto (esperando documentos)",
  "Gate-in completado ✓",
] as const;

export function getEtapas(tipoFlujo: "importacion" | "exportacion") {
  return tipoFlujo === "importacion"
    ? [...ETAPAS_IMPORTACION]
    : [...ETAPAS_EXPORTACION];
}

export function getMaxEtapa(tipoFlujo: "importacion" | "exportacion") {
  return getEtapas(tipoFlujo).length - 1;
}
