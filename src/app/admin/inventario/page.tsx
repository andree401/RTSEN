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

export default function InventarioPanel() {
  const { ownerId } = useAppContext();
  
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newCantidad, setNewCantidad] = useState('');
  const [newUnidad, setNewUnidad] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCantidad, setEditCantidad] = useState('');

  const fetchInventario = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventario_items')
      .select('id, nombre, cantidad, unidad_medida')
      .eq('negocio_id', ownerId)
      .order('nombre');

    if (error) {
      console.error('Error fetching inventario:', error);
    } else if (data) {
      setItems(data as InventarioItem[]);
    }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    fetchInventario();
  }, [fetchInventario]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !newName || !newCantidad || !newUnidad) return;
    
    const { data, error } = await supabase
      .from('inventario_items')
      .insert({
        negocio_id: ownerId,
        nombre: newName,
        cantidad: Number(newCantidad),
        unidad_medida: newUnidad
      })
      .select()
      .single();

    if (error) {
      alert('Error al agregar al inventario: ' + error.message);
    } else if (data) {
      setItems([...items, data as InventarioItem].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewName('');
      setNewCantidad('');
      setNewUnidad('');
    }
  };

  const startEdit = (item: InventarioItem) => {
    setEditingId(item.id);
    setEditCantidad(item.cantidad.toString());
  };

  const saveEdit = async () => {
    if (!ownerId || !editingId || !editCantidad) return;

    const { error } = await supabase
      .from('inventario_items')
      .update({ cantidad: Number(editCantidad) })
      .eq('id', editingId)
      .eq('negocio_id', ownerId);

    if (error) {
      alert('Error al actualizar cantidad: ' + error.message);
    } else {
      setItems(items.map(item => item.id === editingId ? { ...item, cantidad: Number(editCantidad) } : item));
      setEditingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    if (!ownerId || !confirm('¿Estás seguro de eliminar este ingrediente?')) return;

    const { error } = await supabase
      .from('inventario_items')
      .delete()
      .eq('id', id)
      .eq('negocio_id', ownerId);

    if (error) {
      alert('Error eliminando ingrediente: ' + error.message);
    } else {
      setItems(items.filter(item => item.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <p className="text-pink-500 font-bold text-xl animate-pulse">Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100 p-8 font-sans">
      <header className="mb-12 border-b border-gray-800 pb-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 uppercase tracking-widest">
          Inventario Central
        </h1>
        <p className="text-gray-400 mt-2 font-medium tracking-wide">
          Gestión de ingredientes y existencias. Operaciones críticas.
        </p>
      </header>

      <main className="flex flex-col gap-10">
        {/* Formulario de Nuevo Ingrediente */}
        <section className="bg-[#141414] p-6 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.1)] border border-gray-800 max-w-5xl">
          <h2 className="text-xl font-bold mb-6 text-pink-400 uppercase tracking-wider">Registrar Nuevo Ingrediente</h2>
          
          <form onSubmit={handleAddItem} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs uppercase text-gray-500 font-bold mb-2 tracking-wider">Nombre del Ingrediente</label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                placeholder="Ej. Tomate"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-xs uppercase text-gray-500 font-bold mb-2 tracking-wider">Medida</label>
              <input 
                type="text" 
                value={newUnidad} 
                onChange={e => setNewUnidad(e.target.value)}
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                placeholder="Ej. kg"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-xs uppercase text-gray-500 font-bold mb-2 tracking-wider">Cant. Inicial</label>
              <input 
                type="number" 
                value={newCantidad} 
                onChange={e => setNewCantidad(e.target.value)}
                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                placeholder="Ej. 10"
                min="0"
                step="0.01"
                required
              />
            </div>
            <button type="submit" className="bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)]">
              Añadir
            </button>
          </form>
        </section>

        {/* Tabla de Inventario */}
        <section className="bg-[#141414] p-6 rounded-2xl shadow-xl border border-gray-800 max-w-5xl">
          <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-wider">Existencias Actuales</h2>
          
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] text-xs uppercase tracking-widest text-gray-500 border-b border-gray-800">
                  <th className="py-4 px-6 font-bold">Ingrediente</th>
                  <th className="py-4 px-6 font-bold w-40 text-center">Cantidad</th>
                  <th className="py-4 px-6 font-bold w-32 text-center">Unidad</th>
                  <th className="py-4 px-6 font-bold w-48 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-800/50 hover:bg-[#1f1f1f] transition-colors group">
                    <td className="py-4 px-6 font-medium text-gray-200">
                      {item.nombre}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {editingId === item.id ? (
                        <input 
                          type="number" 
                          value={editCantidad}
                          onChange={e => setEditCantidad(e.target.value)}
                          className="bg-[#0d0d0d] border border-violet-500/50 rounded-md p-1 w-24 text-center text-white focus:outline-none focus:border-violet-500"
                          step="0.01"
                        />
                      ) : (
                        <span className={`font-bold ${item.cantidad <= 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.cantidad}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center text-gray-400 text-sm">
                      {item.unidad_medida}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-3">
                          <button onClick={saveEdit} className="text-pink-500 hover:text-pink-400 text-sm font-bold uppercase tracking-wider transition-colors">Guardar</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300 text-sm font-bold uppercase tracking-wider transition-colors">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(item)} className="text-violet-400 hover:text-violet-300 text-sm font-bold uppercase tracking-wider transition-colors">Ajustar</button>
                          <button onClick={() => deleteItem(item.id)} className="text-red-500/70 hover:text-red-400 text-sm font-bold uppercase tracking-wider transition-colors">Eliminar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-600 font-medium uppercase tracking-widest">
                      Inventario Vacío
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
