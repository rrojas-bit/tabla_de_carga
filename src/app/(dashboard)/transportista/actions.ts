"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export async function submitBid(formData: FormData) {
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

  const carga_id = formData.get("carga_id") as string;
  const monto = parseFloat(formData.get("monto") as string);
  const cabezal_id = (formData.get("cabezal_id") as string) || null;
  const tiempo_respuesta = formData.get(
    "tiempo_respuesta"
  ) as Enums<"tiempo_respuesta">;
  const nota = (formData.get("nota") as string) || null;

  if (!carga_id || isNaN(monto) || monto <= 0) {
    return { error: "Datos inválidos" };
  }

  // Check if already bid on this carga
  const { data: existing } = await supabase
    .from("bids")
    .select("id")
    .eq("carga_id", carga_id)
    .eq("empresa_id", profile.empresa_id)
    .in("estado", ["pendiente", "aceptada"])
    .maybeSingle();

  if (existing) {
    return { error: "Ya tienes una oferta activa en esta carga" };
  }

  const { error } = await supabase.from("bids").insert({
    carga_id,
    empresa_id: profile.empresa_id,
    monto,
    cabezal_id: cabezal_id || null,
    tiempo_respuesta,
    nota,
  });

  if (error) return { error: error.message };

  revalidatePath("/transportista");
  return { success: true };
}

export async function withdrawBid(bidId: string) {
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

  const { error } = await supabase
    .from("bids")
    .update({ estado: "retirada" })
    .eq("id", bidId)
    .eq("empresa_id", profile.empresa_id)
    .eq("estado", "pendiente");

  if (error) return { error: error.message };

  revalidatePath("/transportista");
  return { success: true };
}

export async function addFlotaUnit(formData: FormData) {
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

  const placa = ((formData.get("placa") as string) || "").trim().toUpperCase();
  const tipo = formData.get("tipo") as Enums<"flota_tipo">;
  const tipo_chassis =
    (formData.get("tipo_chassis") as Enums<"chassis_tipo">) || null;
  const marca = ((formData.get("marca") as string) || "").trim() || null;
  const modelo = ((formData.get("modelo") as string) || "").trim() || null;
  const anno_raw = formData.get("anno") as string;
  const anno = anno_raw ? parseInt(anno_raw, 10) : null;

  if (!placa || !tipo) return { error: "Placa y tipo son obligatorios" };
  if (tipo === "chassis" && !tipo_chassis)
    return { error: "Selecciona el tipo de chassis" };

  const { error } = await supabase.from("flota").insert({
    empresa_id: profile.empresa_id,
    placa,
    tipo,
    tipo_chassis: tipo === "chassis" ? tipo_chassis : null,
    marca,
    modelo,
    anno,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Ya existe una unidad con esa placa" };
    return { error: error.message };
  }

  revalidatePath("/transportista");
  return { success: true };
}

export async function updateFlotaEstado(
  flotaId: string,
  estado: Enums<"flota_estado">
) {
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

  const { error } = await supabase
    .from("flota")
    .update({ estado })
    .eq("id", flotaId)
    .eq("empresa_id", profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/transportista");
  return { success: true };
}

export async function removeFlotaUnit(flotaId: string) {
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

  const { error } = await supabase
    .from("flota")
    .update({ activo: false })
    .eq("id", flotaId)
    .eq("empresa_id", profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/transportista");
  return { success: true };
}

export async function addTarifaRuta(formData: FormData) {
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

  const origen = ((formData.get("origen") as string) || "").trim();
  const destino = ((formData.get("destino") as string) || "").trim();
  const tarifa_minima = parseFloat(formData.get("tarifa_minima") as string);

  if (!origen || !destino || isNaN(tarifa_minima) || tarifa_minima <= 0) {
    return { error: "Completa origen, destino y tarifa válida" };
  }

  const { error } = await supabase.from("tarifas_ruta").insert({
    empresa_id: profile.empresa_id,
    origen,
    destino,
    tarifa_minima,
  });

  if (error) return { error: error.message };

  revalidatePath("/transportista");
  return { success: true };
}

export async function deleteTarifaRuta(tarifaId: string) {
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

  const { error } = await supabase
    .from("tarifas_ruta")
    .delete()
    .eq("id", tarifaId)
    .eq("empresa_id", profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/transportista");
  return { success: true };
}

export async function toggleAutoAsignacion(activa: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) return { error: "Empresa no configurada" };

  const { error } = await supabase
    .from("transportista_perfil")
    .update({ auto_asignacion_activa: activa })
    .eq("empresa_id", profile.empresa_id);

  if (error) return { error: "No se pudo actualizar la configuración" };

  revalidatePath("/transportista");
  return { success: true };
}
