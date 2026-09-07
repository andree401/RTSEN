'use client';

import React from 'react';

interface SessionWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export default function SessionWarningModal({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogout,
}: SessionWarningModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStayLoggedIn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onStayLoggedIn]);

  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = remainingSeconds <= 30;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-gray-800 border border-amber-500/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white transform transition-all">
        {/* Encabezado con Icono */}
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/30 text-amber-400 flex-shrink-0 animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 id="session-warning-title" className="text-xl font-bold text-white">
              ¿Sigues ahí? 👀
            </h2>
            <p className="text-xs text-amber-400 font-medium">
              Sesión por expirar por inactividad
            </p>
          </div>
        </div>

        {/* Explicación amigable */}
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          Por seguridad de los datos financieros de tu restaurante, cerraremos tu sesión automáticamente si no detectamos actividad.
        </p>

        {/* Reloj contador regresivo */}
        <div className={`text-center py-4 px-6 rounded-xl border mb-6 transition-colors ${
          isUrgent 
            ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse' 
            : 'bg-gray-900/60 border-gray-700 text-amber-400'
        }`}>
          <span className="text-xs uppercase tracking-widest font-semibold block text-gray-400 mb-1">
            Tiempo restante
          </span>
          <span className="text-4xl font-mono font-extrabold tracking-wider">
            {formattedTime}
          </span>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStayLoggedIn}
            autoFocus
            className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            ¡Sigo aquí! Mantener activa
          </button>
          <button
            onClick={onLogout}
            className="sm:w-auto bg-gray-700 hover:bg-red-600 active:bg-red-700 text-gray-300 hover:text-white font-medium py-2.5 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
