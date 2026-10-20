"use server";

import { executer } from "@/lib/actions";
import { purger } from "@/lib/donnees/purge";
import { MOT_CONFIRMATION } from "@/lib/purge";

export async function purgerProspects(ids: string[], confirmation: string) {
  return executer(() => {
    if (!Array.isArray(ids) || ids.length === 0) return { ok: false, message: "Aucune fiche sélectionnée." };
    if (ids.length > 1000) return { ok: false, message: "Sélection trop grande : 1 000 fiches maximum à la fois." };
    if (confirmation !== MOT_CONFIRMATION) return { ok: false, erreurs: { confirmation: `Tape ${MOT_CONFIRMATION} pour confirmer.` } };
    const { supprimees } = purger(ids.map(String));
    return supprimees > 0 ? { ok: true } : { ok: false, message: "Ces fiches ne sont plus éligibles à la purge : rien n'a été supprimé." };
  });
}
