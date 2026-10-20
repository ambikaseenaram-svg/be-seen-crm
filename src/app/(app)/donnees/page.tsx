import type { Metadata } from "next";
import PurgeRgpd from "@/components/donnees/PurgeRgpd";
import { listerPurgeables } from "@/lib/donnees/purge";

export const metadata: Metadata = { title: "Export et données · BE SEEN" };

const EXPORTS = [
  { type: "prospects", titre: "Prospects", detail: "Toutes les fiches : identité, scoring, conformité, étape." },
  { type: "affaires", titre: "Affaires", detail: "Étapes, prochaines actions, offres, montants, signatures." },
  { type: "echanges", titre: "Historique d'échanges", detail: "Chaque interaction : date, canal, résultat, note." },
];

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-xl bg-white p-6 ring-1 ring-annotation/20">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-titre">{titre}</h2>
      {children}
    </section>
  );
}

export default function PageDonnees() {
  const candidats = listerPurgeables();
  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-titre">Export et données</h1>

      <Bloc titre="Export vers Excel">
        <p className="mb-4 text-sm text-annotation">
          Fichiers CSV qui s&apos;ouvrent directement dans Excel, accents compris. Pour exporter une liste filtrée (ex. restaurants du 77), utilise le bouton « Exporter » de la page Entreprises ou Journal.
        </p>
        <ul className="grid grid-cols-3 gap-4">
          {EXPORTS.map((e) => (
            <li key={e.type} className="rounded-lg bg-creme p-4">
              <p className="font-semibold text-titre">{e.titre}</p>
              <p className="mb-3 text-xs text-annotation">{e.detail}</p>
              <a href={`/export/${e.type}`} download className="bouton inline-block">Télécharger (CSV)</a>
            </li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Sauvegarde">
        <p className="mb-3 text-sm text-titre">
          Télécharge une copie complète de ta base (prospects, affaires, échanges, compte). Fais-le régulièrement et garde le fichier hors de cet ordinateur : clé USB, cloud personnel.
        </p>
        <a href="/sauvegarde" download className="bouton inline-block">Télécharger la sauvegarde</a>
        <details className="mt-4 text-sm text-titre">
          <summary className="cursor-pointer font-semibold text-bouton">Comment restaurer une sauvegarde ?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-annotation">
            <li>Arrête le CRM (Ctrl+C dans PowerShell).</li>
            <li>Dans le dossier du CRM, ouvre <code>data</code> et supprime <code>be-seen.db-wal</code> et <code>be-seen.db-shm</code> s&apos;ils existent.</li>
            <li>Remplace <code>be-seen.db</code> par ta sauvegarde, renommée <code>be-seen.db</code>.</li>
            <li>Relance <code>npm run dev</code>.</li>
          </ol>
          <p className="mt-2 text-xs text-annotation">Ce fichier contient toutes tes données prospects et ton mot de passe chiffré : ne le partage pas.</p>
        </details>
      </Bloc>

      <Bloc titre="Purge RGPD (3 ans sans échange)">
        <p className="mb-3 text-sm text-annotation">
          Les données de prospection ne se conservent pas indéfiniment. Les clients ne sont jamais concernés. Les entreprises en opt-out sont conservées aussi : leur fiche garde la trace du « ne plus contacter ».
        </p>
        <PurgeRgpd candidats={candidats} />
      </Bloc>
    </section>
  );
}
