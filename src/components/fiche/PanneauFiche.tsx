"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LigneEntreprise } from "@/lib/donnees/entreprises";
import { BadgeDisqualifie, BadgeOptOut, PastillePriorite } from "../Pastilles";
import SectionIdentite from "./SectionIdentite";
import SectionScoring from "./SectionScoring";
import SectionConformite from "./SectionConformite";
import FenetreSuppression from "./FenetreSuppression";
import { Section } from "./outils";

export default function PanneauFiche({ entreprise: e }: { entreprise: LigneEntreprise }) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const [menu, setMenu] = useState(false);
  const [suppression, setSuppression] = useState(false);

  function fermer() {
    const p = new URLSearchParams(params.toString());
    p.delete("fiche");
    const qs = p.toString();
    router.push(qs ? `${chemin}?${qs}` : chemin, { scroll: false });
  }

  useEffect(() => {
    const surTouche = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && !document.querySelector("[role=dialog]")) fermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  });

  return (
    <aside
      aria-label={`Fiche ${e.nom}`}
      className={`fixed inset-y-0 right-0 z-30 w-[560px] max-w-full overflow-y-auto border-l border-annotation/20 px-6 pb-10 shadow-2xl ${
        e.optOut ? "bg-gray-50" : "bg-white"
      }`}
    >
      {/* En-tête */}
      <div className="sticky top-0 z-10 -mx-6 mb-1 bg-inherit px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-titre">{e.nom}</h2>
            <p className="text-sm text-annotation">{e.ville}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                aria-label="Plus d'actions"
                onClick={() => setMenu((m) => !m)}
                className="rounded-lg px-2 py-1 text-lg leading-none text-annotation hover:bg-creme hover:text-titre"
              >
                …
              </button>
              {menu && (
                <div className="absolute right-0 mt-1 w-56 rounded-lg bg-white p-1 shadow-lg ring-1 ring-annotation/20">
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      setSuppression(true);
                    }}
                    className="w-full rounded px-3 py-2 text-left text-sm text-[#c0392b] hover:bg-creme"
                  >
                    Supprimer définitivement
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={fermer} aria-label="Fermer la fiche" className="text-2xl leading-none text-annotation hover:text-titre">
              ×
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <PastillePriorite priorite={e.priorite} />
          <span className="text-titre">
            Score <strong>{e.score ?? "—"}</strong>
          </span>
          <span className="rounded bg-creme px-2 py-0.5 text-xs text-titre ring-1 ring-annotation/30">{e.etape ?? "Aucune affaire ouverte"}</span>
          {e.disqualifie && <BadgeDisqualifie />}
          {e.optOut && <BadgeOptOut />}
        </div>
      </div>

      <Section titre="Affaire en cours">
        <p className="text-sm text-annotation">Étape actuelle : {e.etape ?? "—"}. La gestion des affaires arrive à l&apos;étape 3.</p>
      </Section>
      <Section titre="Interactions">
        <p className="text-sm text-annotation">Le journal des contacts arrive à l&apos;étape 4.</p>
      </Section>
      <SectionIdentite entreprise={e} />
      <SectionScoring entreprise={e} />
      <SectionConformite entreprise={e} />

      {suppression && <FenetreSuppression entreprise={e} onFermer={() => setSuppression(false)} apresSuppression={fermer} />}
    </aside>
  );
}
