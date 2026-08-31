'use client';

import { useState, useEffect } from 'react';
import { useAppContext, Dish } from '@/context/AppContext';

type OrderItem = Dish & {
  quantity: number;
};

type Cashier = {
  name: string;
  id: string;
};

const TABLES = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Barra'];

export default function RestaurantePOS() {
  const { menu, recordFinance } = useAppContext();
  
  const [isCashierLoggedIn, setIsCashierLoggedIn] = useState(false);
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [inputId, setInputId] = useState('');
  const [inputName, setInputName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<string>('Mesa 1');
  const [isExpress, setIsExpress] = useState(false);
  const [expressName, setExpressName] = useState('');
  
  const [order, setOrder] = useState<OrderItem[]>([]);

  const handleLogin = () => {
    const stored = localStorage.getItem('cajeros_registrados');
    const cashiers: Cashier[] = stored ? JSON.parse(stored) : [];
    
    if (isRegistering) {
      if (!inputName.trim()) return alert('Ingresa un nombre');
      const newId = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
      const newCashier = { name: inputName, id: newId };
      cashiers.push(newCashier);
      localStorage.setItem('cajeros_registrados', JSON.stringify(cashiers));
      alert(`Registrado exitosamente.\nTU ID DE CAJERO ES: ${newId}\n¡Guárdalo bien!`);
      setCurrentCashier(newCashier);
      setIsCashierLoggedIn(true);
    } else {
      if (!inputId.trim()) return alert('Ingresa un ID');
      const found = cashiers.find(c => c.id === inputId);
      if (found) {
        setCurrentCashier(found);
        setIsCashierLoggedIn(true);
      } else {
        alert('ID no encontrado. Verifica o regístrate.');
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

  const total = order.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCharge = async () => {
    if (order.length === 0) return;
    const description = isExpress ? `Exprés: ${expressName}` : selectedLocation;
    const finalDescription = `Cobro de ${description} (Cajero: ${currentCashier?.name})`;
    await recordFinance(total, finalDescription);
    alert(`Cobro de $${total} procesado.\nIngreso registrado en Finanzas.`);
    setOrder([]);
    setExpressName('');
  };

  const handlePrint = () => {
    window.print();
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
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 p-4 gap-4 print:p-0 print:h-auto print:bg-white">
      {/* Lado Izquierdo: Ubicación y Menú (Oculto al imprimir) */}
      <div className="flex-1 flex flex-col gap-4 print:hidden">
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
        <div className="bg-white p-4 rounded-xl shadow-sm flex-1 overflow-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Menú</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {menu.map((dish) => (
              <button
                key={dish.id}
                onClick={() => addToOrder(dish)}
                className="p-4 border rounded-xl hover:shadow-md hover:border-blue-500 transition-all text-left flex flex-col justify-between h-24"
              >
                <span className="font-semibold text-gray-800">{dish.name}</span>
                <span className="text-blue-600 font-bold">${dish.price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lado Derecho: Comanda (Visible en pantalla y al imprimir) */}
      <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-sm flex flex-col print:w-full print:shadow-none print:p-0">
        <div className="text-center mb-6 border-b pb-4 border-dashed border-gray-400">
          <h2 className="text-2xl font-bold text-gray-800">Comanda</h2>
          <p className="text-gray-600 font-medium text-lg mt-1">
            {isExpress ? `Exprés: ${expressName || 'Cliente'}` : selectedLocation}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Cajero: {currentCashier?.name}
          </p>
        </div>

        <div className="flex-1 overflow-auto print:overflow-visible">
          {order.length === 0 ? (
            <p className="text-gray-400 text-center mt-10 print:hidden">La comanda está vacía</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {order.map((item) => (
                <li key={item.id} className="flex justify-between items-center group">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{item.name}</div>
                    <div className="text-gray-500 text-sm">
                      {item.quantity} x ${item.price} = ${item.quantity * item.price}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromOrder(item.id)}
                    className="text-red-500 px-2 py-1 bg-red-50 rounded hover:bg-red-100 print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-dashed border-gray-400">
          <div className="flex justify-between text-xl font-bold text-gray-900 mb-6">
            <span>Total:</span>
            <span>${total}</span>
          </div>

          <div className="flex flex-col gap-3 print:hidden">
            <button
              onClick={handlePrint}
              disabled={order.length === 0}
              className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Imprimir Comanda
            </button>
            <button
              onClick={handleCharge}
              disabled={order.length === 0}
              className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cobrar {isExpress ? 'Exprés' : 'Mesa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

