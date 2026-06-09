"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

const CONTENEDOR_ROLES = [
  { value: "transportista", label: "Transportista" },
  { value: "importador", label: "Importador / Exportador" },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [rtu, setRtu] = useState("");
  const [rol, setRol] = useState("transportista");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_completo: nombre,
          rol,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("No se pudo crear el usuario.");
      setLoading(false);
      return;
    }

    // Create empresa + link profile + transportista_perfil in one secure RPC
    const empresaTipo =
      rol === "transportista" ? "transportista" : "importador";
    const { error: empresaError } = await supabase.rpc(
      "create_empresa_on_signup",
      {
        p_user_id: authData.user.id,
        p_nombre: empresa,
        p_tipo: empresaTipo,
        p_rtu: rtu || null,
      }
    );

    if (empresaError) {
      setError("Error creando empresa: " + empresaError.message);
      setLoading(false);
      return;
    }

    setSuccess(
      "Cuenta creada. Revisa tu correo para confirmar tu email, luego inicia sesión."
    );
    setMode("login");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 bg-teal-400 rounded-lg flex items-center justify-center">
            <i className="ti ti-container text-white text-lg" />
          </div>
          <span className="text-xl font-semibold text-gray-800 tracking-tight">
            Container<span className="text-teal-400">GT</span>
          </span>
        </div>

        <div className="bg-white rounded-lg border border-[rgba(68,68,65,0.12)] p-7">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-gray-50 rounded-lg p-1 mb-6">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-white text-gray-800 border border-[rgba(68,68,65,0.12)]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

          {success && (
            <div className="mb-4 p-3 bg-teal-50 border border-teal-100 rounded-md text-sm text-teal-600">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-coral-50 border border-coral-100 rounded-md text-sm text-coral-600">
              {error}
            </div>
          )}

          <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
            {mode === "register" && (
              <>
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. José Recinos"
                    className="w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-sm text-gray-800 focus:outline-none focus:border-teal-100"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    Tipo de cuenta
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-sm text-gray-800 focus:outline-none focus:border-teal-100"
                  >
                    {CONTENEDOR_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    Nombre de empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Ej. Transportes Recinos S.A."
                    className="w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-sm text-gray-800 focus:outline-none focus:border-teal-100"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    RTU (opcional)
                  </label>
                  <input
                    type="text"
                    value={rtu}
                    onChange={(e) => setRtu(e.target.value)}
                    placeholder="NIT de la empresa"
                    className="w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-sm text-gray-800 focus:outline-none focus:border-teal-100"
                  />
                </div>
              </>
            )}

            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
                className="w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-sm text-gray-800 focus:outline-none focus:border-teal-100"
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs text-gray-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 rounded-md border border-[rgba(68,68,65,0.12)] bg-gray-50 text-sm text-gray-800 focus:outline-none focus:border-teal-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-400 text-white rounded-md text-sm font-semibold hover:bg-teal-600 transition-colors disabled:opacity-60"
            >
              {loading
                ? "..."
                : mode === "login"
                ? "Entrar"
                : "Crear cuenta →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-200 mt-5">
          ContainerGT © {new Date().getFullYear()} · Guatemala
        </p>
      </div>
    </div>
  );
}
