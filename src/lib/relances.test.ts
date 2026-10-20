import { describe, expect, it } from "vitest";
import { ajouterJours, estEchue, joursDeRetard, statutRelance } from "./relances";

describe("relances", () => {
  const jour = "2026-10-20";

  it("classe une relance selon sa date", () => {
    expect(statutRelance("2026-10-17", jour)).toBe("retard");
    expect(statutRelance("2026-10-20", jour)).toBe("aujourdhui");
    expect(statutRelance("2026-10-21", jour)).toBe("avenir");
    expect(statutRelance(null, jour)).toBe("sans");
  });

  it("compte les jours de retard", () => {
    expect(joursDeRetard("2026-10-17", jour)).toBe(3);
  });

  it("une action du jour ou passée est échue, une action future non", () => {
    expect(estEchue("2026-10-20", jour)).toBe(true);
    expect(estEchue("2026-10-01", jour)).toBe(true);
    expect(estEchue("2026-10-21", jour)).toBe(false);
    expect(estEchue(null, jour)).toBe(false);
  });

  it("ajoute des jours, y compris en changeant de mois", () => {
    expect(ajouterJours("2026-10-30", 3)).toBe("2026-11-02");
    expect(ajouterJours("2026-10-20", 1)).toBe("2026-10-21");
  });
});
