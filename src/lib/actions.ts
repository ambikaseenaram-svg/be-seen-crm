// Outils communs aux actions serveur (sans directive « use server » : appelés depuis elles).
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { exigerConnexion } from "@/lib/auth/session";
import { erreursParChamp, type Erreurs } from "@/lib/validation";

export type Resultat =
  | { ok: true; id?: string }
  | { ok: false; erreurs?: Erreurs; message?: string; doublon?: { id: string; nom: string; ville: string } };

export const INTROUVABLE: Resultat = { ok: false, message: "Cette fiche n'existe plus." };

// Chaque action vérifie la session : une action serveur est appelable directement.
export async function executer(fn: () => Resultat): Promise<Resultat> {
  await exigerConnexion();
  try {
    const r = fn();
    if (r.ok) revalidatePath("/", "layout");
    return r;
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Une erreur est survenue. Réessaie." };
  }
}

export function valider<T extends z.ZodType>(schema: T, donnees: unknown): { ok: true; d: z.infer<T> } | { ok: false; r: Resultat } {
  const p = schema.safeParse(donnees);
  return p.success ? { ok: true, d: p.data } : { ok: false, r: { ok: false, erreurs: erreursParChamp(p.error) } };
}
