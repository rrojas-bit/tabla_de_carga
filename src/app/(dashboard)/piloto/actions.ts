"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function avanzarEtapa(movimientoId: string, etapaActual: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: mov } = await supabase
    .from("movimientos")
    .select("id, etapa_actual, historial, tipo_flujo")
    .eq("id", movimientoId)
    .single();

  if (!mov) return { error: "Movimiento no encontrado" };

  const maxEtapa = 5; // 6 stages, index 0-5
  if (etapaActual >= maxEtapa) return { error: "Viaje ya completado" };

  const nuevaEtapa = etapaActual + 1;
  const historial = Array.isArray(mov.historial) ? mov.historial : [];
  const timestamp = new Date().toISOString();

  historial.push({
    etapa: nuevaEtapa,
    timestamp,
    method: "manual",
  });

  const { error } = await supabase
    .from("movimientos")
    .update({
      etapa_actual: nuevaEtapa,
      historial,
      updated_at: timestamp,
    })
    .eq("id", movimientoId);

  if (error) return { error: error.message };

  // If last stage (5), update carga to entregada
  if (nuevaEtapa === maxEtapa) {
    const { data: movData } = await supabase
      .from("movimientos")
      .select("carga_id")
      .eq("id", movimientoId)
      .single();

    if (movData?.carga_id) {
      await supabase
        .from("cargas")
        .update({ estado: "entregada" })
        .eq("id", movData.carga_id);
    }
  }

  revalidatePath("/piloto");
  return { success: true, nuevaEtapa };
}
