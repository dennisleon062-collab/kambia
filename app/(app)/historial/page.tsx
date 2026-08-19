import { getUsuarioActual } from "@/lib/auth";
import { getMovimientosDeHoy } from "@/lib/queries/movimientos-hoy";
import { Header } from "@/components/Header";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { HistorialRow } from "./HistorialRow";

export default async function HistorialPage() {
  const [usuario, movimientos] = await Promise.all([getUsuarioActual(), getMovimientosDeHoy()]);

  return (
    <>
      <RealtimeRefresher tables={["movimientos"]} />
      <Header nombre={usuario.nombre} titulo="Historial de hoy" />
      <main className="flex flex-col gap-3 p-4">
        {movimientos.length === 0 && (
          <div className="card text-sm text-ink/50">Todavía no hay operaciones registradas hoy.</div>
        )}
        {movimientos.map((m) => (
          <HistorialRow key={m.id} movimiento={m} puedeAnular />
        ))}
      </main>
    </>
  );
}
