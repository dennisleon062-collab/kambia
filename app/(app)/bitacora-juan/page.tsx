import { getUsuarioActual } from "@/lib/auth";
import { getFondoDeHoy, getBitacoraJuan } from "@/lib/queries/fondo-juan";
import { Header } from "@/components/Header";
import { OfflineQueueStatus } from "@/components/OfflineQueueStatus";
import { formatFechaHora } from "@/lib/format";
import { BitacoraJuanForm } from "./BitacoraJuanForm";

export default async function BitacoraJuanPage() {
  const usuario = await getUsuarioActual();
  const fondoHoy = await getFondoDeHoy(usuario.id);
  const operaciones = fondoHoy ? await getBitacoraJuan(fondoHoy.id) : [];

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Bitácora del día" />
      <OfflineQueueStatus />
      <main className="flex flex-col gap-4 p-4">
        {!fondoHoy && (
          <div className="card text-sm text-neutral-600">
            Milagro aún no te ha entregado el fondo de hoy.
          </div>
        )}

        {fondoHoy && (
          <>
            <div className="card flex items-center justify-between text-sm">
              <span className="text-neutral-500">Fondo de hoy</span>
              <span className="font-mono font-semibold">S/ {fondoHoy.monto_entregado}</span>
            </div>

            <BitacoraJuanForm fondoDiarioId={fondoHoy.id} />

            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Operaciones de hoy
              </h2>
              <div className="card divide-y divide-neutral-100">
                {operaciones.length === 0 && (
                  <p className="py-2 text-sm text-neutral-500">Sin operaciones registradas aún.</p>
                )}
                {operaciones.map((op) => (
                  <div key={op.id} className="py-2 text-sm first:pt-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{op.tipo_operacion}</span>
                      <span className="text-neutral-500">{formatFechaHora(op.hora)}</span>
                    </div>
                    {op.cliente_texto && <p className="text-neutral-600">{op.cliente_texto}</p>}
                    <p className="text-neutral-600">
                      {op.monto_origen ?? "—"} {op.moneda_origen ?? ""} → {op.monto_destino ?? "—"}{" "}
                      {op.moneda_destino ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
