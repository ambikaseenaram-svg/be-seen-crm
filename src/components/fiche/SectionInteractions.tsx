"use client";

import { useState } from "react";
import type { Interaction } from "@/db/schema";
import { formaterDate } from "@/lib/dates";
import { retirerInteraction } from "@/app/(app)/journal/actions";
import FenetreInteraction, { type CibleInteraction } from "../journal/FenetreInteraction";
import Fenetre from "../ui/Fenetre";
import { BoutonLien, Section, useSauvegarde } from "./outils";

export default function SectionInteractions({ cible, interactions }: { cible: CibleInteraction; interactions: Interaction[] }) {
  const [fenetre, setFenetre] = useState<{ mode: "ajout" } | { mode: "edition" | "suppression"; i: Interaction } | null>(null);
  const { enCours, message, sauver } = useSauvegarde();
  const fermer = () => setFenetre(null);

  return (
    <Section titre={`Interactions (${interactions.length})`} actions={!cible.optOut && <BoutonLien onClick={() => setFenetre({ mode: "ajout" })}>Ajouter</BoutonLien>}>
      {interactions.length === 0 ? (
        <p className="text-sm text-annotation">Aucune interaction enregistrée.</p>
      ) : (
        <ul className="space-y-3">
          {interactions.map((i) => (
            <li key={i.id} className="rounded-lg bg-creme p-3 text-sm text-titre">
              <div className="flex flex-wrap items-center gap-x-2">
                <strong>{formaterDate(i.date)}</strong>
                <span>{i.type} · {i.canal}</span>
                <span className="rounded bg-white px-1.5 text-xs ring-1 ring-annotation/30">{i.resultat}</span>
                {i.decideurRencontre && <span className="text-xs text-annotation">décideur</span>}
                <span className="ml-auto flex gap-3 text-xs">
                  <BoutonLien onClick={() => setFenetre({ mode: "edition", i })}>Modifier</BoutonLien>
                  <BoutonLien danger onClick={() => setFenetre({ mode: "suppression", i })}>Supprimer</BoutonLien>
                </span>
              </div>
              {i.note && <p className="mt-1 whitespace-pre-wrap text-annotation">{i.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {fenetre?.mode === "ajout" && <FenetreInteraction cible={cible} onFermer={fermer} />}
      {fenetre?.mode === "edition" && <FenetreInteraction cible={cible} existante={fenetre.i} onFermer={fermer} />}
      {fenetre?.mode === "suppression" && (
        <Fenetre titre="Supprimer l'interaction" onFermer={fermer}>
          <p className="mb-4 text-sm text-titre">
            Supprimer « {fenetre.i.type} · {formaterDate(fenetre.i.date)} » ? Cette action est définitive.
          </p>
          {message && <p className="message-erreur mb-3">{message}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={fermer} className="text-sm text-annotation hover:text-titre">Annuler</button>
            <button type="button" disabled={enCours} onClick={() => sauver(() => retirerInteraction(fenetre.i.id), fermer)} className="bouton">
              Supprimer
            </button>
          </div>
        </Fenetre>
      )}
    </Section>
  );
}
