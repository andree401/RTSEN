'use client';

import { useState, useEffect } from 'react';
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

export default function RestaurantePOS() {
  const { menu, refreshMenu, recordFinance, ownerId } = useAppContext();
  
  const [isCashierLoggedIn, setIsCashierLoggedIn] = useState(false);
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [inputId, setInputId] = useState('');
  const [inputName, setInputName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  // PARCHE: Añadido estado de carga para cobros y validaciones
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<string>('Mesa 1');
  const [isExpress, setIsExpress] = useState(false);
  const [expressName, setExpressName] = useState('');
  
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [dishSearch, setDishSearch] = useState('');

  useEffect(() => {
    if (refreshMenu) {
      refreshMenu();
    }
  }, []);

  const filteredMenu = menu.filter((dish) =>
    dish.name?.toLowerCase().includes(dishSearch.toLowerCase())
  );

  const handleLogin = async () => {
    if (isRegistering) {
      if (!inputName.trim()) {
        alert('⚠️ Error: Ingresa un nombre válido.');
        return;
      }
      setIsProcessing(true);
      try {
        const newId = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
        const { error } = await supabase.from('empleados').insert({
          nombre: inputName,
          pin: newId,
          negocio_id: ownerId
        });
        
        if (error) throw error;
        
        alert(`✅ Registrado exitosamente.\nTU ID DE CAJERO ES: ${newId}\n¡Guárdalo bien!`);
        setCurrentCashier({ name: inputName, id: newId });
        setIsCashierLoggedIn(true);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error al registrar:', error);
        alert(`❌ Error al registrar: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      if (!inputId.trim()) {
        alert('⚠️ Error: Ingresa un ID.');
        return;
      }
      // PARCHE: Validación de formato de ID numérico y de longitud
      if (!/^\d{5}$/.test(inputId.trim())) {
        alert('⚠️ Error: El ID de cajero debe tener exactamente 5 dígitos numéricos.');
        return;
      }
      setIsProcessing(true);
      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('*')
          .eq('pin', inputId.trim())
          .eq('negocio_id', ownerId)
          .single();

        if (error || !data) {
          alert('❌ ID no encontrado. Verifica o regístrate.');
        } else {
          setCurrentCashier({ name: data.nombre, id: data.pin });
          setIsCashierLoggedIn(true);
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error al iniciar sesión:', error);
        alert(`❌ Error al iniciar sesión: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const addToOrder = (dish: Dish) => {
    setOrder((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  };

  const removeFromOrder = (id: string) => {
    setOrder((prev) => prev.filter((item) => item.id !== id));
  };

  const decrementFromOrder = (id: string) => {
    setOrder((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const total = order.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCharge = async () => {
    // PARCHE: Validación de comanda vacía
    if (order.length === 0) {
      alert('⚠️ Error: No puedes cobrar una comanda vacía. Agrega productos al pedido.');
      return;
    }
    // PARCHE: Validación de cajero válido
    if (!currentCashier?.id) {
      alert('⚠️ Error: ID de cajero inválido o sesión expirada.');
      return;
    }

    const description = isExpress ? `Exprés: ${expressName}` : selectedLocation;
    if (isExpress && !expressName.trim()) {
      alert('⚠️ Error: Debes ingresar el nombre para el servicio exprés.');
      return;
    }

    setIsProcessing(true);
    try {
      const finalDescription = `Cobro de ${description} (Cajero: ${currentCashier?.name})`;
      await recordFinance(total, finalDescription);
      
      const { data: comandaData, error: comandaError } = await supabase
        .from('comandas')
        .insert({
          negocio_id: ownerId,
          cajero_id: currentCashier?.id,
          total: total,
          mesa: description,
          estado: 'pendiente'
        })
        .select('id')
        .single();
        
      if (comandaError) throw new Error(`Error al crear comanda: ${comandaError.message}`);
      
      if (comandaData) {
        const itemsToInsert = order.map(item => ({
          comanda_id: comandaData.id,
          menu_item_id: item.id,
          cantidad: item.quantity,
          // Si tuvieran notas se agregaría aquí. Agregamos las propiedades básicas.
        }));
        
        const { error: itemsError } = await supabase
          .from('comandas_items')
          .insert(itemsToInsert);
          
        if (itemsError) throw new Error(`Error al insertar items: ${itemsError.message}`);
      }

      playCashRegisterSound();
      alert(`✅ Cobro de ₡${total.toLocaleString('es-CR')} procesado.\nIngreso registrado en Finanzas y enviado a cocina.`);
      setOrder([]);
      setExpressName('');
    } catch (err: unknown) {
      const error = err as Error;
      // PARCHE: Manejo de errores detallado y notificado al usuario
      console.error('Error insertando la comanda:', error);
      alert(`❌ Error al procesar el cobro: ${error.message || 'Error desconocido. Inténtalo de nuevo.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isCashierLoggedIn) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            {isRegistering ? 'Registro de Cajero' : 'Acceso de Cajeros'}
          </h2>
          
          <div className="flex flex-col gap-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={inputName} 
                  onChange={e => setInputName(e.target.value)}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Tu nombre..."
                />
              </div>
            )}
            
            {!isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de Cajero</label>
                <input 
                  type="text" 
                  value={inputId} 
                  onChange={e => setInputId(e.target.value)}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. 48291"
                />
              </div>
            )}

            <button 
              onClick={handleLogin}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              {isRegistering ? 'Registrarse y Entrar' : 'Entrar al Punto de Venta'}
            </button>

            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setInputId('');
                setInputName('');
              }}
              className="text-sm text-blue-600 hover:underline text-center"
            >
              {isRegistering ? 'Ya tengo un ID, iniciar sesión' : 'Soy nuevo, quiero registrarme'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 p-4 gap-4">
      {/* Lado Izquierdo: Ubicación y Menú */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Selección de Ubicación */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Ubicación</h2>
            <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                checked={isExpress}
                onChange={(e) => setIsExpress(e.target.checked)}
              />
              Servicio Exprés
            </label>
          </div>
          
          {isExpress ? (
            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-600">Nombre / Dirección del Cliente</label>
              <input
                type="text"
                value={expressName}
                onChange={(e) => setExpressName(e.target.value)}
                placeholder="Ej. Juan Pérez - Para Llevar"
                className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {TABLES.map((table) => (
                <button
                  key={table}
                  onClick={() => setSelectedLocation(table)}
                  className={`p-3 rounded-lg font-bold transition-colors ${
                    selectedLocation === table && !isExpress
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {table}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menú */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Menú de Platillos</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                {filteredMenu.length}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
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
                title="Recargar Menú"
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
                  Actualmente no hay platillos registrados en el sistema. Contacta al administrador para que configure el menú.
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
                No se encontraron platillos con &quot;{dishSearch}&quot;
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

      {/* Lado Derecho: Comanda */}
      <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-sm flex flex-col">
        <div className="text-center mb-6 border-b pb-4 border-dashed border-gray-400">
          <h2 className="text-2xl font-bold text-gray-800">Comanda</h2>
          <p className="text-gray-600 font-medium text-lg mt-1">
            {isExpress ? `Exprés: ${expressName || 'Cliente'}` : selectedLocation}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-gray-500 text-xs font-medium">
              Cajero: <strong className="text-slate-700">{currentCashier?.name}</strong>
            </span>
            <button
              onClick={() => {
                setIsCashierLoggedIn(false);
                setCurrentCashier(null);
                setInputId('');
                setOrder([]);
              }}
              className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer ml-1"
              title="Cerrar turno de cajero"
            >
              (Cerrar Turno)
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {order.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">La comanda está vacía</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {order.map((item) => (
                <li key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex-1 mr-2">
                    <div className="font-semibold text-gray-800">{item.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      ₡{item.price.toLocaleString('es-CR')} c/u = <span className="font-bold text-gray-700">₡{(item.quantity * item.price).toLocaleString('es-CR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                      <button
                        onClick={() => decrementFromOrder(item.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-red-600 font-bold transition-colors"
                        title="Restar uno"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToOrder(item)}
                        className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                        title="Sumar uno más"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromOrder(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors text-sm font-bold"
                      title="Eliminar del pedido"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-dashed border-gray-400">
          <div className="flex justify-between text-xl font-bold text-gray-900 mb-6">
            <span>Total:</span>
            <span className="text-blue-600 font-extrabold">₡{total.toLocaleString('es-CR')}</span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleCharge}
              disabled={order.length === 0 || isProcessing}
              className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Procesando...' : `Cobrar ${isExpress ? 'Exprés' : 'Mesa'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

