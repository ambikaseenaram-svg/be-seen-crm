import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { affaires, entreprises, interactions } from "@/db/schema";
import { estFermee, ETAPES_KANBAN } from "@/lib/affaires";
import { aujourdhui } from "@/lib/dates";
import { FENETRE_CANAUX_JOURS, SEUIL_CANAL } from "@/lib/objectifs";
import { ajouterJours } from "@/lib/relances";
import { memeMois, statsCanaux } from "@/lib/tableau-bord";
import { listerRelances } from "./relances";

export type TableauBord = {
  jour: string;
  contactesAujourdhui: number;
  relances: { retard: number; aujourdhui: number };
  signe: { montantMensuel: number; valeurTotale: number; nombre: number };
  etapes: { etape: string; n: number }[];
  canaux: ReturnType<typeof statsCanaux>;
  nbEntreprises: number;
};

export function chargerTableauBord(jour = aujourdhui()): TableauBord {
  const toutes = db.select().from(interactions).all();
  const contactesAujourdhui = new Set(toutes.filter((i) => i.date === jour).map((i) => i.entrepriseId)).size;

  const relances = listerRelances(jour);
  const lignes = db.select({ a: affaires, e: entreprises }).from(affaires).innerJoin(entreprises, eq(entreprises.id, affaires.entrepriseId)).all();

  // Signé = affaire arrivée à « Client actif » (ou terminée depuis) avec une date de signature dans le mois.
  const signees = lignes.filter(({ a }) => (a.etape === "Client actif" || a.etape === "Client terminé") && memeMois(a.dateSignature, jour));
  const ouvertes = lignes.filter(({ a }) => !estFermee(a.etape));

  const depuis = ajouterJours(jour, -FENETRE_CANAUX_JOURS);
  return {
    jour,
    contactesAujourdhui,
    relances: {
      retard: relances.filter((r) => r.statut === "retard").length,
      aujourdhui: relances.filter((r) => r.statut === "aujourdhui").length,
    },
    signe: {
      montantMensuel: signees.reduce((s, { a }) => s + (a.montantMensuel ?? 0), 0),
      valeurTotale: signees.reduce((s, { a }) => s + (a.valeurTotale ?? 0), 0),
      nombre: signees.length,
    },
    etapes: ETAPES_KANBAN.map((etape) => ({ etape, n: ouvertes.filter(({ a }) => a.etape === etape).length })),
    canaux: statsCanaux(toutes.filter((i) => i.date >= depuis && i.date <= jour), SEUIL_CANAL),
    nbEntreprises: db.select({ id: entreprises.id }).from(entreprises).all().length,
  };
}
