import "server-only";
import { db } from "@/db";
import { affaires, entreprises, interactions } from "@/db/schema";
import { aujourdhui } from "@/lib/dates";
import { derniereActivite, estPurgeable } from "@/lib/purge";
import { supprimerEntreprise } from "./entreprises";

export type Purgeable = {
  id: string;
  nom: string;
  ville: string;
  derniereActivite: string;
  avecEchange: boolean; // false : jamais contactée, la date de collecte fait foi
  nbInteractions: number;
  etape: string | null;
};

// Prospects sans aucun échange depuis plus de 3 ans. Clients (signés un jour) et opt-out sont exclus.
export function listerPurgeables(jour = aujourdhui()): Purgeable[] {
  const toutesAffaires = db.select().from(affaires).all();
  const echanges = db.select({ id: interactions.entrepriseId, date: interactions.date }).from(interactions).all();

  return db
    .select()
    .from(entreprises)
    .all()
    .flatMap((e) => {
      const siennes = toutesAffaires.filter((a) => a.entrepriseId === e.id);
      const dates = echanges.filter((i) => i.id === e.id).map((i) => i.date);
      const derniere = [e.derniereInteraction, ...dates].filter((x): x is string => !!x).sort().at(-1) ?? null;
      const aEteClient = siennes.some((a) => a.etape === "Client actif" || a.etape === "Client terminé" || !!a.dateSignature);
      const dossier = { derniereInteraction: derniere, dateCollecte: e.dateCollecte, optOut: e.optOut, aEteClient };
      if (!estPurgeable(dossier, jour)) return [];
      const ouverte = siennes.find((a) => a.etape !== "Client terminé" && a.etape !== "Perdu");
      return [{ id: e.id, nom: e.nom, ville: e.ville, derniereActivite: derniereActivite(dossier), avecEchange: !!derniere, nbInteractions: dates.length, etape: ouverte?.etape ?? null }];
    })
    .sort((a, b) => a.derniereActivite.localeCompare(b.derniereActivite));
}

// Supprime uniquement les fiches encore éligibles au moment de la validation : une fiche devenue cliente ou active entre-temps est épargnée.
export function purger(ids: string[], jour = aujourdhui()): { supprimees: number; ignorees: number } {
  const eligibles = new Set(listerPurgeables(jour).map((p) => p.id));
  const aSupprimer = [...new Set(ids)].filter((id) => eligibles.has(id));
  db.transaction(() => aSupprimer.forEach((id) => supprimerEntreprise(id)));
  return { supprimees: aSupprimer.length, ignorees: new Set(ids).size - aSupprimer.length };
}
