'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { playOrderBell, playOrderReadySound } from '@/lib/soundEffects';

type ComandaItem = {
  id?: string;
  menu_item_id?: string;
  nombre: string;
  notas?: string;
  cantidad: number;
};

type Comanda = {
  id: string;
  mesa: string;
  items: ComandaItem[];
  tiempo: number; // en minutos
  created_at: string;
};

export default function CocinaKDS() {
  const { ownerId } = useAppContext();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [dispatchingIds, setDispatchingIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const particlesContainerRef = useRef<HTMLDivElement>(null);
  const particleTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const isInitialLoad = useRef(true);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Generador de partículas optimizado (sin layout thrashing ni fugas de memoria)
  const createExplosion = (x: number, y: number) => {
    const container = particlesContainerRef.current || document.body;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#ff0055'];

    for (let i = 0; i < 40; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 12 + 6;
      const color = colors[Math.floor(Math.random() * colors.length)];

      Object.assign(particle.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        pointerEvents: 'none',
        zIndex: '9999',
        boxShadow: `0 0 ${Math.random() * 10 + 5}px ${color}`,
        transform: 'translate(0px, 0px) scale(1)',
        opacity: '1',
        transition: 'transform 0.6s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.6s ease-out'
      });

      container.appendChild(particle);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 80 + Math.random() * 200;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      const rot = Math.random() * 360;

      // requestAnimationFrame evita las 40 llamadas sincrónicas a getBoundingClientRect (layout thrashing)
      requestAnimationFrame(() => {
        particle.style.transform = `translate(${tx}px, ${ty}px) scale(0) rotate(${rot}deg)`;
        particle.style.opacity = '0';
      });

      const timeoutId = setTimeout(() => {
        particle.remove();
        particleTimeoutsRef.current.delete(timeoutId);
      }, 620);

      particleTimeoutsRef.current.add(timeoutId);
    }
  };

  // Deducción asíncrona de insumos de recetas (100% no bloqueante, cero cuellos de botella)
  const descontarRecetasInventario = async (items: ComandaItem[], currentOwnerId?: string | null) => {
    try {
      const itemsConMenu = items.filter(it => it.menu_item_id && it.cantidad > 0);
      if (itemsConMenu.length === 0) return;

      const menuItemIds = Array.from(new Set(itemsConMenu.map(it => it.menu_item_id!)));

      // Consultar recetas para los platillos de la comanda
      const { data: recetasData, error: recetasError } = await supabase
        .from('recetas')
        .select('menu_item_id, ingrediente_id, cantidad_requerida')
        .in('menu_item_id', menuItemIds);

      if (recetasError || !recetasData || recetasData.length === 0) return;

      // Agrupar y totalizar los insumos necesarios para no hacer peticiones redundantes
      const insumosAReducir: Record<string, number> = {};
      for (const item of itemsConMenu) {
        const recetasPlatillo = recetasData.filter(r => r.menu_item_id === item.menu_item_id);
        for (const rec of recetasPlatillo) {
          if (rec.ingrediente_id && rec.cantidad_requerida > 0) {
            const gastoTotal = Number(rec.cantidad_requerida) * item.cantidad;
            insumosAReducir[rec.ingrediente_id] = (insumosAReducir[rec.ingrediente_id] || 0) + gastoTotal;
          }
        }
      }

      const ingredienteIds = Object.keys(insumosAReducir);
      if (ingredienteIds.length === 0) return;

      // Consultar existencias de los ingredientes
      let invQuery = supabase
        .from('inventario_items')
        .select('id, cantidad_disponible')
        .in('id', ingredienteIds);

      if (currentOwnerId) {
        invQuery = invQuery.eq('negocio_id', currentOwnerId);
      }

      const { data: invData, error: invError } = await invQuery;
      if (invError || !invData || invData.length === 0) return;

      // Actualizar existencias en paralelo sin frenar la cocina
      await Promise.allSettled(
        invData.map(invItem => {
          const descontar = insumosAReducir[invItem.id] || 0;
          const actual = Number(invItem.cantidad_disponible || 0);
          const nuevaCantidad = Math.max(0, actual - descontar);
          return supabase
            .from('inventario_items')
            .update({ cantidad_disponible: nuevaCantidad })
            .eq('id', invItem.id);
        })
      );
    } catch (err) {
      console.warn('⚠️ KDS: Aviso en inventario de recetas (no crítico):', err);
    }
  };

  const fetchComandas = useCallback(async (isNewEvent = false) => {
    // Evitar solicitudes concurrentes solapadas
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      let query = supabase
        .from('comandas')
        .select('id, mesa, estado, created_at, negocio_id, comandas_items(id, cantidad, menu_item_id, menu_items(nombre))')
        .eq('estado', 'pendiente');

      // Filtrado estricto por negocio multi-tenant
      if (ownerId) {
        query = query.eq('negocio_id', ownerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!isMountedRef.current) return;

      if (data) {
        const now = new Date().getTime();
        type RawComandaItem = {
          id?: string;
          cantidad?: number | null;
          notas?: string | null;
          menu_item_id?: string | null;
          nombre?: string | null;
          menu_items?: { nombre?: string | null } | { nombre?: string | null }[] | null;
        };
        type ComandaData = {
          id: string;
          mesa?: string | null;
          comandas_items?: RawComandaItem[] | null;
          created_at?: string | null;
        };

        const formatted: Comanda[] = (data as unknown as ComandaData[]).map(d => ({
          id: d.id,
          mesa: d.mesa?.trim() || 'Mesa Sin Asignar',
          items: (Array.isArray(d.comandas_items) ? d.comandas_items : []).map(item => {
            let dishName = '';
            if (item.nombre && typeof item.nombre === 'string' && item.nombre.trim()) {
              dishName = item.nombre.trim();
            } else if (item.menu_items) {
              if (Array.isArray(item.menu_items)) {
                dishName = item.menu_items[0]?.nombre?.trim() || '';
              } else if (typeof item.menu_items === 'object' && item.menu_items.nombre) {
                dishName = item.menu_items.nombre.trim();
              }
            }

            // Si el platillo fue eliminado de menu_items previamente, no arrojar null ni crashear
            if (!dishName) {
              dishName = item.menu_item_id 
                ? `Platillo (#${item.menu_item_id.slice(0, 6)})` 
                : 'Platillo (No catalogado)';
            }

            const cantidad = typeof item.cantidad === 'number' && item.cantidad > 0 ? item.cantidad : 1;

            return {
              id: item.id,
              menu_item_id: item.menu_item_id || undefined,
              nombre: dishName,
              notas: item.notas?.trim() || undefined,
              cantidad
            };
          }),
          created_at: d.created_at || new Date().toISOString(),
          tiempo: Math.floor((now - new Date(d.created_at || now).getTime()) / 60000)
        }));

        // Timbre sonoro si hay comandas nuevas tras la carga inicial
        if (!isInitialLoad.current) {
          const hasNew = formatted.some(c => !knownIdsRef.current.has(c.id));
          if (hasNew || isNewEvent) {
            playOrderBell();
          }
        } else {
          isInitialLoad.current = false;
        }

        knownIdsRef.current = new Set(formatted.map(c => c.id));
        setComandas(formatted);
        setErrorStatus(null);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching comandas:', error);
      if (isMountedRef.current) {
        setErrorStatus(`⚠️ Error cargando comandas: ${error.message || 'Desconocido'}`);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [ownerId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchComandas();

    // Actualizar tiempo transcurrido cada minuto
    const interval = setInterval(() => {
      if (!isMountedRef.current) return;
      setComandas(prev => prev.map(c => ({
        ...c,
        tiempo: Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / 60000)
      })));
    }, 60000);

    // Sondeo de respaldo prudente (cada 6 segundos) para no saturar REST mientras Realtime está activo
    const pollInterval = setInterval(() => {
      if (isMountedRef.current) {
        fetchComandas();
      }
    }, 6000);

    // Canal con scope del negocio para evitar interferencias y colisiones
    const channelTopic = ownerId ? `comandas_live_kds_${ownerId}` : 'comandas_live_kds_global';
    const subscription = supabase
      .channel(channelTopic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comandas',
          ...(ownerId ? { filter: `negocio_id=eq.${ownerId}` } : {})
        },
        (payload) => {
          const newRow = payload.new as { negocio_id?: string; estado?: string } | undefined;
          const oldRow = payload.old as { negocio_id?: string } | undefined;

          // Doble verificación en cliente para total aislamiento multi-tenant
          if (ownerId) {
            if (newRow?.negocio_id && newRow.negocio_id !== ownerId) return;
            if (oldRow?.negocio_id && oldRow.negocio_id !== ownerId) return;
          }

          const isInsert = payload.eventType === 'INSERT';
          if (isInsert && (!newRow?.estado || newRow.estado === 'pendiente')) {
            playOrderBell();
          }
          fetchComandas(isInsert);
        }
      )
      .subscribe((status, err) => {
        if (!isMountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Conectado al canal de comandas (${channelTopic})`);
          setErrorStatus(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en el canal de Supabase Realtime', err);
          setErrorStatus('⚠️ Error de conexión en tiempo real. Sondeo de respaldo activado.');
        } else if (status === 'TIMED_OUT') {
          setErrorStatus('⚠️ Tiempo de espera agotado al conectar al servidor en tiempo real.');
        }
      });

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      clearInterval(pollInterval);
      supabase.removeChannel(subscription);

      // Limpieza exhaustiva de timers y partículas para erradicar fugas de memoria
      particleTimeoutsRef.current.forEach(t => clearTimeout(t));
      particleTimeoutsRef.current.clear();
      if (particlesContainerRef.current) {
        particlesContainerRef.current.innerHTML = '';
      }
    };
  }, [ownerId, fetchComandas]);

  const despacharFuego = async (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    // Evitar despachos dobles accidentales
    if (dispatchingIds.has(id)) return;
    setDispatchingIds(prev => new Set(prev).add(id));

    // Sonido triunfal de comanda despachada / lista para servir
    playOrderReadySound();

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    createExplosion(x, y);

    // Animación de salida de la tarjeta
    const card = document.getElementById(`comanda-${id}`);
    if (card) {
      card.style.transform = 'scale(0.8) translateY(50px)';
      card.style.opacity = '0';
      card.style.transition = 'all 0.3s ease-in';
    }

    const comandaToDispatch = comandas.find(c => c.id === id);

    try {
      // 1. Actualizar estado en base de datos
      let updateQuery = supabase
        .from('comandas')
        .update({ estado: 'completado' })
        .eq('id', id);

      if (ownerId) {
        updateQuery = updateQuery.eq('negocio_id', ownerId);
      }

      const { error: updateError } = await updateQuery;
      if (updateError) throw updateError;

      // 2. Descontar recetas e inventario en segundo plano (cero cuellos de botella)
      if (comandaToDispatch?.items && comandaToDispatch.items.length > 0) {
        descontarRecetasInventario(comandaToDispatch.items, ownerId);
      }

      // 3. Remover comanda de la pantalla
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setComandas(prev => prev.filter(c => c.id !== id));
        setDispatchingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al despachar comanda:', error);
      if (isMountedRef.current) {
        setErrorStatus(`⚠️ No se pudo despachar la comanda: ${error.message || 'Error de red'}`);
        if (card) {
          card.style.transform = 'none';
          card.style.opacity = '1';
        }
        setDispatchingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-mono text-zinc-100 selection:bg-orange-500 overflow-x-hidden relative">
      {/* Contenedor dedicado de partículas (evita contaminar document.body y previene memory leaks) */}
      <div ref={particlesContainerRef} className="pointer-events-none fixed inset-0 z-50 overflow-hidden" />

      {/* Indicador para desbloquear el audio si el navegador bloquea la reproducción automática */}
      {!hasInteracted && (
        <div 
          onClick={() => {
            playOrderBell();
            setHasInteracted(true);
          }}
          className="mb-6 p-4 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl border-2 border-amber-400 text-white font-bold flex items-center justify-between shadow-xl cursor-pointer hover:scale-[1.01] transition-transform animate-pulse"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛎️</span>
            <div>
              <div className="text-base uppercase tracking-wider">¡Activar Sonido de Cocina!</div>
              <div className="text-xs text-amber-100 font-normal">Los navegadores bloquean el sonido hasta que tocas la pantalla una vez. Haz clic aquí para activar el timbre automático.</div>
            </div>
          </div>
          <span className="px-4 py-2 bg-black/40 rounded-xl text-xs uppercase font-black border border-white/30">
            ACTIVAR AHORA
          </span>
        </div>
      )}

      {/* Alerta visual en caso de error de conexión o base de datos */}
      {errorStatus && (
        <div className="mb-4 p-4 bg-red-900 border-2 border-red-500 text-white font-bold rounded shadow-lg animate-pulse">
          {errorStatus}
        </div>
      )}
      
      <div className="mb-8 border-b-4 border-orange-500 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
            ☢️ COMMAND CENTER KDS
          </h1>
          <p className="text-orange-400 font-bold mt-2 text-xl tracking-widest uppercase">
            ¡ZONA DE GUERRA CULINARIA! NO HAY PIEDAD.
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <button
            onClick={() => playOrderBell()}
            className="px-3 py-1 bg-orange-950/80 hover:bg-orange-900 border border-orange-500/40 text-orange-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105"
            title="Probar sonido de campana de pedidos"
          >
            <span>🛎️</span>
            <span>PROBAR TIMBRE</span>
          </button>
          <div>
            <div className="text-sm text-zinc-500 font-bold">ÓRDENES ACTIVAS</div>
            <div className="text-6xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
              {comandas.length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" ref={containerRef}>
        {comandas.map(comanda => {
          const isBusy = dispatchingIds.has(comanda.id);
          return (
            <div 
              key={comanda.id} 
              id={`comanda-${comanda.id}`}
              className={`
                relative flex flex-col bg-zinc-900 border-2 rounded-xl overflow-hidden shadow-2xl transition-all
                ${comanda.tiempo > 10 ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse' : 'border-zinc-700 shadow-orange-900/20 hover:border-orange-500'}
              `}
            >
              {/* Header de la Tarjeta */}
              <div className={`
                p-4 flex justify-between items-center border-b-2
                ${comanda.tiempo > 10 ? 'bg-red-600 border-red-800 text-white' : 'bg-zinc-800 border-zinc-950 text-orange-400'}
              `}>
                <h2 className="text-3xl font-black uppercase tracking-tight">{comanda.mesa}</h2>
                <div className="text-right">
                  <span className="text-xs uppercase font-bold opacity-80 block">Tiempo</span>
                  <span className="text-2xl font-black">
                    {comanda.tiempo} <span className="text-sm">MIN</span>
                  </span>
                </div>
              </div>

              {/* Contenido/Items */}
              <div className="p-5 flex-1 bg-zinc-900/50">
                <ul className="space-y-4">
                  {comanda.items.map((item, i) => (
                    <li key={i} className="border-l-4 border-orange-500 pl-3">
                      <div className="text-xl font-bold text-zinc-100">
                        {item.cantidad ? `${item.cantidad}x ` : ''}{item.nombre}
                      </div>
                      {item.notas && (
                        <div className="text-red-400 text-sm font-bold mt-1 uppercase bg-red-950/40 inline-block px-2 py-1 rounded">
                          ⚠️ {item.notas}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botón de Acción */}
              <div className="p-4 bg-zinc-950 border-t-2 border-zinc-800">
                <button 
                  onClick={(e) => despacharFuego(e, comanda.id)}
                  disabled={isBusy}
                  className={`
                    w-full py-4 rounded bg-gradient-to-r from-orange-600 to-red-600 
                    text-white text-2xl font-black uppercase tracking-widest
                    hover:from-red-500 hover:to-orange-500 hover:scale-[1.02] 
                    active:scale-95 transition-all
                    shadow-[0_0_15px_rgba(239,68,68,0.6)]
                    ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {isBusy ? 'DESPACHANDO...' : '🔥 ¡FUEGO! 🔥'}
                </button>
              </div>
            </div>
          );
        })}

        {comandas.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-600 flex flex-col items-center justify-center">
            <span className="text-6xl mb-4">🧊</span>
            <h2 className="text-3xl font-black uppercase tracking-widest">Cocina al día</h2>
            <p className="text-xl mt-2">No hay pedidos pendientes por preparar</p>
          </div>
        )}
      </div>

    </div>
  );
}
