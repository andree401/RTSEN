'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StealthGatewayOptions {
  requiredTaps?: number;
  minIntervalMs?: number; // Mínimo 500ms
  maxIntervalMs?: number; // Máximo 2500ms
  targetRoute?: string;
  onActivate?: () => void;
}

export function useStealthGateway({
  requiredTaps = 5,
  minIntervalMs = 500,
  maxIntervalMs = 2500,
  targetRoute = '/sys-ops',
  onActivate
}: StealthGatewayOptions = {}) {
  const router = useRouter();
  const tapProgressRef = useRef<number>(0);
  const [tapProgressDisplay, setTapProgressDisplay] = useState<number>(0);
  const lastTapTimeRef = useRef(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setProgress = useCallback((val: number) => {
    if (tapProgressRef.current !== val) {
      tapProgressRef.current = val;
      setTapProgressDisplay(val);
    }
  }, []);

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
      setProgress(1);
      lastTapTimeRef.current = now;
    } else {
      const delta = now - last;

      if (delta >= minIntervalMs && delta <= maxIntervalMs) {
        // Ritmo válido (medio segundo o más de separación)
        setProgress(tapProgressRef.current + 1);
        lastTapTimeRef.current = now;

        if (tapProgressRef.current >= requiredTaps) {
          // Secuencia rítmica completada
          setProgress(0);
          lastTapTimeRef.current = 0;

          // Vibración háptica en dispositivos móviles si está soportada
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([80, 40, 80]);
            }
          } catch {}

          if (onActivate) {
            onActivate();
          } else {
            router.push(targetRoute);
          }
          return true;
        }
      } else {
        // Toque fuera de ritmo (demasiado rápido < 500ms o expirado > 2.5s)
        // Reiniciar conteo con este nuevo toque como el primero
        setProgress(1);
        lastTapTimeRef.current = now;
      }
    }

    // Timer de seguridad para expirar la secuencia si no se toca en maxIntervalMs
    resetTimerRef.current = setTimeout(() => {
      setProgress(0);
      lastTapTimeRef.current = 0;
    }, maxIntervalMs);

    return false;
  }, [minIntervalMs, maxIntervalMs, requiredTaps, targetRoute, router, onActivate, setProgress]);

  return { triggerTap, tapProgress: tapProgressDisplay };
}
