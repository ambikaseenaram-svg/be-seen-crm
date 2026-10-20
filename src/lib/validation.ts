// Schémas de saisie des fiches Entreprises. Messages = section 7 du document « Écrans et parcours ».
import { z } from "zod";
import {
  CANAUX_OPT_OUT,
  CANAUX_PREFERES,
  DEPARTEMENTS,
  ETAPES,
  MODES_COLLAB,
  MOTIFS_PERTE,
  OFFRES,
  ORIGINES,
  ROLES_CONTACT,
  SECTEURS,
  TYPES_COORDONNEES,
} from "./listes";

export const MSG = {
  obligatoire: "Ce champ est obligatoire.",
  note: "Note entre 0 et 5.",
  email: "Adresse email invalide.",
  positif: "Valeur positive attendue.",
};

const versNull = (v: unknown) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null);

const texteObligatoire = (max = 200) => z.string({ error: MSG.obligatoire }).trim().min(1, MSG.obligatoire).max(max);
const texte = (max = 200) => z.preprocess(versNull, z.string().max(max).nullable());
const liste = <T extends readonly [string, ...string[]]>(valeurs: T) =>
  z.preprocess(versNull, z.enum(valeurs).nullable());
const listeObligatoire = <T extends readonly [string, ...string[]]>(valeurs: T) =>
  z.enum(valeurs, { error: MSG.obligatoire });
const entierPositif = z.preprocess(
  (v) => (versNull(v) == null ? null : Number(v)),
  z.number({ error: MSG.positif }).int(MSG.positif).min(0, MSG.positif).nullable(),
);
const note = z.preprocess(
  (v) => (versNull(v) == null ? null : Number(v)),
  z.number({ error: MSG.note }).int(MSG.note).min(0, MSG.note).max(5, MSG.note).nullable(),
);
const email = z.preprocess(versNull, z.email(MSG.email).nullable());

export const schemaAjoutRapide = z.object({
  nom: texteObligatoire(),
  ville: texteObligatoire(),
  origine: listeObligatoire(ORIGINES),
  secteur: liste(SECTEURS),
  contactNom: texte(),
  telephone: texte(40),
  instagramUrl: texte(300),
  forcer: z.boolean().optional(), // créer malgré un doublon probable
});

export const schemaIdentite = z.object({
  nom: texteObligatoire(),
  ville: texteObligatoire(),
  secteur: liste(SECTEURS),
  departement: liste(DEPARTEMENTS),
  modeCollab: liste(MODES_COLLAB),
  trajetMin: entierPositif,
  contactNom: texte(),
  contactRole: liste(ROLES_CONTACT),
  telephone: texte(40),
  email,
  instagramUrl: texte(300),
  siteUrl: texte(300),
  canalPrefere: liste(CANAUX_PREFERES),
  creneau: texte(60),
  abonnesInsta: entierPositif,
  recommandePar: texte(),
});

export const schemaScoring = z.object({
  c1: note,
  c2: note,
  c3: note,
  c4: note,
  c5: note,
  angleAccroche: texte(500),
});

export const schemaConformite = z.object({
  origine: listeObligatoire(ORIGINES),
  dateCollecte: z.iso.date(MSG.obligatoire),
  typeCoordonnees: liste(TYPES_COORDONNEES),
  infoRgpd: z.boolean(),
});

export const schemaOptOut = z.object({
  date: z.iso.date(MSG.obligatoire),
  canal: listeObligatoire(CANAUX_OPT_OUT),
});

const dateFacultative = z.preprocess(versNull, z.iso.date(MSG.obligatoire).nullable());
const dureeMois = z.preprocess(
  (v) => (versNull(v) == null ? null : Number(v)),
  z.number({ error: MSG.positif }).int(MSG.positif).min(1, MSG.positif).max(60, "60 mois maximum.").nullable(),
);

// Détails d'une affaire. Montant et durée n'ont de sens qu'avec une offre.
export const schemaAffaire = z
  .object({
    prochaineAction: texte(300),
    dateProchaineAction: dateFacultative,
    budgetValide: z.boolean(),
    decideurIdentifie: z.boolean(),
    offre: liste(OFFRES),
    montantMensuel: entierPositif,
    dureeMois,
    tarifHistorique: z.boolean(),
    dateProposition: dateFacultative,
    dateSignature: dateFacultative,
    motifPerte: liste(MOTIFS_PERTE),
    notesRdv: texte(2000),
  })
  .superRefine((d, ctx) => {
    if (!d.offre && (d.montantMensuel != null || d.dureeMois != null)) {
      ctx.addIssue({ code: "custom", path: ["offre"], message: "Choisis l'offre." });
    }
  });

// Changement d'étape : les champs exigés par l'étape visée sont contrôlés côté données (champsManquants).
export const schemaChangementEtape = z.object({
  etape: listeObligatoire(ETAPES),
  motifPerte: liste(MOTIFS_PERTE),
  offre: liste(OFFRES),
  montantMensuel: entierPositif,
  dureeMois,
});

export type Erreurs = Record<string, string>;

// Première erreur de chaque champ, prête à afficher sous le champ.
export function erreursParChamp(err: z.ZodError): Erreurs {
  const erreurs: Erreurs = {};
  for (const issue of err.issues) {
    const champ = String(issue.path[0] ?? "_");
    erreurs[champ] ??= issue.message;
  }
  return erreurs;
}
