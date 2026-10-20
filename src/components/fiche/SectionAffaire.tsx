"use client";

import { useState } from "react";
import type { Affaire } from "@/db/schema";
import { alerteTarif, enRetard, exigeFenetre, formaterEuros, joursEntre, valeurTotale } from "@/lib/affaires";
import { aujourdhui, formaterDate } from "@/lib/dates";
import { ETAPES, MOTIFS_PERTE, OFFRES } from "@/lib/listes";
import { deplacerAffaire, modifierAffaire, nouvelleAffaire } from "@/app/(app)/pipeline/actions";
import FenetreEtape from "../pipeline/FenetreEtape";
import { Champ, Liste } from "../ui/Champ";
import { BoutonLien, BoutonsEdition, Section, Valeur, useSauvegarde, versFormulaire } from "./outils";

type Offre = (typeof OFFRES)[number];
const oui = (b: boolean) => (b ? "Oui" : "Non");

export default function SectionAffaire({
  entrepriseId,
  nom,
  optOut,
  affaire,
  historique,
}: {
  entrepriseId: string;
  nom: string;
  optOut: boolean;
  affaire: Affaire | null;
  historique: Affaire[];
}) {
  return (
    <Section titre="Affaire en cours">
      {affaire ? <AffaireOuverte affaire={affaire} nom={nom} /> : <AucuneAffaire entrepriseId={entrepriseId} optOut={optOut} />}
      {historique.length > 0 && (
        <div className="mt-5 border-t border-annotation/20 pt-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-annotation">Affaires passées</h4>
          <ul className="space-y-1 text-sm text-titre">
            {historique.map((h) => (
              <li key={h.id}>
                <strong>{h.etape}</strong> · {formaterDate(h.dateEtape)}
                {h.motifPerte && ` · ${h.motifPerte}`}
                {h.offre && ` · ${h.offre}`}
                {h.montantMensuel != null && ` · ${formaterEuros(h.montantMensuel)}/mois`}
                {h.valeurTotale != null && ` (${formaterEuros(h.valeurTotale)})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function AucuneAffaire({ entrepriseId, optOut }: { entrepriseId: string; optOut: boolean }) {
  const { enCours, message, sauver } = useSauvegarde();
  if (optOut) return <p className="text-sm text-annotation">Cette entreprise a demandé à ne plus être contactée : aucune nouvelle affaire.</p>;
  return (
    <div className="flex items-center gap-4">
      <p className="text-sm text-annotation">Aucune affaire ouverte.</p>
      <button type="button" disabled={enCours} onClick={() => sauver(() => nouvelleAffaire(entrepriseId))} className="bouton">
        Ouvrir une nouvelle affaire
      </button>
      {message && <p className="message-erreur">{message}</p>}
    </div>
  );
}

function AffaireOuverte({ affaire: a, nom }: { affaire: Affaire; nom: string }) {
  const initial = () => ({
    ...versFormulaire({
      prochaineAction: a.prochaineAction,
      dateProchaineAction: a.dateProchaineAction,
      offre: a.offre,
      montantMensuel: a.montantMensuel,
      dureeMois: a.dureeMois,
      dateProposition: a.dateProposition,
      dateSignature: a.dateSignature,
      motifPerte: a.motifPerte,
      notesRdv: a.notesRdv,
    }),
    budgetValide: a.budgetValide,
    decideurIdentifie: a.decideurIdentifie,
    tarifHistorique: a.tarifHistorique,
  });
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState(initial);
  const [cible, setCible] = useState<string | null>(null);
  const { enCours, erreurs, message, sauver, setErreurs } = useSauvegarde();
  const jour = aujourdhui();
  const alerte = alerteTarif((f.offre || null) as Offre | null, f.montantMensuel === "" ? null : Number(f.montantMensuel));
  const total = valeurTotale(f.montantMensuel === "" ? null : Number(f.montantMensuel), f.dureeMois === "" ? null : Number(f.dureeMois));
  const alerteAffiche = alerteTarif(a.offre, a.montantMensuel);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-titre" htmlFor="etape-affaire">Étape</label>
        <select
          id="etape-affaire"
          className="champ !w-auto"
          value={a.etape}
          onChange={(ev) => {
            const v = ev.target.value;
            if (v === a.etape) return;
            if (exigeFenetre(v)) setCible(v);
            else sauver(() => deplacerAffaire(a.id, { etape: v }));
          }}
        >
          {ETAPES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {enCours && <span className="text-xs text-annotation">…</span>}
        <span className="text-xs text-annotation">depuis {joursEntre(a.dateEtape, jour)} j ({formaterDate(a.dateEtape)})</span>
        {!edition && <span className="ml-auto"><BoutonLien onClick={() => setEdition(true)}>Modifier</BoutonLien></span>}
      </div>

      {edition ? (
        <form
          noValidate
          className="grid grid-cols-2 gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            sauver(() => modifierAffaire(a.id, f), () => setEdition(false));
          }}
        >
          <Champ libelle="Prochaine action" className="col-span-2" erreur={erreurs.prochaineAction}>
            <input className="champ" value={f.prochaineAction} onChange={(ev) => setF({ ...f, prochaineAction: ev.target.value })} />
          </Champ>
          <Champ libelle="Date de la prochaine action" erreur={erreurs.dateProchaineAction}>
            <input type="date" className="champ" value={f.dateProchaineAction} onChange={(ev) => setF({ ...f, dateProchaineAction: ev.target.value })} />
          </Champ>
          <div className="flex flex-col justify-end gap-2 pb-2 text-sm text-titre">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-violet" checked={f.budgetValide} onChange={(ev) => setF({ ...f, budgetValide: ev.target.checked })} />
              Budget validé
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-violet" checked={f.decideurIdentifie} onChange={(ev) => setF({ ...f, decideurIdentifie: ev.target.checked })} />
              Décideur identifié
            </label>
          </div>
          <Champ libelle="Offre" erreur={erreurs.offre}>
            <Liste valeurs={OFFRES} value={f.offre} onChange={(v) => setF({ ...f, offre: v })} erreur={!!erreurs.offre} />
          </Champ>
          <Champ libelle="Montant mensuel (€)" erreur={erreurs.montantMensuel}>
            <input type="number" min={0} className={`champ ${erreurs.montantMensuel ? "champ-erreur" : ""}`} value={f.montantMensuel} onChange={(ev) => setF({ ...f, montantMensuel: ev.target.value })} />
          </Champ>
          <Champ libelle="Durée (mois)" erreur={erreurs.dureeMois}>
            <input type="number" min={1} className={`champ ${erreurs.dureeMois ? "champ-erreur" : ""}`} value={f.dureeMois} onChange={(ev) => setF({ ...f, dureeMois: ev.target.value })} />
          </Champ>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-titre">
            <input type="checkbox" className="h-4 w-4 accent-violet" checked={f.tarifHistorique} onChange={(ev) => setF({ ...f, tarifHistorique: ev.target.checked })} />
            Tarif historique
          </label>
          {alerte && <p className="col-span-2 rounded-lg bg-lavande/40 p-3 text-sm text-titre">{alerte}</p>}
          {total != null && <p className="col-span-2 text-sm text-titre">Valeur totale : <strong>{formaterEuros(total)}</strong></p>}
          <Champ libelle="Proposition envoyée le" erreur={erreurs.dateProposition}>
            <input type="date" className="champ" value={f.dateProposition} onChange={(ev) => setF({ ...f, dateProposition: ev.target.value })} />
          </Champ>
          <Champ libelle="Signée le" erreur={erreurs.dateSignature}>
            <input type="date" className="champ" value={f.dateSignature} onChange={(ev) => setF({ ...f, dateSignature: ev.target.value })} />
          </Champ>
          <Champ libelle="Motif de perte (si perdue)" className="col-span-2">
            <Liste valeurs={MOTIFS_PERTE} value={f.motifPerte} onChange={(v) => setF({ ...f, motifPerte: v })} />
          </Champ>
          <Champ libelle="Notes de RDV" className="col-span-2" erreur={erreurs.notesRdv}>
            <textarea rows={4} className="champ" value={f.notesRdv} onChange={(ev) => setF({ ...f, notesRdv: ev.target.value })} />
          </Champ>
          <BoutonsEdition
            enCours={enCours}
            message={message}
            onAnnuler={() => {
              setF(initial());
              setErreurs({});
              setEdition(false);
            }}
          />
        </form>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Valeur libelle="Prochaine action" className="col-span-2" valeur={a.prochaineAction} indispensable />
          <Valeur
            libelle="Date de la prochaine action"
            valeur={
              a.dateProchaineAction && (
                <span className={enRetard(a.dateProchaineAction, jour) ? "font-semibold text-[#b0389f]" : ""}>
                  {formaterDate(a.dateProchaineAction)}
                  {enRetard(a.dateProchaineAction, jour) && " · en retard"}
                </span>
              )
            }
            indispensable
          />
          <Valeur libelle="Budget validé / Décideur" valeur={`${oui(a.budgetValide)} / ${oui(a.decideurIdentifie)}`} />
          <Valeur libelle="Offre" valeur={a.offre} />
          <Valeur libelle="Montant mensuel" valeur={a.montantMensuel != null && `${formaterEuros(a.montantMensuel)}/mois`} />
          <Valeur libelle="Durée" valeur={a.dureeMois != null && `${a.dureeMois} mois`} />
          <Valeur libelle="Valeur totale" valeur={a.valeurTotale != null && formaterEuros(a.valeurTotale)} />
          <Valeur libelle="Tarif historique" valeur={oui(a.tarifHistorique)} />
          <Valeur libelle="Proposition envoyée le" valeur={formaterDate(a.dateProposition)} />
          <Valeur libelle="Signée le" valeur={formaterDate(a.dateSignature)} />
          {alerteAffiche && <p className="col-span-2 rounded-lg bg-lavande/40 p-3 text-sm text-titre">{alerteAffiche}</p>}
          <Valeur libelle="Notes de RDV" className="col-span-2" valeur={a.notesRdv && <span className="whitespace-pre-wrap">{a.notesRdv}</span>} />
        </dl>
      )}

      {cible && <FenetreEtape affaire={a} etape={cible} nom={nom} onFermer={() => setCible(null)} />}
    </>
  );
}
