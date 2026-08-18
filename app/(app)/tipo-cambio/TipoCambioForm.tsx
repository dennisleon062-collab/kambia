"use client";

import { useState, useTransition } from "react";
import { registrarTipoCambio } from "@/lib/actions/tipo-cambio";

export function TipoCambioForm({
  tcUsdActual,
  tcEurActual,
}: {
  tcUsdActual: number | null;
  tcEurActual: number | null;
}) {
  const [tcUsd, setTcUsd] = useState(tcUsdActual?.toString() ?? "");
  const [tcEur, setTcEur] = useState(tcEurActual?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registrarTipoCambio(formData);
      if (res.error) setError(res.error);
      else setOk(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <div>
        <label className="field-label" htmlFor="tc_usd">
          Tipo de cambio Dólar (USD)
        </label>
        <input
          id="tc_usd"
          name="tc_usd"
          type="number"
          step="0.0001"
          inputMode="decimal"
          required
          className="field-input"
          value={tcUsd}
          onChange={(e) => setTcUsd(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="tc_eur">
          Tipo de cambio Euro (EUR)
        </label>
        <input
          id="tc_eur"
          name="tc_eur"
          type="number"
          step="0.0001"
          inputMode="decimal"
          required
          className="field-input"
          value={tcEur}
          onChange={(e) => setTcEur(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-rust">{error}</p>}
      {ok && <p className="text-sm text-brand-700">Tipo de cambio actualizado ✓</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Actualizar tipo de cambio"}
      </button>
    </form>
  );
}
