import "server-only";
import { inArray } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { affaires, entreprises } from "@/db/schema";
import { aujourdhui } from "@/lib/dates";
import { normaliser } from "@/lib/texte";
import type { schemaCommerce } from "@/lib/validation";

export type CommerceAAjouter = z.infer<typeof schemaCommerce>;

export const SOURCE_ANNUAIRE = "data.gouv.fr";
// L'étape « Repéré » = trouvé, pas encore noté : le rappel « À analyser » le rend visible dans le Pipeline et les Relances.
export const STATUT_A_ANALYSER = "À analyser";

export type Presence = "siret" | "nom-ville" | null;

// Déjà dans le CRM ? Par SIRET en priorité ; à défaut, même nom et même ville (fiche saisie à la main, sans SIRET).
export function presenceDansCrm(commerces: { siret: string; nom: string; ville: string }[]): Map<string, Presence> {
  if (commerces.length === 0) return new Map();
  const sirets = new Set(db.select({ siret: entreprises.siret }).from(entreprises).where(inArray(entreprises.siret, commerces.map((c) => c.siret))).all().map((r) => r.siret));
  const nomsVilles = new Set(db.select({ nom: entreprises.nom, ville: entreprises.ville }).from(entreprises).all().map((e) => `${normaliser(e.nom)}|${normaliser(e.ville)}`));
  return new Map(
    commerces.map((c): [string, Presence] => [c.siret, sirets.has(c.siret) ? "siret" : nomsVilles.has(`${normaliser(c.nom)}|${normaliser(c.ville)}`) ? "nom-ville" : null]),
  );
}

// Crée la fiche et son affaire « Repéré / À analyser ». Source = data.gouv.fr, date de collecte = aujourd'hui.
// Ne remplit aucun champ inconnu (téléphone, email, site, Instagram, notes de scoring restent vides).
export function ajouterCommerces(liste: CommerceAAjouter[], jour = aujourdhui()): { ajoutes: number; ignores: number } {
  const uniques = [...new Map(liste.map((c) => [c.siret, c])).values()];
  const presence = presenceDansCrm(uniques);
  const aAjouter = uniques.filter((c) => !presence.get(c.siret));
  db.transaction(() => {
    for (const c of aAjouter) {
      const { id } = db
        .insert(entreprises)
        .values({ nom: c.nom, ville: c.ville, adresse: c.adresse, siret: c.siret, departement: c.departement, secteur: c.secteur, origine: SOURCE_ANNUAIRE, dateCollecte: jour })
        .returning({ id: entreprises.id })
        .get();
      db.insert(affaires).values({ entrepriseId: id, etape: "Repéré", dateEtape: jour, prochaineAction: STATUT_A_ANALYSER }).run();
    }
  });
  return { ajoutes: aAjouter.length, ignores: liste.length - aAjouter.length };
}
