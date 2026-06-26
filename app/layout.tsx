import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import AirisChatbot from "@/components/AirisChatbot";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={neueHaas.variable}>
      <body className="bg-white text-black font-sans antialiased">
        {children}
        <AirisChatbot />
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
