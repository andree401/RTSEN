'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppContext, Dish } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { playCashRegisterSound } from '@/lib/soundEffects';

type OrderItem = Dish & {
  quantity: number;
};

type Cashier = {
  name: string;
  id: string;
};

const TABLES = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Barra'];
const CASHIER_STORAGE_KEY = 'pos_cashier_session';

export default function RestaurantePOS() {
  const { menu, refreshMenu, recordFinance, ownerId, currentEmployee, loginWithPin } = useAppContext();
  
  const [isCashierLoggedIn, setIsCashierLoggedIn] = useState(false);
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [inputId, setInputId] = useState('');
  const [inputName, setInputName] = useState('');
  const [customRegisterPin, setCustomRegisterPin] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de mesa y servicio exprés
  const [selectedLocation, setSelectedLocation] = useState<string>('Mesa 1');
  const [isExpress, setIsExpress] = useState(false);
  const [expressName, setExpressName] = useState('');
  
  // Órdenes aisladas por mesa para evitar contaminación de estado al cambiar de ubicación
  const [tableOrders, setTableOrders] = useState<Record<string, OrderItem[]>>({});
  const [dishSearch, setDishSearch] = useState('');

  // Ref para limpiar timeouts de notificación y evitar fugas de memoria
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuFetchedRef = useRef(false);

  // Restaurar sesión de cajero desde AppContext o sessionStorage
  useEffect(() => {
    if (currentEmployee) {
      setCurrentCashier({ name: currentEmployee.nombre, id: currentEmployee.pin });
      setIsCashierLoggedIn(true);
      return;
    }

    try {
      const saved = sessionStorage.getItem(CASHIER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.name) {
          setCurrentCashier(parsed);
          setIsCashierLoggedIn(true);
        }
      }
    } catch (err) {
      console.warn('Error recuperando sesión de cajero:', err);
    }
  }, [currentEmployee]);

  // Limpieza de timeouts al desmontar el componente para evitar fugas de memoria
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Carga inicial del menú garantizada sin bucles
  useEffect(() => {
    if (!menuFetchedRef.current && refreshMenu) {
      menuFetchedRef.current = true;
      refreshMenu();
    }
  }, [refreshMenu]);

  // Ubicación activa y pedido actual aislado
  const activeLocationKey = isExpress ? 'Exprés' : selectedLocation;
  const currentOrder = tableOrders[activeLocationKey] || [];

  const filteredMenu = menu.filter((dish) =>
    dish.name?.toLowerCase().includes(dishSearch.toLowerCase())
  );

  // Cálculo robusto del total defendido contra precios en string o valores NaN
  const total = currentOrder.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  // Manejo de autenticación / registro de cajeros con PIN estricto de 5 dígitos
  const handleLogin = async () => {
    if (isProcessing) return;

    if (!ownerId) {
      alert('⚠️ Error: No se ha detectado un negocio activo. Verifica tu sesión principal.');
      return;
    }

    if (isRegistering) {
      const cleanName = inputName.trim();
      if (!cleanName || cleanName.length < 2) {
        alert('⚠️ Error: Ingresa un nombre válido (al menos 2 caracteres).');
        return;
      }

      let chosenPin = customRegisterPin.trim();
      if (chosenPin) {
        if (!/^\d{5}$/.test(chosenPin)) {
          alert('⚠️ Error: El PIN elegido debe contener exactamente 5 dígitos numéricos.');
          return;
        }
      } else {
        // Generar PIN aleatorio de 5 dígitos asegurando que no empiece con 0 extraño
        chosenPin = Math.floor(10000 + Math.random() * 90000).toString();
      }

      setIsProcessing(true);
      try {
        // Verificar si ya existe ese PIN en este negocio
        const { data: existingEmp } = await supabase
          .from('empleados')
          .select('id')
          .eq('pin', chosenPin)
          .eq('negocio_id', ownerId)
          .maybeSingle();

        if (existingEmp) {
          alert(`⚠️ El PIN ${chosenPin} ya está registrado para otro empleado en este negocio. Por favor elige otro o deja el campo vacío para autogenerar.`);
          setIsProcessing(false);
          return;
        }

        const { error } = await supabase.from('empleados').insert({
          nombre: cleanName,
          pin: chosenPin,
          negocio_id: ownerId
        });
        
        if (error) throw error;
        
        const cashierData: Cashier = { name: cleanName, id: chosenPin };
        try {
          sessionStorage.setItem(CASHIER_STORAGE_KEY, JSON.stringify(cashierData));
        } catch (_) {}

        alert(`✅ Cajero registrado exitosamente.\n\n👤 Nombre: ${cleanName}\n🔑 TU PIN DE ACCESO ES: ${chosenPin}\n\n¡Guárdalo bien para iniciar turno!`);
        setCurrentCashier(cashierData);
        setIsCashierLoggedIn(true);
        setInputId('');
        setInputName('');
        setCustomRegisterPin('');
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error al registrar cajero:', error);
        alert(`❌ Error al registrar: ${error.message || 'Fallo desconocido'}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      const cleanPin = inputId.trim();
      if (!cleanPin) {
        alert('⚠️ Error: Ingresa el PIN de 5 dígitos del cajero.');
        return;
      }
      if (!/^\d{5}$/.test(cleanPin)) {
        alert('⚠️ Error: El PIN de cajero debe tener exactamente 5 dígitos numéricos.');
        return;
      }

      setIsProcessing(true);
      try {
        // Intentar autenticar con el servicio seguro multi-rol
        try {
          const emp = await loginWithPin(cleanPin, 'cajero');
          const cashierData: Cashier = { name: emp.nombre, id: emp.pin };
          sessionStorage.setItem(CASHIER_STORAGE_KEY, JSON.stringify(cashierData));
          setCurrentCashier(cashierData);
          setIsCashierLoggedIn(true);
          setInputId('');
          return;
        } catch {
          // Fallback a consulta directa si loginWithPin no encuentra rol cajero específico
        }

        const { data, error } = await supabase
          .from('empleados')
          .select('id, nombre, pin, negocio_id')
          .eq('pin', cleanPin)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          alert('❌ PIN no encontrado en este restaurante. Verifica los 5 dígitos o regístrate como nuevo cajero.');
        } else {
          const cashierData: Cashier = { name: data.nombre, id: data.pin };
          try {
            sessionStorage.setItem(CASHIER_STORAGE_KEY, JSON.stringify(cashierData));
          } catch (_) {}
          setCurrentCashier(cashierData);
          setIsCashierLoggedIn(true);
          setInputId('');
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error al iniciar sesión de cajero:', error);
        alert(`❌ Error al iniciar sesión: ${error.message || 'Error de conexión'}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleLogoutCashier = () => {
    setIsCashierLoggedIn(false);
    setCurrentCashier(null);
    setInputId('');
    setInputName('');
    setCustomRegisterPin('');
    try {
      sessionStorage.removeItem(CASHIER_STORAGE_KEY);
    } catch (_) {}
  };

  // Modificación reactiva del pedido exclusivo de la mesa activa
  const addToOrder = (dish: Dish) => {
    setTableOrders((prev) => {
      const activeList = prev[activeLocationKey] || [];
      const existing = activeList.find((item) => item.id === dish.id);
      let updated: OrderItem[];
      if (existing) {
        updated = activeList.map((item) =>
          item.id === dish.id ? { ...item, quantity: (Number(item.quantity) || 1) + 1 } : item
        );
      } else {
        updated = [...activeList, { ...dish, quantity: 1 }];
      }
      return { ...prev, [activeLocationKey]: updated };
    });
  };

  const removeFromOrder = (id: string) => {
    setTableOrders((prev) => {
      const activeList = prev[activeLocationKey] || [];
      const updated = activeList.filter((item) => item.id !== id);
      if (updated.length === 0) {
        const copy = { ...prev };
        delete copy[activeLocationKey];
        return copy;
      }
      return { ...prev, [activeLocationKey]: updated };
    });
  };

  const decrementFromOrder = (id: string) => {
    setTableOrders((prev) => {
      const activeList = prev[activeLocationKey] || [];
      const updated = activeList
        .map((item) =>
          item.id === id ? { ...item, quantity: (Number(item.quantity) || 1) - 1 } : item
        )
        .filter((item) => item.quantity > 0);
      
      if (updated.length === 0) {
        const copy = { ...prev };
        delete copy[activeLocationKey];
        return copy;
      }
      return { ...prev, [activeLocationKey]: updated };
    });
  };

  const clearCurrentOrder = () => {
    setTableOrders((prev) => {
      const copy = { ...prev };
      delete copy[activeLocationKey];
      return copy;
    });
    if (isExpress) {
      setExpressName('');
    }
  };

  // Cobro e inserción transaccional ordenada con rollback
  const handleCharge = async () => {
    // Desbloquear / preparar AudioContext en el gesto del usuario sincrónicamente
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const tempCtx = new AudioCtx();
        if (tempCtx.state === 'suspended') {
          tempCtx.resume().catch(() => {});
        }
      }
    } catch (_) {}

    // 1. Validaciones previas
    if (!ownerId) {
      alert('⚠️ Error: No se ha detectado el identificador del negocio. Inicia sesión de administrador.');
      return;
    }

    if (!currentCashier?.id) {
      alert('⚠️ Error: ID de cajero no válido o sesión expirada.');
      return;
    }

    if (currentOrder.length === 0 || total <= 0) {
      alert('⚠️ Error: No puedes cobrar una comanda vacía o con total ₡0. Agrega platillos al pedido.');
      return;
    }

    const cleanExpressName = expressName.trim();
    if (isExpress && !cleanExpressName) {
      alert('⚠️ Error: Debes ingresar el nombre o dirección del cliente para el servicio exprés.');
      return;
    }

    const targetDescription = isExpress ? `Exprés: ${cleanExpressName}` : selectedLocation;
    const finalFinanceDescription = `Cobro de ${targetDescription} (Cajero: ${currentCashier.name} - PIN: ${currentCashier.id})`;

    setIsProcessing(true);
    let createdComandaId: string | null = null;

    try {
      // 2. Transaccional Paso 1: Inserción en tabla 'comandas'
      const { data: comandaData, error: comandaError } = await supabase
        .from('comandas')
        .insert({
          negocio_id: ownerId,
          cajero_id: currentCashier.id,
          total: total,
          mesa: targetDescription,
          estado: 'pendiente'
        })
        .select('id')
        .single();
        
      if (comandaError || !comandaData) {
        throw new Error(`Error al crear comanda en cocina: ${comandaError?.message || 'No se recibió ID de comanda'}`);
      }

      createdComandaId = comandaData.id;

      // 3. Transaccional Paso 2: Inserción de ítems en 'comandas_items'
      const itemsToInsert = currentOrder.map(item => ({
        comanda_id: createdComandaId,
        menu_item_id: item.id,
        cantidad: Math.max(1, Number(item.quantity) || 1),
      }));
      
      const { error: itemsError } = await supabase
        .from('comandas_items')
        .insert(itemsToInsert);
        
      if (itemsError) {
        // ROLLBACK: Eliminar la comanda huérfana para evitar órdenes fantasma en cocina KDS
        await supabase.from('comandas').delete().eq('id', createdComandaId);
        throw new Error(`Error al insertar platillos de la comanda: ${itemsError.message}. Se realizó rollback seguro.`);
      }

      // 4. Transaccional Paso 3: Registrar en finanzas_registros vía recordFinance SOLO tras éxito en BD
      await recordFinance(total, finalFinanceDescription);

      // 5. Reproducir sonido sensorial metálico de caja registradora
      playCashRegisterSound();
      
      // 6. Notificación de éxito y reseteo ordenado
      const chargedAmount = total;
      setSuccessMessage(`Cobro de ₡${chargedAmount.toLocaleString('es-CR')} procesado para ${targetDescription}. Enviado a cocina y registrado en finanzas.`);
      
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

      // Limpiar únicamente la mesa cobrada
      clearCurrentOrder();

    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al procesar cobro:', error);
      alert(`❌ Error al procesar el cobro: ${error.message || 'Error desconocido. Inténtalo de nuevo.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isCashierLoggedIn) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 text-3xl mb-3 shadow-inner">
              {isRegistering ? '📝' : '🔐'}
            </div>
            <h2 className="text-2xl font-black text-slate-800">
              {isRegistering ? 'Nuevo Cajero' : 'Terminal Punto de Venta'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegistering 
                ? 'Registra tu nombre y obtén tu PIN de 5 dígitos' 
                : 'Ingresa tu PIN de 5 dígitos para comenzar el turno'}
            </p>
          </div>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="flex flex-col gap-4"
          >
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nombre del Cajero *
                  </label>
                  <input 
                    type="text" 
                    value={inputName} 
                    onChange={e => setInputName(e.target.value)}
                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-medium"
                    placeholder="Ej. Carlos Mora"
                    disabled={isProcessing}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    PIN Personal (Opcional - 5 dígitos)
                  </label>
                  <input 
                    type="password" 
                    inputMode="numeric"
                    maxLength={5}
                    value={customRegisterPin} 
                    onChange={e => setCustomRegisterPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 font-mono tracking-widest text-center text-lg"
                    placeholder="Dejar vacío para autogenerar"
                    disabled={isProcessing}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Si se deja en blanco, el sistema generará un PIN aleatorio único.
                  </span>
                </div>
              </>
            )}
            
            {!isRegistering && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  PIN de Cajero (5 dígitos) *
                </label>
                <input 
                  type="password"
                  inputMode="numeric"
                  maxLength={5}
                  value={inputId} 
                  onChange={e => setInputId(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-mono text-center text-2xl tracking-[0.35em] font-black"
                  placeholder="•••••"
                  disabled={isProcessing}
                  autoFocus
                />
                
                {/* Teclado numérico táctil rápido para POS */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        if (k === 'C') {
                          setInputId('');
                        } else if (k === '⌫') {
                          setInputId((prev) => prev.slice(0, -1));
                        } else {
                          setInputId((prev) => (prev.length < 5 ? prev + k : prev));
                        }
                      }}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer ${
                        k === 'C' 
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' 
                          : k === '⌫'
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-600 border border-slate-200 shadow-sm'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isProcessing || (!isRegistering && inputId.length !== 5)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin text-lg">⏳</span>
                  <span>Verificando...</span>
                </>
              ) : (
                <span>{isRegistering ? 'Crear Cajero y Entrar' : 'Abrir Turno de Caja'}</span>
              )}
            </button>

            <button 
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setIsRegistering(!isRegistering);
                setInputId('');
                setInputName('');
                setCustomRegisterPin('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline text-center font-medium cursor-pointer py-1"
            >
              {isRegistering ? '← Ya tengo mi PIN, ingresar' : '¿Nuevo cajero? Registrarse aquí'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 p-4 gap-4 relative">
      {/* Notificación flotante de cobro exitoso */}
      {successMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-600/40 flex items-center gap-3 border border-emerald-400 animate-bounce">
          <span className="text-2xl">💰</span>
          <div>
            <div className="font-black text-sm">¡Venta Cobrada con Éxito!</div>
            <div className="text-xs text-emerald-100">{successMessage}</div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-3 text-white/80 hover:text-white font-bold text-sm cursor-pointer"
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* Lado Izquierdo: Ubicación, Mesas y Menú */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Selección de Ubicación y Mesas */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Ubicación del Pedido</h2>
              <p className="text-xs text-slate-400">Cada mesa mantiene su propio pedido independiente sin mezclarse</p>
            </div>
            <label className="flex items-center gap-2 font-bold text-sm text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                checked={isExpress}
                onChange={(e) => setIsExpress(e.target.checked)}
              />
              <span>🛵 Servicio Exprés</span>
            </label>
          </div>
          
          {isExpress ? (
            <div className="flex flex-col gap-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <label className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                <span>Nombre del Cliente / Dirección Exprés</span>
                <span className="text-rose-500 text-xs">* (Requerido para cobrar)</span>
              </label>
              <input
                type="text"
                value={expressName}
                onChange={(e) => setExpressName(e.target.value)}
                placeholder="Ej. Ana Solís - 300m Norte de la Iglesia, Casa Blanca"
                className={`border p-2.5 rounded-xl text-sm outline-none transition-all ${
                  !expressName.trim()
                    ? 'border-amber-300 bg-amber-50/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {TABLES.map((table) => {
                const tableItems = tableOrders[table] || [];
                const itemCount = tableItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                const isSelected = selectedLocation === table && !isExpress;

                return (
                  <button
                    key={table}
                    onClick={() => {
                      setSelectedLocation(table);
                      if (isExpress) setIsExpress(false);
                    }}
                    className={`p-3 rounded-xl font-bold transition-all relative flex flex-col items-center justify-center min-h-[58px] cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400'
                        : itemCount > 0
                        ? 'bg-amber-50 text-amber-900 border-2 border-amber-300 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="text-sm">{table}</span>
                    {itemCount > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 font-extrabold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {itemCount} {itemCount === 1 ? 'platillo' : 'platillos'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Menú de Platillos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Menú de Platillos</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                {filteredMenu.length}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <input
                  type="text"
                  placeholder="Buscar platillo..."
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
              </div>
              <button
                onClick={() => refreshMenu && refreshMenu()}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Recargar Menú desde Base de Datos"
              >
                🔄
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {menu.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mb-3">
                  🍽️
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  No hay menú disponible
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Actualmente no hay platillos registrados en el sistema. Configura el catálogo en el panel de administración.
                </p>
                <button
                  onClick={() => refreshMenu && refreshMenu()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>Comprobar actualización</span>
                </button>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No se encontraron platillos coincidentes con &quot;{dishSearch}&quot;
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMenu.map((dish) => (
                  <button
                    key={dish.id}
                    onClick={() => addToOrder(dish)}
                    className="p-3.5 border border-slate-200/80 rounded-2xl hover:shadow-md hover:border-blue-400 hover:bg-blue-50/20 active:scale-98 transition-all text-left flex flex-col justify-between h-24 bg-white group cursor-pointer"
                  >
                    <span className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {dish.name}
                    </span>
                    <span className="text-emerald-600 font-extrabold text-sm">
                      ₡{dish.price.toLocaleString('es-CR')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lado Derecho: Comanda Digital de la Mesa Activa */}
      <div className="w-full lg:w-96 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col">
        <div className="text-center mb-4 pb-3 border-b border-dashed border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isExpress ? 'Pedido Exprés' : 'Comanda en Sala'}
            </span>
            {currentOrder.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('¿Deseas vaciar todos los platillos de esta comanda?')) {
                    clearCurrentOrder();
                  }
                }}
                className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Vaciar mesa
              </button>
            )}
          </div>
          
          <h2 className="text-xl font-black text-slate-800">
            {isExpress ? (expressName ? `Exprés: ${expressName}` : '🛵 Exprés (Sin nombre)') : selectedLocation}
          </h2>

          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <span className="text-slate-500 text-xs font-medium">
              Cajero: <strong className="text-slate-700">{currentCashier?.name}</strong> (PIN: {currentCashier?.id})
            </span>
            <button
              onClick={handleLogoutCashier}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer ml-1"
              title="Cerrar sesión de cajero"
            >
              (Cerrar Turno)
            </button>
          </div>
        </div>

        {/* Lista de Ítems de la Mesa */}
        <div className="flex-1 overflow-auto pr-1">
          {currentOrder.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="text-3xl mb-2">🧾</div>
              <p className="text-xs font-medium">Esta comanda está vacía</p>
              <p className="text-[11px] text-slate-400 mt-1">Haz clic en los platillos del menú para agregarlos</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {currentOrder.map((item) => (
                <li 
                  key={item.id} 
                  className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200/80 shadow-xs"
                >
                  <div className="flex-1 mr-2 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{item.name}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      ₡{item.price.toLocaleString('es-CR')} c/u = <span className="font-bold text-slate-700">₡{(item.quantity * item.price).toLocaleString('es-CR')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                      <button
                        onClick={() => decrementFromOrder(item.id)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                        title="Restar uno"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-xs font-black text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToOrder(item)}
                        className="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 font-bold transition-colors cursor-pointer"
                        title="Sumar uno más"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromOrder(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                      title="Eliminar producto"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resumen del Total y Botón de Cobro */}
        <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-sm font-bold text-slate-600">Total a Cobrar:</span>
            <span className="text-2xl font-black text-blue-600 tracking-tight">
              ₡{total.toLocaleString('es-CR')}
            </span>
          </div>

          {isExpress && !expressName.trim() && currentOrder.length > 0 && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium text-center">
              ⚠️ Ingresa el nombre o dirección del cliente para habilitar el cobro exprés.
            </div>
          )}

          <button
            onClick={handleCharge}
            disabled={
              currentOrder.length === 0 || 
              total <= 0 || 
              isProcessing || 
              (isExpress && !expressName.trim())
            }
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin text-lg">⏳</span>
                <span>Procesando venta...</span>
              </>
            ) : (
              <>
                <span>💳</span>
                <span>
                  {isExpress 
                    ? 'Cobrar Servicio Exprés' 
                    : `Cobrar ${selectedLocation}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

