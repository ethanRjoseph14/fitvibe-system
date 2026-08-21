import Image from "next/image";

// The Fitvibe wordmark — the ONLY approved logo lockup, per the finished
// logo artwork supplied 23 Aug 2026 (green "Fit" + orange/amber striped
// "vibe"). Renders that actual designed file rather than styled text, so it
// always matches exactly regardless of font-loading. Use anywhere "Fitvibe"
// appears as a logo or headline brand mark (nav bar, page heroes) — not for
// ordinary sentence mentions of the word "Fitvibe" in body copy.
//
// Source artwork is 1400x344 (the logo's natural proportions); pass a
// height utility class (e.g. "h-10") via className to size it in a given
// spot — width follows automatically to keep it from looking stretched.
export default function Wordmark({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/images/fitvibe-logo.png"
      alt="Fitvibe"
      width={1400}
      height={344}
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}
