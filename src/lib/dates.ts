// Toutes les dates « du jour » sont calculées à l'heure de Paris.
const FUSEAU = "Europe/Paris";

export function aujourdhui(maintenant = new Date()): string {
  // Le format suédois donne directement AAAA-MM-JJ.
  return maintenant.toLocaleDateString("sv-SE", { timeZone: FUSEAU });
}

// « 2026-10-16 » → « 16/10/2026 »
export function formaterDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}
