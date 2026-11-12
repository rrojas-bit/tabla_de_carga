import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransportistaView from "@/components/transportista/TransportistaView";

export default async function TransportistaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nombre_completo, rol, empresa_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.rol !== "transportista") {
    redirect("/importador");
  }

  if (!profile.empresa_id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-center">
          <i className="ti ti-building-store text-4xl text-gray-200 block mb-3" />
          <p className="text-sm text-gray-400">
            Perfil de empresa no configurado.
          </p>
          <p className="text-xs text-gray-200 mt-1">
            Contacta a soporte para activar tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  const inicioMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  const inicioMesAnterior = new Date(
    inicioMes.getFullYear(),
    inicioMes.getMonth() - 1,
    1
  );

  // Parallel data fetching
  const [
    empresaRes,
    flotaRes,
    tarifasRes,
    perfilRes,
    cargasRes,
    statsRes,
    misOfertasRes,
    ingresosRes,
    viajesRes,
    pilotosRes,
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, nombre, score_plataforma, total_evaluaciones, estado")
      .eq("id", profile.empresa_id)
      .single(),

    supabase
      .from("flota")
      .select("id, placa, tipo, tipo_chassis, marca, modelo, estado")
      .eq("empresa_id", profile.empresa_id)
      .eq("activo", true)
      .order("tipo"),

    supabase
      .from("tarifas_ruta")
      .select("id, origen, destino, tarifa_minima")
      .eq("empresa_id", profile.empresa_id)
      .order("origen"),

    supabase
      .from("transportista_perfil")
      .select("auto_asignacion_activa")
      .eq("empresa_id", profile.empresa_id)
      .single(),

    supabase
      .from("cargas")
      .select(`
        id, numero, tipo_operacion, tipo_contenedor, peso_tm, sobrepeso, mercancia,
        tarifa_referencia, destino_direccion, fecha_disponible, naviera, estado,
        puerto:puertos(id, nombre, codigo),
        bids!bids_carga_id_fkey(count)
      `)
      .in("estado", ["publicada", "en_subasta"])
      .order("created_at", { ascending: false })
      .limit(30),

    // Stats: cargas assigned to this transportista this month
    supabase
      .from("cargas")
      .select("id")
      .eq("transportista_asignado_id", profile.empresa_id)
      .in("estado", ["en_transito", "entregada"])
      .gte("updated_at", inicioMes.toISOString()),

    // Mis ofertas: bids made by this empresa with carga info
    supabase
      .from("bids")
      .select(`
        id, monto, estado, created_at, nota,
        carga:cargas(
          id, numero, tipo_operacion, tipo_contenedor, destino_direccion,
          estado, fecha_disponible,
          puerto:puertos(nombre)
        )
      `)
      .eq("empresa_id", profile.empresa_id)
      .in("estado", ["pendiente", "aceptada", "rechazada"])
      .order("created_at", { ascending: false })
      .limit(20),

    // Ingresos: accepted bids this month + last month
    supabase
      .from("bids")
      .select("monto, updated_at")
      .eq("empresa_id", profile.empresa_id)
      .eq("estado", "aceptada")
      .gte("updated_at", inicioMesAnterior.toISOString()),

    // Mis viajes: cargas asignadas a esta empresa con su movimiento
    supabase
      .from("cargas")
      .select(`
        id, numero, tipo_operacion, tipo_contenedor, mercancia, destino_direccion,
        fecha_disponible, estado, updated_at,
        puerto:puertos(nombre),
        bid:bids!fk_bid_ganador(monto),
        movimientos(
          id, etapa_actual, tipo_flujo, historial, updated_at,
          cabezal:flota(placa),
          piloto:pilotos(nombre_completo)
        )
      `)
      .eq("transportista_asignado_id", profile.empresa_id)
      .in("estado", ["asignada", "en_transito", "entregada"])
      .order("fecha_disponible", { ascending: true })
      .limit(60),

    supabase
      .from("piloto_empresa")
      .select("piloto:pilotos(id, nombre_completo, telefono)")
      .eq("empresa_id", profile.empresa_id)
      .eq("activo", true),
  ]);

  const pilotos = (pilotosRes.data ?? [])
    .map((r) => (r as unknown as { piloto: PilotoItem | null }).piloto)
    .filter((p): p is PilotoItem => p !== null)
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

  const ingresosMes =
    ingresosRes.data
      ?.filter((b) => new Date(b.updated_at) >= inicioMes)
      .reduce((sum, b) => sum + b.monto, 0) ?? 0;
  const ingresosMesAnterior =
    ingresosRes.data
      ?.filter((b) => new Date(b.updated_at) < inicioMes)
      .reduce((sum, b) => sum + b.monto, 0) ?? 0;

  return (
    <TransportistaView
      empresa={empresaRes.data}
      empresaEstado={empresaRes.data?.estado ?? undefined}
      flota={flotaRes.data ?? []}
      tarifas={tarifasRes.data ?? []}
      autoAsignacion={perfilRes.data?.auto_asignacion_activa ?? false}
      cargas={(cargasRes.data ?? []) as unknown as CargaRow[]}
      statsCargas={statsRes.data?.length ?? 0}
      misOfertas={(misOfertasRes.data ?? []) as unknown as MiOferta[]}
      ingresosMes={ingresosMes}
      ingresosMesAnterior={ingresosMesAnterior}
      viajes={(viajesRes.data ?? []) as unknown as Viaje[]}
      pilotos={pilotos}
    />
  );
}

export type PilotoItem = {
  id: string;
  nombre_completo: string;
  telefono: string | null;
};

export type Viaje = {
  id: string;
  numero: string | null;
  tipo_operacion: "importacion" | "exportacion";
  tipo_contenedor: string;
  mercancia: string | null;
  destino_direccion: string;
  fecha_disponible: string;
  estado: "asignada" | "en_transito" | "entregada";
  updated_at: string;
  puerto: { nombre: string } | null;
  bid: { monto: number } | null;
  movimientos: Array<{
    id: string;
    etapa_actual: number;
    tipo_flujo: "importacion" | "exportacion";
    historial: unknown[] | null;
    updated_at: string;
    cabezal: { placa: string } | null;
    piloto: { nombre_completo: string } | null;
  }>;
};

// Type used only in this file for passing to client component
export type CargaRow = {
  id: string;
  numero: string | null;
  tipo_operacion: "importacion" | "exportacion";
  tipo_contenedor: string;
  peso_tm: number | null;
  sobrepeso: boolean | null;
  mercancia: string | null;
  tarifa_referencia: number | null;
  destino_direccion: string;
  fecha_disponible: string;
  naviera: string | null;
  estado: string;
  puerto: { id: string; nombre: string; codigo: string } | null;
  bids: Array<{ count: number }>;
};

export type MiOferta = {
  id: string;
  monto: number;
  estado: "pendiente" | "aceptada" | "rechazada" | "retirada";
  created_at: string;
  nota: string | null;
  carga: {
    id: string;
    numero: string | null;
    tipo_operacion: "importacion" | "exportacion";
    tipo_contenedor: string;
    destino_direccion: string;
    estado: string;
    fecha_disponible: string;
    puerto: { nombre: string } | null;
  } | null;
};
