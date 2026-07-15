import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import AirisChatbot from "@/components/AirisChatbot";
import { getMidtransPublicConfig } from "@/lib/midtrans-config";
import "./globals.css";

const neueHaas = localFont({
  src: [
    {
      path: "../public/fonts/NeueHaas-45Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/NeueHaas-55Roman.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/NeueHaas-65Medium.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-neue-haas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AirisLens - Find Your Perfect Photographer",
  description:
    "AirisLens helps you find the perfect photographer using AI-powered recommendations. Capture your moments with the best.",
  icons: {
    icon: "/svg/logogram.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { clientKey, isProduction } = await getMidtransPublicConfig();
  const snapSrc = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <html lang="en" className={neueHaas.variable}>
      <body className="bg-white text-black font-sans antialiased">
        {children}
        <AirisChatbot />
        {clientKey && (
          <Script
            src={snapSrc}
            data-client-key={clientKey}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
