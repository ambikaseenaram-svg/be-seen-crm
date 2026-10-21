"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { preparer } from "@/app/(app)/emails/actions";
import { DELAI_RELANCE_JOURS } from "@/lib/emails";
import { useApp } from "../Fournisseur";

type Relance = { id: string; nom: string; ville: string; email: string };

export default function RelancesPossibles({ relances }: { relances: Relance[] }) {
  const router = useRouter();
  const { notifier } = useApp();
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [enCours, demarrer] = useTransition();

  function lancer() {
    setMessage("");
    demarrer(async () => {
      const r = await preparer([...choisis]);
      if (!r.ok) return setMessage(r.message);
      notifier(`${r.prepares} relance${r.prepares > 1 ? "s" : ""} ajoutée${r.prepares > 1 ? "s" : ""} au lot`);
      if (r.ignores.length) setMessage(r.ignores.map((i) => `${i.nom} : ${i.raison}`).join(" · "));
      setChoisis(new Set());
      router.refresh();
    });
  }

  return (
    <section aria-label="Relances possibles" className="rounded-2xl bg-white p-5 ring-1 ring-annotation/20">
      <h2 className="text-sm font-bold uppercase tracking-wide text-titre">Relances possibles ({relances.length})</h2>
      <p className="mt-1 text-xs text-annotation">
        Premier email envoyé il y a {DELAI_RELANCE_JOURS} jours ou plus, sans réponse ni opposition. Une seule relance par prospect.
      </p>
      <ul className="mt-3 space-y-2">
        {relances.map((r) => (
          <li key={r.id}>
            <label className="flex items-center gap-3 text-sm text-titre">
              <input
                type="checkbox"
                className="h-4 w-4 accent-violet"
                checked={choisis.has(r.id)}
                onChange={() =>
                  setChoisis((s) => {
                    const n = new Set(s);
                    if (n.has(r.id)) n.delete(r.id);
                    else n.add(r.id);
                    return n;
                  })
                }
              />
              <span className="font-semibold">{r.nom}</span>
              <span className="text-annotation">
                {r.ville} · {r.email}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {message && <p className="mt-2 text-sm text-annotation">{message}</p>}
      <button type="button" className="bouton mt-4" disabled={choisis.size === 0 || enCours} onClick={lancer}>
        Préparer les relances ({choisis.size})
      </button>
    </section>
  );
}
