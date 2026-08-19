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
