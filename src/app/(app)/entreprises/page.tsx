import type { Metadata } from "next";
import { compterEntreprises, listerEntreprises, type Filtres } from "@/lib/donnees/entreprises";
import FiltresEntreprises from "./FiltresEntreprises";
import TableauEntreprises from "./TableauEntreprises";
import EtatVide from "./EtatVide";
import FicheServeur from "@/components/fiche/FicheServeur";

export const metadata: Metadata = { title: "Entreprises · BE SEEN" };

type Params = Filtres & { fiche?: string };

export default async function PageEntreprises({ searchParams }: { searchParams: Promise<Params> }) {
  const { fiche, ...filtres } = await searchParams;
  const total = compterEntreprises();
  const lignes = listerEntreprises(filtres);
  const filtreActif = Object.values(filtres).some(Boolean);

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-titre">Entreprises</h1>
        <p className="text-sm text-annotation">
          {lignes.length} fiche{lignes.length > 1 ? "s" : ""}
          {filtreActif && ` sur ${total}`}
        </p>
      </div>

      {total === 0 ? (
        <EtatVide />
      ) : (
        <>
          <FiltresEntreprises filtres={filtres} />
          {lignes.length === 0 ? (
            <EtatVide recherche={filtres.q ?? ""} />
          ) : (
            <TableauEntreprises lignes={lignes} ficheId={fiche} />
          )}
        </>
      )}

      {fiche && <FicheServeur id={fiche} />}
    </section>
  );
}
