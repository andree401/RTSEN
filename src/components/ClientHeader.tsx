'use client';

export default function ClientHeader() {
  const handleLogout = () => {
    localStorage.removeItem('saas_current_owner');
    window.location.href = '/';
  };

  return (
    <header className="bg-gray-900 text-white p-4 shadow-md print:hidden flex justify-between items-center">
      <nav className="container mx-auto flex gap-6 font-semibold items-center">
        <a href="/" className="hover:text-blue-400 transition-colors">
          Finanzas
        </a>
        <a href="/restaurante" className="hover:text-blue-400 transition-colors">
          Restaurante
        </a>
        <a href="/cocina" className="hover:text-orange-400 text-orange-500 transition-colors font-bold tracking-widest drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
          COCINA
        </a>
        <a href="/admin" className="hover:text-red-400 text-red-500 transition-colors">
          Admin
        </a>
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
