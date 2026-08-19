import { getUsuarioActual } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await getUsuarioActual(); // valida sesión

  return (
    <div className="min-h-dvh bg-paper pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
