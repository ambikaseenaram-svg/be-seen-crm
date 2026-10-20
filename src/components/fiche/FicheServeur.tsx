import { listerAffairesFermees, obtenirAffaireOuverte } from "@/lib/donnees/affaires";
import { obtenirEntreprise } from "@/lib/donnees/entreprises";
import PanneauFiche from "./PanneauFiche";

// Charge la fiche, son affaire ouverte et l'historique, pour toute page qui ouvre ?fiche=…
export default function FicheServeur({ id }: { id: string }) {
  const entreprise = obtenirEntreprise(id);
  if (!entreprise) return null;
  const affaire = obtenirAffaireOuverte(id);
  return (
    <PanneauFiche
      key={entreprise.id + entreprise.modifieLe + (affaire?.modifieLe ?? "")}
      entreprise={entreprise}
      affaire={affaire}
      historique={listerAffairesFermees(id)}
    />
  );
}
