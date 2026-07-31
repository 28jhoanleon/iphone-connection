import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFab from "@/components/WhatsAppFab";
import "./globals.css";

export const metadata: Metadata = {
  title: "iPhone Connection — Tecnología con respaldo",
  description:
    "Tecnología revisada, documentada y con garantía escrita. Sabés exactamente qué estás comprando.",
  openGraph: {
    title: "iPhone Connection",
    description: "Sabés exactamente qué estás comprando.",
    locale: "es_AR",
    type: "website",
  },
};

/**
 * Fuentes por <link> y no por next/font: el entorno de build no tiene salida a
 * fonts.googleapis.com. Al pasar a Vercel conviene migrar a next/font y autohospedarlas
 * (elimina una petición externa y mejora el LCP). Registrado en backlog.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        {/* preconnect + preload: la fuente empieza a bajar antes de que el CSS la pida.
            Reduce el salto de texto (CLS) y adelanta el LCP. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#FAFAFA" />
      </head>
      <body className="font-sans">
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppFab />
      </body>
    </html>
  );
}
