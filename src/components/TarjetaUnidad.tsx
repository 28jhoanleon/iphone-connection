"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Unidad } from "@/lib/tipos";
import { rutaImagen } from "@/lib/imagenes";

interface TarjetaUnidadProps {
  unidad?: Unidad;
  u?: Unidad; // Compatibilidad con prop 'u'
  tc?: number;
  ultimas?: boolean;
  prioridad?: boolean;
  mostrarAcciones?: boolean;
}

export const TarjetaUnidad: React.FC<TarjetaUnidadProps> = ({
  unidad,
  u,
  tc,
  ultimas,
  prioridad,
  mostrarAcciones = true,
}) => {
  // Acepta tanto 'unidad' como 'u' para no romper page.tsx
  const item = unidad || u;
  const [error, setError] = useState(false);
  const srcImagen = rutaImagen(item);

  useEffect(() => {
    setError(false);
  }, [srcImagen]);

  if (!item) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col justify-between h-full">
      <div className="p-4 flex flex-col items-center">
        <div className="relative w-full h-48 mb-4 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
          {!error && srcImagen ? (
            <img
              src={srcImagen}
              alt={item.titulo || item.modeloNombre || "Unidad"}
              className="object-contain h-full w-full p-2"
              onError={() => setError(true)}
              loading={prioridad ? "eager" : "lazy"}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
              <svg
                className="w-12 h-12 mb-2 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs font-medium">Sin imagen</span>
            </div>
          )}
        </div>

        <div className="w-full text-left">
          {ultimas && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md mb-1 inline-block">
              ¡Últimas unidades!
            </span>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md block w-fit">
            {item.marcaNombre}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-2 line-clamp-1">
            {item.modeloNombre}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {item.almacenamiento} • {item.color}
          </p>
        </div>
      </div>

      {mostrarAcciones && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 block">Precio</span>
            <span className="text-xl font-extrabold text-gray-900">
              USD ${item.precioUsd}
            </span>
            {tc && (
              <span className="text-xs text-gray-500 block">
                ~${(item.precioUsd * tc).toLocaleString()} ARS
              </span>
            )}
          </div>
          <Link
            href={`/unidad/${item.referencia}`}
            className="bg-black hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Ver detalle
          </Link>
        </div>
      )}
    </div>
  );
};

// Export por defecto para solucionar la importación en page.tsx
export default TarjetaUnidad;
