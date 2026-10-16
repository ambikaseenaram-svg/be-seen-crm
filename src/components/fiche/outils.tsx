"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../Fournisseur";
import type { Resultat } from "@/app/(app)/entreprises/actions";
import type { Erreurs } from "@/lib/validation";

// Appel d'une action serveur avec gestion des erreurs par champ et notification « Enregistré ».
export function useSauvegarde() {
  const router = useRouter();
  const { notifier } = useApp();
  const [enCours, demarrer] = useTransition();
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [message, setMessage] = useState("");

  function sauver(action: () => Promise<Resultat>, apres?: () => void) {
    setMessage("");
    demarrer(async () => {
      try {
        const r = await action();
        if (r.ok) {
          setErreurs({});
          notifier("Enregistré");
          apres?.();
          router.refresh();
        } else {
          setErreurs(r.erreurs ?? {});
          setMessage(r.message ?? "");
        }
      } catch {
        setMessage("Connexion perdue. Tes dernières modifications n'ont pas été enregistrées.");
      }
    });
  }

  return { enCours, erreurs, message, sauver, setErreurs };
}

export function Section({
  titre,
  actions,
  children,
}: {
  titre: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-annotation/20 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-titre">{titre}</h3>
        <div className="flex gap-3">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export function BoutonLien({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm font-semibold ${danger ? "text-[#c0392b] hover:underline" : "text-bouton hover:text-violet"}`}
    >
      {children}
    </button>
  );
}

// Affichage d'une valeur ; un champ « Indispensable » vide est signalé « À compléter ».
export function Valeur({
  libelle,
  valeur,
  indispensable,
  className = "",
}: {
  libelle: string;
  valeur: React.ReactNode;
  indispensable?: boolean;
  className?: string;
}) {
  const vide = valeur == null || valeur === "";
  return (
    <div className={className}>
      <dt className="text-xs text-annotation">{libelle}</dt>
      <dd className="text-sm text-titre">
        {vide ? (
          indispensable ? (
            <span className="inline-block rounded bg-lavande/35 px-1.5 text-xs text-titre">À compléter</span>
          ) : (
            <span className="text-annotation">—</span>
          )
        ) : (
          valeur
        )}
      </dd>
    </div>
  );
}

export function BoutonsEdition({ enCours, onAnnuler, message }: { enCours: boolean; onAnnuler: () => void; message?: string }) {
  return (
    <div className="col-span-2 mt-2 flex items-center justify-end gap-3">
      {message && <p className="message-erreur mr-auto">{message}</p>}
      <button type="button" onClick={onAnnuler} className="text-sm text-annotation hover:text-titre">
        Annuler
      </button>
      <button type="submit" disabled={enCours} className="bouton">
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

// Convertit les null en "" pour des champs de formulaire contrôlés.
export function versFormulaire<T extends Record<string, unknown>>(o: T): Record<keyof T, string> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? "" : String(v)])) as Record<keyof T, string>;
}
