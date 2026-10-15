CREATE TABLE `affaires` (
	`id` text PRIMARY KEY NOT NULL,
	`entreprise_id` text NOT NULL,
	`etape` text NOT NULL,
	`date_etape` text NOT NULL,
	`prochaine_action` text,
	`date_prochaine_action` text,
	`budget_valide` integer DEFAULT false NOT NULL,
	`decideur_identifie` integer DEFAULT false NOT NULL,
	`offre` text,
	`montant_mensuel` integer,
	`duree_mois` integer,
	`valeur_totale` integer,
	`tarif_historique` integer DEFAULT false NOT NULL,
	`motif_perte` text,
	`date_proposition` text,
	`date_signature` text,
	`notes_rdv` text,
	`cree_le` text NOT NULL,
	`modifie_le` text NOT NULL,
	FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `affaires_entreprise` ON `affaires` (`entreprise_id`);--> statement-breakpoint
CREATE INDEX `affaires_etape` ON `affaires` (`etape`);--> statement-breakpoint
CREATE TABLE `entreprises` (
	`id` text PRIMARY KEY NOT NULL,
	`nom` text NOT NULL,
	`secteur` text,
	`ville` text NOT NULL,
	`departement` text,
	`mode_collab` text,
	`contact_nom` text,
	`contact_role` text,
	`telephone` text,
	`email` text,
	`instagram_url` text,
	`canal_prefere` text,
	`angle_accroche` text,
	`c1` integer,
	`c2` integer,
	`c3` integer,
	`c4` integer,
	`c5` integer,
	`score` integer,
	`priorite` text,
	`disqualifie` integer DEFAULT false NOT NULL,
	`date_scoring` text,
	`trajet_min` integer,
	`creneau` text,
	`site_url` text,
	`abonnes_insta` integer,
	`recommande_par` text,
	`origine` text NOT NULL,
	`date_collecte` text NOT NULL,
	`type_coordonnees` text,
	`info_rgpd` integer DEFAULT false NOT NULL,
	`opt_out` integer DEFAULT false NOT NULL,
	`date_opt_out` text,
	`canal_opt_out` text,
	`derniere_interaction` text,
	`cree_le` text NOT NULL,
	`modifie_le` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entreprises_nom_ville` ON `entreprises` (`nom`,`ville`);--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`entreprise_id` text NOT NULL,
	`affaire_id` text,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`canal` text NOT NULL,
	`resultat` text NOT NULL,
	`decideur_rencontre` integer DEFAULT false NOT NULL,
	`note` text,
	`cree_le` text NOT NULL,
	FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`affaire_id`) REFERENCES `affaires`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `interactions_entreprise` ON `interactions` (`entreprise_id`);--> statement-breakpoint
CREATE INDEX `interactions_date` ON `interactions` (`date`);--> statement-breakpoint
CREATE TABLE `utilisateurs` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`mot_de_passe_hash` text NOT NULL,
	`version_session` integer DEFAULT 1 NOT NULL,
	`cree_le` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `utilisateurs_email_unique` ON `utilisateurs` (`email`);