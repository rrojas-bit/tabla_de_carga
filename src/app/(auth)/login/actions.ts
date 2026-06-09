"use server";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type RegisterResult =
  | { success: true }
  | { success: false; error: string };

export async function registerUser(
  email: string,
  password: string,
  nombre: string,
  empresa: string,
  rol: string,
  rtu: string | null
): Promise<RegisterResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, error: "Configuración de servidor incompleta (SERVICE_ROLE_KEY)." };
  }

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { nombre_completo: nombre, rol },
      email_confirm: true,
    });

  if (authError) {
    return { success: false, error: authError.message };
  }

  const userId = authData.user.id;
  const empresaTipo = rol === "transportista" ? "transportista" : "importador";

  const { data: empresaData, error: empresaError } = await supabaseAdmin
    .from("empresas")
    .insert({
      nombre: empresa,
      tipo: empresaTipo as Database["public"]["Enums"]["empresa_tipo"],
      rtu: rtu || null,
    })
    .select("id")
    .single();

  if (empresaError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { success: false, error: empresaError.message };
  }

  await supabaseAdmin
    .from("profiles")
    .update({ empresa_id: empresaData.id })
    .eq("id", userId);

  if (rol === "transportista") {
    await supabaseAdmin
      .from("transportista_perfil")
      .insert({ empresa_id: empresaData.id });
  }

  return { success: true };
}
