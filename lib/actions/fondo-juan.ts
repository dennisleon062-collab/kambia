"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { getTrabajador } from "@/lib/queries/cuentas";

type Resultado = { error: string | null };

export async function entregarFondo(formData: FormData): Promise<Resultado> {
  const monto = Number(formData.get("monto_entregado"));
  if (!monto || monto <= 0) return { error: "Ingrese un monto válido" };

  await getUsuarioActual(); // solo valida sesión
  const juan = await getTrabajador();
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("fondo_diario").insert({
    fecha: hoy,
    usuario_id: juan.id,
    monto_entregado: monto,
    estado: "pendiente_devolucion",
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya se entregó el fondo de hoy" };
    return { error: error.message };
  }

  // Traspaso interno: sale de bóveda efectivo soles, entra al fondo de Juan
  const [{ data: origen }, { data: destino }] = await Promise.all([
    supabase.from("cuentas").select("*").eq("slug", "boveda_efectivo_pen").single(),
    supabase.from("cuentas").select("*").eq("slug", "fondo_juan_pen").single(),
  ]);
  if (origen && destino) {
    const usuario = await getUsuarioActual();
    await supabase.from("movimientos").insert({
      tipo: "traspaso_interno",
      usuario_id: usuario.id,
      cuenta_origen_id: origen.id,
      moneda_origen: origen.moneda_codigo,
      monto_origen: monto,
      cuenta_destino_id: destino.id,
      moneda_destino: destino.moneda_codigo,
      monto_destino: monto,
      comentario: "Entrega de fondo diario a Juan",
    });
  }

  revalidatePath("/fondo-juan");
  revalidatePath("/bitacora-juan");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function devolverFondo(formData: FormData): Promise<Resultado> {
  const fondoId = String(formData.get("fondo_diario_id"));
  const monto = Number(formData.get("monto_devuelto"));
  if (!fondoId) return { error: "Fondo no encontrado" };
  if (monto === null || Number.isNaN(monto) || monto < 0) return { error: "Ingrese un monto válido" };

  const supabase = await createClient();
  const { data: fondo } = await supabase.from("fondo_diario").select("*").eq("id", fondoId).single();
  if (!fondo) return { error: "Fondo no encontrado" };

  const diferencia = monto - Number(fondo.monto_entregado);
  const estado = diferencia === 0 ? "cuadrado" : "investigando";

  const { error } = await supabase
    .from("fondo_diario")
    .update({ monto_devuelto: monto, estado })
    .eq("id", fondoId);
  if (error) return { error: error.message };

  const [{ data: origen }, { data: destino }] = await Promise.all([
    supabase.from("cuentas").select("*").eq("slug", "fondo_juan_pen").single(),
    supabase.from("cuentas").select("*").eq("slug", "boveda_efectivo_pen").single(),
  ]);
  if (origen && destino && monto > 0) {
    const usuario = await getUsuarioActual();
    await supabase.from("movimientos").insert({
      tipo: "traspaso_interno",
      usuario_id: usuario.id,
      cuenta_origen_id: origen.id,
      moneda_origen: origen.moneda_codigo,
      monto_origen: monto,
      cuenta_destino_id: destino.id,
      moneda_destino: destino.moneda_codigo,
      monto_destino: monto,
      comentario: "Devolución de fondo diario de Juan",
    });
  }

  revalidatePath("/fondo-juan");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function marcarAsumidoPorJuan(formData: FormData): Promise<Resultado> {
  const fondoId = String(formData.get("fondo_diario_id"));
  const observacion = String(formData.get("observacion") ?? "");
  if (!fondoId) return { error: "Fondo no encontrado" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("fondo_diario")
    .update({ estado: "asumido_por_juan", observacion })
    .eq("id", fondoId);
  if (error) return { error: error.message };

  revalidatePath("/fondo-juan");
  return { error: null };
}

export async function registrarOperacionJuan(formData: FormData): Promise<Resultado> {
  const fondoId = String(formData.get("fondo_diario_id"));
  const tipoOperacion = String(formData.get("tipo_operacion") ?? "").trim();
  if (!fondoId) return { error: "No hay fondo activo para hoy" };
  if (!tipoOperacion) return { error: "Describa el tipo de operación" };

  const supabase = await createClient();
  const clienteTexto = (formData.get("cliente_texto") as string) || null;
  const monedaOrigen = (formData.get("moneda_origen") as string) || null;
  const montoOrigen = formData.get("monto_origen") ? Number(formData.get("monto_origen")) : null;
  const monedaDestino = (formData.get("moneda_destino") as string) || null;
  const montoDestino = formData.get("monto_destino") ? Number(formData.get("monto_destino")) : null;
  const tcAplicado = formData.get("tc_aplicado") ? Number(formData.get("tc_aplicado")) : null;
  const comentario = (formData.get("comentario") as string) || null;

  const { error } = await supabase.from("movimientos_juan").insert({
    fondo_diario_id: fondoId,
    cliente_texto: clienteTexto,
    tipo_operacion: tipoOperacion,
    moneda_origen: monedaOrigen,
    monto_origen: montoOrigen,
    moneda_destino: monedaDestino,
    monto_destino: montoDestino,
    tc_aplicado: tcAplicado,
    comentario,
  });

  if (error) return { error: error.message };

  revalidatePath("/bitacora-juan");
  return { error: null };
}
