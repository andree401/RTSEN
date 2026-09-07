'use client';

import React from 'react';
import CerrarCuentaBtn from '@/components/CerrarCuentaBtn';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function ConfiguracionPage() {
  const router = useRouter();
  const { logout } = useAppContext();

  const handleDeleteAccount = async () => {
    try {
      // Get the current user
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('No se pudo encontrar la sesión.');
        return;
      }

      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ access_token: session.access_token }),
      });
      
      if (res.ok) {
        alert('Cuenta y todos sus datos han sido eliminados de forma irreversible.');
        try {
          localStorage.removeItem('fw_last_activity_timestamp');
          localStorage.removeItem('gemini_api_key');
        } catch {}
        await logout();
        router.push('/');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error en el servidor' }));
        console.error('Error deleting account:', errorData);
        alert(`Hubo un error al intentar eliminar la cuenta: ${errorData.error || 'Intenta de nuevo'}`);
      }

    } catch (e) {
      console.error(e);
      alert('Error inesperado al intentar eliminar la cuenta.');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Configuración</h1>
      
      <div className="bg-white rounded shadow p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Ajustes de la cuenta</h2>
        <p className="text-gray-600 mb-6">
          Aquí puedes administrar las opciones avanzadas de tu cuenta, como darte de baja del sistema.
        </p>

        <CerrarCuentaBtn onDelete={handleDeleteAccount} />
      </div>
    </div>
  );
}
