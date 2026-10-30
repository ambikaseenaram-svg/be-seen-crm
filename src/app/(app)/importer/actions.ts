"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerConnexion } from "@/lib/auth/session";
import { analyserFichier, importerLignes, type Analyse } from "@/lib/donnees/import";
import { CHAMPS, TAILLE_MAX_OCTETS } from "@/lib/import";
import { ORIGINES } from "@/lib/listes";

const schemaFichier = z.object({
  texte: z.string().max(TAILLE_MAX_OCTETS, "Fichier trop lourd : coupe-le en plusieurs."),
  origine: z.enum(ORIGINES, { error: "Choisis d'où viennent ces prospects." }),
  correspondance: z.array(z.enum(Object.keys(CHAMPS) as [keyof typeof CHAMPS]).nullable()).max(200).optional(),
});

export async function analyser(donnees: unknown): Promise<Analyse> {
  await exigerConnexion();
  const p = schemaFichier.safeParse(donnees);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Fichier invalide." };
  return analyserFichier(p.data.texte, p.data.origine, p.data.correspondance);
}

export type ResultatImport = { ok: true; importes: number; ignores: number } | { ok: false; message: string };

// Le fichier est relu côté serveur : seules les lignes « ok » de cette nouvelle lecture sont importées.
export async function importer(donnees: unknown): Promise<ResultatImport> {
  await exigerConnexion();
  const p = schemaFichier.safeParse(donnees);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Fichier invalide." };
  const a = analyserFichier(p.data.texte, p.data.origine, p.data.correspondance);
  if (!a.ok) return a;
  if (a.probleme) return { ok: false, message: a.probleme };
  if (a.aImporter === 0) return { ok: false, message: "Aucune ligne à importer." };
  try {
    const importes = importerLignes(a.lignes);
    revalidatePath("/", "layout");
    return { ok: true, importes, ignores: a.lignes.length - importes };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Une erreur est survenue. Rien n'a été importé." };
  }
}
