"use client";

import { useState } from "react";
import type { Entreprise } from "@/db/schema";
import { CRITERES, calculerScoring, type Notes } from "@/lib/scoring";
import { formaterDate } from "@/lib/dates";
import { modifierScoring } from "@/app/(app)/entreprises/actions";
import { BadgeDisqualifie, PastillePriorite } from "../Pastilles";
import { BoutonLien, BoutonsEdition, Section, Valeur, useSauvegarde } from "./outils";

const CLES = ["c1", "c2", "c3", "c4", "c5"] as const;

function versNotes(f: Record<string, string>): Notes {
  const n = (v: string) => (v === "" ? null : Number(v));
  return { c1: n(f.c1), c2: n(f.c2), c3: n(f.c3), c4: n(f.c4), c5: n(f.c5) };
}

// Rappel de la grille du critère, au survol.
function Critere({ index }: { index: number }) {
  const c = CRITERES[index];
  return (
    <span className="group relative cursor-help">
      <span className="border-b border-dotted border-annotation">{c.titre}</span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-80 rounded-lg bg-titre p-3 text-xs font-normal text-white shadow-lg group-hover:block">
        {c.grille.map((g) => (
          <span key={g} className="block">
            {g}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function SectionScoring({ entreprise: e }: { entreprise: Entreprise }) {
  const initial = () => ({
    ...Object.fromEntries(CLES.map((c) => [c, e[c] == null ? "" : String(e[c])])),
    angleAccroche: e.angleAccroche ?? "",
  });
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState<Record<string, string>>(initial);
  const { enCours, erreurs, message, sauver, setErreurs } = useSauvegarde();

  if (edition) {
    const apercu = calculerScoring(versNotes(f));
    return (
      <Section titre="Scoring">
        <form
          noValidate
          className="grid grid-cols-2 gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            sauver(() => modifierScoring(e.id, f), () => setEdition(false));
          }}
        >
          <div className="col-span-2 space-y-2">
            {CLES.map((c, i) => (
              <div key={c} className="flex items-center justify-between gap-3 text-sm text-titre">
                <Critere index={i} />
                <div className="flex gap-1" role="radiogroup" aria-label={CRITERES[i].titre}>
                  {["", "0", "1", "2", "3", "4", "5"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={f[c] === v}
                      onClick={() => setF({ ...f, [c]: v })}
                      className={`h-8 min-w-8 rounded-md px-2 text-sm ${
                        f[c] === v ? "bg-violet font-semibold text-white" : "bg-creme text-titre ring-1 ring-annotation/30 hover:bg-lavande/30"
                      }`}
                    >
                      {v === "" ? "—" : v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {CLES.some((c) => erreurs[c]) && <p className="message-erreur">Note entre 0 et 5.</p>}
          </div>
          <div className="col-span-2 flex items-center gap-3 rounded-lg bg-creme px-3 py-2 text-sm text-titre">
            Aperçu : score <strong>{apercu.score ?? "—"}</strong>
            <PastillePriorite priorite={apercu.priorite} />
            {apercu.disqualifie && <BadgeDisqualifie />}
          </div>
          <label className="col-span-2 block">
            <span className="mb-1 block text-xs font-medium text-titre">Angle d&apos;accroche</span>
            <textarea
              rows={2}
              className="champ"
              value={f.angleAccroche}
              onChange={(ev) => setF({ ...f, angleAccroche: ev.target.value })}
              placeholder="Ex. : chef formé chez un étoilé, Insta qui ne montre que des plats"
            />
          </label>
          <BoutonsEdition
            enCours={enCours}
            message={message}
            onAnnuler={() => {
              setF(initial());
              setErreurs({});
              setEdition(false);
            }}
          />
        </form>
      </Section>
    );
  }

  return (
    <Section titre="Scoring" actions={!e.optOut && <BoutonLien onClick={() => setEdition(true)}>Modifier les notes</BoutonLien>}>
      <dl className="grid grid-cols-5 gap-2">
        {CLES.map((c, i) => (
          <div key={c} title={CRITERES[i].grille.join("\n")} className="cursor-help rounded-lg bg-creme px-2 py-2 text-center">
            <dt className="text-xs text-annotation">{c.toUpperCase()}{c === "c5" && " ×2"}</dt>
            <dd className="text-lg font-bold text-titre">
              {e[c] ?? <span className="inline-block rounded bg-lavande/35 px-1 text-xs font-normal">À compléter</span>}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <Valeur libelle="Score" valeur={e.score} />
        <Valeur libelle="Disqualifié" valeur={e.disqualifie ? "Oui" : "Non"} />
        <Valeur libelle="Angle d'accroche" valeur={e.angleAccroche} indispensable className="col-span-2" />
        <Valeur libelle="Date de scoring" valeur={formaterDate(e.dateScoring)} indispensable />
      </dl>
    </Section>
  );
}
