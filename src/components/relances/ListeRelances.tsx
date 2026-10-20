"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Relance } from "@/lib/donnees/relances";
import { aujourdhui, formaterDate, jourEtDate } from "@/lib/dates";
import { CANAUX_INTERACTION } from "@/lib/listes";
import { ajouterJours } from "@/lib/relances";
import { planifier } from "@/app/(app)/relances/actions";
import FenetreInteraction from "../journal/FenetreInteraction";
import { PastillePriorite, BadgeDisqualifie } from "../Pastilles";
import { useSauvegarde } from "../fiche/outils";

const AFFICHAGE_INITIAL = 10;

export function Groupe({ titre, relances, vide, replie = false }: { titre: string; relances: Relance[]; vide?: string; replie?: boolean }) {
  const [tout, setTout] = useState(false);
  const visibles = replie && !tout ? relances.slice(0, AFFICHAGE_INITIAL) : relances;
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-titre">
        {titre} ({relances.length})
      </h2>
      {relances.length === 0 ? (
        vide && <p className="rounded-xl bg-white p-4 text-sm text-annotation ring-1 ring-annotation/20">{vide}</p>
      ) : (
        <ul className="divide-y divide-annotation/15 rounded-xl bg-white ring-1 ring-annotation/20">
          {visibles.map((r) => (
            <LigneRelance key={r.affaireId} r={r} />
          ))}
        </ul>
      )}
      {replie && relances.length > AFFICHAGE_INITIAL && (
        <button type="button" onClick={() => setTout((t) => !t)} className="mt-2 text-sm font-semibold text-bouton hover:text-violet">
          {tout ? "Réduire la liste" : `Voir les ${relances.length - AFFICHAGE_INITIAL} autres`}
        </button>
      )}
    </section>
  );
}

function LigneRelance({ r }: { r: Relance }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const { enCours, erreurs, message, sauver } = useSauvegarde();
  const [fait, setFait] = useState(false);
  const [plan, setPlan] = useState({ prochaineAction: "", dateProchaineAction: "" });
  const jour = aujourdhui();

  function ouvrirFiche() {
    const p = new URLSearchParams(params.toString());
    p.set("fiche", r.entrepriseId);
    router.push(`${chemin}?${p.toString()}`, { scroll: false });
  }
  const reporter = (n: number) => sauver(() => planifier(r.affaireId, { prochaineAction: r.prochaineAction ?? "", dateProchaineAction: ajouterJours(jour, n) }));
  const canalInitial = (CANAUX_INTERACTION as readonly string[]).includes(r.canalPrefere ?? "") ? (r.canalPrefere as string) : undefined;

  const quand =
    r.statut === "retard" ? (
      <span className="font-semibold text-[#b0389f]">
        {r.joursRetard} jour{r.joursRetard > 1 ? "s" : ""} de retard
        <span className="block text-xs font-normal">{formaterDate(r.date)}</span>
      </span>
    ) : r.statut === "aujourdhui" ? (
      <span className="font-semibold text-titre">Aujourd&apos;hui</span>
    ) : r.statut === "avenir" ? (
      <span className="text-annotation">{jourEtDate(r.date as string)}</span>
    ) : (
      <span className="text-annotation">Date à définir</span>
    );

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 p-4">
      <div className="w-36 shrink-0 text-sm">{quand}</div>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={ouvrirFiche} className="text-left font-semibold text-titre hover:text-violet">
          {r.nom}
        </button>
        <span className="ml-2 text-xs text-annotation">{r.ville} · {r.etape}</span>
        <p className="mt-0.5 text-sm text-titre">{r.prochaineAction ?? <span className="text-annotation">Aucune action prévue</span>}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-annotation">
          <PastillePriorite priorite={r.priorite} />
          {r.score != null && <span>Score {r.score}</span>}
          {r.disqualifie && <BadgeDisqualifie />}
          {r.contactNom && <span>{r.contactNom}</span>}
          {r.telephone && (
            <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="font-semibold text-bouton hover:underline">
              {r.telephone}
            </a>
          )}
          {r.canalPrefere && <span>Préfère : {r.canalPrefere}</span>}
          <span>{r.derniereInteraction ? `Dernier contact : ${formaterDate(r.derniereInteraction)}` : "Jamais contacté"}</span>
        </div>
        {message && <p className="message-erreur">{message}</p>}
      </div>

      {r.statut === "sans" ? (
        <form
          noValidate
          className="flex items-start gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            sauver(() => planifier(r.affaireId, plan));
          }}
        >
          <div>
            <input aria-label={`Prochaine action pour ${r.nom}`} placeholder="Prochaine action" className="champ !w-52" value={plan.prochaineAction} onChange={(ev) => setPlan({ ...plan, prochaineAction: ev.target.value })} />
          </div>
          <div>
            <input aria-label={`Date pour ${r.nom}`} type="date" min={jour} className={`champ !w-auto ${erreurs.dateProchaineAction ? "champ-erreur" : ""}`} value={plan.dateProchaineAction} onChange={(ev) => setPlan({ ...plan, dateProchaineAction: ev.target.value })} />
            {erreurs.dateProchaineAction && <span role="alert" className="message-erreur block">{erreurs.dateProchaineAction}</span>}
          </div>
          <button type="submit" disabled={enCours} className="bouton">Planifier</button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setFait(true)} className="bouton">Fait</button>
          {([["Demain", 1], ["+3 j", 3], ["+7 j", 7]] as const).map(([libelle, n]) => (
            <button key={n} type="button" disabled={enCours} onClick={() => reporter(n)} aria-label={`Reporter ${r.nom} : ${libelle}`} className="rounded-lg px-2 py-2 text-xs font-semibold text-bouton ring-1 ring-annotation/40 hover:bg-lavande/30 disabled:opacity-40">
              {libelle}
            </button>
          ))}
        </div>
      )}

      {fait && (
        <FenetreInteraction
          cible={{ id: r.entrepriseId, nom: r.nom, optOut: false, etape: r.etape }}
          initial={{ type: r.dejaContacte ? "Relance" : "Premier contact", canal: canalInitial }}
          onFermer={() => setFait(false)}
        />
      )}
    </li>
  );
}
