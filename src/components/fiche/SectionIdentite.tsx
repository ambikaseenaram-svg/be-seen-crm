"use client";

import { useState } from "react";
import type { Entreprise } from "@/db/schema";
import { CANAUX_PREFERES, DEPARTEMENTS, MODES_COLLAB, ROLES_CONTACT, SECTEURS } from "@/lib/listes";
import { lienInstagram, lienWeb } from "@/lib/texte";
import { modifierIdentite } from "@/app/(app)/entreprises/actions";
import { Champ, Liste } from "../ui/Champ";
import { BoutonLien, BoutonsEdition, Section, Valeur, useSauvegarde, versFormulaire } from "./outils";

const CHAMPS = [
  "nom", "ville", "secteur", "departement", "modeCollab", "trajetMin", "contactNom", "contactRole", "telephone",
  "email", "instagramUrl", "siteUrl", "canalPrefere", "creneau", "abonnesInsta", "recommandePar",
] as const;

export default function SectionIdentite({ entreprise: e }: { entreprise: Entreprise }) {
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState(() => versFormulaire(Object.fromEntries(CHAMPS.map((c) => [c, e[c]]))));
  const { enCours, erreurs, message, sauver, setErreurs } = useSauvegarde();

  const saisie = (c: (typeof CHAMPS)[number], type = "text") => (
    <input
      type={type}
      className={`champ ${erreurs[c] ? "champ-erreur" : ""}`}
      value={f[c]}
      min={type === "number" ? 0 : undefined}
      onChange={(ev) => setF({ ...f, [c]: ev.target.value })}
    />
  );
  const liste = (c: (typeof CHAMPS)[number], valeurs: readonly string[]) => (
    <Liste valeurs={valeurs} value={f[c]} onChange={(v) => setF({ ...f, [c]: v })} erreur={!!erreurs[c]} />
  );

  if (edition) {
    return (
      <Section titre="Identité et contact">
        <form
          noValidate
          className="grid grid-cols-2 gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            sauver(() => modifierIdentite(e.id, f), () => setEdition(false));
          }}
        >
          <Champ libelle="Entreprise" obligatoire erreur={erreurs.nom}>{saisie("nom")}</Champ>
          <Champ libelle="Ville" obligatoire erreur={erreurs.ville}>{saisie("ville")}</Champ>
          <Champ libelle="Secteur">{liste("secteur", SECTEURS)}</Champ>
          <Champ libelle="Département">{liste("departement", DEPARTEMENTS)}</Champ>
          <Champ libelle="Mode de collaboration">{liste("modeCollab", MODES_COLLAB)}</Champ>
          <Champ libelle="Temps de trajet (min)" erreur={erreurs.trajetMin}>{saisie("trajetMin", "number")}</Champ>
          <Champ libelle="Contact">{saisie("contactNom")}</Champ>
          <Champ libelle="Rôle du contact">{liste("contactRole", ROLES_CONTACT)}</Champ>
          <Champ libelle="Téléphone">{saisie("telephone", "tel")}</Champ>
          <Champ libelle="Email" erreur={erreurs.email}>{saisie("email", "email")}</Champ>
          <Champ libelle="Instagram">{saisie("instagramUrl")}</Champ>
          <Champ libelle="Site ou fiche Google">{saisie("siteUrl")}</Champ>
          <Champ libelle="Canal préféré">{liste("canalPrefere", CANAUX_PREFERES)}</Champ>
          <Champ libelle="Créneau joignable">{saisie("creneau")}</Champ>
          <Champ libelle="Abonnés Instagram" erreur={erreurs.abonnesInsta}>{saisie("abonnesInsta", "number")}</Champ>
          <Champ libelle="Recommandé par">{saisie("recommandePar")}</Champ>
          <BoutonsEdition
            enCours={enCours}
            message={message}
            onAnnuler={() => {
              setF(versFormulaire(Object.fromEntries(CHAMPS.map((c) => [c, e[c]]))));
              setErreurs({});
              setEdition(false);
            }}
          />
        </form>
      </Section>
    );
  }

  const insta = lienInstagram(e.instagramUrl);
  const site = lienWeb(e.siteUrl);
  return (
    <Section titre="Identité et contact" actions={!e.optOut && <BoutonLien onClick={() => setEdition(true)}>Modifier</BoutonLien>}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Valeur libelle="Secteur" valeur={e.secteur} indispensable />
        <Valeur libelle="Département" valeur={e.departement} indispensable />
        <Valeur libelle="Mode de collaboration" valeur={e.modeCollab} indispensable />
        <Valeur libelle="Temps de trajet" valeur={e.trajetMin != null ? `${e.trajetMin} min` : null} />
        <Valeur libelle="Contact" valeur={e.contactNom} indispensable />
        <Valeur libelle="Rôle du contact" valeur={e.contactRole} indispensable />
        <Valeur
          libelle="Téléphone"
          indispensable
          valeur={e.telephone && <a className="text-bouton underline" href={`tel:${e.telephone.replace(/\s/g, "")}`}>{e.telephone}</a>}
        />
        <Valeur libelle="Email" indispensable valeur={e.email && <a className="text-bouton underline" href={`mailto:${e.email}`}>{e.email}</a>} />
        <Valeur
          libelle="Instagram"
          indispensable
          valeur={insta && <a className="break-all text-bouton underline" href={insta} target="_blank" rel="noreferrer">{e.instagramUrl}</a>}
        />
        <Valeur
          libelle="Site ou fiche Google"
          valeur={site && <a className="break-all text-bouton underline" href={site} target="_blank" rel="noreferrer">{e.siteUrl}</a>}
        />
        <Valeur libelle="Canal préféré" valeur={e.canalPrefere} indispensable />
        <Valeur libelle="Créneau joignable" valeur={e.creneau} />
        <Valeur libelle="Abonnés Instagram" valeur={e.abonnesInsta?.toLocaleString("fr-FR")} />
        <Valeur libelle="Recommandé par" valeur={e.recommandePar} />
      </dl>
    </Section>
  );
}
