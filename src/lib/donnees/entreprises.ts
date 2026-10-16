import "server-only";
import { and, count, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { affaires, entreprises, type Entreprise } from "@/db/schema";
import { ETAPES_FERMEES } from "@/lib/listes";
import { aujourdhui } from "@/lib/dates";
import { calculerScoring, notesCompletes, type Notes } from "@/lib/scoring";
import { normaliser } from "@/lib/texte";
import type { z } from "zod";
import type { schemaAjoutRapide, schemaConformite, schemaIdentite, schemaScoring } from "@/lib/validation";

export type LigneEntreprise = Entreprise & { etape: string | null; affaireId: string | null };

export type Filtres = {
  q?: string;
  secteur?: string;
  departement?: string;
  origine?: string;
  etape?: string;
  priorite?: string;
  optout?: string; // "oui" | "non"
};

const affaireOuverte = and(eq(affaires.entrepriseId, entreprises.id), notInArray(affaires.etape, [...ETAPES_FERMEES]));

function lignes() {
  return db
    .select({ e: entreprises, etape: affaires.etape, affaireId: affaires.id })
    .from(entreprises)
    .leftJoin(affaires, affaireOuverte)
    .all()
    .map(({ e, etape, affaireId }) => ({ ...e, etape, affaireId }));
}

// Filtrage en mémoire : quelques centaines de fiches au plus, et recherche insensible aux accents.
export function listerEntreprises(f: Filtres = {}): LigneEntreprise[] {
  const q = normaliser(f.q);
  return lignes()
    .filter((e) => {
      if (q && ![e.nom, e.ville, e.contactNom].some((v) => normaliser(v).includes(q))) return false;
      if (f.secteur && e.secteur !== f.secteur) return false;
      if (f.departement && e.departement !== f.departement) return false;
      if (f.origine && e.origine !== f.origine) return false;
      if (f.etape && e.etape !== f.etape) return false;
      if (f.priorite && e.priorite !== f.priorite) return false;
      if (f.optout === "oui" && !e.optOut) return false;
      if (f.optout === "non" && e.optOut) return false;
      return true;
    })
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}

export function compterEntreprises(): number {
  return db.select({ n: count() }).from(entreprises).get()?.n ?? 0;
}

export function obtenirEntreprise(id: string): LigneEntreprise | null {
  const ligne = db
    .select({ e: entreprises, etape: affaires.etape, affaireId: affaires.id })
    .from(entreprises)
    .leftJoin(affaires, affaireOuverte)
    .where(eq(entreprises.id, id))
    .get();
  return ligne ? { ...ligne.e, etape: ligne.etape, affaireId: ligne.affaireId } : null;
}

// Doublon probable : même nom et même ville, sans tenir compte des accents ni des majuscules.
export function trouverDoublon(nom: string, ville: string, saufId?: string) {
  const n = normaliser(nom);
  const v = normaliser(ville);
  return (
    db
      .select({ id: entreprises.id, nom: entreprises.nom, ville: entreprises.ville })
      .from(entreprises)
      .all()
      .find((e) => e.id !== saufId && normaliser(e.nom) === n && normaliser(e.ville) === v) ?? null
  );
}

// Crée l'entreprise et son affaire à « Repéré », date de collecte = aujourd'hui.
export function creerEntrepriseRapide(d: z.infer<typeof schemaAjoutRapide>) {
  const jour = aujourdhui();
  return db.transaction((tx) => {
    const { id } = tx
      .insert(entreprises)
      .values({
        nom: d.nom,
        ville: d.ville,
        origine: d.origine,
        secteur: d.secteur,
        contactNom: d.contactNom,
        telephone: d.telephone,
        instagramUrl: d.instagramUrl,
        dateCollecte: jour,
      })
      .returning({ id: entreprises.id })
      .get();
    tx.insert(affaires).values({ entrepriseId: id, etape: "Repéré", dateEtape: jour }).run();
    return id;
  });
}

function maj(id: string, valeurs: Partial<typeof entreprises.$inferInsert>) {
  db.update(entreprises)
    .set({ ...valeurs, modifieLe: new Date().toISOString() })
    .where(eq(entreprises.id, id))
    .run();
}

export function majIdentite(id: string, d: z.infer<typeof schemaIdentite>) {
  maj(id, d);
}

// Score, priorité et disqualification sont recalculés ; la date de scoring est posée quand les 5 notes sont saisies.
export function majScoring(id: string, d: z.infer<typeof schemaScoring>) {
  const avant = obtenirEntreprise(id);
  if (!avant) return;
  const notes: Notes = { c1: d.c1, c2: d.c2, c3: d.c3, c4: d.c4, c5: d.c5 };
  const notesChangees = (["c1", "c2", "c3", "c4", "c5"] as const).some((c) => avant[c] !== notes[c]);
  const complet = notesCompletes(notes);
  const dateScoring = !complet ? null : notesChangees || !avant.dateScoring ? aujourdhui() : avant.dateScoring;
  maj(id, { ...notes, ...calculerScoring(notes), angleAccroche: d.angleAccroche, dateScoring });
}

export function majConformite(id: string, d: z.infer<typeof schemaConformite>) {
  maj(id, d);
}

export function marquerOptOut(id: string, date: string, canal: Entreprise["canalOptOut"]) {
  maj(id, { optOut: true, dateOptOut: date, canalOptOut: canal });
}

export function retirerOptOut(id: string) {
  maj(id, { optOut: false, dateOptOut: null, canalOptOut: null });
}

// Suppression définitive : les affaires et interactions partent avec (cascade).
export function supprimerEntreprise(id: string) {
  db.delete(entreprises).where(eq(entreprises.id, id)).run();
}
