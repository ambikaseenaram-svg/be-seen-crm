"use client";

import { useState } from "react";
import type { Affaire } from "@/db/schema";
import { alerteTarif, champsManquants, FOURCHETTES, formaterEuros, valeurTotale } from "@/lib/affaires";
import { MOTIFS_PERTE, OFFRES } from "@/lib/listes";
import { deplacerAffaire } from "@/app/(app)/pipeline/actions";
import Fenetre from "../ui/Fenetre";
import { Champ, Liste } from "../ui/Champ";
import { useSauvegarde, versFormulaire } from "../fiche/outils";

type Offre = (typeof OFFRES)[number];

// Demande ce que l'étape visée exige (motif de perte, offre signée) puis déplace l'affaire.
export default function FenetreEtape({
  affaire,
  etape,
  nom,
  onFermer,
}: {
  affaire: Affaire;
  etape: string;
  nom: string;
  onFermer: () => void;
}) {
  const [f, setF] = useState(() =>
    versFormulaire({ motifPerte: affaire.motifPerte, offre: affaire.offre, montantMensuel: affaire.montantMensuel, dureeMois: affaire.dureeMois }),
  );
  const { enCours, erreurs, message, sauver } = useSauvegarde();
  const manquants = champsManquants(etape, {
    offre: f.offre || null,
    montantMensuel: f.montantMensuel === "" ? null : Number(f.montantMensuel),
    dureeMois: f.dureeMois === "" ? null : Number(f.dureeMois),
    motifPerte: f.motifPerte || null,
  });
  const alerte = alerteTarif((f.offre || null) as Offre | null, f.montantMensuel === "" ? null : Number(f.montantMensuel));
  const total = valeurTotale(f.montantMensuel === "" ? null : Number(f.montantMensuel), f.dureeMois === "" ? null : Number(f.dureeMois));

  return (
    <Fenetre titre={`${nom} → ${etape}`} onFermer={onFermer}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          sauver(() => deplacerAffaire(affaire.id, { etape, ...f }), onFermer);
        }}
      >
        {etape === "Perdu" && (
          <Champ libelle="Motif de perte" obligatoire erreur={erreurs.motifPerte}>
            <Liste valeurs={MOTIFS_PERTE} value={f.motifPerte} onChange={(v) => setF({ ...f, motifPerte: v })} vide="Choisir…" erreur={!!erreurs.motifPerte} />
          </Champ>
        )}
        {etape === "Client actif" && (
          <>
            <p className="text-sm text-titre">Renseigne ce qui a été signé. Rien n&apos;est pré-rempli à ta place.</p>
            <div className="grid grid-cols-3 gap-3">
              <Champ libelle="Offre" obligatoire erreur={erreurs.offre}>
                <Liste valeurs={OFFRES} value={f.offre} onChange={(v) => setF({ ...f, offre: v })} vide="Choisir…" erreur={!!erreurs.offre} />
              </Champ>
              <Champ libelle="Montant mensuel (€)" obligatoire erreur={erreurs.montantMensuel}>
                <input type="number" min={0} className={`champ ${erreurs.montantMensuel ? "champ-erreur" : ""}`} value={f.montantMensuel} onChange={(ev) => setF({ ...f, montantMensuel: ev.target.value })} />
              </Champ>
              <Champ libelle="Durée (mois)" obligatoire erreur={erreurs.dureeMois}>
                <input type="number" min={1} className={`champ ${erreurs.dureeMois ? "champ-erreur" : ""}`} value={f.dureeMois} onChange={(ev) => setF({ ...f, dureeMois: ev.target.value })} />
              </Champ>
            </div>
            {f.offre && <p className="text-xs text-annotation">Fourchette {f.offre} : {formaterEuros(FOURCHETTES[f.offre as Offre][0])} à {formaterEuros(FOURCHETTES[f.offre as Offre][1])} par mois.</p>}
            {alerte && <p className="rounded-lg bg-lavande/40 p-3 text-sm text-titre">{alerte}</p>}
            {total != null && <p className="text-sm text-titre">Valeur totale : <strong>{formaterEuros(total)}</strong></p>}
          </>
        )}
        {etape !== "Perdu" && etape !== "Client actif" && <p className="text-sm text-titre">Déplacer cette affaire vers « {etape} » ?</p>}
        {etape === "Client terminé" && <p className="text-sm text-annotation">L&apos;affaire sera clôturée. Tu pourras en ouvrir une nouvelle depuis la fiche.</p>}
        {etape === "Perdu" && <p className="text-sm text-annotation">L&apos;affaire sera clôturée. Tu pourras en ouvrir une nouvelle depuis la fiche.</p>}
        {message && <p className="message-erreur">{message}</p>}
        {erreurs.etape && <p className="message-erreur">{erreurs.etape}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onFermer} className="text-sm text-annotation hover:text-titre">Annuler</button>
          <button type="submit" disabled={enCours || Object.keys(manquants).length > 0} className="bouton">
            {enCours ? "Enregistrement…" : "Confirmer"}
          </button>
        </div>
      </form>
    </Fenetre>
  );
}
