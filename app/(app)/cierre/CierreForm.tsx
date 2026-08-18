"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { realizarCierre } from "@/lib/actions/cierres";
import { formatMonto } from "@/lib/format";
import type { CuentaFisicaConSaldo } from "@/lib/queries/cierre-datos";

export function CierreForm({ cuentas }: { cuentas: CuentaFisicaConSaldo[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Record<string, number | null>>({});

  const pendientes = cuentas.filter((c) => !c.yaCerrada);

  function actualizarPreview(cuentaId: string, saldo: number, valor: string) {
    setPreview((p) => ({
      ...p,
      [cuentaId]: valor === "" ? null : Math.round((Number(valor) - saldo) * 100) / 100,
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await realizarCierre(formData);
      if (res.error) setError(res.error);
      else {
        setOk(true);
        router.refresh();
      }
    });
  }

  if (pendientes.length === 0) {
    return <div className="card text-sm text-ink/50">Todas las cuentas físicas ya fueron cerradas hoy.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {pendientes.map((c) => (
        <div key={c.cuenta_id} className="card flex flex-col gap-2">
          <input type="hidden" name="cuenta_id" value={c.cuenta_id} />
          <div className="flex items-center justify-between">
            <span className="font-semibold">{c.cuenta_nombre}</span>
            <span className="font-mono text-sm text-ink/50">
              Sistema: {formatMonto(c.saldo, c.moneda_codigo)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label" htmlFor={`conteo_milagro_${c.cuenta_id}`}>
                Conteo Milagro
              </label>
              <input
                id={`conteo_milagro_${c.cuenta_id}`}
                name={`conteo_milagro_${c.cuenta_id}`}
                type="number"
                step="0.01"
                inputMode="decimal"
                required
                className="field-input"
                onChange={(e) => actualizarPreview(c.cuenta_id, c.saldo, e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor={`conteo_juan_${c.cuenta_id}`}>
                Conteo Juan
              </label>
              <input
                id={`conteo_juan_${c.cuenta_id}`}
                name={`conteo_juan_${c.cuenta_id}`}
                type="number"
                step="0.01"
                inputMode="decimal"
                className="field-input"
              />
            </div>
          </div>
          {preview[c.cuenta_id] !== undefined && preview[c.cuenta_id] !== null && (
            <p className={`text-sm ${preview[c.cuenta_id] === 0 ? "text-brand-700" : "text-amber-700"}`}>
              {preview[c.cuenta_id] === 0
                ? "Cuadra exacto ✓"
                : `Diferencia real: ${formatMonto(preview[c.cuenta_id]!, c.moneda_codigo)}`}
            </p>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-rust">{error}</p>}
      {ok && <p className="text-sm text-brand-700">Cierre confirmado: el día queda bloqueado ✓</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Cerrando…" : "Confirmar cierre del día"}
      </button>
    </form>
  );
}
