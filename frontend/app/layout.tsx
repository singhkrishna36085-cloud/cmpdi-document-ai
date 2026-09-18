import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "CMPDI Document AI",
  description: "AI-Assisted Geological, Mining & Production Reporting Platform",
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
      <body className="min-h-full bg-[#030303] text-slate-100 font-sans overflow-x-hidden">
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
