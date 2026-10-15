"use client";

import { useActionState, useState } from "react";
import { seConnecter, type EtatConnexion } from "./actions";

export default function FormulaireConnexion({ retour }: { retour?: string }) {
  const [etat, action, enCours] = useActionState<EtatConnexion, FormData>(seConnecter, {});
  const [email, setEmail] = useState(etat.email ?? "");
  const [motDePasse, setMotDePasse] = useState("");
  const [touche, setTouche] = useState({ email: false, motDePasse: false });
  const [aideMdp, setAideMdp] = useState(false);

  const emailVide = email.trim() === "";
  const mdpVide = motDePasse === "";

  return (
    <form action={action} className="space-y-5" noValidate>
      {retour && <input type="hidden" name="retour" value={retour} />}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-titre">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouche((t) => ({ ...t, email: true }))}
          className={`champ ${touche.email && emailVide ? "champ-erreur" : ""}`}
        />
        {touche.email && emailVide && <p className="message-erreur">Ce champ est obligatoire.</p>}
      </div>

      <div>
        <label htmlFor="motDePasse" className="mb-1 block text-sm font-medium text-titre">
          Mot de passe
        </label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          onBlur={() => setTouche((t) => ({ ...t, motDePasse: true }))}
          className={`champ ${touche.motDePasse && mdpVide ? "champ-erreur" : ""}`}
        />
        {touche.motDePasse && mdpVide && <p className="message-erreur">Ce champ est obligatoire.</p>}
      </div>

      {etat.erreur && (
        <p role="alert" className="rounded-md bg-lavande/40 px-3 py-2 text-sm text-titre">
          {etat.erreur}
        </p>
      )}

      <button type="submit" disabled={emailVide || mdpVide || enCours} className="bouton w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setAideMdp((v) => !v)}
          className="text-sm text-annotation underline-offset-2 hover:underline"
        >
          Mot de passe oublié
        </button>
        {aideMdp && (
          <p className="mt-2 rounded-md bg-creme px-3 py-2 text-left text-sm text-titre ring-1 ring-annotation/30">
            Aucun email n&apos;est envoyé. Dans le dossier de l&apos;application, lance la commande{" "}
            <code className="rounded bg-white px-1">npm run compte:mdp</code> pour choisir un nouveau mot de passe.
          </p>
        )}
      </div>
    </form>
  );
}
