import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInactivityTimeout } from '../src/hooks/useInactivityTimeout';

describe('useInactivityTimeout - Lifecycle & Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('no debe mostrar advertencia inicialmente', () => {
    const mockTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 10000,
        warningMs: 3000,
        enabled: true,
        onTimeout: mockTimeout,
      })
    );

    expect(result.current.isWarningOpen).toBe(false);
    expect(mockTimeout).not.toHaveBeenCalled();
  });

  test('no debe activar timers ni timeout si enabled es false', () => {
    const mockTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 10000,
        warningMs: 3000,
        enabled: false,
        onTimeout: mockTimeout,
      })
    );

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(result.current.isWarningOpen).toBe(false);
    expect(mockTimeout).not.toHaveBeenCalled();
  });

  test('debe abrir la advertencia cuando queda menos tiempo que warningMs', () => {
    const mockTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 10000,
        warningMs: 3000,
        enabled: true,
        onTimeout: mockTimeout,
      })
    );

    // Avanzar 7.5 segundos (quedan 2.5s < 3s de warningMs)
    act(() => {
      vi.advanceTimersByTime(7500);
    });

    expect(result.current.isWarningOpen).toBe(true);
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(3);
    expect(mockTimeout).not.toHaveBeenCalled();
  });

  test('debe llamar a onTimeout cuando expira todo el tiempo', () => {
    const mockTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 10000,
        warningMs: 3000,
        enabled: true,
        onTimeout: mockTimeout,
      })
    );

    act(() => {
      vi.advanceTimersByTime(11000);
    });

    expect(mockTimeout).toHaveBeenCalledTimes(1);
    expect(result.current.isWarningOpen).toBe(false);
  });

  test('resetTimer debe reiniciar el contador y cerrar la advertencia', () => {
    const mockTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 10000,
        warningMs: 3000,
        enabled: true,
        onTimeout: mockTimeout,
      })
    );

    // Entrar en zona de advertencia
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.isWarningOpen).toBe(true);

    // Usuario hace clic en resetTimer ("Mantener sesión")
    act(() => {
      result.current.resetTimer();
      vi.advanceTimersByTime(1000); // 1 segundo después del reset
    });

    expect(result.current.isWarningOpen).toBe(false);
    expect(mockTimeout).not.toHaveBeenCalled();
  });

  test('debe reiniciar la inactividad ante eventos de usuario en la ventana (mousemove / keydown)', () => {
    const mockTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 10000,
        warningMs: 3000,
        enabled: true,
        onTimeout: mockTimeout,
      })
    );

    // Avanzar 5 segundos
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Simular que el usuario mueve el ratón o teclea
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
      vi.advanceTimersByTime(1500); // Superar throttle de 1s
      window.dispatchEvent(new Event('keydown'));
    });

    // Avanzar otros 4 segundos (total desde inicio: 10.5s, pero reseteado en 6.5s -> sólo han pasado 4s)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.isWarningOpen).toBe(false);
    expect(mockTimeout).not.toHaveBeenCalled();
  });

  test('debe sincronizar actividad remota vía storage event (multitestaña)', () => {
    const mockTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 10000,
        warningMs: 3000,
        enabled: true,
        onTimeout: mockTimeout,
      })
    );

    // Entrar en zona de advertencia a los 8s
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(result.current.isWarningOpen).toBe(true);

    // Otra pestaña registra actividad
    const newActivityTimestamp = (Date.now() + 100).toString();
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'fw_last_activity_timestamp',
          newValue: newActivityTimestamp,
        })
      );
    });

    expect(result.current.isWarningOpen).toBe(false);
  });
});
