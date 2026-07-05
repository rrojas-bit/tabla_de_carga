"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extraerDocumento, validarExtraccion } from "@/lib/ai/extract";
import type { Enums } from "@/types/database";

const LIMITE_DOCUMENTOS_POR_DIA = 30;

export async function publishCarga(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) return { error: "No se encontró empresa" };

  const tipo_operacion = formData.get("tipo_operacion") as Enums<"operacion_tipo">;
  const puerto_id = formData.get("puerto_id") as string;
  const tipo_contenedor = formData.get("tipo_contenedor") as Enums<"contenedor_tipo">;
  const peso_raw = formData.get("peso_tm") as string;
  const peso_tm = peso_raw ? parseFloat(peso_raw) : null;
  const naviera = (formData.get("naviera") as string) || null;
  const destino_direccion = formData.get("destino_direccion") as string;
  const fecha_disponible = formData.get("fecha_disponible") as string;
  const tarifa_raw = formData.get("tarifa_referencia") as string;
  const tarifa_referencia = tarifa_raw ? parseFloat(tarifa_raw) : null;
  const modo_asignacion = formData.get("modo_asignacion") as Enums<"asignacion_modo">;
  const seguro_carga = formData.get("seguro_carga") === "si";
  const gps_requerido = formData.get("gps_requerido") === "si";
  const mercancia = ((formData.get("mercancia") as string) || "").trim() || null;
  const duca_numero = ((formData.get("duca_numero") as string) || "").trim() || null;
  const duca_tipo_raw = (formData.get("duca_tipo") as string) || "";
  const duca_tipo = ["D", "F", "T"].includes(duca_tipo_raw) ? duca_tipo_raw : null;
  const valor_raw = formData.get("valor_mercancia_usd") as string;
  const valor_mercancia_usd =
    valor_raw && parseFloat(valor_raw) >= 0 ? parseFloat(valor_raw) : null;
  const pais_origen =
    ((formData.get("pais_origen") as string) || "").trim().toUpperCase().slice(0, 2) || null;
  const documentoIds = formData.getAll("documento_id") as string[];

  if (!tipo_operacion || !puerto_id || !tipo_contenedor || !destino_direccion || !fecha_disponible) {
    return { error: "Completa todos los campos obligatorios" };
  }

  // sobrepeso es una columna generada en la base de datos (peso_tm > 21 TM,
  // Acuerdo Gubernativo 379-2010) — no se envía en el insert.
  const { data: nuevaCarga, error } = await supabase
    .from("cargas")
    .insert({
      cliente_empresa_id: profile.empresa_id,
      tipo_operacion,
      puerto_id,
      tipo_contenedor,
      peso_tm,
      naviera,
      destino_direccion,
      fecha_disponible,
      tarifa_referencia,
      modo_asignacion,
      seguro_carga,
      gps_requerido,
      mercancia,
      duca_numero,
      duca_tipo,
      valor_mercancia_usd,
      pais_origen,
      estado: "publicada",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (documentoIds.length > 0) {
    await supabase
      .from("documentos_carga")
      .update({ carga_id: nuevaCarga.id })
      .in("id", documentoIds)
      .eq("empresa_id", profile.empresa_id);
  }

  revalidatePath("/importador");
  return { success: true };
}

export async function acceptBid(bidId: string, cargaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) return { error: "No se encontró empresa" };

  // Verify ownership
  const { data: carga } = await supabase
    .from("cargas")
    .select("id, cliente_empresa_id, tipo_operacion")
    .eq("id", cargaId)
    .eq("cliente_empresa_id", profile.empresa_id)
    .single();

  if (!carga) return { error: "Carga no encontrada o sin permiso" };

  // Get bid empresa
  const { data: bid } = await supabase
    .from("bids")
    .select("empresa_id, cabezal_id")
    .eq("id", bidId)
    .single();

  if (!bid) return { error: "Oferta no encontrada" };

  // Accept this bid, reject others
  const [updateBid, , updateCarga] = await Promise.all([
    supabase.from("bids").update({ estado: "aceptada" }).eq("id", bidId),
    supabase
      .from("bids")
      .update({ estado: "rechazada" })
      .eq("carga_id", cargaId)
      .neq("id", bidId)
      .eq("estado", "pendiente"),
    supabase
      .from("cargas")
      .update({
        estado: "asignada",
        bid_ganador_id: bidId,
        transportista_asignado_id: bid.empresa_id,
      })
      .eq("id", cargaId),
  ]);

  if (updateBid.error) return { error: updateBid.error.message };
  if (updateCarga.error) return { error: updateCarga.error.message };

  // Crear el movimiento del viaje — flujo según tipo de operación (import 6 etapas, export 7)
  const { error: movError } = await supabase.from("movimientos").insert({
    carga_id: cargaId,
    bid_id: bidId,
    cabezal_id: bid.cabezal_id,
    tipo_flujo: carga.tipo_operacion,
    etapa_actual: 0,
    historial: [
      { etapa: 0, timestamp: new Date().toISOString(), method: "auto" },
    ],
  });

  if (movError) return { error: `Oferta aceptada pero falló el movimiento: ${movError.message}` };

  // WhatsApp notification to winning transportista
  const { data: transportistaEmpresa } = await supabase
    .from("empresas")
    .select("nombre, telefono_whatsapp")
    .eq("id", bid.empresa_id)
    .single();

  const { data: cargaInfo } = await supabase
    .from("cargas")
    .select("numero, destino_direccion, puerto:puertos(nombre)")
    .eq("id", cargaId)
    .single();

  if (transportistaEmpresa?.telefono_whatsapp) {
    const { sendWhatsApp } = await import("@/lib/notifications/whatsapp");
    const numero = cargaInfo?.numero ?? cargaId.slice(0, 8);
    const ruta = `${(cargaInfo?.puerto as { nombre?: string } | null)?.nombre ?? "Puerto"} → ${cargaInfo?.destino_direccion ?? "destino"}`;
    await sendWhatsApp(
      transportistaEmpresa.telefono_whatsapp,
      `🎉 *ContainerGT* — ¡Tu oferta fue aceptada!\n\nCarga: *#${numero}*\nRuta: ${ruta}\n\nInicia sesión para ver los detalles y coordinar la recogida.`
    );
  }

  revalidatePath("/importador");
  return { success: true };
}

