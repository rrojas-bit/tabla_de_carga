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

  const { error } = await supabase.from("cargas").insert({
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
