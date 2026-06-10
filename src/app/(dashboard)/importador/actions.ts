"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

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

  if (!tipo_operacion || !puerto_id || !tipo_contenedor || !destino_direccion || !fecha_disponible) {
    return { error: "Completa todos los campos obligatorios" };
  }

  // Umbral legal de sobrepeso: 21 TM de carga neta (Acuerdo Gubernativo 379-2010)
  const sobrepeso = peso_tm != null && peso_tm > 21;

  const { error } = await supabase.from("cargas").insert({
    cliente_empresa_id: profile.empresa_id,
    tipo_operacion,
    puerto_id,
    tipo_contenedor,
    peso_tm,
    sobrepeso,
    naviera,
    destino_direccion,
    fecha_disponible,
    tarifa_referencia,
    modo_asignacion,
    seguro_carga,
    gps_requerido,
    estado: "publicada",
  });

  if (error) return { error: error.message };

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
    .select("id, cliente_empresa_id")
    .eq("id", cargaId)
    .eq("cliente_empresa_id", profile.empresa_id)
    .single();

  if (!carga) return { error: "Carga no encontrada o sin permiso" };

  // Get bid empresa
  const { data: bid } = await supabase
    .from("bids")
    .select("empresa_id")
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
