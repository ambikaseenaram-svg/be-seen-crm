"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "./Fournisseur";
import { seDeconnecter } from "@/app/connexion/actions";

export default function BarreHaute({ email }: { email: string }) {
  const { ouvrirAjoutRapide } = useApp();
  const router = useRouter();
  const [recherche, setRecherche] = useState("");

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-annotation/20 bg-white/90 px-6 backdrop-blur">
      <button type="button" onClick={ouvrirAjoutRapide} className="bouton" title="Raccourci : N">
        + Ajout rapide
      </button>
      <form
        className="flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/entreprises?q=${encodeURIComponent(recherche.trim())}`);
        }}
      >
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une entreprise…"
          aria-label="Rechercher une entreprise"
          className="champ max-w-xs"
        />
      </form>
      <span className="text-sm text-annotation">{email}</span>
      <form action={seDeconnecter}>
        <button type="submit" className="text-sm font-medium text-bouton hover:text-violet">
          Déconnexion
        </button>
      </form>
    </header>
  );
}
