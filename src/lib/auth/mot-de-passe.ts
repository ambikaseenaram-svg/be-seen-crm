import bcrypt from "bcryptjs";

export const MOT_DE_PASSE_MIN = 10;

export function hacherMotDePasse(motDePasse: string) {
  return bcrypt.hash(motDePasse, 12);
}

export function verifierMotDePasse(motDePasse: string, hash: string) {
  return bcrypt.compare(motDePasse, hash);
}
