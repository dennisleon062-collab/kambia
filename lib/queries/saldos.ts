import { createClient } from "@/lib/supabase/server";
import type { SaldoCuenta } from "@/types/database.types";

export async function getSaldos(): Promise<SaldoCuenta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_saldos_cuentas")
    .select("*")
    .order("cuenta_tipo")
    .order("cuenta_nombre");

  if (error) throw error;
  return data as SaldoCuenta[];
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
