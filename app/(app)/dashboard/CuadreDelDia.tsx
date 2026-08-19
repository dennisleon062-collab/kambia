"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarGananciaDelDia } from "@/lib/actions/resumen-diario";
import { formatMonto } from "@/lib/format";
import type { ResumenDiario } from "@/types/database.types";

export function CuadreDelDia({
  ayer,
  gastosHoy,
  hoyTotal,
  resumenHoy,
}: {
  ayer: ResumenDiario | null;
  gastosHoy: number;
  hoyTotal: number;
  resumenHoy: ResumenDiario | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(!resumenHoy);
  const [ganancia, setGanancia] = useState(resumenHoy ? String(resumenHoy.ganancia) : "");
  const [comentario, setComentario] = useState(resumenHoy?.comentario ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const gananciaNum = Number(ganancia) || 0;
  const proyectado = ayer ? Math.round((ayer.total_soles - gastosHoy + gananciaNum) * 100) / 100 : null;
  const diferencia = proyectado !== null ? Math.round((hoyTotal - proyectado) * 100) / 100 : null;
  const cuadra = diferencia !== null && Math.abs(diferencia) < 0.01;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registrarGananciaDelDia(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-[13px] font-semibold">Cuadre de hoy</p>

      <div className="flex flex-col gap-1.5 text-[13px]">
        <div className="flex justify-between">
          <span className="text-ink/50">Ayer</span>
          <span className="font-num">{ayer ? formatMonto(ayer.total_soles, "PEN") : "sin registrar"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink/50">Gastos de hoy</span>
          <span className="font-num">{formatMonto(gastosHoy, "PEN")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink/50">Ganancia de hoy</span>
          <span className="font-num">{formatMonto(gananciaNum, "PEN")}</span>
        </div>
        <div className="h-px bg-[#f0f0ea]" />
        <div className="flex justify-between font-semibold">
          <span>Debería tener hoy</span>
          <span className="font-num">{proyectado !== null ? formatMonto(proyectado, "PEN") : "—"}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Tengo en el sistema</span>
          <span className="font-num">{formatMonto(hoyTotal, "PEN")}</span>
        </div>
      </div>

      {diferencia !== null && (
        <p className={`text-sm ${cuadra ? "text-brand-700" : "text-rust"}`}>
          {cuadra ? "Cuadra exacto ✓" : `Diferencia: ${formatMonto(diferencia, "PEN")}`}
        </p>
      )}

      {editando ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-ink/10 pt-3">
          <div>
            <label className="field-label" htmlFor="ganancia">
              Mi ganancia de hoy (S/)
            </label>
            <input
              id="ganancia"
              name="ganancia"
              type="number"
              step="0.01"
              inputMode="decimal"
              required
              className="field-input"
              value={ganancia}
              onChange={(e) => setGanancia(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="comentario_resumen">
              Comentario (opcional)
            </label>
            <input
              id="comentario_resumen"
              name="comentario"
              className="field-input"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-rust">{error}</p>}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar ganancia de hoy"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="self-start text-[12.5px] font-semibold text-lime-dark"
        >
          Corregir ganancia de hoy
        </button>
      )}
    </div>
  );
}
