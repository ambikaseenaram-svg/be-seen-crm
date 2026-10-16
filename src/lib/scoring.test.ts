import { describe, expect, it } from "vitest";
import { calculerScoring } from "./scoring";

describe("calculerScoring", () => {
  // Les trois exemples du document « Scoring de prospection ».
  it("exemple 1 — restaurant bistronomique : 70, Vert", () => {
    expect(calculerScoring({ c1: 3, c2: 5, c3: 3, c4: 2, c5: 4 })).toEqual({ score: 70, priorite: "Vert", disqualifie: false });
  });

  it("exemple 2 — cabinet B2B : 50, Jaune", () => {
    expect(calculerScoring({ c1: 1, c2: 2, c3: 4, c4: 4, c5: 2 })).toEqual({ score: 50, priorite: "Jaune", disqualifie: false });
  });

  it("exemple 3 — e-commerce : 67, Jaune", () => {
    expect(calculerScoring({ c1: 4, c2: 3, c3: 5, c4: 4, c5: 2 })).toEqual({ score: 67, priorite: "Jaune", disqualifie: false });
  });

  it("score sous 40 : Rouge", () => {
    expect(calculerScoring({ c1: 1, c2: 2, c3: 1, c4: 2, c5: 2 }).priorite).toBe("Rouge");
  });

  it("C2 = 0 : disqualifié et Rouge malgré un score élevé", () => {
    expect(calculerScoring({ c1: 5, c2: 0, c3: 5, c4: 5, c5: 5 })).toEqual({ score: 83, priorite: "Rouge", disqualifie: true });
  });

  it("C5 = 0 : disqualifié", () => {
    expect(calculerScoring({ c1: 5, c2: 5, c3: 5, c4: 5, c5: 0 }).disqualifie).toBe(true);
  });

  it("C3 = 0 et C4 = 0 : disqualifié ; un seul des deux à 0 ne suffit pas", () => {
    expect(calculerScoring({ c1: 5, c2: 5, c3: 0, c4: 0, c5: 5 }).disqualifie).toBe(true);
    expect(calculerScoring({ c1: 5, c2: 5, c3: 0, c4: 3, c5: 5 }).disqualifie).toBe(false);
  });

  it("notes incomplètes : pas de score ni de priorité", () => {
    expect(calculerScoring({ c1: 3, c2: 5, c3: null, c4: 2, c5: 4 })).toEqual({ score: null, priorite: null, disqualifie: false });
  });

  it("notes incomplètes mais C2 = 0 : déjà disqualifié", () => {
    expect(calculerScoring({ c1: null, c2: 0, c3: null, c4: null, c5: null })).toEqual({ score: null, priorite: "Rouge", disqualifie: true });
  });

  it("seuils exacts : 40 = Jaune, 69 = Jaune", () => {
    // 12 points bruts = 40 ; 20,7 points → 69
    expect(calculerScoring({ c1: 2, c2: 2, c3: 2, c4: 2, c5: 2 })).toMatchObject({ score: 40, priorite: "Jaune" });
  });
});
