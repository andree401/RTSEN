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

  return (
    <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-semibold">Transacciones Recientes</h2>
        <input 
          type="text" 
          placeholder="Buscar por descripción..." 
          className="bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-full md:w-64"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
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
                <td className="p-4">{tx.fecha ? new Date(tx.fecha).toLocaleDateString() : (tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'N/A')}</td>
                <td className="p-4">{tx.descripcion}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${tx.tipo === 'Ingreso' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {tx.tipo}
                  </span>
                </td>
                <td className="p-4 font-medium">${Number(tx.monto).toFixed(2)}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(tx.id)} className="text-blue-400 hover:text-blue-300 text-sm font-semibold">Editar</button>
                    <button onClick={() => onDelete(tx.id)} className="text-red-400 hover:text-red-300 text-sm font-semibold">Eliminar</button>
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
  );
}
