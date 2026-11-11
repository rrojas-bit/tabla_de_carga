"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-[13px] focus:outline-none transition-colors";
const inputStyle = {
  background: "var(--surface-sunk)",
  borderColor: "var(--border-default)",
  color: "var(--text-strong)",
};

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(
        error.message.includes("session")
          ? "Tu sesión expiró. Pide un nuevo enlace de recuperación."
          : error.message
      );
      setLoading(false);
      return;
    }
    window.location.replace("/");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--surface-page)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[392px] rounded-[var(--radius-lg)] p-7"
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--elevation-3)",
        }}
      >
        <h1
          className="text-[16px] font-semibold mb-4"
          style={{ color: "var(--text-strong)" }}
        >
          Nueva contraseña
        </h1>

        {error && (
          <div
            className="mb-4 p-3 rounded-[var(--radius-md)] text-[12px]"
            style={{
              background: "var(--coral-50)",
              border: "1px solid var(--coral-100)",
              color: "var(--coral-600)",
            }}
          >
            {error}
          </div>
        )}

        <label
          className="block text-[11px] font-medium mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          Contraseña nueva
        </label>
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputCls} mb-3`}
          style={inputStyle}
        />

        <label
          className="block text-[11px] font-medium mb-1"
          style={{ color: "var(--text-muted)" }}
        >
          Confirmar contraseña
        </label>
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`${inputCls} mb-4`}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--color-primary)" }}
        >
          {loading ? "..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
