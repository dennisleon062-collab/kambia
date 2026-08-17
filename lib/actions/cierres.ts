"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { getTcAperturaYCierre } from "@/lib/queries/cierre-datos";

type Resultado = { error: string | null };

export async function realizarCierre(formData: FormData): Promise<Resultado> {
  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  const fecha = new Date().toISOString().slice(0, 10);

  const cuentaIds = formData.getAll("cuenta_id").map(String);
  if (cuentaIds.length === 0) return { error: "No hay cuentas para cerrar" };

  const tc = await getTcAperturaYCierre(fecha);

  const { data: saldos, error: errorSaldos } = await supabase
    .from("v_saldos_cuentas")
    .select("*")
    .in("cuenta_id", cuentaIds);
  if (errorSaldos || !saldos) return { error: errorSaldos?.message ?? "No se pudo leer saldos" };

  const filas = cuentaIds.map((cuentaId) => {
    const saldo = saldos.find((s) => s.cuenta_id === cuentaId);
    const conteoMilagro = formData.get(`conteo_milagro_${cuentaId}`);
    const conteoJuan = formData.get(`conteo_juan_${cuentaId}`);

    const saldoSistema = Number(saldo?.saldo ?? 0);
    const cMilagro = conteoMilagro !== null && conteoMilagro !== "" ? Number(conteoMilagro) : null;
    const cJuan = conteoJuan !== null && conteoJuan !== "" ? Number(conteoJuan) : null;

    const diferenciaReal = cMilagro !== null ? Math.round((cMilagro - saldoSistema) * 100) / 100 : null;

    let variacionCambiaria = 0;
    if (tc && saldo) {
      if (saldo.moneda_codigo === "USD") {
        variacionCambiaria = Math.round(saldoSistema * (tc.cierre.tc_usd - tc.apertura.tc_usd) * 100) / 100;
      } else if (saldo.moneda_codigo === "EUR") {
        variacionCambiaria = Math.round(saldoSistema * (tc.cierre.tc_eur - tc.apertura.tc_eur) * 100) / 100;
      }
    }

    const estado = diferenciaReal === 0 || diferenciaReal === null ? "cuadrado" : "con_diferencia";

    return {
      fecha,
      cuenta_id: cuentaId,
      saldo_sistema: saldoSistema,
      conteo_milagro: cMilagro,
      conteo_juan: cJuan,
      diferencia_real: diferenciaReal,
      variacion_cambiaria: variacionCambiaria,
      estado,
      cerrado: true,
      usuario_id: usuario.id,
    };
  });

  const conConteo = filas.filter((f) => f.conteo_milagro === null);
  if (conConteo.length > 0) {
    return { error: "Falta el conteo de Milagro en una o más cuentas" };
  }

  const { error } = await supabase.from("cierres_diarios").insert(filas);
  if (error) {
    if (error.code === "23505") return { error: "Una o más cuentas ya fueron cerradas hoy" };
    return { error: error.message };
  }

  revalidatePath("/cierre");
  revalidatePath("/dashboard");
  return { error: null };
}
