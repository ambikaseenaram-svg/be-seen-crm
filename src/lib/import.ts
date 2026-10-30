// Import de prospects depuis un fichier Excel enregistré en CSV. Sans accès base : testable seul.
import { departementDe } from "./commerces";
import { emailValide } from "./emails";
import { DEPARTEMENTS, ORIGINES, SECTEURS } from "./listes";
import { normaliser } from "./texte";

export const MAX_LIGNES = 2000;
export const TAILLE_MAX_OCTETS = 800_000;

// ── Lecture du CSV ────────────────────────────────────────────────────────────────────────────────
// Excel en français écrit « ; » ; d'autres outils écrivent « , » ou une tabulation : on prend le plus fréquent sur la 1re ligne.
function separateur(premiereLigne: string): string {
  const compte = (c: string) => premiereLigne.split(c).length - 1;
  return [";", ",", "\t"].sort((a, b) => compte(b) - compte(a))[0];
}

export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, "");
  const sep = separateur(t.split(/\r?\n/, 1)[0] ?? "");
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = "";
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') {
        cellule += '"';
        i++;
      } else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"' && cellule === "") guillemets = true;
    else if (c === sep) {
      ligne.push(cellule);
      cellule = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      ligne.push(cellule);
      lignes.push(ligne);
      ligne = [];
      cellule = "";
    } else cellule += c;
  }
  if (cellule !== "" || ligne.length) {
    ligne.push(cellule);
    lignes.push(ligne);
  }
  return lignes.map((l) => l.map((v) => v.trim())).filter((l) => l.some((v) => v !== ""));
}

// ── Correspondance des colonnes ───────────────────────────────────────────────────────────────────
export const CHAMPS = {
  nom: { libelle: "Nom de l'établissement", titres: ["nom", "entreprise", "etablissement", "restaurant", "commerce", "enseigne", "raison sociale", "societe", "nom de l'entreprise", "nom du restaurant", "nom de l'etablissement"] },
  ville: { libelle: "Ville", titres: ["ville", "commune", "localite"] },
  codePostal: { libelle: "Code postal (sert au département)", titres: ["code postal", "cp", "code_postal"] },
  adresse: { libelle: "Adresse", titres: ["adresse", "adresse postale", "rue"] },
  siret: { libelle: "SIRET", titres: ["siret", "n° siret", "numero siret"] },
  secteur: { libelle: "Secteur", titres: ["secteur", "secteur d'activite", "type", "categorie", "activite"] },
  departement: { libelle: "Département", titres: ["departement", "dept", "dep"] },
  contactNom: { libelle: "Contact", titres: ["contact", "nom du contact", "interlocuteur", "gerant", "responsable", "prenom nom", "nom prenom"] },
  telephone: { libelle: "Téléphone", titres: ["telephone", "tel", "tel.", "portable", "mobile", "numero", "numero de telephone"] },
  email: { libelle: "Email", titres: ["email", "e-mail", "mail", "adresse email", "adresse mail", "courriel"] },
  instagramUrl: { libelle: "Instagram", titres: ["instagram", "insta", "compte instagram"] },
  siteUrl: { libelle: "Site web", titres: ["site", "site web", "site internet", "url"] },
  abonnesInsta: { libelle: "Abonnés Instagram", titres: ["abonnes", "abonnes instagram", "abonnes insta", "followers", "nombre d'abonnes"] },
  // Pas « note » seul : dans un export Google, c'est la note sur 5.
  angleAccroche: { libelle: "Angle d'accroche / notes", titres: ["angle", "angle d'accroche", "accroche", "notes", "commentaire", "commentaires", "remarques"] },
  origine: { libelle: "Origine", titres: ["origine", "source"] },
} as const;

export type Champ = keyof typeof CHAMPS;
// Une case par colonne du fichier : le champ du CRM qu'elle remplit, ou null (ignorée).
export type Correspondance = (Champ | null)[];

// « code_postal », « Code postal » et « CODE POSTAL » se valent.
const titreNormalise = (titre: string) => normaliser(titre.replace(/_/g, " ")).replace(/[’]/g, "'");

