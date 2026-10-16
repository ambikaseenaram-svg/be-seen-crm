"use client";

import { useState } from "react";
import type { Entreprise } from "@/db/schema";
import { supprimerDefinitivement } from "@/app/(app)/entreprises/actions";
import Fenetre from "../ui/Fenetre";
import { useSauvegarde } from "./outils";

export default function FenetreSuppression({
  entreprise,
  onFermer,
  apresSuppression,
}: {
  entreprise: Entreprise;
  onFermer: () => void;
  apresSuppression: () => void;
}) {
  const [saisie, setSaisie] = useState("");
  const { enCours, erreurs, message, sauver } = useSauvegarde();
  const correspond = saisie.trim() === entreprise.nom;

  return (
    <Fenetre titre="Suppression définitive" onFermer={onFermer}>
      <form
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (correspond) sauver(() => supprimerDefinitivement(entreprise.id, saisie), apresSuppression);
        }}
      >
        <p className="rounded-lg bg-[#d64545]/10 p-3 text-sm text-titre">
          Supprime l&apos;entreprise, ses affaires et ses interactions. Action irréversible.
        </p>
        <label className="block text-sm text-titre">
          Pour confirmer, tape le nom de l&apos;entreprise : <strong>{entreprise.nom}</strong>
          <input className="champ mt-2" value={saisie} onChange={(ev) => setSaisie(ev.target.value)} autoComplete="off" />
        </label>
        {(erreurs.nom || message) && <p className="message-erreur">{erreurs.nom || message}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onFermer} className="text-sm text-annotation hover:text-titre">Annuler</button>
          <button
            type="submit"
            disabled={!correspond || enCours}
            className="rounded-lg bg-[#c0392b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a93226] disabled:opacity-40"
          >
            Supprimer définitivement
          </button>
        </div>
      </form>
    </Fenetre>
  );
}
