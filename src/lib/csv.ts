// CSV pour Excel en français : séparateur « ; », UTF-8 avec BOM (accents corrects), fins de ligne Windows.
const BOM = "﻿";

export type Cellule = string | number | boolean | null | undefined;
export type Colonne<T> = { titre: string; valeur: (ligne: T) => Cellule };

// Un texte qui commence par = + - @ serait lu comme une formule par Excel : on le neutralise.
// Les numéros de téléphone (« +33 6 12… ») restent intacts.
export function echapperCellule(v: Cellule): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  let s = String(v);
  const risque = /^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^[+-][\d\s().-]+$/.test(s));
  if (risque) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function construireCsv<T>(colonnes: Colonne<T>[], lignes: T[]): string {
  const rendre = (cellules: string[]) => cellules.join(";");
  const corps = [rendre(colonnes.map((c) => echapperCellule(c.titre))), ...lignes.map((l) => rendre(colonnes.map((c) => echapperCellule(c.valeur(l)))))];
  return BOM + corps.join("\r\n") + "\r\n";
}
