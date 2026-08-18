"use client";

import { useEffect, useState } from "react";
import { registrarMovimiento } from "@/lib/actions/movimientos";
import { contarCola, procesarCola } from "@/lib/offlineQueue";

export function OfflineQueueStatus() {
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [enLinea, setEnLinea] = useState(true);

  async function sincronizar() {
    if (sincronizando) return;
    setSincronizando(true);
    try {
      await procesarCola(registrarMovimiento);
    } finally {
      setPendientes(contarCola());
      setSincronizando(false);
    }
  }

  useEffect(() => {
    setPendientes(contarCola());
    setEnLinea(navigator.onLine);

    function handleOnline() {
      setEnLinea(true);
      sincronizar();
    }
    function handleOffline() {
      setEnLinea(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) sincronizar();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pendientes === 0 && enLinea) return null;

  return (
    <div
      className={`mx-4 mt-3 rounded-lg px-3 py-2 text-sm ${
        enLinea ? "bg-amber-bg text-amber-text" : "bg-ink/10 text-ink/70"
      }`}
    >
      {!enLinea && "Sin conexión: los registros se guardan en el celular y se envían al reconectar."}
      {enLinea && pendientes > 0 && (sincronizando ? "Sincronizando…" : `${pendientes} registro(s) pendiente(s) de enviar`)}
    </div>
  );
}
