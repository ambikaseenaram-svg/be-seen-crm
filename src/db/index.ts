import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export const CHEMIN_BASE = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "be-seen.db");

function ouvrir() {
  fs.mkdirSync(path.dirname(CHEMIN_BASE), { recursive: true });
  const sqlite = new Database(CHEMIN_BASE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

// Une seule connexion, même quand Next.js recharge les modules en développement.
const globale = globalThis as unknown as { __db?: ReturnType<typeof ouvrir> };
export const db = globale.__db ?? (globale.__db = ouvrir());
