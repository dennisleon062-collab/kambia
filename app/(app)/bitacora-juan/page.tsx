import Link from "next/link";
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
          <div className="card text-sm text-ink/60">
            Milagro aún no te ha entregado el fondo de hoy.
          </div>
        )}

        {fondoHoy && (
          <>
            <div className="card flex items-center justify-between text-sm">
              <span className="text-ink/50">Fondo de hoy</span>
              <span className="font-mono font-semibold">S/ {fondoHoy.monto_entregado}</span>
            </div>

            <BitacoraJuanForm fondoDiarioId={fondoHoy.id} />

            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
                Operaciones de hoy
              </h2>
              <div className="card divide-y divide-ink/10">
                {operaciones.length === 0 && (
                  <p className="py-2 text-sm text-ink/50">Sin operaciones registradas aún.</p>
                )}
                {operaciones.map((op) => (
                  <div key={op.id} className="py-2 text-sm first:pt-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{op.tipo_operacion}</span>
                      <span className="text-ink/50">{formatFechaHora(op.hora)}</span>
                    </div>
                    {op.cliente_texto && <p className="text-ink/60">{op.cliente_texto}</p>}
                    <p className="text-ink/60">
                      {op.monto_origen ?? "sin dato"} {op.moneda_origen ?? ""} → {op.monto_destino ?? "sin dato"}{" "}
                      {op.moneda_destino ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <div className="flex justify-center py-2">
          <Link href="/historial" className="text-[12.5px] text-ink/40">
            Ver todas las operaciones de hoy (para corregir alguna)
          </Link>
        </div>
      </main>
    </>
  );
}
