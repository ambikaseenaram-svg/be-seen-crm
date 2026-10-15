import { NextResponse, type NextRequest } from "next/server";
import { NOM_COOKIE, lireJeton } from "@/lib/auth/jeton";

// Toute page non connectée redirige vers /connexion, avec retour à la page demandée.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const jeton = req.cookies.get(NOM_COOKIE)?.value;
  const session = await lireJeton(jeton);

  if (pathname === "/deconnexion") return NextResponse.next();

  if (pathname === "/connexion") {
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/connexion", req.url);
    url.searchParams.set("retour", pathname + search);
    if (jeton) url.searchParams.set("expire", "1");
    const reponse = NextResponse.redirect(url);
    if (jeton) reponse.cookies.delete(NOM_COOKIE);
    return reponse;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
