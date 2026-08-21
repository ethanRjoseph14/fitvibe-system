"use client";

import Link from "next/link";
import { useState } from "react";
import Wordmark from "@/components/Wordmark";

const links = [
  { href: "/about", label: "About" },
  { href: "/the-foreva-method", label: "ForEva Method" },
  { href: "/coaches", label: "Coaches" },
  { href: "/programmes", label: "Programmes" },
  { href: "/book", label: "Book a Class" },
  { href: "/member", label: "Member Portal" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-tan/60 bg-warm-beige/95 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Mobile/tablet menu toggle — the only way to reach nav links below the
              lg breakpoint, since the full nav below is hidden until lg. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="lg:hidden -ml-2 w-10 h-10 rounded-full flex items-center justify-center text-charcoal hover:bg-tan/30 transition-colors"
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
          <Link href="/" onClick={() => setOpen(false)}>
            <Wordmark className="h-10 sm:h-11" priority />
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-charcoal hover:text-vitality-orange transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/programmes"
          className="hidden sm:inline-block rounded-full bg-vitality-orange text-charcoal px-5 py-2 text-sm font-semibold hover:bg-warm-amber transition-colors"
        >
          Become a Founding Member
        </Link>
      </div>

      {/* Mobile/tablet dropdown — mirrors the desktop nav + CTA, shown below lg. */}
      {open && (
        <nav className="lg:hidden border-t border-tan/60 bg-warm-beige px-6 py-3 flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-2.5 text-base font-medium text-charcoal hover:text-vitality-orange transition-colors border-b border-tan/30 last:border-b-0"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/programmes"
            onClick={() => setOpen(false)}
            className="mt-4 mb-1 rounded-full bg-vitality-orange text-charcoal px-5 py-2.5 text-sm font-semibold text-center hover:bg-warm-amber transition-colors"
          >
            Become a Founding Member
          </Link>
        </nav>
      )}
    </header>
  );
}
