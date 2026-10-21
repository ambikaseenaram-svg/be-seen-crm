import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  SECTEURS,
  DEPARTEMENTS,
  MODES_COLLAB,
  ROLES_CONTACT,
  CANAUX_PREFERES,
  PRIORITES,
  ORIGINES,
  TYPES_COORDONNEES,
  CANAUX_OPT_OUT,
  ETAPES,
  OFFRES,
  MOTIFS_PERTE,
  TYPES_INTERACTION,
  CANAUX_INTERACTION,
  RESULTATS_INTERACTION,
  MODELES_EMAIL,
  STATUTS_ENVOI,
} from "@/lib/listes";

// Dates : texte ISO « AAAA-MM-JJ ». Horodatages : texte ISO complet.
const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const horodatage = (nom: string) => text(nom).notNull().$defaultFn(() => new Date().toISOString());
const oui_non = (nom: string) => integer(nom, { mode: "boolean" }).notNull().default(false);

export const utilisateurs = sqliteTable("utilisateurs", {
  id: id(),
  email: text("email").notNull().unique(),
  motDePasseHash: text("mot_de_passe_hash").notNull(),
  // Change à chaque nouveau mot de passe : invalide les anciennes sessions.
  versionSession: integer("version_session").notNull().default(1),
  creeLe: horodatage("cree_le"),
});

// Table 1 — Entreprises (prospects et clients)
export const entreprises = sqliteTable(
  "entreprises",
  {
    id: id(),
    nom: text("nom").notNull(),
    secteur: text("secteur", { enum: SECTEURS }),
    ville: text("ville").notNull(),
    adresse: text("adresse"),
    siret: text("siret"), // 14 chiffres, renseigné par « Trouver des commerces » ; unique quand il existe
    departement: text("departement", { enum: DEPARTEMENTS }),
    modeCollab: text("mode_collab", { enum: MODES_COLLAB }),
    contactNom: text("contact_nom"),
    contactRole: text("contact_role", { enum: ROLES_CONTACT }),
    telephone: text("telephone"),
    email: text("email"),
    instagramUrl: text("instagram_url"),
    canalPrefere: text("canal_prefere", { enum: CANAUX_PREFERES }),
    angleAccroche: text("angle_accroche"),

    // Scoring (notes 0 à 5 ; score, priorité et disqualification sont calculés par l'application)
    c1: integer("c1"),
    c2: integer("c2"),
    c3: integer("c3"),
    c4: integer("c4"),
    c5: integer("c5"),
    score: integer("score"),
    priorite: text("priorite", { enum: PRIORITES }),
    disqualifie: oui_non("disqualifie"),
    dateScoring: text("date_scoring"),

    trajetMin: integer("trajet_min"),
    creneau: text("creneau"),
    siteUrl: text("site_url"),
    abonnesInsta: integer("abonnes_insta"),
    recommandePar: text("recommande_par"),

    // Conformité
    origine: text("origine", { enum: ORIGINES }).notNull(),
    dateCollecte: text("date_collecte").notNull(),
    typeCoordonnees: text("type_coordonnees", { enum: TYPES_COORDONNEES }),
    infoRgpd: oui_non("info_rgpd"),
    optOut: oui_non("opt_out"),
    dateOptOut: text("date_opt_out"),
    canalOptOut: text("canal_opt_out", { enum: CANAUX_OPT_OUT }),
    derniereInteraction: text("derniere_interaction"),

    creeLe: horodatage("cree_le"),
    modifieLe: horodatage("modifie_le"),
  },
  (t) => [index("entreprises_nom_ville").on(t.nom, t.ville), uniqueIndex("entreprises_siret").on(t.siret)],
);

// Table 2 — Affaires (une seule ouverte à la fois par entreprise, contrôlé par l'application)
export const affaires = sqliteTable(
  "affaires",
  {
    id: id(),
    entrepriseId: text("entreprise_id")
      .notNull()
      .references(() => entreprises.id, { onDelete: "cascade" }),
    etape: text("etape", { enum: ETAPES }).notNull(),
    dateEtape: text("date_etape").notNull(),
    prochaineAction: text("prochaine_action"),
    dateProchaineAction: text("date_prochaine_action"),
    budgetValide: oui_non("budget_valide"),
    decideurIdentifie: oui_non("decideur_identifie"),
    offre: text("offre", { enum: OFFRES }),
    montantMensuel: integer("montant_mensuel"),
    dureeMois: integer("duree_mois"),
    valeurTotale: integer("valeur_totale"),
    tarifHistorique: oui_non("tarif_historique"),
    motifPerte: text("motif_perte", { enum: MOTIFS_PERTE }),
    dateProposition: text("date_proposition"),
    dateSignature: text("date_signature"),
    notesRdv: text("notes_rdv"),
    creeLe: horodatage("cree_le"),
    modifieLe: horodatage("modifie_le"),
  },
  (t) => [index("affaires_entreprise").on(t.entrepriseId), index("affaires_etape").on(t.etape)],
);

// Table 3 — Interactions (journal)
export const interactions = sqliteTable(
  "interactions",
  {
    id: id(),
    entrepriseId: text("entreprise_id")
      .notNull()
      .references(() => entreprises.id, { onDelete: "cascade" }),
    affaireId: text("affaire_id").references(() => affaires.id, { onDelete: "set null" }),
    date: text("date").notNull(),
    type: text("type", { enum: TYPES_INTERACTION }).notNull(),
    canal: text("canal", { enum: CANAUX_INTERACTION }).notNull(),
    resultat: text("resultat", { enum: RESULTATS_INTERACTION }).notNull(),
    // Ajout validé : distinguer « décideur rencontré » sur le terrain.
    decideurRencontre: oui_non("decideur_rencontre"),
    note: text("note"),
    creeLe: horodatage("cree_le"),
  },
  (t) => [index("interactions_entreprise").on(t.entrepriseId), index("interactions_date").on(t.date)],
);

// Table 4 — Envois d'emails (brouillons et journal des envois)
export const envois = sqliteTable(
  "envois",
  {
    id: id(),
    entrepriseId: text("entreprise_id")
      .notNull()
      .references(() => entreprises.id, { onDelete: "cascade" }),
    modele: text("modele", { enum: MODELES_EMAIL }).notNull(),
    destinataire: text("destinataire").notNull(), // copiée telle quelle depuis la fiche, jamais devinée
    objet: text("objet").notNull(),
    corps: text("corps").notNull(),
    origineCoordonnees: text("origine_coordonnees").notNull(),
    statut: text("statut", { enum: STATUTS_ENVOI }).notNull(),
    raison: text("raison"), // motif d'exclusion ou erreur du serveur mail
    envoyeLe: text("envoye_le"), // horodatage de la tentative d'envoi
    creeLe: horodatage("cree_le"),
    modifieLe: horodatage("modifie_le"),
  },
  (t) => [
    index("envois_entreprise").on(t.entrepriseId),
    // Garde-fous en base : un seul brouillon par prospect, et jamais deux fois le même email au même prospect.
    uniqueIndex("envois_un_brouillon").on(t.entrepriseId).where(sql`statut = 'Brouillon'`),
    uniqueIndex("envois_jamais_deux_fois").on(t.entrepriseId, t.modele).where(sql`statut in ('En cours', 'Envoyé')`),
  ],
);

export type Utilisateur = typeof utilisateurs.$inferSelect;
export type Entreprise = typeof entreprises.$inferSelect;
export type Affaire = typeof affaires.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Envoi = typeof envois.$inferSelect;
