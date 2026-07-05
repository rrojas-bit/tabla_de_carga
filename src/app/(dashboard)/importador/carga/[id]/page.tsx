import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CargaDetalle from "@/components/importador/CargaDetalle";

export default async function CargaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id, rol")
    .eq("id", user.id)
    .single();

  if (!profile?.empresa_id) redirect("/importador");

  const { data: carga } = await supabase
    .from("cargas")
    .select(`
      id, numero, tipo_operacion, tipo_contenedor, peso_tm, sobrepeso,
      tarifa_referencia, destino_direccion, fecha_disponible, naviera,
      estado, modo_asignacion, notas, seguro_carga, gps_requerido,
      created_at, mercancia, duca_numero, duca_tipo, valor_mercancia_usd,
      pais_origen,
      puerto:puertos(id, nombre),
      transportista:empresas!cargas_transportista_asignado_id_fkey(nombre, telefono_whatsapp, score_plataforma)
    `)
    .eq("id", params.id)
    .eq("cliente_empresa_id", profile.empresa_id)
    .single();

  if (!carga) notFound();

  // Movimiento del viaje (si ya está asignada)
  const { data: movimiento } = await supabase
    .from("movimientos")
    .select("id, etapa_actual, tipo_flujo, historial, updated_at")
    .eq("carga_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <CargaDetalle
      carga={carga as unknown as CargaDetalleRow}
      movimiento={movimiento as MovimientoResumen | null}
    />
  );
}

export type CargaDetalleRow = {
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
  modo_asignacion: "manual" | "automatico";
  notas: string | null;
  seguro_carga: boolean | null;
  gps_requerido: boolean | null;
  created_at: string;
  mercancia: string | null;
  duca_numero: string | null;
  duca_tipo: string | null;
  valor_mercancia_usd: number | null;
  pais_origen: string | null;
  puerto: { id: string; nombre: string } | null;
  transportista: {
    nombre: string;
    telefono_whatsapp: string | null;
    score_plataforma: number | null;
  } | null;
};

export type MovimientoResumen = {
  id: string;
  etapa_actual: number;
  tipo_flujo: "importacion" | "exportacion";
  historial: Array<{ etapa: number; timestamp: string; method: string }>;
  updated_at: string;
};
