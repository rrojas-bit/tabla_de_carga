import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerfilView from "@/components/perfil/PerfilView";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nombre_completo, rol, telefono, fecha_nacimiento")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return <PerfilView profile={profile} email={user.email ?? ""} />;
}
