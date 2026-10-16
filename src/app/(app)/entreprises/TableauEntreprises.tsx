"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LigneEntreprise } from "@/lib/donnees/entreprises";
import { BadgeDisqualifie, BadgeOptOut, PastillePriorite } from "@/components/Pastilles";

export default function TableauEntreprises({ lignes, ficheId }: { lignes: LigneEntreprise[]; ficheId?: string }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();

  function ouvrir(id: string) {
    const p = new URLSearchParams(params.toString());
    p.set("fiche", id);
    router.push(`${chemin}?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-annotation/20">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-annotation/20 text-xs uppercase tracking-wide text-annotation">
          <tr>
            {["Entreprise", "Ville", "Secteur", "Priorité", "Score", "Étape", "Contact", "Origine"].map((t) => (
              <th key={t} className="px-4 py-3 font-semibold">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((e) => (
            <tr
              key={e.id}
              onClick={() => ouvrir(e.id)}
              className={`cursor-pointer border-b border-annotation/10 last:border-0 hover:bg-creme ${
                e.optOut ? "bg-gray-50 text-gray-400" : "text-titre"
              } ${ficheId === e.id ? "bg-lavande/20" : ""}`}
            >
              <td className="px-4 py-3 font-semibold">
                <span className="mr-2">{e.nom}</span>
                {e.optOut && <BadgeOptOut />}
                {!e.optOut && e.disqualifie && <BadgeDisqualifie />}
              </td>
              <td className="px-4 py-3">{e.ville}</td>
              <td className="px-4 py-3">{e.secteur ?? "—"}</td>
              <td className="px-4 py-3">
                <PastillePriorite priorite={e.priorite} />
              </td>
              <td className="px-4 py-3">{e.score ?? "—"}</td>
              <td className="px-4 py-3">{e.etape ?? "—"}</td>
              <td className="px-4 py-3">{e.contactNom ?? "—"}</td>
              <td className="px-4 py-3">{e.origine}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
