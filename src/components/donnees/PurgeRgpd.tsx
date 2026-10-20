"use client";

import { useState } from "react";
import type { Purgeable } from "@/lib/donnees/purge";
import { formaterDate } from "@/lib/dates";
import { MOT_CONFIRMATION } from "@/lib/purge";
import { purgerProspects } from "@/app/(app)/donnees/actions";
import Fenetre from "../ui/Fenetre";
import { Champ } from "../ui/Champ";
import { useSauvegarde } from "../fiche/outils";

export default function PurgeRgpd({ candidats }: { candidats: Purgeable[] }) {
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [fenetre, setFenetre] = useState(false);
  const [saisie, setSaisie] = useState("");
  const { enCours, erreurs, message, sauver } = useSauvegarde();

  if (candidats.length === 0) {
    return <p className="text-sm text-titre">Aucune fiche à purger : tous tes prospects ont eu un échange ou ont été collectés il y a moins de 3 ans.</p>;
  }
  const bascule = (id: string) =>
    setChoisis((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toutSelectionne = choisis.size === candidats.length;

  return (
    <>
      <p className="mb-3 text-sm text-titre">
        {candidats.length} fiche{candidats.length > 1 ? "s" : ""} sans aucun échange depuis plus de 3 ans. Coche celles à supprimer : rien n&apos;est coché d&apos;avance.
      </p>
      <div className="max-h-96 overflow-y-auto rounded-xl ring-1 ring-annotation/20">
        <table className="w-full text-sm text-titre">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-annotation/30 text-left text-xs text-annotation">
              <th className="w-10 p-2">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  className="h-4 w-4 accent-violet"
                  checked={toutSelectionne}
                  onChange={() => setChoisis(toutSelectionne ? new Set() : new Set(candidats.map((c) => c.id)))}
                />
              </th>
              {["Entreprise", "Dernière activité", "Étape", "Échanges"].map((t) => (
                <th key={t} className="p-2 font-medium">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidats.map((c) => (
              <tr key={c.id} className="border-b border-annotation/15">
                <td className="p-2">
                  <input type="checkbox" aria-label={`Sélectionner ${c.nom}`} className="h-4 w-4 accent-violet" checked={choisis.has(c.id)} onChange={() => bascule(c.id)} />
                </td>
                <td className="p-2 font-semibold">{c.nom}<span className="block text-xs font-normal text-annotation">{c.ville}</span></td>
                <td className="p-2">
                  {formaterDate(c.derniereActivite)}
                  <span className="block text-xs text-annotation">{c.avecEchange ? "dernier échange" : "collecte, jamais contacté"}</span>
                </td>
                <td className="p-2">{c.etape ?? "—"}</td>
                <td className="p-2">{c.nbInteractions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button type="button" disabled={choisis.size === 0} onClick={() => setFenetre(true)} className="bouton">
          Supprimer la sélection ({choisis.size})
        </button>
        {message && !fenetre && <p className="message-erreur">{message}</p>}
      </div>

      {fenetre && (
        <Fenetre titre="Supprimer définitivement" onFermer={() => setFenetre(false)}>
          <form
            noValidate
            className="space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              sauver(() => purgerProspects([...choisis], saisie), () => {
                setFenetre(false);
                setChoisis(new Set());
                setSaisie("");
              });
            }}
          >
            <p className="text-sm text-titre">
              {choisis.size} fiche{choisis.size > 1 ? "s" : ""} seront supprimées avec leurs affaires et leurs interactions. <strong>Cette action est définitive.</strong> Télécharge d&apos;abord une sauvegarde si tu as un doute.
            </p>
            <Champ libelle={`Pour confirmer, tape ${MOT_CONFIRMATION}`} erreur={erreurs.confirmation}>
              <input className={`champ ${erreurs.confirmation ? "champ-erreur" : ""}`} value={saisie} onChange={(ev) => setSaisie(ev.target.value)} autoComplete="off" />
            </Champ>
            {message && <p className="message-erreur">{message}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setFenetre(false)} className="text-sm text-annotation hover:text-titre">Annuler</button>
              <button type="submit" disabled={enCours || saisie !== MOT_CONFIRMATION} className="bouton">Supprimer</button>
            </div>
          </form>
        </Fenetre>
      )}
    </>
  );
}
