"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LigneEntreprise } from "@/lib/donnees/entreprises";
import { MAX_PAR_LOT, type Eligibilite } from "@/lib/emails";
import { preparer } from "@/app/(app)/emails/actions";
import { BadgeDisqualifie, BadgeOptOut, PastillePriorite } from "@/components/Pastilles";
import { useApp } from "@/components/Fournisseur";

export default function TableauEntreprises({
  lignes,
  ficheId,
  eligibles,
}: {
  lignes: LigneEntreprise[];
  ficheId?: string;
  eligibles: Record<string, Eligibilite>;
}) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const { notifier } = useApp();
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [enCours, demarrer] = useTransition();

  const selectionnables = lignes.filter((e) => eligibles[e.id]?.ok).map((e) => e.id);
  const toutChoisi = selectionnables.length > 0 && selectionnables.slice(0, MAX_PAR_LOT).every((id) => choisis.has(id));

  function bascule(id: string) {
    setMessage("");
    setChoisis((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < MAX_PAR_LOT) n.add(id);
      else setMessage(`${MAX_PAR_LOT} prospects au plus par lot.`);
      return n;
    });
  }

  // Crée les brouillons (rien n'est envoyé) puis ouvre la page de relecture.
  function preparerBrouillons() {
    setMessage("");
    demarrer(async () => {
      const r = await preparer([...choisis]);
      if (!r.ok) return setMessage(r.message);
      notifier(`${r.prepares} brouillon${r.prepares > 1 ? "s" : ""} préparé${r.prepares > 1 ? "s" : ""}`);
      setChoisis(new Set());
      if (r.ignores.length) setMessage(r.ignores.map((i) => `${i.nom} : ${i.raison}`).join(" · "));
      if (r.prepares > 0) router.push("/emails");
    });
  }

  function ouvrir(id: string) {
    const p = new URLSearchParams(params.toString());
    p.set("fiche", id);
    router.push(`${chemin}?${p.toString()}`, { scroll: false });
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <button type="button" className="bouton" disabled={choisis.size === 0 || enCours} onClick={preparerBrouillons}>
          {enCours ? "Préparation…" : `Préparer les brouillons (${choisis.size})`}
        </button>
        <p className="text-xs text-annotation">
          {message ||
            "Coche les prospects qui ont une adresse email enregistrée. Les brouillons sont à relire dans « Contacter les prospects » : rien n'est envoyé ici."}
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-annotation/20">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-annotation/20 text-xs uppercase tracking-wide text-annotation">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Sélectionner les prospects contactables par email"
                  className="h-4 w-4 accent-violet"
                  checked={toutChoisi}
                  disabled={selectionnables.length === 0}
                  onChange={() => setChoisis(toutChoisi ? new Set() : new Set(selectionnables.slice(0, MAX_PAR_LOT)))}
                />
              </th>
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
                <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Sélectionner ${e.nom}`}
                    title={eligibles[e.id]?.ok ? undefined : (eligibles[e.id] as { raison?: string } | undefined)?.raison}
                    className="h-4 w-4 accent-violet"
                    disabled={!eligibles[e.id]?.ok}
                    checked={choisis.has(e.id)}
                    onChange={() => bascule(e.id)}
                  />
                </td>
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
    </>
  );
}
