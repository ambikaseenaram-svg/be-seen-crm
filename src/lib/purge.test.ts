import { describe, expect, it } from "vitest";
import { estPurgeable, seuilPurge } from "./purge";

const jour = "2026-10-20";
const base = { derniereInteraction: null, dateCollecte: "2020-01-01", optOut: false, aEteClient: false };

describe("purge RGPD", () => {
  it("le seuil est 3 ans avant aujourd'hui", () => {
    expect(seuilPurge(jour)).toBe("2023-10-20");
  });

  it("purge un prospect sans échange depuis plus de 3 ans", () => {
    expect(estPurgeable({ ...base, derniereInteraction: "2023-10-19" }, jour)).toBe(true);
  });

  it("garde un prospect avec un échange récent ou pile à 3 ans", () => {
    expect(estPurgeable({ ...base, derniereInteraction: "2023-10-20" }, jour)).toBe(false);
    expect(estPurgeable({ ...base, derniereInteraction: "2025-06-01" }, jour)).toBe(false);
  });

  it("sans échange, la date de collecte fait foi", () => {
    expect(estPurgeable({ ...base, dateCollecte: "2022-01-01" }, jour)).toBe(true);
    expect(estPurgeable({ ...base, dateCollecte: "2026-01-01" }, jour)).toBe(false);
  });

  it("ne purge jamais un client ni une entreprise en opt-out", () => {
    expect(estPurgeable({ ...base, aEteClient: true }, jour)).toBe(false);
    expect(estPurgeable({ ...base, optOut: true }, jour)).toBe(false);
  });
});
