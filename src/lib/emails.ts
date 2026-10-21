// Règles de « Contacter les prospects », sans accès base : testables seules.
import { formaterDate } from "./dates";
import { ajouterJours } from "./relances";

export const MAX_PAR_LOT = 20;
// Plafond quotidien : au-delà, les messageries classent les envois comme de la prospection de masse.
export const MAX_PAR_JOUR = 20;
export const DELAI_RELANCE_JOURS = 7;

// Un texte qui contient encore ce marqueur ne part pas : c'est à toi de le compléter.
export const MARQUEUR = "[À compléter";
export const resteACompleter = (texte: string) => texte.includes(MARQUEUR);

// Vérifie seulement la forme de l'adresse saisie sur la fiche : rien n'est corrigé ni deviné.
export const emailValide = (email: string | null | undefined): email is string =>
  !!email && /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i.test(email.trim());

const RESULTATS_REPONSE = ["Réponse positive", "Réponse négative", "RDV obtenu"];
// Une réponse (même négative) ou une opposition arrête tout envoi.
export const aRepondu = (resultats: string[]) => resultats.some((r) => RESULTATS_REPONSE.includes(r) || r === "Opt-out demandé");

const ETAPES_CONTACTABLES = ["Repéré", "Qualifié", "Contacté / Visité"];

export type EnvoiPasse = { modele: string; statut: string; envoyeLe: string | null };

export type Prospect = {
  email: string | null;
  optOut: boolean;
  disqualifie: boolean;
  etape: string | null;
};

export type Eligibilite = { ok: true; modele: "Premier email" | "Relance" } | { ok: false; raison: string };

const parti = (e: EnvoiPasse) => e.statut === "Envoyé" || e.statut === "En cours";

// Qui peut recevoir un email aujourd'hui, et lequel. Revérifié juste avant chaque envoi.
export function eligibilite(p: Prospect, envois: EnvoiPasse[], resultats: string[], jour: string): Eligibilite {
  if (p.optOut) return { ok: false, raison: "Opposition enregistrée" };
  if (!p.email) return { ok: false, raison: "Pas d'adresse email" };
  if (!emailValide(p.email)) return { ok: false, raison: "Adresse email invalide" };
  if (aRepondu(resultats)) return { ok: false, raison: "Réponse enregistrée : continue l'échange toi-même" };
  if (p.disqualifie) return { ok: false, raison: "Prospect disqualifié" };
  if (!p.etape || !ETAPES_CONTACTABLES.includes(p.etape)) return { ok: false, raison: `Étape « ${p.etape ?? "fermée"} »` };

  const premier = envois.find((e) => e.modele === "Premier email" && parti(e));
  if (!premier) return { ok: true, modele: "Premier email" };
  if (envois.some((e) => e.modele === "Relance" && parti(e))) return { ok: false, raison: "Premier email et relance déjà envoyés" };
  const relanceLe = ajouterJours((premier.envoyeLe ?? jour).slice(0, 10), DELAI_RELANCE_JOURS);
  if (relanceLe > jour) return { ok: false, raison: `Relance possible à partir du ${formaterDate(relanceLe)}` };
  return { ok: true, modele: "Relance" };
}

const SOURCES: Record<string, string> = {
  "Passage physique": "relevées lors de mon passage dans votre établissement",
  Instagram: "votre compte Instagram",
  LinkedIn: "votre profil LinkedIn",
  "Google Maps": "votre fiche Google Maps",
  Salon: "un salon professionnel",
  Recommandation: "une recommandation",
  "Offre d'emploi": "votre offre d'emploi",
};

// Proposée à partir de l'origine de la fiche ; inconnue (annuaire data.gouv.fr) → à compléter, jamais devinée.
export function origineProposee(origine: string): string {
  const source = SOURCES[origine] ?? `${MARQUEUR} : où as-tu trouvé cette adresse email ?]`;
  return `Origine de vos coordonnées : ${source}.`;
}

export type Fiche = {
  nom: string;
  ville: string;
  secteur: string | null;
  contactNom: string | null;
  angleAccroche: string | null;
  origine: string;
};

export type Brouillon = { objet: string; corps: string; origineCoordonnees: string };

const bonjour = (contact: string | null) => `Bonjour${contact?.trim() ? ` ${contact.trim()}` : ""},`;

export function composerBrouillon(f: Fiche, modele: "Premier email" | "Relance", signature: string, premier?: { objet: string; envoyeLe: string | null }): Brouillon {
  const origineCoordonnees = origineProposee(f.origine);
  if (modele === "Relance") {
    const date = premier?.envoyeLe ? ` du ${formaterDate(premier.envoyeLe)}` : "";
    return {
      objet: `Re : ${premier?.objet ?? f.nom}`,
      corps: [
        bonjour(f.contactNom),
        `Je reviens vers vous au sujet de mon message${date}. Je serais ravie d'échanger 15 minutes sur la façon de faire venir plus de clients chez ${f.nom} grâce à votre histoire.`,
        "Si le sujet ne vous intéresse pas, un simple « non merci » me suffit : je ne vous relancerai pas.",
        `Belle journée,\n${signature}`,
      ].join("\n\n"),
      origineCoordonnees,
    };
  }
  const restaurant = f.secteur === "Restaurant";
  const angle = f.angleAccroche?.trim();
  return {
    objet: `${f.nom} : votre histoire, vos futurs clients`,
    corps: [
      bonjour(f.contactNom),
      angle
        ? `${MARQUEUR} : une phrase personnelle sur ${f.nom}. Ton angle : ${angle}]`
        : `${MARQUEUR} : une phrase personnelle sur ce qui t'a donné envie de contacter ${f.nom}]`,
      `Je suis Social Media Manager, spécialisée dans les restaurants et les commerces de bouche, basée en Seine-et-Marne. Chaque ${restaurant ? "restaurant" : "commerce"} a une histoire : peu savent la raconter, encore moins la transformer en clients. C'est ce que je fais, avec une communication qui donne envie de venir vivre l'expérience ${restaurant ? "en salle" : "en boutique"}.`,
      `Seriez-vous d'accord pour un échange de 15 minutes, par téléphone ou lors d'un passage à ${f.ville} ?`,
      `Belle journée,\n${signature}`,
    ].join("\n\n"),
    origineCoordonnees,
  };
}

// Bas de chaque message, ajouté à l'envoi : identité, origine des coordonnées, moyen simple de s'opposer.
export function piedDePage(identite: string, origineCoordonnees: string): string {
  return [
    "--",
    identite.trim(),
    origineCoordonnees.trim(),
    "Vous recevez ce message à titre professionnel. Pour ne plus recevoir de message de ma part, répondez simplement « STOP » à cet email : je ne vous recontacterai plus.",
  ].join("\n");
}

export const messageComplet = (corps: string, pied: string) => `${corps.trim()}\n\n${pied}\n`;

// Ce qui empêche un brouillon de partir, ou null.
export function aCorriger(b: Brouillon): string | null {
  if (!b.objet.trim()) return "Objet vide";
  if (!b.corps.trim()) return "Message vide";
  if (!b.origineCoordonnees.trim()) return "Origine des coordonnées vide";
  if ([b.objet, b.corps, b.origineCoordonnees].some(resteACompleter)) return `Remplace le texte « ${MARQUEUR}… »`;
  return null;
}
