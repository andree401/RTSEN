'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

type InventarioItem = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad_medida: string;
};

const COMMON_UNITS = ['kg', 'g', 'l', 'ml', 'pz', 'unidad', 'oz'];

export default function InventarioPanel() {
  const { ownerId } = useAppContext();
  
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [newName, setNewName] = useState('');
  const [newCantidad, setNewCantidad] = useState('');
  const [newUnidad, setNewUnidad] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCantidad, setEditCantidad] = useState('');

  const fetchInventario = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventario_items')
        .select('id, nombre:nombre_ingrediente, cantidad:cantidad_disponible, unidad_medida')
        .eq('negocio_id', ownerId)
        .order('nombre_ingrediente');

      if (error) throw error;
      setItems((data as InventarioItem[]) || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching inventario:', error);
      alert('Error al cargar el inventario: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    fetchInventario();

    if (!ownerId) return;

    // Sincronización en tiempo real del inventario
    const invChannel = supabase
      .channel(`inventario_realtime_${ownerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventario_items',
          filter: `negocio_id=eq.${ownerId}`,
        },
        () => {
          fetchInventario();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invChannel);
    };
  }, [ownerId, fetchInventario]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) return;

    const trimmedName = newName.trim();
    const trimmedUnidad = newUnidad.trim();

    if (!trimmedName) {
      alert('⚠️ Por favor ingresa el nombre del ingrediente.');
      return;
    }
    if (!trimmedUnidad) {
      alert('⚠️ Por favor especifica la unidad de medida (ej. kg, g, l, pz).');
      return;
    }
    if (newCantidad.trim() === '') {
      alert('⚠️ Por favor ingresa la cantidad inicial (puede ser 0 si aún no hay existencias).');
      return;
    }
    
    const cantidad = Number(newCantidad);
    if (isNaN(cantidad) || cantidad < 0) {
      alert('⚠️ La cantidad debe ser un número válido mayor o igual a 0.');
      return;
    }

    // Prevención de duplicados por nombre en el mismo negocio
    const duplicate = items.some(
      i => i.nombre.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      alert(`⚠️ El ingrediente "${trimmedName}" ya existe en el inventario. Puedes ajustar su cantidad en la tabla.`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventario_items')
        .insert({
          negocio_id: ownerId,
          nombre_ingrediente: trimmedName,
          cantidad_disponible: cantidad,
          unidad_medida: trimmedUnidad
        })
        .select('id, nombre:nombre_ingrediente, cantidad:cantidad_disponible, unidad_medida')
        .single();

      if (error) throw error;
      
      if (data) {
        setItems(prev => [...prev, data as InventarioItem].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNewName('');
        setNewCantidad('');
        setNewUnidad('');
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error al agregar al inventario: ' + error.message);
    }
  };

  const startEdit = (item: InventarioItem) => {
    setEditingId(item.id);
    setEditCantidad(item.cantidad.toString());
  };

  const saveEdit = async () => {
    if (!ownerId || !editingId) return;

    if (editCantidad.trim() === '') {
      alert('⚠️ Por favor ingresa un número de existencias (puede ser 0).');
      return;
    }

    const cantidad = Number(editCantidad);
    if (isNaN(cantidad) || cantidad < 0) {
      alert('⚠️ La cantidad debe ser un número mayor o igual a 0.');
      return;
    }

    try {
      const { error } = await supabase
        .from('inventario_items')
        .update({ cantidad_disponible: cantidad })
        .eq('id', editingId)
        .eq('negocio_id', ownerId);

      if (error) throw error;
      
      setItems(prev => prev.map(item => item.id === editingId ? { ...item, cantidad } : item));
      setEditingId(null);
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error al actualizar cantidad: ' + error.message);
    }
  };

  const deleteItem = async (item: InventarioItem) => {
    if (!ownerId) return;

    // Verificar de forma segura si el ingrediente está vinculado a recetas existentes
    try {
      const { data: linkedRecetas, error: checkError } = await supabase
        .from('recetas')
        .select('id, menu_item_id, menu_items(nombre)')
        .eq('ingrediente_id', item.id);

      if (checkError) {
        console.warn('Advertencia al consultar recetas asociadas:', checkError);
      }

      let confirmMsg = `¿Estás seguro de eliminar el ingrediente "${item.nombre}" del inventario?`;
      if (linkedRecetas && linkedRecetas.length > 0) {
        type RecetaMenuItem = { menu_items?: { nombre: string } | { nombre: string }[] | null };
        const platillosNombres = (linkedRecetas as unknown as RecetaMenuItem[])
          .map(r => Array.isArray(r.menu_items) ? r.menu_items[0]?.nombre : r.menu_items?.nombre)
          .filter(Boolean);
        const uniqueNames = Array.from(new Set(platillosNombres));
        confirmMsg = `⚠️ ATENCIÓN: El ingrediente "${item.nombre}" está asignado a ${linkedRecetas.length} receta(s)${uniqueNames.length > 0 ? ` (${uniqueNames.join(', ')})` : ''}.\n\nSi procedes, se eliminará de esas recetas automáticamente para mantener la consistencia del sistema.\n\n¿Deseas continuar con la eliminación segura?`;
      }

      if (!confirm(confirmMsg)) return;

      // 1. Eliminar vínculos de recetas primero para no violar restricciones de llave foránea
      await supabase
        .from('recetas')
        .delete()
        .eq('ingrediente_id', item.id);

      // 2. Eliminar de inventario_items
      const { error } = await supabase
        .from('inventario_items')
        .delete()
        .eq('id', item.id)
        .eq('negocio_id', ownerId);

      if (error) throw error;
      
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error eliminando ingrediente: ' + error.message);
    }
  };

  const filteredItems = items.filter(i =>
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <p className="text-pink-500 font-bold text-xl animate-pulse">Cargando inventario central...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100 p-8 font-sans">
      <header className="mb-10 max-w-5xl border-b border-gray-800 pb-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 uppercase tracking-widest">
              Inventario Central
            </h1>
            <p className="text-gray-400 mt-2 font-medium tracking-wide text-sm">
              Gestión de insumos, existencias en tiempo real y vinculación con recetas.
            </p>
          </div>

          <div className="flex gap-3">
            <a 
              href="/admin" 
              className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all"
            >
              🍽️ Menú
            </a>
            <a 
              href="/admin/recetas" 
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-600/30 to-violet-600/30 hover:from-pink-600/50 hover:to-violet-600/50 border border-pink-500/40 text-pink-300 px-4 py-2 rounded-xl font-semibold text-xs transition-all"
            >
              🍳 Recetas Multi-Ingrediente
            </a>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-10 max-w-5xl">
        {/* Formulario de Nuevo Ingrediente */}
        <section className="bg-[#141414] p-6 sm:p-8 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.1)] border border-gray-800">
          <h2 className="text-lg font-bold mb-4 text-pink-400 uppercase tracking-wider flex items-center gap-2">
            <span>📦</span> Registrar Nuevo Ingrediente
          </h2>
          
          <form onSubmit={handleAddItem} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs uppercase text-gray-400 font-bold mb-1.5 tracking-wider">
                Nombre del Ingrediente *
              </label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-sm"
                placeholder="Ej. Pechuga de Pollo"
                required
              />
            </div>

            <div className="w-48">
              <label className="block text-xs uppercase text-gray-400 font-bold mb-1.5 tracking-wider">
                Unidad de Medida *
              </label>
              <input 
                type="text" 
                list="unidades-list"
                value={newUnidad} 
                onChange={e => setNewUnidad(e.target.value)}
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-sm"
                placeholder="Ej. kg, g, l, pz"
                required
              />
              <datalist id="unidades-list">
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div className="w-36">
              <label className="block text-xs uppercase text-gray-400 font-bold mb-1.5 tracking-wider">
                Stock Inicial *
              </label>
              <input 
                type="number" 
                value={newCantidad} 
                onChange={e => setNewCantidad(e.target.value)}
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-sm font-semibold"
                placeholder="0"
                min="0"
                step="any"
                required
              />
            </div>

            <button 
              type="submit" 
              className="bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white px-7 py-3 rounded-xl font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] text-xs flex items-center gap-1.5"
            >
              <span>+</span> Añadir
            </button>
          </form>

          {/* Sugerencias de unidades rápidas */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-800/80">
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Unidades sugeridas:</span>
            {COMMON_UNITS.map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setNewUnidad(u)}
                className={`text-[11px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                  newUnidad === u
                    ? 'bg-violet-600/30 border-violet-500 text-violet-300'
                    : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </section>

        {/* Tabla de Existencias Actuales */}
        <section className="bg-[#141414] p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📋</span> Existencias Actuales ({items.length})
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Haz clic en &quot;Ajustar&quot; para modificar el stock rápidamente (admite 0 para ingredientes agotados).
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="🔍 Buscar ingrediente..."
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] text-xs uppercase tracking-widest text-gray-400 border-b border-gray-800 font-bold">
                  <th className="py-4 px-6">Ingrediente</th>
                  <th className="py-4 px-6 w-48 text-center">Estado y Stock</th>
                  <th className="py-4 px-6 w-32 text-center">Unidad</th>
                  <th className="py-4 px-6 w-48 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredItems.map(item => {
                  const isOutOfStock = item.cantidad <= 0;
                  const isLowStock = item.cantidad > 0 && item.cantidad <= 5;

                  return (
                    <tr key={item.id} className="hover:bg-[#1a1a1a]/80 transition-colors">
                      <td className="py-4 px-6 font-medium text-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{item.nombre}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input 
                              type="number" 
                              value={editCantidad}
                              onChange={e => setEditCantidad(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="bg-[#0d0d0d] border border-violet-500 rounded-lg p-1.5 w-24 text-center text-white focus:outline-none focus:ring-1 focus:ring-violet-400 font-bold text-sm"
                              step="any"
                              min="0"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-base text-white">
                              {item.cantidad}
                            </span>
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                🔴 Agotado
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ⚠️ Stock Bajo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                🟢 Disponible
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center text-gray-300 text-sm font-mono">
                        {item.unidad_medida}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {editingId === item.id ? (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={saveEdit} 
                              className="text-pink-400 hover:text-pink-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-lg transition-colors"
                            >
                              Guardar
                            </button>
                            <button 
                              onClick={() => setEditingId(null)} 
                              className="text-gray-400 hover:text-gray-200 text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-gray-800 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => startEdit(item)} 
                              className="text-violet-400 hover:text-violet-300 text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
                            >
                              Ajustar
                            </button>
                            <button 
                              onClick={() => deleteItem(item)} 
                              className="text-rose-400 hover:text-rose-300 text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
                              title="Eliminar ingrediente de forma segura"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500 font-medium uppercase tracking-widest text-sm">
                      {searchTerm ? 'No se encontraron ingredientes con esa búsqueda' : 'Inventario Vacío. Registra tus primeros insumos arriba.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
