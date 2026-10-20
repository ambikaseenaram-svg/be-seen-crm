import "server-only";
import { and, desc, eq, notInArray } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { affaires, entreprises, type Affaire, type Entreprise } from "@/db/schema";
import { champsManquants, estFermee, valeurTotale } from "@/lib/affaires";
import { aujourdhui } from "@/lib/dates";
import { ETAPES_FERMEES } from "@/lib/listes";
import type { schemaAffaire, schemaChangementEtape } from "@/lib/validation";

export type CarteAffaire = {
  affaire: Affaire;
  entreprise: Pick<Entreprise, "id" | "nom" | "ville" | "score" | "priorite" | "optOut" | "disqualifie">;
};

const ouverte = notInArray(affaires.etape, [...ETAPES_FERMEES]);

export function obtenirAffaire(id: string): Affaire | null {
  return db.select().from(affaires).where(eq(affaires.id, id)).get() ?? null;
}

export function obtenirAffaireOuverte(entrepriseId: string): Affaire | null {
  return db.select().from(affaires).where(and(eq(affaires.entrepriseId, entrepriseId), ouverte)).get() ?? null;
}

// Affaires terminées ou perdues, la plus récente d'abord.
export function listerAffairesFermees(entrepriseId: string): Affaire[] {
  return db
    .select()
    .from(affaires)
    .where(eq(affaires.entrepriseId, entrepriseId))
    .orderBy(desc(affaires.dateEtape))
    .all()
    .filter((a) => estFermee(a.etape));
}

export function listerPipeline(): CarteAffaire[] {
  return db
    .select({
      affaire: affaires,
      entreprise: {
        id: entreprises.id,
        nom: entreprises.nom,
        ville: entreprises.ville,
        score: entreprises.score,
        priorite: entreprises.priorite,
        optOut: entreprises.optOut,
        disqualifie: entreprises.disqualifie,
      },
    })
    .from(affaires)
    .innerJoin(entreprises, eq(entreprises.id, affaires.entrepriseId))
    .where(ouverte)
    .all();
}

const maintenant = () => new Date().toISOString();

export function majAffaire(id: string, d: z.infer<typeof schemaAffaire>) {
  db.update(affaires)
    .set({ ...d, valeurTotale: valeurTotale(d.montantMensuel, d.dureeMois), modifieLe: maintenant() })
    .where(eq(affaires.id, id))
    .run();
}

export type ResultatEtape = { ok: true } | { ok: false; erreurs: Record<string, string> };

// Les valeurs saisies complètent celles de l'affaire ; ce qui manque pour l'étape visée est refusé, jamais deviné.
export function changerEtape(id: string, d: z.infer<typeof schemaChangementEtape>): ResultatEtape {
  const a = obtenirAffaire(id);
  if (!a) return { ok: false, erreurs: { etape: "Cette affaire n'existe plus." } };
  if (estFermee(a.etape)) return { ok: false, erreurs: { etape: "Cette affaire est terminée. Ouvre-en une nouvelle." } };

  const fusion = {
    offre: d.offre ?? a.offre,
    montantMensuel: d.montantMensuel ?? a.montantMensuel,
    dureeMois: d.dureeMois ?? a.dureeMois,
    motifPerte: d.motifPerte ?? a.motifPerte,
  };
  const manquants = champsManquants(d.etape, fusion);
  if (Object.keys(manquants).length) return { ok: false, erreurs: manquants };

  const jour = aujourdhui();
  db.update(affaires)
    .set({
      ...fusion,
      valeurTotale: valeurTotale(fusion.montantMensuel, fusion.dureeMois),
      etape: d.etape,
      dateEtape: d.etape === a.etape ? a.dateEtape : jour,
      dateProposition: d.etape === "Proposition envoyée" ? (a.dateProposition ?? jour) : a.dateProposition,
      dateSignature: d.etape === "Client actif" ? (a.dateSignature ?? jour) : a.dateSignature,
      modifieLe: maintenant(),
    })
    .where(eq(affaires.id, id))
    .run();
  return { ok: true };
}

// Une seule affaire ouverte par entreprise : refusé s'il y en a déjà une.
export function ouvrirNouvelleAffaire(entrepriseId: string): boolean {
  if (obtenirAffaireOuverte(entrepriseId)) return false;
  db.insert(affaires).values({ entrepriseId, etape: "Repéré", dateEtape: aujourdhui() }).run();
  return true;
}
