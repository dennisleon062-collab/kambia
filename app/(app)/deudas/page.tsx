import { getUsuarioActual } from "@/lib/auth";
import { getCuentasPorCobrarAbiertas } from "@/lib/queries/cxc";
import { Header } from "@/components/Header";
import { formatFechaHora, formatMonto } from "@/lib/format";

export default async function DeudasPage() {
  const [usuario, cxcAbiertas] = await Promise.all([getUsuarioActual(), getCuentasPorCobrarAbiertas()]);

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Quién te debe" />
      <main className="flex flex-col gap-3 p-4">
        {cxcAbiertas.length === 0 && (
          <div className="card text-sm text-ink/50">Nadie te debe nada por ahora.</div>
        )}
        {cxcAbiertas.map((c) => (
          <div key={c.id} className="card flex items-center justify-between gap-3">
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
      </main>
    </>
  );
}
