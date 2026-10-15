// Jeton de session signé. Sans dépendance à la base : utilisable dans le middleware.
import { SignJWT, jwtVerify } from "jose";

export const NOM_COOKIE = "be_seen_session";
export const DUREE_SESSION_S = 60 * 60 * 24 * 7; // 7 jours

export type ContenuSession = { uid: string; v: number };

function cle() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET absent ou trop court. Lance « npm run installer ».");
  }
  return new TextEncoder().encode(secret);
}

export async function signerJeton(contenu: ContenuSession) {
  return new SignJWT(contenu)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SESSION_S}s`)
    .sign(cle());
}

export async function lireJeton(jeton: string | undefined): Promise<ContenuSession | null> {
  if (!jeton) return null;
  try {
    const { payload } = await jwtVerify(jeton, cle(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "string" || typeof payload.v !== "number") return null;
    return { uid: payload.uid, v: payload.v };
  } catch {
    return null;
  }
}
