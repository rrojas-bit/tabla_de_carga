import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

export async function POST(request: Request) {
  try {
    const { email, password, nombre, empresa, rol, rtu } =
      await request.json();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Configuración de servidor incompleta (SERVICE_ROLE_KEY)." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create confirmed user via admin API
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { nombre_completo: nombre, rol },
        email_confirm: true,
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;
    const empresaTipo =
      rol === "transportista" ? "transportista" : "importador";

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
      return NextResponse.json({ error: empresaError.message }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
