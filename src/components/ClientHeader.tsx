'use client';

import { useAppContext } from '../context/AppContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ClientHeader() {
  const { logout } = useAppContext();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  // En la estación de Cocina KDS y en el POS de Restaurante, aislamos la barra para que
  // ni los cajeros ni los cocineros tengan acceso directo a Admin o Finanzas.
  const currentPath = pathname || '';
  const isTerminalMode = currentPath.startsWith('/cocina') || currentPath.startsWith('/restaurante');
  const isOwnerMode = currentPath.startsWith('/owner');

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-6 py-3.5 shadow-sm print:hidden">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white text-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              ⚡
            </span>
            <div className="flex flex-col">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-lg leading-tight tracking-tight">
                RTSEN
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                ERP Restaurante
              </span>
            </div>
          </Link>

          {isTerminalMode ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span>🔒</span>
                <span>Modo Estación Operativa Aislada</span>
              </span>
            </div>
          ) : (
            <nav className="flex gap-2 font-medium items-center text-sm">
              <Link 
                href="/" 
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 transition-all"
              >
                Finanzas
              </Link>
              <Link 
                href="/restaurante" 
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 transition-all font-semibold"
              >
                🍽️ Cajero / POS
              </Link>
              <Link 
                href="/cocina" 
                className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold tracking-wider text-xs shadow-sm shadow-orange-500/30 hover:shadow-md hover:scale-105 transition-all"
              >
                COCINA
              </Link>
              <Link 
                href="/admin" 
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50/80 transition-all"
              >
                Admin
              </Link>
              <Link 
                href="/configuracion" 
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
              >
                Configuración
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Botón de acceso exclusivo al Portal del Dueño: NUNCA visible en estaciones operativas aisladas */}
          {!isTerminalMode && (
            <Link
              href="/owner"
              className={`text-xs font-black px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${
                isOwnerMode
                  ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                  : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300'
              }`}
              title="Portal Maestro del Propietario"
            >
              <span>👑</span>
              <span className="hidden sm:inline">Portal Dueño</span>
            </Link>
          )}

          <button 
            onClick={handleLogout} 
            className="text-xs font-semibold bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 px-3.5 py-1.5 rounded-xl border border-slate-200 transition-all shadow-sm cursor-pointer"
          >
            {isTerminalMode ? 'Cerrar Estación' : 'Salir'}
          </button>
        </div>
      </div>
    </header>
  );
}
