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
      setTransactions(prev => prev.filter(tx => tx.id !== id));
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
    const desc = (editFormData.descripcion || '').trim();
    if (!desc) {
      alert('La descripción no puede estar vacía.');
      return;
    }
    const monto = parseMonto(editFormData.monto);
    if (monto <= 0) {
      alert('El monto debe ser un número positivo.');
      return;
    }

    try {
      const updated = await FinanceService.updateTransaction(editingTx.id, {
        descripcion: desc,
        tipo: editFormData.tipo as 'Ingreso' | 'Gasto',
        monto: monto
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

  const parseMonto = (m: unknown): number => {
    const val = Number(m);
    return Number.isFinite(val) ? val : 0;
  };

  const getFilteredTransactions = () => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return transactions;
    return transactions.filter(tx => 
      Boolean(
        (tx?.descripcion && tx.descripcion.toLowerCase().includes(term)) ||
        (tx?.categoria && tx.categoria.toLowerCase().includes(term)) ||
        (tx?.tipo && tx.tipo.toLowerCase().includes(term))
      )
    );
  };

  const formatDate = (tx: Transaction) => {
    const rawDate = tx.fecha || tx.created_at;
    if (!rawDate) return 'N/A';
    const d = new Date(rawDate);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('es-CR');
  };

  const handleExportCSV = () => {
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) {
      alert('No hay transacciones disponibles para exportar.');
      return;
    }

    const exportData = filtered.map(tx => ({
      ID: tx.id,
      Fecha: formatDate(tx),
      Descripción: tx.descripcion || 'Sin descripción',
      Categoría: tx.categoria || 'General',
      Tipo: tx.tipo,
      'Monto (CRC)': parseMonto(tx.monto)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');
    
    XLSX.writeFile(workbook, `transacciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) {
      alert('No hay transacciones disponibles para exportar.');
      return;
    }

    const doc = new jsPDF();
    
    // Encabezado profesional
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Reporte Financiero y Contable', 14, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CR')} ${new Date().toLocaleTimeString('es-CR')}`, 14, 25);

    // Resumen de Totales
    const totalIngresos = filtered
      .filter(t => t.tipo === 'Ingreso')
      .reduce((acc, t) => acc + parseMonto(t.monto), 0);
    const totalGastos = filtered
      .filter(t => t.tipo === 'Gasto')
      .reduce((acc, t) => acc + parseMonto(t.monto), 0);
    const balance = totalIngresos - totalGastos;

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Ingresos: CRC ${totalIngresos.toLocaleString('es-CR', { minimumFractionDigits: 2 })}   |   Gastos: CRC ${totalGastos.toLocaleString('es-CR', { minimumFractionDigits: 2 })}   |   Balance: CRC ${balance.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`, 14, 32);

    // Evitar el símbolo ₡ (U+20A1) en jsPDF estándar porque corrompe caracteres en fuentes Latin-1
    const tableData = filtered.map(tx => [
      formatDate(tx),
      tx.descripcion || 'Sin descripción',
      tx.categoria || 'General',
      tx.tipo,
      `CRC ${parseMonto(tx.monto).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 37,
      head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`reporte_financiero_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-sky-50/30 text-slate-800 p-6 md:p-10 relative overflow-hidden">
      {/* Luces de fondo decorativas para dar vida y profundidad */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -z-0" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl -z-0" />

      <header className="relative z-10 mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900">
              Dashboard Financiero
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              En vivo
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitoreo en tiempo real de ingresos, gastos y balance operativo
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex flex-col text-sm bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <input 
              type="password" 
              placeholder="Gemini API Key..." 
              value={apiKey} 
              onChange={handleApiKeyChange}
              className="bg-slate-50 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium mt-1 px-1">
              Obtener Gemini API Key gratis ↗
            </a>
          </div>

          <button 
            onClick={handleExportCSV} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
          >
            <span>📊</span> Exportar Excel
          </button>
          <button 
            onClick={handleExportPDF} 
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
          >
            <span>📄</span> Exportar PDF
          </button>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)} 
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-purple-600/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
          >
            <span>✨</span>
            {isChatOpen ? 'Cerrar Asistente' : 'Asistente IA'}
          </button>
        </div>
      </header>

      <main className="relative z-10">
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md border border-slate-100 shadow-2xl text-slate-800">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <span className="text-xl">✏️</span>
              <h2 className="text-lg font-bold text-slate-900">Editar Transacción</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Descripción</label>
                <input 
                  type="text" 
                  value={editFormData.descripcion}
                  onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo</label>
                <select 
                  value={editFormData.tipo}
                  onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="Ingreso">Ingreso</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Monto (₡)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={editFormData.monto}
                  onChange={(e) => setEditFormData({ ...editFormData, monto: Number(e.target.value) })}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button 
                onClick={closeEditModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all"
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
