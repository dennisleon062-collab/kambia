import { createClient } from "@/lib/supabase/server";
import type { CuentaPorCobrarConSaldo } from "@/types/database.types";

export async function getCuentasPorCobrarAbiertas(): Promise<CuentaPorCobrarConSaldo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_cuentas_por_cobrar_saldo")
    .select("*")
    .gt("saldo_pendiente", 0)
    .order("fecha_operacion", { ascending: false });

  if (error) throw error;
  return data as CuentaPorCobrarConSaldo[];
}
