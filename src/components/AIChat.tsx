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
    <div className="fixed bottom-0 right-8 w-96 bg-gray-800 border border-gray-700 rounded-t-xl shadow-2xl flex flex-col" style={{ height: '500px' }}>
      <div className="p-4 border-b border-gray-700 bg-gray-900 rounded-t-xl flex justify-between items-center">
        <h3 className="font-semibold">Chat IA Financiero</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
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
  );
}
