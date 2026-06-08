"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analizarTransportista, type AnalisisResult } from "@/lib/ai/analyze";

export async function aprobarEmpresa(empresaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin" && profile?.rol !== "staff") {
    return { error: "Sin permisos" };
  }

  const { error } = await supabase
    .from("empresas")
    .update({ estado: "activo" })
    .eq("id", empresaId);

  if (error) return { error: error.message };

  // Notify via WhatsApp if phone available
  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre, telefono_whatsapp")
    .eq("id", empresaId)
    .single();

  if (empresa?.telefono_whatsapp) {
    const { sendWhatsApp } = await import("@/lib/notifications/whatsapp");
    await sendWhatsApp(
      empresa.telefono_whatsapp,
      `✅ *ContainerGT* — Tu empresa *${empresa.nombre}* fue aprobada. Ya puedes ver cargas disponibles y hacer ofertas. Ingresa en containergt.com`
    );
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function rechazarEmpresa(empresaId: string, motivo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "admin" && profile?.rol !== "staff") {
    return { error: "Sin permisos" };
  }

  const { error } = await supabase
    .from("empresas")
    .update({ estado: "rechazado" })
    .eq("id", empresaId);

  if (error) return { error: error.message };

  const { data: empresa } = await supabase
    .from("empresas")
    .select("nombre, telefono_whatsapp")
    .eq("id", empresaId)
    .single();

  if (empresa?.telefono_whatsapp) {
    const { sendWhatsApp } = await import("@/lib/notifications/whatsapp");
    await sendWhatsApp(
      empresa.telefono_whatsapp,
      `ℹ️ *ContainerGT* — Tu solicitud para *${empresa.nombre}* no fue aprobada. Motivo: ${motivo}. Escríbenos para más información.`
    );
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function analizarConIA(
  empresaId: string
): Promise<{ result?: AnalisisResult; error?: string }> {
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nombre, rtu, tipo")
    .eq("id", empresaId)
    .single();

  if (!empresa) return { error: "Empresa no encontrada" };

  const { data: perfil } = await supabase
    .from("transportista_perfil")
    .select(
      "seguro_terceros_vigente, inspeccion_cabezal, documentos"
    )
    .eq("empresa_id", empresaId)
    .single();

  const { count: totalUnidades } = await supabase
    .from("flota")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  try {
    const result = await analizarTransportista({
      nombre: empresa.nombre,
      rtu: empresa.rtu,
      tipo: empresa.tipo,
      seguro_terceros_vigente: perfil?.seguro_terceros_vigente ?? null,
      inspeccion_cabezal: perfil?.inspeccion_cabezal ?? null,
      documentos: (perfil?.documentos as Record<string, unknown>) ?? null,
      total_unidades: totalUnidades ?? 0,
    });

    return { result };
  } catch (err) {
    return { error: String(err) };
  }
}
