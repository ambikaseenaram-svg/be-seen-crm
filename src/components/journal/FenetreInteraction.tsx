"use client";

import { useState } from "react";
import type { Interaction } from "@/db/schema";
import { aujourdhui } from "@/lib/dates";
import { etapeSuggeree } from "@/lib/interactions";
import { CANAUX_INTERACTION, RESULTATS_INTERACTION, TYPES_INTERACTION } from "@/lib/listes";
import { ajouterInteraction, changerInteraction } from "@/app/(app)/journal/actions";
import Fenetre from "../ui/Fenetre";
import { Champ, Liste } from "../ui/Champ";
import { useSauvegarde, versFormulaire } from "../fiche/outils";

export type CibleInteraction = { id: string; nom: string; optOut: boolean; etape: string | null };

// Ajout (sans `existante`) ou modification d'une interaction.
export default function FenetreInteraction({
  cible,
  existante,
  onFermer,
}: {
  cible: CibleInteraction;
  existante?: Interaction;
  onFermer: () => void;
}) {
  const [f, setF] = useState(() => ({
    ...versFormulaire({
      date: existante?.date ?? aujourdhui(),
      type: existante?.type,
      canal: existante?.canal,
      resultat: existante?.resultat,
      note: existante?.note,
      prochaineAction: "",
      dateProchaineAction: "",
    }),
    decideurRencontre: existante?.decideurRencontre ?? false,
    avancerAffaire: true,
  }));
  const { enCours, erreurs, message, sauver } = useSauvegarde();
  const suggestion = !existante && cible.etape && f.type && f.resultat ? etapeSuggeree(cible.etape, f.type, f.resultat) : null;
  const optOutDemande = f.resultat === "Opt-out demandé" && !existante;

  return (
    <Fenetre titre={existante ? "Modifier l'interaction" : `Nouvelle interaction · ${cible.nom}`} onFermer={onFermer} largeur="max-w-xl">
      <form
        noValidate
        className="grid grid-cols-2 gap-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          sauver(
            () => (existante ? changerInteraction(existante.id, f) : ajouterInteraction(cible.id, { ...f, avancerAffaire: f.avancerAffaire && !!suggestion })),
            onFermer,
          );
        }}
      >
        <Champ libelle="Date" obligatoire erreur={erreurs.date}>
          <input type="date" max={aujourdhui()} className={`champ ${erreurs.date ? "champ-erreur" : ""}`} value={f.date} onChange={(ev) => setF({ ...f, date: ev.target.value })} />
        </Champ>
        <Champ libelle="Type" obligatoire erreur={erreurs.type}>
          <Liste valeurs={TYPES_INTERACTION} value={f.type} onChange={(v) => setF({ ...f, type: v })} vide="Choisir…" erreur={!!erreurs.type} />
        </Champ>
        <Champ libelle="Canal" obligatoire erreur={erreurs.canal}>
          <Liste valeurs={CANAUX_INTERACTION} value={f.canal} onChange={(v) => setF({ ...f, canal: v })} vide="Choisir…" erreur={!!erreurs.canal} />
        </Champ>
        <Champ libelle="Résultat" obligatoire erreur={erreurs.resultat}>
          <Liste valeurs={RESULTATS_INTERACTION} value={f.resultat} onChange={(v) => setF({ ...f, resultat: v })} vide="Choisir…" erreur={!!erreurs.resultat} />
        </Champ>
        <label className="col-span-2 flex items-center gap-2 text-sm text-titre">
          <input type="checkbox" className="h-4 w-4 accent-violet" checked={f.decideurRencontre} onChange={(ev) => setF({ ...f, decideurRencontre: ev.target.checked })} />
          Décideur rencontré ou joint
        </label>
        <Champ libelle="Note" className="col-span-2" erreur={erreurs.note}>
          <textarea rows={3} className="champ" value={f.note} onChange={(ev) => setF({ ...f, note: ev.target.value })} />
        </Champ>

        {!existante && cible.etape && (
          <>
            <Champ libelle="Prochaine action" erreur={erreurs.prochaineAction}>
              <input className="champ" placeholder="Ex. relancer par téléphone" value={f.prochaineAction} onChange={(ev) => setF({ ...f, prochaineAction: ev.target.value })} />
            </Champ>
            <Champ libelle="Pour le" erreur={erreurs.dateProchaineAction}>
              <input type="date" className="champ" value={f.dateProchaineAction} onChange={(ev) => setF({ ...f, dateProchaineAction: ev.target.value })} />
            </Champ>
            {suggestion && (
              <label className="col-span-2 flex items-center gap-2 text-sm text-titre">
                <input type="checkbox" className="h-4 w-4 accent-violet" checked={f.avancerAffaire} onChange={(ev) => setF({ ...f, avancerAffaire: ev.target.checked })} />
                Passer l&apos;affaire de « {cible.etape} » à « {suggestion} »
              </label>
            )}
          </>
        )}
        {optOutDemande && (
          <p className="col-span-2 rounded-lg bg-lavande/40 p-3 text-sm text-titre">
            Cette entreprise sera marquée <strong>opt-out</strong> : elle ne sera plus jamais proposée au contact. Le retrait reste possible depuis la fiche, avec double confirmation.
          </p>
        )}
        {cible.optOut && <p className="col-span-2 message-erreur">Cette entreprise a demandé à ne plus être contactée.</p>}
        <div className="col-span-2 mt-2 flex items-center justify-end gap-3">
          {message && <p className="message-erreur mr-auto">{message}</p>}
          <button type="button" onClick={onFermer} className="text-sm text-annotation hover:text-titre">Annuler</button>
          <button type="submit" disabled={enCours || (cible.optOut && !existante)} className="bouton">
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Fenetre>
  );
}
