import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { entreprises, envois, interactions, type Envoi } from "@/db/schema";
import { aujourdhui } from "@/lib/dates";
import {
  MAX_PAR_JOUR,
  MAX_PAR_LOT,
  aCorriger,
  composerBrouillon,
  eligibilite,
  messageComplet,
  piedDePage,
  type Eligibilite,
  type EnvoiPasse,
} from "@/lib/emails";
import { listerEntreprises, obtenirEntreprise, type LigneEntreprise } from "./entreprises";
import { creerInteraction } from "./interactions";
import type { Message, Messagerie } from "./messagerie";

function envoisPasses(entrepriseId: string): (EnvoiPasse & { objet: string })[] {
  return db
    .select({ modele: envois.modele, statut: envois.statut, envoyeLe: envois.envoyeLe, objet: envois.objet })
    .from(envois)
    .where(and(eq(envois.entrepriseId, entrepriseId), ne(envois.statut, "Brouillon")))
    .all();
}

function resultats(entrepriseId: string): string[] {
  return db.select({ r: interactions.resultat }).from(interactions).where(eq(interactions.entrepriseId, entrepriseId)).all().map((l) => l.r);
}

const evaluer = (e: LigneEntreprise, jour: string) => eligibilite(e, envoisPasses(e.id), resultats(e.id), jour);

// Pour la liste des prospects : qui peut être sélectionné, et sinon pourquoi.
export function eligibilites(jour = aujourdhui()): Record<string, Eligibilite> {
  return Object.fromEntries(listerEntreprises().map((e) => [e.id, evaluer(e, jour)]));
}

export type LigneEnvoi = Envoi & { entrepriseNom: string; entrepriseVille: string; optOut: boolean; aCorriger: string | null };

function lignesEnvois(brouillons: boolean): LigneEnvoi[] {
  return db
    .select({ v: envois, entrepriseNom: entreprises.nom, entrepriseVille: entreprises.ville, optOut: entreprises.optOut })
    .from(envois)
    .innerJoin(entreprises, eq(entreprises.id, envois.entrepriseId))
    .where(brouillons ? eq(envois.statut, "Brouillon") : ne(envois.statut, "Brouillon"))
    .orderBy(brouillons ? envois.creeLe : desc(envois.envoyeLe))
    .all()
    .map(({ v, entrepriseNom, entrepriseVille, optOut }) => ({ ...v, entrepriseNom, entrepriseVille, optOut, aCorriger: brouillons ? aCorriger(v) : null }));
}

export const listerBrouillons = () => lignesEnvois(true);
export const listerJournalEnvois = (limite = 200) => lignesEnvois(false).slice(0, limite);

// Prospects dont le premier email est parti depuis assez longtemps, sans réponse ni opposition.
export function listerRelancesPossibles(jour = aujourdhui()) {
  const enBrouillon = new Set(listerBrouillons().map((b) => b.entrepriseId));
  return listerEntreprises()
    .filter((e) => !enBrouillon.has(e.id))
    .filter((e) => {
      const r = evaluer(e, jour);
      return r.ok && r.modele === "Relance";
    })
    .map((e) => ({ id: e.id, nom: e.nom, ville: e.ville, email: e.email as string }));
}

export type Preparation = { prepares: number; ignores: { nom: string; raison: string }[] };

// Un brouillon par prospect sélectionné, sur une adresse déjà enregistrée sur sa fiche.
export function preparerBrouillons(ids: string[], signature: string, jour = aujourdhui()): Preparation {
  const ignores: Preparation["ignores"] = [];
  let prepares = 0;
  let place = MAX_PAR_LOT - listerBrouillons().length;
  for (const id of ids) {
    const e = obtenirEntreprise(id);
    if (!e) continue;
    const deja = db.select({ id: envois.id }).from(envois).where(and(eq(envois.entrepriseId, id), eq(envois.statut, "Brouillon"))).get();
    if (deja) {
      ignores.push({ nom: e.nom, raison: "Brouillon déjà prêt" });
      continue;
    }
    const r = evaluer(e, jour);
    if (!r.ok) {
      ignores.push({ nom: e.nom, raison: r.raison });
      continue;
    }
    if (place <= 0) {
      ignores.push({ nom: e.nom, raison: `Lot complet (${MAX_PAR_LOT} emails au plus)` });
      continue;
    }
    const premier = r.modele === "Relance" ? envoisPasses(id).find((v) => v.modele === "Premier email" && v.statut === "Envoyé") : undefined;
    const b = composerBrouillon(e, r.modele, signature, premier);
    db.insert(envois)
      .values({ entrepriseId: id, modele: r.modele, destinataire: (e.email as string).trim(), ...b, statut: "Brouillon" })
      .run();
    prepares++;
    place--;
  }
  return { prepares, ignores };
}

export function modifierBrouillon(id: string, d: { objet: string; corps: string; origineCoordonnees: string }): boolean {
  const r = db
    .update(envois)
    .set({ ...d, modifieLe: new Date().toISOString() })
    .where(and(eq(envois.id, id), eq(envois.statut, "Brouillon")))
    .run();
  return r.changes > 0;
}

