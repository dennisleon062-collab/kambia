import { LogoutButton } from "@/components/LogoutButton";

export function Header({ nombre, titulo }: { nombre: string; titulo: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div>
        <p className="text-xs text-neutral-500">{nombre}</p>
        <h1 className="text-lg font-bold text-neutral-900">{titulo}</h1>
      </div>
      <LogoutButton />
    </header>
  );
}
