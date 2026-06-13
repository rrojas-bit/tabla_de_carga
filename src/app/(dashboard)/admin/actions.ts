"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analizarTransportista, type AnalisisResult } from "@/lib/ai/analyze";

export async function aprobarEmpresa(empresaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin" && profile?.rol !== "staff") {
    return { error: "Sin permisos" };
  }

  const { error } = await supabase
    .from("empresas")
    .update({ estado: "activo" })
    .eq("id", empresaId);

  if (error) return { error: error.message };

  // Notify via WhatsApp if phone available
  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre, telefono_whatsapp")
    .eq("id", empresaId)
    .single();

  if (empresa?.telefono_whatsapp) {
    const { sendWhatsApp } = await import("@/lib/notifications/whatsapp");
    await sendWhatsApp(
      empresa.telefono_whatsapp,
      `✅ *ContainerGT* — Tu empresa *${empresa.nombre}* fue aprobada. Ya puedes ver cargas disponibles y hacer ofertas. Ingresa en containergt.com`
    );
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function rechazarEmpresa(empresaId: string, motivo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin" && profile?.rol !== "staff") {
    return { error: "Sin permisos" };
  }

  const { error } = await supabase
    .from("empresas")
    .update({ estado: "rechazado" })
    .eq("id", empresaId);

  if (error) return { error: error.message };

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre, telefono_whatsapp")
    .eq("id", empresaId)
    .single();

  if (empresa?.telefono_whatsapp) {
    const { sendWhatsApp } = await import("@/lib/notifications/whatsapp");
    await sendWhatsApp(
      empresa.telefono_whatsapp,
      `ℹ️ *ContainerGT* — Tu solicitud para *${empresa.nombre}* no fue aprobada. Motivo: ${motivo}. Escríbenos para más información.`
    );
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function detectarAnomalias(): Promise<{
  result?: import("@/lib/ai/fraude").DeteccionResult;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin" && profile?.rol !== "staff") {
    return { error: "Sin permisos" };
  }

  const haceTreintaDias = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // 1) Movimientos recientes con historial de etapas para detectar avances imposibles
  const { data: movimientos } = await supabase
    .from("movimientos")
    .select(
      `id, etapa_actual, historial, piloto_id,
       carga:cargas(numero, destino_direccion, transportista_asignado_id,
         puerto:puertos(nombre))`
    )
    .gte("updated_at", haceTreintaDias)
    .gte("etapa_actual", 2);

  type CargaRef = {
    numero: string | null;
    destino_direccion: string;
    transportista_asignado_id: string | null;
    puerto: { nombre: string } | null;
  };
  type HistEntry = { etapa: number; timestamp: string };

  // Nombres de transportistas en consulta aparte (cargas tiene dos FKs a empresas)
  const transportistaIds = [
    ...new Set(
      (movimientos ?? [])
        .map((m) => (m.carga as unknown as CargaRef | null)?.transportista_asignado_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const nombresEmpresa: Record<string, string> = {};
  if (transportistaIds.length > 0) {
    const { data: empresas } = await supabase
      .from("empresas")
      .select("id, nombre")
      .in("id", transportistaIds);
    empresas?.forEach((e) => {
      nombresEmpresa[e.id] = e.nombre;
    });
  }

  const movSenales = (movimientos ?? [])
    .map((m) => {
      const hist = (m.historial as HistEntry[] | null) ?? [];
      const ordenado = [...hist].sort((a, b) => a.etapa - b.etapa);
      const intervalos: number[] = [];
      for (let i = 1; i < ordenado.length; i++) {
        const ms =
          new Date(ordenado[i].timestamp).getTime() -
          new Date(ordenado[i - 1].timestamp).getTime();
        intervalos.push(ms / 60000);
      }
      const carga = m.carga as unknown as CargaRef | null;
      return {
        carga_numero: carga?.numero ?? "—",
        ruta: `${carga?.puerto?.nombre ?? "Puerto"} → ${carga?.destino_direccion ?? "destino"}`,
        empresa_nombre: carga?.transportista_asignado_id
          ? (nombresEmpresa[carga.transportista_asignado_id] ?? "Transportista")
          : "Transportista",
        etapas_total: hist.length,
        intervalos_min: intervalos,
      };
    })
    .filter((m) => m.intervalos_min.length > 0);

  // 2) Bids pendientes vs promedio histórico aceptado de la misma ruta (puerto+contenedor)
  const { data: bidsPendientes } = await supabase
    .from("bids")
    .select(
      `id, monto,
       empresa:empresas(nombre),
       carga:cargas!bids_carga_id_fkey(numero, puerto_id, tipo_contenedor, destino_direccion, puerto:puertos(nombre))`
    )
    .eq("estado", "pendiente")
    .gte("created_at", haceTreintaDias);

  const { data: bidsAceptados } = await supabase
    .from("bids")
    .select("monto, carga:cargas!bids_carga_id_fkey(puerto_id, tipo_contenedor)")
    .eq("estado", "aceptada");

  type CargaKeyRef = { puerto_id: string | null; tipo_contenedor: string };
  const promedios: Record<string, { suma: number; n: number }> = {};
  bidsAceptados?.forEach((b) => {
    const c = b.carga as unknown as CargaKeyRef | null;
    if (!c?.puerto_id) return;
    const key = `${c.puerto_id}:${c.tipo_contenedor}`;
    promedios[key] = {
      suma: (promedios[key]?.suma ?? 0) + b.monto,
      n: (promedios[key]?.n ?? 0) + 1,
    };
  });

  type BidCargaRef = CargaKeyRef & {
    numero: string | null;
    destino_direccion: string;
    puerto: { nombre: string } | null;
  };
  const bidSenales = (bidsPendientes ?? [])
    .map((b) => {
      const c = b.carga as unknown as BidCargaRef | null;
      if (!c?.puerto_id) return null;
      const ref = promedios[`${c.puerto_id}:${c.tipo_contenedor}`];
      if (!ref) return null;
      return {
        carga_numero: c.numero ?? "—",
        ruta: `${c.puerto?.nombre ?? "Puerto"} → ${c.destino_direccion}`,
        empresa_nombre:
          (b.empresa as unknown as { nombre: string } | null)?.nombre ??
          "Transportista",
        monto: b.monto,
        promedio_ruta: ref.suma / ref.n,
        num_referencias: ref.n,
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // 3) Pilotos con flags sin verificar que tienen viajes activos
  const { data: flagsAbiertos } = await supabase
    .from("flags_piloto")
    .select("piloto_id, tipo, piloto:pilotos(nombre_completo)")
    .eq("verificado", false)
    .is("archivado_en", null);

  const flagsPorPiloto: Record<
    string,
    { nombre: string; tipos: string[] }
  > = {};
  flagsAbiertos?.forEach((f) => {
    const nombre =
      (f.piloto as unknown as { nombre_completo: string } | null)
        ?.nombre_completo ?? "Piloto";
    if (!flagsPorPiloto[f.piloto_id]) {
      flagsPorPiloto[f.piloto_id] = { nombre, tipos: [] };
    }
    flagsPorPiloto[f.piloto_id].tipos.push(f.tipo);
  });

  const pilotosConFlags = Object.keys(flagsPorPiloto);
  const viajesActivos: Record<string, number> = {};
  if (pilotosConFlags.length > 0) {
    const { data: activos } = await supabase
      .from("movimientos")
      .select("piloto_id, carga:cargas(estado)")
      .in("piloto_id", pilotosConFlags);
    activos?.forEach((m) => {
      const estado = (m.carga as unknown as { estado: string } | null)?.estado;
      if (m.piloto_id && (estado === "asignada" || estado === "en_transito")) {
        viajesActivos[m.piloto_id] = (viajesActivos[m.piloto_id] ?? 0) + 1;
      }
    });
  }

  const flagSenales = Object.entries(flagsPorPiloto).map(
    ([pilotoId, info]) => ({
      piloto_nombre: info.nombre,
      empresa_nombre: null,
      total_flags: info.tipos.length,
      tipos: [...new Set(info.tipos)],
      viajes_activos: viajesActivos[pilotoId] ?? 0,
    })
  );

  try {
    const { analizarAnomalias } = await import("@/lib/ai/fraude");
    const result = await analizarAnomalias({
      movimientos: movSenales,
      bids: bidSenales,
      flags: flagSenales,
    });
    return { result };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function analizarConIA(
  empresaId: string
): Promise<{ result?: AnalisisResult; error?: string }> {
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nombre, rtu, tipo")
    .eq("id", empresaId)
    .single();

  if (!empresa) return { error: "Empresa no encontrada" };

  const { data: perfil } = await supabase
    .from("transportista_perfil")
    .select(
      "seguro_terceros_vigente, inspeccion_cabezal, documentos"
    )
    .eq("empresa_id", empresaId)
    .single();

  const { count: totalUnidades } = await supabase
    .from("flota")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  try {
    const result = await analizarTransportista({
      nombre: empresa.nombre,
      rtu: empresa.rtu,
      tipo: empresa.tipo,
      seguro_terceros_vigente: perfil?.seguro_terceros_vigente ?? null,
      inspeccion_cabezal: perfil?.inspeccion_cabezal ?? null,
      documentos: (perfil?.documentos as Record<string, unknown>) ?? null,
      total_unidades: totalUnidades ?? 0,
    });

    return { result };
  } catch (err) {
    return { error: String(err) };
  }
}
