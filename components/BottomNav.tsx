"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Item {
  href: string;
  label: string;
  icon: (activo: boolean) => React.ReactNode;
  fab?: boolean;
}

const stroke = (activo: boolean) => (activo ? "#a8e02a" : "#8a8f7d");

const ITEMS: Item[] = [
  {
    href: "/dashboard",
    label: "Bóveda",
    icon: (a) => (
      <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke={a ? "#14170f" : "#8a8f7d"} strokeWidth="1.7">
        <rect x="3" y="7" width="15" height="11" rx="2" />
        <path d="M3 7l7.5-4L18 7" />
      </svg>
    ),
  },
  {
    href: "/tipo-cambio",
    label: "Cambio",
    icon: (a) => (
      <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke={stroke(a)} strokeWidth="1.7">
        <path d="M4 7h11M13 4.5L15.5 7 13 9.5" />
        <path d="M17 14H6M8 11.5L5.5 14 8 16.5" />
      </svg>
    ),
  },
  {
    href: "/depositos",
    label: "Depósitos",
    icon: (a) => (
      <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke={stroke(a)} strokeWidth="1.7">
        <rect x="4" y="6" width="13" height="11" rx="2" />
        <path d="M4 10h13" />
      </svg>
    ),
  },
  {
    href: "/transacciones/nueva",
    label: "Nuevo",
    fab: true,
    icon: () => (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#14170f" strokeWidth="2.2">
        <path d="M13 6v14M6 13h14" />
      </svg>
    ),
  },
  {
    href: "/fondo-juan",
    label: "Fondo",
    icon: (a) => (
      <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke={stroke(a)} strokeWidth="1.7">
        <rect x="4" y="5" width="13" height="12" rx="2" />
        <path d="M7 9h7M7 13h4" />
      </svg>
    ),
  },
  {
    href: "/cierre",
    label: "Cierre",
    icon: (a) => (
      <svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke={stroke(a)} strokeWidth="1.7">
        <rect x="4" y="9" width="13" height="9" rx="2" />
        <path d="M7.5 9V6.5a3 3 0 016 0V9" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-end justify-between border-t border-ink/10 bg-white px-3 pb-[calc(9px+env(safe-area-inset-bottom))] pt-2.5">
      {ITEMS.map((item) => {
        const activo = pathname.startsWith(item.href);

        if (item.fab) {
          return (
            <Link key={item.href} href={item.href} className="flex flex-1 justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime shadow-[0_4px_12px_rgba(120,168,20,0.4)]">
                {item.icon(true)}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 text-[11px] ${
              activo ? "font-semibold text-ink" : "text-[#8a8f7d]"
            }`}
          >
            {item.icon(activo)}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
