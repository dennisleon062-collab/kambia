import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { Header } from "@/components/Header";
import { DeudaInicialForm } from "./DeudaInicialForm";

export default async function DeudaInicialPage() {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "dueña") redirect("/dashboard");

  return (
    <>
      <Header nombre={usuario.nombre} titulo="Deudas iniciales" />
      <main className="p-4">
        <DeudaInicialForm />
      </main>
    </>
  );
}
