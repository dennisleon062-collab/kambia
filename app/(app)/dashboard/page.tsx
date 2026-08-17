import { getUsuarioActual } from "@/lib/auth";
import { getSaldos } from "@/lib/queries/saldos";
import { getTipoCambioVigente } from "@/lib/queries/tipo-cambio";
import { Header } from "@/components/Header";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { formatMonto } from "@/lib/format";
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

export default async function DashboardPage() {
  const [usuario, saldos, tc] = await Promise.all([
    getUsuarioActual(),
    getSaldos(),
    getTipoCambioVigente(),
  ]);

  const grupos = agruparPorTipo(saldos);

  return (
    <>
      <RealtimeRefresher tables={["movimientos"]} />
      <Header nombre={usuario.nombre} titulo="Bóveda — saldos en vivo" />

      <main className="flex flex-col gap-4 p-4">
        <div className="card flex items-center justify-between">
          <span className="text-sm text-neutral-500">Tipo de cambio vigente</span>
          {tc ? (
            <span className="font-semibold text-brand-700">
              USD {tc.tc_usd.toFixed(4)} · EUR {tc.tc_eur.toFixed(4)}
            </span>
          ) : (
            <span className="text-sm text-red-600">No configurado</span>
          )}
        </div>

        {Array.from(grupos.entries()).map(([tipo, cuentas]) => (
          <section key={tipo} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {TITULOS_TIPO[tipo] ?? tipo}
            </h2>
            <div className="card divide-y divide-neutral-100">
              {cuentas.map((c) => (
                <div key={c.cuenta_id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-neutral-700">{c.cuenta_nombre}</span>
                  <span
                    className={`font-mono text-lg font-semibold ${
                      c.saldo < 0 ? "text-red-600" : "text-neutral-900"
                    }`}
                  >
                    {formatMonto(c.saldo, c.moneda_codigo)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
