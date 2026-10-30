import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Base jetable : le test ne touche jamais à data/be-seen.db.
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "be-seen-test-"));
process.env.DATABASE_PATH = path.join(dossier, "test.db");

type Modules = { i: typeof import("./import"); db: typeof import("@/db").db; s: typeof import("@/db/schema") };
let m: Modules;

beforeAll(async () => {
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("@/db");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  m = { i: await import("./import"), db, s: await import("@/db/schema") };
  m.db.insert(m.s.entreprises).values({ nom: "Fromagerie Axelo", ville: "Meaux", origine: "Passage physique", dateCollecte: "2026-10-01", siret: "11111111111111" }).run();
});
afterAll(() => fs.rmSync(dossier, { recursive: true, force: true }));

const FICHIER = [
  "Nom;Ville;SIRET;Email;Notes",
  "Le Bistrot;Meaux;;contact@bistrot.fr;Chef passé par le Ritz",
  "fromagerie axélo;MEAUX;;;", // déjà dans le CRM (nom et ville)
  "Cave Duval;Lagny;11111111111111;;", // déjà dans le CRM (SIRET)
  "Le Bistrot;Meaux;;;", // doublon dans le fichier
  ";Chelles;;;", // erreur
  "La Table d'Anna;Chelles;;anna@;", // erreur
  "Boulangerie Rio;Torcy;;;",
].join("\r\n");

describe("import", () => {
  it("classe chaque ligne sans rien écrire", () => {
    const a = m.i.analyserFichier(FICHIER, "Salon");
    if (!a.ok) throw new Error(a.message);
    expect(a.lignes.map((l) => [l.numero, l.statut])).toEqual([
      [2, "ok"], [3, "doublon"], [4, "doublon"], [5, "doublon"], [6, "erreur"], [7, "erreur"], [8, "ok"],
    ]);
    expect(a.lignes[3].doublon).toBe("Même nom et ville que la ligne 2");
    expect(a.aImporter).toBe(2);
    expect(m.db.select().from(m.s.entreprises).all()).toHaveLength(1);
  });

  it("importe les seules lignes valides, à « Repéré / À analyser », avec origine et date de collecte, sans rien inventer", () => {
    const a = m.i.analyserFichier(FICHIER, "Salon");
    if (!a.ok) throw new Error(a.message);
    expect(m.i.importerLignes(a.lignes, "2026-10-30")).toBe(2);
    const bistrot = m.db.select().from(m.s.entreprises).all().find((e) => e.nom === "Le Bistrot")!;
    expect(bistrot).toMatchObject({ ville: "Meaux", email: "contact@bistrot.fr", angleAccroche: "Chef passé par le Ritz", origine: "Salon", dateCollecte: "2026-10-30", optOut: false });
    expect([bistrot.score, bistrot.priorite, bistrot.telephone, bistrot.instagramUrl]).toEqual([null, null, null, null]);
    expect(m.db.select().from(m.s.affaires).all().map((x) => [x.etape, x.prochaineAction])).toEqual([["Repéré", "À analyser"], ["Repéré", "À analyser"]]);
    // Réimporter le même fichier n'ajoute rien.
    const b = m.i.analyserFichier(FICHIER, "Salon");
    expect(b.ok && b.aImporter).toBe(0);
  });

  it("fichier vide ou colonnes manquantes", () => {
    expect(m.i.analyserFichier("Nom;Ville\r\n", "Salon")).toMatchObject({ ok: false });
    const a = m.i.analyserFichier("Établissement;Lieu\r\nA;B", "Salon");
    expect(a.ok && a.probleme).toContain("ville");
    // Correspondance corrigée à la main.
    const b = m.i.analyserFichier("Établissement;Lieu\r\nA;B", "Salon", ["nom", "ville"]);
    expect(b.ok && b.aImporter).toBe(1);
  });
});
