"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";

type Resultado = { error: string | null };

export async function identificarDeposito(formData: FormData): Promise<Resultado> {
  const movimientoId = String(formData.get("movimiento_id"));
  const clienteTexto = String(formData.get("cliente_texto") ?? "").trim();
  const modo = String(formData.get("modo")); // "nueva_operacion" | "pago_deuda"
  const cuentaPorCobrarId = (formData.get("cuenta_por_cobrar_id") as string) || null;

  if (!movimientoId) return { error: "Depósito no encontrado" };
  if (!clienteTexto) return { error: "Ingrese el cliente identificado" };

  const usuario = await getUsuarioActual();
  if (usuario.rol !== "dueña") {
    return { error: "Solo la dueña puede identificar depósitos (requiere actualizar el registro)" };
  }

  const supabase = await createClient();
  const { data: mov, error: errorMov } = await supabase.from("movimientos").select("*").eq("id", movimientoId).single();
  if (errorMov || !mov) return { error: "Depósito no encontrado" };

  if (modo === "pago_deuda") {
    if (!cuentaPorCobrarId) return { error: "Seleccione la deuda a la que corresponde" };

    const { data: cxc } = await supabase
      .from("v_cuentas_por_cobrar_saldo")
      .select("*")
      .eq("id", cuentaPorCobrarId)
      .single();
    if (!cxc) return { error: "Cuenta por cobrar no encontrada" };

    const { error: errorAbono } = await supabase.from("abonos_cxc").insert({
      cuenta_por_cobrar_id: cuentaPorCobrarId,
      monto_abonado: mov.monto_destino,
      movimiento_id: mov.id,
    });
    if (errorAbono) return { error: errorAbono.message };

    const { error } = await supabase
      .from("movimientos")
      .update({ cliente_texto: clienteTexto, estado: "identificado", cuenta_por_cobrar_id: cuentaPorCobrarId })
      .eq("id", movimientoId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("movimientos")
      .update({ cliente_texto: clienteTexto, estado: "identificado" })
      .eq("id", movimientoId);
    if (error) return { error: error.message };
  }

  revalidatePath("/depositos");
  revalidatePath("/dashboard");
  return { error: null };
}
