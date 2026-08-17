"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { entregarFondo, devolverFondo, marcarAsumidoPorJuan } from "@/lib/actions/fondo-juan";
import type { FondoDiario } from "@/types/database.types";

function useAccion(accion: (fd: FormData) => Promise<{ error: string | null }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ejecutar(formData: FormData, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await accion(formData);
      if (res.error) setError(res.error);
      else {
        onOk?.();
        router.refresh();
      }
    });
  }

  return { ejecutar, error, pending };
}

export function EntregarFondoForm() {
  const { ejecutar, error, pending } = useAccion(entregarFondo);

  return (
    <form
      className="card flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(new FormData(e.currentTarget), () => (e.target as HTMLFormElement).reset());
      }}
    >
      <h2 className="font-semibold">Entregar fondo de hoy a Juan</h2>
      <div>
        <label className="field-label" htmlFor="monto_entregado">
          Monto entregado (S/)
        </label>
        <input
          id="monto_entregado"
          name="monto_entregado"
          type="number"
          step="0.01"
          inputMode="decimal"
          required
          className="field-input"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Entregar fondo"}
      </button>
    </form>
  );
}

export function DevolverFondoForm({ fondo }: { fondo: FondoDiario }) {
  const { ejecutar, error, pending } = useAccion(devolverFondo);
  const asumido = useAccion(marcarAsumidoPorJuan);

  return (
    <div className="card flex flex-col gap-3">
      <h2 className="font-semibold">Fondo de hoy</h2>
      <p className="text-sm text-neutral-600">
        Entregado: <span className="font-mono font-semibold">S/ {fondo.monto_entregado}</span>
      </p>

      {fondo.estado === "pendiente_devolucion" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("fondo_diario_id", fondo.id);
            ejecutar(fd);
          }}
        >
          <div>
            <label className="field-label" htmlFor="monto_devuelto">
              Monto devuelto al cierre (S/)
            </label>
            <input
              id="monto_devuelto"
              name="monto_devuelto"
              type="number"
              step="0.01"
              inputMode="decimal"
              required
              className="field-input"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Guardando…" : "Registrar devolución"}
          </button>
        </form>
      )}

      {fondo.estado !== "pendiente_devolucion" && (
        <>
          <p className="text-sm text-neutral-600">
            Devuelto: <span className="font-mono font-semibold">S/ {fondo.monto_devuelto}</span>
          </p>
          <EstadoBadge estado={fondo.estado} diferencia={fondo.diferencia} />

          {fondo.estado === "investigando" && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("fondo_diario_id", fondo.id);
                asumido.ejecutar(fd);
              }}
            >
              <label className="field-label" htmlFor="observacion">
                Si no se resuelve, Juan la asume de su ganancia del día
              </label>
              <input id="observacion" name="observacion" placeholder="Observación" className="field-input" />
              {asumido.error && <p className="text-sm text-red-600">{asumido.error}</p>}
              <button type="submit" className="btn-secondary" disabled={asumido.pending}>
                {asumido.pending ? "Guardando…" : "Marcar como asumido por Juan"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function EstadoBadge({ estado, diferencia }: { estado: string; diferencia: number }) {
  const estilos: Record<string, string> = {
    cuadrado: "bg-brand-100 text-brand-700",
    investigando: "bg-amber-100 text-amber-800",
    asumido_por_juan: "bg-neutral-200 text-neutral-700",
  };
  const textos: Record<string, string> = {
    cuadrado: "Cuadrado",
    investigando: "Investigando diferencia",
    asumido_por_juan: "Asumido por Juan",
  };
  return (
    <span className={`inline-block w-fit rounded-full px-3 py-1 text-sm font-medium ${estilos[estado]}`}>
      {textos[estado]} {diferencia !== 0 && `(S/ ${diferencia.toFixed(2)})`}
    </span>
  );
}