// Chaque champ prend la colonne dont le titre est le plus proche du sien : « ville » passe avant « commune ».
export function detecterColonnes(entetes: string[]): Correspondance {
  const titres = entetes.map(titreNormalise);
  const resultat: Correspondance = entetes.map(() => null);
  for (const champ of Object.keys(CHAMPS) as Champ[]) {
    const synonymes = CHAMPS[champ].titres as readonly string[];
    const candidats = titres.map((t, i) => ({ i, rang: synonymes.indexOf(t) })).filter((x) => x.rang >= 0 && !resultat[x.i]);
    const meilleur = candidats.sort((a, b) => a.rang - b.rang)[0];
    if (meilleur) resultat[meilleur.i] = champ;
  }
  return resultat;
}

// « 83 Bd de Stalingrad, 94500 Champigny-sur-Marne » → code postal et ville réels de l'établissement.
export function lieuDansAdresse(adresse: string | null): { codePostal: string; ville: string } | null {
  const m = adresse?.match(/\b(\d{5})\s+([^,\d][^,]*)$/);
  return m ? { codePostal: m[1], ville: m[2].trim() } : null;
}

// Une source écrite autrement que dans la liste du CRM (« Google Places API ») reste reconnue.
function origineReconnue(v: string): Origine | null {
  const exacte = ORIGINES.find((x) => normaliser(x) === normaliser(v));
  if (exacte) return exacte;
  const n = normaliser(v);
  if (n.includes("google")) return "Google Maps";
  if (n.includes("insta")) return "Instagram";
  if (n.includes("linkedin")) return "LinkedIn";
  return null;
}

export function erreurCorrespondance(c: Correspondance): string | null {
  if (!c.includes("nom")) return "Indique la colonne qui contient le nom de l'établissement.";
  if (!c.includes("ville")) return "Indique la colonne qui contient la ville.";
  const doublon = c.find((v, i) => v && c.indexOf(v) !== i);
  if (doublon) return `Deux colonnes remplissent « ${CHAMPS[doublon].libelle} » : garde-n'en qu'une.`;
  return null;
}

// ── Lecture de chaque ligne ───────────────────────────────────────────────────────────────────────
type Origine = (typeof ORIGINES)[number];

export type Valeurs = {
  nom: string;
  ville: string;
  adresse: string | null;
  siret: string | null;
  secteur: (typeof SECTEURS)[number] | null;
  departement: (typeof DEPARTEMENTS)[number] | null;
  contactNom: string | null;
  telephone: string | null;
  email: string | null;
  instagramUrl: string | null;
  siteUrl: string | null;
  abonnesInsta: number | null;
  angleAccroche: string | null;
  origine: Origine;
};

export type LigneLue = { numero: number; valeurs: Valeurs; erreurs: string[]; avertissements: string[] };

const METIERS_BOUCHE = ["boulang", "patiss", "bouch", "charcut", "fromag", "epicer", "cave", "caviste", "chocolat", "traiteur", "primeur", "poissonn", "glacier", "torref"];
const METIERS_RESTO = ["restaurant", "bistro", "brasserie", "pizzeria", "creperie", "cafe", "bar", "brunch", "cantine"];

// « Boulangerie », « Pâtisserie », « Pizzeria »… : le métier indiqué dans le fichier donne le secteur du CRM.
function secteurDuMetier(v: string): Valeurs["secteur"] {
  const n = normaliser(v);
  if (METIERS_BOUCHE.some((m) => n.includes(m))) return "Commerce de bouche";
  if (METIERS_RESTO.some((m) => n.split(/[\s-]+/).some((mot) => mot.startsWith(m)))) return "Restaurant";
  return null;
}

const parmi = <T extends string>(liste: readonly T[], v: string): T | null => liste.find((x) => normaliser(x) === normaliser(v)) ?? null;

const LIMITES: Partial<Record<Champ, number>> = { nom: 200, ville: 200, adresse: 300, contactNom: 200, telephone: 40, instagramUrl: 300, siteUrl: 300, angleAccroche: 500 };

