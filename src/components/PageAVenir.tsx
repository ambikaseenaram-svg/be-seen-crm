export default function PageAVenir({ titre, etape }: { titre: string; etape: string }) {
  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-titre">{titre}</h1>
      <div className="rounded-2xl border border-dashed border-annotation/50 bg-white p-10 text-center">
        <p className="text-titre">Cette page sera construite à l&apos;étape « {etape} ».</p>
      </div>
    </section>
  );
}
