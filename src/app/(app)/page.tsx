import type { Metadata } from "next";
import Link from "next/link";
import { chargerTableauBord } from "@/lib/donnees/tableau-bord";
import { formaterEuros } from "@/lib/affaires";
import { formaterDate } from "@/lib/dates";
import { FENETRE_CANAUX_JOURS, OBJECTIF_CONTACTS_JOUR, OBJECTIF_SIGNE_MOIS, SEUIL_CANAL } from "@/lib/objectifs";
import { progression } from "@/lib/tableau-bord";

export const metadata: Metadata = { title: "Tableau de bord · BE SEEN" };

function Barre({ valeur, objectif, libelle }: { valeur: number; objectif: number; libelle: string }) {
  const { pct, atteint } = progression(valeur, objectif);
  return (
    <div className="mt-3">
      <div role="progressbar" aria-label={libelle} aria-valuenow={Math.min(valeur, objectif)} aria-valuemin={0} aria-valuemax={objectif} className="h-2 overflow-hidden rounded-full bg-lavande/40">
        <div className="h-full rounded-full bg-violet transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-annotation">{atteint ? "Objectif atteint ✓" : `${pct} % de l'objectif`}</p>
    </div>
  );
}

function Tuile({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-annotation/20">
      <h2 className="text-xs font-bold uppercase tracking-wide text-annotation">{titre}</h2>
      {children}
    </div>
  );
}

export default function PageTableauDeBord() {
  const t = chargerTableauBord();
  const attente = t.relances.retard + t.relances.aujourdhui;
  const max = Math.max(1, ...t.etapes.map((e) => e.n));
  const totalOuvertes = t.etapes.reduce((s, e) => s + e.n, 0);

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-titre">Tableau de bord</h1>
        <p className="text-sm text-annotation">{formaterDate(t.jour)}</p>
      </div>

      {t.nbEntreprises === 0 ? (
        <div className="rounded-2xl border border-dashed border-annotation/50 bg-white p-10 text-center text-titre">
          Aucun prospect pour l&apos;instant. Ajoute le premier avec « + Ajout rapide » (ou la touche N) : les chiffres apparaissent ici.
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-3 gap-4">
            <Tuile titre="Contactés aujourd'hui">
              <p className="mt-2 text-3xl font-bold text-titre">
                {t.contactesAujourdhui} <span className="text-lg font-semibold text-annotation">/ {OBJECTIF_CONTACTS_JOUR}</span>
              </p>
              <Barre valeur={t.contactesAujourdhui} objectif={OBJECTIF_CONTACTS_JOUR} libelle="Contacts du jour" />
            </Tuile>

            <Tuile titre="Relances qui t'attendent">
              <p className="mt-2 text-3xl font-bold text-titre">{attente}</p>
              <p className="mt-3 text-sm text-titre">
                {t.relances.retard > 0 ? <span className="font-semibold text-[#b0389f]">{t.relances.retard} en retard</span> : "Aucune en retard"}
                {t.relances.aujourdhui > 0 && ` · ${t.relances.aujourdhui} pour aujourd'hui`}
              </p>
              <Link href="/relances" className="mt-1 inline-block text-sm font-semibold text-bouton hover:text-violet">Ouvrir la liste →</Link>
            </Tuile>

            <Tuile titre="Signé ce mois-ci">
              <p className="mt-2 text-3xl font-bold text-titre">
                {formaterEuros(t.signe.montantMensuel)} <span className="text-lg font-semibold text-annotation">/ {formaterEuros(OBJECTIF_SIGNE_MOIS)}</span>
              </p>
              <Barre valeur={t.signe.montantMensuel} objectif={OBJECTIF_SIGNE_MOIS} libelle="Montant mensuel signé" />
              <p className="mt-1 text-xs text-annotation">
                {t.signe.nombre} signature{t.signe.nombre > 1 ? "s" : ""} · montant mensuel
                {t.signe.valeurTotale > 0 && ` · valeur totale ${formaterEuros(t.signe.valeurTotale)}`}
              </p>
            </Tuile>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Tuile titre={`Prospects par étape (${totalOuvertes})`}>
              <ul className="mt-3 space-y-2">
                {t.etapes.map(({ etape, n }) => (
                  <li key={etape}>
                    <Link href="/pipeline" className="flex items-center gap-3 text-sm text-titre hover:text-violet">
                      <span className="w-40 shrink-0">{etape}</span>
                      <span className="h-3 flex-1 overflow-hidden rounded-full bg-lavande/30" aria-hidden>
                        <span className="block h-full rounded-full bg-violet" style={{ width: `${(n / max) * 100}%` }} />
                      </span>
                      <span className="w-6 text-right font-semibold">{n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Tuile>

            <Tuile titre={`Canal qui répond le mieux (${FENETRE_CANAUX_JOURS} jours)`}>
              {t.canaux.stats.length === 0 ? (
                <p className="mt-3 text-sm text-annotation">Aucune interaction enregistrée. Ajoute-les depuis le Journal ou une fiche.</p>
              ) : (
                <>
                  <p className="mt-3 text-sm text-titre">
                    {t.canaux.meilleur ? (
                      <>
                        <strong>{t.canaux.meilleur.canal}</strong> : {t.canaux.meilleur.taux} % de réponses positives ({t.canaux.meilleur.positives} sur {t.canaux.meilleur.contacts})
                      </>
                    ) : (
                      <span className="text-annotation">Pas encore assez de données : {SEUIL_CANAL} contacts minimum par canal.</span>
                    )}
                  </p>
                  <table className="mt-3 w-full text-sm text-titre">
                    <thead>
                      <tr className="border-b border-annotation/30 text-left text-xs text-annotation">
                        <th className="py-1 font-medium">Canal</th>
                        <th className="py-1 text-right font-medium">Contacts</th>
                        <th className="py-1 text-right font-medium">Positives</th>
                        <th className="py-1 text-right font-medium">Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.canaux.stats.map((c) => (
                        <tr key={c.canal} className="border-b border-annotation/15">
                          <td className="py-1.5">{c.canal}</td>
                          <td className="py-1.5 text-right">{c.contacts}</td>
                          <td className="py-1.5 text-right">{c.positives}</td>
                          <td className="py-1.5 text-right">
                            {c.taux} %{c.contacts < SEUIL_CANAL && <span className="block text-[10px] text-annotation">échantillon faible</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-annotation">Réponse positive = réponse positive ou RDV obtenu.</p>
                </>
              )}
            </Tuile>
          </div>
        </>
      )}
    </section>
  );
}
