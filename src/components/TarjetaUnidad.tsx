"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { rutaImagen } from "@/lib/imagenes";

interface TarjetaUnidadProps {
  unidad?: any;
  u?: any;
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
  const item = unidad || u;
  const [imgSrc, setImgSrc] = useState<string>("/maestras/default.svg");

  useEffect(() => {
    if (item) {
      setImgSrc(rutaImagen(item));
    }
  }, [item]);

  if (!item) return null;

  const nombreModelo = item.modeloNombre || item.modelo || item.nombre || "Unidad";
  const nombreMarca = item.marcaNombre || item.marca || "Apple";
  const refUnidad = item.referencia || item.ref || item.id;
  const precio = item.precioUsd || item.precio || 0;
  const gb = item.almacenamiento || item.capacidad;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col justify-between h-full">
      <div className="p-4 flex flex-col items-center">
        <div className="relative w-full h-48 mb-4 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
          <img
            src={imgSrc}
            alt={nombreModelo}
            className="object-contain h-full w-full p-2"
            onError={() => {
              // Si falla la imagen .webp, cae inmediatamente al SVG por defecto
              if (imgSrc !== "/maestras/default.svg") {
                setImgSrc("/maestras/default.svg");
              }
            }}
            loading={prioridad ? "eager" : "lazy"}
          />
        </div>

        <div className="w-full text-left">
          {ultimas && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md mb-1 inline-block">
              ¡Últimas unidades!
            </span>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md block w-fit">
            {nombreMarca}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-2 line-clamp-1">
            {nombreModelo}
          </h3>
          {gb && (
            <p className="text-sm text-gray-500 mt-1">
              {gb} {item.color ? `• ${item.color}` : ""}
            </p>
          )}
        </div>
      </div>

      {mostrarAcciones && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 block">Precio</span>
            <span className="text-xl font-extrabold text-gray-900">
              USD ${precio}
            </span>
            {tc && (
              <span className="text-xs text-gray-500 block">
                ~${(precio * tc).toLocaleString()} ARS
              </span>
            )}
          </div>
          {refUnidad && (
            <Link
              href={`/unidad/${refUnidad}`}
              className="bg-black hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Ver detalle
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default TarjetaUnidad;
