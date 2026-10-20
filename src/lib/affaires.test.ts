import { describe, expect, it } from "vitest";
import { alerteTarif, champsManquants, enRetard, ETAPES_KANBAN, joursEntre, valeurTotale } from "./affaires";

describe("affaires", () => {
  it("le Kanban n'affiche que les étapes ouvertes", () => {
    expect(ETAPES_KANBAN).toHaveLength(9);
    expect(ETAPES_KANBAN).not.toContain("Perdu");
    expect(ETAPES_KANBAN).not.toContain("Client terminé");
    expect(ETAPES_KANBAN).toContain("En pause");
  });

  it("valeur totale = montant mensuel × durée, jamais devinée", () => {
    expect(valeurTotale(2000, 6)).toBe(12000);
    expect(valeurTotale(2000, null)).toBeNull();
    expect(valeurTotale(null, 6)).toBeNull();
  });

  it("alerte quand le montant passe sous la fourchette de l'offre", () => {
    expect(alerteTarif("Expérience", 1500)).toContain("contrepartie");
    expect(alerteTarif("Expérience", 1800)).toBeNull();
    expect(alerteTarif("Signature", 4000)).toBeNull();
    expect(alerteTarif(null, 1000)).toBeNull();
    expect(alerteTarif("Fondations", null)).toBeNull();
  });

  it("Perdu exige un motif ; Client actif exige offre, montant et durée", () => {
    const vide = { offre: null, montantMensuel: null, dureeMois: null, motifPerte: null };
    expect(Object.keys(champsManquants("Perdu", vide))).toEqual(["motifPerte"]);
    expect(Object.keys(champsManquants("Client actif", vide))).toEqual(["offre", "montantMensuel", "dureeMois"]);
    expect(champsManquants("Client actif", { ...vide, offre: "Fondations", montantMensuel: 1200, dureeMois: 6 })).toEqual({});
    expect(champsManquants("RDV fait", vide)).toEqual({});
  });

  it("dates : retard et jours dans l'étape", () => {
    expect(enRetard("2026-10-19", "2026-10-20")).toBe(true);
    expect(enRetard("2026-10-20", "2026-10-20")).toBe(false);
    expect(enRetard(null, "2026-10-20")).toBe(false);
    expect(joursEntre("2026-10-16", "2026-10-20")).toBe(4);
  });
});
