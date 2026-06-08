import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PilotoView from "@/components/piloto/PilotoView";

export default async function PilotoPage() {
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

  const baseSelect = `
    id, etapa_actual, historial, tipo_flujo, updated_at,
    carga:cargas(
      id, numero, tipo_contenedor, destino_direccion, numero_contenedor,
      puerto:puertos(id, nombre),
      cliente:empresas!cargas_cliente_empresa_id_fkey(nombre)
    ),
    piloto:pilotos(
      id, nombre_completo, dpi, licencia_tipo, licencia_vencimiento,
      total_viajes, score_plataforma
    ),
    cabezal:flota(placa)
  `;

  // For transportistas, try to filter by their empresa's active carga
  if (profile?.empresa_id && profile.rol === "transportista") {
    const { data: movs } = await supabase
      .from("movimientos")
      .select(baseSelect)
      .order("updated_at", { ascending: false })
      .limit(5);

    // Filter client-side to match transportista
    const filtered = (movs ?? []).filter(
      (m) => (m as unknown as MovimientoFull).carga !== null
    );

    if (filtered.length > 0) {
      return (
        <PilotoView movimiento={filtered[0] as unknown as MovimientoFull} flags={[]} />
      );
    }
  }

  // Fallback: most recent movimiento
  const { data: movs } = await supabase
    .from("movimientos")
    .select(baseSelect)
    .order("updated_at", { ascending: false })
    .limit(1);

  const mov = movs?.[0] as unknown as MovimientoFull | undefined;

  let flags: FlagRow[] = [];
  const pilotoId = mov?.piloto?.id;
  if (pilotoId) {
    const { data: flagsData } = await supabase
      .from("flags_piloto")
      .select("id, tipo, descripcion, verificado, en_disputa, created_at")
      .eq("piloto_id", pilotoId)
      .order("created_at", { ascending: false });

    flags = flagsData ?? [];
  }

  return <PilotoView movimiento={mov ?? null} flags={flags} />;
}

export type MovimientoFull = {
  id: string;
  etapa_actual: number;
  historial: Array<{ etapa: number; timestamp: string; method: string }>;
  tipo_flujo: "importacion" | "exportacion";
  updated_at: string;
  carga: {
    id: string;
    numero: string | null;
    tipo_contenedor: string;
    destino_direccion: string;
    numero_contenedor: string | null;
    puerto: { id: string; nombre: string } | null;
    cliente: { nombre: string } | null;
  } | null;
  piloto: {
    id: string;
    nombre_completo: string;
    dpi: string;
    licencia_tipo: string | null;
    licencia_vencimiento: string | null;
    total_viajes: number | null;
    score_plataforma: number | null;
  } | null;
  cabezal: { placa: string } | null;
};

export type FlagRow = {
  id: string;
  tipo: string;
  descripcion: string | null;
  verificado: boolean | null;
  en_disputa: boolean | null;
  created_at: string;
};
