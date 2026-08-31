'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

type MenuItem = {
  id: string;
  nombre: string;
};

type InventarioItem = {
  id: string;
  nombre: string;
  unidad_medida: string;
};

type Receta = {
  id: string;
  menu_item_id: string;
  ingrediente_id: string;
  cantidad_requerida: number;
  inventario_items?: {
    nombre: string;
    unidad_medida: string;
  };
};

export default function RecetasPanel() {
  const { ownerId } = useAppContext();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventarioItems, setInventarioItems] = useState<InventarioItem[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [cantidadRequerida, setCantidadRequerida] = useState('');

  const fetchData = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);

    // Fetch Menu Items
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('id, nombre')
      .eq('negocio_id', ownerId)
      .order('nombre');
    
    if (menuData) setMenuItems(menuData as MenuItem[]);

    // Fetch Inventario Items
    const { data: invData } = await supabase
      .from('inventario_items')
      .select('id, nombre, unidad_medida')
      .eq('negocio_id', ownerId)
      .order('nombre');
    
    if (invData) setInventarioItems(invData as InventarioItem[]);

    // Fetch Recetas (assuming recetas table has no negocio_id but belongs to menu_items that belong to negocio_id)
    // We can fetch all recetas for the fetched menu_items
    if (menuData && menuData.length > 0) {
      const menuIds = menuData.map(m => m.id);
      const { data: recData, error } = await supabase
        .from('recetas')
        .select(`
          id, 
          menu_item_id, 
          ingrediente_id, 
          cantidad_requerida,
          inventario_items (
            nombre,
            unidad_medida
          )
        `)
        .in('menu_item_id', menuIds);
      
      if (!error && recData) {
        setRecetas(recData as any[]);
      }
    }

    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddReceta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuItem || !selectedIngredient || !cantidadRequerida) return;

    const { data, error } = await supabase
      .from('recetas')
      .insert({
        menu_item_id: selectedMenuItem,
        ingrediente_id: selectedIngredient,
        cantidad_requerida: Number(cantidadRequerida)
      })
      .select(`
        id, 
        menu_item_id, 
        ingrediente_id, 
        cantidad_requerida,
        inventario_items (
          nombre,
          unidad_medida
        )
      `)
      .single();

    if (error) {
      alert('Error al agregar receta: ' + error.message);
    } else if (data) {
      setRecetas([...recetas, data as any]);
      // Reset form but keep selected menu item
      setSelectedIngredient('');
      setCantidadRequerida('');
    }
  };

  const deleteReceta = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ingrediente de la receta?')) return;

    const { error } = await supabase
      .from('recetas')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setRecetas(recetas.filter(r => r.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-blue-400 font-bold text-xl animate-pulse">Cargando recetas...</p>
      </div>
    );
  }

  // Agrupar recetas por platillo
  const groupedRecetas = menuItems.map(menuItem => {
    return {
      ...menuItem,
      ingredientes: recetas.filter(r => r.menu_item_id === menuItem.id)
    };
  }).filter(item => item.ingredientes.length > 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <header className="mb-10 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-blue-400">Arquitectura de Recetas</h1>
        <p className="text-gray-400 mt-2">
          Asocia ingredientes del inventario a tus platillos para descontar existencias automáticamente.
        </p>
      </header>

      <main className="flex flex-col gap-10">
        <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-4xl">
          <h2 className="text-xl font-semibold mb-6 text-white border-b border-gray-700 pb-2">Agregar Ingrediente a Platillo</h2>
          
          <form onSubmit={handleAddReceta} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Platillo</label>
              <select 
                value={selectedMenuItem} 
                onChange={e => setSelectedMenuItem(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Seleccionar Platillo --</option>
                {menuItems.map(item => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Ingrediente</label>
              <select 
                value={selectedIngredient} 
                onChange={e => setSelectedIngredient(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Seleccionar Ingrediente --</option>
                {inventarioItems.map(item => (
                  <option key={item.id} value={item.id}>{item.nombre} ({item.unidad_medida})</option>
                ))}
              </select>
            </div>

            <div className="w-32">
              <label className="block text-sm text-gray-400 mb-1">Cantidad</label>
              <input 
                type="number" 
                value={cantidadRequerida} 
                onChange={e => setCantidadRequerida(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. 1.5"
                min="0.001"
                step="0.001"
                required
              />
            </div>

            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors h-10">
              Vincular
            </button>
          </form>
        </section>

        <section className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 max-w-4xl">
          <h2 className="text-xl font-semibold mb-6 text-white border-b border-gray-700 pb-2">Recetas Configuradas</h2>
          
          <div className="space-y-6">
            {groupedRecetas.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No hay recetas configuradas aún.</p>
            ) : (
              groupedRecetas.map(platillo => (
                <div key={platillo.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-lg font-bold text-blue-300 mb-3">{platillo.nombre}</h3>
                  <ul className="space-y-2">
                    {platillo.ingredientes.map(receta => (
                      <li key={receta.id} className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                        <span className="text-gray-300">
                          <span className="font-semibold text-white">{receta.cantidad_requerida} {receta.inventario_items?.unidad_medida}</span> de {receta.inventario_items?.nombre}
                        </span>
                        <button 
                          onClick={() => deleteReceta(receta.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
