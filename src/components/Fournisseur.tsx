"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import AjoutRapide from "./AjoutRapide";

type Contexte = {
  notifier: (message: string) => void;
  ouvrirAjoutRapide: () => void;
};

const Ctx = createContext<Contexte | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp hors du Fournisseur");
  return c;
}

function estChampDeSaisie(cible: EventTarget | null) {
  const el = cible as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export default function Fournisseur({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  // Confirmation discrète en bas à droite, qui disparaît seule après 3 secondes.
  const notifier = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setNotifications((n) => [...n, { id, message }]);
    setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), 3000);
  }, []);

  const ouvrirAjoutRapide = useCallback(() => setAjoutOuvert(true), []);

  // Raccourci clavier N : ajout rapide (sauf pendant une saisie ou quand une fenêtre est ouverte).
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (estChampDeSaisie(e.target) || document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      setAjoutOuvert(true);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  return (
    <Ctx.Provider value={{ notifier, ouvrirAjoutRapide }}>
      {children}
      {ajoutOuvert && <AjoutRapide onFermer={() => setAjoutOuvert(false)} />}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] space-y-2" aria-live="polite">
        {notifications.map((n) => (
          <p key={n.id} className="rounded-lg bg-titre px-4 py-2 text-sm text-white shadow-lg">
            {n.message}
          </p>
        ))}
      </div>
    </Ctx.Provider>
  );
}
