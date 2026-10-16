"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Fenetre from "./ui/Fenetre";
import { Champ, Liste } from "./ui/Champ";
import { useApp } from "./Fournisseur";
import { ORIGINES, SECTEURS } from "@/lib/listes";
import { ajoutRapide } from "@/app/(app)/entreprises/actions";
import type { Erreurs } from "@/lib/validation";

const VIDE = { nom: "", ville: "", origine: "", secteur: "", contactNom: "", telephone: "", instagramUrl: "" };

export default function AjoutRapide({ onFermer }: { onFermer: () => void }) {
  const router = useRouter();
  const { notifier } = useApp();
  const [f, setF] = useState(VIDE);
  const [plus, setPlus] = useState(false);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [doublon, setDoublon] = useState<{ id: string; nom: string; ville: string } | null>(null);
  const [message, setMessage] = useState("");
  const [enCours, demarrer] = useTransition();

  const changer = (champ: keyof typeof VIDE) => (v: string) => {
    setF((x) => ({ ...x, [champ]: v }));
    setErreurs((e) => ({ ...e, [champ]: "" }));
    if (champ === "nom" || champ === "ville") setDoublon(null);
  };

  function enregistrer(uneAutre: boolean, forcer = false) {
    // Contrôle immédiat des champs obligatoires, avant l'appel au serveur.
    const manquants: Erreurs = {};
    for (const c of ["nom", "ville", "origine"] as const) if (!f[c].trim()) manquants[c] = "Ce champ est obligatoire.";
    if (Object.keys(manquants).length) return setErreurs(manquants);

    demarrer(async () => {
      const r = await ajoutRapide({ ...f, forcer });
      if (r.ok) {
        notifier("Enregistré");
        router.refresh();
        if (uneAutre) {
          // On garde la ville et l'origine : pratique pendant une tournée.
          setF({ ...VIDE, ville: f.ville, origine: f.origine });
          setDoublon(null);
          setMessage("");
          document.querySelector<HTMLInputElement>("#ajout-nom")?.focus();
        } else {
          onFermer();
          router.push(`/entreprises?fiche=${r.id}`);
        }
        return;
      }
      if (r.doublon) return setDoublon(r.doublon);
      setErreurs(r.erreurs ?? {});
      setMessage(r.message ?? "");
    });
  }

  return (
    <Fenetre titre="Ajout rapide" onFermer={onFermer}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enregistrer(false);
        }}
        className="space-y-4"
        noValidate
      >
        <Champ libelle="Entreprise" obligatoire erreur={erreurs.nom}>
          <input id="ajout-nom" className={`champ ${erreurs.nom ? "champ-erreur" : ""}`} value={f.nom} onChange={(e) => changer("nom")(e.target.value)} />
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Ville" obligatoire erreur={erreurs.ville}>
            <input className={`champ ${erreurs.ville ? "champ-erreur" : ""}`} value={f.ville} onChange={(e) => changer("ville")(e.target.value)} />
          </Champ>
          <Champ libelle="Origine" obligatoire erreur={erreurs.origine}>
            <Liste valeurs={ORIGINES} value={f.origine} onChange={changer("origine")} vide="Choisir…" erreur={!!erreurs.origine} />
          </Champ>
        </div>

        <button type="button" onClick={() => setPlus((p) => !p)} className="text-sm font-medium text-bouton hover:text-violet">
          {plus ? "▾" : "▸"} Plus de champs (secteur, contact, téléphone, Instagram)
        </button>
        {plus && (
          <div className="grid grid-cols-2 gap-3">
            <Champ libelle="Secteur">
              <Liste valeurs={SECTEURS} value={f.secteur} onChange={changer("secteur")} />
            </Champ>
            <Champ libelle="Contact">
              <input className="champ" value={f.contactNom} onChange={(e) => changer("contactNom")(e.target.value)} />
            </Champ>
            <Champ libelle="Téléphone">
              <input className="champ" value={f.telephone} onChange={(e) => changer("telephone")(e.target.value)} />
            </Champ>
            <Champ libelle="Instagram">
              <input className="champ" placeholder="@compte" value={f.instagramUrl} onChange={(e) => changer("instagramUrl")(e.target.value)} />
            </Champ>
          </div>
        )}

        {doublon && (
          <div role="alert" className="rounded-lg bg-lavande/40 p-3 text-sm text-titre">
            Une fiche existe déjà : <strong>{doublon.nom}</strong> ({doublon.ville}).
            <div className="mt-2 flex gap-4">
              <button
                type="button"
                className="font-semibold text-bouton underline"
                onClick={() => {
                  onFermer();
                  router.push(`/entreprises?fiche=${doublon.id}`);
                }}
              >
                Ouvrir
              </button>
              <button type="button" className="font-semibold text-bouton underline" onClick={() => enregistrer(false, true)}>
                Créer quand même
              </button>
            </div>
          </div>
        )}
        {message && <p className="message-erreur">{message}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" disabled={enCours} onClick={() => enregistrer(true)} className="rounded-lg px-4 py-2 text-sm font-semibold text-bouton ring-1 ring-bouton/40 hover:bg-creme disabled:opacity-40">
            Enregistrer et ajouter une autre
          </button>
          <button type="submit" disabled={enCours} className="bouton">
            Enregistrer
          </button>
        </div>
      </form>
    </Fenetre>
  );
}
