import Anthropic from "@anthropic-ai/sdk";

export type AnalisisResult = {
  riesgo: "bajo" | "medio" | "alto";
  positivos: string[];
  riesgos: string[];
  recomendacion: "aprobar" | "aprobar_con_condiciones" | "rechazar";
  razon: string;
};

type EmpresaData = {
  nombre: string;
  rtu: string | null;
  tipo: string;
  seguro_terceros_vigente: boolean | null;
  inspeccion_cabezal: boolean | null;
  documentos: Record<string, unknown> | null;
  total_unidades: number;
};

export async function analizarTransportista(
  empresa: EmpresaData
): Promise<AnalisisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Return default analysis when API key not configured
    return {
      riesgo: "medio",
      positivos: ["Empresa registrada con datos básicos"],
      riesgos: ["API key de IA no configurada — análisis manual requerido"],
      recomendacion: "aprobar_con_condiciones",
      razon: "Revisión manual necesaria. Configure ANTHROPIC_API_KEY para análisis automático.",
    };
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Eres un evaluador de riesgo para ContainerGT, plataforma de transporte de contenedores en Guatemala.

Analiza este transportista para aprobación en la plataforma:

Empresa: ${empresa.nombre}
RTU/NIT: ${empresa.rtu ?? "No proporcionado"}
Tipo: ${empresa.tipo}
Seguro de terceros vigente: ${empresa.seguro_terceros_vigente ? "Sí" : empresa.seguro_terceros_vigente === false ? "No" : "No declarado"}
Inspección de cabezal aprobada: ${empresa.inspeccion_cabezal ? "Sí" : empresa.inspeccion_cabezal === false ? "No" : "No declarado"}
Unidades registradas: ${empresa.total_unidades}
Documentos adicionales: ${empresa.documentos ? JSON.stringify(empresa.documentos) : "Ninguno"}

Contexto: Guatemala, transporte terrestre de contenedores desde puertos (Quetzal, Barrios, TCQ). Regulación: Acuerdo Gubernativo 379-2010.

Responde SOLO con JSON válido, sin texto adicional:
{
  "riesgo": "bajo" | "medio" | "alto",
  "positivos": ["...", "..."],
  "riesgos": ["...", "..."],
  "recomendacion": "aprobar" | "aprobar_con_condiciones" | "rechazar",
  "razon": "Una oración concisa explicando la recomendación"
}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response format");

  return JSON.parse(jsonMatch[0]) as AnalisisResult;
}
