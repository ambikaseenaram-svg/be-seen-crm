// npm run installer : crée le fichier .env.local (secret de session) s'il manque, puis met la base à jour.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const fichierEnv = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(fichierEnv)) {
  fs.writeFileSync(fichierEnv, `SESSION_SECRET=${crypto.randomBytes(32).toString("hex")}\n`);
  console.log("✓ Fichier .env.local créé avec un secret de session.");
}

const { db, CHEMIN_BASE } = await import("../src/db/index.ts");
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
console.log(`✓ Base de données à jour : ${CHEMIN_BASE}`);
