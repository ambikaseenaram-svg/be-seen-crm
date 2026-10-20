import { describe, expect, it } from "vitest";
import { canalOptOut, etapeSuggeree } from "./interactions";

describe("etapeSuggeree", () => {
  it("un premier contact fait passer Repéré ou Qualifié à Contacté / Visité", () => {
    expect(etapeSuggeree("Repéré", "Premier contact", "Pas de réponse")).toBe("Contacté / Visité");
    expect(etapeSuggeree("Qualifié", "Premier contact", "Réponse négative")).toBe("Contacté / Visité");
  });

  it("une réponse positive ou un RDV obtenu mène à Échange engagé", () => {
    expect(etapeSuggeree("Contacté / Visité", "Relance", "Réponse positive")).toBe("Échange engagé");
    expect(etapeSuggeree("Repéré", "Échange", "RDV obtenu")).toBe("Échange engagé");
  });

  it("un RDV réellement tenu mène à RDV fait, une proposition à Proposition envoyée", () => {
    expect(etapeSuggeree("Échange engagé", "RDV", "Réponse positive")).toBe("RDV fait");
    expect(etapeSuggeree("RDV fait", "Envoi de proposition", "Pas de réponse")).toBe("Proposition envoyée");
  });

  it("jamais de retour en arrière ni d'étape décisive automatique", () => {
    expect(etapeSuggeree("RDV fait", "Relance", "Pas de réponse")).toBeNull();
    expect(etapeSuggeree("Proposition envoyée", "Échange", "Réponse positive")).toBeNull();
    expect(etapeSuggeree("Décision", "Envoi de proposition", "Réponse positive")).toBeNull();
    expect(etapeSuggeree("En pause", "Relance", "Réponse positive")).toBeNull();
  });

  it("un opt-out ne fait avancer aucune affaire", () => {
    expect(etapeSuggeree("Repéré", "Échange", "Opt-out demandé")).toBeNull();
  });
});

describe("canalOptOut", () => {
  it("fait correspondre le canal de l'interaction au canal d'opt-out", () => {
    expect(canalOptOut("Email")).toBe("Email");
    expect(canalOptOut("Téléphone")).toBe("Oral");
    expect(canalOptOut("Passage")).toBe("Oral");
    expect(canalOptOut("WhatsApp")).toBe("Message");
    expect(canalOptOut("DM Instagram")).toBe("Message");
    expect(canalOptOut("LinkedIn")).toBe("Message");
  });
});
