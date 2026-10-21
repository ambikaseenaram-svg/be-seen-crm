import type { Metadata } from "next";
import Link from "next/link";
import { listerBrouillons, listerJournalEnvois, listerRelancesPossibles } from "@/lib/donnees/emails";
import { etatMessagerie } from "@/lib/donnees/messagerie";
import LotBrouillons from "@/components/emails/LotBrouillons";
import RelancesPossibles from "@/components/emails/RelancesPossibles";
import JournalEnvois from "@/components/emails/JournalEnvois";

export const metadata: Metadata = { title: "Contacter les prospects · BE SEEN" };

export default function PageEmails() {
  const etat = etatMessagerie();
  const brouillons = listerBrouillons();
  const relances = listerRelancesPossibles();
  const journal = listerJournalEnvois();

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-titre">Contacter les prospects</h1>
        <p className="mt-1 text-sm text-annotation">
          Sélectionne des prospects avec une adresse email dans{" "}
          <Link href="/entreprises" className="font-semibold text-bouton hover:text-violet">
            Entreprises
          </Link>
          , prépare les brouillons, relis-les ici, puis valide le lot. Rien ne part sans ta validation.
        </p>
      </div>

      {etat.configuree ? (
        <p className="text-xs text-annotation">
          Envoi depuis <span className="font-semibold text-titre">{etat.nom} &lt;{etat.expediteur}&gt;</span>
        </p>
      ) : (
        <div role="alert" className="rounded-2xl bg-lavande/30 p-5 text-sm text-titre ring-1 ring-lavande">
          <p className="font-bold">Envoi désactivé : ta boîte mail n&apos;est pas encore configurée.</p>
          <p className="mt-1">Ajoute ces lignes dans le fichier <code>.env.local</code> du CRM, puis redémarre-le :</p>
          <ul className="mt-2 list-disc pl-5">
            {etat.manquants.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <LotBrouillons brouillons={brouillons} identite={etat.configuree ? etat.identite : null} />
      {relances.length > 0 && <RelancesPossibles relances={relances} />}
      <JournalEnvois lignes={journal} />
    </section>
  );
}
