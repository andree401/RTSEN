import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Transaction } from '../types/finance';

interface FinancialChartsProps {
  transactions: Transaction[];
}

export default function FinancialCharts({ transactions }: FinancialChartsProps) {
  const ingresos = transactions
    .filter(t => t.tipo === 'Ingreso')
    .reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  const gastos = transactions
    .filter(t => t.tipo === 'Gasto')
    .reduce((acc, t) => acc + (Number(t.monto) || 0), 0);

  const pieData = [
    { name: 'Ingresos', value: ingresos },
    { name: 'Gastos', value: gastos }
  ];
  const COLORS = ['#4ade80', '#f87171'];

  // Agrupando por fecha
  const dataByDate = transactions.reduce((acc: any, t) => {
    const dateStr = t.fecha || t.created_at || new Date().toISOString();
    const date = new Date(dateStr).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, Ingresos: 0, Gastos: 0 };
    }
    if (t.tipo === 'Ingreso') acc[date].Ingresos += Number(t.monto);
    else acc[date].Gastos += Number(t.monto);
    return acc;
  }, {});

  const barData = Object.values(dataByDate).slice(-7); // Últimos 7 registros de fechas

  return (
    <section className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-white">Distribución de Finanzas</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-white">Flujo de los últimos días</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip cursor={{fill: '#374151'}} formatter={(value) => `$${Number(value).toFixed(2)}`} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
              <Legend />
              <Bar dataKey="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
