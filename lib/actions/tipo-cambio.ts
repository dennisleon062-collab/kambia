"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";

export async function registrarTipoCambio(formData: FormData): Promise<{ error: string | null }> {
  const tcUsd = Number(formData.get("tc_usd"));
  const tcEur = Number(formData.get("tc_eur"));

  if (!tcUsd || tcUsd <= 0) return { error: "TC de dólar inválido" };
  if (!tcEur || tcEur <= 0) return { error: "TC de euro inválido" };

  const usuario = await getUsuarioActual();
  const supabase = await createClient();

  const { error } = await supabase.from("tipos_cambio").insert({
    tc_usd: tcUsd,
    tc_eur: tcEur,
    usuario_id: usuario.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/tipo-cambio");
  revalidatePath("/dashboard");
  return { error: null };
}
