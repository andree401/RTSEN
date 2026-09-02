import React from 'react';
import { Transaction } from '../types/finance';

interface FinancialStatsProps {
  transactions: Transaction[];
}

export default function FinancialStats({ transactions }: FinancialStatsProps) {
  const ingresosTotales = transactions
    .filter(t => t.tipo === 'Ingreso')
    .reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  const gastosTotales = transactions
    .filter(t => t.tipo === 'Gasto')
    .reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  const balance = ingresosTotales - gastosTotales;

  return (
    <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Ingresos Totales</h2>
        <p className="text-3xl font-semibold text-green-400">${ingresosTotales.toFixed(2)}</p>
      </div>
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Gastos Totales</h2>
        <p className="text-3xl font-semibold text-red-400">${gastosTotales.toFixed(2)}</p>
      </div>
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Balance</h2>
        <p className="text-3xl font-semibold text-blue-400">${balance.toFixed(2)}</p>
      </div>
    </section>
  );
}
