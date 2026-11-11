"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

// Recibe los enlaces de correo de Supabase (magic link, recuperación,
// confirmación, invitación) en cualquiera de sus tres formatos:
//   ?code=...                  (PKCE, enlaces pedidos desde la app)
//   ?token_hash=...&type=...   (plantillas de correo personalizadas)
//   #access_token=...          (implícito, enlaces enviados desde el panel)
export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));

    async function run() {
      const linkError =
        hash.get("error_description") ?? query.get("error_description");
      if (linkError) throw new Error(linkError);

      let type = query.get("type") ?? hash.get("type");
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        });
        if (error) throw error;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
      } else {
        throw new Error("El enlace no contiene credenciales.");
      }

      if (query.get("next") === "/auth/update-password") type = "recovery";
      window.location.replace(
        type === "recovery" ? "/auth/update-password" : "/"
      );
    }

    run().catch((e: Error) =>
      setError(
        /expired|invalid|not found/i.test(e.message)
          ? "El enlace es inválido o ya fue usado. Cada enlace sirve una sola vez: pide uno nuevo."
          : e.message
      )
    );
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--surface-page)" }}
    >
      <div
        className="w-full max-w-[392px] rounded-[var(--radius-lg)] p-7 text-center text-[13px]"
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--elevation-3)",
          color: "var(--text-strong)",
        }}
      >
        {error ? (
          <>
            <p className="mb-4" style={{ color: "var(--coral-600)" }}>
              {error}
            </p>
            <a
              href="/login"
              className="font-semibold"
              style={{ color: "var(--color-primary)" }}
            >
              Volver a iniciar sesión
            </a>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>Verificando enlace…</p>
        )}
      </div>
    </div>
  );
}
