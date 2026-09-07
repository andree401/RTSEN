'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';

export type InventarioItem = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad_medida: string;
};

// Conversión canónica entre unidades de medida compatibles (masa y volumen)
export const UNIT_CANONICAL: Record<string, { base: string; factor: number }> = {
  // Masa (base: g)
  'kg': { base: 'g', factor: 1000 },
  'kilo': { base: 'g', factor: 1000 },
  'kilos': { base: 'g', factor: 1000 },
  'kilogramo': { base: 'g', factor: 1000 },
  'kilogramos': { base: 'g', factor: 1000 },
  'g': { base: 'g', factor: 1 },
  'gr': { base: 'g', factor: 1 },
  'gramo': { base: 'g', factor: 1 },
  'gramos': { base: 'g', factor: 1 },
  'mg': { base: 'g', factor: 0.001 },
  'oz': { base: 'g', factor: 28.3495 },
  'lb': { base: 'g', factor: 453.592 },
  'libra': { base: 'g', factor: 453.592 },
  'libras': { base: 'g', factor: 453.592 },

  // Volumen (base: ml)
  'l': { base: 'ml', factor: 1000 },
  'lt': { base: 'ml', factor: 1000 },
  'lts': { base: 'ml', factor: 1000 },
  'litro': { base: 'ml', factor: 1000 },
  'litros': { base: 'ml', factor: 1000 },
  'ml': { base: 'ml', factor: 1 },
  'mililitro': { base: 'ml', factor: 1 },
  'mililitros': { base: 'ml', factor: 1 },
  'cc': { base: 'ml', factor: 1 },
  'fl oz': { base: 'ml', factor: 29.5735 },

  // Conteo / Unidades discretas (base: pz)
  'pz': { base: 'pz', factor: 1 },
  'pza': { base: 'pz', factor: 1 },
  'pzas': { base: 'pz', factor: 1 },
  'pieza': { base: 'pz', factor: 1 },
  'piezas': { base: 'pz', factor: 1 },
  'unidad': { base: 'pz', factor: 1 },
  'unidades': { base: 'pz', factor: 1 },
  'ud': { base: 'pz', factor: 1 },
  'uds': { base: 'pz', factor: 1 },
};

export const COMMON_UNITS = ['kg', 'g', 'l', 'ml', 'pz', 'unidad', 'oz'];

export function tryConvertUnits(qty: number, fromUnit: string, toUnit: string): number | null {
  const f = fromUnit.trim().toLowerCase();
  const t = toUnit.trim().toLowerCase();
  if (f === t) return qty;
  const cFrom = UNIT_CANONICAL[f];
  const cTo = UNIT_CANONICAL[t];
  if (!cFrom || !cTo || cFrom.base !== cTo.base) return null;
  // Convertir primero a base, luego a destino
  const inBase = qty * cFrom.factor;
  const inDest = inBase / cTo.factor;
  return Math.round(inDest * 10000) / 10000;
}

// Estimaciones culinarias estándar de peso por pieza (en gramos) para insumos comunes
export const PIECE_WEIGHT_ESTIMATES: Record<string, number> = {
  'tomate': 120,
  'tomates': 120,
  'jitomate': 120,
  'jitomates': 120,
  'cebolla': 150,
  'cebollas': 150,
  'papa': 180,
  'papas': 180,
  'limon': 60,
  'limones': 60,
  'aguacate': 180,
  'aguacates': 180,
  'huevo': 55,
  'huevos': 55,
  'zanahoria': 100,
  'zanahorias': 100,
  'manzana': 150,
  'manzanas': 150,
  'naranja': 180,
  'naranjas': 180,
  'platano': 150,
  'platanos': 150,
  'pepino': 250,
  'pepinos': 250,
  'chile': 30,
  'chiles': 30,
  'pimiento': 150,
  'pimientos': 150,
  'diente de ajo': 5,
  'ajo': 50,
};

