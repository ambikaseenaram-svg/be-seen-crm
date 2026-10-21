import "server-only";
import {
  COMMUNES_A_ARRONDISSEMENTS,
  MAX_RESULTATS,
  PAGES_MAX,
  PAR_PAGE,
  TYPES_COMMERCE,
  analyserLieu,
  extraireCommerces,
  filtreActiviteRespecte,
  titreCase,
  type Commerce,
  type Ecartes,
  type ReponseApi,
} from "@/lib/commerces";
import { presenceDansCrm, type Presence } from "./commerces";

// API officielle « Recherche d'entreprises » (gratuite, sans clé) et le service officiel des communes, pour reconnaître un nom de ville.
const URL_ANNUAIRE = process.env.ANNUAIRE_URL ?? "https://recherche-entreprises.api.gouv.fr";
const URL_COMMUNES = process.env.COMMUNES_URL ?? "https://geo.api.gouv.fr";

export type ResultatRecherche =
  | { ok: false; message: string }
  | {
      ok: true;
      lieu: string;
      commerces: (Commerce & { presence: Presence })[];
      ecartes: Ecartes;
      plusDeResultats: boolean;
      remarque?: string;
    };

class ErreurAnnuaire extends Error {}

async function appeler<T>(url: string): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    throw new ErreurAnnuaire("L'annuaire officiel ne répond pas. Vérifie ta connexion Internet puis réessaie.");
  }
  if (reponse.status === 429) throw new ErreurAnnuaire("Trop de recherches en peu de temps. Attends quelques secondes puis réessaie.");
  if (reponse.status === 400) {
    const corps = (await reponse.json().catch(() => null)) as { erreur?: string } | null;
    throw new ErreurAnnuaire(`L'annuaire a refusé la recherche${corps?.erreur ? ` : ${corps.erreur}` : "."}`);
  }
  if (!reponse.ok) throw new ErreurAnnuaire("L'annuaire officiel est momentanément indisponible. Réessaie dans quelques minutes.");
  return (await reponse.json()) as T;
}

type Commune = { nom: string; code: string; codesPostaux?: string[]; departement?: { code: string } };

// Nom de ville → commune. S'il existe des homonymes, on prend la plus peuplée et on le signale.
async function trouverCommune(nom: string): Promise<{ commune: Commune; remarque?: string } | { erreur: string }> {
  const url = `${URL_COMMUNES}/communes?${new URLSearchParams({ nom, fields: "nom,code,codesPostaux,departement", boost: "population", limit: "5" })}`;
  const liste = await appeler<Commune[]>(url);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const exactes = liste.filter((c) => norm(c.nom) === norm(nom));
  const retenues = exactes.length ? exactes : liste.slice(0, 1);
  if (retenues.length === 0) return { erreur: `Ville « ${nom} » introuvable. Vérifie l'orthographe, ou saisis un code postal ou un département.` };
  const [commune, ...homonymes] = retenues;
  const remarque = homonymes.length
    ? `Plusieurs communes portent ce nom : ${[commune, ...homonymes].map((c) => `${c.nom} (${c.departement?.code ?? "?"})`).join(", ")}. Résultats pour la première ; saisis un code postal pour une autre.`
    : undefined;
  return { commune, remarque };
}

export async function rechercherCommerces(lieuSaisi: string, cleType: string): Promise<ResultatRecherche> {
  const type = TYPES_COMMERCE.find((t) => t.cle === cleType);
  if (!type) return { ok: false, message: "Choisis un type de commerce." };
  const lieu = analyserLieu(lieuSaisi);
  if (lieu.genre === "invalide") return { ok: false, message: "Saisis un département (ex. 77), un code postal (ex. 94350) ou le nom d'une ville." };

  try {
    const geo = new URLSearchParams();
    let libelleLieu: string;
    let remarque: string | undefined;
    if (lieu.genre === "departement") {
      geo.set("departement", lieu.code);
      libelleLieu = `département ${lieu.code}`;
    } else if (lieu.genre === "code_postal") {
      geo.set("code_postal", lieu.code);
      libelleLieu = lieu.code;
    } else {
      const r = await trouverCommune(lieu.nom);
      if ("erreur" in r) return { ok: false, message: r.erreur };
      if (COMMUNES_A_ARRONDISSEMENTS.includes(r.commune.code)) {
        return { ok: false, message: `Pour ${r.commune.nom}, saisis le code postal d'un arrondissement (ex. ${r.commune.codesPostaux?.[0] ?? "75011"}).` };
      }
      geo.set("code_commune", r.commune.code);
      libelleLieu = `${titreCase(r.commune.nom)} (${r.commune.departement?.code ?? ""})`;
      remarque = r.remarque;
    }

    const base = new URLSearchParams({ etat_administratif: "A", activite_principale: type.codes.join(","), per_page: String(PAR_PAGE) });
    geo.forEach((v, k) => base.set(k, v));

    const trouves: Commerce[] = [];
    const ecartes = { fermes: 0, chaines: 0, autreActivite: 0, masques: 0 };
    let page = 1;
    let totalPages = 1;
    while (trouves.length < MAX_RESULTATS && page <= Math.min(PAGES_MAX, totalPages)) {
      const reponse = await appeler<ReponseApi>(`${URL_ANNUAIRE}/search?${new URLSearchParams({ ...Object.fromEntries(base), page: String(page) })}`);
      if (!filtreActiviteRespecte(reponse, type)) {
        return { ok: false, message: "L'annuaire n'a pas appliqué le filtre d'activité : recherche annulée pour ne pas t'afficher de mauvais résultats." };
      }
      totalPages = reponse.total_pages;
      const { commerces, ecartes: e } = extraireCommerces(reponse, type);
      for (const c of commerces) if (!trouves.some((t) => t.siret === c.siret)) trouves.push(c);
      ecartes.fermes += e.fermes;
      ecartes.chaines += e.chaines;
      ecartes.autreActivite += e.autreActivite;
      ecartes.masques += e.masques;
      page += 1;
      if (trouves.length < MAX_RESULTATS && page <= Math.min(PAGES_MAX, totalPages)) await new Promise((r) => setTimeout(r, 200)); // limite de l'API : 7 requêtes par seconde
    }

    const gardes = trouves.slice(0, MAX_RESULTATS);
    const presences = presenceDansCrm(gardes);
    return {
      ok: true,
      lieu: libelleLieu,
      commerces: gardes.map((c) => ({ ...c, presence: presences.get(c.siret) ?? null })),
      ecartes,
      plusDeResultats: trouves.length > MAX_RESULTATS || page <= totalPages,
      remarque,
    };
  } catch (e) {
    if (e instanceof ErreurAnnuaire) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Une erreur est survenue pendant la recherche. Réessaie." };
  }
}
