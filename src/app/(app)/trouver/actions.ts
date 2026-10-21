"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerConnexion } from "@/lib/auth/session";
import { rechercherCommerces, type ResultatRecherche } from "@/lib/donnees/annuaire";
import { ajouterCommerces } from "@/lib/donnees/commerces";
import { schemaCommerces } from "@/lib/validation";

const schemaRecherche = z.object({ lieu: z.string().max(80), type: z.string().max(40) });

export async function chercherCommerces(donnees: unknown): Promise<ResultatRecherche> {
  await exigerConnexion();
  const p = schemaRecherche.safeParse(donnees);
  if (!p.success) return { ok: false, message: "Recherche invalide." };
  return rechercherCommerces(p.data.lieu, p.data.type);
}

export type ResultatAjout = { ok: true; ajoutes: number; ignores: number } | { ok: false; message: string };

export async function ajouterAuCrm(donnees: unknown): Promise<ResultatAjout> {
  await exigerConnexion();
  const p = schemaCommerces.safeParse(donnees);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Sélection invalide." };
  try {
    const r = ajouterCommerces(p.data);
    revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Une erreur est survenue. Rien n'a été ajouté." };
  }
}
