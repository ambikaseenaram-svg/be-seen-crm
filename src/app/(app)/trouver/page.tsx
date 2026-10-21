import type { Metadata } from "next";
import TrouverCommerces from "@/components/trouver/TrouverCommerces";

export const metadata: Metadata = { title: "Trouver des commerces · BE SEEN" };

export default function PageTrouver() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-titre">Trouver des commerces</h1>
        <p className="mt-1 text-sm text-annotation">
          Recherche dans l&apos;annuaire officiel des entreprises (data.gouv.fr) : commerces indépendants et ouverts, avec leur adresse et leur SIRET.
        </p>
      </div>
      <TrouverCommerces />
    </section>
  );
}
