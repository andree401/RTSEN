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

  const formatColones = (num: number) => {
    return `₡${num.toLocaleString('es-CR')}`;
  };

  return (
    <section className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Ingresos Totales */}
      <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 hover:shadow-md hover:border-emerald-200 transition-all group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Ingresos Totales
            </span>
            <p className="text-3xl font-extrabold text-slate-800 mt-3 tracking-tight">
              {formatColones(ingresosTotales)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xl shadow-md shadow-emerald-500/25">
            📈
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span>✓</span>
          <span>Flujo positivo registrado</span>
        </div>
      </div>

      {/* Gastos Totales */}
      <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-rose-100 hover:shadow-md hover:border-rose-200 transition-all group">
        <div className="absolute top-0 right-0 w-28 h-28 bg-rose-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
              Gastos Totales
            </span>
            <p className="text-3xl font-extrabold text-slate-800 mt-3 tracking-tight">
              {formatColones(gastosTotales)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white text-xl shadow-md shadow-rose-500/25">
            📉
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1.5 text-xs font-medium text-rose-500">
          <span>•</span>
          <span>Costos y compras del negocio</span>
        </div>
      </div>

      {/* Balance Neto */}
      <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 hover:shadow-md hover:border-indigo-200 transition-all group">
        <div className={`absolute top-0 right-0 w-28 h-28 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform ${balance >= 0 ? 'bg-indigo-50' : 'bg-amber-50'}`} />
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              balance >= 0 
                ? 'text-indigo-600 bg-indigo-50 border-indigo-100' 
                : 'text-amber-600 bg-amber-50 border-amber-100'
            }`}>
              Balance Neto
            </span>
            <p className={`text-3xl font-extrabold mt-3 tracking-tight ${
              balance >= 0 ? 'text-indigo-600' : 'text-amber-600'
            }`}>
              {formatColones(balance)}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-md ${
            balance >= 0 
              ? 'bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-indigo-500/25' 
              : 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/25'
          }`}>
            ⚖️
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1.5 text-xs font-medium">
          <span className={`px-2 py-0.5 rounded-md font-semibold ${
            balance >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {balance >= 0 ? 'Superávit Saludable 🚀' : 'Alerta de Margen ⚠️'}
          </span>
        </div>
      </div>
    </section>
  );
}
