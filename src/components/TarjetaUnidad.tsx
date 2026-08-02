"use client";

import React, { useState } from "react";

interface Props {
  u: any;
  tc?: number;
  ultimas?: boolean;
  prioridad?: boolean;
}

export default function TarjetaUnidad({ u, tc, ultimas, prioridad }: Props) {
  const [srcImagen, setSrcImagen] = useState<string>(
    u.imagen || `/productos/${u.ref}.svg`
  );

  return (
    <div className="border rounded-xl p-4 flex flex-col items-center bg-white shadow-sm relative overflow-hidden">
      {ultimas && (
        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
          ÚLTIMAS UNIDADES
        </span>
      )}
      
      <div className="w-full h-48 relative flex items-center justify-center mb-3 bg-gray-50 rounded-lg overflow-hidden p-2">
        <img
          src={srcImagen}
          alt={u.nombre || u.modelo || "Producto"}
          className="max-h-full max-w-full object-contain"
          loading={prioridad ? "eager" : "lazy"}
          onError={() => {
            // Fallback limpio al SVG si la imagen 404 falla en el navegador
            setSrcImagen(`/productos/${u.ref}.svg`);
          }}
        />
      </div>

      <div className="w-full text-left">
        <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">
          {u.marca}
        </span>
        <h3 className="text-base font-bold text-gray-900 line-clamp-1">
          {u.modelo || u.nombre}
        </h3>
        <p className="text-lg font-black text-gray-900 mt-1">
          ${((u.precioCentavos || 0) / 100).toLocaleString("es-AR")}
        </p>
      </div>
    </div>
  );
}
