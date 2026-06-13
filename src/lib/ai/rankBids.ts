import Anthropic from "@anthropic-ai/sdk";

// Ranking inteligente de ofertas — pondera precio Y reputación del
// transportista (score, historial, flags), nunca solo el monto.

export type BidParaAnalisis = {
  bid_id: string;
  monto: number;
  tiempo_respuesta: string;
  nota: string | null;
  empresa_nombre: string;
  score_plataforma: number | null;
  total_evaluaciones: number | null;
  cargas_completadas: number;
  flags_pilotos: number;
  flota_libre: number;
};

export type BidEvaluacion = {
  bid_id: string;
  score: number; // 0-100 compuesto
  etiqueta: string | null; // "Mejor balance", "Más confiable", "Mejor precio"…
  razon: string;
};

export type RankingResult = {
  evaluaciones: BidEvaluacion[];
  resumen: string;
};

// Pesos del score compuesto: la reputación pesa igual que el precio.
const PESO_PRECIO = 0.35;
const PESO_REPUTACION = 0.35;
const PESO_EXPERIENCIA = 0.2;
const PESO_FLOTA = 0.1;
const PENALIZACION_FLAG = 15;

export function scoreCompuesto(
  bid: BidParaAnalisis,
  montoMin: number
): number {
  // Precio: la oferta más baja = 100; el resto baja proporcionalmente
  const precio = montoMin > 0 ? Math.max(0, 100 - ((bid.monto - montoMin) / montoMin) * 100) : 50;

  // Reputación: score 0-5 → 0-100. Sin evaluaciones = 45 (neutral con cautela)
  const reputacion =
    bid.score_plataforma != null && (bid.total_evaluaciones ?? 0) > 0
      ? (bid.score_plataforma / 5) * 100
      : 45;

  // Experiencia: 20+ cargas entregadas = 100
  const experiencia = (Math.min(bid.cargas_completadas, 20) / 20) * 100;

  // Disponibilidad: 3+ unidades libres = 100
  const flota = (Math.min(bid.flota_libre, 3) / 3) * 100;

  const base =
    precio * PESO_PRECIO +
    reputacion * PESO_REPUTACION +
    experiencia * PESO_EXPERIENCIA +
    flota * PESO_FLOTA;

  return Math.round(
    Math.max(0, Math.min(100, base - bid.flags_pilotos * PENALIZACION_FLAG))
  );
}

function rankingDeterministico(bids: BidParaAnalisis[]): RankingResult {
  const montoMin = Math.min(...bids.map((b) => b.monto));
  const evaluaciones: BidEvaluacion[] = bids
    .map((b): BidEvaluacion => {
      const score = scoreCompuesto(b, montoMin);
      const factores: string[] = [];
      if (b.monto === montoMin) factores.push("mejor precio");
      if ((b.score_plataforma ?? 0) >= 4.5 && (b.total_evaluaciones ?? 0) >= 5)
        factores.push(`★ ${b.score_plataforma?.toFixed(1)}`);
      if (b.cargas_completadas >= 10) factores.push(`${b.cargas_completadas} entregas`);
      if (b.flags_pilotos > 0) factores.push(`${b.flags_pilotos} incidente(s) reportado(s)`);
      return {
        bid_id: b.bid_id,
        score,
        etiqueta: null,
        razon: factores.length > 0 ? factores.join(" · ") : "Sin historial en la plataforma",
      };
    })
    .sort((a, b) => b.score - a.score);

  // Etiquetas básicas sin IA
  if (evaluaciones.length > 0) evaluaciones[0].etiqueta = "Mejor balance";

  return {
    evaluaciones,
    resumen:
      "Ranking calculado con criterios compuestos (precio, reputación, experiencia, disponibilidad). Configure ANTHROPIC_API_KEY para análisis con IA.",
  };
}

export async function rankearOfertas(
  bids: BidParaAnalisis[],
  contexto: { ruta: string; tipo_contenedor: string; tarifa_referencia: number | null }
): Promise<RankingResult> {
  if (bids.length === 0) {
    return { evaluaciones: [], resumen: "Sin ofertas para analizar." };
  }

  const montoMin = Math.min(...bids.map((b) => b.monto));
  // El score compuesto se calcula siempre en código (determinístico y auditable);
  // la IA aporta etiquetas y explicación, no decide el número.
  const conScore = bids.map((b) => ({ ...b, score: scoreCompuesto(b, montoMin) }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return rankingDeterministico(bids);

  const client = new Anthropic({ apiKey });

  const prompt = `Eres el asistente de decisión de ContainerGT, plataforma de transporte de contenedores en Guatemala. Un importador recibió ofertas para su carga y debe elegir transportista.

REGLA CLAVE: el ranking NO se basa solo en precio. La reputación del transportista (score, evaluaciones, entregas completadas, incidentes de sus pilotos) pesa igual que el monto. Una oferta barata de un transportista sin historial o con incidentes NO debe quedar arriba de una oferta razonable de uno confiable.

Carga: ${contexto.ruta} · ${contexto.tipo_contenedor}${contexto.tarifa_referencia ? ` · Tarifa referencia: Q ${contexto.tarifa_referencia}` : " · Subasta abierta (sin tarifa referencia)"}

Ofertas (score compuesto ya calculado: 35% precio, 35% reputación, 20% experiencia, 10% disponibilidad, -15 pts por incidente):
${conScore
  .map(
    (b, i) => `${i + 1}. bid_id: ${b.bid_id}
   Empresa: ${b.empresa_nombre}
   Monto: Q ${b.monto}
   Score plataforma: ${b.score_plataforma != null ? `${b.score_plataforma}/5 (${b.total_evaluaciones ?? 0} evaluaciones)` : "Sin evaluaciones (nuevo)"}
   Cargas entregadas: ${b.cargas_completadas}
   Incidentes de pilotos sin resolver: ${b.flags_pilotos}
   Unidades libres: ${b.flota_libre}
   Tiempo de respuesta: ${b.tiempo_respuesta}
   ${b.nota ? `Nota: "${b.nota}"` : ""}
   Score compuesto: ${b.score}/100`
  )
  .join("\n")}

Para cada oferta escribe una etiqueta corta (máx 3 palabras, ej: "Mejor balance", "Más confiable", "Mejor precio", "Riesgo: sin historial", "Precaución: incidentes") y una razón de UNA oración en español. Usa el score compuesto dado, no lo recalcules. Etiqueta null si la oferta no destaca en nada.

Responde SOLO con JSON válido, sin texto adicional:
{
  "evaluaciones": [
    { "bid_id": "...", "score": <el score compuesto dado>, "etiqueta": "..." | null, "razon": "..." }
  ],
  "resumen": "Una o dos oraciones recomendando cuál aceptar y por qué"
}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response format");

  const parsed = JSON.parse(jsonMatch[0]) as RankingResult;

  // Blindaje: forzamos el score determinístico aunque el modelo lo altere,
  // y ordenamos por score descendente.
  const scoreMap = new Map(conScore.map((b) => [b.bid_id, b.score]));
  parsed.evaluaciones = parsed.evaluaciones
    .filter((e) => scoreMap.has(e.bid_id))
    .map((e) => ({ ...e, score: scoreMap.get(e.bid_id)! }))
    .sort((a, b) => b.score - a.score);

  return parsed;
}
