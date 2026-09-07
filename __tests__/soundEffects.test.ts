import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playOrderBell, playCashRegisterSound, playOrderReadySound } from '../src/lib/soundEffects';

describe('soundEffects - Web Audio API & Debounce', () => {
  const mockOscillator = {
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };

  const mockGain = {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };

  const mockAudioContextInstance = {
    state: 'running',
    currentTime: 10,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => ({ ...mockOscillator })),
    createGain: vi.fn(() => ({ ...mockGain })),
  };

  function MockAudioContext(this: unknown) {
    return mockAudioContextInstance;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockAudioContextInstance.state = 'running';
    mockAudioContextInstance.currentTime = 10;
    mockAudioContextInstance.resume.mockResolvedValue(undefined);
    mockAudioContextInstance.createOscillator.mockReturnValue(mockOscillator as never);
    mockAudioContextInstance.createGain.mockReturnValue(mockGain as never);

    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('playOrderBell debe crear osciladores para ding-dong y respetar debounce', () => {
    vi.advanceTimersByTime(2000);
    playOrderBell();

    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
    const callCountAfterFirst = mockAudioContextInstance.createOscillator.mock.calls.length;
    expect(callCountAfterFirst).toBeGreaterThan(0);

    // Inmediatamente llamar de nuevo dentro del debounce de 350ms
    playOrderBell();
    // No debe incrementar porque está bloqueado por debounce
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(callCountAfterFirst);

    // Avanzar tiempo más allá de los 350ms
    vi.advanceTimersByTime(500);

    playOrderBell();
    expect(mockAudioContextInstance.createOscillator.mock.calls.length).toBeGreaterThan(callCountAfterFirst);
  });

  it('playCashRegisterSound debe reproducir clic mecánico y acordes metálicos con debounce de 400ms', () => {
    vi.advanceTimersByTime(2000);
    playCashRegisterSound();

    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
    const callCount = mockAudioContextInstance.createOscillator.mock.calls.length;
    expect(callCount).toBeGreaterThan(0);

    // Llamada inmediata ignorada por debounce
    playCashRegisterSound();
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(callCount);

    // Avanzar más de 400ms
    vi.advanceTimersByTime(600);
    playCashRegisterSound();
    expect(mockAudioContextInstance.createOscillator.mock.calls.length).toBeGreaterThan(callCount);
  });

  it('playOrderReadySound debe reproducir efecto sónico de despacho con debounce de 350ms', () => {
    vi.advanceTimersByTime(2000);
    playOrderReadySound();

    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
    const callCount = mockAudioContextInstance.createOscillator.mock.calls.length;
    expect(callCount).toBeGreaterThan(0);

    // Llamada inmediata ignorada
    playOrderReadySound();
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalledTimes(callCount);

    // Avanzar tiempo
    vi.advanceTimersByTime(500);
    playOrderReadySound();
    expect(mockAudioContextInstance.createOscillator.mock.calls.length).toBeGreaterThan(callCount);
  });

  it('no debe lanzar error si AudioContext falla o no está soportado', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = undefined;
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = undefined;

    // Ninguna de las tres funciones debe lanzar excepción
    expect(() => playOrderBell()).not.toThrow();
    expect(() => playCashRegisterSound()).not.toThrow();
    expect(() => playOrderReadySound()).not.toThrow();
  });

  it('debe intentar reanudar el AudioContext si su estado es suspended', () => {
    mockAudioContextInstance.state = 'suspended';
    (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;

    // Avanzar el reloj virtual para superar cualquier timestamp previo
    vi.advanceTimersByTime(10000);
    playOrderBell();

    expect(mockAudioContextInstance.resume).toHaveBeenCalled();
  });
});
