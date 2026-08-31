'use client';

import React, { useState } from 'react';
import { useAppContext, Dish } from '@/context/AppContext';

export default function AdminPanel() {
  const { menu, addDish, updateDish, deleteDish } = useAppContext();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName || !newDishPrice) return;
    addDish({ name: newDishName, price: Number(newDishPrice) });
    setNewDishName('');
    setNewDishPrice('');
  };

  const startEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setEditName(dish.name);
    setEditPrice(dish.price.toString());
  };

  const saveEdit = () => {
    if (editingId && editName && editPrice) {
      updateDish(editingId, { name: editName, price: Number(editPrice) });
      setEditingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-red-900/50 max-w-sm w-full">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Acceso Admin</h2>
          <input 
            type="password" 
            placeholder="Contraseña (admin123)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button 
            onClick={handleLogin}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition-colors"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-red-500">Panel de Administrador</h1>
        <p className="text-gray-400 mt-2">Área restringida. Manejo de base de datos y configuraciones.</p>
      </header>

      <main className="flex flex-col gap-8">
        <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-4xl">
          <h2 className="text-xl font-semibold mb-6 text-white border-b border-gray-700 pb-2">Configuración del Menú</h2>
          
          <form onSubmit={handleAddDish} className="flex gap-4 mb-8 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Nombre del Platillo</label>
              <input 
                type="text" 
                value={newDishName} 
                onChange={e => setNewDishName(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Tacos de Asada"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Precio</label>
              <input 
                type="number" 
                value={newDishPrice} 
                onChange={e => setNewDishPrice(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. 25"
                min="0"
                step="0.01"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors h-10">
              Agregar
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-3 px-4 font-semibold text-gray-300">Platillo</th>
                  <th className="py-3 px-4 font-semibold text-gray-300 w-32">Precio</th>
                  <th className="py-3 px-4 font-semibold text-gray-300 w-48 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {menu.map(dish => (
                  <tr key={dish.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4">
                      {editingId === dish.id ? (
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="bg-gray-900 border border-gray-600 rounded p-1 w-full text-white"
                        />
                      ) : (
                        dish.name
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === dish.id ? (
                        <input 
                          type="number" 
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="bg-gray-900 border border-gray-600 rounded p-1 w-full text-white"
                        />
                      ) : (
                        `$${dish.price}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingId === dish.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={saveEdit} className="text-green-400 hover:text-green-300 text-sm font-medium">Guardar</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-300 text-sm font-medium">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <button onClick={() => startEdit(dish)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Editar</button>
                          <button onClick={() => deleteDish(dish.id)} className="text-red-400 hover:text-red-300 text-sm font-medium">Eliminar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {menu.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-500">No hay platillos en el menú</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-red-900/50 max-w-4xl mt-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Gestión de Datos</h2>
          <p className="text-gray-400 mb-6 text-sm">
            ¡Atención! Las acciones aquí son destructivas y no se pueden deshacer.
          </p>
          
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Purgar Base de Datos
          </button>
        </section>
      </main>
    </div>
  );
}
