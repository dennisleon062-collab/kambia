import { getUsuarioActual } from "@/lib/auth";
import { getSaldos } from "@/lib/queries/saldos";
import { getTipoCambioVigente } from "@/lib/queries/tipo-cambio";
import { getDepositosPendientes } from "@/lib/queries/depositos";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { LogoutButton } from "@/components/LogoutButton";
import { formatMonto } from "@/lib/format";
import Link from "next/link";
import type { SaldoCuenta } from "@/types/database.types";

const TITULOS_TIPO: Record<string, string> = {
  banco: "Bancos",
  efectivo_boveda: "Efectivo en bóveda",
  fondo_juan: "Fondo de Juan",
};

function agruparPorTipo(saldos: SaldoCuenta[]) {
  const grupos = new Map<string, SaldoCuenta[]>();
  for (const s of saldos) {
    const lista = grupos.get(s.cuenta_tipo) ?? [];
    lista.push(s);
    grupos.set(s.cuenta_tipo, lista);
  }
  return grupos;
}

function iconoCuenta(slug: string) {
  if (slug.startsWith("boveda_efectivo_pen") || slug === "boveda_monedas" || slug === "boveda_billetes")
    return { txt: "S/", bg: "#eef2e2", color: "#4b6b1f" };
  if (slug.includes("usd")) return { txt: "US$", bg: "#eef2e2", color: "#4b6b1f" };
  if (slug.includes("eur")) return { txt: "€", bg: "#eef2e2", color: "#4b6b1f" };
  if (slug.startsWith("fondo_juan")) return { txt: "J", bg: "#f3ecdd", color: "#7a6327" };
  return { txt: "B", bg: "#e9edf5", color: "#37476b" };
}

export default async function DashboardPage() {
  const [usuario, saldos, tc, depositos] = await Promise.all([
    getUsuarioActual(),
    getSaldos(),
    getTipoCambioVigente(),
    getDepositosPendientes(),
  ]);

  const grupos = agruparPorTipo(saldos);
  const totalEnSoles = saldos.reduce((acc, s) => {
    if (s.moneda_codigo === "USD" && tc) return acc + s.saldo * tc.tc_usd;
    if (s.moneda_codigo === "EUR" && tc) return acc + s.saldo * tc.tc_eur;
    return acc + s.saldo;
  }, 0);
  const monedasPendientes = new Set(depositos.map((d) => d.moneda_destino));
  const totalPendiente =
    monedasPendientes.size <= 1 ? depositos.reduce((acc, d) => acc + (d.monto_destino ?? 0), 0) : null;
  const monedaPendiente = depositos[0]?.moneda_destino ?? "PEN";

  return (
    <>
      <RealtimeRefresher tables={["movimientos", "tipos_cambio"]} />

      <div className="bg-ink px-5 pb-6 pt-5 text-paper">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[.14em] text-paper/55">{usuario.nombre}</span>
          <LogoutButton />
        </div>
        <p className="mt-4 text-[13px] text-paper/60">Todo el dinero, en soles</p>
        <div className="flex items-baseline gap-2">
          <span className="font-num text-[38px] font-semibold tracking-tight">
            {Math.trunc(totalEnSoles).toLocaleString("es-PE")}
          </span>
          <span className="font-num text-base text-paper/55">
            .{Math.abs(totalEnSoles % 1).toFixed(2).slice(2)}
          </span>
        </div>
        <div className="mt-4 flex gap-2.5">
          <div className="flex-1 rounded-xl bg-paper/[0.08] px-3 py-2.5">
            <p className="text-[11px] text-paper/55">TC dólar</p>
            <p className="font-num mt-0.5 text-lg font-semibold">{tc ? tc.tc_usd.toFixed(4) : "sin fijar"}</p>
          </div>
          <div className="flex-1 rounded-xl bg-paper/[0.08] px-3 py-2.5">
            <p className="text-[11px] text-paper/55">TC euro</p>
            <p className="font-num mt-0.5 text-lg font-semibold">{tc ? tc.tc_eur.toFixed(4) : "sin fijar"}</p>
          </div>
          <Link
            href="/tipo-cambio"
            className="flex w-[52px] flex-col items-center justify-center gap-0.5 rounded-xl bg-lime text-[10px] font-semibold text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#14170f" strokeWidth="1.6">
              <path d="M2 5h10M10 3l2.5 2.5L10 8" />
              <path d="M14 11H4M6 9l-2.5 2.5L6 14" />
            </svg>
            Cambiar
          </Link>
        </div>
      </div>

      <main className="flex flex-col gap-3.5 px-4 pt-4">
        {Array.from(grupos.entries()).map(([tipo, cuentas]) => (
          <section key={tipo} className="rounded-2xl bg-white px-4 py-1 shadow-sm">
            <p className="border-b border-[#f0f0ea] py-2.5 text-[13px] font-semibold">
              {TITULOS_TIPO[tipo] ?? tipo}
            </p>
            <div className="divide-y divide-[#f0f0ea]">
              {cuentas.map((c) => {
                const icono = iconoCuenta(c.cuenta_slug);
                return (
                  <div key={c.cuenta_id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[11px] font-semibold"
                        style={{ background: icono.bg, color: icono.color }}
                      >
                        {icono.txt}
                      </span>
                      <p className="truncate text-[15px] font-semibold">{c.cuenta_nombre}</p>
                    </div>
                    <span className={`font-num shrink-0 text-[17px] font-semibold ${c.saldo < 0 ? "text-rust" : ""}`}>
                      {formatMonto(c.saldo, c.moneda_codigo)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {depositos.length > 0 && (
          <Link href="/depositos" className="flex items-center gap-3 rounded-2xl bg-amber-bg px-3.5 py-3.5">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-amber-icon text-sm font-bold text-amber-text">
              !
            </span>
            <p className="text-[13.5px] leading-tight text-amber-text">
              {depositos.length === 1 && totalPendiente !== null ? (
                <>Un depósito de <b>{formatMonto(totalPendiente, monedaPendiente)}</b> sin identificar</>
              ) : totalPendiente !== null ? (
                <>
                  {depositos.length} depósitos sin identificar, <b>{formatMonto(totalPendiente, monedaPendiente)}</b>
                </>
              ) : (
                <>{depositos.length} depósitos sin identificar, en varias monedas</>
              )}
            </p>
            <span className="ml-auto text-[13px] font-semibold text-amber-text">Ver</span>
          </Link>
        )}

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 py-2 text-[12.5px] text-ink/40">
          <Link href="/historial">Historial de hoy</Link>
          <Link href="/saldo-inicial">Cargar saldo inicial</Link>
          <Link href="/deuda-inicial">Cargar deudas iniciales</Link>
        </div>
      </main>
    </>
  );
}