export async function updateCarga(cargaId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) return { error: "No se encontró empresa" };

  const { data: carga } = await supabase
    .from("cargas")
    .select("id, estado")
    .eq("id", cargaId)
    .eq("cliente_empresa_id", profile.empresa_id)
    .single();

  if (!carga) return { error: "Carga no encontrada o sin permiso" };
  if (!["publicada", "en_subasta"].includes(carga.estado)) {
    return { error: "Solo puedes editar cargas sin transportista asignado" };
  }

  const peso_raw = formData.get("peso_tm") as string;
  const peso_tm = peso_raw ? parseFloat(peso_raw) : null;
  const tarifa_raw = formData.get("tarifa_referencia") as string;
  const tarifa_referencia = tarifa_raw ? parseFloat(tarifa_raw) : null;
  const destino_direccion = (formData.get("destino_direccion") as string)?.trim();
  const fecha_disponible = formData.get("fecha_disponible") as string;
  const naviera = (formData.get("naviera") as string) || null;
  const modo_asignacion = formData.get("modo_asignacion") as Enums<"asignacion_modo">;
  const notas = ((formData.get("notas") as string) || "").trim() || null;

  if (!destino_direccion || !fecha_disponible) {
    return { error: "Destino y fecha son obligatorios" };
  }

  const { error } = await supabase
    .from("cargas")
    .update({
      peso_tm,
      tarifa_referencia,
      destino_direccion,
      fecha_disponible,
      naviera,
      modo_asignacion,
      notas,
    })
    .eq("id", cargaId);

  if (error) return { error: error.message };

  revalidatePath("/importador");
  revalidatePath(`/importador/carga/${cargaId}`);
  return { success: true };
}

export async function cancelCarga(cargaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) return { error: "No se encontró empresa" };

  // Only cancel own cargas that are not yet assigned
  const { data: carga, error: fetchError } = await supabase
    .from("cargas")
    .select("id, estado")
    .eq("id", cargaId)
    .eq("cliente_empresa_id", profile.empresa_id)
    .single();

  if (fetchError || !carga) return { error: "Carga no encontrada o sin permiso" };
  if (!["publicada", "en_subasta"].includes(carga.estado)) {
    return { error: "Solo puedes cancelar cargas sin transportista asignado" };
  }

  const [updateCarga, rejectBids] = await Promise.all([
    supabase.from("cargas").update({ estado: "cancelada" }).eq("id", cargaId),
    supabase
      .from("bids")
      .update({ estado: "rechazada" })
      .eq("carga_id", cargaId)
      .eq("estado", "pendiente"),
  ]);

  if (updateCarga.error) return { error: updateCarga.error.message };
  if (rejectBids.error) return { error: rejectBids.error.message };

  revalidatePath("/importador");
  return { success: true };
}

export async function rejectBid(bidId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("bids")
    .update({ estado: "rechazada" })
    .eq("id", bidId);

  if (error) return { error: error.message };

  revalidatePath("/importador");
  return { success: true };
}

export async function procesarDocumento(documentoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) return { error: "No se encontró empresa" };

  const { data: doc } = await supabase
    .from("documentos_carga")
    .select("id, storage_path, mime_type")
    .eq("id", documentoId)
    .eq("empresa_id", profile.empresa_id)
    .single();

  if (!doc) return { error: "Documento no encontrado o sin permiso" };

  const inicioDelDia = new Date();
  inicioDelDia.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("documentos_carga")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", profile.empresa_id)
    .gte("created_at", inicioDelDia.toISOString());

  if ((count ?? 0) > LIMITE_DOCUMENTOS_POR_DIA) {
    return {
      error:
        "Alcanzaste el límite diario de documentos procesados con IA. Llena el formulario manualmente o intenta mañana.",
    };
  }

  await supabase
    .from("documentos_carga")
    .update({ estado_extraccion: "procesando" })
    .eq("id", documentoId);

  const { data: archivo, error: downloadError } = await supabase.storage
    .from("documentos")
    .download(doc.storage_path);

  if (downloadError || !archivo) {
    await supabase
      .from("documentos_carga")
      .update({ estado_extraccion: "error" })
      .eq("id", documentoId);
    return { error: "No se pudo descargar el documento" };
  }

  try {
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const bruta = await extraerDocumento(bytes, doc.mime_type);
    const extraccion = validarExtraccion(bruta);

    const { error: updateError } = await supabase
      .from("documentos_carga")
      .update({ extraccion, estado_extraccion: "completada" })
      .eq("id", documentoId);

    if (updateError) return { error: updateError.message };

    return { success: true, extraccion };
  } catch (err) {
    await supabase
      .from("documentos_carga")
      .update({ estado_extraccion: "error" })
      .eq("id", documentoId);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Error al procesar el documento con IA",
    };
  }
}
