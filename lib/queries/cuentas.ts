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

// Orden pedido por Milagro: primero las cuentas de Edwin, luego Andrea, Juan, Dennis.
const ORDEN_TITULARES = ["Edwin", "Andrea", "Juan", "Dennis"];

function ordenTitular(nombre: string): number {
  const titular = nombre.split(" - ")[1];
  if (!titular) return -1; // cuentas sin titular (bóveda, fondo) van antes
  const i = ORDEN_TITULARES.indexOf(titular);
  return i === -1 ? ORDEN_TITULARES.length : i;
}

export async function getCuentas(): Promise<Cuenta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cuentas").select("*").eq("activa", true).order("tipo");

  if (error) throw error;
  const cuentas = data as Cuenta[];

  return cuentas.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo < b.tipo ? -1 : 1;
    const diff = ordenTitular(a.nombre) - ordenTitular(b.nombre);
    return diff !== 0 ? diff : a.nombre.localeCompare(b.nombre);
  });
}
