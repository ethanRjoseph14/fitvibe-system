import type { Metadata } from "next";
import { Caprasimo, Raleway, Sometype_Mono, Liter } from "next/font/google";
import "./globals.css";

// Fonts — self-hosted at build time via next/font/google (per Brand
// Guidelines §05: Caprasimo, Raleway, Sometype Mono, Liter). This replaces
// the earlier runtime `@import` in globals.css, which pulled the font CSS
// from fonts.googleapis.com on every visit — on some mobile networks/browser
// configs that third-party request can be slow, blocked, or simply lose the
// race with first paint, so the fallback font sticks and never swaps back.
// next/font bakes the actual font files into the deployment itself (served
// from your own domain, no third-party request at all), which is both
// faster and immune to that failure mode. Each font's `variable` becomes a
// CSS custom property consumed by the `--font-*` tokens in globals.css.
const caprasimo = Caprasimo({
  subsets: ["latin"],
  weight: "400",
  variable: "--nf-caprasimo",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--nf-raleway",
  display: "swap",
});

const sometypeMono = Sometype_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--nf-sometype-mono",
  display: "swap",
});

const liter = Liter({
  subsets: ["latin"],
  weight: "400",
  variable: "--nf-liter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fitvibe — Getting Fit Everyday With A Stronger Muscle",
  description:
    "Fitvibe is a specialist movement centre for adults 40+ and those managing chronic conditions, built around The ForEva Method. Subang Jaya.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${caprasimo.variable} ${raleway.variable} ${sometypeMono.variable} ${liter.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
