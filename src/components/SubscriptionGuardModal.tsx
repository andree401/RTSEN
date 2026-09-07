'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

export default function SubscriptionGuardModal() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeRole } = useAppContext();

  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  const exemptPaths = ['/login', '/owner', '/configuracion', '/sys-ops'];

  const checkStatus = async () => {
    if (exemptPaths.some(p => pathname.startsWith(p))) {
      setIsBlocked(false);
      return;
    }

    if (!activeRole) {
      setIsBlocked(false);
      return;
    }

    try {
      // Siempre refrescar — crítico para iOS Safari que congela tokens
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      const session = refreshData?.session;
      if (refreshError || !session) {
        setIsBlocked(false);
        return;
      }

      const res = await fetch('/api/stripe/status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        setIsBlocked(false);
        return;
      }

      const data = await res.json();
      if (data && data.active === false) {
        setIsBlocked(true);
        setReason(
          data.status === 'past_due'
            ? 'El pago de la suscripción mensual o anual está pendiente.'
            : 'El período de prueba ha finalizado.'
        );
      } else {
        setIsBlocked(false);
      }
    } catch (err) {
      console.error('Error en subscription guard:', err);
      setIsBlocked(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [pathname, activeRole]);

  const handleQuickRenew = async () => {
    try {
      setIsRenewing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/stripe/renew-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ days: 30 }),
      });

      if (res.ok) {
        setIsBlocked(false);
        alert('🎉 ¡Prueba extendida por 30 días adicionales! Continúa operando tu sistema.');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'No se pudo renovar la prueba.');
      }
    } catch (e: any) {
      alert(e.message || 'Error al extender prueba');
    } finally {
      setIsRenewing(false);
    }
  };

  if (!isBlocked) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-500 p-0.5 mx-auto mb-4 shadow-lg shadow-emerald-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
            🎁
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
          PERÍODO DE PRUEBA FINALIZADO
        </span>

        <h2 className="text-xl font-black text-white mt-3 mb-2">
          ¿Quieres seguir probando gratis?
        </h2>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {reason} Como el sistema sigue en fase de perfeccionamiento, puedes extender tu prueba gratis por 30 días más con un solo clic.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleQuickRenew}
            disabled={isRenewing}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
          >
            {isRenewing ? 'Extendiendo prueba...' : '🎁 Extender Prueba Gratis (30 días más)'}
          </button>

          <button
            onClick={() => router.push('/owner')}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            👑 Ir al Portal del Dueño (Ver Planes)
          </button>
        </div>
      </div>
    </div>
  );
}
