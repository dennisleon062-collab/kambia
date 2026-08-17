import { createClient } from "@/lib/supabase/server";
import type { Cuenta, Usuario } from "@/types/database.types";

export async function getTrabajador(): Promise<Usuario> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("rol", "trabajador")
    .eq("activo", true)
    .single();

  if (error || !data) throw new Error("No se encontró el usuario trabajador (Juan)");
  return data as Usuario;
}

export async function getCuentas(): Promise<Cuenta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuentas")
    .select("*")
    .eq("activa", true)
    .order("tipo")
    .order("nombre");

  if (error) throw error;
  return data as Cuenta[];
}
