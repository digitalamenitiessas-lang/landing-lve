import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Caveat } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "La Vieja Escuela · Bar Café en Tucumán",
    template: "%s · La Vieja Escuela",
  },
  description:
    "Neobodegón norteño en San Miguel de Tucumán. Buenas costumbres y rico café: pedí tu 1/4 kg de café y retiralo en Santa Fe 746 o en 24 de Septiembre y Chacabuco.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "La Vieja Escuela",
    title: "La Vieja Escuela · Buenas costumbres y rico café",
    description:
      "Neobodegón norteño en Tucumán. Llevate nuestro café a casa: 1/4 kg en grano o molido.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f523f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${anton.variable} ${barlow.variable} ${caveat.variable} antialiased`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
