import type { Metadata } from "next";
import { AnimatePresence, motion } from "framer-motion";
import "./globals.css";

export const metadata: Metadata = {
  title: "iPhoneConnection",
  description: "Tecnología revisada, documentada y con garantía escrita.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased">
        {/* El AnimatePresence y motion.div hacen que cada cambio de página tenga suavidad */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={typeof window !== "undefined" ? window.location.pathname : ""}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </body>
    </html>
  );
}
