'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SaaSMetricsSummary {
  totalNegocios: number;
  totalEmpleados: number;
  empleadosDesglose: {
    cajeros: number;
    admins: number;
    cocineros: number;
  };
  totalComandas: number;
  volumenComandas: number;
  totalFinanzas: number;
  ingresosGlobales: number;
  gastosGlobales: number;
}

interface RestauranteData {
  id: string;
  nombre: string;
  owner_email: string;
  created_at: string;
  comandas_count: string | number;
  empleados_count: string | number;
  menu_count: string | number;
}

export default function SysOpsSecretCenter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [summary, setSummary] = useState<SaaSMetricsSummary | null>(null);
  const [restaurantes, setRestaurantes] = useState<RestauranteData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMetrics = useCallback(async (keyToUse: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sys-ops/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-secret': keyToUse
        },
        body: JSON.stringify({ secretKey: keyToUse })
      });

      if (!res.ok) {
        throw new Error('Clave maestra inválida o acceso denegado.');
      }

      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setRestaurantes(data.restaurantes || []);
        setLastUpdated(new Date().toLocaleTimeString('es-CR'));
        setIsAuthenticated(true);
        sessionStorage.setItem('sys_ops_master_token', keyToUse);
      } else {
        throw new Error(data.error || 'Error al obtener métricas');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message);
      setIsAuthenticated(false);
      sessionStorage.removeItem('sys_ops_master_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recuperar llave de sesión si ya se autenticó previamente
  useEffect(() => {
    const savedKey = sessionStorage.getItem('sys_ops_master_token');
    if (savedKey) {
      setSecretKey(savedKey);
      fetchMetrics(savedKey);
    }
  }, [fetchMetrics]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      setErrorMsg('Ingresa la clave maestra del operador.');
      return;
    }
    fetchMetrics(secretKey.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sys_ops_master_token');
    setIsAuthenticated(false);
    setSecretKey('');
    setSummary(null);
    setRestaurantes([]);
  };

  const filteredRestaurantes = restaurantes.filter(r =>
    (r.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.owner_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pantalla de bloqueo si no está autenticado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-mono">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-950/50">
            👁️
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            SaaS OPERATOR • ZERO-DISCOVERY
          </span>
          <h2 className="text-xl font-black text-white mt-3 mb-1">
            Plataforma Central SuperAdmin
          </h2>
          <p className="text-xs text-slate-400 mb-6 font-sans">
            Observabilidad de infraestructura multi-inquilino. Introduce tu clave maestra de operador para acceder al panel secreto.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Clave Maestra de Operador..."
                autoFocus
                className="w-full text-center text-sm font-mono bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-emerald-400 p-3 rounded-xl outline-none transition-all placeholder:text-slate-600"
              />
              {errorMsg && (
                <p className="text-xs text-rose-400 mt-2 font-semibold">
                  {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Autenticando...' : 'Desbloquear Centro de Control'}
            </button>
          </form>

          <div className="mt-4">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 font-sans"
            >
              ← Volver a la aplicación
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-600 font-sans">
            RTSEN ERP SaaS Infrastructure • Acceso Restringido
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Banner Superior SuperAdmin */}
        <header className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-3xl shadow-lg shadow-emerald-950/50">
                🌐
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    SaaS INFRASTRUCTURE OVERVIEW
                  </span>
                  {lastUpdated && (
                    <span className="text-xs text-slate-500 font-mono">Actualizado: {lastUpdated}</span>
                  )}
                </div>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">
                  Centro de Observabilidad Global
                </h1>
                <p className="text-slate-400 text-xs lg:text-sm">
                  Supervisión multi-restaurante, usuarios activos y métricas de plataforma en tiempo real.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchMetrics(secretKey)}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>🔄</span>
                <span>{isLoading ? 'Actualizando...' : 'Refrescar'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Bloquear Acceso
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <span>🏠</span>
                <span>Ir a la App</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Métricas Maestras de la Plataforma */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Restaurantes */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Restaurantes Registrados
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {summary.totalNegocios}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Instancias de negocios activas en la base de datos
              </p>
            </div>

            {/* Total Empleados y Cajeros */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Personal / Empleados
              </span>
              <div className="text-3xl font-black text-cyan-400 font-mono">
                {summary.totalEmpleados}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {summary.empleadosDesglose.cajeros} cajeros • {summary.empleadosDesglose.admins} admins • {summary.empleadosDesglose.cocineros} cocina
              </p>
            </div>

            {/* Comandas Totales */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Comandas Procesadas
              </span>
              <div className="text-3xl font-black text-amber-400 font-mono">
                {summary.totalComandas}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Volumen: ₡{Number(summary.volumenComandas).toLocaleString('es-CR')}
              </p>
            </div>

            {/* Transaccionalidad Contable */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Ingresos Históricos Globales
              </span>
              <div className="text-2xl font-black text-violet-400 font-mono truncate">
                ₡{Number(summary.ingresosGlobales).toLocaleString('es-CR')}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Gastos globales: ₡{Number(summary.gastosGlobales).toLocaleString('es-CR')}
              </p>
            </div>

          </div>
        )}

        {/* Tabla de Restaurantes en la Plataforma */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏢</span>
                <span>Directorio Multi-Restaurante</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Listado en vivo de todas las cuentas de restaurantes desplegadas
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar restaurante o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 px-3.5 py-2 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Restaurante</th>
                  <th className="py-3 px-4">Propietario</th>
                  <th className="py-3 px-4 text-center">Platillos Menú</th>
                  <th className="py-3 px-4 text-center">Personal</th>
                  <th className="py-3 px-4 text-center">Comandas</th>
                  <th className="py-3 px-4">Fecha de Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredRestaurantes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No se encontraron restaurantes con ese criterio de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredRestaurantes.map((rest) => (
                    <tr key={rest.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{rest.nombre}</div>
                        <div className="text-[10px] font-mono text-slate-500">UUID: {rest.id}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {rest.owner_email || 'Sin correo asociado'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-slate-800 px-2.5 py-1 rounded-lg font-mono text-slate-200">
                          {rest.menu_count}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-slate-800 px-2.5 py-1 rounded-lg font-mono text-cyan-300">
                          {rest.empleados_count}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-slate-800 px-2.5 py-1 rounded-lg font-mono text-amber-300">
                          {rest.comandas_count}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(rest.created_at).toLocaleDateString('es-CR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}