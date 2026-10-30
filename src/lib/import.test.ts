import { describe, expect, it } from "vitest";
import { detecterColonnes, erreurCorrespondance, lieuDansAdresse, lireCsv, lireLigne } from "./import";

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
    const l = lireLigne(["A", "Meaux", "", "", "612345678", "", "Plomberie", "", "Facebook"], c, "Salon", 2);
    expect(l.valeurs.telephone).toBe("0612345678");
    expect(l.valeurs.secteur).toBeNull();
    expect(l.valeurs.origine).toBe("Salon");
    expect(l.avertissements).toHaveLength(3);
    expect(lireLigne(["A", "Meaux", "", "", "", "", "", "", "instagram"], c, "Salon", 2).valeurs.origine).toBe("Instagram");
  });
});

describe("export Google (Places)", () => {
  const entetes = ["nom", "adresse", "telephone", "site_web", "type", "note", "nombre_avis", "siret", "code_postal", "commune", "source", "ville"];
  const c = detecterColonnes(entetes);
  const ligne = (adresse: string, siret = "", cp = "", ville = "Champigny-sur-Marne") =>
    lireLigne(["Bakery 27", adresse, "", "", "Boulangerie", "4.3", "127", siret, cp, "", "Google Places API", ville], c, "Salon", 2);

  it("« ville » passe avant « commune », « note » (sur 5) n'est pas un angle d'accroche, « site_web » et « type » sont reconnus", () => {
    expect(c).toEqual(["nom", "adresse", "telephone", "siteUrl", "secteur", null, null, "siret", "codePostal", null, "origine", "ville"]);
  });

  it("ville et département pris dans l'adresse, secteur déduit du métier, source Google reconnue", () => {
    const l = ligne("27 Av. Nelson Mandela, 94350 Villiers-sur-Marne");
    expect(l.valeurs).toMatchObject({ ville: "Villiers-sur-Marne", departement: "94", secteur: "Commerce de bouche", origine: "Google Maps" });
    expect(l.avertissements).toEqual(["Ville prise dans l'adresse : Villiers-sur-Marne (et non Champigny-sur-Marne)"]);
    expect(ligne("Rue Diderot, 94500 Champigny-sur-Marne").avertissements).toEqual([]);
  });

  it("SIRET d'une autre commune écarté, SIRET cohérent gardé", () => {
    const faux = ligne("28 Rte de la Libération, 94430 Chennevières-sur-Marne", "39220254500035", "83160");
    expect(faux.valeurs.siret).toBeNull();
    expect(faux.avertissements.join()).toContain("SIRET écarté");
    expect(ligne("Rue Diderot, 94500 Champigny-sur-Marne", "52995893600013", "94500").valeurs.siret).toBe("52995893600013");
  });

  it("lieuDansAdresse", () => {
    expect(lieuDansAdresse("Centre Commercial, 19 Bd Jean Monnet, 94360 Bry-sur-Marne")).toEqual({ codePostal: "94360", ville: "Bry-sur-Marne" });
    expect(lieuDansAdresse("D3, 94500 Champigny-sur-Marne")?.ville).toBe("Champigny-sur-Marne");
    expect(lieuDansAdresse("12 rue de la Paix")).toBeNull();
  });
});
