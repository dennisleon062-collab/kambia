"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";

type Resultado = { error: string | null };

/**
 * Anula un movimiento creando un ajuste_correccion que invierte exactamente
 * sus cuentas y montos (origen <-> destino), sin necesidad de que el usuario
 * escriba el UUID a mano ni recalcule nada.
 */
export async function anularMovimiento(formData: FormData): Promise<Resultado> {
  const movimientoId = String(formData.get("movimiento_id") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim();

  if (!movimientoId) return { error: "Movimiento no encontrado" };
  if (!comentario) return { error: "Explique por qué se anula" };

  const usuario = await getUsuarioActual();
  const supabase = await createClient();

  const { data: original, error: errorOriginal } = await supabase
    .from("movimientos")
    .select("*")
    .eq("id", movimientoId)
    .single();
  if (errorOriginal || !original) return { error: "Movimiento no encontrado" };

  if (original.tipo === "ajuste_correccion") {
    return { error: "No se puede anular un ajuste; anule el movimiento original" };
  }

  const { data: yaAnulado } = await supabase
    .from("movimientos")
    .select("id")
    .eq("movimiento_corregido_id", movimientoId)
    .maybeSingle();
  if (yaAnulado) return { error: "Este movimiento ya fue anulado" };

  const { error } = await supabase.from("movimientos").insert({
    tipo: "ajuste_correccion",
    usuario_id: usuario.id,
    cliente_texto: original.cliente_texto,
    cuenta_origen_id: original.cuenta_destino_id,
    moneda_origen: original.moneda_destino,
    monto_origen: original.monto_destino,
    cuenta_destino_id: original.cuenta_origen_id,
    moneda_destino: original.moneda_origen,
    monto_destino: original.monto_origen,
    movimiento_corregido_id: movimientoId,
    comentario: `Anulación: ${comentario}`,
  });
  if (error) return { error: error.message };

  revalidatePath("/historial");
  revalidatePath("/depositos");
  revalidatePath("/dashboard");
  return { error: null };
}
