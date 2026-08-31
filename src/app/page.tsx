"use client";
import React, { useState } from 'react';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([
    { id: 1, type: 'income', amount: 5000, description: 'Salario', date: '2026-08-01' },
    { id: 2, type: 'expense', amount: 200, description: 'Supermercado', date: '2026-08-05' },
    { id: 3, type: 'expense', amount: 1500, description: 'Alquiler', date: '2026-08-10' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(tx => 
    tx.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: number) => {
    setTransactions(transactions.filter(tx => tx.id !== id));
  };

  const handleEdit = (id: number) => {
    alert(`Editar registro ${id} (Mock)`);
  };

  const handleExportCSV = () => {
    alert('Exportando a CSV (Mock)');
  };

  const handleExportPDF = () => {
    alert('Exportando a PDF (Mock)');
  };

  const handleAIAnalysis = async () => {
    alert('Solicitando análisis financiero a Gemini IA (Mock)');
    // Petición al endpoint ficticio
    try {
      const res = await fetch('/api/gemini/analysis', { method: 'POST' });
      const data = await res.json();
      console.log(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Dashboard Financiero</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">
            Exportar CSV
          </button>
          <button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded">
            Exportar PDF
          </button>
          <button onClick={handleAIAnalysis} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            Análisis IA (Gemini)
          </button>
        </div>
      </header>

      <main>
        <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Ingresos Totales</h2>
            <p className="text-3xl font-semibold text-green-400">$5,000.00</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Gastos Totales</h2>
            <p className="text-3xl font-semibold text-red-400">$1,700.00</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Balance</h2>
            <p className="text-3xl font-semibold text-blue-400">$3,300.00</p>
          </div>
        </section>

        <section className="mb-12 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Reportes de Ganancias</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-gray-700 rounded text-center border border-gray-600">
               <p className="text-gray-400 text-sm">Esta Semana</p>
               <p className="text-xl font-bold text-blue-300">+$200.00</p>
             </div>
             <div className="p-4 bg-gray-700 rounded text-center border border-gray-600">
               <p className="text-gray-400 text-sm">Este Mes</p>
               <p className="text-xl font-bold text-blue-300">+$3,300.00</p>
             </div>
             <div className="p-4 bg-gray-700 rounded text-center border border-gray-600">
               <p className="text-gray-400 text-sm">Este Año</p>
               <p className="text-xl font-bold text-blue-300">+$15,400.00</p>
             </div>
          </div>
        </section>

        <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-semibold">Transacciones Recientes</h2>
            <input 
              type="text" 
              placeholder="Buscar por descripción..." 
              className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-700 border-b border-gray-600 text-gray-400">
                  <th className="p-4 font-medium">Fecha</th>
                  <th className="p-4 font-medium">Descripción</th>
                  <th className="p-4 font-medium">Tipo</th>
                  <th className="p-4 font-medium">Monto</th>
                  <th className="p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="p-4">{tx.date}</td>
                    <td className="p-4">{tx.description}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${tx.type === 'income' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="p-4 font-medium">${tx.amount.toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(tx.id)} className="text-blue-400 hover:text-blue-300 text-sm font-semibold">Editar</button>
                        <button onClick={() => handleDelete(tx.id)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">No se encontraron registros que coincidan con la búsqueda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
