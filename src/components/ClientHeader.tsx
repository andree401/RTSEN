'use client';

import { useAppContext } from '../context/AppContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ClientHeader() {
  const { logout, ownerId, activeRole, currentEmployee } = useAppContext();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  const currentPath = pathname || '';
  const isLoginPage = currentPath.startsWith('/login');
  const isSysOpsPage = currentPath.startsWith('/sys-ops');
  const isTerminalMode = currentPath.startsWith('/cocina') || currentPath.startsWith('/restaurante') || activeRole === 'cajero' || activeRole === 'cocina';
  const isOwnerMode = currentPath.startsWith('/owner');
  const isAdminRole = activeRole === 'admin';

  // Si estamos en la página de login o en el portal secreto, no mostrar cabecera regular
  if (isLoginPage || isSysOpsPage) return null;

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-6 py-3.5 shadow-sm print:hidden">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span 
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white text-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform cursor-pointer"
              title="RTSEN ERP"
            >
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
                <span>
                  {currentEmployee ? `Turno: ${currentEmployee.nombre} (${currentEmployee.rol})` : 'Modo Estación Operativa'}
                </span>
              </span>
            </div>
          ) : isAdminRole ? (
            <nav className="flex gap-2 font-medium items-center text-sm">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                ⚙️ Perfil Administrador
              </span>
              <Link 
                href="/admin" 
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50/80 transition-all font-semibold"
              >
                Menú & Precios
              </Link>
              <Link 
                href="/admin/inventario" 
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50/80 transition-all"
              >
                Inventario
              </Link>
              <Link 
                href="/admin/recetas" 
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50/80 transition-all"
              >
                Recetas
              </Link>
            </nav>
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
          {!isTerminalMode && !isAdminRole && (
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

          {ownerId ? (
            <button 
              onClick={handleLogout} 
              className="text-xs font-semibold bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 px-3.5 py-1.5 rounded-xl border border-slate-200 transition-all shadow-sm cursor-pointer"
            >
              {isTerminalMode ? 'Cerrar Turno' : 'Salir'}
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
