import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { getSaldos } from "@/lib/queries/saldos";
import { Header } from "@/components/Header";
import { SaldoInicialForm } from "./SaldoInicialForm";

export default async function SaldoInicialPage() {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "dueña") redirect("/dashboard");

  const saldos = await getSaldos();

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Saldo inicial" />
      <main className="p-4">
        <SaldoInicialForm saldos={saldos} />
      </main>
    </>
  );
}
