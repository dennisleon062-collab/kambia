import { createClient } from "@/lib/supabase/server";
import type { CierreDiario } from "@/types/database.types";

export async function getCierresDeFecha(fecha: string): Promise<CierreDiario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cierres_diarios")
    .select("*, cuentas:cuenta_id(nombre, moneda_codigo)")
    .eq("fecha", fecha);

  if (error) throw error;
  return data as unknown as CierreDiario[];
}
