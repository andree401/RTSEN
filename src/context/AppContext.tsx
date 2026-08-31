'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

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
  addDish: (dish: Omit<Dish, 'id'>) => Promise<void>;
  updateDish: (id: string, updatedDish: Omit<Dish, 'id'>) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  recordFinance: (amount: number, description: string) => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [menu, setMenu] = useState<Dish[]>([]);
  const [isLoaded, setIsLoaded] = useState(true);

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

  useEffect(() => {
    if (ownerId) {
      fetchMenu(ownerId);
    }
  }, [ownerId]);

  const fetchMenu = async (negocioId: string) => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, nombre, precio')
      .eq('negocio_id', negocioId);
    
    if (error) {
      console.error('Error fetching menu:', error);
    } else if (data) {
      setMenu(data.map(d => ({ id: d.id, name: d.nombre, price: d.precio })));
    }
  };

  const login = async (email: string, password: string, isSignUp: boolean, restaurantName?: string) => {
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert('Error en registro: ' + error.message);
        return;
      }
      if (data.user) {
        const { error: insertError } = await supabase
          .from('negocios')
          .insert({ id: data.user.id, nombre: restaurantName });
        if (insertError) {
          console.error("Error creando negocio", insertError);
          alert('Error creando negocio: ' + insertError.message);
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert('Error en inicio de sesión: ' + error.message);
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setOwnerId(null);
    setMenu([]);
  };

  const addDish = async (dish: Omit<Dish, 'id'>) => {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from('menu_items')
      .insert({ nombre: dish.name, precio: dish.price, negocio_id: ownerId })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding dish:', error);
      alert('Error guardando platillo en BD: ' + error.message);
    } else if (data) {
      setMenu([...menu, { id: data.id, name: data.nombre, price: data.precio }]);
    }
  };

  const updateDish = async (id: string, updatedDish: Omit<Dish, 'id'>) => {
    if (!ownerId) return;
    const { error } = await supabase
      .from('menu_items')
      .update({ nombre: updatedDish.name, precio: updatedDish.price })
      .eq('id', id)
      .eq('negocio_id', ownerId);

    if (error) {
      console.error('Error updating dish:', error);
      alert('Error actualizando platillo: ' + error.message);
    } else {
      setMenu(menu.map((d) => (d.id === id ? { ...d, ...updatedDish } : d)));
    }
  };

  const deleteDish = async (id: string) => {
    if (!ownerId) return;
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('negocio_id', ownerId);

    if (error) {
      console.error('Error deleting dish:', error);
      alert('Error eliminando platillo: ' + error.message);
    } else {
      setMenu(menu.filter((d) => d.id !== id));
    }
  };

  const recordFinance = async (amount: number, description: string) => {
    if (!ownerId) return;
    const tipo = amount >= 0 ? 'Ingreso' : 'Gasto';
    const categoria = 'Restaurante'; 
    const { error } = await supabase
      .from('finanzas_registros')
      .insert({ 
         negocio_id: ownerId, 
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

  if (!isLoaded) return null;

  if (!ownerId) {
    return <AuthScreen onLogin={login} />;
  }

  return (
    <AppContext.Provider value={{ ownerId, login, logout, menu, addDish, updateDish, deleteDish, recordFinance }}>
      {children}
    </AppContext.Provider>
  );
}

function AuthScreen({ onLogin }: { onLogin: (email: string, pass: string, isSignUp: boolean, name?: string) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isSignUp ? 'Crear Cuenta' : 'SaaS Multi-Tenant'}
        </h1>
        <div className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Correo Electrónico" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {isSignUp && (
            <input 
              type="text" 
              placeholder="Nombre del Restaurante" 
              value={restaurantName} 
              onChange={e => setRestaurantName(e.target.value)} 
              className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          )}
          <button 
            onClick={() => onLogin(email, password, isSignUp, isSignUp ? restaurantName : undefined)} 
            className="bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition-colors"
          >
            {isSignUp ? 'Registrarse' : 'Ingresar'}
          </button>
          
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            {isSignUp ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Regístrate'}
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

