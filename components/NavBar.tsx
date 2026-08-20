import Link from "next/link";

const links = [
  { href: "/the-foreva-method", label: "The ForEva Method" },
  { href: "/programmes", label: "Programmes" },
  { href: "/book", label: "Book a Class" },
  { href: "/member", label: "Member Portal" },
];

export default function NavBar() {
  return (
    <header className="border-b border-tan/60 bg-warm-beige/95 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl text-charcoal tracking-wide">
          Fit<span className="text-vitality-orange">vibe</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-charcoal hover:text-vitality-orange transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/programmes"
          className="rounded-full bg-vitality-orange text-charcoal px-5 py-2 text-sm font-semibold hover:bg-warm-amber transition-colors"
        >
          Become a Founding Member
        </Link>
      </div>
    </header>
  );
}
