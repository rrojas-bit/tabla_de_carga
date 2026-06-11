"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerUser } from "./actions";

type Mode = "login" | "register";

const CONTENEDOR_ROLES = [
  { value: "transportista", label: "Transportista" },
  { value: "importador", label: "Importador / Exportador" },
];

const inputCls =
  "w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-[13px] focus:outline-none transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [rtu, setRtu] = useState("");
  const [rol, setRol] = useState("transportista");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : error.message
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const result = await registerUser(email, password, nombre, empresa, rol, rtu || null);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("Cuenta creada. Inicia sesión manualmente.");
        setMode("login");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `
          radial-gradient(680px 420px at 15% 0%, var(--blue-50), transparent 55%),
          radial-gradient(620px 460px at 92% 100%, var(--amber-50), transparent 55%),
          var(--surface-page)
        `,
      }}
    >
      <div className="w-full max-w-[392px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-[22px]">
          <div
            className="flex items-center justify-center text-white"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              boxShadow: "var(--elevation-2)",
            }}
          >
            <i className="ti ti-container text-[20px]" />
          </div>
          <span
            className="text-[20px] font-semibold tracking-tight"
            style={{ color: "var(--text-strong)" }}
          >
            Container<span style={{ color: "var(--color-primary)" }}>GT</span>
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-[var(--radius-lg)] p-7"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--elevation-3)",
          }}
        >
          {/* Mode tabs */}
          <div
            className="flex gap-0.5 rounded-[10px] p-[3px] mb-5"
            style={{
              background: "var(--surface-sunk)",
              border: "1px solid var(--border-default)",
            }}
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className="flex-1 py-2 rounded-[8px] text-[13px] font-medium transition-all"
                style={
                  mode === m
                    ? {
                        background: "var(--surface-card)",
                        color: "var(--text-strong)",
                        boxShadow: "var(--elevation-1)",
                        border: "1px solid var(--border-default)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

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

          <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
            {mode === "register" && (
              <>
                <div className="mb-3">
                  <label
                    className="block text-[11px] font-medium mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. José Recinos"
                    className={inputCls}
                    style={{
                      background: "var(--surface-sunk)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-strong)",
                    }}
                  />
                </div>

                <div className="mb-3">
                  <label
                    className="block text-[11px] font-medium mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Tipo de cuenta
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className={inputCls}
                    style={{
                      background: "var(--surface-sunk)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-strong)",
                    }}
                  >
                    {CONTENEDOR_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label
                    className="block text-[11px] font-medium mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Nombre de empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Ej. Transportes Recinos S.A."
                    className={inputCls}
                    style={{
                      background: "var(--surface-sunk)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-strong)",
                    }}
                  />
                </div>

                <div className="mb-3">
                  <label
                    className="block text-[11px] font-medium mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    RTU (opcional)
                  </label>
                  <input
                    type="text"
                    value={rtu}
                    onChange={(e) => setRtu(e.target.value)}
                    placeholder="NIT de la empresa"
                    className={inputCls}
                    style={{
                      background: "var(--surface-sunk)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-strong)",
                    }}
                  />
                </div>
              </>
            )}

            <div className="mb-3">
              <label
                className="block text-[11px] font-medium mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                className={inputCls}
                style={{
                  background: "var(--surface-sunk)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-strong)",
                }}
              />
            </div>

            <div className={mode === "register" ? "mb-3" : "mb-5"}>
              <label
                className="block text-[11px] font-medium mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={inputCls}
                style={{
                  background: "var(--surface-sunk)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-strong)",
                }}
              />
            </div>

            {mode === "register" && (
              <div className="mb-5">
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={inputCls}
                  style={{
                    background: "var(--surface-sunk)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-strong)",
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold text-white transition-colors disabled:opacity-60"
              style={{
                background: "var(--color-primary)",
              }}
              onMouseEnter={(e) =>
                !loading && ((e.currentTarget.style.background = "var(--color-primary-hover)"))
              }
              onMouseLeave={(e) =>
                ((e.currentTarget.style.background = "var(--color-primary)"))
              }
            >
              {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta →"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-[11px] mt-5"
          style={{ color: "var(--text-faint)" }}
        >
          ContainerGT © {new Date().getFullYear()} · Guatemala
        </p>
      </div>
    </div>
  );
}
