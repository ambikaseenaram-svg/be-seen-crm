import { describe, expect, it } from "vitest";
import { construireCsv, echapperCellule } from "./csv";

describe("csv", () => {
  it("commence par le BOM UTF-8, sépare par « ; » et termine les lignes en CRLF", () => {
    const csv = construireCsv([{ titre: "Nom", valeur: (l: { n: string }) => l.n }, { titre: "Ville", valeur: () => "Mélun" }], [{ n: "Café" }]);
    expect(csv.startsWith("﻿Nom;Ville\r\n")).toBe(true);
    expect(csv).toContain("Café;Mélun\r\n");
  });

  it("protège les séparateurs, guillemets et retours à la ligne", () => {
    expect(echapperCellule("a;b")).toBe('"a;b"');
    expect(echapperCellule('dit "oui"')).toBe('"dit ""oui"""');
    expect(echapperCellule("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  it("neutralise les formules mais garde les téléphones", () => {
    expect(echapperCellule("=SOMME(A1)")).toBe("'=SOMME(A1)");
    expect(echapperCellule("@cmd")).toBe("'@cmd");
    expect(echapperCellule("-1+1")).toBe("'-1+1");
    expect(echapperCellule("+33 6 12 34 56 78")).toBe("+33 6 12 34 56 78");
  });

  it("booléens en Oui/Non, vide pour null, nombres tels quels", () => {
    expect(echapperCellule(true)).toBe("Oui");
    expect(echapperCellule(false)).toBe("Non");
    expect(echapperCellule(null)).toBe("");
    expect(echapperCellule(1200)).toBe("1200");
  });
});
