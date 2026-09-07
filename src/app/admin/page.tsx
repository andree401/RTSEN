'use client';

import React, { useState } from 'react';
import { useAppContext, Dish } from '@/context/AppContext';

export default function AdminPanel() {
  const { menu, addDish, updateDish, deleteDish, activeRole } = useAppContext();
  
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  // Protección de Estación: Cajeros y Cocineros no pueden alterar precios o menú
  if (activeRole === 'cajero' || activeRole === 'cocina') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 text-3xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            ⛔
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Acceso Administrativo Restringido</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Tu estación actual ({activeRole.toUpperCase()}) no tiene permisos para modificar el catálogo de precios o existencias del restaurante.
          </p>
          <a
            href={activeRole === 'cajero' ? '/restaurante' : '/cocina'}
            className="inline-block py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Volver a mi Estación de Trabajo
          </a>
        </div>
      </div>
    );
  }

  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newDishName.trim();
    if (!cleanName) {
      alert('⚠️ Por favor ingresa el nombre del platillo.');
      return;
    }
    if (cleanName.length < 2) {
      alert('⚠️ El nombre del platillo debe tener al menos 2 caracteres.');
      return;
    }
    if (newDishPrice.trim() === '') {
      alert('⚠️ Por favor ingresa el precio de venta.');
      return;
    }

    const price = Number(newDishPrice);
    if (isNaN(price) || price < 0) {
      alert('⚠️ El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    const duplicate = menu.some(
      d => d.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      alert(`⚠️ Ya existe un platillo llamado "${cleanName}" en el menú.`);
      return;
    }

    addDish({ name: cleanName, price });
    setNewDishName('');
    setNewDishPrice('');
  };

  const startEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setEditName(dish.name);
    setEditPrice(dish.price.toString());
  };

  const saveEdit = () => {
    if (!editingId) return;

    const cleanName = editName.trim();
    if (!cleanName) {
      alert('⚠️ El nombre del platillo no puede quedar vacío.');
      return;
    }
    if (cleanName.length < 2) {
      alert('⚠️ El nombre del platillo debe tener al menos 2 caracteres.');
      return;
    }
    if (editPrice.trim() === '') {
      alert('⚠️ Por favor ingresa un precio válido.');
      return;
    }

    const price = Number(editPrice);
    if (isNaN(price) || price < 0) {
      alert('⚠️ El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    const duplicate = menu.some(
      d => d.id !== editingId && d.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      alert(`⚠️ Ya existe otro platillo con el nombre "${cleanName}".`);
      return;
    }

    updateDish(editingId, { name: cleanName, price });
    setEditingId(null);
  };

  const handleDeleteDish = async (dish: Dish) => {
    const ok = confirm(`¿Estás seguro de que deseas eliminar "${dish.name}" del menú?\n\nEsta acción también desvinculará sus recetas asociadas de manera segura.`);
    if (!ok) return;

    await deleteDish(dish.id);
  };

  const filteredMenu = menu.filter(dish =>
    dish.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 text-slate-800 p-8 font-sans">
      <header className="mb-10 max-w-5xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚙️</span>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500">
            Panel de Administrador
          </h1>
        </div>
        <p className="text-slate-500 mt-2 font-medium">Área de gestión. Configuración del menú, recetas y existencias en tiempo real.</p>
        
        <div className="flex flex-wrap gap-3 mt-5">
          <a 
            href="/admin/inventario" 
            className="inline-flex items-center gap-1.5 bg-white shadow-sm border border-slate-200 hover:border-blue-300 text-blue-600 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all hover:scale-105"
          >
            📦 Gestionar Inventario
          </a>
          <a 
            href="/admin/recetas" 
            className="inline-flex items-center gap-1.5 bg-white shadow-sm border border-slate-200 hover:border-indigo-300 text-indigo-600 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all hover:scale-105"
          >
            🍳 Gestionar Recetas Multi-Ingrediente
          </a>
          <a 
            href="/restaurante" 
            className="inline-flex items-center gap-1.5 bg-white shadow-sm border border-slate-200 hover:border-emerald-300 text-emerald-600 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all hover:scale-105"
          >
            💳 Ir al Punto de Venta (POS)
          </a>
        </div>
      </header>

      <main className="flex flex-col gap-8 max-w-5xl">
        {/* Card de Configuración del Menú */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>🍽️</span> Catálogo del Menú ({menu.length})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Los cambios se sincronizan en tiempo real con el Punto de Venta (POS).
              </p>
            </div>
            
            {/* Buscador de platillos */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="🔍 Buscar platillo..."
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Formulario de Alta de Platillo */}
          <form onSubmit={handleAddDish} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 flex flex-wrap gap-4 mb-8 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nombre del Platillo *
              </label>
              <input 
                type="text" 
                value={newDishName} 
                onChange={e => setNewDishName(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                placeholder="Ej. Hamburguesa Especial"
                required
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Precio (₡) *
              </label>
              <input 
                type="number" 
                value={newDishPrice} 
                onChange={e => setNewDishPrice(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold"
                placeholder="Ej. 3500"
                min="0"
                step="any"
                required
              />
            </div>
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all text-sm flex items-center gap-1.5"
            >
              <span>+</span> Agregar Platillo
            </button>
          </form>

          {/* Tabla de Platillos */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase text-slate-500 font-bold tracking-wider">
                  <th className="py-3 px-4">Platillo</th>
                  <th className="py-3 px-4 w-36 text-center">Precio</th>
                  <th className="py-3 px-4 w-48 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredMenu.map(dish => (
                  <tr key={dish.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {editingId === dish.id ? (
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="bg-white border border-blue-400 rounded-lg p-1.5 w-full text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{dish.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {editingId === dish.id ? (
                        <input 
                          type="number" 
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          min="0"
                          step="any"
                          className="bg-white border border-blue-400 rounded-lg p-1.5 w-28 text-center text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                        />
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-xs font-black">
                          ₡{Number(dish.price).toLocaleString('es-CR')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {editingId === dish.id ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={saveEdit} 
                            className="text-emerald-700 hover:text-emerald-800 text-xs font-bold px-3 py-1.5 bg-emerald-100/80 hover:bg-emerald-200 rounded-lg transition-colors"
                          >
                            Guardar
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="text-slate-600 hover:text-slate-800 text-xs font-bold px-3 py-1.5 bg-slate-200/70 hover:bg-slate-300 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => startEdit(dish)} 
                            className="text-blue-600 hover:text-blue-700 text-xs font-semibold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteDish(dish)} 
                            className="text-rose-600 hover:text-rose-700 text-xs font-semibold px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMenu.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
                      {searchFilter ? 'No se encontraron platillos que coincidan con la búsqueda.' : 'No hay platillos en el menú todavía. Agrega el primero arriba.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección de Seguridad y Respaldo */}
        <section className="bg-amber-50/60 p-6 rounded-2xl border border-amber-200/80">
          <h2 className="text-base font-bold mb-1 text-amber-900 flex items-center gap-2">
            <span>🛡️</span> Integridad y Sincronización
          </h2>
          <p className="text-slate-600 text-xs leading-relaxed">
            Las modificaciones en platillos, precios y existencias se propagan de inmediato al Punto de Venta (POS) y a Cocina (KDS). Si eliminas un platillo, sus recetas vinculadas se desasocian automáticamente para garantizar consistencia referencial.
          </p>
        </section>
      </main>
    </div>
  );
}
