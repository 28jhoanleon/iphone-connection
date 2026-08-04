"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import catalogData from "@/data/catalogo.json";

// Utilidad para formatear precios (la dejamos simple por ahora)
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

  // 1. Obtenemos todas las marcas únicas para el filtro
  const brands = useMemo(() => {
    const allBrands = catalogData.map((p) => p.marca);
    return ["all", ...new Set(allBrands)];
  }, []);

  // 2. Lógica de filtrado y ordenamiento (usando useMemo para rendimiento)
  const filteredProducts = useMemo(() => {
    let products = [...catalogData];

    // Filtrar por marca
    if (selectedBrand !== "all") {
      products = products.filter((p) => p.marca === selectedBrand);
    }

    // Ordenar (precios y alfabético)
    if (sortBy === "price-asc") {
      products.sort((a, b) => a.precioCentavos - b.precioCentavos);
    } else if (sortBy === "price-desc") {
      products.sort((a, b) => b.precioCentavos - a.precioCentavos);
    } else if (sortBy === "name") {
      products.sort((a, b) => a.modelo.localeCompare(b.modelo));
    }

    return products;
  }, [selectedBrand, sortBy]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-6xl"
    >
      {/* ENCABEZADO */}
      <h1 className="text-3xl font-bold text-center mb-8">Catálogo iPhoneConnection</h1>

      {/* CONTROLES DE FILTROS Y ORDEN */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex gap-2 flex-wrap justify-center">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedBrand === brand
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 hover:bg-gray-200"
              }`}
            >
              {brand === "all" ? "Todas las marcas" : brand}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-black focus:outline-none"
        >
          <option value="default">Ordenar por defecto</option>
          <option value="name">Alfabético (A-Z)</option>
          <option value="price-asc">Precio: Menor a Mayor</option>
          <option value="price-desc">Precio: Mayor a Menor</option>
        </select>
      </div>

      {/* GRID DE PRODUCTOS */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={selectedBrand + sortBy}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.ref}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.02, boxShadow: "0px 10px 30px rgba(0,0,0,0.1)" }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full transition-shadow"
            >
              {/* IMAGEN DEL PRODUCTO */}
              <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-4">
                <img
                  src={`/productos/${product.ref}.webp`}
                  alt={product.nombre}
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => {
                    // Fallback si no tiene la foto del color correcto
                    (e.target as HTMLImageElement).src = "/productos/placeholder.webp";
                  }}
                />
              </div>

              {/* INFORMACIÓN DEL PRODUCTO */}
              <div className="p-5 flex flex-col flex-1 border-t border-gray-100">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {product.marca} &middot; {product.categoria}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-1 line-clamp-1">
                    {product.modelo}
                  </h3>
                  <p className="text-sm text-gray-500">{product.nombre}</p>
                </div>

                {/* FICHA TÉCNICA MINIMALISTA */}
                <div className="my-3 space-y-1 text-xs text-gray-600 border-t border-gray-100 pt-3">
                  {product.capacidadGb && (
                    <div className="flex justify-between"><span>Capacidad:</span> <span className="font-medium">{product.capacidadGb} GB</span></div>
                  )}
                  {product.color && (
                    <div className="flex justify-between"><span>Color:</span> <span className="font-medium">{product.color}</span></div>
                  )}
                  {product.config && (
                    <div className="flex justify-between"><span>Config:</span> <span className="font-medium">{product.config}</span></div>
                  )}
                  {!product.config && !product.capacidadGb && (
                    <div className="text-gray-400 italic text-center py-1">Sin especificaciones adicionales</div>
                  )}
                </div>

                {/* PRECIO Y ESTADO (Sin cambios por ahora) */}
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                  <div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatPrice(product.precioCentavos)}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
                      {product.estadoEtiqueta}
                    </div>
                  </div>
                  <button className="bg-black text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
                    WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* AVISO LEGAL (IMÁGENES ILUSTRATIVAS) */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="mt-12 text-center border-t border-gray-200 pt-6"
      >
        <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
          📸 <span className="font-medium">Aviso importante:</span> Las imágenes son meramente ilustrativas. 
          El producto final (color, accesorios incluidos y estado estético) puede variar ligeramente según el lote o la unidad disponible. 
          Consulte siempre con nuestro equipo por WhatsApp para confirmar los detalles específicos antes de comprar.
        </p>
      </motion.div>
    </motion.div>
  );
}
