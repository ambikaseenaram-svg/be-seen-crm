"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ActionAFaire, LigneJournal } from "@/lib/donnees/interactions";
import { formaterDate } from "@/lib/dates";

function useOuvrirFiche() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  return (id: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("fiche", id);
    router.push(`${chemin}?${p.toString()}`, { scroll: false });
  };
}

export function ActionsAFaire({ actions }: { actions: ActionAFaire[] }) {
  const ouvrir = useOuvrirFiche();
  if (actions.length === 0) return <p className="text-sm text-annotation">Rien d&apos;échu : toutes les prochaines actions sont à venir ou à définir.</p>;
  return (
    <ul className="divide-y divide-annotation/15">
      {actions.map((a) => (
        <li key={a.entrepriseId} className="py-2">
          <button type="button" onClick={() => ouvrir(a.entrepriseId)} className="flex w-full items-baseline gap-3 text-left text-sm text-titre hover:text-violet">
            <span className={`w-28 shrink-0 text-xs ${a.enRetard ? "font-semibold text-[#b0389f]" : "text-annotation"}`}>
              {a.enRetard ? `${formaterDate(a.date)} · retard` : "Aujourd'hui"}
            </span>
            <span className="font-semibold">{a.nom}</span>
            <span className="text-annotation">{a.prochaineAction ?? "Action à définir"} · {a.etape}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TableauJournal({ lignes }: { lignes: LigneJournal[] }) {
  const ouvrir = useOuvrirFiche();
  return (
    <table className="w-full text-sm text-titre">
      <thead>
        <tr className="border-b border-annotation/30 text-left text-xs text-annotation">
          {["Date", "Entreprise", "Type", "Canal", "Résultat", "Note"].map((t) => (
            <th key={t} className="py-2 pr-3 font-medium">{t}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((l) => (
          <tr key={l.id} onClick={() => ouvrir(l.entrepriseId)} className="cursor-pointer border-b border-annotation/15 hover:bg-lavande/20">
            <td className="py-2 pr-3 whitespace-nowrap">{formaterDate(l.date)}</td>
            <td className="py-2 pr-3 font-semibold">{l.entrepriseNom}<span className="block text-xs font-normal text-annotation">{l.entrepriseVille}</span></td>
            <td className="py-2 pr-3">{l.type}</td>
            <td className="py-2 pr-3">{l.canal}</td>
            <td className="py-2 pr-3">{l.resultat}</td>
            <td className="max-w-xs truncate py-2 text-annotation">{l.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
