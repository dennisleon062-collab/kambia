import { getUsuarioActual } from "@/lib/auth";
import { getCuentas } from "@/lib/queries/cuentas";
import { getCuentasPorCobrarAbiertas } from "@/lib/queries/cxc";
import { Header } from "@/components/Header";
import { OfflineQueueStatus } from "@/components/OfflineQueueStatus";
import { NuevaTransaccionForm } from "./NuevaTransaccionForm";

export default async function NuevaTransaccionPage() {
  const [usuario, cuentas, cxcAbiertas] = await Promise.all([
    getUsuarioActual(),
    getCuentas(),
    getCuentasPorCobrarAbiertas(),
  ]);

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Nueva transacción" />
      <OfflineQueueStatus />
      <main className="p-4">
        <NuevaTransaccionForm cuentas={cuentas} cxcAbiertas={cxcAbiertas} />
      </main>
    </>
  );
}
