"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarSaldosIniciales } from "@/lib/actions/saldo-inicial";
import { formatMonto } from "@/lib/format";
import type { SaldoCuenta } from "@/types/database.types";

const TITULOS_TIPO: Record<string, string> = {
  banco: "Bancos",
  efectivo_boveda: "Efectivo en bóveda",
  fondo_juan: "Fondo de Juan",
};

export function SaldoInicialForm({ saldos }: { saldos: SaldoCuenta[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const grupos = new Map<string, SaldoCuenta[]>();
  for (const s of saldos) {
    const lista = grupos.get(s.cuenta_tipo) ?? [];
    lista.push(s);
    grupos.set(s.cuenta_tipo, lista);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registrarSaldosIniciales(formData);
      if (res.error) setError(res.error);
      else {
        setOk(res.cargados ?? 0);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <p className="text-sm text-ink/60">
        Escribe cuánto dinero hay ahora mismo en cada cuenta. Se registra como un movimiento de
        saldo inicial, no como un total a mano — queda en el historial igual que cualquier otro
        movimiento. Deja en blanco las cuentas que empiezan en cero.
      </p>

      {Array.from(grupos.entries()).map(([tipo, cuentas]) => (
        <section key={tipo} className="rounded-2xl bg-white px-4 py-1 shadow-sm">
          <p className="border-b border-[#f0f0ea] py-2.5 text-[13px] font-semibold">
            {TITULOS_TIPO[tipo] ?? tipo}
          </p>
          <div className="divide-y divide-[#f0f0ea]">
            {cuentas.map((c) => (
              <div key={c.cuenta_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{c.cuenta_nombre}</p>
                  {c.saldo !== 0 && (
                    <p className="text-[11px] text-ink/40">ya tiene {formatMonto(c.saldo, c.moneda_codigo)}</p>
                  )}
                </div>
                <input
                  name={`monto_${c.cuenta_id}`}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-32 rounded-lg border border-ink/15 px-2 py-1.5 text-right font-num text-sm"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {error && <p className="text-sm text-rust">{error}</p>}
      {ok !== null && <p className="text-sm text-brand-700">{ok} cuenta(s) cargada(s) ✓</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar saldos iniciales"}
      </button>
    </form>
  );
}
