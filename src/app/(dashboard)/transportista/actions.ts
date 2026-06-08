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

export async function toggleAutoAsignacion(activa: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) return;

  await supabase
    .from("transportista_perfil")
    .update({ auto_asignacion_activa: activa })
    .eq("empresa_id", profile.empresa_id);

  revalidatePath("/transportista");
}
