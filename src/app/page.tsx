"use client";
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { FinanceService } from '../lib/financeService';
import { Transaction } from '../types/finance';
import FinancialStats from '../components/FinancialStats';
import FinancialCharts from '../components/FinancialCharts';
import TransactionsTable from '../components/TransactionsTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import AIChat from '../components/AIChat';

export default function Dashboard() {
  const { ownerId } = useAppContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Gemini states
  const [apiKey, setApiKey] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setTimeout(() => setApiKey(savedKey), 0);
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    localStorage.setItem('gemini_api_key', e.target.value);
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        if (!ownerId) return;
        const data = await FinanceService.getTransactionsByOwner(ownerId);
        setTransactions(data);
      } catch (error) {
        console.error(error);
      }
    };

    if (ownerId) {
      fetchTransactions();
    }
  }, [ownerId]);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState({ descripcion: '', tipo: 'Ingreso', monto: 0 });

  const handleDelete = async (id: number) => {
    try {
      await FinanceService.deleteTransaction(id);
      setTransactions(transactions.filter(tx => tx.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (id: number) => {
    const txToEdit = transactions.find(tx => tx.id === id);
    if (txToEdit) {
      setEditingTx(txToEdit);
      setEditFormData({ 
        descripcion: txToEdit.descripcion, 
        tipo: txToEdit.tipo, 
        monto: Number(txToEdit.monto) 
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    try {
      const updated = await FinanceService.updateTransaction(editingTx.id, {
        descripcion: editFormData.descripcion,
        tipo: editFormData.tipo as 'Ingreso' | 'Gasto',
        monto: editFormData.monto
      });
      setTransactions(transactions.map(tx => tx.id === editingTx.id ? updated : tx));
      setEditingTx(null);
    } catch (error) {
      console.error('Error al actualizar:', error);
      alert('Error al actualizar el registro.');
    }
  };

  const closeEditModal = () => {
    setEditingTx(null);
  };

  const getFilteredTransactions = () => {
    return transactions.filter(tx => 
      tx.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const formatDate = (tx: Transaction) => {
    return tx.fecha ? new Date(tx.fecha).toLocaleDateString() : (tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'N/A');
  };

  const handleExportCSV = () => {
    const filtered = getFilteredTransactions();
    const exportData = filtered.map(tx => ({
      ID: tx.id,
      Fecha: formatDate(tx),
      Descripción: tx.descripcion,
      Tipo: tx.tipo,
      Monto: Number(tx.monto).toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');
    
    XLSX.writeFile(workbook, 'transacciones.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Reporte de Transacciones', 14, 15);
    
    const filtered = getFilteredTransactions();
    const tableData = filtered.map(tx => [
      formatDate(tx),
      tx.descripcion,
      tx.tipo,
      `$${Number(tx.monto).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 20,
      head: [['Fecha', 'Descripción', 'Tipo', 'Monto']],
      body: tableData,
    });

    doc.save('transacciones.pdf');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Dashboard Financiero</h1>
        
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex flex-col text-sm">
            <input 
              type="password" 
              placeholder="Gemini API Key" 
              value={apiKey} 
              onChange={handleApiKeyChange}
              className="bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:outline-none mb-1"
            />
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              Consigue tu API Key aquí
            </a>
          </div>

          <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">
            Exportar Excel
          </button>
          <button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded">
            Exportar PDF
          </button>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            {isChatOpen ? 'Cerrar Chat IA' : 'Chat IA'}
          </button>
        </div>
      </header>

      <main>
        <FinancialStats transactions={transactions} />
        
        <FinancialCharts transactions={transactions} />
        
        <TransactionsTable 
          transactions={transactions}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </main>

      <AIChat 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        apiKey={apiKey}
        transactions={transactions}
      />

      {editingTx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Editar Transacción</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                <input 
                  type="text" 
                  value={editFormData.descripcion}
                  onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                <select 
                  value={editFormData.tipo}
                  onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="Ingreso">Ingreso</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Monto ($)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={editFormData.monto}
                  onChange={(e) => setEditFormData({ ...editFormData, monto: Number(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={closeEditModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
