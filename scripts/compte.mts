// npm run compte:creer  → crée le compte unique (refusé si un compte existe déjà)
// npm run compte:mdp    → change le mot de passe (remplace « Mot de passe oublié » sans envoi d'email)
import readline from "node:readline";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { utilisateurs } from "../src/db/schema.ts";
import { hacherMotDePasse, MOT_DE_PASSE_MIN } from "../src/lib/auth/mot-de-passe.ts";

// Une seule interface de saisie pour tout le script.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
const sortie = rl as unknown as { _writeToOutput: (s: string) => void };
const ecrireNormal = sortie._writeToOutput.bind(rl);
let masque = false;
// En mode masqué, les caractères tapés ne s'affichent pas.
sortie._writeToOutput = (s: string) => {
  if (!masque) ecrireNormal(s);
};

// L'itérateur garde en file les lignes déjà tapées (ou collées d'un coup).
const lignes = rl[Symbol.asyncIterator]();

async function demander(question: string, masquer = false): Promise<string> {
  process.stdout.write(question);
  masque = masquer;
  const { value, done } = await lignes.next();
  masque = false;
  if (masquer) process.stdout.write("\n");
  if (done) throw new Error("Saisie interrompue.");
  return String(value).trim();
}

async function demanderMotDePasse() {
  const mdp = await demander(`Mot de passe (${MOT_DE_PASSE_MIN} caractères minimum) : `, true);
  if (mdp.length < MOT_DE_PASSE_MIN) throw new Error(`Mot de passe trop court (${MOT_DE_PASSE_MIN} caractères minimum).`);
  const confirmation = await demander("Confirme le mot de passe : ", true);
  if (mdp !== confirmation) throw new Error("Les deux mots de passe ne correspondent pas.");
  return mdp;
}

async function creer() {
  const [{ total }] = db.select({ total: sql<number>`count(*)` }).from(utilisateurs).all();
  if (total > 0) throw new Error("Un compte existe déjà. L'inscription est fermée. Utilise « npm run compte:mdp ».");
  const email = (await demander("Email : ")).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Adresse email invalide.");
  const motDePasseHash = await hacherMotDePasse(await demanderMotDePasse());
  db.insert(utilisateurs).values({ email, motDePasseHash }).run();
  console.log(`✓ Compte créé pour ${email}.`);
}

async function changerMotDePasse() {
  const email = (await demander("Email du compte : ")).toLowerCase();
  const utilisateur = db.select().from(utilisateurs).where(eq(utilisateurs.email, email)).get();
  if (!utilisateur) throw new Error("Aucun compte avec cet email.");
  const motDePasseHash = await hacherMotDePasse(await demanderMotDePasse());
  db.update(utilisateurs)
    .set({ motDePasseHash, versionSession: utilisateur.versionSession + 1 })
    .where(eq(utilisateurs.id, utilisateur.id))
    .run();
  console.log("✓ Mot de passe changé. Les sessions ouvertes sont déconnectées.");
}

const action = process.argv[2];
try {
  if (action === "creer") await creer();
  else if (action === "mdp") await changerMotDePasse();
  else throw new Error("Action inconnue. Utilise « creer » ou « mdp ».");
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
