// Minuscules sans accents : « Café Élise » et « cafe elise » se retrouvent.
export function normaliser(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// « @bistrot », « instagram.com/bistrot » ou une URL complète → lien cliquable.
export function lienInstagram(valeur: string | null | undefined): string | null {
  if (!valeur) return null;
  const v = valeur.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/instagram\.com/i.test(v)) return `https://${v.replace(/^\/+/, "")}`;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}

export function lienWeb(valeur: string | null | undefined): string | null {
  if (!valeur) return null;
  return /^https?:\/\//i.test(valeur) ? valeur : `https://${valeur}`;
}