// Obtiene el peso estimado por pieza (en gramos) para un insumo (default: 100g)
export function getEstimatedGramsPerPiece(ingredientName: string): number {
  const norm = ingredientName.trim().toLowerCase();
  for (const [key, grams] of Object.entries(PIECE_WEIGHT_ESTIMATES)) {
    if (norm.includes(key)) {
      return grams;
    }
  }
  return 100; // 100g estándar por pieza si no está en la tabla
}

// Convierte entre unidades discretas (pz/unidad) y masa (kg/g) basándose en peso por pieza
export function convertPieceAndMass(
  qty: number,
  fromUnit: string,
  toUnit: string,
  ingredientName: string
): number | null {
  const f = fromUnit.trim().toLowerCase();
  const t = toUnit.trim().toLowerCase();
  const cFrom = UNIT_CANONICAL[f];
  const cTo = UNIT_CANONICAL[t];
  if (!cFrom || !cTo) return null;

  const gramsPerPiece = getEstimatedGramsPerPiece(ingredientName);

  // De pieza a masa (ej. 5 pz -> kg)
  if (cFrom.base === 'pz' && cTo.base === 'g') {
    const totalGrams = qty * gramsPerPiece;
    const inDest = totalGrams / cTo.factor;
    return Math.round(inDest * 10000) / 10000;
  }

  // De masa a pieza (ej. 3 kg -> pz)
  if (cFrom.base === 'g' && cTo.base === 'pz') {
    const totalGrams = qty * cFrom.factor;
    const pieces = totalGrams / gramsPerPiece;
    return Math.round(pieces * 10) / 10;
  }

  return null;
}

export type HandleItemMatchResult = 
  | { type: 'exact'; existingItem: InventarioItem; nuevaCantidadTotal: number }
  | { type: 'convertible'; existingItem: InventarioItem; convertedQty: number; nuevaCantidadTotal: number; note?: string }
  | { type: 'brand_new' };

