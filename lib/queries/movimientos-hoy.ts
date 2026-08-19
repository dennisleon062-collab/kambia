import { createClient } from "@/lib/supabase/server";
import type { Movimiento } from "@/types/database.types";

export interface MovimientoConCuentas extends Movimiento {
  cuenta_origen?: { nombre: string } | null;
  cuenta_destino?: { nombre: string } | null;
  usuarios?: { nombre: string } | null;
  anulado?: boolean;
}

export async function getMovimientosDeHoy(): Promise<MovimientoConCuentas[]> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("movimientos")
    .select(
      "*, cuenta_origen:cuenta_origen_id(nombre), cuenta_destino:cuenta_destino_id(nombre), usuarios(nombre)"
    )
    .eq("fecha_contable", hoy)
    .order("fecha_hora", { ascending: false });

  if (error) throw error;

  const movimientos = data as unknown as MovimientoConCuentas[];

  const { data: anulaciones } = await supabase
    .from("movimientos")
    .select("movimiento_corregido_id")
    .not("movimiento_corregido_id", "is", null);

  const idsAnulados = new Set((anulaciones ?? []).map((a) => a.movimiento_corregido_id));

  return movimientos.map((m) => ({ ...m, anulado: idsAnulados.has(m.id) }));
}
