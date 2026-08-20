import type { Metadata } from "next";
import "./globals.css";

// NOTE: Fonts (Playfair Display + Poppins, per Brand Guidelines §05) are
// loaded via @import in globals.css rather than next/font/google. This build
// sandbox has no outbound access to fonts.googleapis.com, which makes
// next/font's build-time fetch fail; a runtime CSS @import degrades
// gracefully (falls back to serif/sans-serif) instead of breaking the build.
// Once deployed with normal internet access, consider switching to
// next/font/local with self-hosted font files for better performance.

export const metadata: Metadata = {
  title: "Fitvibe — Getting Fit Everyday With A Stronger Muscle",
  description:
    "Fitvibe is a specialist movement centre for adults 40+ and those managing chronic conditions, built around The ForEva Method. Subang Jaya.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
