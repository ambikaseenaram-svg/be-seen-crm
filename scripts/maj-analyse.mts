// Met à jour les 5 prospects analysés avec les infos Instagram et l'angle d'accroche.
import Database from "better-sqlite3";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "be-seen.db");
const db = new Database(dbPath);

const mises_a_jour: { nom: string; ville: string; abonnesInsta: number | null; instagramUrl: string | null; angleAccroche: string }[] = [
  {
    nom: "Maison Valeria",
    ville: "Champigny-sur-Marne",
    abonnesInsta: 958,
    instagramUrl: "@bpvaleria",
    angleAccroche:
      "Vidéos Capcut basiques, affiches IA, zéro engagement malgré 500 avis Google positifs. Dernière vidéo en janvier 2026. Ils essaient seuls et ça ne marche pas — besoin d'une vraie stratégie de contenu pour convertir leur réputation en trafic.",
  },
  {
    nom: "Les Délices de Lulu",
    ville: "Champigny-sur-Marne",
    abonnesInsta: 767,
    instagramUrl: "@lesdelicesdelulu",
    angleAccroche:
      "Collab' avec la ville de Champigny = envie de rayonner. Pas d'identité visuelle. Offre du midi + ambiance famille = deux histoires fortes à raconter, aucune visible en ligne.",
  },
  {
    nom: "Laura Pâtisserie & Atelier",
    ville: "Champigny-sur-Marne",
    abonnesInsta: null,
    instagramUrl: null,
    angleAccroche:
      "Note parfaite 5/5, identité visuelle pro (studio de design) mais zéro présence Instagram. Pâtisserie sur commande = contenu idéal (avant/après, processus). La fondatrice gère seule sa com.",
  },
  {
    nom: "Doce Portugal",
    ville: "Champigny-sur-Marne",
    abonnesInsta: 61,
    instagramUrl: "@doceportugal",
    angleAccroche:
      "Famille portugaise, pastéis de nata reconnus, authenticité rare. 61 abonnés, dernier post en avril. Storytelling « tradition familiale » en or. Budget serré → offre Fondations bas de fourchette.",
  },
  {
    nom: "Canopée",
    ville: "Champigny-sur-Marne",
    abonnesInsta: 1668,
    instagramUrl: "@canopee.boulangerie",
    angleAccroche:
      "Passage TV (Meilleure Boulangerie de France, 2e IDF Grande Couronne). Identité visuelle soignée, 1 668 abonnés. Positionnement haut de gamme. La question : est-ce que l'Instagram convertit en clients ? Potentiel offre Expérience & désir.",
  },
];

const stmt = db.prepare(`
  UPDATE entreprises
  SET abonnes_insta = ?, instagram_url = ?, angle_accroche = ?, modifie_le = datetime('now')
  WHERE nom = ? AND ville = ?
`);

let ok = 0;
for (const m of mises_a_jour) {
  const r = stmt.run(m.abonnesInsta, m.instagramUrl, m.angleAccroche, m.nom, m.ville);
  if (r.changes) {
    console.log(`✓ ${m.nom}`);
    ok++;
  } else {
    console.log(`✗ ${m.nom} — non trouvé dans le CRM (importe-le d'abord)`);
  }
}
console.log(`\n${ok}/${mises_a_jour.length} fiches mises à jour.`);
db.close();
