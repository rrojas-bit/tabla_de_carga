import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BillingView from "@/components/billing/BillingView";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, empresa_id, nombre_completo")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  let empresa = null;
  if (profile.empresa_id) {
    const { data } = await supabase
      .from("empresas")
      .select("id, nombre, estado, tipo")
      .eq("id", profile.empresa_id)
      .single();
    empresa = data;
  }

  return (
    <BillingView
      rol={profile.rol}
      empresa={empresa}
      nombreUsuario={profile.nombre_completo}
    />
  );
}
