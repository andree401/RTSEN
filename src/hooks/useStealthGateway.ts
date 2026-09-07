'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StealthGatewayOptions {
  requiredTaps?: number;
  minIntervalMs?: number; // Mínimo 500ms
  maxIntervalMs?: number; // Máximo 2500ms
  targetRoute?: string;
}

export function useStealthGateway({
  requiredTaps = 5,
  minIntervalMs = 500,
  maxIntervalMs = 2500,
  targetRoute = '/sys-ops'
}: StealthGatewayOptions = {}) {
  const router = useRouter();
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const triggerTap = useCallback(() => {
    const now = Date.now();
    const last = lastTapTimeRef.current;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    if (last === 0) {
      // Primer toque
      tapCountRef.current = 1;
      lastTapTimeRef.current = now;
    } else {
      const delta = now - last;

      if (delta >= minIntervalMs && delta <= maxIntervalMs) {
        // Ritmo válido (medio segundo o más de separación)
        tapCountRef.current += 1;
        lastTapTimeRef.current = now;

        if (tapCountRef.current >= requiredTaps) {
          // Secuencia rítmica completada
          tapCountRef.current = 0;
          lastTapTimeRef.current = 0;

          // Vibración háptica en dispositivos móviles si está soportada
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([80, 40, 80]);
            }
          } catch {}

          router.push(targetRoute);
          return true;
        }
      } else {
        // Toque fuera de ritmo (demasiado rápido < 500ms o expirado > 2.5s)
        // Reiniciar conteo con este nuevo toque como el primero
        tapCountRef.current = 1;
        lastTapTimeRef.current = now;
      }
    }

    // Timer de seguridad para expirar la secuencia si no se toca en maxIntervalMs
    resetTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      lastTapTimeRef.current = 0;
    }, maxIntervalMs);

    return false;
  }, [minIntervalMs, maxIntervalMs, requiredTaps, targetRoute, router]);

  return { triggerTap };
}
