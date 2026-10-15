import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE } from "@/lib/auth/jeton";

// Efface une session devenue invalide (ex. mot de passe changé) puis renvoie vers /connexion.
export function GET(req: NextRequest) {
  const reponse = NextResponse.redirect(new URL("/connexion?expire=1", req.url));
  reponse.cookies.delete(NOM_COOKIE);
  return reponse;
}
