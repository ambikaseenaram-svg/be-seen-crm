// Règles de la purge RGPD, sans accès base : testables seules.
export const ANNEES_CONSERVATION = 3;

// Date limite : une activité antérieure à celle-ci a plus de 3 ans.
export function seuilPurge(jour: string, annees = ANNEES_CONSERVATION): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - annees);
  return d.toISOString().slice(0, 10);
}

export type DossierPurge = {
  derniereInteraction: string | null;
  dateCollecte: string;
  optOut: boolean;
  aEteClient: boolean;
};

// Dernier échange, ou à défaut la date de collecte pour un prospect jamais contacté.
export const derniereActivite = (d: Pick<DossierPurge, "derniereInteraction" | "dateCollecte">) => d.derniereInteraction ?? d.dateCollecte;

// Jamais purgés : les clients (signés un jour) et les opt-out, dont la fiche garde la trace du « ne plus contacter ».
export function estPurgeable(d: DossierPurge, jour: string): boolean {
  if (d.aEteClient || d.optOut) return false;
  return derniereActivite(d) < seuilPurge(jour);
}

export const MOT_CONFIRMATION = "SUPPRIMER";
