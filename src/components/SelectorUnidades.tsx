"use client";

import React, { useState } from "react";
import { Unidad } from "@/lib/tipos";
import { TarjetaUnidad } from "./TarjetaUnidad";

interface SelectorUnidadesProps {
  modelo?: any;
  unidades?: Unidad[];
  tc?: number;
}

export const SelectorUnidades: React.FC<SelectorUnidadesProps> = ({
  modelo,
  unidades,
}) => {
  const listaUnidades: any[] = unidades || modelo?.unidades || [];
  const [unidadSelec, setUnidadSelec] = useState<any>(listaUnidades[0]);

  if (!listaUnidades || listaUnidades.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Seleccionar variante:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {listaUnidades.map((u, idx) => {
            const claveActual = u.id || u.referencia || u.ref || idx;
            const claveSeleccionada = unidadSelec?.id || unidadSelec?.referencia || unidadSelec?.ref;
            const activa = claveActual === claveSeleccionada;

            return (
              <button
                key={claveActual}
                onClick={() => setUnidadSelec(u)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  activa
                    ? "border-black bg-black text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold text-sm">
                  {u.almacenamiento || u.capacidad} - {u.color}
                </div>
                <div
                  className={`text-xs ${
                    activa ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  USD ${u.precioUsd || u.precio} ({u.estado})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <TarjetaUnidad
          unidad={unidadSelec || listaUnidades[0]}
        />
      </div>
    </div>
  );
};

export default SelectorUnidades;
