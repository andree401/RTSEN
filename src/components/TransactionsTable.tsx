import React from 'react';
import { Transaction } from '../types/finance';

interface TransactionsTableProps {
  transactions: Transaction[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TransactionsTable({
  transactions,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete
}: TransactionsTableProps) {
  const filteredTransactions = transactions.filter(tx => 
    tx.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatColones = (num: number) => {
    return `₡${Number(num).toLocaleString('es-CR')}`;
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> Transacciones Recientes
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Historial contable y movimientos operativos</p>
        </div>
        <div className="relative w-full md:w-72">
          <input 
            type="text" 
            placeholder="Buscar por descripción..." 
            className="w-full bg-white text-slate-800 pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm text-sm placeholder:text-slate-400 transition-all"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <th className="p-4">Fecha</th>
              <th className="p-4">Descripción</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Monto (₡)</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No se encontraron transacciones.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                    {tx.fecha ? new Date(tx.fecha).toLocaleDateString('es-CR') : (tx.created_at ? new Date(tx.created_at).toLocaleDateString('es-CR') : 'N/A')}
                  </td>
                  <td className="p-4 font-semibold text-slate-800">{tx.descripcion}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                      tx.tipo === 'Ingreso' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tx.tipo === 'Ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {tx.tipo}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                    <span className={tx.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-slate-800'}>
                      {tx.tipo === 'Ingreso' ? '+' : '-'} {formatColones(tx.monto)}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => onEdit(tx.id)} 
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => onDelete(tx.id)} 
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
