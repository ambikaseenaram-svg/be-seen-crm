import { describe, expect, it } from "vitest";
import { detecterColonnes, erreurCorrespondance, lireCsv, lireLigne } from "./import";

describe("lireCsv", () => {
  it("Excel français : « ; », BOM, guillemets, retour à la ligne dans une cellule, lignes vides", () => {
    const t = '﻿Nom;Ville;Notes\r\nLe "Petit" Bistrot;Meaux;"Chef ; ancien du Ritz\r\nterrasse"\r\n;;\r\n"La ""Cave""";Lagny\r\n';
    expect(lireCsv(t)).toEqual([
      ["Nom", "Ville", "Notes"],
      ['Le "Petit" Bistrot', "Meaux", "Chef ; ancien du Ritz\r\nterrasse"],
      ['La "Cave"', "Lagny"],
    ]);
  });

  it("séparateur « , » reconnu", () => {
    expect(lireCsv("Nom,Ville\nA,Meaux")).toEqual([["Nom", "Ville"], ["A", "Meaux"]]);
  });
});

describe("colonnes", () => {
  it("reconnaît les titres courants, sans accents ni majuscules, et ignore le reste", () => {
    expect(detecterColonnes(["Nom du restaurant", "Ville", "Téléphone", "E-mail", "Instagram", "Abonnés", "Notes", "Budget"])).toEqual([
      "nom", "ville", "telephone", "email", "instagramUrl", "abonnesInsta", "angleAccroche", null,
    ]);
  });

  it("relit un export du CRM", () => {
    const c = detecterColonnes(["Nom", "Ville", "Adresse", "SIRET", "Département", "Secteur", "Étape", "Contact", "Téléphone", "Email", "Origine"]);
    expect(c).toEqual(["nom", "ville", "adresse", "siret", "departement", "secteur", null, "contactNom", "telephone", "email", "origine"]);
  });

  it("nom et ville obligatoires, une colonne par champ", () => {
    expect(erreurCorrespondance(["nom", null])).toContain("ville");
    expect(erreurCorrespondance(["nom", "ville", "email", "email"])).toContain("Deux colonnes");
    expect(erreurCorrespondance(["nom", "ville"])).toBeNull();
  });
});

describe("lireLigne", () => {
  const c = detecterColonnes(["Nom", "Ville", "Code postal", "SIRET", "Téléphone", "Email", "Secteur", "Abonnés", "Origine"]);

  it("garde les valeurs telles quelles et ne remplit rien d'autre", () => {
    const l = lireLigne(["Bistrot", "Meaux", "77100", "393 721 626 00033", "06 12 34 56 78", "contact@bistrot.fr", "restaurant", "1 250", ""], c, "Passage physique", 2);
    expect(l.erreurs).toEqual([]);
    expect(l.valeurs).toEqual({
      nom: "Bistrot", ville: "Meaux", adresse: null, siret: "39372162600033", secteur: "Restaurant", departement: "77",
      contactNom: null, telephone: "06 12 34 56 78", email: "contact@bistrot.fr", instagramUrl: null, siteUrl: null,
      abonnesInsta: 1250, angleAccroche: null, origine: "Passage physique",
    });
  });

  it("erreurs : nom ou ville manquant, email invalide, SIRET abîmé par Excel", () => {
    expect(lireLigne(["", "Meaux", "", "", "", "", "", "", ""], c, "Salon", 2).erreurs).toEqual(["Nom manquant"]);
    expect(lireLigne(["A", "Meaux", "", "", "", "contact@", "", "", ""], c, "Salon", 2).erreurs[0]).toContain("Email invalide");
    expect(lireLigne(["A", "Meaux", "", "3,93722E+13", "", "", "", "", ""], c, "Salon", 2).erreurs[0]).toContain("abîmé par Excel");
  });

  it("avertissements : 0 du téléphone rétabli, secteur ou origine inconnus laissés de côté", () => {
    const l = lireLigne(["A", "Meaux", "", "", "612345678", "", "Traiteur", "", "Facebook"], c, "Salon", 2);
    expect(l.valeurs.telephone).toBe("0612345678");
    expect(l.valeurs.secteur).toBeNull();
    expect(l.valeurs.origine).toBe("Salon");
    expect(l.avertissements).toHaveLength(3);
    expect(lireLigne(["A", "Meaux", "", "", "", "", "", "", "instagram"], c, "Salon", 2).valeurs.origine).toBe("Instagram");
  });
});
