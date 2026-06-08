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

  // Parallel data fetching
  const [
    empresaRes,
    flotaRes,
    tarifasRes,
    perfilRes,
    cargasRes,
    statsRes,
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
        id, numero, tipo_operacion, tipo_contenedor, peso_tm, sobrepeso,
        tarifa_referencia, destino_direccion, fecha_disponible, naviera, estado,
        puerto:puertos(id, nombre, codigo),
        bids(count)
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
      .gte(
        "updated_at",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ),
  ]);

  return (
    <TransportistaView
      empresa={empresaRes.data}
      empresaEstado={empresaRes.data?.estado ?? undefined}
      flota={flotaRes.data ?? []}
      tarifas={tarifasRes.data ?? []}
      autoAsignacion={perfilRes.data?.auto_asignacion_activa ?? false}
      cargas={(cargasRes.data ?? []) as unknown as CargaRow[]}
      statsCargas={statsRes.data?.length ?? 0}
    />
  );
}

// Type used only in this file for passing to client component
export type CargaRow = {
  id: string;
  numero: string | null;
  tipo_operacion: "importacion" | "exportacion";
  tipo_contenedor: string;
  peso_tm: number | null;
  sobrepeso: boolean | null;
  tarifa_referencia: number | null;
  destino_direccion: string;
  fecha_disponible: string;
  naviera: string | null;
  estado: string;
  puerto: { id: string; nombre: string; codigo: string } | null;
  bids: Array<{ count: number }>;
};
