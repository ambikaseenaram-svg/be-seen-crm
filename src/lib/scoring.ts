// Règles du document « Scoring de prospection B2B — Instagram ».
import type { PRIORITES } from "./listes";

export type Notes = { c1: number | null; c2: number | null; c3: number | null; c4: number | null; c5: number | null };
export type Priorite = (typeof PRIORITES)[number];
export type ResultatScoring = { score: number | null; priorite: Priorite | null; disqualifie: boolean };

export const SEUIL_VERT = 70;
export const SEUIL_JAUNE = 40;

// Score = (C1 + C2 + C3 + C4 + C5 × 2) / 30 × 100, arrondi.
export function calculerScore(n: Notes): number | null {
  const { c1, c2, c3, c4, c5 } = n;
  if (c1 == null || c2 == null || c3 == null || c4 == null || c5 == null) return null;
  return Math.round(((c1 + c2 + c3 + c4 + c5 * 2) / 30) * 100);
}

// Disqualifié si C2 = 0, ou C5 = 0, ou C3 = 0 et C4 = 0. Décidable dès que les notes concernées sont saisies.
export function estDisqualifie(n: Notes): boolean {
  return n.c2 === 0 || n.c5 === 0 || (n.c3 === 0 && n.c4 === 0);
}

export function prioriteDuScore(score: number): Priorite {
  if (score >= SEUIL_VERT) return "Vert";
  if (score >= SEUIL_JAUNE) return "Jaune";
  return "Rouge";
}

export function calculerScoring(n: Notes): ResultatScoring {
  const score = calculerScore(n);
  const disqualifie = estDisqualifie(n);
  // Un prospect disqualifié passe en Rouge, quel que soit son score.
  const priorite = disqualifie ? "Rouge" : score == null ? null : prioriteDuScore(score);
  return { score, priorite, disqualifie };
}

export function notesCompletes(n: Notes): boolean {
  return calculerScore(n) != null;
}

// Rappel des critères, affiché au survol dans la fiche.
export const CRITERES = [
  {
    cle: "c1",
    titre: "C1 — Présence Instagram",
    grille: [
      "0 : pas de compte, ou compte privé / vide",
      "2 : compte inactif (dernier post > 3 mois)",
      "3 : publication irrégulière (1-2 posts/mois), contenu basique",
      "5 : publication régulière (≥ 1/semaine), effort visible",
    ],
  },
  {
    cle: "c2",
    titre: "C2 — Potentiel visuel",
    grille: [
      "0 : activité abstraite sans ancrage visuel",
      "2 : quelques éléments visuels limités (bureaux, équipe)",
      "3 : produit physique, lieu d'accueil, savoir-faire montrable",
      "5 : food, artisanat, retail, lieu de vie photographiable",
    ],
  },
  {
    cle: "c3",
    titre: "C3 — Maturité digitale",
    grille: [
      "0 : aucune présence web (ni site, ni fiche Google)",
      "2 : fiche Google basique ou Facebook non mis à jour",
      "3 : site correct + fiche Google active + un réseau",
      "5 : site soigné, Google optimisé, pub ou presse, multi-réseaux",
    ],
  },
  {
    cle: "c4",
    titre: "C4 — Taille / budget",
    // Grille d'origine. Une version corrigée est à valider (voir étape 2).
    grille: [
      "0 : auto-entrepreneur solo, activité naissante, pas de local",
      "2 : TPE avec local, 1-3 employés, activité modeste",
      "3 : PME locale, 5-20 employés, plusieurs points de vente ou forte notoriété",
      "5 : groupe, franchise ou CA apparent > 500 k€",
    ],
  },
  {
    cle: "c5",
    titre: "C5 — Écart potentiel / exécution (compte double)",
    grille: [
      "0 : pas d'écart (déjà excellent ou sans potentiel)",
      "2 : petit écart, quelques améliorations possibles",
      "3 : écart net : bon potentiel, contenu médiocre ou irrégulier",
      "5 : écart énorme : lieu/produit magnifique, Instagram désert",
    ],
  },
] as const;
