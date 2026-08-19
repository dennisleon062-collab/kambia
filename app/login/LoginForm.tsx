"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/lib/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await iniciarSesion(password);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-between bg-ink px-6 py-9 text-paper">
      <div>
        <span className="block h-9 w-9 rounded-[10px] bg-lime" />
        <h1 className="mt-6 text-[38px] font-extrabold tracking-tight">Kambia</h1>
        <p className="mt-2 max-w-[250px] text-sm text-paper/55">
          El control del dinero de la casa de cambio, día por día.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-[1.5px] border-lime bg-paper/10 p-4">
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-lime text-[17px] font-bold text-ink">
            M
          </span>
          <p className="text-[17px] font-bold">Milagro</p>
        </div>

        <div className="mt-1.5">
          <label className="mb-2 block text-[12.5px] text-paper/55" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            inputMode="numeric"
            autoFocus
            required
            className="w-full rounded-xl border border-paper/15 bg-paper/10 px-4 py-4 text-lg text-paper outline-none focus:border-lime"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <button
          type="submit"
          className="mt-1 rounded-2xl bg-lime py-[17px] text-center text-base font-bold text-ink disabled:opacity-50"
          disabled={pending}
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
