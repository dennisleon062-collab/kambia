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
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
