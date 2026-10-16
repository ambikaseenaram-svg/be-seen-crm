"use client";

import { useState } from "react";
import type { Entreprise } from "@/db/schema";
import { CANAUX_OPT_OUT, ORIGINES, TYPES_COORDONNEES } from "@/lib/listes";
import { aujourdhui, formaterDate } from "@/lib/dates";
import { enleverOptOut, modifierConformite, poserOptOut } from "@/app/(app)/entreprises/actions";
import Fenetre from "../ui/Fenetre";
import { Champ, Liste } from "../ui/Champ";
import { BoutonLien, BoutonsEdition, Section, Valeur, useSauvegarde } from "./outils";

export default function SectionConformite({ entreprise: e }: { entreprise: Entreprise }) {
  const initial = () => ({
    origine: e.origine as string,
    dateCollecte: e.dateCollecte,
    typeCoordonnees: e.typeCoordonnees ?? "",
    infoRgpd: e.infoRgpd,
  });
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState(initial);
  const [fenetre, setFenetre] = useState<"optout" | "retrait" | null>(null);
  const { enCours, erreurs, message, sauver, setErreurs } = useSauvegarde();

  return (
    <Section
      titre="Conformité"
      actions={
        !edition && (
          <>
            <BoutonLien onClick={() => setEdition(true)}>Modifier</BoutonLien>
            {e.optOut ? (
              <BoutonLien onClick={() => setFenetre("retrait")}>Retirer l&apos;opt-out</BoutonLien>
            ) : (
              <BoutonLien danger onClick={() => setFenetre("optout")}>Marquer opt-out</BoutonLien>
            )}
          </>
        )
      }
    >
      {edition ? (
        <form
          noValidate
          className="grid grid-cols-2 gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            sauver(() => modifierConformite(e.id, f), () => setEdition(false));
          }}
        >
          <Champ libelle="Origine du contact" obligatoire erreur={erreurs.origine}>
            <Liste valeurs={ORIGINES} value={f.origine} onChange={(v) => setF({ ...f, origine: v })} erreur={!!erreurs.origine} />
          </Champ>
          <Champ libelle="Date de collecte" obligatoire erreur={erreurs.dateCollecte}>
            <input type="date" className={`champ ${erreurs.dateCollecte ? "champ-erreur" : ""}`} value={f.dateCollecte} onChange={(ev) => setF({ ...f, dateCollecte: ev.target.value })} />
          </Champ>
          <Champ libelle="Type de coordonnées">
            <Liste valeurs={TYPES_COORDONNEES} value={f.typeCoordonnees} onChange={(v) => setF({ ...f, typeCoordonnees: v })} />
          </Champ>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-titre">
            <input type="checkbox" checked={f.infoRgpd} onChange={(ev) => setF({ ...f, infoRgpd: ev.target.checked })} className="h-4 w-4 accent-violet" />
            Info RGPD donnée (mention de refus au 1er message écrit)
          </label>
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
          <Valeur libelle="Origine du contact" valeur={e.origine} />
          <Valeur libelle="Date de collecte" valeur={formaterDate(e.dateCollecte)} />
          <Valeur libelle="Type de coordonnées" valeur={e.typeCoordonnees} indispensable />
          <Valeur libelle="Info RGPD donnée" valeur={e.infoRgpd ? "Oui" : "Non"} />
          <Valeur libelle="Opt-out" valeur={e.optOut ? "Oui — ne plus contacter" : "Non"} />
          <Valeur libelle="Dernière interaction" valeur={formaterDate(e.derniereInteraction)} />
          {e.optOut && (
            <>
              <Valeur libelle="Date opt-out" valeur={formaterDate(e.dateOptOut)} />
              <Valeur libelle="Canal opt-out" valeur={e.canalOptOut} />
            </>
          )}
        </dl>
      )}

      {fenetre === "optout" && <FenetreOptOut id={e.id} onFermer={() => setFenetre(null)} />}
      {fenetre === "retrait" && <FenetreRetrait id={e.id} nom={e.nom} onFermer={() => setFenetre(null)} />}
    </Section>
  );
}

function FenetreOptOut({ id, onFermer }: { id: string; onFermer: () => void }) {
  const [f, setF] = useState({ date: aujourdhui(), canal: "" });
  const { enCours, erreurs, message, sauver } = useSauvegarde();
  return (
    <Fenetre titre="Marquer opt-out" onFermer={onFermer}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          sauver(() => poserOptOut(id, f), onFermer);
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Date de la demande" obligatoire erreur={erreurs.date}>
            <input type="date" className="champ" value={f.date} onChange={(ev) => setF({ ...f, date: ev.target.value })} />
          </Champ>
          <Champ libelle="Canal de la demande" obligatoire erreur={erreurs.canal}>
            <Liste valeurs={CANAUX_OPT_OUT} value={f.canal} onChange={(v) => setF({ ...f, canal: v })} vide="Choisir…" erreur={!!erreurs.canal} />
          </Champ>
        </div>
        <p className="rounded-lg bg-lavande/40 p-3 text-sm text-titre">Cette entreprise ne sera plus jamais proposée au contact.</p>
        {message && <p className="message-erreur">{message}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onFermer} className="text-sm text-annotation hover:text-titre">Annuler</button>
          <button type="submit" disabled={enCours} className="bouton">Confirmer l&apos;opt-out</button>
        </div>
      </form>
    </Fenetre>
  );
}

// Retirer un opt-out demande deux confirmations.
function FenetreRetrait({ id, nom, onFermer }: { id: string; nom: string; onFermer: () => void }) {
  const [etape, setEtape] = useState(1);
  const { enCours, message, sauver } = useSauvegarde();
  return (
    <Fenetre titre="Retirer l'opt-out" onFermer={onFermer}>
      <p className="mb-4 text-sm text-titre">
        {etape === 1
          ? `${nom} a demandé à ne plus être contactée. Retirer l'opt-out n'est justifié que si l'entreprise te l'a demandé elle-même.`
          : "Dernière confirmation : l'entreprise redeviendra contactable."}
      </p>
      {message && <p className="message-erreur mb-3">{message}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onFermer} className="text-sm text-annotation hover:text-titre">Annuler</button>
        {etape === 1 ? (
          <button type="button" onClick={() => setEtape(2)} className="bouton">Continuer</button>
        ) : (
          <button type="button" disabled={enCours} onClick={() => sauver(() => enleverOptOut(id), onFermer)} className="bouton">
            Oui, retirer l&apos;opt-out
          </button>
        )}
      </div>
    </Fenetre>
  );
}
