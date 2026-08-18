import { LogoutButton } from "@/components/LogoutButton";

export function Header({ nombre, titulo }: { nombre: string; titulo: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-ink px-5 py-4 text-paper">
      <div>
        <p className="text-xs uppercase tracking-[.14em] text-paper/55">{nombre}</p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight">{titulo}</h1>
      </div>
      <LogoutButton />
    </header>
  );
}
