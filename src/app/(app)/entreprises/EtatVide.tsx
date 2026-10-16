"use client";

import Link from "next/link";
import { useApp } from "@/components/Fournisseur";

export default function EtatVide({ recherche }: { recherche?: string }) {
  const { ouvrirAjoutRapide } = useApp();

  if (recherche !== undefined) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-annotation/20">
        <p className="mb-3 text-titre">{recherche ? `Aucun résultat pour “${recherche}”.` : "Aucun résultat avec ces filtres."}</p>
        <Link href="/entreprises" className="text-sm font-semibold text-bouton underline">
          Effacer les filtres
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-annotation/20">
      <p className="mb-4 text-titre">Aucune entreprise. Commence par ajouter un prospect repéré aujourd&apos;hui.</p>
      <button type="button" onClick={ouvrirAjoutRapide} className="bouton">
        + Ajout rapide
      </button>
    </div>
  );
}
