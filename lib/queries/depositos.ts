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
  const depositos = data as unknown as Movimiento[];
  if (depositos.length === 0) return depositos;

  const { data: anulaciones } = await supabase
    .from("movimientos")
    .select("movimiento_corregido_id")
    .in(
      "movimiento_corregido_id",
      depositos.map((d) => d.id)
    );
  const idsAnulados = new Set((anulaciones ?? []).map((a) => a.movimiento_corregido_id));

  return depositos.filter((d) => !idsAnulados.has(d.id));
}
