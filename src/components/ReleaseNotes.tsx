'use client';

import { useState, useEffect } from 'react';
import pkg from '../../package.json';

const CURRENT_VERSION = pkg.version;

export default function ReleaseNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('last_seen_version');
    if (lastSeenVersion !== CURRENT_VERSION) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 md:p-8 animate-in fade-in duration-200"
    >
      <div className="bg-[#0e0e14] border border-purple-500/40 rounded-2xl sm:rounded-3xl shadow-[0_0_80px_rgba(168,85,247,0.25)] max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white">
        
        {/* Encabezado Principal en Grande */}
        <div className="relative p-6 sm:p-8 border-b border-gray-800 bg-gradient-to-r from-purple-950/40 via-gray-900 to-pink-950/30 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              ¡Nueva Actualización del Sistema!
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
              RTSEN ERP v{CURRENT_VERSION}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mt-2">
              Descubre las nuevas características y optimizaciones diseñadas para tu restaurante.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl transition-colors text-xl font-bold"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {!showSupport ? (
            <>
              {/* Tarjetas de Novedades */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Feature 1: Recetas Multi-Ingrediente */}
                <div className="bg-gray-900/90 border border-purple-500/20 rounded-2xl p-5 hover:border-purple-500/50 transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-3xl mb-3 p-2 bg-purple-500/10 rounded-xl inline-block">
                      🍲
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Recetas Multi-Ingrediente
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Asocia múltiples insumos a platillos nuevos o existentes en un solo paso, con cálculo automático de unidades y existencias.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md self-start">
                    Módulo Admin
                  </span>
                </div>

                {/* Feature 2: POS en Colones y Cantidades */}
                <div className="bg-gray-900/90 border border-pink-500/20 rounded-2xl p-5 hover:border-pink-500/50 transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-3xl mb-3 p-2 bg-pink-500/10 rounded-xl inline-block">
                      🌮
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      POS en Colones (₡) y Cantidades
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Precios en moneda local y botones interactivos (+ / -) en la comanda para añadir 2, 3 o más unidades del mismo platillo fácilmente.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-md self-start">
                    Punto de Venta
                  </span>
                </div>

                {/* Feature 3: Seguridad de Sesión */}
                <div className="bg-gray-900/90 border border-blue-500/20 rounded-2xl p-5 hover:border-blue-500/50 transition-all flex flex-col justify-between">
                  <div>
                    <div className="text-3xl mb-3 p-2 bg-blue-500/10 rounded-xl inline-block">
                      🛡️
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Protección por Inactividad
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Expiración automática tras 15 minutos desatendida, con advertencia visual de 2 minutos y sincronización entre pestañas.
                    </p>
                  </div>
                  <span className="mt-4 text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md self-start">
                    Seguridad
                  </span>
                </div>

              </div>

              {/* Banner Informativo */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-3 text-sm text-gray-300">
                <span className="text-xl">💡</span>
                <span>
                  El flujo de comandas ahora es <strong>100% digital</strong>, eliminando impresiones innecesarias de papel y sincronizando pedidos en tiempo real con la pantalla de cocina (KDS).
                </span>
              </div>
            </>
          ) : (
            /* Vista de Soporte */
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
                Contactar al Desarrollador
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
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Ej. Sugerencia para módulo de inventario..."
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                    Mensaje o Reporte
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Describe tu sugerencia o duda con la versión..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSupport(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 px-4 rounded-xl transition-all"
                  >
                    Volver a Novedades
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-purple-600/30"
                  >
                    Enviar Correo
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer del Modal con Botones Grandes */}
        {!showSupport && (
          <div className="p-4 sm:p-6 border-t border-gray-800 bg-gray-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => setShowSupport(true)}
              className="text-xs sm:text-sm text-gray-400 hover:text-purple-300 underline transition-colors order-2 sm:order-1"
            >
              ¿Tienes dudas o sugerencias? Contactar Soporte
            </button>

            <button
              onClick={handleClose}
              autoFocus
              className="w-full sm:w-auto bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold py-3 px-8 rounded-xl transition-all shadow-xl shadow-purple-600/30 text-base order-1 sm:order-2"
            >
              ¡Entendido, vamos a trabajar! 🚀
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
