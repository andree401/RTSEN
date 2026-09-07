'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

type MenuItem = {
  id: string;
  nombre: string;
  precio?: number;
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
    nombre?: string;
    nombre_ingrediente?: string;
    unidad_medida?: string;
  } | {
    nombre?: string;
    nombre_ingrediente?: string;
    unidad_medida?: string;
  }[];
};

type IngredientRow = {
  id: string;
  ingrediente_id: string;
  cantidad_requerida: string;
};

export default function RecetasPanel() {
  const { ownerId, refreshMenu } = useAppContext();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventarioItems, setInventarioItems] = useState<InventarioItem[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form mode: existing dish or new dish
  const [dishMode, setDishMode] = useState<'existing' | 'new'>('existing');
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');

  // Dynamic multiple ingredient rows
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([
    { id: 'row-1', ingrediente_id: '', cantidad_requerida: '' }
  ]);

  const fetchData = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);

    try {
      // Fetch Menu Items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('id, nombre, precio')
        .eq('negocio_id', ownerId)
        .order('nombre');
      
      if (menuError) throw menuError;
      setMenuItems((menuData as MenuItem[]) || []);

      // Fetch Inventario Items
      const { data: invData, error: invError } = await supabase
        .from('inventario_items')
        .select('id, nombre:nombre_ingrediente, unidad_medida')
        .eq('negocio_id', ownerId)
        .order('nombre_ingrediente');
      
      if (invError) throw invError;
      setInventarioItems((invData as InventarioItem[]) || []);

      // Fetch Recetas
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
              nombre:nombre_ingrediente,
              nombre_ingrediente,
              unidad_medida
            )
          `)
          .in('menu_item_id', menuIds);
        
        if (error) throw error;
        setRecetas(((recData as unknown) as Receta[]) || []);
      } else {
        setRecetas([]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching data:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Manejo de filas dinámicas de ingredientes
  const addIngredientRow = () => {
    setIngredientRows(prev => [
      ...prev,
      { id: `row-${Date.now()}-${Math.random()}`, ingrediente_id: '', cantidad_requerida: '' }
    ]);
  };

  const removeIngredientRow = (rowId: string) => {
    if (ingredientRows.length <= 1) {
      alert('La receta debe tener al menos un ingrediente.');
      return;
    }
    setIngredientRows(prev => prev.filter(r => r.id !== rowId));
  };

  const updateIngredientRow = (rowId: string, field: 'ingrediente_id' | 'cantidad_requerida', value: string) => {
    setIngredientRows(prev =>
      prev.map(r => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) return;

    // 1. Validar platillo
    let targetMenuItemId = selectedMenuItem;

    if (dishMode === 'new') {
      if (!newDishName.trim()) {
        alert('Por favor ingresa el nombre del nuevo platillo.');
        return;
      }
      const priceNum = Number(newDishPrice);
      if (newDishPrice && (isNaN(priceNum) || priceNum < 0)) {
        alert('El precio debe ser un número válido.');
        return;
      }
    } else {
      if (!targetMenuItemId) {
        alert('Por favor selecciona un platillo existente.');
        return;
      }
    }

    // 2. Validar ingredientes
    const selectedIds = new Set<string>();
    for (const row of ingredientRows) {
      if (!row.ingrediente_id) {
        alert('Por favor selecciona un ingrediente para cada fila.');
        return;
      }
      if (selectedIds.has(row.ingrediente_id)) {
        const item = inventarioItems.find(i => i.id === row.ingrediente_id);
        alert(`El ingrediente "${item?.nombre || 'seleccionado'}" está duplicado en la lista.`);
        return;
      }
      selectedIds.add(row.ingrediente_id);

      const cant = Number(row.cantidad_requerida);
      if (isNaN(cant) || cant <= 0) {
        alert('Cada ingrediente debe tener una cantidad válida mayor a cero.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 3. Si es platillo nuevo, crearlo en la BD primero
      if (dishMode === 'new') {
        const { data: newDishData, error: newDishError } = await supabase
          .from('menu_items')
          .insert({
            negocio_id: ownerId,
            nombre: newDishName.trim(),
            precio: Number(newDishPrice) || 0,
          })
          .select()
          .single();

        if (newDishError) throw newDishError;
        if (!newDishData) throw new Error('No se pudo crear el nuevo platillo.');
        targetMenuItemId = newDishData.id;
      }

      // 4. Insertar múltiples ingredientes en batch
      const inserts = ingredientRows.map(row => ({
        menu_item_id: targetMenuItemId,
        ingrediente_id: row.ingrediente_id,
        cantidad_requerida: Number(row.cantidad_requerida)
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('recetas')
        .insert(inserts)
        .select(`
          id, 
          menu_item_id, 
          ingrediente_id, 
          cantidad_requerida,
          inventario_items (
            nombre:nombre_ingrediente,
            nombre_ingrediente,
            unidad_medida
          )
        `);

      if (insertError) throw insertError;

      alert(`✅ ¡Receta guardada exitosamente con ${inserts.length} ingrediente(s)!`);

      // 5. Limpiar formulario y recargar
      if (dishMode === 'new') {
        setNewDishName('');
        setNewDishPrice('');
      }
      setSelectedMenuItem('');
      setIngredientRows([{ id: `row-${Date.now()}`, ingrediente_id: '', cantidad_requerida: '' }]);

      if (insertedData) {
        setRecetas(prev => [...prev, ...((insertedData as unknown) as Receta[])]);
      }
      await fetchData();
      if (refreshMenu) {
        await refreshMenu();
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al guardar receta:', error);
      alert('❌ Error al guardar receta: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteReceta = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ingrediente de la receta?')) return;

    try {
      const { error } = await supabase
        .from('recetas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecetas(recetas.filter(r => r.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error al eliminar: ' + error.message);
    }
  };

  const deleteCompleteRecipe = async (menuItemId: string, dishName: string) => {
    if (!confirm(`¿Estás seguro de eliminar TODOS los ingredientes de la receta de "${dishName}"?`)) return;

    try {
      const { error } = await supabase
        .from('recetas')
        .delete()
        .eq('menu_item_id', menuItemId);

      if (error) throw error;
      setRecetas(recetas.filter(r => r.menu_item_id !== menuItemId));
      alert(`✅ Receta de "${dishName}" eliminada correctamente.`);
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error al eliminar receta completa: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-blue-400 font-bold text-xl animate-pulse">Cargando arquitectura de recetas...</p>
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
        <h1 className="text-3xl font-bold text-blue-400">Arquitectura de Recetas (Multi-Ingrediente)</h1>
        <p className="text-gray-400 mt-2">
          Asocia múltiples ingredientes del inventario a tus platillos para descontar existencias automáticamente en cada comanda.
        </p>
      </header>

      <main className="flex flex-col gap-10">
        {/* Sección Formulario de Receta */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-700 max-w-4xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-700 pb-4">
            <h2 className="text-xl font-semibold text-white">Configurar Receta con Múltiples Ingredientes</h2>
            
            {/* Toggle Platillo Existente vs Nuevo */}
            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 text-sm">
              <button
                type="button"
                onClick={() => setDishMode('existing')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  dishMode === 'existing'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Platillo Existente
              </button>
              <button
                type="button"
                onClick={() => setDishMode('new')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  dishMode === 'new'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                + Crear Nuevo Platillo
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSaveRecipe} className="space-y-6">
            {/* Selección o Creación de Platillo */}
            {dishMode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Selecciona el Platillo del Menú
                </label>
                <select 
                  value={selectedMenuItem} 
                  onChange={e => setSelectedMenuItem(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Elige un Platillo --</option>
                  {menuItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} {item.precio !== undefined ? `(₡${item.precio.toLocaleString('es-CR')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nombre del Nuevo Platillo *
                  </label>
                  <input
                    type="text"
                    value={newDishName}
                    onChange={e => setNewDishName(e.target.value)}
                    placeholder="Ej. Tacos al Pastor (Orden x3)"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Precio de Venta (₡ Colones)
                  </label>
                  <input
                    type="number"
                    value={newDishPrice}
                    onChange={e => setNewDishPrice(e.target.value)}
                    placeholder="Ej. 3500"
                    min="0"
                    step="50"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Lista Dinámica de Ingredientes */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Ingredientes Requeridos ({ingredientRows.length})
                </label>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-blue-300 hover:text-blue-200 px-3 py-1.5 rounded-lg border border-gray-600 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>+</span> Añadir otro ingrediente
                </button>
              </div>

              <div className="space-y-3">
                {ingredientRows.map((row, index) => {
                  const selectedInv = inventarioItems.find(i => i.id === row.ingrediente_id);
                  const unidadLabel = selectedInv?.unidad_medida || 'Unidad';

                  return (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-3 bg-gray-900/80 p-3.5 rounded-xl border border-gray-700 transition-all hover:border-gray-600"
                    >
                      <span className="text-gray-500 font-mono text-sm w-5 text-center">
                        {index + 1}.
                      </span>

                      {/* Selector de Ingrediente */}
                      <div className="flex-1 min-w-[220px]">
                        <select
                          value={row.ingrediente_id}
                          onChange={e => updateIngredientRow(row.id, 'ingrediente_id', e.target.value)}
                          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">-- Seleccionar Ingrediente --</option>
                          {inventarioItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.nombre} ({item.unidad_medida})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cantidad requerida */}
                      <div className="w-32 flex items-center gap-2">
                        <input
                          type="number"
                          value={row.cantidad_requerida}
                          onChange={e => updateIngredientRow(row.id, 'cantidad_requerida', e.target.value)}
                          placeholder="Cantidad"
                          min="0.001"
                          step="0.001"
                          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Unidad de medida */}
                      <span className="text-gray-400 text-xs font-semibold w-16 truncate">
                        {unidadLabel}
                      </span>

                      {/* Botón eliminar fila */}
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(row.id)}
                        disabled={ingredientRows.length <= 1}
                        className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Guardando Receta...' : 'Guardar Receta Completa'}
              </button>
            </div>
          </form>
        </section>

        {/* Sección Recetas Existentes */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-700 max-w-4xl">
          <h2 className="text-xl font-semibold mb-6 text-white border-b border-gray-700 pb-2">
            Recetas Configuradas ({groupedRecetas.length})
          </h2>
          
          <div className="space-y-6">
            {groupedRecetas.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No hay recetas configuradas aún.</p>
            ) : (
              groupedRecetas.map(platillo => (
                <div key={platillo.id} className="bg-gray-900 rounded-xl p-5 border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-blue-300">
                      {platillo.nombre}
                      {platillo.precio !== undefined && (
                        <span className="ml-2 text-sm text-gray-400 font-normal">
                          (₡{platillo.precio.toLocaleString('es-CR')})
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => deleteCompleteRecipe(platillo.id, platillo.nombre)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg transition-colors"
                      title="Eliminar todos los ingredientes de este platillo"
                    >
                      Eliminar Receta Completa
                    </button>
                  </div>

                  <ul className="space-y-2">
                    {platillo.ingredientes.map(receta => {
                      const invItem = Array.isArray(receta.inventario_items)
                        ? receta.inventario_items[0]
                        : receta.inventario_items;
                      const nombreIng = invItem?.nombre || invItem?.nombre_ingrediente || 'Ingrediente';
                      const unidadMed = invItem?.unidad_medida || '';

                      return (
                        <li
                          key={receta.id}
                          className="flex justify-between items-center bg-gray-800/90 px-3.5 py-2 rounded-lg border border-gray-700/80"
                        >
                          <span className="text-gray-300 text-sm">
                            <span className="font-semibold text-white">{receta.cantidad_requerida} {unidadMed}</span> de {nombreIng}
                          </span>
                          <button 
                            onClick={() => deleteReceta(receta.id)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                          >
                            Quitar
                          </button>
                        </li>
                      );
                    })}
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
