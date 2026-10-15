import type { Metadata } from "next";
import FormulaireConnexion from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion · BE SEEN" };

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ retour?: string; expire?: string }>;
}) {
  const { retour, expire } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-creme px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-annotation/20">
        <p className="mb-1 text-center text-3xl font-extrabold tracking-[0.2em] text-violet">BE SEEN</p>
        <p className="mb-8 text-center text-sm text-annotation">CRM de prospection</p>
        {expire && (
          <p role="status" className="mb-5 rounded-md bg-lavande/40 px-3 py-2 text-sm text-titre">
            Ta session a expiré, reconnecte-toi.
          </p>
        )}
        <FormulaireConnexion retour={retour} />
      </div>
    </main>
  );
}
