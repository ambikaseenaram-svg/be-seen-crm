import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Base jetable : le test ne touche jamais à data/be-seen.db.
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "be-seen-test-"));
process.env.DATABASE_PATH = path.join(dossier, "test.db");

type Modules = { em: typeof import("./emails"); db: typeof import("@/db").db; s: typeof import("@/db/schema") };
let m: Modules;

const JOUR = "2026-10-21";
const messagerie = { hote: "smtp.test", port: 465, utilisateur: "moi@be-seen.fr", motDePasse: "x", expediteur: "moi@be-seen.fr", nom: "Ambika", identite: "Ambika — BE SEEN" };

function prospect(nom: string, extra: Partial<typeof import("@/db/schema").entreprises.$inferInsert> = {}) {
  const { id } = m.db
    .insert(m.s.entreprises)
    .values({ nom, ville: "Meaux", origine: "Google Maps", dateCollecte: JOUR, email: `contact@${nom.toLowerCase()}.fr`, ...extra })
    .returning({ id: m.s.entreprises.id })
    .get();
  m.db.insert(m.s.affaires).values({ entrepriseId: id, etape: "Repéré", dateEtape: JOUR }).run();
  return id;
}

// Remplace la phrase à compléter, comme tu le ferais en relisant.
function relire() {
  for (const b of m.em.listerBrouillons()) m.em.modifierBrouillon(b.id, { ...b, corps: b.corps.replace(/\[À compléter[^\]]*\]/, "J'adore votre carte.") });
}

beforeAll(async () => {
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("@/db");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  m = { em: await import("./emails"), db, s: await import("@/db/schema") };
});
beforeEach(() => {
  m.db.delete(m.s.entreprises).run();
});
afterAll(() => fs.rmSync(dossier, { recursive: true, force: true }));

