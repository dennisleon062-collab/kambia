"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import type { MovimientoTipo } from "@/types/database.types";

type Resultado = { error: string | null };

function num(formData: FormData, campo: string): number | null {
  const v = formData.get(campo);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(formData: FormData, campo: string): string | null {
  const v = formData.get(campo);
  if (v === null || v === "") return null;
  return String(v).trim();
}

export async function registrarMovimiento(formData: FormData): Promise<Resultado> {
  const tipo = str(formData, "tipo") as MovimientoTipo | null;
  if (!tipo) return { error: "Seleccione el tipo de operación" };

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  const comentario = str(formData, "comentario");
  const clienteTexto = str(formData, "cliente_texto");

  try {
    switch (tipo) {
      case "compra_divisa":
      case "venta_divisa":
      case "cruce_divisas":
        return await registrarConversion(tipo, formData);

      case "traspaso_banco_efectivo":
      case "traspaso_interno":
        return await registrarTraspaso(tipo, formData);

      case "prestamo_a_cliente":
        return await registrarPrestamoCliente(formData);

      case "pago_deuda_cliente":
        return await registrarPagoDeuda(formData);

      case "deposito_sin_identificar":
        return await registrarDepositoSinIdentificar(formData);

      case "gasto":
        return await registrarGasto(formData);

      case "ajuste_correccion":
        return await registrarAjuste(formData);

      default:
        return { error: "Tipo de operación no soportado" };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }

  async function registrarConversion(
    tipoOp: "compra_divisa" | "venta_divisa" | "cruce_divisas",
    fd: FormData
  ): Promise<Resultado> {
    const cuentaOrigenId = str(fd, "cuenta_origen_id");
    const cuentaDestinoId = str(fd, "cuenta_destino_id");
    const montoOrigen = num(fd, "monto_origen");
    let montoDestino = num(fd, "monto_destino");
    let tcAplicado = num(fd, "tc_aplicado");

    if (!cuentaOrigenId || !cuentaDestinoId) return { error: "Seleccione cuenta origen y destino" };
    if (!montoOrigen || montoOrigen <= 0) return { error: "Ingrese el monto que entrega" };

    const [{ data: cOrigen }, { data: cDestino }] = await Promise.all([
      supabase.from("cuentas").select("*").eq("id", cuentaOrigenId).single(),
      supabase.from("cuentas").select("*").eq("id", cuentaDestinoId).single(),
    ]);
    if (!cOrigen || !cDestino) return { error: "Cuenta no encontrada" };

    // El TC de esta operación es el que se negoció en el momento (escrito a mano
    // o calculado a partir de los dos montos) — nunca se toma de `tipos_cambio`,
    // que es solo la referencia del cierre diario.
    if (!montoDestino || montoDestino <= 0) {
      if (!tcAplicado || tcAplicado <= 0) {
        return { error: "Ingrese el TC de la operación o el monto que recibe" };
      }
      montoDestino = tipoOp === "venta_divisa" ? montoOrigen * tcAplicado : montoOrigen / tcAplicado;
    }
    montoDestino = Math.round(montoDestino * 100) / 100;

    if (!tcAplicado || tcAplicado <= 0) {
      tcAplicado = tipoOp === "venta_divisa" ? montoDestino / montoOrigen : montoOrigen / montoDestino;
    }

    const { error } = await supabase.from("movimientos").insert({
      tipo: tipoOp,
      usuario_id: usuario.id,
      cliente_texto: clienteTexto,
      cuenta_origen_id: cuentaOrigenId,
      moneda_origen: cOrigen.moneda_codigo,
      monto_origen: montoOrigen,
      cuenta_destino_id: cuentaDestinoId,
      moneda_destino: cDestino.moneda_codigo,
      monto_destino: montoDestino,
      tc_aplicado: Math.round(tcAplicado * 10000) / 10000,
      comentario,
    });

    return finalizar(error);
  }

  async function registrarTraspaso(
    tipoOp: "traspaso_banco_efectivo" | "traspaso_interno",
    fd: FormData
  ): Promise<Resultado> {
    const cuentaOrigenId = str(fd, "cuenta_origen_id");
    const cuentaDestinoId = str(fd, "cuenta_destino_id");
    const monto = num(fd, "monto");

    if (!cuentaOrigenId || !cuentaDestinoId) return { error: "Seleccione cuenta origen y destino" };
    if (cuentaOrigenId === cuentaDestinoId) return { error: "Origen y destino no pueden ser la misma cuenta" };
    if (!monto || monto <= 0) return { error: "Ingrese un monto válido" };

    const [{ data: cOrigen }, { data: cDestino }] = await Promise.all([
      supabase.from("cuentas").select("*").eq("id", cuentaOrigenId).single(),
      supabase.from("cuentas").select("*").eq("id", cuentaDestinoId).single(),
    ]);
    if (!cOrigen || !cDestino) return { error: "Cuenta no encontrada" };
    if (cOrigen.moneda_codigo !== cDestino.moneda_codigo) {
      return { error: "Un traspaso debe ser en la misma moneda" };
    }

    const { error } = await supabase.from("movimientos").insert({
      tipo: tipoOp,
      usuario_id: usuario.id,
      cliente_texto: clienteTexto,
      cuenta_origen_id: cuentaOrigenId,
      moneda_origen: cOrigen.moneda_codigo,
      monto_origen: monto,
      cuenta_destino_id: cuentaDestinoId,
      moneda_destino: cDestino.moneda_codigo,
      monto_destino: monto,
      comentario,
    });

    return finalizar(error);
  }

  async function registrarPrestamoCliente(fd: FormData): Promise<Resultado> {
    const cuentaOrigenId = str(fd, "cuenta_origen_id");
    const monto = num(fd, "monto_origen");
    if (!clienteTexto) return { error: "Ingrese el nombre del cliente" };
    if (!cuentaOrigenId) return { error: "Seleccione la cuenta de origen" };
    if (!monto || monto <= 0) return { error: "Ingrese un monto válido" };

    const { data: cOrigen } = await supabase.from("cuentas").select("*").eq("id", cuentaOrigenId).single();
    if (!cOrigen) return { error: "Cuenta no encontrada" };

    const { data: mov, error } = await supabase
      .from("movimientos")
      .insert({
        tipo: "prestamo_a_cliente",
        usuario_id: usuario.id,
        cliente_texto: clienteTexto,
        cuenta_origen_id: cuentaOrigenId,
        moneda_origen: cOrigen.moneda_codigo,
        monto_origen: monto,
        comentario,
      })
      .select()
      .single();
    if (error || !mov) return { error: error?.message ?? "No se pudo registrar" };

    const { data: cxc, error: errorCxc } = await supabase
      .from("cuentas_por_cobrar")
      .insert({
        cliente_texto: clienteTexto,
        moneda: cOrigen.moneda_codigo,
        monto_original: monto,
        movimiento_id: mov.id,
      })
      .select()
      .single();
    if (errorCxc || !cxc) return { error: errorCxc?.message ?? "No se pudo crear la cuenta por cobrar" };

    await supabase.from("movimientos").update({ cuenta_por_cobrar_id: cxc.id }).eq("id", mov.id);

    return finalizar(null);
  }

  async function registrarPagoDeuda(fd: FormData): Promise<Resultado> {
    const cuentaPorCobrarId = str(fd, "cuenta_por_cobrar_id");
    const cuentaDestinoId = str(fd, "cuenta_destino_id");
    const monto = num(fd, "monto_destino");

    if (!cuentaPorCobrarId) return { error: "Seleccione la deuda a abonar" };
    if (!cuentaDestinoId) return { error: "Seleccione dónde entra el pago" };
    if (!monto || monto <= 0) return { error: "Ingrese un monto válido" };

    const { data: cDestino } = await supabase.from("cuentas").select("*").eq("id", cuentaDestinoId).single();
    if (!cDestino) return { error: "Cuenta no encontrada" };

    const { data: cxc } = await supabase
      .from("v_cuentas_por_cobrar_saldo")
      .select("*")
      .eq("id", cuentaPorCobrarId)
      .single();
    if (!cxc) return { error: "Cuenta por cobrar no encontrada" };
    if (monto > Number(cxc.saldo_pendiente) + 0.01) {
      return { error: `El abono (${monto}) supera el saldo pendiente (${cxc.saldo_pendiente})` };
    }

    const { data: mov, error } = await supabase
      .from("movimientos")
      .insert({
        tipo: "pago_deuda_cliente",
        usuario_id: usuario.id,
        cliente_texto: cxc.cliente_texto,
        cuenta_destino_id: cuentaDestinoId,
        moneda_destino: cDestino.moneda_codigo,
        monto_destino: monto,
        cuenta_por_cobrar_id: cuentaPorCobrarId,
        comentario,
      })
      .select()
      .single();
    if (error || !mov) return { error: error?.message ?? "No se pudo registrar" };

    const { error: errorAbono } = await supabase.from("abonos_cxc").insert({
      cuenta_por_cobrar_id: cuentaPorCobrarId,
      monto_abonado: monto,
      movimiento_id: mov.id,
    });
    if (errorAbono) return { error: errorAbono.message };

    return finalizar(null);
  }

  async function registrarDepositoSinIdentificar(fd: FormData): Promise<Resultado> {
    const cuentaDestinoId = str(fd, "cuenta_destino_id");
    const monto = num(fd, "monto_destino");
    if (!cuentaDestinoId) return { error: "Seleccione el banco donde entró el depósito" };
    if (!monto || monto <= 0) return { error: "Ingrese un monto válido" };

    const { data: cDestino } = await supabase.from("cuentas").select("*").eq("id", cuentaDestinoId).single();
    if (!cDestino) return { error: "Cuenta no encontrada" };

    const { error } = await supabase.from("movimientos").insert({
      tipo: "deposito_sin_identificar",
      usuario_id: usuario.id,
      cuenta_destino_id: cuentaDestinoId,
      moneda_destino: cDestino.moneda_codigo,
      monto_destino: monto,
      estado: "pendiente_identificar",
      comentario,
    });

    return finalizar(error);
  }

  async function registrarGasto(fd: FormData): Promise<Resultado> {
    const cuentaOrigenId = str(fd, "cuenta_origen_id");
    const monto = num(fd, "monto_origen");

    if (!cuentaOrigenId) return { error: "Seleccione de dónde sale el gasto" };
    if (!monto || monto <= 0) return { error: "Ingrese un monto válido" };
    if (!comentario) return { error: "Describa el gasto" };

    const { data: cOrigen } = await supabase.from("cuentas").select("*").eq("id", cuentaOrigenId).single();
    if (!cOrigen) return { error: "Cuenta no encontrada" };

    const { error } = await supabase.from("movimientos").insert({
      tipo: "gasto",
      usuario_id: usuario.id,
      cuenta_origen_id: cuentaOrigenId,
      moneda_origen: cOrigen.moneda_codigo,
      monto_origen: monto,
      comentario,
    });

    return finalizar(error);
  }

  async function registrarAjuste(fd: FormData): Promise<Resultado> {
    const movimientoCorregidoId = str(fd, "movimiento_corregido_id");
    const cuentaOrigenId = str(fd, "cuenta_origen_id");
    const cuentaDestinoId = str(fd, "cuenta_destino_id");
    const montoOrigen = num(fd, "monto_origen");
    const montoDestino = num(fd, "monto_destino");

    if (!movimientoCorregidoId) return { error: "Indique qué movimiento corrige" };
    if (!comentario) return { error: "Explique el motivo del ajuste" };
    if (!cuentaOrigenId && !cuentaDestinoId) return { error: "Indique al menos una cuenta afectada" };

    const [cOrigen, cDestino] = await Promise.all([
      cuentaOrigenId
        ? supabase.from("cuentas").select("*").eq("id", cuentaOrigenId).single().then((r) => r.data)
        : null,
      cuentaDestinoId
        ? supabase.from("cuentas").select("*").eq("id", cuentaDestinoId).single().then((r) => r.data)
        : null,
    ]);

    const { error } = await supabase.from("movimientos").insert({
      tipo: "ajuste_correccion",
      usuario_id: usuario.id,
      cliente_texto: clienteTexto,
      cuenta_origen_id: cuentaOrigenId,
      moneda_origen: cOrigen?.moneda_codigo ?? null,
      monto_origen: montoOrigen,
      cuenta_destino_id: cuentaDestinoId,
      moneda_destino: cDestino?.moneda_codigo ?? null,
      monto_destino: montoDestino,
      movimiento_corregido_id: movimientoCorregidoId,
      comentario,
    });

    return finalizar(error);
  }

  function finalizar(error: { message: string } | null): Resultado {
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/transacciones/nueva");
    revalidatePath("/depositos");
    return { error: null };
  }
}
