import BarreLaterale from "@/components/BarreLaterale";
import BarreHaute from "@/components/BarreHaute";
import Fournisseur from "@/components/Fournisseur";
import { exigerConnexion } from "@/lib/auth/session";
import { compterRelances } from "@/lib/donnees/relances";

export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const utilisatrice = await exigerConnexion();

  return (
    <Fournisseur>
      <div className="min-h-screen">
        <BarreLaterale relances={compterRelances()} />
        <div className="pl-56">
          <BarreHaute email={utilisatrice.email} />
          <main className="p-8">{children}</main>
        </div>
      </div>
    </Fournisseur>
  );
}