describe("préparer et envoyer", () => {
  it("prépare un brouillon par prospect avec email, sur l'adresse de la fiche, sans rien envoyer", () => {
    const a = prospect("Alpha", { contactNom: "Léa" });
    const b = prospect("Bravo", { email: null });
    const r = m.em.preparerBrouillons([a, b], "Ambika", JOUR);
    expect(r.prepares).toBe(1);
    expect(r.ignores).toEqual([{ nom: "Bravo", raison: "Pas d'adresse email" }]);
    const [br] = m.em.listerBrouillons();
    expect(br).toMatchObject({ destinataire: "contact@alpha.fr", modele: "Premier email", statut: "Brouillon" });
    expect(br.corps).toMatch(/^Bonjour Léa,/);
    expect(br.aCorriger).toContain("Remplace");
    // Préparer deux fois ne crée pas de second brouillon.
    expect(m.em.preparerBrouillons([a], "Ambika", JOUR).ignores[0].raison).toBe("Brouillon déjà prêt");
  });

  it("refuse d'envoyer un lot non relu, modifié ou incomplet", async () => {
    const a = prospect("Alpha");
    m.em.preparerBrouillons([a], "Ambika", JOUR);
    const envoyer = vi.fn(async () => ({ ok: true as const }));
    const [br] = m.em.listerBrouillons();
    expect(await m.em.envoyerLot([br.id], messagerie, { jour: JOUR, pauseMs: 0, envoyer })).toMatchObject({ ok: false, message: expect.stringContaining("Remplace") });
    relire();
    expect(await m.em.envoyerLot([], messagerie, { jour: JOUR, pauseMs: 0, envoyer })).toMatchObject({ ok: false, message: expect.stringContaining("Le lot a changé") });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("revérifie l'opt-out au moment de l'envoi, journalise, et n'envoie jamais deux fois", async () => {
    const a = prospect("Alpha");
    const b = prospect("Bravo");
    m.em.preparerBrouillons([a, b], "Ambika", JOUR);
    relire();
    // Bravo s'oppose après la préparation du lot.
    m.db.update(m.s.entreprises).set({ optOut: true }).where((await import("drizzle-orm")).eq(m.s.entreprises.id, b)).run();
    const envoyer = vi.fn(async () => ({ ok: true as const }));
    const ids = m.em.listerBrouillons().map((x) => x.id);
    const r = await m.em.envoyerLot(ids, messagerie, { jour: JOUR, pauseMs: 0, envoyer });
    expect(r).toEqual({ ok: true, envoyes: 1, echecs: 0, exclus: [{ nom: "Bravo", raison: "Opposition enregistrée" }] });
    expect(envoyer).toHaveBeenCalledTimes(1);
    const msg = envoyer.mock.calls[0] as unknown as [unknown, { a: string; texte: string }];
    expect(msg[1].a).toBe("contact@alpha.fr");
    expect(msg[1].texte).toContain("Ambika — BE SEEN");
    expect(msg[1].texte).toContain("Origine de vos coordonnées : votre fiche Google Maps.");
    expect(msg[1].texte).toContain("« STOP »");

    // Journal : date, destinataire, statut.
    const journal = m.em.listerJournalEnvois();
    expect(journal.map((j) => [j.entrepriseNom, j.destinataire, j.statut])).toEqual(
      expect.arrayContaining([["Alpha", "contact@alpha.fr", "Envoyé"], ["Bravo", "contact@bravo.fr", "Exclu"]]),
    );
    expect(journal.find((j) => j.statut === "Envoyé")?.envoyeLe).toBeTruthy();
    // L'envoi est noté au journal des interactions et l'affaire avance.
    const inter = m.db.select().from(m.s.interactions).all();
    expect(inter).toHaveLength(1);
    expect(inter[0]).toMatchObject({ type: "Premier contact", canal: "Email", resultat: "Pas de réponse" });

    // Plus de premier email possible pour Alpha ; la base refuse même un doublon forcé.
    expect(m.em.preparerBrouillons([a], "Ambika", JOUR).ignores[0].raison).toContain("Relance possible");
    expect(() =>
      m.db.insert(m.s.envois).values({ entrepriseId: a, modele: "Premier email", destinataire: "x@y.fr", objet: "o", corps: "c", origineCoordonnees: "o", statut: "Envoyé" }).run(),
    ).toThrow();
  });

  it("relance au bout de 7 jours, stoppée dès qu'une réponse est enregistrée", async () => {
    const a = prospect("Alpha");
    m.em.preparerBrouillons([a], "Ambika", "2026-10-01");
    relire();
    await m.em.envoyerLot(m.em.listerBrouillons().map((x) => x.id), messagerie, { jour: "2026-10-01", pauseMs: 0, envoyer: async () => ({ ok: true }) });
    // La date d'envoi réelle est aujourd'hui : on la recule pour simuler 7 jours écoulés.
    m.db.update(m.s.envois).set({ envoyeLe: "2026-10-01T09:00:00.000Z" }).run();
    expect(m.em.listerRelancesPossibles("2026-10-08").map((r) => r.nom)).toEqual(["Alpha"]);
    m.db.insert(m.s.interactions).values({ entrepriseId: a, date: "2026-10-05", type: "Échange", canal: "Email", resultat: "Réponse négative" }).run();
    expect(m.em.listerRelancesPossibles("2026-10-08")).toEqual([]);
  });

  it("un échec est journalisé avec son motif", async () => {
    const a = prospect("Alpha");
    m.em.preparerBrouillons([a], "Ambika", JOUR);
    relire();
    const r = await m.em.envoyerLot(m.em.listerBrouillons().map((x) => x.id), messagerie, { jour: JOUR, pauseMs: 0, envoyer: async () => ({ ok: false, erreur: "Adresse refusée" }) });
    expect(r).toMatchObject({ ok: true, envoyes: 0, echecs: 1 });
    expect(m.em.listerJournalEnvois()[0]).toMatchObject({ statut: "Échec", raison: "Adresse refusée" });
    expect(m.db.select().from(m.s.interactions).all()).toHaveLength(0);
  });
});
