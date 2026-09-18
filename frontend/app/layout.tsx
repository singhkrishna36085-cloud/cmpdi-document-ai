import type { Metadata, Viewport } from "next";
import { Inter, Rajdhani, Noto_Sans_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const sansDisplay = Noto_Sans_Display({
  variable: "--font-sans-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#030303",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cmpdi-document-ai.vercel.app"),
  title: {
    default: "KhaniGyan AI (KhanijGyan AI) - CMPDI Geological & Mining Document Intelligence",
    template: "%s | KhaniGyan AI"
  },
  description: "KhaniGyan AI (KhanijGyan AI / khanijgyanai) is the authoritative AI-powered geological exploration, borehole analysis, and mining document intelligence system for CMPDI and Coal India.",
  keywords: [
    "khanijgyanai",
    "khanijgyan-ai",
    "khanijgyan",
    "khanij gyan",
    "khanij gyan ai",
    "khanigyanai",
    "khanigyan-ai",
    "khanigyan",
    "khani gyan",
    "khani gyan ai",
    "cmpdi document ai",
    "coal mining ai",
    "geological intelligence",
    "borehole analysis ai",
    "dgms compliance ai"
  ],
  authors: [{ name: "KhaniGyan AI Team • CMPDI / CIL" }],
  creator: "KhaniGyan AI",
  publisher: "CMPDI / Coal India Limited",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://cmpdi-document-ai.vercel.app",
    siteName: "KhaniGyan AI",
    title: "KhaniGyan AI (KhanijGyan AI) - Mining & Geological Document Intelligence",
    description: "Official AI platform for CMPDI and Coal India mining documents, borehole exploration logs, stripping ratio computation, and DGMS compliance auditing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KhaniGyan AI (KhanijGyan AI) - Mining Document AI",
    description: "AI platform for geological exploration reports, borehole analysis, and mining compliance.",
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "lUSJIv_gj0hh5DjMsKzyDT9aUb6rTo4YSRXUHWKAvkg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "KhaniGyan AI",
  "alternateName": [
    "KhanijGyan AI",
    "khanijgyanai",
    "khanijgyan",
    "Khanij Gyan AI",
    "Khani Gyan AI",
    "CMPDI Document AI"
  ],
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "All modern browsers",
  "description": "Enterprise AI platform for geological report parsing, borehole analysis, mining metrics, and DGMS compliance for Coal India and CMPDI.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "INR"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${rajdhani.variable} ${sansDisplay.variable} min-h-full antialiased dark`}
    >
      <head>
        <meta
          name="google-site-verification"
          content="lUSJIv_gj0hh5DjMsKzyDT9aUb6rTo4YSRXUHWKAvkg"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full bg-[#030303] text-slate-100 font-sans overflow-x-hidden">
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
