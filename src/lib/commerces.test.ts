import { describe, expect, it } from "vitest";
import { analyserLieu, departementDe, extraireCommerces, filtreActiviteRespecte, formaterSiret, titreCase, TYPES_COMMERCE, type EtablissementApi, type ReponseApi } from "./commerces";

const type = (cle: string) => TYPES_COMMERCE.find((t) => t.cle === cle)!;

const etab = (o: Partial<EtablissementApi> & { siret: string }): EtablissementApi => ({
  etat_administratif: "A",
  activite_principale: "10.71C",
  adresse: null,
  libelle_commune: "VILLIERS-SUR-MARNE",
  commune: "94079",
  code_postal: "94350",
  liste_enseignes: null,
  statut_diffusion_etablissement: "O",
  ...o,
});

// Valeurs relevées sur de vraies requêtes à recherche-entreprises.api.gouv.fr (21/10/2026).
const REPONSE: ReponseApi = {
  total_results: 16,
  total_pages: 4,
  page: 1,
  results: [
    { nom_complet: "LA COMTESSE DE TREVISE", nom_raison_sociale: "LA COMTESSE DE TREVISE", activite_principale: "10.71C", nombre_etablissements_ouverts: 2, matching_etablissements: [etab({ siret: "39372162600033", adresse: "59 AVENUE BEAUREGARD 94350 VILLIERS-SUR-MARNE" })] },
    { nom_complet: "LE FOURNIL A.N.D.D.M.", nom_raison_sociale: "LE FOURNIL A.N.D.D.M.", activite_principale: "10.71C", nombre_etablissements_ouverts: 1, matching_etablissements: [etab({ siret: "94896558700017", adresse: "58 RUE DU GENERAL DE GAULLE 94350 VILLIERS-SUR-MARNE", liste_enseignes: ["BOULANGERIE DU CENTRE"] })] },
    { nom_complet: "LES PETITES DOUCEURS (LES PETITES DOUCEURS)", nom_raison_sociale: null, activite_principale: "10.71C", nombre_etablissements_ouverts: 1, matching_etablissements: [etab({ siret: "94162252400010", adresse: "30 RUE DU GENERAL DE GAULLE 94350 VILLIERS-SUR-MARNE" })] },
    // établissement fermé (« F ») d'une entreprise encore ouverte
    { nom_complet: "GERARD PEREIRA DA SILVA", nom_raison_sociale: null, activite_principale: "10.71C", nombre_etablissements_ouverts: 1, matching_etablissements: [etab({ siret: "43358647600031", etat_administratif: "F" })] },
    // chaîne : 270 établissements ouverts
    { nom_complet: "COTE BOULANGE", nom_raison_sociale: "COTE BOULANGE", activite_principale: "10.71C", nombre_etablissements_ouverts: 270, matching_etablissements: [etab({ siret: "48234097300080", activite_principale: "10.71A" })] },
    // même entreprise : un établissement dans l'activité demandée, un autre non (56.10C), un masqué (diffusion partielle)
    {
      nom_complet: "PATISSERIE E.LADUREE", nom_raison_sociale: "PATISSERIE E.LADUREE", activite_principale: "10.71D", nombre_etablissements_ouverts: 3,
      matching_etablissements: [
        etab({ siret: "57204554000471", activite_principale: "10.71D", adresse: "3 COURS DE LA GARONNE 77700 SERRIS", libelle_commune: "SERRIS", commune: "77446", code_postal: "77700", liste_enseignes: ["LADUREE"] }),
        etab({ siret: "57204554000406", activite_principale: "56.10C" }),
        etab({ siret: "57204554000999", statut_diffusion_etablissement: "P" }),
      ],
    },
  ],
};

