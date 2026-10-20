"use client";

import { useState } from "react";
import FenetreInteraction, { type CibleInteraction } from "./FenetreInteraction";
import Fenetre from "../ui/Fenetre";
import { Champ } from "../ui/Champ";

// Depuis le Journal : choisir l'entreprise (saisie avec suggestions), puis remplir l'interaction.
export default function NouvelleInteraction({ entreprises }: { entreprises: (CibleInteraction & { ville: string })[] }) {
  const [etape, setEtape] = useState<"ferme" | "choix" | "saisie">("ferme");
  const [saisie, setSaisie] = useState("");
  const [cible, setCible] = useState<CibleInteraction | null>(null);
  const [erreur, setErreur] = useState("");
  const libelle = (e: { nom: string; ville: string }) => `${e.nom} — ${e.ville}`;
  const fermer = () => {
    setEtape("ferme");
    setSaisie("");
    setCible(null);
    setErreur("");
  };

  return (
    <>
      <button type="button" onClick={() => setEtape("choix")} className="bouton">+ Nouvelle interaction</button>
      {etape === "choix" && (
        <Fenetre titre="Quelle entreprise ?" onFermer={fermer}>
          <form
            noValidate
            onSubmit={(ev) => {
              ev.preventDefault();
              const trouvee = entreprises.find((e) => libelle(e) === saisie || e.nom === saisie);
              if (!trouvee) return setErreur("Choisis une entreprise dans la liste.");
              setCible(trouvee);
              setEtape("saisie");
            }}
          >
            <Champ libelle="Entreprise" obligatoire erreur={erreur}>
              <input list="liste-entreprises" className={`champ ${erreur ? "champ-erreur" : ""}`} value={saisie} onChange={(ev) => setSaisie(ev.target.value)} autoComplete="off" />
            </Champ>
            <datalist id="liste-entreprises">
              {entreprises.filter((e) => !e.optOut).map((e) => (
                <option key={e.id} value={libelle(e)} />
              ))}
            </datalist>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={fermer} className="text-sm text-annotation hover:text-titre">Annuler</button>
              <button type="submit" className="bouton">Continuer</button>
            </div>
          </form>
        </Fenetre>
      )}
      {etape === "saisie" && cible && <FenetreInteraction cible={cible} onFermer={fermer} />}
    </>
  );
}
