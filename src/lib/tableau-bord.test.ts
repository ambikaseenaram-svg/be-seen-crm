import { describe, expect, it } from "vitest";
import { memeMois, progression, statsCanaux } from "./tableau-bord";

describe("tableau de bord", () => {
  it("progression plafonnée à 100 %", () => {
    expect(progression(5, 20)).toEqual({ pct: 25, atteint: false });
    expect(progression(20, 20)).toEqual({ pct: 100, atteint: true });
    expect(progression(30, 20)).toEqual({ pct: 100, atteint: true });
    expect(progression(0, 0)).toEqual({ pct: 0, atteint: false });
  });

  it("reconnaît le mois en cours", () => {
    expect(memeMois("2026-10-03", "2026-10-20")).toBe(true);
    expect(memeMois("2026-09-30", "2026-10-20")).toBe(false);
    expect(memeMois(null, "2026-10-20")).toBe(false);
  });

  it("classe les canaux par taux de réponses positives, sous réserve du seuil", () => {
    const lignes = [
      ...Array(5).fill({ canal: "Passage", resultat: "Pas de réponse" }),
      ...Array(3).fill({ canal: "Passage", resultat: "Réponse positive" }),
      ...Array(2).fill({ canal: "Passage", resultat: "RDV obtenu" }),
      ...Array(6).fill({ canal: "Email", resultat: "Pas de réponse" }),
      { canal: "Email", resultat: "Réponse positive" },
      { canal: "DM Instagram", resultat: "RDV obtenu" },
    ];
    const { stats, meilleur } = statsCanaux(lignes, 5);
    expect(stats.find((s) => s.canal === "Passage")).toEqual({ canal: "Passage", contacts: 10, positives: 5, taux: 50 });
    expect(stats.find((s) => s.canal === "Email")?.taux).toBe(14);
    // Instagram : 100 % mais 1 seul contact → jamais désigné meilleur canal.
    expect(stats.find((s) => s.canal === "DM Instagram")?.taux).toBe(100);
    expect(meilleur?.canal).toBe("Passage");
  });

  it("aucun canal désigné sans assez de données", () => {
    expect(statsCanaux([{ canal: "Email", resultat: "RDV obtenu" }], 5).meilleur).toBeNull();
    expect(statsCanaux([], 5)).toEqual({ stats: [], meilleur: null });
  });
});
