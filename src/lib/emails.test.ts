import { describe, expect, it } from "vitest";
import { aCorriger, aRepondu, composerBrouillon, eligibilite, emailValide, messageComplet, origineProposee, piedDePage, resteACompleter } from "./emails";

const JOUR = "2026-10-21";
const prospect = { email: "contact@bistrot.fr", optOut: false, disqualifie: false, etape: "Repéré" };
const fiche = { nom: "Le Bistrot", ville: "Meaux", secteur: "Restaurant", contactNom: "Marc", angleAccroche: null, origine: "Google Maps" };

describe("eligibilite", () => {
  it("premier email pour un prospect avec une adresse enregistrée", () => {
    expect(eligibilite(prospect, [], [], JOUR)).toEqual({ ok: true, modele: "Premier email" });
  });

  it("opposition, absence d'adresse, adresse invalide : jamais", () => {
    expect(eligibilite({ ...prospect, optOut: true }, [], [], JOUR)).toEqual({ ok: false, raison: "Opposition enregistrée" });
    expect(eligibilite({ ...prospect, email: null }, [], [], JOUR).ok).toBe(false);
    expect(eligibilite({ ...prospect, email: "contact@bistrot" }, [], [], JOUR).ok).toBe(false);
  });

  it("une réponse (même négative) ou un opt-out au journal arrête tout", () => {
    for (const r of ["Réponse positive", "Réponse négative", "RDV obtenu", "Opt-out demandé"]) expect(eligibilite(prospect, [], [r], JOUR).ok).toBe(false);
    expect(eligibilite(prospect, [], ["Pas de réponse"], JOUR).ok).toBe(true);
  });

  it("clients, affaires fermées, en pause ou avancées : pas d'email de prospection", () => {
    for (const etape of ["Client actif", "En pause", "RDV fait", null]) expect(eligibilite({ ...prospect, etape }, [], [], JOUR).ok).toBe(false);
    expect(eligibilite({ ...prospect, disqualifie: true }, [], [], JOUR).ok).toBe(false);
  });

  it("une seule relance, au moins 7 jours après le premier email, jamais deux fois le même", () => {
    const premier = { modele: "Premier email", statut: "Envoyé", envoyeLe: "2026-10-16T10:00:00.000Z" };
    expect(eligibilite(prospect, [premier], [], JOUR)).toEqual({ ok: false, raison: "Relance possible à partir du 23/10/2026" });
    expect(eligibilite(prospect, [premier], [], "2026-10-23")).toEqual({ ok: true, modele: "Relance" });
    const relance = { modele: "Relance", statut: "Envoyé", envoyeLe: "2026-10-23T10:00:00.000Z" };
    expect(eligibilite(prospect, [premier, relance], [], "2026-11-30").ok).toBe(false);
    // Un envoi en échec ne compte pas comme parti ; un envoi interrompu (« En cours ») compte, par prudence.
    expect(eligibilite(prospect, [{ ...premier, statut: "Échec" }], [], JOUR)).toEqual({ ok: true, modele: "Premier email" });
    expect(eligibilite(prospect, [{ ...premier, statut: "En cours" }], [], JOUR).ok).toBe(false);
  });
});

describe("brouillons", () => {
  it("premier email personnalisé, avec une phrase à écrire soi-même", () => {
    const b = composerBrouillon({ ...fiche, angleAccroche: "Chef formé chez Ducasse" }, "Premier email", "Ambika");
    expect(b.objet).toBe("Le Bistrot : votre histoire, vos futurs clients");
    expect(b.corps).toMatch(/^Bonjour Marc,/);
    expect(b.corps).toContain("Ton angle : Chef formé chez Ducasse");
    expect(b.corps).toContain("en salle");
    expect(b.corps).toContain("passage à Meaux");
    expect(b.corps).toMatch(/Ambika$/);
    expect(aCorriger(b)).toContain("Remplace");
  });

  it("sans contact ni angle : salutation neutre, rien d'inventé", () => {
    const b = composerBrouillon({ ...fiche, contactNom: null, secteur: "Commerce de bouche" }, "Premier email", "Ambika");
    expect(b.corps).toMatch(/^Bonjour,/);
    expect(b.corps).toContain("en boutique");
    expect(resteACompleter(b.corps)).toBe(true);
  });

  it("relance : reprend l'objet et la date du premier email, propose de dire non", () => {
    const b = composerBrouillon(fiche, "Relance", "Ambika", { objet: "Le Bistrot : votre histoire", envoyeLe: "2026-10-14T09:00:00Z" });
    expect(b.objet).toBe("Re : Le Bistrot : votre histoire");
    expect(b.corps).toContain("message du 14/10/2026");
    expect(b.corps).toContain("non merci");
    expect(aCorriger(b)).toBeNull();
  });

  it("origine des coordonnées : proposée selon la fiche, à compléter si inconnue", () => {
    expect(origineProposee("Google Maps")).toBe("Origine de vos coordonnées : votre fiche Google Maps.");
    expect(resteACompleter(origineProposee("data.gouv.fr"))).toBe(true);
  });

  it("bas de message : identité, origine et moyen simple de s'opposer", () => {
    const texte = messageComplet("Bonjour,\n\nMessage.", piedDePage("Ambika S. — BE SEEN", "Origine de vos coordonnées : votre fiche Google Maps."));
    expect(texte).toContain("Ambika S. — BE SEEN");
    expect(texte).toContain("Origine de vos coordonnées");
    expect(texte).toContain("répondez simplement « STOP »");
  });

  it("champs vides bloqués", () => {
    expect(aCorriger({ objet: " ", corps: "x", origineCoordonnees: "y" })).toBe("Objet vide");
    expect(aCorriger({ objet: "x", corps: "x", origineCoordonnees: "" })).toBe("Origine des coordonnées vide");
  });
});

describe("outils", () => {
  it("forme d'adresse et réponses", () => {
    expect(emailValide("a.b@resto-paris.fr")).toBe(true);
    expect(emailValide("pas une adresse")).toBe(false);
    expect(aRepondu(["Pas de réponse"])).toBe(false);
  });
});
