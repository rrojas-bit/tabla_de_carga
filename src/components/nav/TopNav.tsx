"use client";

import Link from "next/link";
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
      <div className="flex items-center gap-2">
        {profile && (
          <>
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-[11px] font-semibold text-teal-600">
              {getInitials(profile.nombre_completo)}
            </div>
            <span className="text-[13px] text-gray-400 hidden sm:block">
              {profile.nombre_completo.split(" ")[0]}
            </span>
          </>
        )}
        <Link
          href="/billing"
          title="Planes y facturación"
          className={`ml-1 transition-colors ${
            pathname.startsWith("/billing")
              ? "text-teal-500"
              : "text-gray-200 hover:text-gray-400"
          }`}
        >
          <i className="ti ti-receipt text-lg" />
        </Link>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="ml-1 text-gray-200 hover:text-gray-400 transition-colors"
        >
          <i className="ti ti-logout text-lg" />
        </button>
      </div>
    </nav>
  );
}
