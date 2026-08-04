import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'iPhoneConnection | Tecnología revisada y con garantía',
  description: 'Venta de iPhones, MacBooks, iPads y accesorios. Revisados, documentados y con garantía escrita.',
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#f5f5f7] text-[#1d1d1f]">
      {/* Navbar */}
      <nav className="w-full py-6 px-4 max-w-6xl mx-auto flex justify-between items-center border-b border-gray-200/50">
        <div className="text-xl font-semibold tracking-tight">iPhone<span className="font-normal">Connection</span></div>
        <div className="flex gap-4">
          <a href="https://wa.me/542215430706" target="_blank" rel="noopener noreferrer" 
             className="bg-[#1d1d1f] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-black transition-colors">
            WhatsApp
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center text-center px-4 py-20 max-w-4xl mx-auto">
        <div className="inline-block px-3 py-1 bg-gray-200/50 rounded-full text-xs font-semibold text-gray-600 mb-6 tracking-wider">
          TECNOLOGÍA REVISADA
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
          El mejor equipo, <br /> 
          <span className="text-gray-500">al mejor precio.</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-lg mb-10 leading-relaxed">
          Todos nuestros dispositivos pasan por una revisión exhaustiva. 
          Garantía escrita, estado certificado y envío seguro.
        </p>
        
        {/* Botón principal al Catálogo */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Link href="/catalogo" 
                className="bg-[#1d1d1f] text-white w-full py-4 rounded-full text-base font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-gray-900/10">
            Explorar Catálogo
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-3 gap-8 text-sm text-gray-500 w-full max-w-md border-t border-gray-200 pt-8">
          <div className="text-center"><span className="font-bold text-[#1d1d1f] block text-lg">12</span> Meses Garantía</div>
          <div className="text-center"><span className="font-bold text-[#1d1d1f] block text-lg">256+</span> Equipos</div>
          <div className="text-center"><span className="font-bold text-[#1d1d1f] block text-lg">100%</span> Revisados</div>
        </div>
      </section>

      {/* Footer con aviso legal */}
      <footer className="py-8 px-4 text-center text-xs text-gray-400 border-t border-gray-200/50">
        <p>📸 Las imágenes son meramente ilustrativas. El producto final puede variar ligeramente.</p>
        <p className="mt-1">iPhoneConnection © {new Date().getFullYear()} · Tecnología revisada y con garantía escrita.</p>
      </footer>
    </main>
  );
}
