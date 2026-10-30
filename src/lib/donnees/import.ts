import "server-only";
import { db } from "@/db";
import { affaires, entreprises } from "@/db/schema";
import { aujourdhui } from "@/lib/dates";
import { MAX_LIGNES, detecterColonnes, erreurCorrespondance, lireCsv, lireLigne, type Correspondance, type LigneLue } from "@/lib/import";
import type { ORIGINES } from "@/lib/listes";
import { normaliser } from "@/lib/texte";
import { STATUT_A_ANALYSER } from "./commerces";

export type StatutLigne = "ok" | "erreur" | "doublon";
export type LigneAnalysee = LigneLue & { statut: StatutLigne; doublon?: string };

export type Analyse =
  | { ok: true; entetes: string[]; correspondance: Correspondance; probleme: string | null; lignes: LigneAnalysee[]; aImporter: number }
  | { ok: false; message: string };

const cleNomVille = (nom: string, ville: string) => `${normaliser(nom)}|${normaliser(ville)}`;
// « 01 48 80 07 12 » et « +33 1 48 80 07 12 » : même numéro.
const cleTelephone = (t: string | null) => {
  const chiffres = (t ?? "").replace(/\D/g, "").replace(/^33(?=\d{9}$)/, "0");
  return chiffres.length >= 9 ? chiffres : null;
};

// Lit le fichier, applique la correspondance des colonnes et classe chaque ligne. N'écrit rien.
export function analyserFichier(texte: string, origine: (typeof ORIGINES)[number], choix?: Correspondance): Analyse {
  const tableau = lireCsv(texte);
  if (tableau.length < 2) return { ok: false, message: "Le fichier est vide ou ne contient que la ligne des titres." };
  const [entetes, ...donnees] = tableau;
  if (donnees.length > MAX_LIGNES) return { ok: false, message: `${donnees.length} lignes : ${MAX_LIGNES} au plus par import. Coupe ton fichier en plusieurs.` };
  const correspondance = choix && choix.length === entetes.length ? choix : detecterColonnes(entetes);
  const probleme = erreurCorrespondance(correspondance);
  if (probleme) return { ok: true, entetes, correspondance, probleme, lignes: [], aImporter: 0 };

  const existants = db.select({ nom: entreprises.nom, ville: entreprises.ville, siret: entreprises.siret, telephone: entreprises.telephone }).from(entreprises).all();
  const sirets = new Set(existants.map((e) => e.siret).filter(Boolean));
  const nomsVilles = new Set(existants.map((e) => cleNomVille(e.nom, e.ville)));
  const telephones = new Map(existants.flatMap((e) => (cleTelephone(e.telephone) ? [[cleTelephone(e.telephone)!, e.nom] as const] : [])));
  const vusSirets = new Map<string, number>();
  const vusNomsVilles = new Map<string, number>();
  const vusTelephones = new Map<string, number>();

  // Ligne 1 = titres : la première ligne de données est la ligne 2, comme dans Excel.
  const lignes = donnees.map((cellules, i): LigneAnalysee => {
    const l = lireLigne(cellules, correspondance, origine, i + 2);
    if (l.erreurs.length) return { ...l, statut: "erreur" };
    const { siret, nom, ville } = l.valeurs;
    const cle = cleNomVille(nom, ville);
    const tel = cleTelephone(l.valeurs.telephone);
    let doublon: string | undefined;
    if (siret && sirets.has(siret)) doublon = "Déjà dans le CRM (même SIRET)";
    else if (nomsVilles.has(cle)) doublon = "Déjà dans le CRM (même nom et ville)";
    else if (tel && telephones.has(tel)) doublon = `Déjà dans le CRM (même téléphone que « ${telephones.get(tel)} »)`;
    else if (siret && vusSirets.has(siret)) doublon = `Même SIRET que la ligne ${vusSirets.get(siret)}`;
    else if (vusNomsVilles.has(cle)) doublon = `Même nom et ville que la ligne ${vusNomsVilles.get(cle)}`;
    else if (tel && vusTelephones.has(tel)) doublon = `Même téléphone que la ligne ${vusTelephones.get(tel)}`;
    if (doublon) return { ...l, statut: "doublon", doublon };
    if (siret) vusSirets.set(siret, l.numero);
    if (tel) vusTelephones.set(tel, l.numero);
    vusNomsVilles.set(cle, l.numero);
    return { ...l, statut: "ok" };
  });
  return { ok: true, entetes, correspondance, probleme: null, lignes, aImporter: lignes.filter((l) => l.statut === "ok").length };
}

// Crée les fiches des lignes « ok » seulement, tout ou rien. Étape « Repéré », rappel « À analyser », date de collecte = aujourd'hui.
// Jamais d'opt-out, de score ni de priorité venus du fichier.
export function importerLignes(lignes: LigneAnalysee[], jour = aujourdhui()): number {
  const aImporter = lignes.filter((l) => l.statut === "ok");
  db.transaction(() => {
    for (const { valeurs } of aImporter) {
      const { id } = db
        .insert(entreprises)
        .values({ ...valeurs, dateCollecte: jour })
        .returning({ id: entreprises.id })
        .get();
      db.insert(affaires).values({ entrepriseId: id, etape: "Repéré", dateEtape: jour, prochaineAction: STATUT_A_ANALYSER }).run();
    }
  });
  return aImporter.length;
}
