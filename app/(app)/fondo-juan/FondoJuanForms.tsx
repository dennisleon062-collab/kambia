"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { entregarFondo, devolverFondo, marcarAsumidoPorJuan, corregirMontoEntregado } from "@/lib/actions/fondo-juan";
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
      {error && <p className="text-sm text-rust">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Entregar fondo"}
      </button>
    </form>
  );
}

export function DevolverFondoForm({ fondo }: { fondo: FondoDiario }) {
  const { ejecutar, error, pending } = useAccion(devolverFondo);
  const asumido = useAccion(marcarAsumidoPorJuan);
  const correccion = useAccion(corregirMontoEntregado);
  const [corrigiendo, setCorrigiendo] = useState(false);

  return (
    <div className="card flex flex-col gap-3">
      <h2 className="font-semibold">Fondo de hoy</h2>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/60">
          Entregado: <span className="font-mono font-semibold">S/ {fondo.monto_entregado}</span>
        </p>
        {fondo.estado === "pendiente_devolucion" && !corrigiendo && (
          <button type="button" className="text-xs font-semibold text-lime-dark" onClick={() => setCorrigiendo(true)}>
            Corregir
          </button>
        )}
      </div>

      {corrigiendo && (
        <form
          className="flex flex-col gap-2 border-t border-ink/10 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("fondo_diario_id", fondo.id);
            correccion.ejecutar(fd, () => setCorrigiendo(false));
          }}
        >
          <label className="field-label" htmlFor="monto_entregado_corregido">
            Monto correcto que se entregó (S/)
          </label>
          <input
            id="monto_entregado_corregido"
            name="monto_entregado"
            type="number"
            step="0.01"
            inputMode="decimal"
            required
            defaultValue={fondo.monto_entregado}
            className="field-input"
          />
          <p className="text-xs text-ink/40">
            Se ajusta con un traspaso entre la bóveda y el fondo por la diferencia.
          </p>
          {correccion.error && <p className="text-sm text-rust">{correccion.error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={correccion.pending}>
              {correccion.pending ? "Guardando…" : "Guardar corrección"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCorrigiendo(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {fondo.estado === "pendiente_devolucion" && !corrigiendo && (
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
          {error && <p className="text-sm text-rust">{error}</p>}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Guardando…" : "Registrar devolución"}
          </button>
        </form>
      )}

      {fondo.estado !== "pendiente_devolucion" && (
        <>
          <p className="text-sm text-ink/60">
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
              {asumido.error && <p className="text-sm text-rust">{asumido.error}</p>}
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
    asumido_por_juan: "bg-ink/10 text-ink/70",
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
