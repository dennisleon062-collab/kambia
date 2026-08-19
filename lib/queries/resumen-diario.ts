import { createClient } from "@/lib/supabase/server";
import type { ResumenDiario } from "@/types/database.types";

export async function getResumenDeFecha(fecha: string): Promise<ResumenDiario | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("resumen_diario").select("*").eq("fecha", fecha).maybeSingle();
  // Tolera que la tabla aún no exista si la migración 0008 no se corrió todavía,
  // para no tumbar el dashboard entero mientras se aplica el SQL pendiente.
  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }
  return data as ResumenDiario | null;
}

export interface GastoDia {
  moneda: string;
  monto: number;
}

export async function getGastosDeFecha(fecha: string): Promise<GastoDia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimientos")
    .select("id, moneda_origen, monto_origen")
    .eq("tipo", "gasto")
    .eq("fecha_contable", fecha);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const { data: anulaciones } = await supabase
    .from("movimientos")
    .select("movimiento_corregido_id")
    .in(
      "movimiento_corregido_id",
      data.map((m) => m.id)
    );
  const idsAnulados = new Set((anulaciones ?? []).map((a) => a.movimiento_corregido_id));

  return data
    .filter((m) => !idsAnulados.has(m.id))
    .map((m) => ({ moneda: m.moneda_origen as string, monto: Number(m.monto_origen) }));
}
