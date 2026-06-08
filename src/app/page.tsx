import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol === "transportista") {
    redirect("/transportista");
  } else if (
    profile?.rol === "importador" ||
    profile?.rol === "admin" ||
    profile?.rol === "staff"
  ) {
    redirect("/importador");
  }

  redirect("/transportista");
}
