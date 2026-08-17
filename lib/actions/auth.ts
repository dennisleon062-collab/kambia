"use server";

import { createClient } from "@/lib/supabase/server";

const USUARIO_A_EMAIL: Record<string, string> = {
  milagro: "milagro@kambia.local",
  juan: "juan@kambia.local",
};

export async function iniciarSesion(
  usuario: "milagro" | "juan",
  password: string
): Promise<{ error: string | null }> {
  const email = USUARIO_A_EMAIL[usuario];
  if (!email) return { error: "Usuario inválido" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Contraseña incorrecta" };
  return { error: null };
}
