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
    <header className="bg-gray-900 text-white p-4 shadow-md print:hidden flex justify-between items-center">
      <nav className="container mx-auto flex gap-6 font-semibold items-center">
        <Link href="/" className="hover:text-blue-400 transition-colors">
          Finanzas
        </Link>
        <Link href="/restaurante" className="hover:text-blue-400 transition-colors">
          Restaurante
        </Link>
        <Link href="/cocina" className="hover:text-orange-400 text-orange-500 transition-colors font-bold tracking-widest drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
          COCINA
        </Link>
        <Link href="/admin" className="hover:text-red-400 text-red-500 transition-colors">
          Admin
        </Link>
        <Link href="/configuracion" className="hover:text-gray-400 text-gray-300 transition-colors">
          Configuración
        </Link>
      </nav>
      <button 
        onClick={handleLogout} 
        className="text-sm bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 transition-colors"
      >
        Salir
      </button>
    </header>
  );
}
