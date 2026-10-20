// npm run demo:remplir → ajoute des prospects FICTIFS pour tester (préfixe « [DÉMO] »)
// npm run demo:vider   → supprime uniquement ces fiches fictives
import { eq, like } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { affaires, entreprises, interactions } from "../src/db/schema.ts";
import { calculerScoring } from "../src/lib/scoring.ts";

const PREFIXE = "[DÉMO] ";
const jour = (decalage: number) => {
  const d = new Date();
  d.setDate(d.getDate() - decalage);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
};

// Noms, personnes et coordonnées inventés. Numéros en 01 99 (plage réservée à la fiction).
type Demo = {
  nom: string; ville: string; dep: "77" | "94"; secteur: (typeof entreprises.$inferInsert)["secteur"];
  origine: (typeof entreprises.$inferInsert)["origine"]; notes?: [number, number, number, number, number];
  contact?: string; trajet?: number; optOut?: boolean; angle?: string;
  affaire?: Partial<typeof affaires.$inferInsert>; // étape et détails de l'affaire de démonstration
  journal?: [number, (typeof interactions.$inferInsert)["type"], (typeof interactions.$inferInsert)["canal"], (typeof interactions.$inferInsert)["resultat"], string?][]; // [il y a N jours, type, canal, résultat, note]
};
const DEMO: Demo[] = [
  { nom: "Le Comptoir des Saisons", ville: "Villiers-sur-Marne", dep: "94", secteur: "Restaurant", origine: "Passage physique", notes: [3, 5, 3, 2, 4], contact: "Paul Exemple", trajet: 20, angle: "Cheffe autodidacte, carte qui change chaque semaine", affaire: { etape: "RDV fait", prochaineAction: "Envoyer la proposition", dateProchaineAction: jour(-2), decideurIdentifie: true }, journal: [[6, "Premier contact", "Passage", "Réponse positive", "Accueil chaleureux, cheffe disponible"], [2, "RDV", "Passage", "RDV obtenu", "RDV fait en salle, intéressée par un accompagnement"]] },
  { nom: "Fromagerie de la Brie", ville: "Meaux", dep: "77", secteur: "Commerce de bouche", origine: "Passage physique", notes: [2, 5, 2, 2, 5], contact: "Marie Fictive", trajet: 35, angle: "Affineur depuis 3 générations, aucun Reel", affaire: { etape: "Échange engagé", prochaineAction: "Relancer par téléphone", dateProchaineAction: jour(1) }, journal: [[4, "Premier contact", "Téléphone", "Pas de réponse"], [1, "Relance", "Téléphone", "Réponse positive", "Rappeler jeudi"]] },
  { nom: "Boulangerie du Canal", ville: "Torcy", dep: "77", secteur: "Commerce de bouche", origine: "Google Maps", notes: [3, 5, 2, 2, 3], trajet: 15 },
  { nom: "Bistrot Imaginaire", ville: "Serris", dep: "77", secteur: "Restaurant", origine: "Instagram", notes: [5, 5, 5, 3, 0], trajet: 10, affaire: { etape: "Contacté / Visité", prochaineAction: "Envoyer un DM de suivi", dateProchaineAction: jour(-1) }, journal: [[3, "Premier contact", "DM Instagram", "Pas de réponse"]] },
  { nom: "Atelier Céramique Test", ville: "Bussy-Saint-Georges", dep: "77", secteur: "Artisan/BTP", origine: "LinkedIn", notes: [1, 3, 2, 2, 3], trajet: 15, affaire: { prochaineAction: "Repasser voir le gérant", dateProchaineAction: jour(5) } },
  { nom: "Cave à Vins Fictive", ville: "Champigny-sur-Marne", dep: "94", secteur: "Commerce de bouche", origine: "Passage physique", trajet: 25, affaire: { etape: "Proposition envoyée", prochaineAction: "Appeler pour la décision", dateProchaineAction: jour(-3), offre: "Expérience", montantMensuel: 2200, dureeMois: 6, valeurTotale: 13200, dateProposition: jour(4), budgetValide: true, decideurIdentifie: true } },
  { nom: "Épicerie Fine Exemple", ville: "Le Perreux-sur-Marne", dep: "94", secteur: "Commerce de bouche", origine: "Recommandation", trajet: 30, affaire: { prochaineAction: "Appeler le gérant", dateProchaineAction: jour(0) } },
  { nom: "Pizzeria Démo", ville: "Chelles", dep: "77", secteur: "Restaurant", origine: "Passage physique", notes: [3, 5, 3, 2, 4], optOut: true },
];

const action = process.argv[2];
if (action === "vider") {
  const n = db.delete(entreprises).where(like(entreprises.nom, `${PREFIXE}%`)).run().changes;
  console.log(`✓ ${n} fiche(s) fictive(s) supprimée(s).`);
} else if (action === "remplir") {
  if (db.select().from(entreprises).where(like(entreprises.nom, `${PREFIXE}%`)).all().length) {
    console.log("Les fiches fictives sont déjà là. Lance « npm run demo:vider » d'abord pour repartir de zéro.");
  } else {
    DEMO.forEach((d, i) => {
      const notes = d.notes ? { c1: d.notes[0], c2: d.notes[1], c3: d.notes[2], c4: d.notes[3], c5: d.notes[4] } : {};
      const scoring = d.notes ? { ...calculerScoring(notes as never), dateScoring: jour(1) } : {};
      const { id } = db
        .insert(entreprises)
        .values({
          nom: PREFIXE + d.nom, ville: d.ville, departement: d.dep, secteur: d.secteur, origine: d.origine,
          dateCollecte: jour(i + 2), contactNom: d.contact, trajetMin: d.trajet, angleAccroche: d.angle,
          ...notes, ...scoring,
          ...(d.optOut ? { optOut: true, dateOptOut: jour(1), canalOptOut: "Oral" as const } : {}),
        })
        .returning({ id: entreprises.id })
        .get();
      const affaire = db.insert(affaires).values({ entrepriseId: id, etape: d.notes ? "Qualifié" : "Repéré", dateEtape: jour(1), ...d.affaire }).returning({ id: affaires.id }).get();
      for (const [il, type, canal, resultat, note] of d.journal ?? []) {
        db.insert(interactions).values({ entrepriseId: id, affaireId: affaire.id, date: jour(il), type, canal, resultat, note }).run();
      }
      if (d.journal?.length) db.update(entreprises).set({ derniereInteraction: jour(Math.min(...d.journal.map((j) => j[0]))) }).where(eq(entreprises.id, id)).run();
    });
    console.log(`✓ ${DEMO.length} fiches fictives ajoutées (préfixe « ${PREFIXE.trim()} »).`);
  }
} else {
  console.error("Action inconnue. Utilise « remplir » ou « vider ».");
  process.exitCode = 1;
}
