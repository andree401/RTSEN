'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import SessionWarningModal from '../components/SessionWarningModal';

export type Dish = {
  id: string;
  name: string;
  price: number;
};

type AppContextType = {
  ownerId: string | null;
  login: (email: string, password: string, isSignUp: boolean, restaurantName?: string) => Promise<void>;
  logout: () => Promise<void>;
  
  menu: Dish[];
  refreshMenu: () => Promise<void>;
  addDish: (dish: Omit<Dish, 'id'>) => Promise<void>;
  updateDish: (id: string, updatedDish: Omit<Dish, 'id'>) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  recordFinance: (amount: number, description: string) => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [menu, setMenu] = useState<Dish[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setOwnerId(session.user.id);
      }
      setIsLoaded(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setOwnerId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMenu = async (negocioId: string) => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, nombre, precio')
      .eq('negocio_id', negocioId)
      .order('nombre');
    
    if (error) {
      console.error('Error fetching menu:', error);
    } else if (data) {
      setMenu(data.map(d => ({ id: d.id, name: d.nombre, price: d.precio })));
    }
  };

  const refreshMenu = async () => {
    if (ownerId) {
      await fetchMenu(ownerId);
    }
  };

  useEffect(() => {
    if (!ownerId) {
      setMenu([]);
      return;
    }

    fetchMenu(ownerId);

    // Sincronización en tiempo real con Supabase Realtime para POS y Administrador
    const menuChannel = supabase
      .channel(`menu_items_realtime_${ownerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `negocio_id=eq.${ownerId}`,
        },
        () => {
          fetchMenu(ownerId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(menuChannel);
    };
  }, [ownerId]);

  const login = async (email: string, password: string, isSignUp: boolean, restaurantName?: string) => {
    if (!email.trim() || !password.trim()) {
      alert("El correo y la contraseña son obligatorios.");
      return;
    }
    if (isSignUp && (!restaurantName || !restaurantName.trim())) {
      alert("El nombre del restaurante es obligatorio.");
      return;
    }
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { restaurant_name: restaurantName } } });
      if (error) {
        alert('Error en registro: ' + error.message);
        return;
      }
      if (data.user) {
        // Asegurar que el negocio exista en la tabla para que no falle la llave foránea en otras tablas
        await supabase.from('negocios').insert({
          id: data.user.id,
          nombre: restaurantName,
          owner_email: email
        }).select().single();
      }

      if (data.session === null) {
        alert("Registro exitoso. Revisa tu correo o desactiva la confirmación de email en Supabase para poder entrar.");
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert('Error en inicio de sesión: ' + error.message);
      } else if (data.user) {
        // Fallback: Si no existía el registro por algún bug previo, crearlo
        await supabase.from('negocios').upsert({
          id: data.user.id,
          nombre: data.user.user_metadata?.restaurant_name || 'Mi Restaurante',
          owner_email: email
        });
      }
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fw_last_activity_timestamp');
        sessionStorage.removeItem('fw_owner_authenticated');
      }
    } catch {}
    await supabase.auth.signOut();
    setOwnerId(null);
    setMenu([]);
  };

  const addDish = async (dish: Omit<Dish, 'id'>) => {
    if (!ownerId) return;
    const cleanName = dish.name?.trim();
    if (!cleanName) {
      alert('El nombre del platillo no puede estar vacío.');
      return;
    }
    const cleanPrice = Number(dish.price);
    if (isNaN(cleanPrice) || cleanPrice < 0) {
      alert('El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert({ nombre: cleanName, precio: cleanPrice, negocio_id: ownerId })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding dish:', error);
      alert('Error guardando platillo en BD: ' + error.message);
    } else if (data) {
      setMenu(prev => [...prev, { id: data.id, name: data.nombre, price: data.precio }].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const updateDish = async (id: string, updatedDish: Omit<Dish, 'id'>) => {
    if (!ownerId) return;
    const cleanName = updatedDish.name?.trim();
    if (!cleanName) {
      alert('El nombre del platillo no puede estar vacío.');
      return;
    }
    const cleanPrice = Number(updatedDish.price);
    if (isNaN(cleanPrice) || cleanPrice < 0) {
      alert('El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    const { error } = await supabase
      .from('menu_items')
      .update({ nombre: cleanName, precio: cleanPrice })
      .eq('id', id)
      .eq('negocio_id', ownerId);

    if (error) {
      console.error('Error updating dish:', error);
      alert('Error actualizando platillo: ' + error.message);
    } else {
      setMenu(prev => prev.map((d) => (d.id === id ? { ...d, name: cleanName, price: cleanPrice } : d)).sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const deleteDish = async (id: string) => {
    if (!ownerId) return;
    // Eliminación segura: eliminar recetas asociadas primero para no romper restricciones de llave foránea
    try {
      await supabase.from('recetas').delete().eq('menu_item_id', id);
    } catch (recipeErr) {
      console.warn('Advertencia al limpiar recetas asociadas:', recipeErr);
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('negocio_id', ownerId);

    if (error) {
      console.error('Error deleting dish:', error);
      alert('Error eliminando platillo: ' + error.message);
    } else {
      setMenu(prev => prev.filter((d) => d.id !== id));
    }
  };

  const recordFinance = async (amount: number, description: string) => {
    if (!ownerId) return;
    const tipo = amount >= 0 ? 'Ingreso' : 'Gasto';
    const categoria = 'Restaurante'; 
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayLocalStr = `${year}-${month}-${day}`;

    const { error } = await supabase
      .from('finanzas_registros')
      .insert({ 
         negocio_id: ownerId, 
         fecha: todayLocalStr,
         monto: Math.abs(amount), 
         descripcion: description,
         tipo: tipo,
         categoria: categoria
      });

    if (error) {
      console.error('Error recording finance:', error);
      alert('Error guardando finanzas: ' + error.message);
    }
  };

  const { isWarningOpen, remainingSeconds, resetTimer } = useInactivityTimeout({
    enabled: !!ownerId,
    timeoutMs: 15 * 60 * 1000, // 15 minutos de inactividad
    warningMs: 2 * 60 * 1000,  // 2 minutos de advertencia visual previa
    onTimeout: logout,
  });

  if (!isLoaded) return null;

  if (!ownerId) {
    return <AuthScreen onLogin={login} />;
  }

  return (
    <AppContext.Provider value={{ ownerId, login, logout, menu, refreshMenu, addDish, updateDish, deleteDish, recordFinance }}>
      {children}
      <SessionWarningModal
        isOpen={isWarningOpen}
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={resetTimer}
        onLogout={logout}
      />
    </AppContext.Provider>
  );
}

function AuthScreen({ onLogin }: { onLogin: (email: string, pass: string, isSignUp: boolean, name?: string) => Promise<void> }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onLogin(email, password, isSignUp, isSignUp ? restaurantName : undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-sky-50/40 p-4">
      <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-200/80 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-2xl shadow-md shadow-indigo-500/25 mb-3">
            ⚡
          </div>
          <h1 className="text-2xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 tracking-tight">
            RTSEN ERP
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium text-center">
            {isSignUp ? 'Crea la cuenta de tu restaurante' : 'Iniciar Sesión en el Sistema'}
          </p>
        </div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="tu@restaurante.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:opacity-50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:opacity-50 transition-all"
            />
          </div>
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre del Restaurante</label>
              <input 
                type="text" 
                placeholder="Ej. Taquería El Sol" 
                value={restaurantName} 
                onChange={e => setRestaurantName(e.target.value)} 
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:opacity-50 transition-all"
              />
            </div>
          )}
          <button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-bold py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-75 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? 'Cargando...' : (isSignUp ? 'Crear Restaurante' : 'Ingresar al Sistema')}
          </button>
          
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline text-center font-medium mt-1 disabled:opacity-50"
          >
            {isSignUp ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

