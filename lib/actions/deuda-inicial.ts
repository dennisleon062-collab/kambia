"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";

type Resultado = { error: string | null; cargadas?: number };

/**
 * Carga cuentas por cobrar que ya existían antes de usar el sistema.
 * No genera ningún movimiento de caja (movimiento_id queda null) porque
 * el préstamo ya se dio en el pasado, fuera del sistema.
 */
export async function registrarDeudasIniciales(formData: FormData): Promise<Resultado> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "dueña") return { error: "Solo la dueña puede cargar deudas iniciales" };

  const clientes = formData.getAll("cliente_texto[]").map(String);
  const montos = formData.getAll("monto[]").map(String);
  const monedas = formData.getAll("moneda[]").map(String);

  const filas = clientes
    .map((cliente, i) => ({
      cliente_texto: cliente.trim(),
      moneda: monedas[i] || "PEN",
      monto_original: Number(montos[i]),
    }))
    .filter((f) => f.cliente_texto && Number.isFinite(f.monto_original) && f.monto_original > 0);

  if (filas.length === 0) return { error: "Ingrese al menos una deuda con cliente y monto" };

  const supabase = await createClient();
  const { error } = await supabase.from("cuentas_por_cobrar").insert(filas);
  if (error) return { error: error.message };

  revalidatePath("/deuda-inicial");
  revalidatePath("/transacciones/nueva");
  return { error: null, cargadas: filas.length };
}
