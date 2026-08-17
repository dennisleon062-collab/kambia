"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@/types/database.types";

interface Item {
  href: string;
  label: string;
  icon: string;
  roles: Rol[];
}

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Bóveda", icon: "🏦", roles: ["dueña"] },
  { href: "/transacciones/nueva", label: "Nuevo", icon: "➕", roles: ["dueña", "trabajador"] },
  { href: "/tipo-cambio", label: "TC", icon: "💱", roles: ["dueña", "trabajador"] },
  { href: "/fondo-juan", label: "Fondo", icon: "👝", roles: ["dueña"] },
  { href: "/bitacora-juan", label: "Bitácora", icon: "📒", roles: ["trabajador"] },
  { href: "/depositos", label: "Depósitos", icon: "🏧", roles: ["dueña"] },
  { href: "/cierre", label: "Cierre", icon: "🔒", roles: ["dueña", "trabajador"] },
];

export function BottomNav({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => i.roles.includes(rol));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const activo = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              activo ? "text-brand-600 font-semibold" : "text-neutral-500"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
