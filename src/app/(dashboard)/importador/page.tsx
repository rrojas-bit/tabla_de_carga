import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ImportadorView from "@/components/importador/ImportadorView";

export default async function ImportadorPage() {
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

  if (!profile) redirect("/login");

  if (profile.rol === "transportista") redirect("/transportista");

  if (!profile.empresa_id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-center">
          <i className="ti ti-building-store text-4xl text-gray-200 block mb-3" />
          <p className="text-sm text-gray-400">Perfil de empresa no configurado.</p>
          <p className="text-xs text-gray-200 mt-1">Contacta a soporte.</p>
        </div>
      </div>
    );
  }

  const [puertosRes, misCargasRes] = await Promise.all([
    supabase
      .from("puertos")
      .select("id, nombre, codigo")
      .eq("activo", true)
      .order("nombre"),

    supabase
      .from("cargas")
      .select(`
        id, numero, tipo_operacion, tipo_contenedor, peso_tm, sobrepeso,
        estado, fecha_disponible, destino_direccion,
        puerto:puertos(id, nombre),
        bids!bids_carga_id_fkey(count)
      `)
      .eq("cliente_empresa_id", profile.empresa_id)
      .in("estado", ["publicada", "en_subasta", "asignada", "en_transito"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <ImportadorView
      puertos={puertosRes.data ?? []}
      misCargas={(misCargasRes.data ?? []) as unknown as CargaResumen[]}
      empresaId={profile.empresa_id}
    />
  );
}

export type CargaResumen = {
  id: string;
  numero: string | null;
  tipo_operacion: "importacion" | "exportacion";
  tipo_contenedor: string;
  peso_tm: number | null;
  sobrepeso: boolean | null;
  estado: string;
  fecha_disponible: string;
  destino_direccion: string;
  puerto: { id: string; nombre: string } | null;
  bids: Array<{ count: number }>;
};
