"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarDeudasIniciales } from "@/lib/actions/deuda-inicial";

interface Fila {
  id: number;
  cliente: string;
  monto: string;
  moneda: "PEN" | "USD" | "EUR";
}

let contador = 0;
function filaVacia(): Fila {
  contador += 1;
  return { id: contador, cliente: "", monto: "", moneda: "PEN" };
}

export function DeudaInicialForm() {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>([filaVacia(), filaVacia(), filaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function actualizar(id: number, cambios: Partial<Fila>) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const fd = new FormData();
    filas.forEach((f) => {
      fd.append("cliente_texto[]", f.cliente);
      fd.append("monto[]", f.monto);
      fd.append("moneda[]", f.moneda);
    });
    startTransition(async () => {
      const res = await registrarDeudasIniciales(fd);
      if (res.error) setError(res.error);
      else {
        setOk(res.cargadas ?? 0);
        setFilas([filaVacia(), filaVacia(), filaVacia()]);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <p className="text-sm text-ink/60">
        Clientes que ya te debían antes de empezar a usar el sistema. No mueve plata de ninguna
        cuenta, solo registra la deuda para poder llevar los abonos después.
      </p>

      <div className="card flex flex-col gap-2">
        {filas.map((f) => (
          <div key={f.id} className="flex gap-2">
            <input
              placeholder="Cliente"
              className="field-input flex-[1.3]"
              value={f.cliente}
              onChange={(e) => actualizar(f.id, { cliente: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="Monto"
              className="field-input flex-1"
              value={f.monto}
              onChange={(e) => actualizar(f.id, { monto: e.target.value })}
            />
            <select
              className="field-input w-20"
              value={f.moneda}
              onChange={(e) => actualizar(f.id, { moneda: e.target.value as Fila["moneda"] })}
            >
              <option value="PEN">S/</option>
              <option value="USD">US$</option>
              <option value="EUR">€</option>
            </select>
          </div>
        ))}
        <button
          type="button"
          className="self-start text-sm font-semibold text-lime-dark"
          onClick={() => setFilas((fs) => [...fs, filaVacia()])}
        >
          + agregar otra
        </button>
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}
      {ok !== null && <p className="text-sm text-brand-700">{ok} deuda(s) cargada(s) ✓</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar deudas iniciales"}
      </button>
    </form>
  );
}