// Lit une ligne telle quelle : une case vide reste vide, rien n'est déduit au-delà du département (code postal).
export function lireLigne(cellules: string[], c: Correspondance, origineParDefaut: Origine, numero: number): LigneLue {
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const brut = (champ: Champ) => {
    const i = c.indexOf(champ);
    const v = i >= 0 ? (cellules[i] ?? "").trim() : "";
    // Les exports du CRM protègent les textes commençant par + - = @ avec une apostrophe.
    return v.replace(/^'(?=[=+\-@])/, "");
  };
  const texte = (champ: Champ) => {
    const v = brut(champ);
    const max = LIMITES[champ];
    if (max && v.length > max) {
      avertissements.push(`${CHAMPS[champ].libelle} coupé à ${max} caractères`);
      return v.slice(0, max);
    }
    return v || null;
  };

  const nom = texte("nom") ?? "";
  const adresse = texte("adresse");
  const lieu = lieuDansAdresse(adresse);
  // La ville de l'adresse fait foi : la colonne « ville » d'un export peut être la zone de recherche.
  let ville = texte("ville") ?? "";
  if (lieu && normaliser(lieu.ville) !== normaliser(ville)) {
    if (ville) avertissements.push(`Ville prise dans l'adresse : ${lieu.ville} (et non ${ville})`);
    ville = lieu.ville;
  }
  if (!nom) erreurs.push("Nom manquant");
  if (!ville) erreurs.push("Ville manquante");

  let siret: string | null = null;
  const siretBrut = brut("siret");
  if (siretBrut) {
    const chiffres = siretBrut.replace(/[\s.]/g, "");
    if (/e\+/i.test(siretBrut) || /,/.test(siretBrut)) erreurs.push("SIRET abîmé par Excel (format nombre) : mets la colonne au format Texte");
    else if (!/^\d{14}$/.test(chiffres)) erreurs.push(`SIRET invalide (« ${siretBrut} ») : 14 chiffres attendus`);
    else siret = chiffres;
  }
  // Un SIRET rattaché à un autre code postal que l'adresse désigne sans doute une autre entreprise : on ne le garde pas.
  const cpColonne = brut("codePostal");
  if (siret && lieu && /^\d{5}$/.test(cpColonne) && cpColonne !== lieu.codePostal) {
    avertissements.push(`SIRET écarté : il est rattaché au ${cpColonne}, l'adresse est au ${lieu.codePostal}`);
    siret = null;
  }

  const email = brut("email") || null;
  if (email && !emailValide(email)) erreurs.push(`Email invalide (« ${email} »)`);

  let abonnesInsta: number | null = null;
  const abonnes = brut("abonnesInsta").replace(/[\s  ]/g, "");
  if (abonnes) {
    if (/^\d+$/.test(abonnes)) abonnesInsta = Number(abonnes);
    else avertissements.push(`Abonnés « ${brut("abonnesInsta")} » non reconnu : laissé vide`);
  }

  let telephone = texte("telephone");
  // Excel retire le 0 initial des numéros saisis comme des nombres : 612345678 → 0612345678.
  if (telephone && /^[1-9]\d{8}$/.test(telephone)) {
    telephone = `0${telephone}`;
    avertissements.push("0 du téléphone rétabli (Excel l'avait retiré)");
  }

  let secteur: Valeurs["secteur"] = null;
  if (brut("secteur")) {
    secteur = parmi(SECTEURS, brut("secteur")) ?? secteurDuMetier(brut("secteur"));
    if (!secteur) avertissements.push(`Secteur « ${brut("secteur")} » non reconnu : laissé vide`);
  }

  let departement: Valeurs["departement"] = null;
  const dep = brut("departement");
  if (dep) {
    departement = parmi(DEPARTEMENTS, dep) ?? (/^\d{2}$/.test(dep) ? departementDe(dep) : null);
    if (!departement) avertissements.push(`Département « ${dep} » non reconnu : laissé vide`);
  } else if (lieu) departement = departementDe(lieu.codePostal);
  else if (/^\d{5}$/.test(cpColonne)) departement = departementDe(cpColonne);

  let origine = origineParDefaut;
  if (brut("origine")) {
    const o = origineReconnue(brut("origine"));
    if (o) origine = o;
    else avertissements.push(`Origine « ${brut("origine")} » non reconnue : « ${origineParDefaut} » utilisée`);
  }

  return {
    numero,
    valeurs: {
      nom,
      ville,
      adresse,
      siret,
      secteur,
      departement,
      contactNom: texte("contactNom"),
      telephone,
      email,
      instagramUrl: texte("instagramUrl"),
      siteUrl: texte("siteUrl"),
      abonnesInsta,
      angleAccroche: texte("angleAccroche"),
      origine,
    },
    erreurs,
    avertissements,
  };
}
