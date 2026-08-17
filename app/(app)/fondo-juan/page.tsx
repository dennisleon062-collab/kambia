import { getUsuarioActual } from "@/lib/auth";
import { getTrabajador } from "@/lib/queries/cuentas";
import { getFondoDeHoy, getHistorialFondo } from "@/lib/queries/fondo-juan";
import { Header } from "@/components/Header";
import { EntregarFondoForm, DevolverFondoForm } from "./FondoJuanForms";

export default async function FondoJuanPage() {
  const usuario = await getUsuarioActual();
  const juan = await getTrabajador();
  const [fondoHoy, historial] = await Promise.all([
    getFondoDeHoy(juan.id),
    getHistorialFondo(),
  ]);

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Fondo de Juan" />
      <main className="flex flex-col gap-4 p-4">
        {!fondoHoy && <EntregarFondoForm />}
        {fondoHoy && <DevolverFondoForm fondo={fondoHoy} />}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Historial</h2>
          <div className="card divide-y divide-neutral-100">
            {historial.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                <span className="text-neutral-500">{f.fecha}</span>
                <span>
                  Entregado S/ {f.monto_entregado} · Devuelto{" "}
                  {f.monto_devuelto !== null ? `S/ ${f.monto_devuelto}` : "—"}
                </span>
                <span className="font-medium">{f.estado}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
