'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

export default function OwnerMasterPortal() {
  const { ownerId, logout } = useAppContext();
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    totalPlatillos: 0,
    totalComandasActivas: 0,
    ingresosHoy: 0,
  });
  const [empleados, setEmpleados] = useState<Array<{ id: string; nombre: string; pin: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMasterData() {
      if (!ownerId) return;
      try {
        setIsLoading(true);

        // 1. Empleados registrados
        const { data: empData } = await supabase
          .from('empleados')
          .select('id, nombre, pin')
          .eq('negocio_id', ownerId);

        if (empData) {
          setEmpleados(empData);
        }

        // 2. Platillos del menú
        const { count: menuCount } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('negocio_id', ownerId);

        // 3. Comandas activas en cocina
        const { count: comandasCount } = await supabase
          .from('comandas')
          .select('*', { count: 'exact', head: true })
          .eq('negocio_id', ownerId);

        // 4. Finanzas del día (ingresos)
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: transData } = await supabase
          .from('finanzas_registros')
          .select('monto, tipo, fecha, created_at')
          .eq('negocio_id', ownerId)
          .or(`fecha.gte.${todayStr},created_at.gte.${todayStr}`);

        let ingresosDia = 0;
        if (transData) {
          ingresosDia = transData
            .filter(t => t.tipo === 'Ingreso')
            .reduce((acc, curr) => acc + Number(curr.monto), 0);
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
      }
    }

    loadMasterData();
  }, [ownerId]);

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

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>📊</span>
                <span>Panel Financiero</span>
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-bold rounded-xl border border-rose-700/50 transition-all cursor-pointer"
              >
                Cerrar Sesión Dueño
              </button>
            </div>
          </div>
        </header>

        {/* Métricas Globales del Negocio */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-md">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">💰 Ingresos Hoy</div>
            <div className="text-2xl font-black text-emerald-400">
              ₡{stats.ingresosHoy.toLocaleString('es-CR')}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Calculado de transacciones operativas</div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-md">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">👨‍🍳 Órdenes Cocina KDS</div>
            <div className="text-2xl font-black text-amber-400">
              {stats.totalComandasActivas} en preparación
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Monitoreo en tiempo real</div>
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

        {/* Control de Credenciales de Personal */}
        <section className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-700/60">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🔐</span>
                <span>PINs y Credenciales de Cajeros Autorizados</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Los cajeros únicamente ingresan con su PIN a la estación POS sin poder acceder a otros módulos.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-900 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              {empleados.length} Registrados
            </span>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Cargando datos de empleados...</div>
          ) : empleados.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-dashed border-slate-700/60">
              No hay cajeros registrados aún. Cuando un empleado se registre en la pantalla de caja, su PIN de 5 dígitos aparecerá aquí.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {empleados.map(emp => (
                <div key={emp.id} className="bg-slate-900/60 border border-slate-700/70 p-3.5 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-200 text-xs">{emp.nombre}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Cajero POS</div>
                  </div>
                  <div className="bg-violet-950 border border-violet-800/60 text-violet-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg tracking-widest shadow-sm">
                    {emp.pin}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
