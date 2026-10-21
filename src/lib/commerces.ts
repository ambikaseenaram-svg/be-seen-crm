// « Trouver des commerces » : règles pures (types de commerce, lieu, lecture de la réponse de l'API). Sans réseau ni base.
import { DEPARTEMENTS, type SECTEURS } from "./listes";

type Secteur = (typeof SECTEURS)[number];
type Departement = (typeof DEPARTEMENTS)[number];

export const MAX_RESULTATS = 20;
export const MAX_ETABLISSEMENTS = 5; // au-delà : chaîne ou grand groupe, masqué
export const PAGES_MAX = 4;
export const PAR_PAGE = 25; // maximum accepté par l'API

// Codes NAF rév. 2 (filtre `activite_principale` de l'API, vérifié sur des requêtes réelles) et libellés officiels INSEE.
export const LIBELLES_NAF: Record<string, string> = {
  "56.10A": "Restauration traditionnelle",
  "56.10B": "Cafétérias et autres libres-services",
  "56.10C": "Restauration de type rapide",
  "10.71C": "Boulangerie et boulangerie-pâtisserie",
  "10.71D": "Pâtisserie",
  "47.24Z": "Commerce de détail de pain, pâtisserie et confiserie",
  "47.22Z": "Commerce de détail de viandes et de produits à base de viande",
  "10.13B": "Charcuterie",
  "47.23Z": "Commerce de détail de poissons, crustacés et mollusques",
  "47.29Z": "Autres commerces de détail alimentaires en magasin spécialisé",
  "47.21Z": "Commerce de détail de fruits et légumes",
  "47.25Z": "Commerce de détail de boissons",
  "56.21Z": "Services des traiteurs",
  "10.82Z": "Fabrication de cacao, chocolat et de produits de confiserie",
  "10.52Z": "Fabrication de glaces et sorbets",
  "56.30Z": "Débits de boissons",
};

export type TypeCommerce = { cle: string; libelle: string; codes: readonly string[]; secteur: Secteur };

export const TYPES_COMMERCE: TypeCommerce[] = [
  { cle: "restaurant", libelle: "Restaurant", codes: ["56.10A", "56.10B", "56.10C"], secteur: "Restaurant" },
  { cle: "bar", libelle: "Bar, café", codes: ["56.30Z"], secteur: "Restaurant" },
  { cle: "boulangerie", libelle: "Boulangerie-pâtisserie", codes: ["10.71C", "10.71D", "47.24Z"], secteur: "Commerce de bouche" },
  { cle: "boucherie", libelle: "Boucherie-charcuterie", codes: ["47.22Z", "10.13B"], secteur: "Commerce de bouche" },
  { cle: "poissonnerie", libelle: "Poissonnerie", codes: ["47.23Z"], secteur: "Commerce de bouche" },
  { cle: "epicerie", libelle: "Épicerie fine, fromagerie (autres commerces alimentaires)", codes: ["47.29Z"], secteur: "Commerce de bouche" },
  { cle: "primeur", libelle: "Primeur (fruits et légumes)", codes: ["47.21Z"], secteur: "Commerce de bouche" },
  { cle: "cave", libelle: "Cave à vins, boissons", codes: ["47.25Z"], secteur: "Commerce de bouche" },
  { cle: "traiteur", libelle: "Traiteur", codes: ["56.21Z"], secteur: "Commerce de bouche" },
  { cle: "chocolatier", libelle: "Chocolatier-confiseur", codes: ["10.82Z"], secteur: "Commerce de bouche" },
  { cle: "glacier", libelle: "Glacier", codes: ["10.52Z"], secteur: "Commerce de bouche" },
];

// ── Lieu saisi : département (77), code postal (94350) ou nom de ville ─────────────────────────────
export type LieuSaisi =
  | { genre: "departement"; code: string }
  | { genre: "code_postal"; code: string }
  | { genre: "nom"; nom: string }
  | { genre: "invalide" };

export function analyserLieu(saisie: string): LieuSaisi {
  const s = saisie.trim();
  if (/^(\d{2,3}|2[AB])$/i.test(s)) return { genre: "departement", code: s.toUpperCase() };
  if (/^\d{5}$/.test(s)) return { genre: "code_postal", code: s };
  if (s.length >= 2 && s.length <= 60 && /[\p{L}]/u.test(s) && !/\d/.test(s)) return { genre: "nom", nom: s };
  return { genre: "invalide" };
}

// Paris, Lyon et Marseille : le code commune global ne désigne aucun établissement (ils sont rangés par arrondissement).
export const COMMUNES_A_ARRONDISSEMENTS = ["75056", "69123", "13055"];

// ── Mise en forme ───────────────────────────────────────────────────────────────────────────────
const PETITS_MOTS = new Set(["de", "du", "des", "la", "le", "les", "et", "sur", "sous", "en", "au", "aux"]);
const ELISIONS = new Set(["l", "d"]);

const majuscule = (m: string) => m.replace(/(^|\.)([\p{L}])/gu, (_x, avant: string, lettre: string) => avant + lettre.toUpperCase());

