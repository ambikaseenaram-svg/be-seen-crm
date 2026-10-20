import type { Metadata } from "next";
import FicheServeur from "@/components/fiche/FicheServeur";
import { Groupe } from "@/components/relances/ListeRelances";
import { listerRelances } from "@/lib/donnees/relances";
import { aujourdhui, formaterDate } from "@/lib/dates";
import { ajouterJours, HORIZON_JOURS } from "@/lib/relances";

export const metadata: Metadata = { title: "Relances · BE SEEN" };

export default async function PageRelances({ searchParams }: { searchParams: Promise<{ fiche?: string }> }) {
  const { fiche } = await searchParams;
  const jour = aujourdhui();
  const toutes = listerRelances(jour);
  const horizon = ajouterJours(jour, HORIZON_JOURS);
  const de = (s: string) => toutes.filter((r) => r.statut === s);
  const avenir = de("avenir").filter((r) => (r.date as string) <= horizon);
  const plusLoin = de("avenir").length - avenir.length;

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-titre">Relances</h1>
        <p className="text-sm text-annotation">{formaterDate(jour)}</p>
      </div>

      {toutes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-annotation/50 bg-white p-10 text-center text-titre">
          Aucune affaire à suivre. Ajoute un prospect avec « + Ajout rapide » : il apparaît ici dès qu&apos;il est dans le pipeline.
        </div>
      ) : (
        <>
          <Groupe titre="En retard : à traiter en premier" relances={de("retard")} vide="Rien d'oublié. Bravo." />
          <Groupe titre="Aujourd'hui" relances={de("aujourdhui")} vide="Rien de prévu aujourd'hui." />
          <Groupe titre={`À venir (${HORIZON_JOURS} jours)`} relances={avenir} replie vide="Aucune relance planifiée dans les prochains jours." />
          {plusLoin > 0 && <p className="-mt-5 mb-8 text-xs text-annotation">+ {plusLoin} plus tard que {HORIZON_JOURS} jours</p>}
          <Groupe titre="Sans prochaine action" relances={de("sans")} replie vide="Chaque affaire a une prochaine action." />
        </>
      )}
      {fiche && <FicheServeur id={fiche} />}
    </section>
  );
}
