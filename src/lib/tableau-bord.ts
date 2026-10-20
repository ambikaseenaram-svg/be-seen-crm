// Calculs du tableau de bord, sans accès base : testables seuls.
import { estReponse } from "./interactions";

export function progression(valeur: number, objectif: number) {
  const pct = objectif > 0 ? Math.min(100, Math.round((valeur / objectif) * 100)) : 0;
  return { pct, atteint: objectif > 0 && valeur >= objectif };
}

export const memeMois = (date: string | null | undefined, jour: string) => !!date && date.slice(0, 7) === jour.slice(0, 7);

export type StatCanal = { canal: string; contacts: number; positives: number; taux: number };

// Taux de réponses positives (réponse positive ou RDV obtenu) par canal. Un canal sous le seuil n'est jamais classé.
export function statsCanaux(lignes: { canal: string; resultat: string }[], seuil: number) {
  const par = new Map<string, { contacts: number; positives: number }>();
  for (const l of lignes) {
    const c = par.get(l.canal) ?? { contacts: 0, positives: 0 };
    c.contacts += 1;
    if (estReponse(l.resultat)) c.positives += 1;
    par.set(l.canal, c);
  }
  const stats: StatCanal[] = [...par.entries()]
    .map(([canal, c]) => ({ canal, ...c, taux: Math.round((c.positives / c.contacts) * 100) }))
    .sort((a, b) => b.taux - a.taux || b.contacts - a.contacts);
  const meilleur = stats.find((s) => s.contacts >= seuil && s.positives > 0) ?? null;
  return { stats, meilleur };
}
