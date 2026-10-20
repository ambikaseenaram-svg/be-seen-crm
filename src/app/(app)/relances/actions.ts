"use server";

import { executer, valider } from "@/lib/actions";
import { planifierAction } from "@/lib/donnees/relances";
import { schemaPlanification } from "@/lib/validation";

export async function planifier(affaireId: string, donnees: unknown) {
  return executer(() => {
    const v = valider(schemaPlanification, donnees);
    if (!v.ok) return v.r;
    const r = planifierAction(affaireId, v.d);
    return r.ok ? { ok: true } : { ok: false, message: r.message };
  });
}
