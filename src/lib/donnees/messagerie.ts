import "server-only";
import nodemailer from "nodemailer";

// Réglages lus dans .env.local, côté serveur uniquement : le mot de passe n'est jamais envoyé au navigateur.
const VARIABLES = {
  SMTP_HOTE: "le serveur d'envoi (ex. smtp.gmail.com)",
  SMTP_UTILISATEUR: "l'identifiant de ta boîte mail",
  SMTP_MOT_DE_PASSE: "le mot de passe d'application",
  EMAIL_NOM: "ton nom de signature",
  EMAIL_IDENTITE: "ta ligne d'identité en bas des emails",
} as const;

export type Messagerie = {
  hote: string;
  port: number;
  utilisateur: string;
  motDePasse: string;
  expediteur: string;
  nom: string;
  identite: string;
};

// Ce qui peut être affiché à l'écran : jamais le mot de passe.
export type EtatMessagerie = { configuree: true; expediteur: string; nom: string; identite: string } | { configuree: false; manquants: string[] };

export function lireMessagerie(env = process.env): Messagerie | { manquants: string[] } {
  const manquants = (Object.keys(VARIABLES) as (keyof typeof VARIABLES)[]).filter((k) => !env[k]?.trim()).map((k) => `${k} (${VARIABLES[k]})`);
  if (manquants.length) return { manquants };
  return {
    hote: env.SMTP_HOTE!.trim(),
    port: Number(env.SMTP_PORT?.trim() || 465),
    utilisateur: env.SMTP_UTILISATEUR!.trim(),
    motDePasse: env.SMTP_MOT_DE_PASSE!,
    expediteur: env.EMAIL_EXPEDITEUR?.trim() || env.SMTP_UTILISATEUR!.trim(),
    nom: env.EMAIL_NOM!.trim(),
    identite: env.EMAIL_IDENTITE!.trim(),
  };
}

export function etatMessagerie(): EtatMessagerie {
  const m = lireMessagerie();
  return "manquants" in m ? { configuree: false, manquants: m.manquants } : { configuree: true, expediteur: m.expediteur, nom: m.nom, identite: m.identite };
}

export type Message = { a: string; objet: string; texte: string };

// Un email par destinataire, en texte simple, envoyé depuis ta propre boîte mail.
export async function envoyerMessage(m: Messagerie, msg: Message): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const transport = nodemailer.createTransport({
    host: m.hote,
    port: m.port,
    secure: m.port === 465,
    auth: { user: m.utilisateur, pass: m.motDePasse },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  try {
    await transport.sendMail({
      from: { name: m.nom, address: m.expediteur },
      to: msg.a,
      subject: msg.objet,
      text: msg.texte,
      // Bouton « Se désabonner » des messageries : il t'envoie un email « STOP ».
      list: { unsubscribe: { url: `mailto:${m.expediteur}?subject=STOP`, comment: "STOP" } },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, erreur: traduireErreur(e) };
  } finally {
    transport.close();
  }
}

function traduireErreur(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; message?: string };
  if (err.code === "EAUTH") return "Connexion refusée par ta boîte mail : vérifie l'identifiant et le mot de passe d'application.";
  if (err.code === "ETIMEDOUT" || err.code === "ECONNECTION" || err.code === "ESOCKET" || err.code === "EDNS")
    return "Serveur mail injoignable : vérifie SMTP_HOTE, SMTP_PORT et ta connexion internet.";
  if (err.responseCode && err.responseCode >= 500) return `Adresse refusée par le serveur mail (${err.responseCode}).`;
  return `Échec de l'envoi : ${err.message ?? "erreur inconnue"}`.slice(0, 300);
}
