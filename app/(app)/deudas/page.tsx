import { getUsuarioActual } from "@/lib/auth";
import { getCuentasPorCobrarAbiertas } from "@/lib/queries/cxc";
import { getTipoCambioVigente } from "@/lib/queries/tipo-cambio";
import { Header } from "@/components/Header";
import { convertirASoles, formatFechaHora, formatMonto } from "@/lib/format";
import type { CuentaPorCobrarConSaldo } from "@/types/database.types";

const NOMBRES_MONEDA: Record<string, string> = {
  PEN: "Soles",
  USD: "Dólares",
  EUR: "Euros",
};

function agruparPorMoneda(cxc: CuentaPorCobrarConSaldo[]) {
  const grupos = new Map<string, CuentaPorCobrarConSaldo[]>();
  for (const c of cxc) {
    const lista = grupos.get(c.moneda) ?? [];
    lista.push(c);
    grupos.set(c.moneda, lista);
  }
  return grupos;
}

export default async function DeudasPage() {
  const [usuario, cxcAbiertas, tc] = await Promise.all([
    getUsuarioActual(),
    getCuentasPorCobrarAbiertas(),
    getTipoCambioVigente(),
  ]);

  const totalSoles =
    Math.round(cxcAbiertas.reduce((acc, c) => acc + convertirASoles(c.saldo_pendiente, c.moneda, tc), 0) * 100) /
    100;
  const grupos = agruparPorMoneda(cxcAbiertas);

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Quién te debe" />
      <main className="flex flex-col gap-3.5 p-4">
        {cxcAbiertas.length === 0 ? (
          <div className="card text-sm text-ink/50">Nadie te debe nada por ahora.</div>
        ) : (
          <>
            <div className="card">
              <p className="text-[13px] text-ink/50">Todo junto, en soles</p>
              <p className="font-num mt-0.5 text-[28px] font-semibold">{formatMonto(totalSoles, "PEN")}</p>
            </div>

            {Array.from(grupos.entries()).map(([moneda, lista]) => {
              const subtotal = lista.reduce((acc, c) => acc + c.saldo_pendiente, 0);
              return (
                <section key={moneda} className="rounded-2xl bg-white px-4 py-1 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#f0f0ea] py-2.5">
                    <p className="text-[13px] font-semibold">{NOMBRES_MONEDA[moneda] ?? moneda}</p>
                    <span className="font-num text-[13px] text-ink/50">{formatMonto(subtotal, moneda)}</span>
                  </div>
                  <div className="divide-y divide-[#f0f0ea]">
                    {lista.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold">{c.cliente_texto}</p>
                          <p className="text-xs text-ink/50">
                            Desde el {formatFechaHora(c.fecha_operacion)}
                            {c.total_abonado > 0 && ` · abonado ${formatMonto(c.total_abonado, c.moneda)}`}
                          </p>
                        </div>
                        <span className="font-num shrink-0 text-[17px] font-semibold text-rust">
                          {formatMonto(c.saldo_pendiente, c.moneda)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>
    </>
  );
}
