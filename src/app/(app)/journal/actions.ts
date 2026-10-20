"use server";

import { executer, valider } from "@/lib/actions";
import { creerInteraction, modifierInteraction, supprimerInteraction, type ResultatInteraction } from "@/lib/donnees/interactions";
import { schemaInteraction } from "@/lib/validation";

const versResultat = (r: ResultatInteraction) => (r.ok ? ({ ok: true } as const) : ({ ok: false, message: r.message } as const));

export async function ajouterInteraction(entrepriseId: string, donnees: unknown) {
  return executer(() => {
    const v = valider(schemaInteraction, donnees);
    if (!v.ok) return v.r;
    return versResultat(creerInteraction(entrepriseId, v.d));
  });
}

export async function changerInteraction(id: string, donnees: unknown) {
  return executer(() => {
    const v = valider(schemaInteraction, donnees);
    if (!v.ok) return v.r;
    return versResultat(modifierInteraction(id, v.d));
  });
}

export async function retirerInteraction(id: string) {
  return executer(() => versResultat(supprimerInteraction(id)));
}
