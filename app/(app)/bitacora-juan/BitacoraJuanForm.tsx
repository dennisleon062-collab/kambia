"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarOperacionJuan } from "@/lib/actions/fondo-juan";
import { encolar } from "@/lib/offlineQueue";

export function BitacoraJuanForm({ fondoDiarioId }: { fondoDiarioId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const formData = new FormData(e.currentTarget);
    formData.set("fondo_diario_id", fondoDiarioId);
    const campos: Record<string, string> = {};
    formData.forEach((v, k) => (campos[k] = String(v)));

    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        encolar(campos, `Bitácora Juan — ${campos.cliente_texto ?? campos.tipo_operacion}`);
        setOk(true);
        (e.target as HTMLFormElement).reset();
        return;
      }
      try {
        const res = await registrarOperacionJuan(formData);
        if (res.error) {
          setError(res.error);
          return;
        }
        setOk(true);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } catch {
        encolar(campos, `Bitácora Juan — ${campos.cliente_texto ?? campos.tipo_operacion}`);
        setOk(true);
        (e.target as HTMLFormElement).reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <h2 className="font-semibold">Registrar operación (informativo)</h2>
      <div>
        <label className="field-label" htmlFor="tipo_operacion">
          Tipo de operación
        </label>
        <input id="tipo_operacion" name="tipo_operacion" required className="field-input" placeholder="Ej. compra USD" />
      </div>
      <div>
        <label className="field-label" htmlFor="cliente_texto">
          Cliente (opcional)
        </label>
        <input id="cliente_texto" name="cliente_texto" className="field-input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="field-label" htmlFor="moneda_origen">
            Moneda origen
          </label>
          <select id="moneda_origen" name="moneda_origen" className="field-input">
            <option value="">—</option>
            <option value="PEN">PEN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="monto_origen">
            Monto origen
          </label>
          <input id="monto_origen" name="monto_origen" type="number" step="0.01" inputMode="decimal" className="field-input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="field-label" htmlFor="moneda_destino">
            Moneda destino
          </label>
          <select id="moneda_destino" name="moneda_destino" className="field-input">
            <option value="">—</option>
            <option value="PEN">PEN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="monto_destino">
            Monto destino
          </label>
          <input id="monto_destino" name="monto_destino" type="number" step="0.01" inputMode="decimal" className="field-input" />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="tc_aplicado">
          TC aplicado (opcional)
        </label>
        <input id="tc_aplicado" name="tc_aplicado" type="number" step="0.0001" inputMode="decimal" className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="comentario">
          Comentario
        </label>
        <input id="comentario" name="comentario" className="field-input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-brand-700">Registrado ✓</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Registrar"}
      </button>
    </form>
  );
}
