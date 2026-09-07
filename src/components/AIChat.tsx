import React, { useState } from 'react';
import { Transaction } from '../types/finance';
import { GeminiService } from '../lib/geminiService';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  transactions: Transaction[];
}

export default function AIChat({ isOpen, onClose, apiKey, transactions }: AIChatProps) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);

  if (!isOpen) return null;

  const handleSendMessage = async () => {
    if (!apiKey) {
      alert("Por favor ingresa tu API Key de Gemini.");
      return;
    }
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    const currentInput = chatInput;
    setChatInput('');

    try {
      const reply = await GeminiService.askFinancialAssistant(transactions, currentInput, apiKey);
      setChatMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setChatMessages([...newMessages, { role: 'assistant', content: e.message || "Error al conectar con Gemini." }]);
      } else {
        setChatMessages([...newMessages, { role: 'assistant', content: "Error al conectar con Gemini." }]);
      }
    }
  };

  return (
    <div className="fixed bottom-0 right-8 w-96 bg-white border border-slate-200 rounded-t-2xl shadow-2xl flex flex-col z-50 overflow-hidden" style={{ height: '520px' }}>
      <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-t-2xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <h3 className="font-bold text-sm leading-tight">Asistente Financiero IA</h3>
            <span className="text-[10px] text-purple-100 font-medium">Impulsado por Google Gemini</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50 text-sm">
        {chatMessages.length === 0 && (
          <div className="text-center my-auto py-8">
            <span className="text-3xl block mb-2">💡</span>
            <p className="text-slate-600 font-semibold mb-1">¡Hola! Soy tu asistente financiero.</p>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Pregúntame cosas como: &ldquo;¿Cuál es mi margen neto?&rdquo; o &ldquo;¿En qué gasté más este mes?&rdquo;
            </p>
          </div>
        )}
        {chatMessages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 self-end text-white rounded-tr-none shadow-sm' 
                : 'bg-white self-start text-slate-800 border border-slate-200/80 rounded-tl-none shadow-sm'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="p-3.5 border-t border-slate-200 bg-white flex gap-2">
        <input 
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="Haz una pregunta sobre tus finanzas..."
          className="flex-1 bg-slate-100 text-slate-800 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white border border-slate-200 transition-all placeholder:text-slate-400"
        />
        <button 
          onClick={handleSendMessage} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 text-xs transition-all flex items-center justify-center"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
