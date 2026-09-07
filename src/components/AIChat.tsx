import React, { useState, useEffect, useRef } from 'react';
import { Transaction } from '../types/finance';
import { GeminiService } from '../lib/geminiService';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  transactions: Transaction[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

export default function AIChat({ isOpen, onClose, apiKey, transactions }: AIChatProps) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (promptToSend?: string) => {
    const query = (promptToSend || chatInput).trim();
    if (!query || isLoading) return;

    if (!apiKey.trim()) {
      setChatMessages(prev => [
        ...prev,
        { role: 'user', content: query },
        { 
          role: 'assistant', 
          content: '⚠️ Se requiere una Gemini API Key para consultar al asistente. Por favor ingrésala en la parte superior del Dashboard.',
          isError: true 
        }
      ]);
      setChatInput('');
      return;
    }

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: query }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsLoading(true);

    try {
      const reply = await GeminiService.askFinancialAssistant(transactions, query, apiKey);
      setChatMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error inesperado al conectar con Gemini.';
      setChatMessages([...newMessages, { role: 'assistant', content: errorMsg, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    '¿Cuál es mi balance neto actual?',
    '¿Cuáles son mis 5 transacciones recientes?',
    '¿Cómo puedo reducir mis gastos?',
  ];

  return (
    <div className="fixed bottom-0 right-4 sm:right-8 w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-t-2xl shadow-2xl flex flex-col z-50 overflow-hidden" style={{ height: '540px' }}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-t-2xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div>
            <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
              Asistente Financiero IA
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/20 font-mono">3.8 Flash</span>
            </h3>
            <span className="text-[10px] text-purple-100 font-medium">Análisis inteligente de tu negocio</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Cerrar chat"
        >
          &times;
        </button>
      </div>

      {/* API Key Warning Banner if missing */}
      {!apiKey.trim() && (
        <div className="bg-amber-50 border-b border-amber-200 p-2.5 text-[11px] text-amber-800 flex items-center justify-between">
          <span>🔑 Falta configurar tu Gemini API Key arriba</span>
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-600 font-bold hover:underline"
          >
            Obtener ↗
          </a>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50 text-sm">
        {chatMessages.length === 0 && (
          <div className="text-center my-auto py-4">
            <span className="text-3xl block mb-2">💡</span>
            <p className="text-slate-700 font-bold text-sm mb-1">¡Hola! Soy tu asesor financiero.</p>
            <p className="text-slate-400 text-xs max-w-xs mx-auto mb-4">
              Pregúntame sobre tus ingresos, gastos, proyecciones o margen operativo.
            </p>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Preguntas rápidas:</span>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="text-left text-xs bg-white hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 text-slate-700 px-3 py-2 rounded-xl transition-all shadow-xs"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`p-3.5 rounded-2xl max-w-[88%] text-xs leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 self-end text-white rounded-tr-none shadow-sm' 
                : msg.isError
                  ? 'bg-rose-50 self-start text-rose-800 border border-rose-200 rounded-tl-none shadow-sm'
                  : 'bg-white self-start text-slate-800 border border-slate-200/80 rounded-tl-none shadow-sm'
            }`}
          >
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div className="bg-white self-start text-slate-600 border border-slate-200/80 rounded-2xl rounded-tl-none p-3.5 shadow-sm flex items-center gap-2 text-xs">
            <span className="animate-spin text-indigo-600">⚡</span>
            <span>Gemini está analizando tus números...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
        <input 
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
          placeholder="Pregunta sobre tus finanzas..."
          disabled={isLoading}
          className="flex-1 bg-slate-100 text-slate-800 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white border border-slate-200 transition-all placeholder:text-slate-400 disabled:opacity-60"
        />
        <button 
          onClick={() => handleSendMessage()} 
          disabled={isLoading || !chatInput.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 text-xs transition-all flex items-center justify-center cursor-pointer"
        >
          {isLoading ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
