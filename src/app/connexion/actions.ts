"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { verifierMotDePasse } from "@/lib/auth/mot-de-passe";
import { fermerSession, ouvrirSession } from "@/lib/auth/session";

export type EtatConnexion = { erreur?: string; email?: string };

const schemaConnexion = z.object({
  email: z.string().trim().toLowerCase().min(1),
  motDePasse: z.string().min(1),
  retour: z.string().optional(),
});

// N'accepte qu'un chemin interne (« /pipeline »), jamais une autre adresse.
function retourSur(retour: string | undefined) {
  return retour && retour.startsWith("/") && !retour.startsWith("//") ? retour : "/";
}

export async function seConnecter(_etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const donnees = schemaConnexion.safeParse({
    email: formData.get("email"),
    motDePasse: formData.get("motDePasse"),
    retour: formData.get("retour") ?? undefined,
  });
  if (!donnees.success) return { erreur: "Ce champ est obligatoire." };

  const { email, motDePasse, retour } = donnees.data;
  const u = db.select().from(utilisateurs).where(eq(utilisateurs.email, email)).get();
  const valide = u ? await verifierMotDePasse(motDePasse, u.motDePasseHash) : false;
  if (!u || !valide) {
    await new Promise((r) => setTimeout(r, 600)); // freine les essais en série
    return { erreur: "Email ou mot de passe incorrect.", email };
  }

  await ouvrirSession(u.id, u.versionSession);
  redirect(retourSur(retour));
}

export async function seDeconnecter() {
  await fermerSession();
  redirect("/connexion");
}
