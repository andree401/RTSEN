'use client';

import React from 'react';
import CerrarCuentaBtn from '@/components/CerrarCuentaBtn';
import BillingManager from '@/components/BillingManager';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function ConfiguracionPage() {
  const router = useRouter();
  const { logout, linkDeviceToTenant, unlinkDevice } = useAppContext();

  const handleLinkDevice = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id) {
      linkDeviceToTenant(data.session.user.id);
      alert('✅ Dispositivo vinculado exitosamente. Tus empleados ya pueden iniciar sesión con su PIN en este dispositivo.');
      window.location.reload();
    }
  };

  const handleUnlinkDevice = () => {
    unlinkDevice();
    alert('🔌 Dispositivo desvinculado.');
    window.location.reload();
  };

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
    <div className="container mx-auto p-8 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Configuración del Sistema</h1>
      
      {/* Módulo de Suscripción y Facturación */}
      <BillingManager />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-2 text-slate-800">Modo Estación (Punto de Venta)</h2>
        <p className="text-slate-600 mb-6 text-sm">
          Si este dispositivo va a ser usado por tus empleados (cajeros, cocineros, etc.), debes vincularlo a tu restaurante. Así el sistema sabrá a qué negocio pertenecen los PINs ingresados en esta pantalla.
        </p>

        <div className="flex gap-4 items-center">
          <button
            onClick={handleLinkDevice}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Vincular este dispositivo
          </button>

          <button
            onClick={handleUnlinkDevice}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition"
          >
            Desvincular
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-2 text-slate-800">Ajustes de la cuenta</h2>
        <p className="text-slate-600 mb-6 text-sm">
          Aquí puedes administrar las opciones avanzadas de tu cuenta, como darte de baja del sistema.
        </p>

        <CerrarCuentaBtn onDelete={handleDeleteAccount} />
      </div>
    </div>
  );
}
