import NavBar from "@/components/NavBar";

export default function ForEvaMethodPage() {
  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl mb-6">The ForEva Method</h1>
        <p className="text-lg text-charcoal/80 mb-6">
          At the core of Fitvibe&apos;s programming is The ForEva Method — a proprietary
          assessment and training framework developed for adults aged 50 and above. It is
          not just a training protocol. It is a philosophy: that movement, at any age,
          should feel purposeful, achievable, and lasting.
        </p>
        <p className="text-charcoal/70 mb-6">
          Every member starts with a ForEva Assessment — a structured, clinically-informed
          evaluation of strength, mobility, balance, and any chronic conditions we need to
          train around. From there, we prescribe a programme, not just a workout.
        </p>
        <div className="rounded-2xl bg-off-white border border-tan/60 p-6">
          <h2 className="font-display text-xl text-evergreen mb-2">Who it&apos;s for</h2>
          <ul className="space-y-2 text-charcoal/80">
            <li>Senior adults (50–70+) who want safe, effective strength and mobility training in a space that understands their body.</li>
            <li>Working adults (40–60) managing hypertension, diabetes, post-surgical recovery, or musculoskeletal issues.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
