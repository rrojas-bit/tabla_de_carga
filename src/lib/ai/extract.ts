import Anthropic from "@anthropic-ai/sdk";

export type ExtraccionDocumento = {
  tipo_documento: "duca" | "factura_proveedor" | "bl" | "packing_list" | "otro";
  confianza: "alta" | "media" | "baja";
  // Aduanero (DUCA)
  duca_numero: string | null;
  duca_tipo: "D" | "F" | "T" | null;
  tipo_operacion: "importacion" | "exportacion" | null;
  aduana: string | null;
  pais_origen: string | null;
  pais_destino: string | null;
  // Carga
  numero_contenedor: string | null;
  tipo_contenedor:
    | "20_dry"
    | "40_dry"
    | "40_hc"
    | "reefer"
    | "open_top"
    | "flat_rack"
    | "45"
    | null;
  peso_bruto_kg: number | null;
  marchamo: string | null;
  mercancia: string | null;
  valor_usd: number | null;
  // Transporte
  bl_numero: string | null;
  naviera: string | null;
  campos_dudosos: string[];
};

const FALLBACK_SIN_API_KEY: ExtraccionDocumento = {
  tipo_documento: "otro",
  confianza: "baja",
  duca_numero: null,
  duca_tipo: null,
  tipo_operacion: null,
  aduana: null,
  pais_origen: null,
  pais_destino: null,
  numero_contenedor: null,
  tipo_contenedor: null,
  peso_bruto_kg: null,
  marchamo: null,
  mercancia: null,
  valor_usd: null,
  bl_numero: null,
  naviera: null,
  campos_dudosos: [
    "API key de IA no configurada — llena el formulario manualmente.",
  ],
};

const EXTRACCION_SCHEMA = {
  type: "object",
  properties: {
    tipo_documento: {
      type: "string",
      enum: ["duca", "factura_proveedor", "bl", "packing_list", "otro"],
    },
    confianza: { type: "string", enum: ["alta", "media", "baja"] },
    duca_numero: { anyOf: [{ type: "string" }, { type: "null" }] },
    duca_tipo: {
      anyOf: [{ type: "string", enum: ["D", "F", "T"] }, { type: "null" }],
    },
    tipo_operacion: {
      anyOf: [
        { type: "string", enum: ["importacion", "exportacion"] },
        { type: "null" },
      ],
    },
    aduana: { anyOf: [{ type: "string" }, { type: "null" }] },
    pais_origen: { anyOf: [{ type: "string" }, { type: "null" }] },
    pais_destino: { anyOf: [{ type: "string" }, { type: "null" }] },
    numero_contenedor: { anyOf: [{ type: "string" }, { type: "null" }] },
    tipo_contenedor: {
      anyOf: [
        {
          type: "string",
          enum: [
            "20_dry",
            "40_dry",
            "40_hc",
            "reefer",
            "open_top",
            "flat_rack",
            "45",
          ],
        },
        { type: "null" },
      ],
    },
    peso_bruto_kg: { anyOf: [{ type: "number" }, { type: "null" }] },
    marchamo: { anyOf: [{ type: "string" }, { type: "null" }] },
    mercancia: { anyOf: [{ type: "string" }, { type: "null" }] },
    valor_usd: { anyOf: [{ type: "number" }, { type: "null" }] },
    bl_numero: { anyOf: [{ type: "string" }, { type: "null" }] },
    naviera: { anyOf: [{ type: "string" }, { type: "null" }] },
    campos_dudosos: { type: "array", items: { type: "string" } },
  },
  required: [
    "tipo_documento",
    "confianza",
    "duca_numero",
    "duca_tipo",
    "tipo_operacion",
    "aduana",
    "pais_origen",
    "pais_destino",
    "numero_contenedor",
    "tipo_contenedor",
    "peso_bruto_kg",
    "marchamo",
    "mercancia",
    "valor_usd",
    "bl_numero",
    "naviera",
    "campos_dudosos",
  ],
  additionalProperties: false,
};

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function extraerDocumento(
  bytes: Buffer,
  mimeType: string
): Promise<ExtraccionDocumento> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return FALLBACK_SIN_API_KEY;

  const client = new Anthropic({ apiKey });
  const data = bytes.toString("base64");

  const documentBlock = IMAGE_MIME_TYPES.has(mimeType)
    ? {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mimeType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data,
        },
      }
    : {
        type: "document" as const,
        source: {
          type: "base64" as const,
          media_type: "application/pdf" as const,
          data,
        },
      };

  const prompt = `Eres un asistente de datos aduaneros para ContainerGT, plataforma de transporte de contenedores en Guatemala y Centroamérica.

Extrae los datos de este documento (puede ser una DUCA — Declaración Única Centroamericana —, una factura de proveedor, un BL/conocimiento de embarque, o un packing list).

Reglas:
- Si un dato no aparece claramente en el documento, usa null — nunca inventes ni asumas valores.
- La DUCA centroamericana tiene tres modalidades: DUCA-D (importación/exportación definitiva), DUCA-F (comercio intra-centroamericano), DUCA-T (tránsito).
- "aduana" es el nombre o código de la aduana de entrada o salida (ej. Puerto Quetzal, Santo Tomás de Castilla, TECUN UMAN).
- Los países van en formato ISO 3166-1 alpha-2 (ej. "GT", "CN", "US").
- "numero_contenedor" sigue el formato ISO 6346 (4 letras + 7 dígitos, ej. MSKU1234567).
- "peso_bruto_kg" es el peso bruto en kilogramos tal como aparece en el documento (no lo conviertas).
- "valor_usd" es el valor FOB/CIF/en aduana expresado en dólares — si el documento usa otra moneda, deja el campo en null.
- Incluye en "campos_dudosos" el nombre de cualquier campo que hayas extraído con baja confianza o que sea ambiguo en el documento (usa los nombres de los campos de este schema, ej. "peso_bruto_kg").

Responde solo con el JSON estructurado, sin texto adicional.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1536,
    output_config: {
      format: { type: "json_schema", schema: EXTRACCION_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [documentBlock, { type: "text", text: prompt }],
      },
    ],
  });

  const block = message.content[0];
  if (block?.type !== "text" || !block.text) {
    throw new Error("Respuesta vacía de la IA");
  }

  return JSON.parse(block.text) as ExtraccionDocumento;
}

const CONTENEDOR_REGEX = /^[A-Z]{4}\d{7}$/;

// Valida y sanea la extracción cruda de la IA antes de guardarla o usarla
// para pre-poblar el formulario. peso_bruto_kg se clampa ya convertido a TM
// (0–50, mismo rango que el formulario de "Publicar carga").
export function validarExtraccion(
  raw: ExtraccionDocumento
): ExtraccionDocumento {
  const dudosos = new Set(raw.campos_dudosos);
  let peso_bruto_kg = raw.peso_bruto_kg;
  let valor_usd = raw.valor_usd;

  if (peso_bruto_kg != null) {
    const pesoTm = peso_bruto_kg / 1000;
    if (!(pesoTm > 0 && pesoTm <= 50)) {
      dudosos.add("peso_bruto_kg");
      peso_bruto_kg = null;
    }
  }

  if (valor_usd != null && valor_usd < 0) {
    dudosos.add("valor_usd");
    valor_usd = null;
  }

  if (
    raw.numero_contenedor &&
    !CONTENEDOR_REGEX.test(raw.numero_contenedor.toUpperCase().replace(/\s/g, ""))
  ) {
    dudosos.add("numero_contenedor");
  }

  return {
    ...raw,
    peso_bruto_kg,
    valor_usd,
    campos_dudosos: Array.from(dudosos),
  };
}
