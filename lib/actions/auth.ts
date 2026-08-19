"use server";

import { createClient } from "@/lib/supabase/server";

const EMAIL_MILAGRO = "milagro@kambia.local";

export async function iniciarSesion(password: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: EMAIL_MILAGRO, password });

  if (error) return { error: "Contraseña incorrecta" };
  return { error: null };
}
