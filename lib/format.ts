import type { SaldoCuenta } from "@/types/database.types";

export function convertirASoles(
  monto: number,
  moneda: string,
  tc: { tc_usd: number; tc_eur: number } | null
): number {
  if (moneda === "USD" && tc) return monto * tc.tc_usd;
  if (moneda === "EUR" && tc) return monto * tc.tc_eur;
  return monto;
}

export function calcularTotalEnSoles(
  saldos: SaldoCuenta[],
  tc: { tc_usd: number; tc_eur: number } | null
): number {
  const total = saldos.reduce((acc, s) => acc + convertirASoles(s.saldo, s.moneda_codigo, tc), 0);
  return Math.round(total * 100) / 100;
}

// El total "de la hoja de cuenta": todo lo que tiene en cuentas reales más lo
// que le deben los clientes (un préstamo o un pago de deuda no debe mover
// este total, solo trasladar entre "cuenta" y "por cobrar").
export function calcularTotalConDeudas(
  saldos: SaldoCuenta[],
  cxcAbiertas: { moneda: string; saldo_pendiente: number }[],
  tc: { tc_usd: number; tc_eur: number } | null
): number {
  const totalCuentas = calcularTotalEnSoles(saldos, tc);
  const totalDeudas = cxcAbiertas.reduce((acc, c) => acc + convertirASoles(c.saldo_pendiente, c.moneda, tc), 0);
  return Math.round((totalCuentas + totalDeudas) * 100) / 100;
}

const SIMBOLOS: Record<string, string> = {
  PEN: "S/",
  USD: "US$",
  EUR: "€",
  MONEDAS: "S/",
};

export function formatMonto(monto: number, moneda: string): string {
  const simbolo = SIMBOLOS[moneda] ?? "";
  return `${simbolo} ${monto.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatFechaHora(iso: string): string {
  // Zona fija (America/Lima) para que el servidor y el navegador calculen la
  // misma hora sin importar en qué zona horaria corra cada uno, y hour12:false
  // para evitar el mismatch de hidratación que causa el espacio de "a. m./p. m."
  // (Node y el navegador lo renderizan distinto para el mismo locale).
  const partes = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${get("day")}/${get("month")} ${get("hour")}:${get("minute")}`;
}
