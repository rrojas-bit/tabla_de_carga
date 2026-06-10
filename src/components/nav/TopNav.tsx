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
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b border-[rgba(68,68,65,0.12)] sticky top-0 z-50">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
          <i className="ti ti-container text-white text-base" />
        </div>
        <span className="text-base font-semibold text-gray-800 tracking-tight">
          Container<span className="text-teal-400">GT</span>
        </span>
      </Link>

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
        {visibleTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-white text-gray-800 border border-[rgba(68,68,65,0.12)]"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div className="relative" ref={menuRef}>
        {profile && (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-[11px] font-semibold text-teal-600">
              {getInitials(profile.nombre_completo)}
            </div>
            <span className="text-[13px] text-gray-500 hidden sm:block">
              {profile.nombre_completo.split(" ")[0]}
            </span>
            <i className="ti ti-chevron-down text-xs text-gray-400" />
          </button>
        )}

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
            {profile && (
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-[13px] font-medium text-gray-800 truncate">
                  {profile.nombre_completo}
                </p>
                <p className="text-[11px] text-gray-400 capitalize">{profile.rol}</p>
              </div>
            )}
            <Link
              href="/billing"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <i className="ti ti-receipt text-base text-gray-400" />
              Planes y facturación
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
            >
              <i className="ti ti-logout text-base" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
