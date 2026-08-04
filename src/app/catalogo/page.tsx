"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import catalogData from "@/data/catalogo.json";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
};

export default function CatalogoPage() {
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  const brands = useMemo(() => {
    const allBrands = catalogData.map((p) => p.marca);
    return ["all", ...new Set(allBrands)];
  }, []);

  const groupedProducts = useMemo(() => {
    let products = [...catalogData];
    if (selectedBrand !== "all") products = products.filter((p) => p.marca === selectedBrand);
    if (sortBy === "price-asc") products.sort((a, b) => a.precioCentavos - b.precioCentavos);
    else if (sortBy === "price-desc") products.sort((a, b) => b.precioCentavos - a.precioCentavos);
    else if (sortBy === "name") products.sort((a, b) => a.modelo.localeCompare(b.modelo));
    
    return products.reduce<Record<string, typeof catalogData[0][]>>((acc, product) => {
      const category = product.categoria || "Otros";
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
    }, {});
  }, [selectedBrand, sortBy]);

  const categoryNames = Object.keys(groupedProducts);
  
  // CORRECCIÓN 1: Tipificar el estado como un array de strings
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // CORRECCIÓN 2: Tipificar el parámetro 'category' como string
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => 
      prev.includes(category) 
        ? prev.filter((c) => c !== category) 
        : [...prev, category]
    );
  };

  const expandAll = () => setExpandedCategories(categoryNames);
  const collapseAll = () => setExpandedCategories([]);
  const hasProducts = categoryNames.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] px-4 py-8 pb-24">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4">Catálogo iPhoneConnection</h1>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex gap-2 flex-wrap justify-center w-full sm:w-auto">
            {brands.map((brand) => (
              <button key={brand} onClick={() => setSelectedBrand(brand)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedBrand === brand ? "bg-[#1d1d1f] text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {brand === "all" ? "Todas" : brand}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#1d1d1f] focus:outline-none w-full sm:w-auto">
            <option value="default">Ordenar por defecto</option>
            <option value="name">Alfabético (A-Z)</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
          </select>
        </div>
        {hasProducts && (
          <div className="flex justify-end gap-3 mb-6">
            <button onClick={expandAll} className="text-xs text-gray-600 font-medium px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">Expandir todo</button>
            <button onClick={collapseAll} className="text-xs text-gray-600 font-medium px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">Contraer todo</button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {hasProducts ? (
            <motion.div key={selectedBrand + sortBy} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
              {categoryNames.map((category) => {
                const items = groupedProducts[category];
                const isExpanded = expandedCategories.includes(category);
                return (
                  <motion.div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" layout>
                    <button onClick={() => toggleCategory(category)} className="w-full flex justify-between items-center p-5 bg-white hover:bg-gray-50 transition-colors text-left border-b border-gray-100/0 focus:outline-none">
                      <h2 className="text-xl font-semibold text-gray-800">{category} <span className="text-sm font-normal text-gray-400 ml-2">({items.length})</span></h2>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#fafafa]">
                            {items.map((product, index) => (
                              <motion.div key={product.ref} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03, duration: 0.3 }} whileHover={{ scale: 1.02, y: -4, boxShadow: "0px 12px 30px rgba(0,0,0,0.08)" }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full transition-all cursor-pointer">
                                <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-6">
                                  <img src={`/productos/${product.ref}.webp`} alt={product.nombre} className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { (e.target as HTMLImageElement).src = "/productos/placeholder.webp"; }} />
                                </div>
                                <div className="p-5 flex flex-col flex-1 border-t border-gray-100">
                                  <div className="mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{product.marca} &middot; {product.categoria}</span>
                                    <h3 className="text-lg font-semibold text-gray-900 mt-1 leading-tight">{product.modelo}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{product.nombre}</p>
                                  </div>
                                  <div className="mt-auto border-t border-gray-100 pt-3 space-y-1 text-xs text-gray-600">
                                    {product.capacidadGb && (<div className="flex justify-between"><span>Capacidad:</span><span className="font-medium text-gray-900">{product.capacidadGb} GB</span></div>)}
                                    {product.color && (<div className="flex justify-between"><span>Color:</span><span className="font-medium text-gray-900">{product.color}</span></div>)}
                                    {product.config && (<div className="flex justify-between"><span>Config:</span><span className="font-medium text-gray-900 truncate max-w-[150px]">{product.config}</span></div>)}
                                    {!product.config && !product.capacidadGb && !product.color && (<div className="text-center text-gray-400 italic py-1">Sin especificaciones</div>)}
                                  </div>
                                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-end justify-between">
                                    <div>
                                      <div className="text-xl font-bold text-gray-900">{formatPrice(product.precioCentavos)}</div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{product.estadoEtiqueta}</div>
                                    </div>
                                    <a href={`https://wa.me/542215430706?text=Hola, estoy interesado en el ${product.modelo} (Ref: ${product.ref})`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#20bd5a] transition-colors">WhatsApp</a>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-gray-500">No se encontraron productos.</motion.div>
          )}
        </AnimatePresence>
        <div className="mt-16 text-center border-t border-gray-200 pt-8">
          <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">📸 <span className="font-medium">Aviso importante:</span> Las imágenes son meramente ilustrativas.</p>
        </div>
      </div>
    </motion.div>
  );
}
