"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { identificarDeposito } from "@/lib/actions/depositos";
import { anularMovimiento } from "@/lib/actions/anular";
import { formatFechaHora, formatMonto } from "@/lib/format";
import type { CuentaPorCobrarConSaldo, Movimiento } from "@/types/database.types";

type Vista = "cerrado" | "identificar" | "anular";

export function DepositoRow({
  deposito,
  cxcAbiertas,
}: {
  deposito: Movimiento & { cuentas?: { nombre: string } };
  cxcAbiertas: CuentaPorCobrarConSaldo[];
}) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("cerrado");
  const [modo, setModo] = useState<"nueva_operacion" | "pago_deuda">("nueva_operacion");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleIdentificar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("movimiento_id", deposito.id);
    fd.set("modo", modo);
    startTransition(async () => {
      const res = await identificarDeposito(fd);
      if (res.error) setError(res.error);
      else {
        setVista("cerrado");
        router.refresh();
      }
    });
  }

  function handleAnular(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("movimiento_id", deposito.id);
    startTransition(async () => {
      const res = await anularMovimiento(fd);
      if (res.error) setError(res.error);
      else {
        setVista("cerrado");
        router.refresh();
      }
    });
  }

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{deposito.cuentas?.nombre ?? "Banco"}</p>
          <p className="text-xs text-ink/50">{formatFechaHora(deposito.fecha_hora)}</p>
        </div>
        <span className="font-num text-lg font-semibold">
          {formatMonto(deposito.monto_destino ?? 0, deposito.moneda_destino ?? "PEN")}
        </span>
      </div>
      {deposito.comentario && <p className="text-sm text-ink/60">{deposito.comentario}</p>}

      {vista === "cerrado" && (
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => setVista("identificar")}>
            Identificar
          </button>
          <button
            type="button"
            className="rounded-2xl border border-rust/30 px-4 py-4 text-sm font-semibold text-rust"
            onClick={() => setVista("anular")}
          >
            Anular
          </button>
        </div>
      )}

      {vista === "identificar" && (
        <form onSubmit={handleIdentificar} className="flex flex-col gap-2 border-t border-ink/10 pt-3">
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
                  {c.cliente_texto} (pendiente {c.saldo_pendiente} {c.moneda})
                </option>
              ))}
            </select>
          )}
          {error && <p className="text-sm text-rust">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Confirmar"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setVista("cerrado")}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {vista === "anular" && (
        <form onSubmit={handleAnular} className="flex flex-col gap-2 border-t border-ink/10 pt-3">
          <label className="field-label" htmlFor={`motivo_${deposito.id}`}>
            ¿Por qué se anula este depósito?
          </label>
          <input
            id={`motivo_${deposito.id}`}
            name="comentario"
            required
            placeholder="Ej. nunca llegó, se registró dos veces"
            className="field-input"
          />
          <p className="text-xs text-ink/40">
            Se descuenta del banco lo mismo que había entrado. El registro original queda, solo se
            anota la anulación al lado.
          </p>
          {error && <p className="text-sm text-rust">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-rust py-4 text-center text-sm font-bold text-paper disabled:opacity-50"
              disabled={pending}
            >
              {pending ? "Anulando…" : "Confirmar anulación"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setVista("cerrado")}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
