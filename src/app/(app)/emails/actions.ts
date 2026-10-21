"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerConnexion } from "@/lib/auth/session";
import { aujourdhui } from "@/lib/dates";
import { MAX_PAR_LOT } from "@/lib/emails";
import { envoyerLot, modifierBrouillon, preparerBrouillons, retirerBrouillon, type BilanEnvoi, type Preparation } from "@/lib/donnees/emails";
import { marquerOptOut, obtenirEntreprise } from "@/lib/donnees/entreprises";
import { envoyerMessage, lireMessagerie } from "@/lib/donnees/messagerie";

const ids = z.array(z.string().min(1).max(64)).max(200);
const schemaBrouillon = z.object({
  objet: z.string().trim().min(1, "Objet vide.").max(200),
  corps: z.string().trim().min(1, "Message vide.").max(5000),
  origineCoordonnees: z.string().trim().min(1, "Indique l'origine des coordonnées.").max(300),
});

type Simple = { ok: true } | { ok: false; message: string };
const ERREUR = { ok: false as const, message: "Une erreur est survenue. Réessaie." };

export async function preparer(donnees: unknown): Promise<(Preparation & { ok: true }) | { ok: false; message: string }> {
  await exigerConnexion();
  const p = ids.min(1, "Sélectionne au moins un prospect.").max(MAX_PAR_LOT, `${MAX_PAR_LOT} prospects au plus par lot.`).safeParse(donnees);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Sélection invalide." };
  const m = lireMessagerie();
  if ("manquants" in m) return { ok: false, message: "Configure d'abord ta boîte mail (page « Contacter les prospects »)." };
  try {
    const r = preparerBrouillons(p.data, m.nom);
    revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    console.error(e);
    return ERREUR;
  }
}

export async function enregistrer(id: string, donnees: unknown): Promise<Simple> {
  await exigerConnexion();
  const p = schemaBrouillon.safeParse(donnees);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Brouillon invalide." };
  if (!modifierBrouillon(id, p.data)) return { ok: false, message: "Ce brouillon n'existe plus." };
  revalidatePath("/emails");
  return { ok: true };
}

export async function retirer(id: string): Promise<Simple> {
  await exigerConnexion();
  retirerBrouillon(id);
  revalidatePath("/", "layout");
  return { ok: true };
}

// Seul chemin vers un envoi : la liste exacte des brouillons relus, et ta validation explicite.
export async function validerEtEnvoyer(donnees: unknown): Promise<BilanEnvoi> {
  await exigerConnexion();
  const p = z.object({ ids: ids.min(1), valide: z.literal(true) }).safeParse(donnees);
  if (!p.success) return { ok: false, message: "Coche la case de validation du lot avant d'envoyer." };
  const m = lireMessagerie();
  if ("manquants" in m) return { ok: false, message: "Boîte mail non configurée : rien n'a été envoyé." };
  try {
    const r = await envoyerLot(p.data.ids, m, { envoyer: envoyerMessage });
    revalidatePath("/", "layout");
    return r;
  } catch (e) {
    console.error(e);
    revalidatePath("/", "layout");
    return { ok: false, message: "Une erreur a interrompu l'envoi. Consulte le journal des envois avant de recommencer." };
  }
}

// Réponse « STOP » reçue : opposition enregistrée sur la fiche, plus aucun envoi.
export async function stopRecu(entrepriseId: string): Promise<Simple> {
  await exigerConnexion();
  if (!obtenirEntreprise(entrepriseId)) return { ok: false, message: "Cette fiche n'existe plus." };
  marquerOptOut(entrepriseId, aujourdhui(), "Email");
  revalidatePath("/", "layout");
  return { ok: true };
}
