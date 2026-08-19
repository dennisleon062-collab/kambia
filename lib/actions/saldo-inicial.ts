"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";

type Resultado = { error: string | null; cargados?: number };

export async function registrarSaldosIniciales(formData: FormData): Promise<Resultado> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "dueña") {
    return { error: "Solo la dueña puede cargar saldos iniciales" };
  }

  const supabase = await createClient();
  const { data: cuentas, error: errorCuentas } = await supabase
    .from("cuentas")
    .select("id, moneda_codigo")
    .eq("activa", true);
  if (errorCuentas || !cuentas) return { error: errorCuentas?.message ?? "No se pudieron leer las cuentas" };

  const filas = cuentas
    .map((c) => {
      const monto = formData.get(`monto_${c.id}`);
      const n = monto !== null && monto !== "" ? Number(monto) : 0;
      return { cuenta: c, monto: n };
    })
    .filter((f) => Number.isFinite(f.monto) && f.monto > 0)
    .map((f) => ({
      tipo: "saldo_inicial" as const,
      usuario_id: usuario.id,
      cuenta_destino_id: f.cuenta.id,
      moneda_destino: f.cuenta.moneda_codigo,
      monto_destino: f.monto,
      comentario: "Carga de saldo inicial",
    }));

  if (filas.length === 0) return { error: "Ingrese al menos un monto" };

  const { error } = await supabase.from("movimientos").insert(filas);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/saldo-inicial");
  return { error: null, cargados: filas.length };
}
