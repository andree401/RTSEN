'use client';

import React, { useState } from 'react';
import { useAppContext, Dish } from '@/context/AppContext';

export default function AdminPanel() {
  const { menu, addDish, updateDish, deleteDish } = useAppContext();
  
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

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
    if (editingId && editName.trim() && editPrice.trim() !== '') {
      updateDish(editingId, { name: editName.trim(), price: Number(editPrice) });
      setEditingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 text-slate-800 p-8">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚙️</span>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500">
            Panel de Administrador
          </h1>
        </div>
        <p className="text-slate-500 mt-2 font-medium">Área de gestión. Configuración del menú, recetas y existencias.</p>
        <div className="flex gap-3 mt-5">
          <a 
            href="/admin/inventario" 
            className="inline-flex items-center gap-1.5 bg-white shadow-sm border border-slate-200 hover:border-blue-300 text-blue-600 px-4 py-2 rounded-xl font-semibold text-xs transition-all hover:scale-105"
          >
            📦 Gestionar Inventario
          </a>
          <a 
            href="/admin/recetas" 
            className="inline-flex items-center gap-1.5 bg-white shadow-sm border border-slate-200 hover:border-indigo-300 text-indigo-600 px-4 py-2 rounded-xl font-semibold text-xs transition-all hover:scale-105"
          >
            🍳 Gestionar Recetas
          </a>
        </div>
      </header>

      <main className="flex flex-col gap-8">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-4xl">
          <h2 className="text-lg font-bold mb-6 text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>🍽️</span> Configuración del Menú
          </h2>
          
          <form onSubmit={handleAddDish} className="flex flex-wrap gap-4 mb-8 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre del Platillo</label>
              <input 
                type="text" 
                value={newDishName} 
                onChange={e => setNewDishName(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                placeholder="Ej. Tacos de Asada"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Precio</label>
              <input 
                type="number" 
                value={newDishPrice} 
                onChange={e => setNewDishPrice(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                placeholder="Ej. 25"
                min="0"
                step="0.01"
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all text-sm">
              Agregar
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-xs uppercase text-slate-500 font-semibold">
                  <th className="py-3 px-4">Platillo</th>
                  <th className="py-3 px-4 w-32">Precio</th>
                  <th className="py-3 px-4 w-48 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {menu.map(dish => (
                  <tr key={dish.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {editingId === dish.id ? (
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="bg-white border border-blue-400 rounded-lg p-1.5 w-full text-slate-800 text-sm"
                        />
                      ) : (
                        dish.name
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {editingId === dish.id ? (
                        <input 
                          type="number" 
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="bg-white border border-blue-400 rounded-lg p-1.5 w-full text-slate-800 text-sm"
                        />
                      ) : (
                        `$${dish.price}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingId === dish.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold px-2 py-1 bg-emerald-50 rounded">Guardar</button>
                          <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-700 text-xs font-semibold px-2 py-1 bg-slate-100 rounded">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(dish)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">Editar</button>
                          <button onClick={() => deleteDish(dish.id)} className="text-rose-600 hover:text-rose-700 text-xs font-semibold px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">Eliminar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {menu.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">No hay platillos en el menú</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200/80 max-w-4xl">
          <h2 className="text-lg font-bold mb-2 text-rose-800 flex items-center gap-2">
            <span>⚠️</span> Gestión de Datos
          </h2>
          <p className="text-slate-600 mb-5 text-xs">
            ¡Atención! Las acciones aquí son destructivas y no se pueden deshacer.
          </p>
          
          <button className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Purgar Base de Datos
          </button>
        </section>
      </main>
    </div>
  );
}
