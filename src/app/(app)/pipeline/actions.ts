"use server";

import { INTROUVABLE, executer, valider } from "@/lib/actions";
import { changerEtape, majAffaire, obtenirAffaire, ouvrirNouvelleAffaire } from "@/lib/donnees/affaires";
import { obtenirEntreprise } from "@/lib/donnees/entreprises";
import { schemaAffaire, schemaChangementEtape } from "@/lib/validation";

export async function modifierAffaire(id: string, donnees: unknown) {
  return executer(() => {
    const a = obtenirAffaire(id);
    if (!a) return INTROUVABLE;
    const v = valider(schemaAffaire, donnees);
    if (!v.ok) return v.r;
    majAffaire(id, v.d);
    return { ok: true };
  });
}

export async function deplacerAffaire(id: string, donnees: unknown) {
  return executer(() => {
    const v = valider(schemaChangementEtape, donnees);
    if (!v.ok) return v.r;
    const r = changerEtape(id, v.d);
    return r.ok ? { ok: true } : { ok: false, erreurs: r.erreurs };
  });
}

export async function nouvelleAffaire(entrepriseId: string) {
  return executer(() => {
    const e = obtenirEntreprise(entrepriseId);
    if (!e) return INTROUVABLE;
    if (e.optOut) return { ok: false, message: "Cette entreprise a demandé à ne plus être contactée." };
    return ouvrirNouvelleAffaire(entrepriseId) ? { ok: true } : { ok: false, message: "Une affaire est déjà ouverte." };
  });
}
