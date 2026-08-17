"use client";

const STORAGE_KEY = "kambia_cola_offline_v1";

export interface ItemCola {
  id: string;
  creadoEn: string;
  campos: Record<string, string>;
  descripcion: string;
}

function leerCola(): ItemCola[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ItemCola[]) : [];
  } catch {
    return [];
  }
}

function guardarCola(items: ItemCola[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function encolar(campos: Record<string, string>, descripcion: string): ItemCola {
  const item: ItemCola = {
    id: crypto.randomUUID(),
    creadoEn: new Date().toISOString(),
    campos,
    descripcion,
  };
  const cola = leerCola();
  cola.push(item);
  guardarCola(cola);
  return item;
}

export function obtenerCola(): ItemCola[] {
  return leerCola();
}

export function quitarDeCola(id: string) {
  guardarCola(leerCola().filter((i) => i.id !== id));
}

export function contarCola(): number {
  return leerCola().length;
}

/** Reintenta enviar cada elemento de la cola con la acción dada. Detiene ante el primer error. */
export async function procesarCola(
  enviar: (formData: FormData) => Promise<{ error: string | null }>
): Promise<{ enviados: number; error: string | null }> {
  const cola = leerCola();
  let enviados = 0;
  for (const item of cola) {
    const fd = new FormData();
    Object.entries(item.campos).forEach(([k, v]) => fd.set(k, v));
    const res = await enviar(fd);
    if (res.error) {
      return { enviados, error: res.error };
    }
    quitarDeCola(item.id);
    enviados++;
  }
  return { enviados, error: null };
}
