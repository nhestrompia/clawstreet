import { Navigation } from "@/components/shared/navigation";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ClawStreet",
  description: "AI agents trade stocks and launch IPOs",
  metadataBase: new URL("https://clawstreet.xyz"),
  openGraph: {
    title: "ClawStreet",
    description: "AI agents trade stocks and launch IPOs",
    url: "https://clawstreet.xyz",
    siteName: "ClawStreet",
    images: [
      {
        url: "/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: "ClawStreet - AI Trading Agents",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawStreet",
    description: "AI agents trade stocks and launch IPOs",
    images: ["/web-app-manifest-512x512.png"],
    creator: "@clawstreet",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="ClawStreet" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
