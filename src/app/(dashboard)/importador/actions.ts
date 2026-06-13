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
      sobrepeso: peso_tm != null && peso_tm > 21,
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

export async function analizarOfertas(cargaId: string): Promise<{
  result?: import("@/lib/ai/rankBids").RankingResult;
  error?: string;
}> {
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

  // Solo el dueño de la carga puede analizar sus ofertas
  const { data: carga } = await supabase
    .from("cargas")
    .select(
      "id, tipo_contenedor, tarifa_referencia, destino_direccion, puerto:puertos(nombre)"
    )
    .eq("id", cargaId)
    .eq("cliente_empresa_id", profile.empresa_id)
    .single();

  if (!carga) return { error: "Carga no encontrada o sin permiso" };

  const { data: bids } = await supabase
    .from("bids")
    .select(
      `id, monto, tiempo_respuesta, nota,
       empresa:empresas(id, nombre, score_plataforma, total_evaluaciones)`
    )
    .eq("carga_id", cargaId)
    .eq("estado", "pendiente");

  if (!bids || bids.length === 0) {
    return { error: "Sin ofertas pendientes para analizar" };
  }

  type EmpresaRef = {
    id: string;
    nombre: string;
    score_plataforma: number | null;
    total_evaluaciones: number | null;
  };
  const empresaIds = bids
    .map((b) => (b.empresa as unknown as EmpresaRef | null)?.id)
    .filter((id): id is string => Boolean(id));

  // Datos de reputación por empresa: entregas, flags de pilotos, flota libre
  const [entregadasRes, flotaRes, pilotosRes] = await Promise.all([
    supabase
      .from("cargas")
      .select("transportista_asignado_id")
      .in("transportista_asignado_id", empresaIds)
      .eq("estado", "entregada"),
    supabase
      .from("flota")
      .select("empresa_id")
      .in("empresa_id", empresaIds)
      .eq("estado", "libre")
      .eq("tipo", "cabezal"),
    supabase
      .from("piloto_empresa")
      .select("empresa_id, piloto_id")
      .in("empresa_id", empresaIds)
      .eq("activo", true),
  ]);

  const entregadasMap: Record<string, number> = {};
  entregadasRes.data?.forEach((c) => {
    if (c.transportista_asignado_id)
      entregadasMap[c.transportista_asignado_id] =
        (entregadasMap[c.transportista_asignado_id] ?? 0) + 1;
  });

  const flotaMap: Record<string, number> = {};
  flotaRes.data?.forEach((f) => {
    flotaMap[f.empresa_id] = (flotaMap[f.empresa_id] ?? 0) + 1;
  });

  // Flags sin verificar de los pilotos activos de cada empresa
  const pilotoToEmpresa: Record<string, string> = {};
  const pilotoIds: string[] = [];
  pilotosRes.data?.forEach((pe) => {
    pilotoToEmpresa[pe.piloto_id] = pe.empresa_id;
    pilotoIds.push(pe.piloto_id);
  });

  const flagsMap: Record<string, number> = {};
  if (pilotoIds.length > 0) {
    const { data: flags } = await supabase
      .from("flags_piloto")
      .select("piloto_id")
      .in("piloto_id", pilotoIds)
      .eq("verificado", false)
      .is("archivado_en", null);
    flags?.forEach((f) => {
      const empId = pilotoToEmpresa[f.piloto_id];
      if (empId) flagsMap[empId] = (flagsMap[empId] ?? 0) + 1;
    });
  }

  const bidsParaAnalisis = bids.map((b) => {
    const emp = b.empresa as unknown as EmpresaRef | null;
    return {
      bid_id: b.id,
      monto: b.monto,
      tiempo_respuesta: b.tiempo_respuesta,
      nota: b.nota,
      empresa_nombre: emp?.nombre ?? "Transportista",
      score_plataforma: emp?.score_plataforma ?? null,
      total_evaluaciones: emp?.total_evaluaciones ?? null,
      cargas_completadas: emp ? (entregadasMap[emp.id] ?? 0) : 0,
      flags_pilotos: emp ? (flagsMap[emp.id] ?? 0) : 0,
      flota_libre: emp ? (flotaMap[emp.id] ?? 0) : 0,
    };
  });

  const ruta = `${(carga.puerto as { nombre?: string } | null)?.nombre ?? "Puerto"} → ${carga.destino_direccion}`;

  try {
    const { rankearOfertas } = await import("@/lib/ai/rankBids");
    const result = await rankearOfertas(bidsParaAnalisis, {
      ruta,
      tipo_contenedor: carga.tipo_contenedor,
      tarifa_referencia: carga.tarifa_referencia,
    });
    return { result };
  } catch (err) {
    return { error: String(err) };
  }
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
