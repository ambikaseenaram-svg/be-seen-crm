"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CarteAffaire } from "@/lib/donnees/affaires";
import { enRetard, ETAPES_KANBAN, exigeFenetre, formaterEuros, joursEntre } from "@/lib/affaires";
import { aujourdhui, formaterDate } from "@/lib/dates";
import { deplacerAffaire } from "@/app/(app)/pipeline/actions";
import { BadgeDisqualifie, BadgeOptOut, PastillePriorite } from "../Pastilles";
import { useSauvegarde } from "../fiche/outils";
import FenetreEtape from "./FenetreEtape";

// Cartes triées : prochaine action la plus proche d'abord, puis score décroissant.
function trier(cartes: CarteAffaire[]) {
  return [...cartes].sort((a, b) => {
    const da = a.affaire.dateProchaineAction ?? "9999";
    const db = b.affaire.dateProchaineAction ?? "9999";
    return da.localeCompare(db) || (b.entreprise.score ?? -1) - (a.entreprise.score ?? -1);
  });
}

export default function Kanban({ cartes, ficheId }: { cartes: CarteAffaire[]; ficheId?: string }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const { sauver, message } = useSauvegarde();
  const [survol, setSurvol] = useState<string | null>(null);
  const [fenetre, setFenetre] = useState<{ carte: CarteAffaire; etape: string } | null>(null);
  const jour = aujourdhui();

  function ouvrir(id: string) {
    const p = new URLSearchParams(params.toString());
    p.set("fiche", id);
    router.push(`${chemin}?${p.toString()}`, { scroll: false });
  }

  function deplacer(carte: CarteAffaire, etape: string) {
    if (etape === carte.affaire.etape) return;
    if (exigeFenetre(etape)) setFenetre({ carte, etape });
    else sauver(() => deplacerAffaire(carte.affaire.id, { etape }));
  }

  return (
    <>
      {message && <p className="message-erreur mb-3">{message}</p>}
      <div className="-mx-8 overflow-x-auto px-8 pb-4">
        <div className="flex min-w-max gap-4">
          {ETAPES_KANBAN.map((etape) => {
            const colonne = trier(cartes.filter((c) => c.affaire.etape === etape));
            const montants = colonne.reduce((s, c) => s + (c.affaire.montantMensuel ?? 0), 0);
            return (
              <section
                key={etape}
                aria-label={etape}
                onDragOver={(ev) => {
                  ev.preventDefault();
                  setSurvol(etape);
                }}
                onDragLeave={() => setSurvol((s) => (s === etape ? null : s))}
                onDrop={(ev) => {
                  ev.preventDefault();
                  setSurvol(null);
                  const carte = cartes.find((c) => c.affaire.id === ev.dataTransfer.getData("text/plain"));
                  if (carte) deplacer(carte, etape);
                }}
                className={`w-64 shrink-0 rounded-xl p-2 transition ${survol === etape ? "bg-lavande/40" : "bg-white/60"}`}
              >
                <header className="mb-2 px-1">
                  <h2 className="text-sm font-bold text-titre">{etape}</h2>
                  <p className="text-xs text-annotation">
                    {colonne.length} affaire{colonne.length > 1 ? "s" : ""}
                    {montants > 0 && ` · ${formaterEuros(montants)}/mois`}
                  </p>
                </header>
                <ul className="space-y-2">
                  {colonne.map((c) => {
                    const a = c.affaire;
                    return (
                      <li
                        key={a.id}
                        draggable
                        onDragStart={(ev) => ev.dataTransfer.setData("text/plain", a.id)}
                        onClick={() => ouvrir(c.entreprise.id)}
                        className={`cursor-pointer rounded-lg bg-white p-3 text-sm shadow-sm ring-1 ring-annotation/20 hover:ring-violet ${
                          ficheId === c.entreprise.id ? "ring-2 ring-violet" : ""
                        }`}
                      >
                        <p className="font-semibold text-titre">{c.entreprise.nom}</p>
                        <p className="text-xs text-annotation">{c.entreprise.ville}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <PastillePriorite priorite={c.entreprise.priorite} />
                          {c.entreprise.score != null && <span className="text-xs text-titre">Score {c.entreprise.score}</span>}
                          {c.entreprise.disqualifie && <BadgeDisqualifie />}
                          {c.entreprise.optOut && <BadgeOptOut />}
                        </div>
                        <p className="mt-2 text-xs text-titre">
                          {a.prochaineAction ?? <span className="text-annotation">Prochaine action à définir</span>}
                        </p>
                        {a.dateProchaineAction && (
                          <p className={`text-xs ${enRetard(a.dateProchaineAction, jour) ? "font-semibold text-[#b0389f]" : "text-annotation"}`}>
                            {formaterDate(a.dateProchaineAction)}
                            {enRetard(a.dateProchaineAction, jour) && " · en retard"}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-annotation">
                          <span>
                            {a.offre ? `${a.offre}${a.montantMensuel != null ? ` · ${formaterEuros(a.montantMensuel)}` : ""}` : `${joursEntre(a.dateEtape, jour)} j dans l'étape`}
                          </span>
                          <select
                            aria-label={`Déplacer ${c.entreprise.nom}`}
                            value=""
                            onClick={(ev) => ev.stopPropagation()}
                            onChange={(ev) => deplacer(c, ev.target.value)}
                            className="max-w-[7.5rem] rounded border border-annotation/40 bg-white px-1 py-0.5 text-xs text-titre"
                          >
                            <option value="">Déplacer…</option>
                            {[...ETAPES_KANBAN, "Client terminé", "Perdu"]
                              .filter((e) => e !== a.etape)
                              .map((e) => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                          </select>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      {fenetre && <FenetreEtape affaire={fenetre.carte.affaire} etape={fenetre.etape} nom={fenetre.carte.entreprise.nom} onFermer={() => setFenetre(null)} />}
    </>
  );
}
