import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export const metadata: Metadata = {
  title: "DogeWatch — Crowdsourced Medicaid Fraud Detection",
  description: "Analyze HHS Medicaid claims data, flag suspicious billing patterns, earn DOGE bounties for verified fraud reports. Join the pack.",
  keywords: ["Medicaid", "fraud", "Dogecoin", "DOGE", "HHS", "open data", "crowdsourced"],
  authors: [{ name: "DogeWatch" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "DogeWatch — Crowdsourced Medicaid Fraud Detection",
    description: "Analyze HHS Medicaid claims data, flag suspicious billing patterns, earn DOGE bounties for verified fraud reports.",
    url: "https://dogewatch.app",
    siteName: "DogeWatch",
    images: [
      {
        url: "/logo/watchdog-512.png",
        width: 512,
        height: 512,
        alt: "DogeWatch Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DogeWatch — Crowdsourced Medicaid Fraud Detection",
    description: "Analyze HHS Medicaid claims data, flag suspicious billing patterns, earn DOGE bounties.",
    images: ["/logo/watchdog-512.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-doge-bg text-doge-text antialiased min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
