"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { identificarDeposito } from "@/lib/actions/depositos";
import { formatFechaHora, formatMonto } from "@/lib/format";
import type { CuentaPorCobrarConSaldo, Movimiento } from "@/types/database.types";

export function DepositoRow({
  deposito,
  cxcAbiertas,
}: {
  deposito: Movimiento & { cuentas?: { nombre: string } };
  cxcAbiertas: CuentaPorCobrarConSaldo[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"nueva_operacion" | "pago_deuda">("nueva_operacion");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("movimiento_id", deposito.id);
    fd.set("modo", modo);
    startTransition(async () => {
      const res = await identificarDeposito(fd);
      if (res.error) setError(res.error);
      else {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{deposito.cuentas?.nombre ?? "Banco"}</p>
          <p className="text-xs text-neutral-500">{formatFechaHora(deposito.fecha_hora)}</p>
        </div>
        <span className="font-mono text-lg font-semibold">
          {formatMonto(deposito.monto_destino ?? 0, deposito.moneda_destino ?? "PEN")}
        </span>
      </div>
      {deposito.comentario && <p className="text-sm text-neutral-600">{deposito.comentario}</p>}

      {!abierto && (
        <button type="button" className="btn-secondary" onClick={() => setAbierto(true)}>
          Identificar
        </button>
      )}

      {abierto && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <div>
            <label className="field-label" htmlFor={`cliente_${deposito.id}`}>
              Cliente
            </label>
            <input id={`cliente_${deposito.id}`} name="cliente_texto" required className="field-input" />
          </div>
          <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={modo === "nueva_operacion"}
                onChange={() => setModo("nueva_operacion")}
              />
              Operación nueva
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={modo === "pago_deuda"} onChange={() => setModo("pago_deuda")} />
              Pago de deuda existente
            </label>
          </div>
          {modo === "pago_deuda" && (
            <select name="cuenta_por_cobrar_id" required className="field-input">
              <option value="" disabled>
                Seleccione la deuda…
              </option>
              {cxcAbiertas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cliente_texto} — pendiente {c.saldo_pendiente} {c.moneda}
                </option>
              ))}
            </select>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Confirmar"}
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
