"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  nombre_completo: string;
  rol: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
};

const inputCls =
  "w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-weak)] transition-colors";
const inputStyle = {
  background: "var(--surface-sunk)",
  borderColor: "var(--border-default)",
  color: "var(--text-strong)",
};
const cardStyle = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-default)",
  boxShadow: "var(--elevation-1)",
};

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-medium mb-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function PerfilView({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState(profile.nombre_completo);
  const [telefono, setTelefono] = useState(profile.telefono ?? "");
  const [cumple, setCumple] = useState(profile.fecha_nacimiento ?? "");
  const [savingPerfil, setSavingPerfil] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre no puede quedar vacío.");
      return;
    }
    setSavingPerfil(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre_completo: nombre.trim(),
        telefono: telefono.trim() || null,
        fecha_nacimiento: cumple || null,
      })
      .eq("id", profile.id);
    setSavingPerfil(false);
    if (error) {
      toast.error("No se pudo guardar: " + error.message);
      return;
    }
    toast.success("Perfil actualizado");
    router.refresh();
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setPassError(null);
    if (password !== confirm) {
      setPassError("Las contraseñas no coinciden.");
      return;
    }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPass(false);
    if (error) {
      setPassError(
        error.message.includes("different from the old")
          ? "La contraseña nueva debe ser distinta a la actual."
          : error.message
      );
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Contraseña cambiada");
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <main className="max-w-[640px] mx-auto px-4 py-8">
      <h1
        className="text-[20px] font-semibold tracking-tight mb-1"
        style={{ color: "var(--text-strong)" }}
      >
        Perfil
      </h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
        Tus datos personales y la contraseña de acceso.
      </p>

      {/* Datos personales */}
      <form
        onSubmit={guardarPerfil}
        className="rounded-[var(--radius-lg)] p-6 mb-6"
        style={cardStyle}
      >
        <h2
          className="text-[14px] font-semibold mb-4"
          style={{ color: "var(--text-strong)" }}
        >
          Datos personales
        </h2>

        <Field label="Nombre completo" htmlFor="nombre">
          <input
            id="nombre"
            type="text"
            required
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>

        <Field
          label="Correo electrónico"
          htmlFor="email"
          hint="Es tu usuario para iniciar sesión; no se puede cambiar aquí."
        >
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            className={`${inputCls} cursor-not-allowed`}
            style={{ ...inputStyle, color: "var(--text-muted)" }}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Teléfono" htmlFor="telefono" hint="Se usa para avisos por WhatsApp.">
            <input
              id="telefono"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+502 5555 5555"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>

          <Field label="Fecha de nacimiento" htmlFor="cumple">
            <input
              id="cumple"
              type="date"
              autoComplete="bday"
              max={hoy}
              value={cumple}
              onChange={(e) => setCumple(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPerfil}
            className="px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {savingPerfil ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      {/* Contraseña */}
      <form
        onSubmit={cambiarPassword}
        className="rounded-[var(--radius-lg)] p-6"
        style={cardStyle}
      >
        <h2
          className="text-[14px] font-semibold mb-4"
          style={{ color: "var(--text-strong)" }}
        >
          Cambiar contraseña
        </h2>

        {passError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-[var(--radius-md)] text-[12px]"
            style={{
              background: "var(--coral-50)",
              border: "1px solid var(--coral-100)",
              color: "var(--coral-600)",
            }}
          >
            {passError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Contraseña nueva" htmlFor="pass" hint="Mínimo 6 caracteres.">
            <input
              id="pass"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
          <Field label="Confirmar contraseña" htmlFor="pass2">
            <input
              id="pass2"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPass}
            className="px-5 py-2.5 rounded-[var(--radius-md)] text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {savingPass ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </main>
  );
}
