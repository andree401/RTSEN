'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import { playOrderBell, playOrderReadySound } from '@/lib/soundEffects';

type Comanda = {
  id: string;
  mesa: string;
  items: { nombre: string; notas?: string; cantidad?: number }[];
  tiempo: number; // en minutos
  created_at: string;
};

const createExplosion = (x: number, y: number) => {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#ff0055'];
  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    document.body.appendChild(particle);
    
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
      transition: 'transform 0.6s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.6s ease-out'
    });

    // Forzar reflow
    particle.getBoundingClientRect();

    const angle = Math.random() * Math.PI * 2;
    const velocity = 80 + Math.random() * 200;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    const rot = Math.random() * 360;

    particle.style.transform = `translate(${tx}px, ${ty}px) scale(0) rotate(${rot}deg)`;
    particle.style.opacity = '0';

    setTimeout(() => particle.remove(), 600);
  }
};

export default function CocinaKDS() {
  const { ownerId } = useAppContext();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  // PARCHE: Añadido estado para manejar errores en la KDS
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInitialLoad = useRef(true);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const fetchComandas = async (isNewEvent = false) => {
    try {
      let query = supabase
        .from('comandas')
        .select('id, mesa, estado, created_at, negocio_id, comandas_items(id, cantidad, menu_item_id, menu_items(nombre))')
        .eq('estado', 'pendiente');

      // Blindaje multi-tenant: si hay un negocio autenticado, filtramos solo sus comandas
      if (ownerId) {
        query = query.eq('negocio_id', ownerId);
      }

      const { data, error } = await query;
        
      if (error) throw error;
      
      if (data) {
        const now = new Date().getTime();
        type RawComandaItem = {
          id: string;
          cantidad?: number;
          notas?: string;
          menu_item_id?: string;
          nombre?: string;
          menu_items?: { nombre: string } | { nombre: string }[] | null;
        };
        type ComandaData = {
          id: string;
          mesa: string;
          comandas_items: RawComandaItem[];
          created_at: string;
        };
        const formatted = (data as unknown as ComandaData[]).map(d => ({
          id: d.id,
          mesa: d.mesa,
          items: (d.comandas_items || []).map(item => {
            let dishName = item.nombre;
            if (!dishName && item.menu_items) {
              if (Array.isArray(item.menu_items)) {
                dishName = item.menu_items[0]?.nombre;
              } else {
                dishName = item.menu_items.nombre;
              }
            }
            return {
              nombre: dishName || 'Platillo',
              notas: item.notas,
              cantidad: item.cantidad
            };
          }),
          created_at: d.created_at || new Date().toISOString(),
          tiempo: Math.floor((now - new Date(d.created_at || now).getTime()) / 60000)
        }));

        // Detectar si hay comandas nuevas tras la carga inicial
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
      setErrorStatus(`⚠️ Error cargando comandas: ${error.message || 'Desconocido'}`);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComandas();
    
    const interval = setInterval(() => {
      setComandas(prev => prev.map(c => ({
        ...c,
        tiempo: Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / 60000)
      })));
    }, 60000); // Update time every minute
    
    // Polling rápido de respaldo (cada 3 segundos) para garantizar que si Supabase Realtime tarda o se reconecta, la orden suene de inmediato
    const pollInterval = setInterval(() => {
      fetchComandas();
    }, 3000);

    // Suscripción en tiempo real a Supabase
    const subscription = supabase
      .channel('comandas_live_kds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, (payload) => {
        const isInsert = payload.eventType === 'INSERT';
        if (isInsert) {
          playOrderBell();
        }
        fetchComandas(isInsert);
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado al canal de comandas');
          setErrorStatus(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en el canal de Supabase', err);
          setErrorStatus('⚠️ Error de conexión en tiempo real. Se activó el sondeo automático cada 3 segundos.');
        } else if (status === 'TIMED_OUT') {
          setErrorStatus('⚠️ Tiempo de espera agotado al conectar al servidor.');
        }
      });
      
    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
      supabase.removeChannel(subscription);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const despacharFuego = async (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    // Reproducir sonido triunfal de comanda despachada / lista para servir
    playOrderReadySound();

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    createExplosion(x, y);

    // Animamos la salida de la tarjeta
    const card = document.getElementById(`comanda-${id}`);
    if (card) {
      card.style.transform = 'scale(0.8) translateY(50px)';
      card.style.opacity = '0';
      card.style.transition = 'all 0.3s ease-in';
    }

    // Actualizar base de datos
    await supabase
      .from('comandas')
      .update({ estado: 'completado' })
      .eq('id', id);

    setTimeout(() => {
      setComandas(prev => prev.filter(c => c.id !== id));
    }, 300);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-mono text-zinc-100 selection:bg-orange-500 overflow-x-hidden">
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

      {/* PARCHE: Alerta visual en caso de error de conexión o base de datos */}
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
        {comandas.map(comanda => (
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
                className="
                  w-full py-4 rounded bg-gradient-to-r from-orange-600 to-red-600 
                  text-white text-2xl font-black uppercase tracking-widest
                  hover:from-red-500 hover:to-orange-500 hover:scale-[1.02] 
                  active:scale-95 transition-all
                  shadow-[0_0_15px_rgba(239,68,68,0.6)]
                "
              >
                🔥 ¡FUEGO! 🔥
              </button>
            </div>
          </div>
        ))}

        {comandas.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-600 flex flex-col items-center justify-center">
            <span className="text-6xl mb-4">🧊</span>
            <h2 className="text-3xl font-black uppercase tracking-widest">Cocina Limpia</h2>
            <p className="text-xl mt-2">Esperando la siguiente tormenta...</p>
          </div>
        )}
      </div>

    </div>
  );
}
