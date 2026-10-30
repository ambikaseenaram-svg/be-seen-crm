import type { Metadata } from "next";
import ImporterProspects from "@/components/importer/ImporterProspects";

export const metadata: Metadata = { title: "Importer des prospects · BE SEEN" };

export default function PageImporter() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-titre">Importer des prospects</h1>
        <p className="mt-1 text-sm text-annotation">
          Depuis ton fichier Excel : dans Excel, fais <strong>Fichier → Enregistrer sous</strong>, choisis le type <strong>CSV UTF-8 (délimité par des virgules)</strong>, puis choisis ce fichier ici. Rien n&apos;est ajouté avant ta confirmation.
        </p>
      </div>
      <ImporterProspects />
    </section>
  );
}
