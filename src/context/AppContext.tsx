'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import SessionWarningModal from '../components/SessionWarningModal';
import LoginPage from '../app/login/page';

export type Dish = {
  id: string;
  name: string;
  price: number;
};

export type UserRole = 'owner' | 'admin' | 'cajero' | 'cocina' | null;

export type EmployeeSession = {
  id: string;
  nombre: string;
  pin: string;
  negocio_id: string;
  rol: 'cajero' | 'admin' | 'cocina';
  restaurante?: string;
};

type AppContextType = {
  ownerId: string | null;
  activeRole: UserRole;
  currentEmployee: EmployeeSession | null;
  login: (email: string, password: string, isSignUp: boolean, restaurantName?: string) => Promise<void>;
  loginWithPin: (pin: string, expectedRole?: string) => Promise<EmployeeSession>;
  setStationSession: (employee: EmployeeSession) => void;
  logout: () => Promise<void>;
  
  menu: Dish[];
  refreshMenu: () => Promise<void>;
  addDish: (dish: Omit<Dish, 'id'>) => Promise<void>;
  updateDish: (id: string, updatedDish: Omit<Dish, 'id'>) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  recordFinance: (amount: number, description: string) => Promise<void>;
  linkDeviceToTenant: (tenantId: string) => void;
  getLinkedTenant: () => string | null;
  unlinkDevice: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(null);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeSession | null>(null);
  const [menu, setMenu] = useState<Dish[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Restaurar sesión de empleado de estación si existe
    try {
      const savedEmp = sessionStorage.getItem('fw_station_employee');
      if (savedEmp) {
        const parsed = JSON.parse(savedEmp);
        if (parsed?.negocio_id) {
          setCurrentEmployee(parsed);
          setActiveRole(parsed.rol || 'cajero');
          setOwnerId(prev => prev || parsed.negocio_id);
        }
      }
    } catch {}

    // Check initial session de Supabase (Dueño)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const hasStationEmployee = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('fw_station_employee'));
      if (session?.user && !hasStationEmployee) {
        setOwnerId(session.user.id);
        setActiveRole('owner');
      }
      setIsLoaded(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasStationEmployee = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('fw_station_employee'));
      if (session?.user?.id && !hasStationEmployee) {
        setOwnerId(session.user.id);
        setActiveRole('owner');
      } else if (!hasStationEmployee) {
        setOwnerId(null);
        setActiveRole(null);
      }
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

  const loginWithPin = async (pin: string, expectedRole?: string): Promise<EmployeeSession> => {
    let linkedTenantId: string | null = null;
    try {
      linkedTenantId = localStorage.getItem('fw_tenant_id');
    } catch {}

    if (!linkedTenantId) {
      throw new Error('Dispositivo no vinculado. Inicia sesión como Dueño y activa el Modo Estación en la configuración.');
    }

    const res = await fetch('/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, role: expectedRole, negocio_id: linkedTenantId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'PIN incorrecto o no autorizado');
    }

    const employee: EmployeeSession = data.employee;
    setStationSession(employee);
    return employee;
  };

  const linkDeviceToTenant = (tenantId: string) => {
    try {
      localStorage.setItem('fw_tenant_id', tenantId);
    } catch {}
  };

  const getLinkedTenant = (): string | null => {
    try {
      return localStorage.getItem('fw_tenant_id');
    } catch {
      return null;
    }
  };

  const unlinkDevice = () => {
    try {
      localStorage.removeItem('fw_tenant_id');
    } catch {}
  };

  const setStationSession = (employee: EmployeeSession) => {
    setCurrentEmployee(employee);
    setActiveRole(employee.rol || 'cajero');
    setOwnerId(employee.negocio_id);
    try {
      sessionStorage.setItem('fw_station_employee', JSON.stringify(employee));
    } catch {}
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fw_last_activity_timestamp');
        sessionStorage.removeItem('fw_owner_authenticated');
        sessionStorage.removeItem('fw_station_employee');
        sessionStorage.removeItem('pos_cashier_session');
      }
    } catch {}

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Supabase signOut error:', e);
    }
    
    setOwnerId(null);
    setActiveRole(null);
    setCurrentEmployee(null);
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

    // Actualización Optimista (§2 FASE 5.0): reflejar en UI inmediatamente
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticDish: Dish = { id: tempId, name: cleanName, price: cleanPrice };
    setMenu(prev => [...prev, optimisticDish].sort((a, b) => a.name.localeCompare(b.name)));

    const { data, error } = await supabase
      .from('menu_items')
      .insert({ nombre: cleanName, precio: cleanPrice, negocio_id: ownerId })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding dish:', error);
      // Rollback optimista: remover el elemento temporal que falló
      setMenu(prev => prev.filter(d => d.id !== tempId));
      alert('Error guardando platillo en BD: ' + error.message);
    } else if (data) {
      // Reemplazar el ID temporal por el ID persistido en BD
      setMenu(prev => prev.map(d => (d.id === tempId ? { id: data.id, name: data.nombre, price: data.precio } : d)).sort((a, b) => a.name.localeCompare(b.name)));
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

    // Actualización Optimista (§2 FASE 5.0): guardar snapshot para rollback y actualizar UI
    const previousMenu = [...menu];
    setMenu(prev => prev.map((d) => (d.id === id ? { ...d, name: cleanName, price: cleanPrice } : d)).sort((a, b) => a.name.localeCompare(b.name)));

    const { error } = await supabase
      .from('menu_items')
      .update({ nombre: cleanName, precio: cleanPrice })
      .eq('id', id)
      .eq('negocio_id', ownerId);

    if (error) {
      console.error('Error updating dish:', error);
      // Rollback optimista en caso de error
      setMenu(previousMenu);
      alert('Error actualizando platillo: ' + error.message);
    }
  };

  const deleteDish = async (id: string) => {
    if (!ownerId) return;
    // Actualización Optimista (§2 FASE 5.0): remover inmediatamente de UI con snapshot previo
    const previousMenu = [...menu];
    setMenu(prev => prev.filter((d) => d.id !== id));

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
      // Rollback optimista: restaurar el platillo en la lista
      setMenu(previousMenu);
      alert('Error eliminando platillo: ' + error.message);
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

  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const isSysOps = pathname.startsWith('/sys-ops');
  const isLoginPage = pathname.startsWith('/login');

  if (!isLoaded) return null;

  return (
    <AppContext.Provider
      value={{
        ownerId,
        activeRole,
        currentEmployee,
        login,
        loginWithPin,
        setStationSession,
        logout,
        menu,
        refreshMenu,
        addDish,
        updateDish,
        deleteDish,
        recordFinance,
        linkDeviceToTenant,
        getLinkedTenant,
        unlinkDevice,
      }}
    >
      {!ownerId && !isSysOps && !isLoginPage ? (
        <LoginPage />
      ) : (
        <>
          {children}
          {ownerId && (
            <SessionWarningModal
              isOpen={isWarningOpen}
              remainingSeconds={remainingSeconds}
              onStayLoggedIn={resetTimer}
              onLogout={logout}
            />
          )}
        </>
      )}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

