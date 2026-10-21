"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TYPES_COMMERCE, MAX_RESULTATS, MAX_ETABLISSEMENTS, formaterSiret } from "@/lib/commerces";
import type { ResultatRecherche } from "@/lib/donnees/annuaire";
import { ajouterAuCrm, chercherCommerces } from "@/app/(app)/trouver/actions";
import { useApp } from "../Fournisseur";
import { Champ } from "../ui/Champ";

type Trouve = Extract<ResultatRecherche, { ok: true }>;

export default function TrouverCommerces() {
  const router = useRouter();
  const { notifier } = useApp();
  const [lieu, setLieu] = useState("");
  const [type, setType] = useState("restaurant");
  const [resultat, setResultat] = useState<Trouve | null>(null);
  const [message, setMessage] = useState("");
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [ajoutes, setAjoutes] = useState<Set<string>>(new Set());
  const [recherche, demarrerRecherche] = useTransition();
  const [ajout, demarrerAjout] = useTransition();

  const dejaLa = (siret: string, presence: unknown) => !!presence || ajoutes.has(siret);
  const selectionnables = resultat?.commerces.filter((c) => !dejaLa(c.siret, c.presence)) ?? [];

  function lancer(ev: React.FormEvent) {
    ev.preventDefault();
    setMessage("");
    demarrerRecherche(async () => {
      const r = await chercherCommerces({ lieu, type });
      setChoisis(new Set());
      setAjoutes(new Set());
      if (r.ok) {
        setResultat(r);
      } else {
        setResultat(null);
        setMessage(r.message);
      }
    });
  }

  function ajouter() {
    if (!resultat) return;
    const liste = resultat.commerces.filter((c) => choisis.has(c.siret));
    setMessage("");
    demarrerAjout(async () => {
      const r = await ajouterAuCrm(
        liste.map(({ siret, nom, ville, adresse, departement, secteur }) => ({ siret, nom, ville, adresse, departement, secteur })),
      );
      if (r.ok) {
        notifier(`${r.ajoutes} commerce${r.ajoutes > 1 ? "s" : ""} ajouté${r.ajoutes > 1 ? "s" : ""} au CRM`);
        setAjoutes((a) => new Set([...a, ...liste.map((c) => c.siret)]));
        setChoisis(new Set());
        router.refresh();
      } else {
        setMessage(r.message);
      }
    });
  }

  const bascule = (siret: string) =>
    setChoisis((s) => {
      const n = new Set(s);
      if (n.has(siret)) n.delete(siret);
      else n.add(siret);
      return n;
    });
  const toutChoisi = selectionnables.length > 0 && choisis.size === selectionnables.length;

  return (
    <>
      <form noValidate onSubmit={lancer} className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-5 ring-1 ring-annotation/20">
        <Champ libelle="Ville, code postal ou département" obligatoire className="w-72">
          <input className="champ" placeholder="Ex. Meaux, 94350 ou 77" value={lieu} onChange={(ev) => setLieu(ev.target.value)} autoComplete="off" />
        </Champ>
        <Champ libelle="Type de commerce" obligatoire className="w-80">
          <select className="champ" value={type} onChange={(ev) => setType(ev.target.value)}>
            {TYPES_COMMERCE.map((t) => (
              <option key={t.cle} value={t.cle}>{t.libelle}</option>
            ))}
          </select>
        </Champ>
        <button type="submit" disabled={recherche || lieu.trim() === ""} className="bouton">
          {recherche ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      {message && <p role="alert" className="mb-4 rounded-lg bg-lavande/40 p-3 text-sm text-titre">{message}</p>}

      {resultat && (
        <section aria-label="Résultats">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-titre">
              {resultat.commerces.length} commerce{resultat.commerces.length > 1 ? "s" : ""} · {resultat.lieu}
            </h2>
            <p className="text-xs text-annotation">
              Écartés : {resultat.ecartes.fermes} fermé{resultat.ecartes.fermes > 1 ? "s" : ""}, {resultat.ecartes.chaines} chaîne{resultat.ecartes.chaines > 1 ? "s" : ""} (plus de {MAX_ETABLISSEMENTS} établissements)
            </p>
          </div>
          {resultat.remarque && <p className="mb-3 text-sm text-annotation">{resultat.remarque}</p>}

          {resultat.commerces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-annotation/50 bg-white p-10 text-center text-titre">
              Aucun commerce indépendant ouvert trouvé. Essaie un autre type, ou élargis au département.
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-white p-2 ring-1 ring-annotation/20">
                <table className="w-full text-sm text-titre">
                  <thead>
                    <tr className="border-b border-annotation/30 text-left text-xs text-annotation">
                      <th className="w-10 p-2">
                        <input
                          type="checkbox"
                          aria-label="Tout sélectionner"
                          className="h-4 w-4 accent-violet"
                          checked={toutChoisi}
                          disabled={selectionnables.length === 0}
                          onChange={() => setChoisis(toutChoisi ? new Set() : new Set(selectionnables.map((c) => c.siret)))}
                        />
                      </th>
                      {["Nom", "Activité", "Adresse", "SIRET", ""].map((t, i) => (
                        <th key={i} className="p-2 font-medium">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultat.commerces.map((c) => {
                      const present = dejaLa(c.siret, c.presence);
                      return (
                        <tr key={c.siret} className={`border-b border-annotation/15 ${present ? "bg-creme text-annotation" : ""}`}>
                          <td className="p-2">
                            <input
                              type="checkbox"
                              aria-label={`Sélectionner ${c.nom}`}
                              className="h-4 w-4 accent-violet"
                              disabled={present}
                              checked={choisis.has(c.siret)}
                              onChange={() => bascule(c.siret)}
                            />
                          </td>
                          <td className="p-2 font-semibold">
                            {c.nom}
                            {c.raisonSociale && <span className="block text-xs font-normal text-annotation">{c.raisonSociale}</span>}
                          </td>
                          <td className="p-2">
                            {c.activite}
                            <span className="block text-xs text-annotation">NAF {c.codeNaf}</span>
                          </td>
                          <td className="p-2">{c.adresse ?? "—"}</td>
                          <td className="p-2 whitespace-nowrap tabular-nums">{formaterSiret(c.siret)}</td>
                          <td className="p-2 text-xs">
                            {ajoutes.has(c.siret) ? "Ajouté ✓" : c.presence === "siret" ? "Déjà dans le CRM" : c.presence === "nom-ville" ? "Déjà dans le CRM (même nom et ville)" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button type="button" disabled={choisis.size === 0 || ajout} onClick={ajouter} className="bouton">
                  {ajout ? "Ajout…" : `Ajouter au CRM (${choisis.size})`}
                </button>
                {ajoutes.size > 0 && (
                  <Link href="/entreprises?origine=data.gouv.fr" className="text-sm font-semibold text-bouton hover:text-violet">Voir les fiches ajoutées →</Link>
                )}
              </div>
              <p className="mt-3 text-xs text-annotation">
                {resultat.plusDeResultats && `Jusqu'à ${MAX_RESULTATS} commerces affichés, d'autres existent : affine avec un code postal ou une ville. `}
                Les fiches arrivent à l&apos;étape « Repéré », avec le rappel « À analyser », la source « data.gouv.fr » et la date du jour. Téléphone, email, site et Instagram ne sont pas fournis par l&apos;annuaire : à compléter toi-même.
              </p>
            </>
          )}
        </section>
      )}
    </>
  );
}
