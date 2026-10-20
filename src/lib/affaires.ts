// Règles métier des affaires, sans accès base : testables seules.
import { ETAPES, ETAPES_FERMEES, type OFFRES } from "./listes";

type Offre = (typeof OFFRES)[number];

export const ETAPES_KANBAN = ETAPES.filter((e) => !(ETAPES_FERMEES as readonly string[]).includes(e));

// Étapes qui demandent une confirmation (clôture) ou des informations (offre signée, motif de perte).
export const ETAPES_AVEC_FENETRE = ["Perdu", "Client actif", "Client terminé"];
export const exigeFenetre = (etape: string) => ETAPES_AVEC_FENETRE.includes(etape);

export const estFermee = (etape: string) => (ETAPES_FERMEES as readonly string[]).includes(etape);

// Fourchettes mensuelles des trois offres (€/mois).
export const FOURCHETTES: Record<Offre, readonly [number, number]> = {
  Fondations: [990, 1490],
  Expérience: [1800, 2800],
  Signature: [3000, 4500],
};

const nombre = new Intl.NumberFormat("fr-FR");
export const formaterEuros = (n: number) => `${nombre.format(n)} €`;

export function valeurTotale(montantMensuel: number | null, dureeMois: number | null): number | null {
  return montantMensuel != null && dureeMois != null ? montantMensuel * dureeMois : null;
}

// Une réduction de prix s'échange contre une contrepartie : on prévient, sans bloquer la saisie.
export function alerteTarif(offre: Offre | null, montantMensuel: number | null): string | null {
  if (!offre || montantMensuel == null) return null;
  const [min, max] = FOURCHETTES[offre];
  if (montantMensuel >= min) return null;
  return `Sous la fourchette ${offre} (${nombre.format(min)} à ${nombre.format(max)} €/mois). Une réduction s'échange contre une contrepartie : périmètre réduit ou durée plus courte.`;
}

export const enRetard = (date: string | null, jour: string) => !!date && date < jour;

export function joursEntre(debut: string, jour: string): number {
  const ms = Date.parse(`${jour}T00:00:00Z`) - Date.parse(`${debut.slice(0, 10)}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export type ElementsAffaire = {
  offre: string | null;
  montantMensuel: number | null;
  dureeMois: number | null;
  motifPerte: string | null;
};

// Ce qu'il faut renseigner pour entrer dans une étape. Rien n'est déduit ni inventé.
export function champsManquants(etapeCible: string, a: ElementsAffaire): Record<string, string> {
  const manquants: Record<string, string> = {};
  if (etapeCible === "Perdu" && !a.motifPerte) manquants.motifPerte = "Indique pourquoi l'affaire est perdue.";
  if (etapeCible === "Client actif") {
    if (!a.offre) manquants.offre = "Choisis l'offre signée.";
    if (a.montantMensuel == null) manquants.montantMensuel = "Indique le montant mensuel signé.";
    if (!a.dureeMois) manquants.dureeMois = "Indique la durée en mois.";
  }
  return manquants;
}
