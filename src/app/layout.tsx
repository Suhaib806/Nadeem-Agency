import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nadeem Agency — Order Automation & Distribution Desk",
  description: "Mobile-first order booking and invoice automation for Nadeem Agency field sales and administration.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-[#f3efe7] text-[#1e3441] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
