import type { Metadata } from "next";
import Link from "next/link";
import FicheServeur from "@/components/fiche/FicheServeur";
import FiltresJournal from "@/components/journal/FiltresJournal";
import { ActionsAFaire, TableauJournal } from "@/components/journal/ListeJournal";
import NouvelleInteraction from "@/components/journal/NouvelleInteraction";
import { listerEntreprises } from "@/lib/donnees/entreprises";
import { bilanSemaine, listerAFaire, listerJournal } from "@/lib/donnees/interactions";

export const metadata: Metadata = { title: "Journal · BE SEEN" };

export default async function PageJournal({ searchParams }: { searchParams: Promise<{ fiche?: string; type?: string; resultat?: string }> }) {
  const { fiche, ...filtres } = await searchParams;
  const { lignes, total } = listerJournal(filtres);
  const aFaire = listerAFaire();
  const semaine = bilanSemaine();
  const entreprises = listerEntreprises()
    .map((e) => ({ id: e.id, nom: e.nom, ville: e.ville, optOut: e.optOut, etape: e.etape }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const filtreActif = Boolean(filtres.type || filtres.resultat);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-titre">Journal</h1>
        <NouvelleInteraction entreprises={entreprises} />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          ["Contacts (7 jours)", semaine.contacts],
          ["Réponses positives ou RDV", semaine.reponses],
          ["RDV obtenus", semaine.rdv],
        ].map(([libelle, n]) => (
          <div key={libelle} className="rounded-xl bg-white p-4 ring-1 ring-annotation/20">
            <p className="text-2xl font-bold text-titre">{n}</p>
            <p className="text-xs text-annotation">{libelle}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-titre">
        À faire ({aFaire.length}) · <Link href="/relances" className="normal-case text-bouton hover:text-violet">toutes les relances</Link>
      </h2>
      <div className="mb-8 rounded-xl bg-white p-4 ring-1 ring-annotation/20">
        <ActionsAFaire actions={aFaire} />
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-titre">Historique</h2>
        <p className="text-xs text-annotation">
          {lignes.length < total ? `${lignes.length} plus récentes sur ${total}` : `${total} interaction${total > 1 ? "s" : ""}`}
        </p>
      </div>
      <FiltresJournal />
      {lignes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-annotation/50 bg-white p-10 text-center text-titre">
          {filtreActif ? "Aucune interaction ne correspond à ces filtres." : "Aucune interaction enregistrée. Ajoute la première avec « + Nouvelle interaction », ou depuis une fiche."}
        </div>
      ) : (
        <div className="rounded-xl bg-white p-4 ring-1 ring-annotation/20">
          <TableauJournal lignes={lignes} />
        </div>
      )}
      {fiche && <FicheServeur id={fiche} />}
    </section>
  );
}
