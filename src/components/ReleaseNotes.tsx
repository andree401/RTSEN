'use client';

import { useState, useEffect } from 'react';

const CURRENT_VERSION = '4.5.5';

export default function ReleaseNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('last_seen_version');
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('last_seen_version', CURRENT_VERSION);
    setIsOpen(false);
    setShowSupport(false);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:ownnera@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0d0d0d] border border-pink-500/30 rounded-xl shadow-2xl shadow-violet-900/20 max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {!showSupport ? (
            <>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent mb-4">
                ¡Bienvenido a la versión {CURRENT_VERSION}!
              </h2>
              <div className="text-gray-300 space-y-3 mb-6">
                <p>Novedades en esta actualización:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>1. Mejoras en la base de datos.</li>
                  <li>2. Correcciones en el punto de venta.</li>
                </ul>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white font-medium py-2 px-4 rounded-lg transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => setShowSupport(true)}
                  className="flex-1 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-gray-700 text-gray-200 font-medium py-2 px-4 rounded-lg transition-all"
                >
                  Soporte
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent mb-4">
                Contactar Soporte
              </h2>
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">
                    Asunto
                  </label>
                  <input
                    id="subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                    placeholder="Ej. Problema con..."
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                    placeholder="Describe tu problema..."
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSupport(false)}
                    className="flex-1 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-gray-700 text-gray-200 font-medium py-2 px-4 rounded-lg transition-all"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white font-medium py-2 px-4 rounded-lg transition-all"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
