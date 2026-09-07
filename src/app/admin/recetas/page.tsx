'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [recipeSearch, setRecipeSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'with_recipe' | 'without_recipe'>('all');

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
    fetchData();

    if (!ownerId) return;

    // Sincronización en tiempo real de recetas
    const recChannel = supabase
      .channel(`recetas_realtime_${ownerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recetas',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recChannel);
    };
  }, [ownerId, fetchData]);

  // Manejo de filas dinámicas de ingredientes
  const addIngredientRow = () => {
    setIngredientRows(prev => [
      ...prev,
      { id: `row-${Date.now()}-${Math.random()}`, ingrediente_id: '', cantidad_requerida: '' }
    ]);
  };

  const removeIngredientRow = (rowId: string) => {
    if (ingredientRows.length <= 1) {
      alert('⚠️ La receta debe tener al menos un ingrediente.');
      return;
    }
    setIngredientRows(prev => prev.filter(r => r.id !== rowId));
  };

  const updateIngredientRow = (rowId: string, field: 'ingrediente_id' | 'cantidad_requerida', value: string) => {
    setIngredientRows(prev =>
      prev.map(r => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  // Ingredientes ya existentes para el platillo actualmente seleccionado
  const currentDishExistingIngredients = useMemo(() => {
    if (dishMode !== 'existing' || !selectedMenuItem) return [];
    return recetas.filter(r => r.menu_item_id === selectedMenuItem);
  }, [dishMode, selectedMenuItem, recetas]);

  const currentDishExistingIngIds = useMemo(() => {
    return new Set(currentDishExistingIngredients.map(r => r.ingrediente_id));
  }, [currentDishExistingIngredients]);

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) return;

    // 1. Validar platillo
    let targetMenuItemId = selectedMenuItem;

    if (dishMode === 'new') {
      const cleanDishName = newDishName.trim();
      if (!cleanDishName) {
        alert('⚠️ Por favor ingresa el nombre del nuevo platillo.');
        return;
      }
      if (cleanDishName.length < 2) {
        alert('⚠️ El nombre del platillo debe tener al menos 2 caracteres.');
        return;
      }

      // Prevención de platillo duplicado por nombre
      if (menuItems.some(m => m.nombre.trim().toLowerCase() === cleanDishName.toLowerCase())) {
        alert(`⚠️ Ya existe un platillo llamado "${cleanDishName}" en el menú. Selecciona "Platillo Existente" para vincularle ingredientes.`);
        return;
      }

      if (newDishPrice.trim() !== '') {
        const priceNum = Number(newDishPrice);
        if (isNaN(priceNum) || priceNum < 0) {
          alert('⚠️ El precio de venta debe ser un número válido mayor o igual a 0.');
          return;
        }
      }
    } else {
      if (!targetMenuItemId) {
        alert('⚠️ Por favor selecciona un platillo existente de la lista.');
        return;
      }
    }

    // 2. Validar ingredientes del lote (prevención de duplicados internos y en BD)
    const selectedIdsInForm = new Set<string>();
    for (const row of ingredientRows) {
      if (!row.ingrediente_id) {
        alert('⚠️ Por favor selecciona un ingrediente para cada fila.');
        return;
      }

      // Duplicado dentro del mismo formulario
      if (selectedIdsInForm.has(row.ingrediente_id)) {
        const item = inventarioItems.find(i => i.id === row.ingrediente_id);
        alert(`⚠️ El ingrediente "${item?.nombre || 'seleccionado'}" está duplicado en el formulario. Agrupa la cantidad en una sola fila.`);
        return;
      }
      selectedIdsInForm.add(row.ingrediente_id);

      // Duplicado con respecto a lo que ya tiene la receta en BD
      if (dishMode === 'existing' && currentDishExistingIngIds.has(row.ingrediente_id)) {
        const item = inventarioItems.find(i => i.id === row.ingrediente_id);
        alert(`⚠️ El platillo ya tiene registrado el ingrediente "${item?.nombre || 'seleccionado'}".\n\nPara cambiar su cantidad, quítalo primero en la lista de abajo o selecciona otro ingrediente.`);
        return;
      }

      const cant = Number(row.cantidad_requerida);
      if (isNaN(cant) || cant <= 0) {
        alert('⚠️ Cada ingrediente debe tener una porción válida mayor a cero.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 3. Si es platillo nuevo, crearlo en la BD primero
      if (dishMode === 'new') {
        const price = newDishPrice.trim() === '' ? 0 : Number(newDishPrice);
        const { data: newDishData, error: newDishError } = await supabase
          .from('menu_items')
          .insert({
            negocio_id: ownerId,
            nombre: newDishName.trim(),
            precio: price,
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
    if (!confirm('¿Estás seguro de quitar este ingrediente de la receta?')) return;

    try {
      const { error } = await supabase
        .from('recetas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setRecetas(prev => prev.filter(r => r.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error al eliminar ingrediente de receta: ' + error.message);
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
      setRecetas(prev => prev.filter(r => r.menu_item_id !== menuItemId));
      alert(`✅ Receta de "${dishName}" eliminada por completo.`);
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error al eliminar receta completa: ' + error.message);
    }
  };

  // Agrupar recetas por platillo
  const groupedRecetas = useMemo(() => {
    return menuItems.map(menuItem => {
      const ingredientes = recetas.filter(r => r.menu_item_id === menuItem.id);
      return {
        ...menuItem,
        ingredientes,
        hasRecipe: ingredientes.length > 0
      };
    });
  }, [menuItems, recetas]);

  // Filtrado de recetas
  const filteredGrouped = useMemo(() => {
    return groupedRecetas.filter(dish => {
      const matchesSearch = dish.nombre.toLowerCase().includes(recipeSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === 'with_recipe') return dish.hasRecipe;
      if (filterMode === 'without_recipe') return !dish.hasRecipe;
      return true;
    });
  }, [groupedRecetas, recipeSearch, filterMode]);

  const dishesWithRecipeCount = groupedRecetas.filter(d => d.hasRecipe).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-blue-400 font-bold text-xl animate-pulse">Cargando arquitectura de recetas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <header className="mb-10 max-w-5xl border-b border-gray-800 pb-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Arquitectura de Recetas (Multi-Ingrediente)
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Asocia múltiples insumos a tus platillos para descontar existencias automáticamente en cada comanda cobrada en el POS.
            </p>
          </div>

          <div className="flex gap-3">
            <a 
              href="/admin" 
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all"
            >
              🍽️ Menú
            </a>
            <a 
              href="/admin/inventario" 
              className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all"
            >
              📦 Inventario
            </a>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-10 max-w-5xl">
        {/* Sección Formulario de Receta */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🍳</span> Configurar Receta por Lote
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Añade uno o múltiples ingredientes con sus porciones exactas.
              </p>
            </div>
            
            {/* Toggle Platillo Existente vs Nuevo */}
            <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700 text-xs">
              <button
                type="button"
                onClick={() => setDishMode('existing')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
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
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
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
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-bold text-gray-300">
                  Selecciona el Platillo del Menú *
                </label>
                <select 
                  value={selectedMenuItem} 
                  onChange={e => setSelectedMenuItem(e.target.value)}
                  className="w-full bg-gray-900 text-white border border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="">-- Elige un Platillo del Menú --</option>
                  {menuItems.map(item => {
                    const hasRec = recetas.some(r => r.menu_item_id === item.id);
                    return (
                      <option key={item.id} value={item.id}>
                        {item.nombre} {item.precio !== undefined ? `(₡${Number(item.precio).toLocaleString('es-CR')})` : ''} {hasRec ? '• [Con Receta]' : '• [Sin Receta]'}
                      </option>
                    );
                  })}
                </select>

                {/* Resumen del platillo seleccionado */}
                {selectedMenuItem && (
                  <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-700/80 text-xs flex items-center justify-between">
                    <span className="text-gray-300">
                      {currentDishExistingIngredients.length > 0 ? (
                        <>
                          Este platillo ya cuenta con <strong className="text-blue-400">{currentDishExistingIngredients.length}</strong> ingrediente(s) registrado(s). Los que agregues aquí se sumarán a su receta.
                        </>
                      ) : (
                        <span className="text-amber-400">
                          ⚠️ Este platillo aún no tiene ingredientes asignados.
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-900/60 p-5 rounded-2xl border border-gray-700">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-gray-300 mb-1.5">
                    Nombre del Nuevo Platillo *
                  </label>
                  <input
                    type="text"
                    value={newDishName}
                    onChange={e => setNewDishName(e.target.value)}
                    placeholder="Ej. Tacos al Pastor (Orden x3)"
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-gray-300 mb-1.5">
                    Precio de Venta (₡ Colones)
                  </label>
                  <input
                    type="number"
                    value={newDishPrice}
                    onChange={e => setNewDishPrice(e.target.value)}
                    placeholder="Ej. 3500"
                    min="0"
                    step="any"
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Lista Dinámica de Ingredientes */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Ingredientes Requeridos por Porción ({ingredientRows.length})
                </label>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-blue-300 hover:text-blue-200 px-3.5 py-1.5 rounded-xl border border-gray-600 font-bold transition-colors flex items-center gap-1.5 shadow-sm"
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
                      className="flex flex-wrap items-center gap-3 bg-gray-900/90 p-3.5 rounded-xl border border-gray-700 transition-all hover:border-gray-600"
                    >
                      <span className="text-gray-500 font-mono text-xs w-6 text-center font-bold">
                        #{index + 1}
                      </span>

                      {/* Selector de Ingrediente */}
                      <div className="flex-1 min-w-[220px]">
                        <select
                          value={row.ingrediente_id}
                          onChange={e => updateIngredientRow(row.id, 'ingrediente_id', e.target.value)}
                          className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">-- Seleccionar Ingrediente del Inventario --</option>
                          {inventarioItems.map(item => {
                            const isAlreadyInDish = dishMode === 'existing' && currentDishExistingIngIds.has(item.id);
                            return (
                              <option 
                                key={item.id} 
                                value={item.id}
                                disabled={isAlreadyInDish}
                              >
                                {item.nombre} ({item.unidad_medida}) {isAlreadyInDish ? '— [Ya en la receta]' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Cantidad requerida */}
                      <div className="w-32 flex items-center gap-2">
                        <input
                          type="number"
                          value={row.cantidad_requerida}
                          onChange={e => updateIngredientRow(row.id, 'cantidad_requerida', e.target.value)}
                          placeholder="Porción"
                          min="0.0001"
                          step="any"
                          className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                          required
                        />
                      </div>

                      {/* Unidad de medida */}
                      <span className="text-gray-400 text-xs font-mono font-bold w-16 truncate">
                        {unidadLabel}
                      </span>

                      {/* Botón eliminar fila */}
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(row.id)}
                        disabled={ingredientRows.length <= 1}
                        className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
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
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? 'Guardando Receta...' : 'Guardar Receta Completa'}
              </button>
            </div>
          </form>
        </section>

        {/* Sección Recetas Existentes */}
        <section className="bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-gray-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📋</span> Catálogo de Recetas ({dishesWithRecipeCount} de {menuItems.length} platillos)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Visualiza los insumos asignados y desvincula ingredientes o recetas completas.
              </p>
            </div>

            {/* Buscador de recetas */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
                placeholder="🔍 Buscar platillo..."
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtro por estado de receta */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              Todos ({menuItems.length})
            </button>
            <button
              onClick={() => setFilterMode('with_recipe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterMode === 'with_recipe'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              Con Receta ({dishesWithRecipeCount})
            </button>
            <button
              onClick={() => setFilterMode('without_recipe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterMode === 'without_recipe'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              Sin Receta ({menuItems.length - dishesWithRecipeCount})
            </button>
          </div>
          
          <div className="space-y-5">
            {filteredGrouped.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">
                No se encontraron platillos con los criterios seleccionados.
              </p>
            ) : (
              filteredGrouped.map(platillo => (
                <div key={platillo.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-700/80 transition-all hover:border-gray-600">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-blue-300">
                        {platillo.nombre}
                      </h3>
                      {platillo.precio !== undefined && (
                        <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          ₡{Number(platillo.precio).toLocaleString('es-CR')}
                        </span>
                      )}
                      {!platillo.hasRecipe && (
                        <span className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
                          ⚠️ Sin ingredientes configurados
                        </span>
                      )}
                    </div>

                    {platillo.hasRecipe ? (
                      <button
                        onClick={() => deleteCompleteRecipe(platillo.id, platillo.nombre)}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg transition-colors font-semibold self-start sm:self-auto"
                        title="Eliminar todos los ingredientes de este platillo"
                      >
                        Eliminar Receta Completa
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDishMode('existing');
                          setSelectedMenuItem(platillo.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors font-semibold self-start sm:self-auto"
                      >
                        + Configurar Insumos
                      </button>
                    )}
                  </div>

                  {platillo.hasRecipe && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {platillo.ingredientes.map(receta => {
                        const invItem = Array.isArray(receta.inventario_items)
                          ? receta.inventario_items[0]
                          : receta.inventario_items;
                        const nombreIng = invItem?.nombre || invItem?.nombre_ingrediente || 'Ingrediente';
                        const unidadMed = invItem?.unidad_medida || '';

                        return (
                          <li
                            key={receta.id}
                            className="flex justify-between items-center bg-gray-800/80 px-3.5 py-2.5 rounded-xl border border-gray-700/60 text-xs"
                          >
                            <span className="text-gray-300">
                              <span className="font-bold text-white text-sm">{receta.cantidad_requerida} {unidadMed}</span> de {nombreIng}
                            </span>
                            <button 
                              onClick={() => deleteReceta(receta.id)}
                              className="text-red-400 hover:text-red-300 font-bold hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                              title="Quitar este ingrediente"
                            >
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