describe("extraireCommerces", () => {
  const { commerces, ecartes } = extraireCommerces(REPONSE, type("boulangerie"));

  it("garde les établissements ouverts, indépendants, de la bonne activité", () => {
    expect(commerces.map((c) => c.siret)).toEqual(["39372162600033", "94896558700017", "94162252400010", "57204554000471"]);
  });

  it("compte ce qui est écarté, sans rien cacher", () => {
    expect(ecartes).toEqual({ fermes: 1, chaines: 1, autreActivite: 1, masques: 1 });
  });

  it("préfère l'enseigne à la raison sociale et garde la raison sociale à part", () => {
    const c = commerces.find((x) => x.siret === "94896558700017")!;
    expect(c.nom).toBe("Boulangerie du Centre");
    expect(c.raisonSociale).toBe("Le Fournil A.N.D.D.M.");
    expect(commerces.find((x) => x.siret === "39372162600033")!.raisonSociale).toBeNull();
  });

  it("retire le doublon entre parenthèses du nom complet", () => {
    expect(commerces.find((x) => x.siret === "94162252400010")!.nom).toBe("Les Petites Douceurs");
  });

  it("remplit ville, adresse, département, secteur et libellé d'activité, rien d'autre", () => {
    expect(commerces[0]).toEqual({
      siret: "39372162600033",
      nom: "La Comtesse de Trevise",
      raisonSociale: null,
      ville: "Villiers-sur-Marne",
      adresse: "59 Avenue Beauregard 94350 Villiers-sur-Marne",
      departement: "94",
      secteur: "Commerce de bouche",
      codeNaf: "10.71C",
      activite: "Boulangerie et boulangerie-pâtisserie",
    });
    expect(commerces.at(-1)!.departement).toBe("77");
  });
});

describe("filtreActiviteRespecte", () => {
  it("détecte un filtre ignoré par l'API (résultats d'une autre activité)", () => {
    const laPoste: ReponseApi = { total_results: 10000, total_pages: 3334, page: 1, results: [{ nom_complet: "LA POSTE", nom_raison_sociale: "LA POSTE", activite_principale: "53.10Z", nombre_etablissements_ouverts: 8862, matching_etablissements: [] }] };
    expect(filtreActiviteRespecte(laPoste, type("boulangerie"))).toBe(false);
    expect(filtreActiviteRespecte(REPONSE, type("boulangerie"))).toBe(true);
    expect(filtreActiviteRespecte({ ...REPONSE, results: [] }, type("boulangerie"))).toBe(true);
  });
});

describe("analyserLieu", () => {
  it("reconnaît département, code postal et nom de ville", () => {
    expect(analyserLieu("77")).toEqual({ genre: "departement", code: "77" });
    expect(analyserLieu("2a")).toEqual({ genre: "departement", code: "2A" });
    expect(analyserLieu("94350")).toEqual({ genre: "code_postal", code: "94350" });
    expect(analyserLieu("  Villiers-sur-Marne ")).toEqual({ genre: "nom", nom: "Villiers-sur-Marne" });
    expect(analyserLieu("")).toEqual({ genre: "invalide" });
    expect(analyserLieu("7")).toEqual({ genre: "invalide" });
    expect(analyserLieu("Meaux 77")).toEqual({ genre: "invalide" });
  });
});

describe("mise en forme", () => {
  it("formate le SIRET en groupes lisibles", () => {
    expect(formaterSiret("39372162600033")).toBe("393 721 626 00033");
    expect(formaterSiret("123")).toBe("123");
  });

  it("titreCase garde les petits mots et les apostrophes", () => {
    expect(titreCase("AVENUE DE LA VICTOIRE 77100 MEAUX")).toBe("Avenue de la Victoire 77100 Meaux");
    expect(titreCase("7 AVENUE DE L'INDUSTRIE 77510 REBAIS")).toBe("7 Avenue de l'Industrie 77510 Rebais");
    expect(titreCase("CLAYE-SOUILLY")).toBe("Claye-Souilly");
  });

  it("département : ceux du CRM, Île-de-France, ou hors IDF", () => {
    expect(departementDe("77118")).toBe("77");
    expect(departementDe("94350")).toBe("94");
    expect(departementDe("92012")).toBe("Autre IDF");
    expect(departementDe("13027")).toBe("Hors IDF");
    expect(departementDe("97105")).toBe("Hors IDF");
    expect(departementDe("2A004")).toBe("Hors IDF");
    expect(departementDe(null)).toBeNull();
  });
});
