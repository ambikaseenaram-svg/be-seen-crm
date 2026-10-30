"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Analyse } from "@/lib/donnees/import";
import { CHAMPS, TAILLE_MAX_OCTETS, type Champ, type Correspondance } from "@/lib/import";
import { ORIGINES } from "@/lib/listes";
import { analyser, importer } from "@/app/(app)/importer/actions";
import { useApp } from "../Fournisseur";
import { Champ as ChampForm } from "../ui/Champ";

type Lue = Extract<Analyse, { ok: true }>;

// Excel enregistre en UTF-8 (« CSV UTF-8 ») ou en Windows-1252 (« CSV (séparateur : point-virgule) ») : on accepte les deux.
async function lireFichier(f: File): Promise<string> {
  const octets = await f.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch {
    return new TextDecoder("windows-1252").decode(octets);
  }
}

const STATUTS = { ok: "À importer", doublon: "Doublon", erreur: "Erreur" } as const;

export default function ImporterProspects() {
  const router = useRouter();
  const { notifier } = useApp();
  const [nomFichier, setNomFichier] = useState("");
  const [texte, setTexte] = useState("");
  const [origine, setOrigine] = useState("");
  const [analyse, setAnalyse] = useState<Lue | null>(null);
  const [message, setMessage] = useState("");
  const [importes, setImportes] = useState<number | null>(null);
  const [lecture, demarrerLecture] = useTransition();
  const [ecriture, demarrerEcriture] = useTransition();

  function relire(t: string, o: string, correspondance?: Correspondance) {
    setMessage("");
    setImportes(null);
    if (!t || !o) return setAnalyse(null);
    demarrerLecture(async () => {
      const r = await analyser({ texte: t, origine: o, correspondance });
      if (r.ok) setAnalyse(r);
      else {
        setAnalyse(null);
        setMessage(r.message);
      }
    });
  }

  async function choisirFichier(f: File | undefined) {
    setAnalyse(null);
    setMessage("");
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) {
      setNomFichier("");
      return setMessage("Ce fichier n'est pas un CSV. Dans Excel : Fichier → Enregistrer sous → type « CSV UTF-8 ».");
    }
    if (f.size > TAILLE_MAX_OCTETS) return setMessage("Fichier trop lourd : coupe-le en plusieurs.");
    const t = await lireFichier(f);
    setNomFichier(f.name);
    setTexte(t);
    relire(t, origine);
  }

  function changerColonne(i: number, champ: string) {
    if (!analyse) return;
    const c = [...analyse.correspondance];
    c[i] = (champ || null) as Champ | null;
    relire(texte, origine, c);
  }

  function lancerImport() {
    if (!analyse) return;
    setMessage("");
    demarrerEcriture(async () => {
      const r = await importer({ texte, origine, correspondance: analyse.correspondance });
      if (!r.ok) return setMessage(r.message);
      notifier(`${r.importes} prospect${r.importes > 1 ? "s" : ""} importé${r.importes > 1 ? "s" : ""}`);
      setImportes(r.importes);
      setAnalyse(null);
      setTexte("");
      setNomFichier("");
      router.refresh();
    });
  }

  const compte = (s: string) => analyse?.lignes.filter((l) => l.statut === s).length ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-5 ring-1 ring-annotation/20">
        <ChampForm libelle="Fichier CSV" obligatoire className="w-80">
          <input type="file" accept=".csv,.txt,text/csv" className="champ" onChange={(e) => choisirFichier(e.target.files?.[0])} />
        </ChampForm>
        <ChampForm libelle="D'où viennent ces prospects ?" obligatoire className="w-72">
          <select
            className="champ"
            value={origine}
            onChange={(e) => {
              setOrigine(e.target.value);
              relire(texte, e.target.value, analyse?.correspondance);
            }}
          >
            <option value="">Choisir…</option>
            {ORIGINES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </ChampForm>
        <p className="max-w-sm text-xs text-annotation">
          L&apos;origine est notée sur chaque fiche, avec la date du jour comme date de collecte. Une colonne « Origine » dans ton fichier est prise en compte quand elle correspond à la liste.
        </p>
      </div>

      {message && (
        <p role="alert" className="mb-4 rounded-lg bg-lavande/40 p-3 text-sm text-titre">
          {message}
        </p>
      )}
      {importes !== null && (
        <p role="status" className="mb-4 rounded-lg bg-white p-4 text-sm text-titre ring-1 ring-violet/40">
          {importes} prospect{importes > 1 ? "s" : ""} importé{importes > 1 ? "s" : ""} à l&apos;étape « Repéré », avec le rappel « À analyser ».{" "}
          <Link href="/entreprises" className="font-semibold text-bouton hover:text-violet">
            Voir les fiches →
          </Link>
        </p>
      )}
      {nomFichier && !origine && <p className="mb-4 text-sm text-titre">Choisis maintenant d&apos;où viennent ces prospects.</p>}
      {lecture && <p className="mb-4 text-sm text-annotation">Lecture du fichier…</p>}

      {analyse && (
        <>
          <section aria-label="Colonnes" className="mb-6 rounded-xl bg-white p-5 ring-1 ring-annotation/20">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-titre">Colonnes de ton fichier</h2>
            <p className="mb-4 text-xs text-annotation">Vérifie où va chaque colonne. « Ignorer » : la colonne n&apos;est pas importée.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analyse.entetes.map((titre, i) => (
                <ChampForm key={i} libelle={titre || `Colonne ${i + 1}`}>
                  <select className="champ" value={analyse.correspondance[i] ?? ""} onChange={(e) => changerColonne(i, e.target.value)}>
                    <option value="">— Ignorer —</option>
                    {(Object.keys(CHAMPS) as Champ[]).map((c) => (
                      <option key={c} value={c}>
                        {CHAMPS[c].libelle}
                      </option>
                    ))}
                  </select>
                </ChampForm>
              ))}
            </div>
            {analyse.probleme && (
              <p role="alert" className="message-erreur mt-3 text-sm">
                {analyse.probleme}
              </p>
            )}
          </section>

          {!analyse.probleme && (
            <section aria-label="Aperçu">
              <div className="mb-3 flex flex-wrap items-center gap-4">
                <button type="button" className="bouton" disabled={analyse.aImporter === 0 || ecriture || lecture} onClick={lancerImport}>
                  {ecriture ? "Import…" : `Importer ${analyse.aImporter} prospect${analyse.aImporter > 1 ? "s" : ""}`}
                </button>
                <p className="text-sm text-titre">
                  {compte("ok")} à importer · {compte("doublon")} doublon{compte("doublon") > 1 ? "s" : ""} ignoré{compte("doublon") > 1 ? "s" : ""} · {compte("erreur")} erreur
                  {compte("erreur") > 1 ? "s" : ""} à corriger dans Excel
                </p>
              </div>
              <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-annotation/20">
                <table className="w-full text-left text-sm text-titre">
                  <thead className="border-b border-annotation/20 text-xs uppercase tracking-wide text-annotation">
                    <tr>
                      {["Ligne", "Nom", "Ville", "Email", "Téléphone", "Statut"].map((t) => (
                        <th key={t} className="px-3 py-2 font-semibold">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analyse.lignes.map((l) => (
                      <tr key={l.numero} className={`border-b border-annotation/10 align-top last:border-0 ${l.statut === "ok" ? "" : "bg-creme"}`}>
                        <td className="px-3 py-2 tabular-nums text-annotation">{l.numero}</td>
                        <td className="px-3 py-2 font-semibold">{l.valeurs.nom || "—"}</td>
                        <td className="px-3 py-2">{l.valeurs.ville || "—"}</td>
                        <td className="px-3 py-2">{l.valeurs.email ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2">{l.valeurs.telephone ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className={l.statut === "ok" ? "font-semibold text-violet" : l.statut === "erreur" ? "font-semibold text-[#b0389f]" : "text-annotation"}>
                            {STATUTS[l.statut]}
                          </span>
                          {[...l.erreurs, ...(l.doublon ? [l.doublon] : []), ...l.avertissements].map((m) => (
                            <span key={m} className="block text-xs text-annotation">
                              {m}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
