import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { DUREE_SESSION_S, NOM_COOKIE, lireJeton, signerJeton } from "./jeton";

export async function ouvrirSession(uid: string, version: number) {
  const jeton = await signerJeton({ uid, v: version });
  (await cookies()).set(NOM_COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SESSION_S,
  });
}

export async function fermerSession() {
  (await cookies()).delete(NOM_COOKIE);
}

// Utilisatrice connectée, ou null. Vérifie aussi que le mot de passe n'a pas changé depuis la connexion.
export async function utilisatriceConnectee() {
  const contenu = await lireJeton((await cookies()).get(NOM_COOKIE)?.value);
  if (!contenu) return null;
  const u = db.select().from(utilisateurs).where(eq(utilisateurs.id, contenu.uid)).get();
  if (!u || u.versionSession !== contenu.v) return null;
  return { id: u.id, email: u.email };
}

export async function exigerConnexion() {
  const u = await utilisatriceConnectee();
  if (!u) redirect("/deconnexion");
  return u;
}
