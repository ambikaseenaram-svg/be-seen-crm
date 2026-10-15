"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", libelle: "Tableau de bord" },
  { href: "/pipeline", libelle: "Pipeline" },
  { href: "/entreprises", libelle: "Entreprises" },
  { href: "/journal", libelle: "Journal" },
  { href: "/donnees", libelle: "Export et données" },
];

export default function BarreLaterale() {
  const chemin = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 flex w-56 flex-col bg-titre px-3 py-6 text-white">
      <p className="mb-8 px-3 text-xl font-extrabold tracking-[0.2em]">BE SEEN</p>
      <nav className="space-y-1">
        {LIENS.map(({ href, libelle }) => {
          const actif = href === "/" ? chemin === "/" : chemin.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                actif ? "bg-violet font-semibold" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {libelle}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
