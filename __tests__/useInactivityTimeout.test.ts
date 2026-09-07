import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInactivityTimeout } from '../src/hooks/useInactivityTimeout';

describe('useInactivityTimeout', () => {
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
});
