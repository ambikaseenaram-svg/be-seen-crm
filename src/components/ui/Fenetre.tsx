"use client";

import { useEffect, useRef } from "react";

export default function Fenetre({
  titre,
  onFermer,
  children,
  largeur = "max-w-lg",
}: {
  titre: string;
  onFermer: () => void;
  children: React.ReactNode;
  largeur?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onFermer();
      }
    };
    // Capture : la fenêtre se ferme avant le panneau qui est derrière.
    window.addEventListener("keydown", surTouche, true);
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => window.removeEventListener("keydown", surTouche, true);
  }, [onFermer]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-titre/30 px-4 pt-[10vh]" onMouseDown={onFermer}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={`w-full ${largeur} rounded-2xl bg-white p-6 shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-titre">{titre}</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="text-2xl leading-none text-annotation hover:text-titre">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
