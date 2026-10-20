import "server-only";
import { desc, eq, max } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { affaires, entreprises, interactions, type Interaction } from "@/db/schema";
import { enRetard } from "@/lib/affaires";
import { aujourdhui } from "@/lib/dates";
import { canalOptOut, estReponse, etapeSuggeree } from "@/lib/interactions";
import { changerEtape, obtenirAffaireOuverte } from "./affaires";
import { marquerOptOut, obtenirEntreprise } from "./entreprises";
import type { schemaInteraction } from "@/lib/validation";

export type LigneJournal = Interaction & { entrepriseNom: string; entrepriseVille: string };
export type ActionAFaire = {
  entrepriseId: string;
  nom: string;
  ville: string;
  etape: string;
  prochaineAction: string | null;
  date: string;
  enRetard: boolean;
};

export function listerParEntreprise(entrepriseId: string): Interaction[] {
  return db
    .select()
    .from(interactions)
    .where(eq(interactions.entrepriseId, entrepriseId))
    .orderBy(desc(interactions.date), desc(interactions.creeLe))
    .all();
}

export function obtenirInteraction(id: string): Interaction | null {
  return db.select().from(interactions).where(eq(interactions.id, id)).get() ?? null;
}

export type FiltresJournal = { type?: string; resultat?: string };

export function listerJournal(f: FiltresJournal = {}, limite = 200): { lignes: LigneJournal[]; total: number } {
  const toutes = db
    .select({ i: interactions, entrepriseNom: entreprises.nom, entrepriseVille: entreprises.ville })
    .from(interactions)
    .innerJoin(entreprises, eq(entreprises.id, interactions.entrepriseId))
    .orderBy(desc(interactions.date), desc(interactions.creeLe))
    .all()
    .map(({ i, entrepriseNom, entrepriseVille }) => ({ ...i, entrepriseNom, entrepriseVille }))
    .filter((l) => (!f.type || l.type === f.type) && (!f.resultat || l.resultat === f.resultat));
  return { lignes: toutes.slice(0, limite), total: toutes.length };
}

// Prochaines actions échues ou du jour, hors entreprises à ne plus contacter. Les plus en retard d'abord.
export function listerAFaire(jour = aujourdhui()): ActionAFaire[] {
  return db
    .select({ a: affaires, e: entreprises })
    .from(affaires)
    .innerJoin(entreprises, eq(entreprises.id, affaires.entrepriseId))
    .all()
    .filter(({ a, e }) => !e.optOut && a.dateProchaineAction && a.dateProchaineAction <= jour && a.etape !== "Client terminé" && a.etape !== "Perdu")
    .map(({ a, e }) => ({
      entrepriseId: e.id,
      nom: e.nom,
      ville: e.ville,
      etape: a.etape,
      prochaineAction: a.prochaineAction,
      date: a.dateProchaineAction as string,
      enRetard: enRetard(a.dateProchaineAction, jour),
    }))
    .sort((x, y) => x.date.localeCompare(y.date));
}

export type BilanSemaine = { contacts: number; reponses: number; rdv: number };

// Les 7 derniers jours (aujourd'hui compris) : uniquement des comptes réels du journal.
export function bilanSemaine(jour = aujourdhui()): BilanSemaine {
  const debut = new Date(`${jour}T00:00:00Z`);
  debut.setUTCDate(debut.getUTCDate() - 6);
  const depuis = debut.toISOString().slice(0, 10);
  const lignes = db.select().from(interactions).all().filter((i) => i.date >= depuis && i.date <= jour);
  return {
    contacts: lignes.length,
    reponses: lignes.filter((i) => estReponse(i.resultat)).length,
    rdv: lignes.filter((i) => i.resultat === "RDV obtenu").length,
  };
}

// Date de la dernière interaction de l'entreprise, recalculée à chaque changement du journal.
function recalculerDerniere(entrepriseId: string) {
  const derniere = db.select({ d: max(interactions.date) }).from(interactions).where(eq(interactions.entrepriseId, entrepriseId)).get()?.d ?? null;
  db.update(entreprises).set({ derniereInteraction: derniere, modifieLe: new Date().toISOString() }).where(eq(entreprises.id, entrepriseId)).run();
}

export type ResultatInteraction = { ok: true } | { ok: false; message: string };

export function creerInteraction(entrepriseId: string, d: z.infer<typeof schemaInteraction>): ResultatInteraction {
  const e = obtenirEntreprise(entrepriseId);
  if (!e) return { ok: false, message: "Cette fiche n'existe plus." };
  if (e.optOut) return { ok: false, message: "Cette entreprise a demandé à ne plus être contactée." };

  // Tout ou rien : si une étape échoue, rien n'est enregistré.
  return db.transaction(() => {
    const affaire = obtenirAffaireOuverte(entrepriseId);
    db.insert(interactions)
      .values({
        entrepriseId,
        affaireId: affaire?.id ?? null,
        date: d.date,
        type: d.type,
        canal: d.canal,
        resultat: d.resultat,
        decideurRencontre: d.decideurRencontre,
        note: d.note,
      })
      .run();

    if (affaire) {
      const suite: Partial<typeof affaires.$inferInsert> = {};
      if (d.prochaineAction) suite.prochaineAction = d.prochaineAction;
      if (d.dateProchaineAction) suite.dateProchaineAction = d.dateProchaineAction;
      if (d.decideurRencontre) suite.decideurIdentifie = true;
      if (Object.keys(suite).length) db.update(affaires).set({ ...suite, modifieLe: new Date().toISOString() }).where(eq(affaires.id, affaire.id)).run();
      const cible = d.avancerAffaire ? etapeSuggeree(affaire.etape, d.type, d.resultat) : null;
      if (cible) changerEtape(affaire.id, { etape: cible as never, motifPerte: null, offre: null, montantMensuel: null, dureeMois: null });
    }

    if (d.resultat === "Opt-out demandé") marquerOptOut(entrepriseId, d.date, canalOptOut(d.canal));
    recalculerDerniere(entrepriseId);
    return { ok: true } as const;
  });
}

export function modifierInteraction(id: string, d: z.infer<typeof schemaInteraction>): ResultatInteraction {
  const i = obtenirInteraction(id);
  if (!i) return { ok: false, message: "Cette interaction n'existe plus." };
  db.update(interactions)
    .set({ date: d.date, type: d.type, canal: d.canal, resultat: d.resultat, decideurRencontre: d.decideurRencontre, note: d.note })
    .where(eq(interactions.id, id))
    .run();
  recalculerDerniere(i.entrepriseId);
  return { ok: true };
}

export function supprimerInteraction(id: string): ResultatInteraction {
  const i = obtenirInteraction(id);
  if (!i) return { ok: false, message: "Cette interaction n'existe plus." };
  db.delete(interactions).where(eq(interactions.id, id)).run();
  recalculerDerniere(i.entrepriseId);
  return { ok: true };
}
