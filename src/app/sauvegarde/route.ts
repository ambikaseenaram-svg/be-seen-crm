import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { utilisatriceConnectee } from "@/lib/auth/session";
import { aujourdhui } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Copie complète et cohérente de la base (même pendant que le CRM tourne), envoyée en téléchargement.
export async function GET() {
  if (!(await utilisatriceConnectee())) return new NextResponse("Non connectée.", { status: 401 });
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "be-seen-"));
  const copie = path.join(dossier, "sauvegarde.db");
  try {
    await db.$client.backup(copie);
    const contenu = fs.readFileSync(copie);
    return new NextResponse(contenu, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="be-seen-sauvegarde-${aujourdhui()}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
}
