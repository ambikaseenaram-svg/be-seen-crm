import Link from "next/link";

export default function PageIntrouvable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-creme px-4">
      <p className="text-2xl font-bold text-titre">Page introuvable</p>
      <Link href="/" className="bouton">
        Retour au tableau de bord
      </Link>
    </main>
  );
}
