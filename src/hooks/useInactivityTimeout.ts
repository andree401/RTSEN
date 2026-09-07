'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseInactivityTimeoutOptions {
  timeoutMs?: number; // Tiempo total de inactividad antes de auto-logout (default: 15 min)
  warningMs?: number; // Ventana de advertencia previa (default: 2 min)
  enabled?: boolean;  // Si el temporizador de inactividad debe estar activo
  onTimeout: () => void | Promise<void>; // Función ejecutada al expirar la sesión
}

export interface UseInactivityTimeoutReturn {
  isWarningOpen: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
}

const STORAGE_KEY = 'fw_last_activity_timestamp';
const THROTTLE_MS = 1000;

export function useInactivityTimeout({
  timeoutMs = 15 * 60 * 1000, // 15 minutos por defecto
  warningMs = 2 * 60 * 1000,  // 2 minutos de advertencia previa
  enabled = true,
  onTimeout,
}: UseInactivityTimeoutOptions): UseInactivityTimeoutReturn {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(warningMs / 1000));

  const lastActivityRef = useRef<number>(0);
  const lastThrottleRef = useRef<number>(0);
  const hasTimedOutRef = useRef<boolean>(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Actualiza la última actividad en memoria y en localStorage para sincronizar pestañas
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    hasTimedOutRef.current = false;
    setIsWarningOpen((prev) => (prev ? false : prev));

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, now.toString());
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, []);

  // Función pública para reiniciar explícitamente el temporizador
  const resetTimer = useCallback(() => {
    recordActivity();
  }, [recordActivity]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const now = Date.now();
    let initialTimestamp = now;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= now) {
          // Preservar la última actividad real para no burlar los 15 minutos en recargas/navegación
          initialTimestamp = parsed;
        }
      }
      localStorage.setItem(STORAGE_KEY, initialTimestamp.toString());
    } catch {}

    lastActivityRef.current = initialTimestamp;
    hasTimedOutRef.current = false;

    // Si ya había expirado el tiempo de inactividad mientras estaba fuera, forzar logout inmediato
    if (now - initialTimestamp >= timeoutMs) {
      hasTimedOutRef.current = true;
      setIsWarningOpen(false);
      onTimeoutRef.current();
      return;
    }

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottleRef.current > THROTTLE_MS) {
        lastThrottleRef.current = now;
        lastActivityRef.current = now;
        try {
          localStorage.setItem(STORAGE_KEY, now.toString());
        } catch {}
      }
    };

    // Sincronización entre pestañas: si el usuario tiene abierta otra pestaña y trabaja allá
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
          lastActivityRef.current = remoteTime;
          setIsWarningOpen(false);
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));
    window.addEventListener('storage', handleStorageChange);

    const intervalId = window.setInterval(() => {
      let currentLastActivity = lastActivityRef.current;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > currentLastActivity) {
            currentLastActivity = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch {}

      const now = Date.now();
      const elapsed = now - currentLastActivity;
      const timeLeft = timeoutMs - elapsed;

      if (timeLeft <= 0) {
        if (!hasTimedOutRef.current) {
          hasTimedOutRef.current = true;
          setIsWarningOpen(false);
          onTimeoutRef.current();
        }
      } else if (timeLeft <= warningMs) {
        setIsWarningOpen(true);
        setRemainingSeconds(Math.max(1, Math.ceil(timeLeft / 1000)));
      } else {
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      window.removeEventListener('storage', handleStorageChange);
      window.clearInterval(intervalId);
    };
  }, [enabled, timeoutMs, warningMs, recordActivity]);

  return {
    isWarningOpen,
    remainingSeconds,
    resetTimer,
  };
}
