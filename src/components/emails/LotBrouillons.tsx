"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LigneEnvoi } from "@/lib/donnees/emails";
import type { BilanEnvoi } from "@/lib/donnees/emails";
import { MARQUEUR, piedDePage } from "@/lib/emails";
import { enregistrer, retirer, validerEtEnvoyer } from "@/app/(app)/emails/actions";
import { useApp } from "../Fournisseur";
import { Champ } from "../ui/Champ";

type Texte = { objet: string; corps: string; origineCoordonnees: string };

export default function LotBrouillons({ brouillons, identite }: { brouillons: LigneEnvoi[]; identite: string | null }) {
  const router = useRouter();
  const [modifies, setModifies] = useState<Set<string>>(new Set());
  const [valide, setValide] = useState(false);
  const [bilan, setBilan] = useState<BilanEnvoi | null>(null);
  const [envoi, demarrerEnvoi] = useTransition();

  const aCorriger = brouillons.filter((b) => b.aCorriger);
  const pret = identite && brouillons.length > 0 && aCorriger.length === 0 && modifies.size === 0;

  function envoyer() {
    setBilan(null);
    demarrerEnvoi(async () => {
      const r = await validerEtEnvoyer({ ids: brouillons.map((b) => b.id), valide });
      setBilan(r);
      setValide(false);
      router.refresh();
    });
  }

  const marquer = (id: string, modifie: boolean) =>
    setModifies((s) => {
      const n = new Set(s);
      if (modifie) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <section aria-label="Brouillons" className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-titre">
        Lot à relire ({brouillons.length})
      </h2>

      {bilan && (
        <div role="status" className="rounded-xl bg-white p-4 text-sm text-titre ring-1 ring-annotation/30">
          {bilan.ok ? (
            <>
              <p className="font-semibold">
                {bilan.envoyes} email{bilan.envoyes > 1 ? "s" : ""} envoyé{bilan.envoyes > 1 ? "s" : ""}
                {bilan.echecs > 0 && `, ${bilan.echecs} échec${bilan.echecs > 1 ? "s" : ""} (motif dans le journal)`}.
              </p>
              {bilan.exclus.map((x) => (
                <p key={x.nom} className="text-annotation">
                  Exclu : {x.nom} — {x.raison}
                </p>
              ))}
            </>
          ) : (
            <p className="font-semibold">{bilan.message}</p>
          )}
        </div>
      )}

      {brouillons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-annotation/50 bg-white p-8 text-center text-sm text-titre">
          Aucun brouillon. Va dans <strong>Entreprises</strong>, coche des prospects avec une adresse email, puis clique sur « Préparer les brouillons ».
        </div>
      ) : (
        <>
          {brouillons.map((b) => (
            <CarteBrouillon key={b.id} b={b} identite={identite} onModifie={(m) => marquer(b.id, m)} />
          ))}

          <div className="rounded-2xl bg-white p-5 ring-1 ring-violet/40">
            {aCorriger.length > 0 && (
              <p className="mb-3 text-sm text-[#b0389f]">
                {aCorriger.length} brouillon{aCorriger.length > 1 ? "s" : ""} à compléter : remplace chaque texte « {MARQUEUR}… » puis enregistre.
              </p>
            )}
            {modifies.size > 0 && <p className="mb-3 text-sm text-[#b0389f]">Enregistre tes modifications avant de valider.</p>}
            <label className="flex items-start gap-3 text-sm text-titre">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-violet" checked={valide} disabled={!pret || envoi} onChange={(e) => setValide(e.target.checked)} />
              <span>
                J&apos;ai relu les {brouillons.length} email{brouillons.length > 1 ? "s" : ""} et je valide ce lot. Les oppositions et les réponses sont revérifiées juste avant chaque envoi.
              </span>
            </label>
            <button type="button" className="bouton mt-4" disabled={!pret || !valide || envoi} onClick={envoyer}>
              {envoi ? "Envoi en cours… ne ferme pas la page" : `Valider et envoyer (${brouillons.length})`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function CarteBrouillon({ b, identite, onModifie }: { b: LigneEnvoi; identite: string | null; onModifie: (modifie: boolean) => void }) {
  const router = useRouter();
  const { notifier } = useApp();
  const initial: Texte = { objet: b.objet, corps: b.corps, origineCoordonnees: b.origineCoordonnees };
  const [t, setT] = useState<Texte>(initial);
  const [message, setMessage] = useState("");
  const [enCours, demarrer] = useTransition();
  const modifie = t.objet !== b.objet || t.corps !== b.corps || t.origineCoordonnees !== b.origineCoordonnees;

  function changer(champ: keyof Texte, valeur: string) {
    const n = { ...t, [champ]: valeur };
    setT(n);
    onModifie(n.objet !== b.objet || n.corps !== b.corps || n.origineCoordonnees !== b.origineCoordonnees);
  }

  function sauver() {
    setMessage("");
    demarrer(async () => {
      const r = await enregistrer(b.id, t);
      if (r.ok) {
        onModifie(false);
        notifier("Brouillon enregistré");
        router.refresh();
      } else setMessage(r.message);
    });
  }

  function enlever() {
    demarrer(async () => {
      await retirer(b.id);
      onModifie(false);
      notifier(`${b.entrepriseNom} retiré du lot`);
      router.refresh();
    });
  }

  return (
    <article aria-label={`Brouillon ${b.entrepriseNom}`} className={`rounded-2xl bg-white p-5 ring-1 ${b.aCorriger ? "ring-lavande" : "ring-annotation/20"}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold text-titre">
          {b.entrepriseNom} <span className="text-sm font-normal text-annotation">· {b.entrepriseVille} · {b.modele}</span>
        </p>
        <p className="text-sm text-titre">
          À : <span className="font-semibold">{b.destinataire}</span>
        </p>
      </div>
      <div className="space-y-3">
        <Champ libelle="Objet" obligatoire>
          <input className="champ" value={t.objet} onChange={(e) => changer("objet", e.target.value)} maxLength={200} />
        </Champ>
        <Champ libelle="Message" obligatoire>
          <textarea className="champ min-h-[22rem] font-sans leading-relaxed" value={t.corps} onChange={(e) => changer("corps", e.target.value)} maxLength={5000} />
        </Champ>
        <Champ libelle="Origine des coordonnées (en bas du message)" obligatoire>
          <input className="champ" value={t.origineCoordonnees} onChange={(e) => changer("origineCoordonnees", e.target.value)} maxLength={300} />
        </Champ>
        <div>
          <p className="mb-1 text-xs font-medium text-titre">Bas du message, ajouté automatiquement</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-creme p-3 font-sans text-xs text-annotation">
            {identite ? piedDePage(identite, t.origineCoordonnees) : "Configure ta boîte mail pour voir ton identité ici."}
          </pre>
        </div>
      </div>
      {(message || b.aCorriger) && (
        <p role="alert" className="message-erreur mt-2">
          {message || b.aCorriger}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <button type="button" className="bouton" disabled={!modifie || enCours} onClick={sauver}>
          Enregistrer
        </button>
        <button type="button" className="rounded-lg px-4 py-2 text-sm font-semibold text-bouton hover:bg-lavande/30" disabled={enCours} onClick={enlever}>
          Retirer du lot
        </button>
      </div>
    </article>
  );
}
