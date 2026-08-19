"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { anularMovimiento } from "@/lib/actions/anular";
import { formatFechaHora, formatMonto } from "@/lib/format";
import type { MovimientoConCuentas } from "@/lib/queries/movimientos-hoy";

const ETIQUETAS: Record<string, string> = {
  compra_divisa: "Compra de divisa",
  venta_divisa: "Venta de divisa",
  cruce_divisas: "Cruce de divisas",
  traspaso_banco_efectivo: "Traspaso banco / efectivo",
  traspaso_interno: "Traspaso interno",
  venta_monedas_billetes: "Cambio de monedas/billetes",
  pago_deuda_cliente: "Pago de deuda",
  prestamo_a_cliente: "Préstamo a cliente",
  deposito_sin_identificar: "Depósito sin identificar",
  gasto: "Gasto",
  ajuste_correccion: "Ajuste / anulación",
  saldo_inicial: "Saldo inicial",
};

export function HistorialRow({ movimiento, puedeAnular }: { movimiento: MovimientoConCuentas; puedeAnular: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("movimiento_id", movimiento.id);
    startTransition(async () => {
      const res = await anularMovimiento(fd);
      if (res.error) setError(res.error);
      else {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  const esAjuste = movimiento.tipo === "ajuste_correccion";

  return (
    <div className={`card flex flex-col gap-2 ${movimiento.anulado ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">
            {ETIQUETAS[movimiento.tipo] ?? movimiento.tipo}
            {movimiento.anulado && <span className="ml-2 text-xs font-normal text-ink/40">(anulado)</span>}
          </p>
          <p className="text-xs text-ink/50">
            {formatFechaHora(movimiento.fecha_hora)}
            {movimiento.usuarios?.nombre && ` · ${movimiento.usuarios.nombre}`}
            {movimiento.cliente_texto && ` · ${movimiento.cliente_texto}`}
          </p>
          <p className="mt-1 text-[13px] text-ink/60">
            {movimiento.cuenta_origen?.nombre ?? "—"}
            {movimiento.monto_origen !== null && ` (${formatMonto(movimiento.monto_origen, movimiento.moneda_origen ?? "PEN")})`}
            {" → "}
            {movimiento.cuenta_destino?.nombre ?? "—"}
            {movimiento.monto_destino !== null && ` (${formatMonto(movimiento.monto_destino, movimiento.moneda_destino ?? "PEN")})`}
          </p>
          {movimiento.comentario && <p className="text-xs text-ink/40">{movimiento.comentario}</p>}
        </div>

        {puedeAnular && !esAjuste && !movimiento.anulado && !abierto && (
          <button type="button" onClick={() => setAbierto(true)} className="shrink-0 text-xs font-semibold text-rust">
            Anular
          </button>
        )}
      </div>

      {abierto && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-ink/10 pt-3">
          <label className="field-label" htmlFor={`comentario_${movimiento.id}`}>
            ¿Por qué se anula?
          </label>
          <input
            id={`comentario_${movimiento.id}`}
            name="comentario"
            required
            placeholder="Ej. se registró mal el monto"
            className="field-input"
          />
          {error && <p className="text-sm text-rust">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Anulando…" : "Confirmar anulación"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
