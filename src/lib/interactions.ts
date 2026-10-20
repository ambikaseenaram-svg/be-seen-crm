// Règles du journal des interactions, sans accès base : testables seules.
import { ETAPES_KANBAN } from "./affaires";

const CHEMIN = ["Repéré", "Qualifié", "Contacté / Visité", "Échange engagé", "RDV fait", "Proposition envoyée", "Décision", "Client actif"];
const rang = (etape: string) => CHEMIN.indexOf(etape);

// L'étape où l'affaire peut avancer après une interaction, ou null. Jamais de retour en arrière,
// jamais de passage automatique à Décision, Client actif ou Perdu : ces étapes restent ta décision.
export function etapeSuggeree(etapeActuelle: string, type: string, resultat: string): string | null {
  if (rang(etapeActuelle) === -1 || !ETAPES_KANBAN.includes(etapeActuelle as never)) return null;
  const candidates: string[] = [];
  if (resultat !== "Opt-out demandé") {
    candidates.push("Contacté / Visité");
    if (resultat === "Réponse positive" || resultat === "RDV obtenu") candidates.push("Échange engagé");
    if (type === "RDV" && (resultat === "Réponse positive" || resultat === "RDV obtenu")) candidates.push("RDV fait");
    if (type === "Envoi de proposition") candidates.push("Proposition envoyée");
  }
  const meilleure = candidates.sort((a, b) => rang(b) - rang(a))[0];
  return meilleure && rang(meilleure) > rang(etapeActuelle) ? meilleure : null;
}

// Un opt-out demandé par ce canal : « Oral » pour un échange de vive voix, « Message » pour les messageries.
export function canalOptOut(canalInteraction: string): "Email" | "Message" | "Oral" {
  if (canalInteraction === "Email") return "Email";
  if (canalInteraction === "Passage" || canalInteraction === "Téléphone") return "Oral";
  return "Message";
}

export const estReponse = (resultat: string) => resultat === "Réponse positive" || resultat === "RDV obtenu";
