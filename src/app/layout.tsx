import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ErrorSuppressor } from "@/components/ErrorSuppressor";
import MatrixRainWrapper from "@/components/MatrixRainWrapper";

export const metadata: Metadata = {
  title: "DogeWatch — Crowdsourced Medicaid Fraud Detection",
  description: "Analyze HHS Medicaid claims data, flag suspicious billing patterns, earn DOGE bounties for verified fraud reports. Report Medicaid fraud and government waste.",
  keywords: ["Medicaid fraud detection", "crowdsourced fraud reporting", "government waste reporting", "DOGE fraud tip line", "report Medicaid abuse", "HHS open data", "Dogecoin"],
  authors: [{ name: "DogeWatch" }],
  metadataBase: new URL("https://dogedoctor.com"),
  openGraph: {
    title: "DogeWatch — Crowdsourced Medicaid Fraud Detection",
    description: "Analyze HHS Medicaid claims data, flag suspicious billing patterns, earn DOGE bounties for verified fraud reports.",
    url: "https://dogedoctor.com",
    siteName: "DogeWatch",
    images: [
      {
        url: "https://dogedoctor.com/logo/doge-v2-512.png",
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
    images: ["https://dogedoctor.com/logo/doge-v2-512.png"],
    creator: "@DrDoge66421",
  },
  alternates: {
    canonical: "https://dogedoctor.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
        <ErrorSuppressor />
        {/* Disabled - causing auth timeout issues */}
        {/* <MatrixRainWrapper /> */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
