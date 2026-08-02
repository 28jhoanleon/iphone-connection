"use client";

import React, { useState } from "react";
import Image from "next/image";

interface Props {
  unidad: any;
}

export default function TarjetaUnidad({ unidad }: Props) {
  const [srcImagen, setSrcImagen] = useState<string>(
    unidad.imagen || `/productos/${unidad.ref}.svg`
  );

  return (
    <div className="border rounded-xl p-4 flex flex-col items-center bg-white shadow-sm relative overflow-hidden">
      <div className="w-full h-48 relative flex items-center justify-center mb-3 bg-gray-50 rounded-lg overflow-hidden">
        <img
          src={srcImagen}
          alt={unidad.nombre || unidad.modelo || "Producto"}
          className="max-h-full max-w-full object-contain"
          onError={() => {
            // Si la imagen falla al cargar en el cliente, pasa al SVG limpia
            setSrcImagen(`/productos/${unidad.ref}.svg`);
          }}
        />
      </div>

      <div className="w-full text-left">
        <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
          {unidad.marca}
        </span>
        <h3 className="text-base font-bold text-gray-900 line-clamp-1">
          {unidad.modelo || unidad.nombre}
        </h3>
        <p className="text-lg font-black text-gray-900 mt-1">
          ${((unidad.precioCentavos || 0) / 100).toLocaleString("es-AR")}
        </p>
      </div>
    </div>
  );
}
