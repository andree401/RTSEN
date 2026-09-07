'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PLANS } from '@/lib/stripe';

type BillingStatus = {
  active: boolean;
  status: string;
  plan: string;
  currentPeriodEnd: string | null;
  hasCustomerId: boolean;
  hasSubscriptionId: boolean;
};

export default function BillingManager() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Inicie sesión como propietario para administrar la facturación.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/stripe/status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'No se pudo obtener el estado de suscripción');
      }

      const data = await res.json();
      setBilling(data);
    } catch (err: any) {
      console.error('Error en fetchStatus:', err);
      setError(err.message || 'Error al conectar con el servidor de facturación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRenewTrial = async (days = 30) => {
    try {
      setActionLoading('renew');
      setError(null);
      setFeedbackMsg(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión no encontrada');

      const res = await fetch('/api/stripe/renew-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ days }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al renovar prueba gratuita');

      setFeedbackMsg(`🎉 ¡Prueba gratuita extendida exitosamente por ${days} días! Puedes seguir testeando sin límites.`);
      await fetchStatus();
    } catch (err: any) {
      console.error('Error al renovar prueba:', err);
      setError(err.message || 'Error al extender prueba');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckout = async (planKey: 'monthly' | 'annual') => {
    try {
      setActionLoading(planKey);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión no encontrada');

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar Stripe Checkout');

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error en checkout:', err);
      setError(err.message || 'Error al iniciar checkout');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setActionLoading('portal');
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión no encontrada');

      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al abrir Customer Portal');

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error en portal:', err);
      setError(err.message || 'Error al abrir portal');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-800/80 border border-slate-700/70 rounded-2xl animate-pulse">
        <div className="h-4 w-48 bg-slate-700 rounded mb-3"></div>
        <div className="h-8 w-full bg-slate-700/50 rounded"></div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Activa (Pro)</span>;
      case 'trialing':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">Prueba Gratuita</span>;
      case 'past_due':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">Pago Pendiente</span>;
      case 'canceled':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-slate-500/20 text-slate-300 border border-slate-500/30">Cancelada</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-slate-500/20 text-slate-300 border border-slate-500/30">{status}</span>;
    }
  };

  return (
    <section className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 relative overflow-hidden shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💳</span>
            <h3 className="text-base font-bold text-white">Suscripción y Facturación Stripe</h3>
            {billing && statusBadge(billing.status)}
          </div>
          <p className="text-xs text-slate-400">
            Administra tu plan empresarial, extiende tu período de pruebas o gestiona métodos de pago.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de Renovar Prueba Gratis */}
          <button
            onClick={() => handleRenewTrial(30)}
            disabled={actionLoading === 'renew'}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-50"
            title="Extender 30 días de prueba para seguir puliendo el software"
          >
            <span>🎁</span>
            <span>{actionLoading === 'renew' ? 'Extendiendo...' : 'Renovar Prueba Gratis (30 días)'}</span>
          </button>

          {billing?.hasCustomerId && (
            <button
              onClick={handleOpenPortal}
              disabled={actionLoading === 'portal'}
              className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'portal' ? 'Cargando...' : '⚙️ Portal Stripe'}
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-700/70 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {billing && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta Plan Mensual */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            billing.plan === 'monthly' && billing.active
              ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900/90 border-indigo-500/60 ring-1 ring-indigo-500/40'
              : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-200">{PLANS.monthly.name}</span>
                <span className="text-xs font-mono text-indigo-400 font-bold">{PLANS.monthly.displayPrice}</span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {PLANS.monthly.description}
              </p>
            </div>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={actionLoading === 'monthly' || (billing.plan === 'monthly' && billing.active)}
              className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed ${
                billing.plan === 'monthly' && billing.active
                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              {billing.plan === 'monthly' && billing.active
                ? '✓ Plan Actual Activo'
                : actionLoading === 'monthly'
                ? 'Conectando con Stripe...'
                : 'Activar Plan Mensual'}
            </button>
          </div>

          {/* Tarjeta Plan Anual */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
            billing.plan === 'annual' && billing.active
              ? 'bg-gradient-to-b from-amber-950/60 to-slate-900/90 border-amber-500/60 ring-1 ring-amber-500/40'
              : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600'
          }`}>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider shadow">
              Ahorra 17%
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-200">{PLANS.annual.name}</span>
                <span className="text-xs font-mono text-amber-400 font-bold">{PLANS.annual.displayPrice}</span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {PLANS.annual.description}
              </p>
            </div>

            <button
              onClick={() => handleCheckout('annual')}
              disabled={actionLoading === 'annual' || (billing.plan === 'annual' && billing.active)}
              className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed ${
                billing.plan === 'annual' && billing.active
                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              }`}
            >
              {billing.plan === 'annual' && billing.active
                ? '✓ Plan Anual Activo'
                : actionLoading === 'annual'
                ? 'Conectando con Stripe...'
                : 'Activar Plan Anual (2 meses gratis)'}
            </button>
          </div>
        </div>
      )}

      {billing?.currentPeriodEnd && (
        <div className="mt-4 text-center text-[11px] text-slate-400 font-mono">
          Estado actual: <span className="text-emerald-400 font-bold">{billing.status.toUpperCase()}</span> | Vencimiento:{' '}
          <span className="text-slate-200 font-bold">
            {new Date(billing.currentPeriodEnd).toLocaleDateString('es-CR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      )}
    </section>
  );
}
