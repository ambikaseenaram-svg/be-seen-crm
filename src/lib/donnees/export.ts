import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { affaires, entreprises, type Affaire, type Interaction } from "@/db/schema";
import { construireCsv, type Colonne } from "@/lib/csv";
import { formaterDate } from "@/lib/dates";
import { listerEntreprises, type Filtres, type LigneEntreprise } from "./entreprises";
import { listerJournal, type FiltresJournal } from "./interactions";

const d = formaterDate;

const COLONNES_PROSPECTS: Colonne<LigneEntreprise>[] = [
  { titre: "Nom", valeur: (e) => e.nom },
  { titre: "Ville", valeur: (e) => e.ville },
  { titre: "Département", valeur: (e) => e.departement },
  { titre: "Secteur", valeur: (e) => e.secteur },
  { titre: "Étape", valeur: (e) => e.etape },
  { titre: "Priorité", valeur: (e) => e.priorite },
  { titre: "Score", valeur: (e) => e.score },
  { titre: "Disqualifié", valeur: (e) => e.disqualifie },
  { titre: "Contact", valeur: (e) => e.contactNom },
  { titre: "Rôle du contact", valeur: (e) => e.contactRole },
  { titre: "Téléphone", valeur: (e) => e.telephone },
  { titre: "Email", valeur: (e) => e.email },
  { titre: "Instagram", valeur: (e) => e.instagramUrl },
  { titre: "Site web", valeur: (e) => e.siteUrl },
  { titre: "Canal préféré", valeur: (e) => e.canalPrefere },
  { titre: "Angle d'accroche", valeur: (e) => e.angleAccroche },
  { titre: "Mode de collaboration", valeur: (e) => e.modeCollab },
  { titre: "Trajet (min)", valeur: (e) => e.trajetMin },
  { titre: "Créneau", valeur: (e) => e.creneau },
  { titre: "Abonnés Instagram", valeur: (e) => e.abonnesInsta },
  { titre: "Recommandé par", valeur: (e) => e.recommandePar },
  { titre: "Note C1", valeur: (e) => e.c1 },
  { titre: "Note C2", valeur: (e) => e.c2 },
  { titre: "Note C3", valeur: (e) => e.c3 },
  { titre: "Note C4", valeur: (e) => e.c4 },
  { titre: "Note C5", valeur: (e) => e.c5 },
  { titre: "Date de scoring", valeur: (e) => d(e.dateScoring) },
  { titre: "Origine", valeur: (e) => e.origine },
  { titre: "Date de collecte", valeur: (e) => d(e.dateCollecte) },
  { titre: "Type de coordonnées", valeur: (e) => e.typeCoordonnees },
  { titre: "Info RGPD donnée", valeur: (e) => e.infoRgpd },
  { titre: "Opt-out", valeur: (e) => e.optOut },
  { titre: "Date opt-out", valeur: (e) => d(e.dateOptOut) },
  { titre: "Canal opt-out", valeur: (e) => e.canalOptOut },
  { titre: "Dernière interaction", valeur: (e) => d(e.derniereInteraction) },
  { titre: "Créée le", valeur: (e) => d(e.creeLe) },
];

type LigneAffaire = Affaire & { nom: string; ville: string };
const COLONNES_AFFAIRES: Colonne<LigneAffaire>[] = [
  { titre: "Entreprise", valeur: (a) => a.nom },
  { titre: "Ville", valeur: (a) => a.ville },
  { titre: "Étape", valeur: (a) => a.etape },
  { titre: "Date de l'étape", valeur: (a) => d(a.dateEtape) },
  { titre: "Prochaine action", valeur: (a) => a.prochaineAction },
  { titre: "Date de la prochaine action", valeur: (a) => d(a.dateProchaineAction) },
  { titre: "Budget validé", valeur: (a) => a.budgetValide },
  { titre: "Décideur identifié", valeur: (a) => a.decideurIdentifie },
  { titre: "Offre", valeur: (a) => a.offre },
  { titre: "Montant mensuel (€)", valeur: (a) => a.montantMensuel },
  { titre: "Durée (mois)", valeur: (a) => a.dureeMois },
  { titre: "Valeur totale (€)", valeur: (a) => a.valeurTotale },
  { titre: "Tarif historique", valeur: (a) => a.tarifHistorique },
  { titre: "Motif de perte", valeur: (a) => a.motifPerte },
  { titre: "Proposition envoyée le", valeur: (a) => d(a.dateProposition) },
  { titre: "Signée le", valeur: (a) => d(a.dateSignature) },
  { titre: "Notes de RDV", valeur: (a) => a.notesRdv },
];

type LigneEchange = Interaction & { entrepriseNom: string; entrepriseVille: string };
const COLONNES_ECHANGES: Colonne<LigneEchange>[] = [
  { titre: "Date", valeur: (i) => d(i.date) },
  { titre: "Entreprise", valeur: (i) => i.entrepriseNom },
  { titre: "Ville", valeur: (i) => i.entrepriseVille },
  { titre: "Type", valeur: (i) => i.type },
  { titre: "Canal", valeur: (i) => i.canal },
  { titre: "Résultat", valeur: (i) => i.resultat },
  { titre: "Décideur rencontré", valeur: (i) => i.decideurRencontre },
  { titre: "Note", valeur: (i) => i.note },
];

export type TypeExport = "prospects" | "affaires" | "echanges";
export const TYPES_EXPORT: TypeExport[] = ["prospects", "affaires", "echanges"];

const filtreActif = (f: Filtres) => Object.values(f).some(Boolean);

// Un export respecte le filtre de la liste d'où il est lancé ; sans filtre, il contient tout.
export function exporter(type: TypeExport, filtresEntreprises: Filtres, filtresJournal: FiltresJournal): { csv: string; lignes: number } {
  const portee = filtreActif(filtresEntreprises) ? new Set(listerEntreprises(filtresEntreprises).map((e) => e.id)) : null;

  if (type === "prospects") {
    const lignes = listerEntreprises(filtresEntreprises);
    return { csv: construireCsv(COLONNES_PROSPECTS, lignes), lignes: lignes.length };
  }
  if (type === "affaires") {
    const lignes = db
      .select({ a: affaires, nom: entreprises.nom, ville: entreprises.ville })
      .from(affaires)
      .innerJoin(entreprises, eq(entreprises.id, affaires.entrepriseId))
      .all()
      .filter(({ a }) => !portee || portee.has(a.entrepriseId))
      .map(({ a, nom, ville }) => ({ ...a, nom, ville }))
      .sort((x, y) => x.nom.localeCompare(y.nom, "fr"));
    return { csv: construireCsv(COLONNES_AFFAIRES, lignes), lignes: lignes.length };
  }
  const lignes = listerJournal(filtresJournal, Number.MAX_SAFE_INTEGER).lignes.filter((l) => !portee || portee.has(l.entrepriseId));
  return { csv: construireCsv(COLONNES_ECHANGES, lignes), lignes: lignes.length };
}