export function retirerBrouillon(id: string): boolean {
  return db.delete(envois).where(and(eq(envois.id, id), eq(envois.statut, "Brouillon"))).run().changes > 0;
}

function envoyesLe(jour: string): number {
  return db
    .select({ statut: envois.statut, envoyeLe: envois.envoyeLe })
    .from(envois)
    .all()
    .filter((v) => (v.statut === "Envoyé" || v.statut === "En cours") && v.envoyeLe && aujourdhui(new Date(v.envoyeLe)) === jour).length;
}

export type BilanEnvoi = { ok: true; envoyes: number; echecs: number; exclus: { nom: string; raison: string }[] } | { ok: false; message: string };

function exclure(id: string, raison: string) {
  db.update(envois).set({ statut: "Exclu", raison, modifieLe: new Date().toISOString() }).where(eq(envois.id, id)).run();
}

type Options = { jour?: string; pauseMs?: number; envoyer: (m: Messagerie, msg: Message) => Promise<{ ok: true } | { ok: false; erreur: string }> };

// Envoie le lot que tu as relu et validé, et lui seul. Chaque prospect est revérifié juste avant son envoi.
export async function envoyerLot(idsValides: string[], m: Messagerie, { jour = aujourdhui(), pauseMs = 1500, envoyer }: Options): Promise<BilanEnvoi> {
  const lot = listerBrouillons();
  const attendus = new Set(idsValides);
  if (lot.length === 0) return { ok: false, message: "Aucun brouillon à envoyer." };
  if (lot.length !== attendus.size || lot.some((b) => !attendus.has(b.id)))
    return { ok: false, message: "Le lot a changé depuis ta relecture : relis-le puis valide à nouveau. Rien n'a été envoyé." };
  const bloque = lot.find((b) => b.aCorriger);
  if (bloque) return { ok: false, message: `${bloque.entrepriseNom} : ${bloque.aCorriger}. Rien n'a été envoyé.` };
  const deja = envoyesLe(jour);
  if (deja + lot.length > MAX_PAR_JOUR)
    return { ok: false, message: `Plafond de ${MAX_PAR_JOUR} emails par jour : ${deja} déjà envoyé${deja > 1 ? "s" : ""} aujourd'hui. Retire des brouillons ou envoie demain. Rien n'a été envoyé.` };

  let envoyes = 0;
  let echecs = 0;
  const exclus: { nom: string; raison: string }[] = [];
  for (const [i, b] of lot.entries()) {
    // Revérification au dernier moment : opposition, réponse, adresse, étape, email déjà parti.
    const e = obtenirEntreprise(b.entrepriseId);
    const r = e ? evaluer(e, jour) : ({ ok: false, raison: "Fiche supprimée" } as const);
    const raison = !r.ok ? r.raison : r.modele !== b.modele ? `« ${b.modele} » n'est plus attendu` : e?.email?.trim() !== b.destinataire ? "Adresse modifiée depuis la préparation" : null;
    if (raison) {
      exclure(b.id, raison);
      exclus.push({ nom: b.entrepriseNom, raison });
      continue;
    }

    // Réservation : l'index unique de la base refuse un second envoi du même email au même prospect.
    let reserve = false;
    try {
      reserve = db.update(envois).set({ statut: "En cours", envoyeLe: new Date().toISOString() }).where(and(eq(envois.id, b.id), eq(envois.statut, "Brouillon"))).run().changes > 0;
    } catch {
      exclure(b.id, "Déjà envoyé");
      exclus.push({ nom: b.entrepriseNom, raison: "Déjà envoyé" });
      continue;
    }
    if (!reserve) continue;

    if (i > 0 && pauseMs) await new Promise((ok) => setTimeout(ok, pauseMs));
    const res = await envoyer(m, { a: b.destinataire, objet: b.objet, texte: messageComplet(b.corps, piedDePage(m.identite, b.origineCoordonnees)) });
    const maintenant = new Date().toISOString();
    if (res.ok) {
      db.update(envois).set({ statut: "Envoyé", raison: null, envoyeLe: maintenant, modifieLe: maintenant }).where(eq(envois.id, b.id)).run();
      envoyes++;
      try {
        creerInteraction(b.entrepriseId, {
          date: jour,
          type: b.modele === "Relance" ? "Relance" : "Premier contact",
          canal: "Email",
          resultat: "Pas de réponse",
          decideurRencontre: false,
          note: `Email envoyé depuis le CRM : « ${b.objet} »`,
          avancerAffaire: true,
        });
      } catch (err) {
        console.error(err); // l'email est parti et reste journalisé dans les envois
      }
    } else {
      db.update(envois).set({ statut: "Échec", raison: res.erreur, envoyeLe: maintenant, modifieLe: maintenant }).where(eq(envois.id, b.id)).run();
      echecs++;
    }
  }
  return { ok: true, envoyes, echecs, exclus };
}
