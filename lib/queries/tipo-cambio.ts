import { createClient } from "@/lib/supabase/server";
import type { TipoCambio } from "@/types/database.types";

export async function getTipoCambioVigente(): Promise<{ tc_usd: number; tc_eur: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipos_cambio")
    .select("tc_usd, tc_eur")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getHistorialTipoCambio(limit = 20): Promise<TipoCambio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipos_cambio")
    .select("*, usuarios(nombre)")
    .order("fecha_hora", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as unknown as TipoCambio[];
}
