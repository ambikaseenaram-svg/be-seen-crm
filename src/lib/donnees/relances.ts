import "server-only";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { affaires, entreprises, interactions } from "@/db/schema";
import { estFermee } from "@/lib/affaires";
import { aujourdhui } from "@/lib/dates";
import { joursDeRetard, statutRelance, type StatutRelance } from "@/lib/relances";
import type { schemaPlanification } from "@/lib/validation";

export type Relance = {
  affaireId: string;
  entrepriseId: string;
  nom: string;
  ville: string;
  etape: string;
  prochaineAction: string | null;
  date: string | null;
  statut: StatutRelance;
  joursRetard: number;
  score: number | null;
  priorite: string | null;
  disqualifie: boolean;
  telephone: string | null;
  contactNom: string | null;
  canalPrefere: string | null;
  derniereInteraction: string | null;
  dejaContacte: boolean;
};

const scoreDesc = (a: Relance, b: Relance) => (b.score ?? -1) - (a.score ?? -1) || a.nom.localeCompare(b.nom, "fr");

// Toutes les affaires ouvertes à suivre, hors opt-out et hors « En pause » sans date.
// En retard : la plus ancienne d'abord (les oubliés en tête). Les autres groupes : meilleur score d'abord.
export function listerRelances(jour = aujourdhui()): Relance[] {
  const contactees = new Set(db.select({ id: interactions.entrepriseId }).from(interactions).all().map((i) => i.id));
  const lignes = db
    .select({ a: affaires, e: entreprises })
    .from(affaires)
    .innerJoin(entreprises, eq(entreprises.id, affaires.entrepriseId))
    .all()
    .filter(({ a, e }) => !e.optOut && !estFermee(a.etape) && !(a.etape === "En pause" && !a.dateProchaineAction))
    .map(({ a, e }): Relance => {
      const statut = statutRelance(a.dateProchaineAction, jour);
      return {
        affaireId: a.id,
        entrepriseId: e.id,
        nom: e.nom,
        ville: e.ville,
        etape: a.etape,
        prochaineAction: a.prochaineAction,
        date: a.dateProchaineAction,
        statut,
        joursRetard: statut === "retard" && a.dateProchaineAction ? joursDeRetard(a.dateProchaineAction, jour) : 0,
        score: e.score,
        priorite: e.priorite,
        disqualifie: e.disqualifie,
        telephone: e.telephone,
        contactNom: e.contactNom,
        canalPrefere: e.canalPrefere,
        derniereInteraction: e.derniereInteraction,
        dejaContacte: contactees.has(e.id),
      };
    });
  const ordre: Record<StatutRelance, number> = { retard: 0, aujourdhui: 1, avenir: 2, sans: 3 };
  return lignes.sort((a, b) => ordre[a.statut] - ordre[b.statut] || (a.statut === "retard" || a.statut === "avenir" ? (a.date as string).localeCompare(b.date as string) || scoreDesc(a, b) : scoreDesc(a, b)));
}

// Ce qui attend aujourd'hui : en retard + du jour (pastille de la barre latérale).
export function compterRelances(jour = aujourdhui()): number {
  return listerRelances(jour).filter((r) => r.statut === "retard" || r.statut === "aujourdhui").length;
}

export type ResultatPlanification = { ok: true } | { ok: false; message: string };

// Reporter (même action, nouvelle date) ou planifier (nouvelle action). Une action existante est conservée si aucun texte n'est donné.
export function planifierAction(affaireId: string, d: z.infer<typeof schemaPlanification>): ResultatPlanification {
  const ligne = db
    .select({ a: affaires, optOut: entreprises.optOut })
    .from(affaires)
    .innerJoin(entreprises, eq(entreprises.id, affaires.entrepriseId))
    .where(eq(affaires.id, affaireId))
    .get();
  if (!ligne) return { ok: false, message: "Cette affaire n'existe plus." };
  if (estFermee(ligne.a.etape)) return { ok: false, message: "Cette affaire est terminée." };
  if (ligne.optOut) return { ok: false, message: "Cette entreprise a demandé à ne plus être contactée." };
  db.update(affaires)
    .set({
      dateProchaineAction: d.dateProchaineAction,
      prochaineAction: d.prochaineAction ?? ligne.a.prochaineAction,
      modifieLe: new Date().toISOString(),
    })
    .where(eq(affaires.id, affaireId))
    .run();
  return { ok: true };
}
