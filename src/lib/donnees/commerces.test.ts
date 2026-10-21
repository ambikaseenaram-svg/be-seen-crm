import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Base jetable : le test ne touche jamais à data/be-seen.db.
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "be-seen-test-"));
process.env.DATABASE_PATH = path.join(dossier, "test.db");

type Modules = { c: typeof import("./commerces"); db: typeof import("@/db").db; s: typeof import("@/db/schema") };
let m: Modules;

const commerce = (n: number, extra = {}) => ({
  siret: `1234567890${String(n).padStart(4, "0")}`,
  nom: `Boulangerie ${n}`,
  ville: "Meaux",
  adresse: `${n} rue du Marché 77100 Meaux`,
  departement: "77" as const,
  secteur: "Commerce de bouche" as const,
  ...extra,
});

beforeAll(async () => {
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("@/db");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  m = { c: await import("./commerces"), db, s: await import("@/db/schema") };
});
afterAll(() => fs.rmSync(dossier, { recursive: true, force: true }));

describe("ajouterCommerces", () => {
  it("crée la fiche avec la source, la date de collecte et le statut « À analyser », sans rien inventer", () => {
    const r = m.c.ajouterCommerces([commerce(1)], "2026-10-21");
    expect(r).toEqual({ ajoutes: 1, ignores: 0 });
    const e = m.db.select().from(m.s.entreprises).all()[0];
    expect(e).toMatchObject({ nom: "Boulangerie 1", siret: "12345678900001", origine: "data.gouv.fr", dateCollecte: "2026-10-21", secteur: "Commerce de bouche", departement: "77" });
    expect([e.email, e.telephone, e.siteUrl, e.instagramUrl, e.contactNom, e.score, e.priorite, e.c1, e.c5]).toEqual([null, null, null, null, null, null, null, null, null]);
    const a = m.db.select().from(m.s.affaires).all()[0];
    expect(a).toMatchObject({ entrepriseId: e.id, etape: "Repéré", prochaineAction: "À analyser", dateEtape: "2026-10-21", dateProchaineAction: null });
  });

  it("n'ajoute pas deux fois le même SIRET", () => {
    expect(m.c.ajouterCommerces([commerce(1)])).toEqual({ ajoutes: 0, ignores: 1 });
    expect(m.c.ajouterCommerces([commerce(2), commerce(2)])).toEqual({ ajoutes: 1, ignores: 1 });
    expect(m.db.select().from(m.s.entreprises).all()).toHaveLength(2);
  });

  it("ignore un commerce déjà saisi à la main (même nom et même ville, sans SIRET)", () => {
    m.db.insert(m.s.entreprises).values({ nom: "Café Élise", ville: "Provins", origine: "Passage physique", dateCollecte: "2026-10-01" }).run();
    const r = m.c.ajouterCommerces([commerce(3, { nom: "CAFE ELISE", ville: "provins" })]);
    expect(r).toEqual({ ajoutes: 0, ignores: 1 });
  });

  it("signale la présence par SIRET ou par nom + ville", () => {
    const p = m.c.presenceDansCrm([commerce(1), commerce(9), commerce(10, { nom: "Café Élise", ville: "Provins" })]);
    expect(p.get(commerce(1).siret)).toBe("siret");
    expect(p.get(commerce(9).siret)).toBeNull();
    expect(p.get(commerce(10).siret)).toBe("nom-ville");
  });
});
