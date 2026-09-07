'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithPin } = useAppContext();

  // Roles: 'cajero' | 'cocina' | 'admin' | 'owner'
  const [selectedRole, setSelectedRole] = useState<'cajero' | 'cocina' | 'admin' | 'owner'>('cajero');

  // Estados Dueño (Supabase Auth)
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  // Estados Empleados (PIN)
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Manejo de teclado numérico para PIN
  const handlePinKey = (val: string) => {
    if (val === 'DEL') {
      setPin(prev => prev.slice(0, -1));
    } else if (val === 'CLR') {
      setPin('');
    } else if (pin.length < 6) {
      setPin(prev => prev + val);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await login(email, password, isSignUp, isSignUp ? restaurantName : undefined);
      router.push('/');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error en inicio de sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Ingresa tu PIN de acceso');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const emp = await loginWithPin(pin, selectedRole === 'admin' ? 'admin' : undefined);
      // Redirección inteligente según el rol autenticado
      if (selectedRole === 'cocina') {
        router.push('/cocina');
      } else if (selectedRole === 'admin') {
        router.push('/admin');
      } else {
        router.push('/restaurante');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'PIN inválido');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4 font-sans text-slate-100">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative overflow-hidden">
        
        {/* Glow decorativo de fondo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado Principal */}
        <div className="text-center mb-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 p-0.5 mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
              ⚡
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            RTSEN ERP
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma Integral para Restaurantes y Bares
          </p>
        </div>

        {/* Selector de Roles con Pestañas Visuales */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => { setSelectedRole('cajero'); setErrorMsg(null); setPin(''); }}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              selectedRole === 'cajero'
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-base block mb-0.5">💵</span>
            <span className="text-[10px] block leading-tight">Cajero</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('cocina'); setErrorMsg(null); setPin(''); }}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              selectedRole === 'cocina'
                ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-base block mb-0.5">🍳</span>
            <span className="text-[10px] block leading-tight">Cocina</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('admin'); setErrorMsg(null); setPin(''); }}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-base block mb-0.5">⚙️</span>
            <span className="text-[10px] block leading-tight">Admin</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('owner'); setErrorMsg(null); }}
            className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
              selectedRole === 'owner'
                ? 'bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="text-base block mb-0.5">👑</span>
            <span className="text-[10px] block leading-tight">Dueño</span>
          </button>
        </div>

        {/* Alerta de Error */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Formulario 1: Roles por PIN (Cajero, Cocina, Admin) */}
        {selectedRole !== 'owner' ? (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="text-center">
              <span className="text-xs text-slate-400 font-medium">
                {selectedRole === 'cajero' && 'Acceso al Punto de Venta (POS) con tu PIN'}
                {selectedRole === 'cocina' && 'Acceso a la Pantalla de Comandas KDS'}
                {selectedRole === 'admin' && 'Acceso a Gestión de Menú, Inventario y Recetas'}
              </span>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="•••••"
                className="w-full text-center text-2xl tracking-[0.4em] font-mono bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white p-3.5 rounded-xl outline-none transition-all placeholder:text-slate-700"
                autoFocus
              />
            </div>

            {/* Teclado numérico táctil rápido */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePinKey(k)}
                  className={`py-2.5 rounded-xl font-mono text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                    k === 'CLR' || k === 'DEL'
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs'
                      : 'bg-slate-800 hover:bg-slate-700/80 text-white'
                  }`}
                >
                  {k === 'DEL' ? '⌫' : k}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || pin.length < 3}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer mt-2"
            >
              {isLoading ? 'Verificando PIN...' : 'Entrar a la Estación'}
            </button>
          </form>
        ) : (
          /* Formulario 2: Propietario / Dueño (Supabase Auth Email + Pass) */
          <form onSubmit={handleOwnerSubmit} className="space-y-3.5">
            <div className="text-center mb-1">
              <span className="text-xs text-amber-300 font-semibold">
                {isSignUp ? 'Registro de Nuevo Restaurante' : 'Acceso Principal del Propietario'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Correo del Propietario
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="propietario@restaurante.com"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white p-2.5 rounded-xl text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white p-2.5 rounded-xl text-sm outline-none transition-all"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Nombre del Restaurante
                </label>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  placeholder="Ej. Cantina Los Amigos"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white p-2.5 rounded-xl text-sm outline-none transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-600/20 active:scale-98 cursor-pointer mt-3"
            >
              {isLoading ? 'Conectando...' : (isSignUp ? 'Crear Cuenta y Restaurante' : 'Ingresar como Dueño')}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
              >
                {isSignUp ? '¿Ya tienes cuenta de dueño? Inicia sesión' : '¿Nuevo negocio? Regístrate gratis aquí'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}