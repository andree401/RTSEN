import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStealthGateway } from '../src/hooks/useStealthGateway';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('useStealthGateway - Algoritmo Rítmico (5 Toques >= 500ms)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no debe activar la puerta secreta si se tocan menos de 5 veces', () => {
    const { result } = renderHook(() => useStealthGateway({ minIntervalMs: 500, requiredTaps: 5 }));

    // 3 toques válidos con 600ms de separación
    act(() => {
      result.current.triggerTap();
      vi.advanceTimersByTime(600);
      result.current.triggerTap();
      vi.advanceTimersByTime(600);
      result.current.triggerTap();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('debe descartar toques que ocurran a menos de 500ms (toque accidental o spam rápido)', () => {
    const { result } = renderHook(() => useStealthGateway({ minIntervalMs: 500, requiredTaps: 5 }));

    act(() => {
      result.current.triggerTap(); // Toque 1
      vi.advanceTimersByTime(200); // Demasiado rápido (< 500ms)
      result.current.triggerTap(); // Reinicia a 1
      vi.advanceTimersByTime(200); // Demasiado rápido
      result.current.triggerTap(); // Reinicia a 1
      vi.advanceTimersByTime(200); // Demasiado rápido
      result.current.triggerTap(); // Reinicia a 1
      vi.advanceTimersByTime(200); // Demasiado rápido
      result.current.triggerTap(); // Reinicia a 1
    });

    // Aunque se tocó 5 veces, todas fueron en ráfaga rápida (<500ms), no debe activar
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('debe activar la puerta secreta al cumplir 5 toques con intervalo >= 500ms', () => {
    const { result } = renderHook(() => useStealthGateway({ minIntervalMs: 500, requiredTaps: 5 }));

    act(() => {
      result.current.triggerTap(); // Toque 1
      vi.advanceTimersByTime(600); // >= 500ms
      result.current.triggerTap(); // Toque 2
      vi.advanceTimersByTime(700); // >= 500ms
      result.current.triggerTap(); // Toque 3
      vi.advanceTimersByTime(550); // >= 500ms
      result.current.triggerTap(); // Toque 4
      vi.advanceTimersByTime(650); // >= 500ms
      result.current.triggerTap(); // Toque 5 -> ¡BINGO!
    });

    expect(mockPush).toHaveBeenCalledWith('/sys-ops');
  });

  it('debe expirar la secuencia si transcurre más tiempo que maxIntervalMs (2500ms)', () => {
    const { result } = renderHook(() => useStealthGateway({ minIntervalMs: 500, maxIntervalMs: 2500, requiredTaps: 5 }));

    act(() => {
      result.current.triggerTap(); // Toque 1
      vi.advanceTimersByTime(600);
      result.current.triggerTap(); // Toque 2
      vi.advanceTimersByTime(3000); // Se tardó demasiado (> 2.5s) -> expira
      result.current.triggerTap(); // Nuevo toque 1
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
