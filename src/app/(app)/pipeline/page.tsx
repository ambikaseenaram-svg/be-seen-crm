import type { Metadata } from "next";
import { listerPipeline } from "@/lib/donnees/affaires";
import FicheServeur from "@/components/fiche/FicheServeur";
import Kanban from "@/components/pipeline/Kanban";

export const metadata: Metadata = { title: "Pipeline · BE SEEN" };

export default async function PagePipeline({ searchParams }: { searchParams: Promise<{ fiche?: string }> }) {
  const { fiche } = await searchParams;
  const cartes = listerPipeline();

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-titre">Pipeline</h1>
        <p className="text-sm text-annotation">
          {cartes.length} affaire{cartes.length > 1 ? "s" : ""} ouverte{cartes.length > 1 ? "s" : ""}
        </p>
      </div>
      {cartes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-annotation/50 bg-white p-10 text-center text-titre">
          Aucune affaire ouverte. Ajoute un prospect avec « + Ajout rapide » : il apparaît ici à l&apos;étape « Repéré ».
        </div>
      ) : (
        <Kanban cartes={cartes} ficheId={fiche} />
      )}
      {fiche && <FicheServeur id={fiche} />}
    </section>
  );
}
