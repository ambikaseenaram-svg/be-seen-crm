import { NextResponse, type NextRequest } from "next/server";
import { utilisatriceConnectee } from "@/lib/auth/session";
import { aujourdhui } from "@/lib/dates";
import { exporter, TYPES_EXPORT, type TypeExport } from "@/lib/donnees/export";

export const dynamic = "force-dynamic";

const NOMS: Record<TypeExport, string> = { prospects: "prospects", affaires: "affaires", echanges: "echanges" };
const CLES_ENTREPRISE = ["q", "secteur", "departement", "origine", "etape", "priorite", "optout"] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  if (!(await utilisatriceConnectee())) return new NextResponse("Non connectée.", { status: 401 });
  const { type } = await params;
  if (!TYPES_EXPORT.includes(type as TypeExport)) return new NextResponse("Export inconnu.", { status: 404 });

  const p = req.nextUrl.searchParams;
  const filtresEntreprises = Object.fromEntries(CLES_ENTREPRISE.map((c) => [c, p.get(c) || undefined]));
  const { csv } = exporter(type as TypeExport, filtresEntreprises, { type: p.get("type") || undefined, resultat: p.get("resultat") || undefined });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="be-seen-${NOMS[type as TypeExport]}-${aujourdhui()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
