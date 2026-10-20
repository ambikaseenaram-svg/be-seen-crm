// Règles de la liste des relances, sans accès base : testables seules.
import { joursEntre } from "./affaires";

export type StatutRelance = "retard" | "aujourdhui" | "avenir" | "sans";

export function statutRelance(date: string | null, jour: string): StatutRelance {
  if (!date) return "sans";
  if (date < jour) return "retard";
  return date === jour ? "aujourdhui" : "avenir";
}

export const joursDeRetard = (date: string, jour: string) => joursEntre(date, jour);

// Une action est échue le jour même ou après : l'interaction du jour la remplit.
export const estEchue = (date: string | null, jour: string) => !!date && date <= jour;

export function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const HORIZON_JOURS = 14;
