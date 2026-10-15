import BarreLaterale from "@/components/BarreLaterale";
import { exigerConnexion } from "@/lib/auth/session";
import { seDeconnecter } from "../connexion/actions";

export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const utilisatrice = await exigerConnexion();

  return (
    <div className="min-h-screen">
      <BarreLaterale />
      <div className="pl-56">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-4 border-b border-annotation/20 bg-white/90 px-6 backdrop-blur">
          <span className="text-sm text-annotation">{utilisatrice.email}</span>
          <form action={seDeconnecter}>
            <button type="submit" className="text-sm font-medium text-bouton hover:text-violet">
              Déconnexion
            </button>
          </form>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
