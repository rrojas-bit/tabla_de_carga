import Anthropic from "@anthropic-ai/sdk";

// Detección de anomalías — señales determinísticas calculadas en código
// (auditables), la IA prioriza y redacta la recomendación.

export type Alerta = {
  tipo: "etapas_rapidas" | "bid_anomalo" | "piloto_flags" | "otro";
  severidad: "alta" | "media" | "baja";
  titulo: string;
  detalle: string;
  recomendacion: string;
  referencia: string; // #carga, empresa o piloto afectado
};

export type DeteccionResult = {
  alertas: Alerta[];
  resumen: string;
};

// ---- Señales de entrada (las arma el server action con datos de Supabase) ----

export type MovimientoSenal = {
  carga_numero: string;
  ruta: string;
  empresa_nombre: string;
  etapas_total: number;
  // Minutos entre cada avance de etapa consecutivo
  intervalos_min: number[];
};

export type BidSenal = {
  carga_numero: string;
  ruta: string;
  empresa_nombre: string;
  monto: number;
  promedio_ruta: number;
  num_referencias: number;
};

export type FlagSenal = {
  piloto_nombre: string;
  empresa_nombre: string | null;
  total_flags: number;
  tipos: string[];
  viajes_activos: number;
};

// Umbral: un tramo real entre etapas (puerto→bodega, carga, descarga)
// difícilmente baja de 15 minutos; varios consecutivos así es señal de
// que el piloto marca etapas sin moverse.
const INTERVALO_SOSPECHOSO_MIN = 15;
const TRAMOS_SOSPECHOSOS_MIN = 2;

// Bid >45% por debajo del promedio histórico de la ruta = posible bid
// fantasma (ganar la subasta para luego cancelar o renegociar).
const DESVIACION_BID_SOSPECHOSA = 0.45;
const MIN_REFERENCIAS_RUTA = 3;

export function detectarSenales(datos: {
  movimientos: MovimientoSenal[];
  bids: BidSenal[];
  flags: FlagSenal[];
}): Alerta[] {
  const alertas: Alerta[] = [];

  for (const m of datos.movimientos) {
    const rapidos = m.intervalos_min.filter((i) => i < INTERVALO_SOSPECHOSO_MIN);
    if (rapidos.length >= TRAMOS_SOSPECHOSOS_MIN) {
      alertas.push({
        tipo: "etapas_rapidas",
        severidad: rapidos.length >= 3 ? "alta" : "media",
        titulo: "Etapas avanzadas demasiado rápido",
        detalle: `${rapidos.length} tramos consecutivos completados en menos de ${INTERVALO_SOSPECHOSO_MIN} min en la ruta ${m.ruta}. Tiempos: ${m.intervalos_min.map((i) => `${Math.round(i)}m`).join(", ")}.`,
        recomendacion:
          "Verificar con el piloto y el cliente si el viaje ocurrió realmente. Considerar requerir GPS en esta empresa.",
        referencia: `Carga #${m.carga_numero} · ${m.empresa_nombre}`,
      });
    }
  }

  for (const b of datos.bids) {
    if (b.num_referencias < MIN_REFERENCIAS_RUTA) continue;
    const desviacion = (b.promedio_ruta - b.monto) / b.promedio_ruta;
    if (desviacion > DESVIACION_BID_SOSPECHOSA) {
      alertas.push({
        tipo: "bid_anomalo",
        severidad: desviacion > 0.6 ? "alta" : "media",
        titulo: "Oferta muy por debajo del mercado",
        detalle: `Oferta de Q ${b.monto.toLocaleString("es-GT")} en ruta con promedio histórico de Q ${Math.round(b.promedio_ruta).toLocaleString("es-GT")} (${b.num_referencias} referencias) — ${Math.round(desviacion * 100)}% por debajo.`,
        recomendacion:
          "Posible bid fantasma para ganar y cancelar, o transportista operando a pérdida. Contactar antes de que el importador acepte.",
        referencia: `Carga #${b.carga_numero} · ${b.empresa_nombre}`,
      });
    }
  }

  for (const f of datos.flags) {
    if (f.total_flags >= 2 && f.viajes_activos > 0) {
      alertas.push({
        tipo: "piloto_flags",
        severidad: f.tipos.includes("robo") ? "alta" : "media",
        titulo: "Piloto con incidentes sin resolver en viaje activo",
        detalle: `${f.total_flags} reportes sin verificar (${f.tipos.join(", ")}) y actualmente tiene ${f.viajes_activos} viaje(s) en curso.`,
        recomendacion:
          "Revisar y resolver los flags pendientes. Evaluar suspender asignaciones al piloto hasta verificación.",
        referencia: `${f.piloto_nombre}${f.empresa_nombre ? ` · ${f.empresa_nombre}` : ""}`,
      });
    }
  }

  return alertas;
}

const ORDEN_SEVERIDAD: Record<Alerta["severidad"], number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

export async function analizarAnomalias(datos: {
  movimientos: MovimientoSenal[];
  bids: BidSenal[];
  flags: FlagSenal[];
}): Promise<DeteccionResult> {
  const alertas = detectarSenales(datos).sort(
    (a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]
  );

  if (alertas.length === 0) {
    return {
      alertas: [],
      resumen: "Sin anomalías detectadas en movimientos, ofertas ni pilotos.",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      alertas,
      resumen: `${alertas.length} señal(es) detectada(s) con reglas determinísticas. Configure ANTHROPIC_API_KEY para priorización con IA.`,
    };
  }

  // La IA revisa el conjunto: ajusta severidades, descarta falsos positivos
  // evidentes y redacta el resumen ejecutivo para el admin.
  const client = new Anthropic({ apiKey });

  const prompt = `Eres el analista de riesgo de ContainerGT, plataforma de transporte de contenedores en Guatemala. El sistema detectó estas señales de posible fraude u operación irregular:

${JSON.stringify(alertas, null, 2)}

Contexto operativo: los viajes reales puerto↔bodega en Guatemala toman horas (Puerto Quetzal→Ciudad de Guatemala ~2-3h por tramo). Las etapas las avanza el piloto manualmente desde su app. Las tarifas típicas van de Q 2,000 a Q 6,000 según ruta y contenedor.

Tu tarea:
1. Revisa cada alerta: ajusta "severidad" si corresponde (alta/media/baja) y mejora "recomendacion" con el siguiente paso concreto para el equipo admin.
2. Si una alerta parece falso positivo evidente, bájala a "baja" y dilo en la recomendación — NO la elimines.
3. Escribe un "resumen" ejecutivo de 1-3 oraciones: qué atender primero y por qué.

Mantén los campos "tipo", "titulo", "detalle" y "referencia" sin cambios.

Responde SOLO con JSON válido, sin texto adicional:
{
  "alertas": [ { "tipo": "...", "severidad": "...", "titulo": "...", "detalle": "...", "recomendacion": "...", "referencia": "..." } ],
  "resumen": "..."
}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response format");

  const parsed = JSON.parse(jsonMatch[0]) as DeteccionResult;
  parsed.alertas.sort(
    (a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad]
  );
  return parsed;
}
