"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  nombre_completo: string;
  rol: string;
  empresa_id: string | null;
} | null;

const TABS = [
  { href: "/transportista", label: "Transportista", rol: "transportista" },
  { href: "/importador", label: "Importador / Exportador", rol: "importador" },
  { href: "/piloto", label: "App Piloto", rol: null },
  { href: "/admin", label: "Admin", rol: "admin_only" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function TopNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isAdminUser = profile?.rol === "admin" || profile?.rol === "staff";

  const visibleTabs = TABS.filter((t) => {
    if (t.rol === "admin_only") return isAdminUser;
    if (t.rol === null) return true;
    if (isAdminUser) return true;
    return t.rol === profile?.rol;
  });

  return (
    <nav
      className="cgt-glass-light flex items-center justify-between px-[22px] sticky top-0 z-50"
      style={{ height: "var(--nav-height)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center text-white"
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary)",
            boxShadow: "var(--elevation-1)",
          }}
        >
          <i className="ti ti-container" style={{ fontSize: 18 }} />
        </div>
        <span
          className="text-[16px] font-semibold tracking-tight"
          style={{ color: "var(--text-strong)" }}
        >
          Container<span style={{ color: "var(--color-primary)" }}>GT</span>
        </span>
      </Link>

      {/* Segmented tab control */}
      <div
        className="flex gap-0.5 rounded-[10px] p-[3px]"
        style={{
          background: "var(--surface-sunk)",
          border: "1px solid var(--border-default)",
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-medium transition-all"
              style={
                isActive
                  ? {
                      background: "var(--surface-card)",
                      color: "var(--text-strong)",
                      boxShadow: "var(--elevation-1)",
                      border: "1px solid var(--border-default)",
                    }
                  : {
                      color: "var(--text-muted)",
                    }
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right: bell + user */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="relative flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[var(--surface-hover)]"
          style={{
            width: 34,
            height: 34,
            color: "var(--text-muted)",
            border: "1px solid transparent",
          }}
          aria-label="Notificaciones"
        >
          <i className="ti ti-bell" style={{ fontSize: 18 }} />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          {profile && (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div
                className="flex items-center justify-center text-[11px] font-semibold rounded-full"
                style={{
                  width: 30,
                  height: 30,
                  background: "var(--color-primary-weak)",
                  color: "var(--color-primary)",
                }}
              >
                {getInitials(profile.nombre_completo)}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--text-strong)" }}
                >
                  {profile.nombre_completo.split(" ")[0]}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {profile.rol}
                </span>
              </div>
              <i
                className="ti ti-chevron-down text-xs"
                style={{ fontSize: 13, color: "var(--text-faint)" }}
              />
            </button>
          )}

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white rounded-xl py-1 z-50"
              style={{
                border: "1px solid var(--border-default)",
                boxShadow: "var(--elevation-3)",
              }}
            >
              {profile && (
                <div
                  className="px-4 py-2.5"
                  style={{ borderBottom: "1px solid var(--border-default)" }}
                >
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--text-strong)" }}
                  >
                    {profile.nombre_completo}
                  </p>
                  <p
                    className="text-[11px] capitalize"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {profile.rol}
                  </p>
                </div>
              )}
              <Link
                href="/billing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: "var(--text-body)" }}
              >
                <i
                  className="ti ti-receipt text-base"
                  style={{ color: "var(--text-muted)" }}
                />
                Planes y facturación
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors hover:bg-[var(--coral-50)]"
                style={{ color: "var(--coral-600)" }}
              >
                <i className="ti ti-logout text-base" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
