import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminView from "@/components/admin/AdminView";

export type EmpresaPendiente = {
  id: string;
  nombre: string;
  rtu: string | null;
  tipo: string;
  created_at: string;
  telefono_whatsapp: string | null;
  perfil: {
    seguro_terceros_vigente: boolean | null;
    inspeccion_cabezal: boolean | null;
    auto_asignacion_activa: boolean | null;
  } | null;
  total_flota: number;
  total_pilotos: number;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin" && profile?.rol !== "staff") {
    redirect("/");
  }

  const [pendientesRes, activasRes] = await Promise.all([
    supabase
      .from("empresas")
      .select(
        "id, nombre, rtu, tipo, created_at, telefono_whatsapp"
      )
      .eq("estado", "pendiente_calificacion")
      .order("created_at", { ascending: true }),

    supabase
      .from("empresas")
      .select("id, nombre, tipo, estado, score_plataforma, total_evaluaciones, created_at")
      .eq("estado", "activo")
      .order("nombre"),
  ]);

  // Enrich pending empresas with perfil + flota count
  const pendientes: EmpresaPendiente[] = [];
  for (const e of pendientesRes.data ?? []) {
    const [perfilRes, flotaRes, pilotosRes] = await Promise.all([
      supabase
        .from("transportista_perfil")
        .select("seguro_terceros_vigente, inspeccion_cabezal, auto_asignacion_activa")
        .eq("empresa_id", e.id)
        .maybeSingle(),
      supabase
        .from("flota")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", e.id)
        .eq("activo", true),
      supabase
        .from("piloto_empresa")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", e.id)
        .eq("activo", true),
    ]);

    pendientes.push({
      ...e,
      perfil: perfilRes.data ?? null,
      total_flota: flotaRes.count ?? 0,
      total_pilotos: pilotosRes.count ?? 0,
    });
  }

  return (
    <AdminView
      pendientes={pendientes}
      activas={activasRes.data ?? []}
    />
  );
}
