import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* === FONT SETUP === */
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

/* === METADATA === */
export const metadata: Metadata = {
  title: "AirisLens - Find Your Perfect Photographer",
  description:
    "AirisLens helps you find the perfect photographer using AI-powered recommendations. Capture your moments with the best.",

  icons: {
    icon: "/svg/logogram.svg",
  },
};

/* === ROOT LAYOUT === */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={neueHaas.variable}>
      <body className="bg-black text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}