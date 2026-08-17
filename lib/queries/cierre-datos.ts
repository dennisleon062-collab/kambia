import { createClient } from "@/lib/supabase/server";
import type { SaldoCuenta } from "@/types/database.types";

export interface CuentaFisicaConSaldo extends SaldoCuenta {
  yaCerrada: boolean;
}

export async function getCuentasFisicasConSaldo(fecha: string): Promise<CuentaFisicaConSaldo[]> {
  const supabase = await createClient();
  const { data: saldos, error } = await supabase
    .from("v_saldos_cuentas")
    .select("*")
    .in("cuenta_tipo", ["efectivo_boveda", "fondo_juan"])
    .order("cuenta_nombre");
  if (error) throw error;

  const { data: cierres } = await supabase
    .from("cierres_diarios")
    .select("cuenta_id, cerrado")
    .eq("fecha", fecha);

  const cerradas = new Set((cierres ?? []).filter((c) => c.cerrado).map((c) => c.cuenta_id));

  return (saldos as SaldoCuenta[]).map((s) => ({ ...s, yaCerrada: cerradas.has(s.cuenta_id) }));
}

export async function getTcAperturaYCierre(
  fecha: string
): Promise<{ apertura: { tc_usd: number; tc_eur: number }; cierre: { tc_usd: number; tc_eur: number } } | null> {
  const supabase = await createClient();

  const { data: cierre } = await supabase
    .from("tipos_cambio")
    .select("tc_usd, tc_eur")
    .order("fecha_hora", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cierre) return null;

  const inicioDelDia = `${fecha}T00:00:00.000Z`;
  const { data: primeraDelDia } = await supabase
    .from("tipos_cambio")
    .select("tc_usd, tc_eur")
    .gte("fecha_hora", inicioDelDia)
    .order("fecha_hora", { ascending: true })
    .limit(1)
    .maybeSingle();

  let apertura = primeraDelDia;
  if (!apertura) {
    const { data: previaAlDia } = await supabase
      .from("tipos_cambio")
      .select("tc_usd, tc_eur")
      .lt("fecha_hora", inicioDelDia)
      .order("fecha_hora", { ascending: false })
      .limit(1)
      .maybeSingle();
    apertura = previaAlDia ?? cierre;
  }

  return { apertura, cierre };
}
