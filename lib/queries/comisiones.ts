import { createClient } from "@/lib/supabase/server";

export async function getTasaComision(tipo: "monedas" | "billetes"): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comisiones_config")
    .select("tasa_por_100")
    .eq("tipo", tipo)
    .lte("vigente_desde", new Date().toISOString())
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? Number(data.tasa_por_100) : 0;
}

export function calcularComision(monto: number, tasaPor100: number): number {
  return Math.round(((monto / 100) * tasaPor100) * 100) / 100;
}
