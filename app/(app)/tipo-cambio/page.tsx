import { getUsuarioActual } from "@/lib/auth";
import { getTipoCambioVigente, getHistorialTipoCambio } from "@/lib/queries/tipo-cambio";
import { Header } from "@/components/Header";
import { formatFechaHora } from "@/lib/format";
import { TipoCambioForm } from "./TipoCambioForm";

export default async function TipoCambioPage() {
  const [usuario, vigente, historial] = await Promise.all([
    getUsuarioActual(),
    getTipoCambioVigente(),
    getHistorialTipoCambio(),
  ]);

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Tipo de cambio" />
      <main className="flex flex-col gap-4 p-4">
        <TipoCambioForm tcUsdActual={vigente?.tc_usd ?? null} tcEurActual={vigente?.tc_eur ?? null} />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Historial
          </h2>
          <div className="card divide-y divide-neutral-100">
            {historial.length === 0 && (
              <p className="py-2 text-sm text-neutral-500">Sin registros aún.</p>
            )}
            {historial.map((tc) => (
              <div key={tc.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                <span className="text-neutral-500">{formatFechaHora(tc.fecha_hora)}</span>
                <span className="font-mono font-semibold">
                  USD {tc.tc_usd.toFixed(4)} · EUR {tc.tc_eur.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
