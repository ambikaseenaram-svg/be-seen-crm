"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerConnexion } from "@/lib/auth/session";
import {
  creerEntrepriseRapide,
  majConformite,
  majIdentite,
  majScoring,
  marquerOptOut,
  obtenirEntreprise,
  retirerOptOut,
  supprimerEntreprise,
  trouverDoublon,
} from "@/lib/donnees/entreprises";
import {
  erreursParChamp,
  schemaAjoutRapide,
  schemaConformite,
  schemaIdentite,
  schemaOptOut,
  schemaScoring,
  type Erreurs,
} from "@/lib/validation";

export type Resultat =
  | { ok: true; id?: string }
  | { ok: false; erreurs?: Erreurs; message?: string; doublon?: { id: string; nom: string; ville: string } };

const INTROUVABLE: Resultat = { ok: false, message: "Cette fiche n'existe plus." };

function rafraichir() {
  revalidatePath("/", "layout");
}

// Chaque action vérifie la session : une action serveur est appelable directement.
async function executer(fn: () => Resultat): Promise<Resultat> {
  await exigerConnexion();
  try {
    const r = fn();
    if (r.ok) rafraichir();
    return r;
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Une erreur est survenue. Réessaie." };
  }
}

function valider<T extends z.ZodType>(schema: T, donnees: unknown): { ok: true; d: z.infer<T> } | { ok: false; r: Resultat } {
  const p = schema.safeParse(donnees);
  return p.success ? { ok: true, d: p.data } : { ok: false, r: { ok: false, erreurs: erreursParChamp(p.error) } };
}

export async function ajoutRapide(donnees: unknown) {
  return executer(() => {
    const v = valider(schemaAjoutRapide, donnees);
    if (!v.ok) return v.r;
    if (!v.d.forcer) {
      const doublon = trouverDoublon(v.d.nom, v.d.ville);
      if (doublon) return { ok: false, doublon };
    }
    return { ok: true, id: creerEntrepriseRapide(v.d) };
  });
}

export async function modifierIdentite(id: string, donnees: unknown) {
  return executer(() => {
    if (!obtenirEntreprise(id)) return INTROUVABLE;
    const v = valider(schemaIdentite, donnees);
    if (!v.ok) return v.r;
    majIdentite(id, v.d);
    return { ok: true };
  });
}

export async function modifierScoring(id: string, donnees: unknown) {
  return executer(() => {
    if (!obtenirEntreprise(id)) return INTROUVABLE;
    const v = valider(schemaScoring, donnees);
    if (!v.ok) return v.r;
    majScoring(id, v.d);
    return { ok: true };
  });
}

export async function modifierConformite(id: string, donnees: unknown) {
  return executer(() => {
    if (!obtenirEntreprise(id)) return INTROUVABLE;
    const v = valider(schemaConformite, donnees);
    if (!v.ok) return v.r;
    majConformite(id, v.d);
    return { ok: true };
  });
}

export async function poserOptOut(id: string, donnees: unknown) {
  return executer(() => {
    if (!obtenirEntreprise(id)) return INTROUVABLE;
    const v = valider(schemaOptOut, donnees);
    if (!v.ok) return v.r;
    marquerOptOut(id, v.d.date, v.d.canal);
    return { ok: true };
  });
}

export async function enleverOptOut(id: string) {
  return executer(() => {
    if (!obtenirEntreprise(id)) return INTROUVABLE;
    retirerOptOut(id);
    return { ok: true };
  });
}

export async function supprimerDefinitivement(id: string, nomSaisi: string) {
  return executer(() => {
    const e = obtenirEntreprise(id);
    if (!e) return INTROUVABLE;
    if (nomSaisi.trim() !== e.nom) return { ok: false, erreurs: { nom: "Le nom saisi ne correspond pas." } };
    supprimerEntreprise(id);
    return { ok: true };
  });
}
