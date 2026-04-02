import type { Metadata } from "next";
import { DM_Mono, Syne } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { AppProviders } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DevTrack",
  description: "Track the grind — learning & goal progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark h-full", syne.variable, dmMono.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
