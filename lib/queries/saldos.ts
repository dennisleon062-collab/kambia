import { createClient } from "@/lib/supabase/server";
import type { SaldoCuenta } from "@/types/database.types";

// Mismo orden pedido por Milagro que en getCuentas(): Edwin, Andrea, Juan, Dennis.
const ORDEN_TITULARES = ["Edwin", "Andrea", "Juan", "Dennis"];

function ordenTitular(nombre: string): number {
  const titular = nombre.split(" - ")[1];
  if (!titular) return -1;
  const i = ORDEN_TITULARES.indexOf(titular);
  return i === -1 ? ORDEN_TITULARES.length : i;
}

export async function getSaldos(): Promise<SaldoCuenta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_saldos_cuentas").select("*").order("cuenta_tipo");

  if (error) throw error;
  const saldos = data as SaldoCuenta[];

  return saldos.sort((a, b) => {
    if (a.cuenta_tipo !== b.cuenta_tipo) return a.cuenta_tipo < b.cuenta_tipo ? -1 : 1;
    const diff = ordenTitular(a.cuenta_nombre) - ordenTitular(b.cuenta_nombre);
    return diff !== 0 ? diff : a.cuenta_nombre.localeCompare(b.cuenta_nombre);
  });
}

export async function getSaldoCuenta(cuentaId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_saldos_cuentas")
    .select("saldo")
    .eq("cuenta_id", cuentaId)
    .single();

  if (error) throw error;
  return Number(data.saldo);
}
