"use client";

import React, { useState } from "react";
import { Unidad } from "@/lib/tipos";
import { TarjetaUnidad } from "./TarjetaUnidad";

interface SelectorUnidadesProps {
  unidades: Unidad[];
}

export const SelectorUnidades: React.FC<SelectorUnidadesProps> = ({
  unidades,
}) => {
  const [unidadSelec, setUnidadSelec] = useState<Unidad>(unidades[0]);

  if (!unidades || unidades.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar variante:
        </label>
        <div className="space-y-2">
          {unidades.map((u) => {
            const activa = u.id === unidadSelec.id;
            return (
              <button
                key={u.id || u.referencia}
                onClick={() => setUnidadSelec(u)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  activa
                    ? "border-black bg-black text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold text-sm">
                  {u.almacenamiento} - {u.color}
                </div>
                <div
                  className={`text-xs ${
                    activa ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  USD ${u.precioUsd} ({u.estado})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="md:col-span-2">
        <TarjetaUnidad
          key={unidadSelec.id || unidadSelec.referencia}
          unidad={unidadSelec}
        />
      </div>
    </div>
  );
};

export default SelectorUnidades;
