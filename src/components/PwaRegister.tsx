'use client';

import { useEffect, useState } from 'react';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Registrar Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado con éxito:', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA] Error al registrar Service Worker:', error);
        });
    }

    // 2. Capturar evento de instalación BeforeInstallPrompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Si el usuario ya lo descartó, respetar su decisión
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (dismissed) return;

      // Verificar si el modal de ReleaseNotes está pendiente de mostrarse
      const lastSeenVersion = localStorage.getItem('last_seen_version');
      const isReleaseNotesPending = lastSeenVersion !== '5.0.0';

      if (!isReleaseNotesPending) {
        // Si ya vio las notas, mostrar tras una pequeña pausa de cortesía
        setTimeout(() => setShowInstallBanner(true), 1200);
      }
    };

    // 3. Escuchar cuando el usuario cierre el cartel de bienvenida formal
    const handleReleaseNotesClosed = () => {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        // Esperar 800ms tras cerrar las notas para que la transición sea fluida y no invasiva
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 800);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('release_notes_closed', handleReleaseNotesClosed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('release_notes_closed', handleReleaseNotesClosed);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] Usuario aceptó instalar RTSEN ERP');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9990] bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center font-black text-white text-lg shadow-md flex-shrink-0">
          R
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Instalar RTSEN ERP</h4>
          <p className="text-[11px] text-slate-300 leading-tight">Accede más rápido como app nativa en tu dispositivo.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer text-xs"
          title="Descartar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
