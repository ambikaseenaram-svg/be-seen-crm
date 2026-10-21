ALTER TABLE `entreprises` ADD `adresse` text;--> statement-breakpoint
ALTER TABLE `entreprises` ADD `siret` text;--> statement-breakpoint
CREATE UNIQUE INDEX `entreprises_siret` ON `entreprises` (`siret`);