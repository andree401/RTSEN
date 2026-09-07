'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import BillingManager from '@/components/BillingManager';

export default function OwnerMasterPortal() {
  const { ownerId, logout, activeRole } = useAppContext();
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    totalPlatillos: 0,
    totalComandasActivas: 0,
    ingresosHoy: 0,
  });
  const [empleados, setEmpleados] = useState<Array<{ id: string; nombre: string; pin: string; rol?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Aislamiento Zero-Trust: Solo el rol de Propietario autenticado tiene acceso
  if (activeRole !== 'owner') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 text-3xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            👑
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Portal Exclusivo del Propietario</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Tu estación actual ({activeRole ? activeRole.toUpperCase() : 'NO AUTORIZADA'}) no tiene privilegios para acceder al panel maestro del Propietario.
          </p>
          <Link
            href={activeRole === 'cajero' ? '/restaurante' : activeRole === 'cocina' ? '/cocina' : activeRole === 'admin' ? '/admin' : '/login'}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-block"
          >
            Volver a mi Estación
          </Link>
        </div>
      </div>
    );
  }

  // Aislamiento Zero-Trust: Bloqueo de acceso maestro con PIN del Propietario
  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Privacidad de credenciales frente a espionaje de hombro (shoulder-surfing)
  const [revealedPins, setRevealedPins] = useState<Set<string>>(new Set());
  const [showAllPins, setShowAllPins] = useState<boolean>(false);

  // Formulario de nuevo empleado
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('cajero');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [addEmpLoading, setAddEmpLoading] = useState(false);
  const [addEmpError, setAddEmpError] = useState<string | null>(null);
  const [addEmpSuccess, setAddEmpSuccess] = useState<string | null>(null);

  const [masterPin, setMasterPin] = useState<string>('0000');
  const [changePinInput, setChangePinInput] = useState<string>('');
  const [changePinLoading, setChangePinLoading] = useState<boolean>(false);
  const [changePinMsg, setChangePinMsg] = useState<string | null>(null);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName) {
      setAddEmpError('El nombre es requerido');
      return;
    }
    setAddEmpLoading(true);
    setAddEmpError(null);
    setAddEmpSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No hay sesión activa');

      const res = await fetch('/api/empleados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          nombre: newEmpName,
          rol: newEmpRole,
          pin: newEmpPin || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear empleado');

      setAddEmpSuccess(`Empleado ${data.empleado.nombre} creado exitosamente con PIN ${data.empleado.pin}`);
      setNewEmpName('');
      setNewEmpPin('');
      setNewEmpRole('cajero');
      loadMasterData();
    } catch (err: unknown) {
      const error = err as Error;
      setAddEmpError(error.message);
    } finally {
      setAddEmpLoading(false);
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este empleado?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No hay sesión activa');

      const res = await fetch(`/api/empleados?id=${empId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar empleado');

      loadMasterData();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedAuth = sessionStorage.getItem('fw_owner_authenticated');
    const tempExpires = sessionStorage.getItem('fw_owner_temp_unlock_expires');

    if (storedAuth !== 'true') return;

    if (tempExpires) {
      const expires = parseInt(tempExpires, 10);
      if (Date.now() < expires) {
        setIsMasterAuthenticated(true);
        const msLeft = expires - Date.now();
        const timer = setTimeout(() => {
          setIsMasterAuthenticated(false);
          try {
            sessionStorage.removeItem('fw_owner_authenticated');
            sessionStorage.removeItem('fw_owner_temp_unlock_expires');
          } catch {}
        }, msLeft);
        return () => clearTimeout(timer);
      } else {
        // Expirado — limpiar
        sessionStorage.removeItem('fw_owner_authenticated');
        sessionStorage.removeItem('fw_owner_temp_unlock_expires');
      }
    } else {
      // Desbloqueo normal sin expiración
      setIsMasterAuthenticated(true);
    }
  }, []);

  const handleMasterUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === masterPin) {
      setIsMasterAuthenticated(true);
      setPinError(null);
      try {
        sessionStorage.setItem('fw_owner_authenticated', 'true');
      } catch {}
    } else {
      setPinError('PIN Maestro incorrecto. Acceso denegado.');
      setPinInput('');
    }
  };

  const handleMasterLock = () => {
    setIsMasterAuthenticated(false);
    try {
      sessionStorage.removeItem('fw_owner_authenticated');
    } catch {}
  };

  const togglePinVisibility = (empId: string) => {
    setRevealedPins(prev => {
      const updated = new Set(prev);
      if (updated.has(empId)) {
        updated.delete(empId);
      } else {
        updated.add(empId);
      }
      return updated;
    });
  };

  const toggleAllPins = () => {
    if (showAllPins) {
      setRevealedPins(new Set());
      setShowAllPins(false);
    } else {
      setRevealedPins(new Set(empleados.map(e => e.id)));
      setShowAllPins(true);
    }
  };

  const loadMasterData = useCallback(async () => {
    if (!ownerId) return;
    try {
      setIsRefreshing(true);

      // 1. Empleados registrados
      const { data: empData } = await supabase
        .from('empleados')
        .select('id, nombre, pin, rol')
        .eq('negocio_id', ownerId);

      if (empData) {
        setEmpleados(empData);
      }

      const { data: negocioData } = await supabase
        .from('negocios')
        .select('pin_maestro')
        .eq('id', ownerId)
        .single();
      if (negocioData?.pin_maestro) {
        setMasterPin(negocioData.pin_maestro as string);
      } else {
        setMasterPin('0000');
      }

      // 2. Platillos del menú
      const { count: menuCount } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('negocio_id', ownerId);

      // 3. Comandas activas en cocina (estrictamente pendientes)
      const { count: comandasCount } = await supabase
        .from('comandas')
        .select('*', { count: 'exact', head: true })
        .eq('negocio_id', ownerId)
        .eq('estado', 'pendiente');

      // 4. Finanzas del día (ingresos con zona horaria local segura)
      const now = new Date();
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, '0');
      const localDay = String(now.getDate()).padStart(2, '0');
      const localTodayStr = `${localYear}-${localMonth}-${localDay}`;
      const startOfDay = new Date(localYear, now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const startOfDayIso = startOfDay.toISOString();

      const { data: transData } = await supabase
        .from('finanzas_registros')
        .select('monto, tipo, fecha, created_at')
        .eq('negocio_id', ownerId)
        .or(`fecha.eq.${localTodayStr},created_at.gte.${startOfDayIso}`);

      let ingresosDia = 0;
      if (transData) {
        ingresosDia = transData
          .filter(t => {
            if (t.tipo !== 'Ingreso') return false;
            const matchesFecha = t.fecha && t.fecha.startsWith(localTodayStr);
            const matchesCreated = t.created_at && new Date(t.created_at) >= startOfDay;
            return matchesFecha || matchesCreated;
          })
          .reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
      }

      setStats({
        totalEmpleados: empData?.length || 0,
        totalPlatillos: menuCount || 0,
        totalComandasActivas: comandasCount || 0,
        ingresosHoy: ingresosDia,
      });
    } catch (err) {
      console.error('Error cargando métricas de dueño:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ownerId]);

  useEffect(() => {
    loadMasterData();
    const interval = setInterval(() => {
      loadMasterData();
    }, 20000);
    return () => clearInterval(interval);
  }, [loadMasterData]);

  // Pantalla de Bloqueo Zero-Trust para el Portal del Dueño
  if (!isMasterAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-violet-800/40 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-violet-600 to-indigo-500 p-0.5 mx-auto mb-4 shadow-lg shadow-violet-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
              🛡️
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
            AISLAMIENTO ZERO-TRUST
          </span>
          <h2 className="text-xl font-black text-white mt-3 mb-1">
            Portal Central del Dueño
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Esta zona contiene métricas confidenciales y credenciales de personal. Ingrese el PIN Maestro de Propietario para desbloquear.
          </p>

          <form onSubmit={handleMasterUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN Maestro (ej. 0000)"
                autoFocus
                className="w-full text-center text-xl tracking-[0.3em] font-mono bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-white p-3 rounded-xl outline-none transition-all placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal"
              />
              {pinError && (
                <p className="text-xs text-rose-400 mt-2 font-semibold">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-600/20 active:scale-98 cursor-pointer"
            >
              Desbloquear Supervisión Central
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition-colors">
              ← Volver al Panel
            </Link>
            <span className="text-slate-600">Acceso restringido al Propietario</span>
          </div>
        </div>
      </div>
    );
  }

  const handleChangeMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinMsg(null);
    if (!/^\d{4,8}$/.test(changePinInput)) {
      setChangePinMsg('❌ El PIN debe tener entre 4 y 8 dígitos numéricos.');
      return;
    }
    setChangePinLoading(true);
    try {
      const { error } = await supabase
        .from('negocios')
        .update({ pin_maestro: changePinInput })
        .eq('id', ownerId!);
      if (error) throw error;
      setMasterPin(changePinInput);
      setChangePinInput('');
      setChangePinMsg('✅ PIN Maestro actualizado correctamente.');
    } catch (err: unknown) {
      setChangePinMsg(`❌ Error: ${String(err)}`);
    } finally {
      setChangePinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Banner Superior del Dueño */}
        <header className="bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 border border-violet-800/40 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-violet-600 to-indigo-500 p-0.5 shadow-lg shadow-violet-600/30">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-3xl">
                  👑
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    MASTER ACCESS / PROPIETARIO
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {ownerId?.slice(0, 8)}...</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">
                  Portal Central del Dueño
                </h1>
                <p className="text-slate-400 text-xs lg:text-sm">
                  Supervisión total y control de estaciones de trabajo aisladas de RTSEN ERP.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={loadMasterData}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                title="Actualizar métricas en vivo"
              >
                <span className={isRefreshing ? 'animate-spin' : ''}>↻</span>
                <span>{isRefreshing ? 'Actualizando...' : 'Recargar'}</span>
              </button>
              <Link
                href="/"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>📊</span>
                <span>Finanzas</span>
              </Link>
              <button
                onClick={handleMasterLock}
                className="px-3.5 py-2 bg-amber-950/60 hover:bg-amber-900 text-amber-200 text-xs font-bold rounded-xl border border-amber-700/50 transition-all cursor-pointer"
                title="Bloquear pantalla del dueño"
              >
                🔒 Bloquear
              </button>
              <button
                onClick={logout}
                className="px-3.5 py-2 bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-bold rounded-xl border border-rose-700/50 transition-all cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        <section className="bg-amber-950/30 border border-amber-700/40 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
            🔑 Cambiar PIN Maestro
            {masterPin === '0000' && (
              <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                ⚠️ PIN inicial — Cámbialo
              </span>
            )}
          </h3>
          <form onSubmit={handleChangeMasterPin} className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={changePinInput}
              onChange={e => setChangePinInput(e.target.value)}
              placeholder="Nuevo PIN (4-8 dígitos)"
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 text-white p-2.5 rounded-xl text-sm outline-none font-mono tracking-widest"
            />
            <button
              type="submit"
              disabled={changePinLoading}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {changePinLoading ? '...' : 'Guardar'}
            </button>
          </form>
          {changePinMsg && (
            <p className="text-xs mt-2 text-slate-300">{changePinMsg}</p>
          )}
        </section>

        {/* Métricas Globales del Negocio */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-md">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">💰 Ingresos Hoy</div>
            <div className="text-2xl font-black text-emerald-400">
              ₡{stats.ingresosHoy.toLocaleString('es-CR')}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Calculado de transacciones operativas del día</div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-md">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">👨‍🍳 Órdenes Cocina KDS</div>
            <div className="text-2xl font-black text-amber-400">
              {stats.totalComandasActivas} pendientes
            </div>
            <div className="text-[11px] text-slate-500 mt-2">En preparación activa en cocina</div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-md">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">🍽️ Catálogo de Menú</div>
            <div className="text-2xl font-black text-indigo-400">
              {stats.totalPlatillos} platillos
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Gestionables en modo Admin</div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-md">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">👥 Personal Registrado</div>
            <div className="text-2xl font-black text-sky-400">
              {stats.totalEmpleados} cajeros/staff
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Acceso por PIN verificado</div>
          </div>
        </section>

        {/* Estaciones de Trabajo Separadas (Zero Trust Operativo) */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>Estaciones de Trabajo Operativas (Acceso Aislado)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Cada terminal abre en modo exclusivo para impedir que los empleados accedan a módulos que no les corresponden.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Terminal Cajero POS */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/50 transition-all group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-4 border border-blue-500/30">
                  💳
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  Terminal de Caja (POS)
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Estación blindada para cajeros y meseros. Permite levantar comandas por mesa o exprés y realizar cobros. 
                  <strong className="text-slate-300 block mt-1">Bloqueo: No permite editar platillos, ni acceder a recetas ni cocina.</strong>
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-700/60">
                <Link
                  href="/restaurante"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20"
                >
                  <span>Abrir Estación Caja</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>

            {/* Terminal Cocina KDS */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500/50 transition-all group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mb-4 border border-amber-500/30">
                  🔥
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                  Cocina KDS (Pantalla Táctil)
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Estación de producción de comandas para cocineros y preparadores. Recibe notificaciones acústicas en vivo y permite despachar pedidos.
                  <strong className="text-slate-300 block mt-1">Bloqueo: Cero acceso a precios, cobros, finanzas o caja.</strong>
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-700/60">
                <Link
                  href="/cocina"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-600/20"
                >
                  <span>Abrir Pantalla KDS Cocina</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>

            {/* Administración y Recetas */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:border-rose-500/50 transition-all group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mb-4 border border-rose-500/30">
                  ⚙️
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors">
                  Administración & Recetas
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Gestión maestra de catálogo de menú, costeo de recetas multi-ingrediente e inventario de materias primas.
                  <strong className="text-slate-300 block mt-1">Exclusivo del dueño y gerencia operativa.</strong>
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-col gap-2">
                <Link
                  href="/admin"
                  className="w-full py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20"
                >
                  <span>Panel Administrador</span>
                  <span>↗</span>
                </Link>
                <div className="flex gap-2">
                  <Link
                    href="/admin/inventario"
                    className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-center font-medium text-[11px] rounded-lg transition-colors"
                  >
                    📦 Inventario
                  </Link>
                  <Link
                    href="/admin/recetas"
                    className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-center font-medium text-[11px] rounded-lg transition-colors"
                  >
                    🍲 Recetas
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Módulo de Suscripción y Facturación Stripe */}
        <BillingManager />

        {/* Control de Credenciales de Personal con Enmascaramiento de Seguridad */}
        <section className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-700/60">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔐</span>
                <span>PINs y Credenciales de Cajeros Autorizados</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Los cajeros únicamente ingresan con su PIN a la estación POS. Enmascarados por defecto para prevenir miradas indiscretas.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddEmployee(!showAddEmployee)}
                className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer shadow-md"
              >
                {showAddEmployee ? '✖ Cancelar' : '➕ Agregar Empleado'}
              </button>
              {empleados.length > 0 && (
                <button
                  onClick={toggleAllPins}
                  className="text-xs font-semibold px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  {showAllPins ? '🙈 Ocultar Todos' : '👁️ Revelar Todos'}
                </button>
              )}
              <span className="text-xs font-mono bg-slate-900 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                {empleados.length} Registrados
              </span>
            </div>
          </div>

          {showAddEmployee && (
            <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <h4 className="text-sm font-bold text-white mb-3">Registrar Nuevo Empleado</h4>
              <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-sm p-2 rounded-lg focus:border-amber-500 outline-none"
                    placeholder="Ej. Juan Pérez"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Rol</label>
                  <select
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-sm p-2 rounded-lg focus:border-amber-500 outline-none"
                  >
                    <option value="cajero">Cajero POS</option>
                    <option value="cocina">Cocina KDS</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">PIN (5 dígitos)</label>
                  <input
                    type="text"
                    value={newEmpPin}
                    onChange={(e) => setNewEmpPin(e.target.value)}
                    maxLength={5}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-sm p-2 rounded-lg focus:border-amber-500 outline-none"
                    placeholder="Auto-generado"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={addEmpLoading}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm py-2 px-3 rounded-lg transition-all shadow-md disabled:opacity-50"
                  >
                    {addEmpLoading ? 'Guardando...' : 'Guardar Empleado'}
                  </button>
                </div>
              </form>
              {addEmpError && <div className="mt-3 text-xs text-rose-400 font-semibold">{addEmpError}</div>}
              {addEmpSuccess && <div className="mt-3 text-xs text-emerald-400 font-semibold">{addEmpSuccess}</div>}
            </div>
          )}

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Cargando datos de empleados...</div>
          ) : empleados.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-dashed border-slate-700/60">
              No hay personal registrado. Usa el botón Agregar Empleado para registrar cajeros, cocineros y administradores.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {empleados.map(emp => {
                const isRevealed = revealedPins.has(emp.id);
                return (
                  <div key={emp.id} className="bg-slate-900/60 border border-slate-700/70 p-3.5 rounded-xl flex items-center justify-between group">
                    <div>
                      <div className="font-bold text-slate-200 text-xs">{emp.nombre}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {emp.rol === 'admin' ? '⚙️ Administrador' : emp.rol === 'cocina' ? '🍳 Cocina KDS' : '💵 Cajero POS'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="bg-violet-950 border border-violet-800/60 text-violet-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg tracking-widest shadow-sm">
                        {isRevealed ? emp.pin : '•••••'}
                      </div>
                      <button
                        onClick={() => togglePinVisibility(emp.id)}
                        className="p-1 text-slate-400 hover:text-white transition-colors text-xs cursor-pointer"
                        title={isRevealed ? 'Ocultar PIN' : 'Ver PIN'}
                      >
                        {isRevealed ? '🙈' : '👁️'}
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors text-xs cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Eliminar empleado"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

