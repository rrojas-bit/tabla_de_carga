"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMaxEtapa } from "@/lib/etapas";

export async function avanzarEtapa(movimientoId: string, etapaActual: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: mov } = await supabase
    .from("movimientos")
    .select("id, etapa_actual, historial, tipo_flujo, carga_id, piloto_id")
    .eq("id", movimientoId)
    .single();

  if (!mov) return { error: "Movimiento no encontrado" };
  if (!mov.piloto_id) {
    return { error: "Asigna un piloto a este viaje antes de avanzar (Transportista → Mis viajes)." };
  }

  const maxEtapa = getMaxEtapa(mov.tipo_flujo);
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

  // El estado de la carga (en_transito / entregada) lo actualiza el
  // trigger trg_sync_estado_carga en la base de datos.

  revalidatePath("/piloto");
  return { success: true, nuevaEtapa };
}
