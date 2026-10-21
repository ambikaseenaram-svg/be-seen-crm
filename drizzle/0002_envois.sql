CREATE TABLE `envois` (
	`id` text PRIMARY KEY NOT NULL,
	`entreprise_id` text NOT NULL,
	`modele` text NOT NULL,
	`destinataire` text NOT NULL,
	`objet` text NOT NULL,
	`corps` text NOT NULL,
	`origine_coordonnees` text NOT NULL,
	`statut` text NOT NULL,
	`raison` text,
	`envoye_le` text,
	`cree_le` text NOT NULL,
	`modifie_le` text NOT NULL,
	FOREIGN KEY (`entreprise_id`) REFERENCES `entreprises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `envois_entreprise` ON `envois` (`entreprise_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `envois_un_brouillon` ON `envois` (`entreprise_id`) WHERE statut = 'Brouillon';--> statement-breakpoint
CREATE UNIQUE INDEX `envois_jamais_deux_fois` ON `envois` (`entreprise_id`,`modele`) WHERE statut in ('En cours', 'Envoyé');