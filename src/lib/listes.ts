// Listes de valeurs du CRM (document « Structure du CRM BE SEEN »).
// Les valeurs sont stockées telles quelles en base : elles restent lisibles dans les exports CSV.

export const SECTEURS = [
  "Restaurant",
  "Commerce de bouche",
  "Mode/Cosmétique",
  "Services B2B",
  "Artisan/BTP",
  "Autre",
] as const;

export const DEPARTEMENTS = ["77", "94", "75", "91", "93", "Autre IDF", "Hors IDF"] as const;

export const MODES_COLLAB = ["Sur place", "Remote", "Mixte"] as const;

export const ROLES_CONTACT = ["Gérant", "Chef-propriétaire", "Associé", "Salarié"] as const;

export const CANAUX_PREFERES = ["Téléphone", "Email", "WhatsApp", "DM Instagram", "Passage"] as const;

export const PRIORITES = ["Vert", "Jaune", "Rouge"] as const;

export const ORIGINES = [
  "Passage physique",
  "Instagram",
  "LinkedIn",
  "Google Maps",
  "Salon",
  "Recommandation",
  "Offre d'emploi",
  "data.gouv.fr",
] as const;

export const TYPES_COORDONNEES = ["Pro générique", "Pro nominative", "Perso"] as const;

export const CANAUX_OPT_OUT = ["Email", "Message", "Oral"] as const;

// « Contacté » renommé « Contacté / Visité » (validé : le passage physique est un premier contact).
export const ETAPES = [
  "Repéré",
  "Qualifié",
  "Contacté / Visité",
  "Échange engagé",
  "RDV fait",
  "Proposition envoyée",
  "Décision",
  "Client actif",
  "Client terminé",
  "Perdu",
  "En pause",
] as const;

export const ETAPES_FERMEES = ["Client terminé", "Perdu"] as const;

export const OFFRES = ["Fondations", "Expérience", "Signature"] as const;

export const MOTIFS_PERTE = ["Prix", "Pas de besoin", "Silence", "Timing", "Concurrent", "Hors cible"] as const;

export const TYPES_INTERACTION = [
  "Premier contact",
  "Relance",
  "Échange",
  "RDV",
  "Envoi de proposition",
] as const;

export const CANAUX_INTERACTION = [
  "Passage",
  "Téléphone",
  "Email",
  "WhatsApp",
  "DM Instagram",
  "LinkedIn",
] as const;

export const RESULTATS_INTERACTION = [
  "Pas de réponse",
  "Réponse positive",
  "Réponse négative",
  "RDV obtenu",
  "Opt-out demandé",
] as const;

// Contacter les prospects par email : un premier email, puis une seule relance au plus.
export const MODELES_EMAIL = ["Premier email", "Relance"] as const;

// Brouillon → En cours (envoi parti vers le serveur mail) → Envoyé ou Échec. Exclu : retiré au moment de l'envoi.
export const STATUTS_ENVOI = ["Brouillon", "En cours", "Envoyé", "Échec", "Exclu"] as const;
