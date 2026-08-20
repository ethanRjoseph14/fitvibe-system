// The Fitvibe wordmark — the ONLY approved treatment of the brand name as a
// logo lockup, per Brand Guidelines §05 (20 Aug 2026 update). "Fit" is
// always Evergreen, "vibe" is always Vitality Orange, always set in
// Caprasimo. Use this component anywhere "Fitvibe" appears as a logo or
// headline brand mark (nav bar, page heroes) — not for ordinary sentence
// mentions of the word "Fitvibe" in body copy.
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-wordmark ${className}`}>
      <span className="text-evergreen">Fit</span>
      <span className="text-vitality-orange">vibe</span>
    </span>
  );
}
