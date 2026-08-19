"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { getSaldos } from "@/lib/queries/saldos";
import { getTipoCambioVigente } from "@/lib/queries/tipo-cambio";
import { getCuentasPorCobrarAbiertas } from "@/lib/queries/cxc";
import { calcularTotalConDeudas } from "@/lib/format";

type Resultado = { error: string | null };

export async function registrarGananciaDelDia(formData: FormData): Promise<Resultado> {
  const gananciaRaw = formData.get("ganancia");
  const ganancia = Number(gananciaRaw);
  if (gananciaRaw === null || gananciaRaw === "" || !Number.isFinite(ganancia)) {
    return { error: "Ingrese la ganancia de hoy (puede ser 0)" };
  }
  const comentario = String(formData.get("comentario") ?? "").trim() || null;

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [saldos, tc, cxcAbiertas] = await Promise.all([
    getSaldos(),
    getTipoCambioVigente(),
    getCuentasPorCobrarAbiertas(),
  ]);
  const totalSoles = calcularTotalConDeudas(saldos, cxcAbiertas, tc);

  const { error } = await supabase.from("resumen_diario").upsert(
    {
      fecha: hoy,
      ganancia,
      total_soles: totalSoles,
      comentario,
      usuario_id: usuario.id,
    },
    { onConflict: "fecha" }
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}
