"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEPARTEMENTS, ETAPES, ORIGINES, PRIORITES, SECTEURS } from "@/lib/listes";
import type { Filtres } from "@/lib/donnees/entreprises";

const LISTES: { cle: keyof Filtres; libelle: string; valeurs: readonly string[] }[] = [
  { cle: "secteur", libelle: "Secteur", valeurs: SECTEURS },
  { cle: "departement", libelle: "Département", valeurs: DEPARTEMENTS },
  { cle: "origine", libelle: "Origine", valeurs: ORIGINES },
  { cle: "etape", libelle: "Étape", valeurs: ETAPES },
  { cle: "priorite", libelle: "Priorité", valeurs: PRIORITES },
];

export default function FiltresEntreprises({ filtres }: { filtres: Filtres }) {
  const router = useRouter();
  const chemin = usePathname();
  const [q, setQ] = useState(filtres.q ?? "");
  // Copie locale : plusieurs filtres changés coup sur coup ne s'écrasent pas.
  const [courants, setCourants] = useState<Filtres>(filtres);

  function appliquer(changement: Partial<Filtres>) {
    const suivants = { ...courants, ...changement };
    setCourants(suivants);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(suivants)) if (v) params.set(k, v);
    router.replace(`${chemin}?${params.toString()}`);
  }

  // Suit les changements venus d'ailleurs (lien « Effacer les filtres », recherche de la barre haute).
  const cleFiltres = JSON.stringify(filtres);
  const refRecherche = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setCourants(filtres);
    if (document.activeElement !== refRecherche.current) setQ(filtres.q ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleFiltres]);

  // La recherche se lance pendant la frappe, après une courte pause.
  useEffect(() => {
    if (q === (filtres.q ?? "")) return;
    const t = setTimeout(() => appliquer({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const actif = Object.values(courants).some(Boolean);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <input
        ref={refRecherche}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nom, ville ou contact…"
        aria-label="Rechercher par nom, ville ou contact"
        className="champ w-64"
      />
      {LISTES.map(({ cle, libelle, valeurs }) => (
        <select
          key={cle}
          aria-label={libelle}
          value={courants[cle] ?? ""}
          onChange={(e) => appliquer({ [cle]: e.target.value })}
          className={`champ w-auto ${courants[cle] ? "border-violet" : ""}`}
        >
          <option value="">{libelle} : tous</option>
          {valeurs.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ))}
      <select
        aria-label="Opt-out"
        value={courants.optout ?? ""}
        onChange={(e) => appliquer({ optout: e.target.value })}
        className={`champ w-auto ${courants.optout ? "border-violet" : ""}`}
      >
        <option value="">Opt-out : tous</option>
        <option value="non">Contactables</option>
        <option value="oui">Ne plus contacter</option>
      </select>
      {actif && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setCourants({});
            router.replace(chemin);
          }}
          className="pb-2 text-sm font-semibold text-bouton underline"
        >
          Effacer les filtres
        </button>
      )}
    </div>
  );
}
