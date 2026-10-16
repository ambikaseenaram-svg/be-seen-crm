const COULEURS: Record<string, string> = {
  Vert: "bg-[#2e9e6b]",
  Jaune: "bg-[#e0a526]",
  Rouge: "bg-[#d64545]",
};

export function PastillePriorite({ priorite }: { priorite: string | null }) {
  if (!priorite) return <span className="text-xs text-annotation">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-titre">
      <span className={`h-2.5 w-2.5 rounded-full ${COULEURS[priorite]}`} aria-hidden />
      {priorite}
    </span>
  );
}

export function BadgeOptOut() {
  return (
    <span className="whitespace-nowrap rounded bg-titre px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">NE PLUS CONTACTER</span>
  );
}

export function BadgeDisqualifie() {
  return <span className="whitespace-nowrap rounded bg-[#d64545]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#a32f2f]">DISQUALIFIÉ</span>;
}
