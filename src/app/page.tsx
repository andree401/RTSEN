"use client";
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const { ownerId } = useAppContext();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Gemini states
  const [apiKey, setApiKey] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    localStorage.setItem('gemini_api_key', e.target.value);
  };

  useEffect(() => {
    if (ownerId) {
      fetchTransactions();
    }
  }, [ownerId]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('finanzas_registros')
      .select('*')
      .eq('negocio_id', ownerId);
    
    if (error) {
      console.error('Error fetching transactions:', error);
    } else if (data) {
      setTransactions(data);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from('finanzas_registros')
      .delete()
      .eq('id', id);
    if (!error) {
      setTransactions(transactions.filter(tx => tx.id !== id));
    } else {
      console.error(error);
    }
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

  const handleSendMessage = async () => {
    if (!apiKey) {
      alert("Por favor ingresa tu API Key de Gemini.");
      return;
    }
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');

    try {
      const contextPrompt = `Eres un asistente financiero. Aquí están los datos del usuario: ${JSON.stringify(transactions)}. Pregunta del usuario: ${chatInput}`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }]
        })
      });
      const data = await res.json();
      if (data.error) {
         setChatMessages([...newMessages, { role: 'assistant', content: "Error: " + data.error.message }]);
      } else {
         const text = data.candidates[0].content.parts[0].text;
         setChatMessages([...newMessages, { role: 'assistant', content: text }]);
      }
    } catch (e) {
      setChatMessages([...newMessages, { role: 'assistant', content: "Error de red al conectar con Gemini." }]);
    }
  };

  const ingresosTotales = transactions.filter(t => t.tipo === 'Ingreso').reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  const gastosTotales = transactions.filter(t => t.tipo === 'Gasto').reduce((acc, t) => acc + (Number(t.monto) || 0), 0);
  const balance = ingresosTotales - gastosTotales;

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
            Exportar CSV
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
                    <td className="p-4">{new Date(tx.fecha || tx.created_at || Date.now()).toLocaleDateString()}</td>
                    <td className="p-4">{tx.descripcion}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${tx.tipo === 'Ingreso' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {tx.tipo}
                      </span>
                    </td>
                    <td className="p-4 font-medium">${Number(tx.monto).toFixed(2)}</td>
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

      {isChatOpen && (
        <div className="fixed bottom-0 right-8 w-96 bg-gray-800 border border-gray-700 rounded-t-xl shadow-2xl flex flex-col" style={{ height: '500px' }}>
          <div className="p-4 border-b border-gray-700 bg-gray-900 rounded-t-xl flex justify-between items-center">
            <h3 className="font-semibold">Chat IA Financiero</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            {chatMessages.length === 0 && (
              <p className="text-gray-500 text-sm text-center">¡Hazme una pregunta sobre tus finanzas!</p>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`p-3 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 self-end text-white' : 'bg-gray-700 self-start text-gray-200'}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-700 bg-gray-900 flex gap-2">
            <input 
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ej. ¿Cuánto vendí hoy?"
              className="flex-1 bg-gray-700 text-white px-3 py-2 rounded focus:outline-none"
            />
            <button onClick={handleSendMessage} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500">
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
