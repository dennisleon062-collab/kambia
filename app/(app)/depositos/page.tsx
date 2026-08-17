import { getUsuarioActual } from "@/lib/auth";
import { getDepositosPendientes } from "@/lib/queries/depositos";
import { getCuentasPorCobrarAbiertas } from "@/lib/queries/cxc";
import { Header } from "@/components/Header";
import { DepositoRow } from "./DepositoRow";

export default async function DepositosPage() {
  const [usuario, depositos, cxcAbiertas] = await Promise.all([
    getUsuarioActual(),
    getDepositosPendientes(),
    getCuentasPorCobrarAbiertas(),
  ]);

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Depósitos sin identificar" />
      <main className="flex flex-col gap-3 p-4">
        {depositos.length === 0 && (
          <div className="card text-sm text-neutral-500">No hay depósitos pendientes de identificar.</div>
        )}
        {depositos.map((d) => (
          <DepositoRow key={d.id} deposito={d} cxcAbiertas={cxcAbiertas} />
        ))}
      </main>
    </>
  );
}
