import { createClient } from "@/lib/supabase/server";
import type { FondoDiario } from "@/types/database.types";

export async function getFondoDeHoy(usuarioId: string): Promise<FondoDiario | null> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("fondo_diario")
    .select("*")
    .eq("fecha", hoy)
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (error) throw error;
  return data as FondoDiario | null;
}

export async function getHistorialFondo(limit = 15): Promise<FondoDiario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fondo_diario")
    .select("*, usuarios(nombre)")
    .order("fecha", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as unknown as FondoDiario[];
}
