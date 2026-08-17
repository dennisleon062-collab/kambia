import { createClient } from "@/lib/supabase/server";
import type { Movimiento } from "@/types/database.types";

export async function getDepositosPendientes(): Promise<Movimiento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos")
    .select("*, cuentas:cuenta_destino_id(nombre)")
    .eq("tipo", "deposito_sin_identificar")
    .eq("estado", "pendiente_identificar")
    .order("fecha_hora", { ascending: false });

  if (error) throw error;
  return data as unknown as Movimiento[];
}