export function resolveInventoryAddition(
  items: InventarioItem[],
  trimmedName: string,
  trimmedUnidad: string,
  cantidad: number
): HandleItemMatchResult {
  const sameNameItems = items.filter(
    i => i.nombre.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (sameNameItems.length === 0) {
    return { type: 'brand_new' };
  }

  // 1. Caso: Coincidencia EXACTA de unidad
  const exactMatch = sameNameItems.find(
    i => i.unidad_medida.trim().toLowerCase() === trimmedUnidad.toLowerCase()
  );

  if (exactMatch) {
    const nuevaCantidadTotal = Math.round((exactMatch.cantidad + cantidad) * 10000) / 10000;
    return { type: 'exact', existingItem: exactMatch, nuevaCantidadTotal };
  }

  // 2. Caso: Unidades canónicas compatibles (ej. kg <-> g, l <-> ml)
  for (const item of sameNameItems) {
    const converted = tryConvertUnits(cantidad, trimmedUnidad, item.unidad_medida);
    if (converted !== null) {
      const nuevaCantidadTotal = Math.round((item.cantidad + converted) * 10000) / 10000;
      return { type: 'convertible', existingItem: item, convertedQty: converted, nuevaCantidadTotal };
    }
  }

  // 3. Caso Opción 1: Conversión masa <-> piezas mediante peso por pieza (ej. 3 kg existentes y agregan 5 pz)
  for (const item of sameNameItems) {
    const pieceConverted = convertPieceAndMass(cantidad, trimmedUnidad, item.unidad_medida, trimmedName);
    if (pieceConverted !== null) {
      const nuevaCantidadTotal = Math.round((item.cantidad + pieceConverted) * 10000) / 10000;
      const gPerPiece = getEstimatedGramsPerPiece(trimmedName);
      return { 
        type: 'convertible', 
        existingItem: item, 
        convertedQty: pieceConverted, 
        nuevaCantidadTotal,
        note: `(Equivalencia estimada: 1 pz ≈ ${gPerPiece}g)`
      };
    }
  }

  // 4. Si la unidad es completamente ajena (ej. litros a kilos sin densidad), acumular en el primer registro
  const targetItem = sameNameItems[0];
  const nuevaCantidadTotal = Math.round((targetItem.cantidad + cantidad) * 10000) / 10000;
  return { 
    type: 'convertible', 
    existingItem: targetItem, 
    convertedQty: cantidad, 
    nuevaCantidadTotal,
    note: `(Se unificó en ${targetItem.unidad_medida})`
  };
}

export default function InventarioPanel() {
  const { ownerId, activeRole } = useAppContext();

  // Protección de Estación: Solo admin y owner pueden alterar inventario
  if (activeRole !== 'admin' && activeRole !== 'owner') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 text-3xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            ⛔
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Acceso Administrativo Restringido</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Tu estación actual ({activeRole ? activeRole.toUpperCase() : 'NO AUTORIZADA'}) no tiene permisos para modificar las existencias del inventario.
          </p>
          <Link
            href={activeRole === 'cajero' ? '/restaurante' : activeRole === 'cocina' ? '/cocina' : '/login'}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-block"
          >
            Volver a mi Estación
          </Link>
        </div>
      </div>
    );
  }
  
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [newName, setNewName] = useState('');
  const [newCantidad, setNewCantidad] = useState('');
  const [newUnidad, setNewUnidad] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCantidad, setEditCantidad] = useState('');
  const [editUnidad, setEditUnidad] = useState('');

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
      const sorted = ((data as InventarioItem[]) || []).sort((a, b) => {
        const comp = a.nombre.trim().localeCompare(b.nombre.trim(), undefined, { sensitivity: 'base' });
        return comp !== 0 ? comp : a.unidad_medida.trim().localeCompare(b.unidad_medida.trim(), undefined, { sensitivity: 'base' });
      });
      setItems(sorted);
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

    // Opción 2: Gestión de presentaciones múltiples y unidades compatibles
    const matchResult = resolveInventoryAddition(items, trimmedName, trimmedUnidad, cantidad);

    // 1. Caso: Misma unidad exacta -> acumular directo
    if (matchResult.type === 'exact') {
      const { existingItem, nuevaCantidadTotal } = matchResult;
      try {
        const { error } = await supabase
          .from('inventario_items')
          .update({ cantidad_disponible: nuevaCantidadTotal })
          .eq('id', existingItem.id)
          .eq('negocio_id', ownerId);

        if (error) throw error;

        setItems(prev => prev.map(item => item.id === existingItem.id ? { ...item, cantidad: nuevaCantidadTotal } : item));
        setNewName('');
        setNewCantidad('');
        setNewUnidad('');
        alert(`✅ ¡Stock acumulado con éxito! Se sumaron ${cantidad} ${trimmedUnidad} a "${existingItem.nombre}". Total ahora: ${nuevaCantidadTotal} ${existingItem.unidad_medida}.`);
        return;
      } catch (err: unknown) {
        const error = err as Error;
        alert('Error al acumular stock: ' + error.message);
        return;
      }
    }

    // 2. Caso: Unidades compatibles convertibles (ej. kg <-> g, l <-> ml) -> convertir y acumular
    if (matchResult.type === 'convertible') {
      const { existingItem, convertedQty, nuevaCantidadTotal } = matchResult;
      try {
        const { error } = await supabase
          .from('inventario_items')
          .update({ cantidad_disponible: nuevaCantidadTotal })
          .eq('id', existingItem.id)
          .eq('negocio_id', ownerId);

        if (error) throw error;

        setItems(prev => prev.map(item => item.id === existingItem.id ? { ...item, cantidad: nuevaCantidadTotal } : item));
        setNewName('');
        setNewCantidad('');
        setNewUnidad('');
        const noteText = matchResult.note ? ` ${matchResult.note}` : '';
        alert(`✅ ¡Conversión y suma automática! Se convirtieron ${cantidad} ${trimmedUnidad} a ${convertedQty} ${existingItem.unidad_medida}${noteText} y se sumaron a "${existingItem.nombre}". Total ahora: ${nuevaCantidadTotal} ${existingItem.unidad_medida}.`);
        return;
      } catch (err: unknown) {
        const error = err as Error;
        alert('Error al acumular stock convertido: ' + error.message);
        return;
      }
    }

    // 3. Caso: Unidades distintas e incompatibles ('new_presentation') o ingrediente nuevo ('brand_new')
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
        const newItem = data as InventarioItem;
        setItems(prev => [...prev, newItem].sort((a, b) => {
          const comp = a.nombre.trim().localeCompare(b.nombre.trim(), undefined, { sensitivity: 'base' });
          return comp !== 0 ? comp : a.unidad_medida.trim().localeCompare(b.unidad_medida.trim(), undefined, { sensitivity: 'base' });
        }));
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
    setEditUnidad(item.unidad_medida);
  };

  const saveEdit = async () => {
    if (!ownerId || !editingId) return;

    if (editCantidad.trim() === '') {
      alert('⚠️ Por favor ingresa un número de existencias (puede ser 0).');
      return;
    }
    if (editUnidad.trim() === '') {
      alert('⚠️ Por favor ingresa la unidad de medida.');
      return;
    }

    const cantidad = Number(editCantidad);
    if (isNaN(cantidad) || cantidad < 0) {
      alert('⚠️ La cantidad debe ser un número mayor o igual a 0.');
      return;
    }
    const cleanUnidad = editUnidad.trim();

    try {
      const { error } = await supabase
        .from('inventario_items')
        .update({ 
          cantidad_disponible: cantidad,
          unidad_medida: cleanUnidad
        })
        .eq('id', editingId)
        .eq('negocio_id', ownerId);

      if (error) throw error;
      
      setItems(prev => prev.map(item => item.id === editingId ? { ...item, cantidad, unidad_medida: cleanUnidad } : item));
      setEditingId(null);
    } catch (err: unknown) {
      const error = err as Error;
      alert('Error al actualizar inventario: ' + error.message);
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
                          {items.filter(i => i.nombre.trim().toLowerCase() === item.nombre.trim().toLowerCase()).length > 1 && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-violet-950/80 text-violet-300 border border-violet-700/60 shadow-sm" title="Ingrediente con múltiples unidades/presentaciones registradas">
                              Pres: {item.unidad_medida}
                            </span>
                          )}
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
                            {/* Visualización de Doble Medida (Opción 1) */}
                            {UNIT_CANONICAL[item.unidad_medida.trim().toLowerCase()]?.base === 'g' && item.cantidad > 0 && (
                              <span className="text-[11px] font-mono text-violet-400 font-semibold" title="Equivalencia estimada por peso promedio">
                                ≈ {Math.round((item.cantidad * (UNIT_CANONICAL[item.unidad_medida.trim().toLowerCase()]?.factor || 1)) / getEstimatedGramsPerPiece(item.nombre) * 10) / 10} pz
                              </span>
                            )}
                            {UNIT_CANONICAL[item.unidad_medida.trim().toLowerCase()]?.base === 'pz' && item.cantidad > 0 && (
                              <span className="text-[11px] font-mono text-violet-400 font-semibold" title="Peso estimado según promedio por pieza">
                                ≈ {Math.round(((item.cantidad * getEstimatedGramsPerPiece(item.nombre)) / 1000) * 100) / 100} kg
                              </span>
                            )}
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
                        {editingId === item.id ? (
                          <input 
                            type="text" 
                            list="unidades-list"
                            value={editUnidad}
                            onChange={e => setEditUnidad(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="bg-[#0d0d0d] border border-violet-500 rounded-lg p-1.5 w-20 text-center text-white focus:outline-none focus:ring-1 focus:ring-violet-400 font-bold text-xs"
                            placeholder="kg, g, pz"
                          />
                        ) : (
                          item.unidad_medida
                        )}
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
