'use client';

import { useAppContext } from '../context/AppContext';
import Link from 'next/link';

export default function ClientHeader() {
  const { logout } = useAppContext();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

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
                Finanzas Pro
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                SaaS Restaurant
              </span>
            </div>
          </Link>

          <nav className="flex gap-2 font-medium items-center text-sm">
            <Link 
              href="/" 
              className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 transition-all"
            >
              Finanzas
            </Link>
            <Link 
              href="/restaurante" 
              className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 transition-all"
            >
              Restaurante
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
        </div>

        <button 
          onClick={handleLogout} 
          className="text-xs font-semibold bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 px-3.5 py-1.5 rounded-lg border border-slate-200 transition-all shadow-sm"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
