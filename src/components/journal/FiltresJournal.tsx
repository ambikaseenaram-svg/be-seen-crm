"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RESULTATS_INTERACTION, TYPES_INTERACTION } from "@/lib/listes";

export default function FiltresJournal() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();

  function changer(cle: string, valeur: string) {
    const p = new URLSearchParams(params.toString());
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    router.replace(p.toString() ? `${chemin}?${p.toString()}` : chemin, { scroll: false });
  }

  const select = (cle: string, libelle: string, valeurs: readonly string[]) => (
    <select aria-label={libelle} value={params.get(cle) ?? ""} onChange={(ev) => changer(cle, ev.target.value)} className="champ !w-auto">
      <option value="">{libelle}</option>
      {valeurs.map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {select("type", "Tous les types", TYPES_INTERACTION)}
      {select("resultat", "Tous les résultats", RESULTATS_INTERACTION)}
    </div>
  );
}
