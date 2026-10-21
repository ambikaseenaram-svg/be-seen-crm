"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LigneEnvoi } from "@/lib/donnees/emails";
import { stopRecu } from "@/app/(app)/emails/actions";
import { useApp } from "../Fournisseur";

const horodatage = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }) : "—";

const STATUTS: Record<string, string> = {
  Envoyé: "text-violet font-semibold",
  Échec: "text-[#b0389f] font-semibold",
  Exclu: "text-annotation",
  "En cours": "text-[#b0389f]",
};

export default function JournalEnvois({ lignes }: { lignes: LigneEnvoi[] }) {
  const router = useRouter();
  const { notifier } = useApp();
  const [enCours, demarrer] = useTransition();

  function stop(l: LigneEnvoi) {
    if (!window.confirm(`Enregistrer l'opposition de ${l.entrepriseNom} ? Plus aucun email ne lui sera envoyé.`)) return;
    demarrer(async () => {
      const r = await stopRecu(l.entrepriseId);
      if (r.ok) notifier(`Opposition enregistrée pour ${l.entrepriseNom}`);
      router.refresh();
    });
  }

  return (
    <section aria-label="Journal des envois">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-titre">Journal des envois ({lignes.length})</h2>
      {lignes.length === 0 ? (
        <p className="text-sm text-annotation">Aucun envoi pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-annotation/20">
          <table className="w-full text-left text-sm text-titre">
            <thead className="border-b border-annotation/20 text-xs uppercase tracking-wide text-annotation">
              <tr>
                {["Date", "Destinataire", "Entreprise", "Email", "Résultat", ""].map((t, i) => (
                  <th key={i} className="px-4 py-3 font-semibold">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className="border-b border-annotation/10 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3">{horodatage(l.envoyeLe ?? l.modifieLe)}</td>
                  <td className="px-4 py-3">{l.destinataire}</td>
                  <td className="px-4 py-3">
                    <Link href={`/entreprises?fiche=${l.entrepriseId}`} className="font-semibold hover:text-violet">
                      {l.entrepriseNom}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {l.modele}
                    <span className="block text-xs text-annotation">{l.objet}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUTS[l.statut] ?? ""}>{l.statut === "En cours" ? "Incertain" : l.statut === "Envoyé" ? "Succès" : l.statut}</span>
                    {l.raison && <span className="block text-xs text-annotation">{l.raison}</span>}
                    {l.statut === "En cours" && <span className="block text-xs text-annotation">Envoi interrompu : vérifie ta boîte « Envoyés ». Il ne sera pas renvoyé.</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {l.statut === "Envoyé" &&
                      (l.optOut ? (
                        <span className="text-annotation">Opposition enregistrée</span>
                      ) : (
                        <button type="button" disabled={enCours} onClick={() => stop(l)} className="font-semibold text-bouton hover:text-violet">
                          A répondu STOP
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-annotation">
        Une réponse reçue ? Note-la sur la fiche (Journal ou section Interactions) : les relances s&apos;arrêtent automatiquement.
      </p>
    </section>
  );
}
