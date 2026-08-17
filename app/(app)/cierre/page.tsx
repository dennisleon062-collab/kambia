import { getUsuarioActual } from "@/lib/auth";
import { getCuentasFisicasConSaldo } from "@/lib/queries/cierre-datos";
import { getCierresDeFecha } from "@/lib/queries/cierres";
import { Header } from "@/components/Header";
import { formatMonto } from "@/lib/format";
import { CierreForm } from "./CierreForm";

export default async function CierrePage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [usuario, cuentas, cierresHoy] = await Promise.all([
    getUsuarioActual(),
    getCuentasFisicasConSaldo(hoy),
    getCierresDeFecha(hoy),
  ]);

  return (
    <>
      <Header nombre={usuario.nombre} titulo={`Cierre diario — ${hoy}`} />
      <main className="flex flex-col gap-4 p-4">
        <CierreForm cuentas={cuentas} />

        {cierresHoy.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Cierres confirmados hoy
            </h2>
            <div className="card divide-y divide-neutral-100">
              {cierresHoy.map((c) => (
                <div key={c.id} className="py-2 text-sm first:pt-0 last:pb-0">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {(c as unknown as { cuentas: { nombre: string } }).cuentas.nombre}
                    </span>
                    <span className={c.estado === "cuadrado" ? "text-brand-700" : "text-amber-700"}>
                      {c.estado}
                    </span>
                  </div>
                  <p className="text-neutral-600">
                    Faltante/sobrante real:{" "}
                    {c.diferencia_real !== null
                      ? formatMonto(
                          c.diferencia_real,
                          (c as unknown as { cuentas: { moneda_codigo: string } }).cuentas.moneda_codigo
                        )
                      : "—"}
                    {" · "}Variación cambiaria:{" "}
                    {c.variacion_cambiaria !== null
                      ? formatMonto(c.variacion_cambiaria, "PEN")
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