// « AVENUE DE LA VICTOIRE 77100 MEAUX » → « Avenue de la Victoire 77100 Meaux »
export function titreCase(texte: string): string {
  const mots = texte.toLowerCase().split(" ");
  return mots
    .map((mot, i) =>
      mot
        .split("-")
        .map((morceau, j) => {
          const debut = i === 0 && j === 0;
          if (!debut && PETITS_MOTS.has(morceau)) return morceau;
          // « l'industrie » : l'élision reste en minuscule, sauf en tête de texte
          const m = morceau.match(/^([ld])['’](.+)$/);
          if (m && ELISIONS.has(m[1])) return (debut ? m[1].toUpperCase() : m[1]) + "'" + majuscule(m[2]);
          return majuscule(morceau);
        })
        .join("-"),
    )
    .join(" ")
    .trim();
}

const IDF_AUTRES = ["78", "92", "95"];
export function departementDe(codeCommuneOuPostal: string | null | undefined): Departement | null {
  const code = (codeCommuneOuPostal ?? "").trim();
  if (!code) return null;
  if (code.startsWith("97") || code.startsWith("98") || /^2[AB]/i.test(code)) return "Hors IDF";
  const dep = code.slice(0, 2);
  if ((DEPARTEMENTS as readonly string[]).includes(dep)) return dep as Departement;
  return IDF_AUTRES.includes(dep) ? "Autre IDF" : "Hors IDF";
}

// ── Lecture de la réponse de l'API Recherche d'entreprises ────────────────────────────────────────
export type EtablissementApi = {
  siret: string;
  etat_administratif: string;
  activite_principale: string | null;
  adresse: string | null;
  libelle_commune: string | null;
  commune: string | null;
  code_postal: string | null;
  liste_enseignes: string[] | null;
  statut_diffusion_etablissement: string | null;
};
export type UniteLegaleApi = {
  nom_complet: string;
  nom_raison_sociale: string | null;
  activite_principale: string | null;
  nombre_etablissements_ouverts: number | null;
  matching_etablissements: EtablissementApi[] | null;
};
export type ReponseApi = { results: UniteLegaleApi[]; total_results: number; total_pages: number; page: number };

export type Commerce = {
  siret: string;
  nom: string;
  raisonSociale: string | null;
  ville: string;
  adresse: string | null;
  departement: Departement | null;
  secteur: Secteur;
  codeNaf: string;
  activite: string;
};

export type Ecartes = { fermes: number; chaines: number; autreActivite: number; masques: number };

// Ne garde que les établissements ouverts, diffusibles, de l'activité demandée, d'une entreprise indépendante.
// Aucune valeur n'est inventée : un champ absent de l'API reste vide.
export function extraireCommerces(reponse: ReponseApi, type: TypeCommerce): { commerces: Commerce[]; ecartes: Ecartes } {
  const commerces: Commerce[] = [];
  const ecartes: Ecartes = { fermes: 0, chaines: 0, autreActivite: 0, masques: 0 };

  for (const ul of reponse.results) {
    const etablissements = ul.matching_etablissements ?? [];
    if ((ul.nombre_etablissements_ouverts ?? 0) > MAX_ETABLISSEMENTS) {
      ecartes.chaines += 1;
      continue;
    }
    for (const e of etablissements) {
      if (e.etat_administratif !== "A") ecartes.fermes += 1;
      else if (e.statut_diffusion_etablissement !== "O") ecartes.masques += 1;
      else if (!e.activite_principale || !type.codes.includes(e.activite_principale)) ecartes.autreActivite += 1;
      else {
        const enseigne = e.liste_enseignes?.find((x) => x.trim()) ?? null;
        const raison = ul.nom_raison_sociale?.trim() || ul.nom_complet.replace(/\s*\(.*\)\s*$/, "").trim();
        const nom = titreCase(enseigne ?? raison);
        const ville = e.libelle_commune ? titreCase(e.libelle_commune) : null;
        if (!ville) continue;
        commerces.push({
          siret: e.siret,
          nom,
          raisonSociale: enseigne && titreCase(raison) !== nom ? titreCase(raison) : null,
          ville,
          adresse: e.adresse ? titreCase(e.adresse) : null,
          departement: departementDe(e.commune ?? e.code_postal),
          secteur: type.secteur,
          codeNaf: e.activite_principale,
          activite: LIBELLES_NAF[e.activite_principale] ?? e.activite_principale,
        });
      }
    }
  }
  return { commerces, ecartes };
}

// Le filtre d'activité est-il bien appliqué ? L'API ignore en silence un filtre mal nommé : on le détecte.
export function filtreActiviteRespecte(reponse: ReponseApi, type: TypeCommerce): boolean {
  if (reponse.results.length === 0) return true;
  return reponse.results.some((ul) => ul.activite_principale != null && type.codes.includes(ul.activite_principale));
}

// 39372162600033 → « 393 721 626 00033 » (lisible, et Excel le garde comme texte au lieu de 3,9E+13)
export const formaterSiret = (siret: string) => (/^\d{14}$/.test(siret) ? `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}` : siret);
