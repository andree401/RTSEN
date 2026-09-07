'use client';

import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Transaction } from '../types/finance';

interface FinancialChartsProps {
  transactions: Transaction[];
}

export default function FinancialCharts({ transactions }: FinancialChartsProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'trend'>('flow');
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeTransactions: Transaction[] = useMemo(() => {
    return Array.isArray(transactions) ? transactions : [];
  }, [transactions]);

  const parseMonto = (monto: unknown): number => {
    const parsed = Number(monto);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatColones = (value: unknown) => {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    return `₡${safe.toLocaleString('es-CR')}`;
  };

  const formatYAxis = (val: unknown) => {
    const v = Number(val);
    if (!Number.isFinite(v) || v === 0) return '₡0';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}₡${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}₡${(abs / 1_000).toFixed(0)}k`;
    return `${sign}₡${abs}`;
  };

  const { ingresos, gastos, pieData } = useMemo(() => {
    const totalIngresos = safeTransactions
      .filter((t: Transaction) => t && t.tipo === 'Ingreso')
      .reduce((acc: number, t: Transaction) => acc + parseMonto(t.monto), 0);
    const totalGastos = safeTransactions
      .filter((t: Transaction) => t && t.tipo === 'Gasto')
      .reduce((acc: number, t: Transaction) => acc + parseMonto(t.monto), 0);

    return {
      ingresos: totalIngresos,
      gastos: totalGastos,
      pieData: [
        { name: 'Ingresos', value: totalIngresos },
        { name: 'Gastos', value: totalGastos },
      ],
    };
  }, [safeTransactions]);

  const COLORS = ['#10b981', '#f43f5e'];

  // Agrupando por fecha ordenada de forma pura e inmutable
  const { sortedDates, barData, trendData } = useMemo(() => {
    const dateMap: Record<string, { date: string; Ingresos: number; Gastos: number; Balance: number; timestamp: number }> = {};

    safeTransactions.forEach((t: Transaction) => {
      if (!t) return;
      let dateKey = 'Sin fecha';
      let timestamp = 0;

      const rawDate = t.fecha || t.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dateKey = d.toLocaleDateString('es-CR');
          timestamp = d.getTime();
        }
      }

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { date: dateKey, Ingresos: 0, Gastos: 0, Balance: 0, timestamp };
      }

      const monto = parseMonto(t.monto);
      if (t.tipo === 'Ingreso') {
        dateMap[dateKey].Ingresos += monto;
      } else {
        dateMap[dateKey].Gastos += monto;
      }
      dateMap[dateKey].Balance = dateMap[dateKey].Ingresos - dateMap[dateKey].Gastos;
    });

    // Ordenar cronológicamente sin mutar nada externo
    const sorted = Object.values(dateMap).sort((a, b) => a.timestamp - b.timestamp);

    // Últimos 7 periodos para gráfico de barras
    const bar = sorted.slice(-7);

    // Tendencia acumulada y proyectada
    const trend = sorted.reduce<Array<{ date: string; BalanceDiario: number; BalanceAcumulado: number; TendenciaPromedio: number }>>(
      (acc, item, idx) => {
        const prevAcumulado = idx > 0 ? acc[idx - 1].BalanceAcumulado : 0;
        const totalAcumulado = prevAcumulado + item.Balance;
        acc.push({
          date: item.date,
          BalanceDiario: item.Balance,
          BalanceAcumulado: totalAcumulado,
          TendenciaPromedio: Math.round(totalAcumulado / (idx + 1)),
        });
        return acc;
      },
      []
    );

    return { sortedDates: sorted, barData: bar, trendData: trend };
  }, [safeTransactions]);

  const hasData = safeTransactions.length > 0 && (ingresos > 0 || gastos > 0);

  return (
    <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Gráfico de Distribución (Pastel) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between min-h-[360px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Distribución de Finanzas</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-mono font-medium">
            Total en ₡ Colones
          </span>
        </div>
        <div className="h-64 flex items-center justify-center">
          {!isMounted ? (
            <div className="text-slate-400 text-xs animate-pulse">Cargando gráficos...</div>
          ) : !hasData ? (
            <div className="text-center text-slate-400 text-xs py-10">
              <span className="text-3xl block mb-2">📊</span>
              No hay movimientos registrados para mostrar distribución.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {pieData.map((entry: { name: string; value: number }, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatColones(value), '']}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: '#e2e8f0', 
                    color: '#0f172a', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 flex justify-around text-center text-sm border-t border-slate-100 pt-3">
          <div>
            <span className="text-slate-400 block text-xs font-medium">Ingresos</span>
            <span className="font-bold text-emerald-600 text-base">{formatColones(ingresos)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs font-medium">Gastos</span>
            <span className="font-bold text-rose-600 text-base">{formatColones(gastos)}</span>
          </div>
        </div>
      </div>

      {/* 2. Flujo Histórico y Línea de Tendencia Interactiva */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between min-h-[360px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            {activeTab === 'flow' ? 'Flujo de Ingresos vs Gastos' : 'Tendencia Predictiva de Balance'}
          </h2>

          {/* Toggle entre Barras y Línea de Tendencia */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'flow'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flujo
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'trend'
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 Tendencia
            </button>
          </div>
        </div>

        <div className="h-64 flex items-center justify-center">
          {!isMounted ? (
            <div className="text-slate-400 text-xs animate-pulse">Cargando gráficos...</div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-10">
              <span className="text-3xl block mb-2">📈</span>
              No hay historial de fechas para proyectar tendencias.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'flow' ? (
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                    formatter={(value) => [formatColones(value), '']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      color: '#0f172a', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [formatColones(value), '']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      color: '#0f172a', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="BalanceAcumulado"
                    name="Balance Acumulado"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#8b5cf6' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="TendenciaPromedio"
                    name="Tendencia Proyectada"
                    stroke="#0284c7"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3 flex justify-between items-center">
          <span>
            {activeTab === 'flow'
              ? 'Comparativa de entradas y salidas de los últimos 7 periodos con actividad.'
              : 'Evolución del balance neto acumulado y proyección histórica del negocio.'}
          </span>
          <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {sortedDates.length} periodos registrados
          </span>
        </div>
      </div>
    </section>
  );
}
