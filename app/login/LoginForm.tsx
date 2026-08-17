"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/lib/actions/auth";

const PERSONAS = [
  { id: "milagro" as const, nombre: "Milagro", rol: "Dueña" },
  { id: "juan" as const, nombre: "Juan", rol: "Trabajador" },
];

export function LoginForm() {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState<"milagro" | "juan" | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      const res = await iniciarSesion(seleccionado, password);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-700">Kambia</h1>
        <p className="text-sm text-neutral-500">Control de dinero — casa de cambio</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSeleccionado(p.id);
              setError(null);
            }}
            className={`card flex flex-col items-center gap-1 py-6 ${
              seleccionado === p.id ? "border-brand-600 ring-2 ring-brand-600" : ""
            }`}
          >
            <span className="text-3xl">{p.id === "milagro" ? "👑" : "🚶"}</span>
            <span className="font-semibold">{p.nombre}</span>
            <span className="text-xs text-neutral-500">{p.rol}</span>
          </button>
        ))}
      </div>

      {seleccionado && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="field-label" htmlFor="password">
              Contraseña de {seleccionado === "milagro" ? "Milagro" : "Juan"}
            </label>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              autoFocus
              required
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      )}
    </div>
  );
}
