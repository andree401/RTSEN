// Utilidad de efectos de sonido sintetizados mediante Web Audio API
// 100% autónomo: no depende de archivos externos .mp3 ni CDNs que puedan fallar o dar 404

let globalAudioCtx: AudioContext | null = null;

function createSoundContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch (e) {
    console.warn('Error inicializando AudioContext:', e);
    return null;
  }
}

export function playOrderBell() {
  const ctx = createSoundContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const playNote = (freq: number, start: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(gainVal, start);
      gain.gain.linearRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    // Ding!
    playNote(880, now, 0.45, 0.6);          // A5
    playNote(1760, now, 0.3, 0.3);          // Armónico A6
    // Dong!
    playNote(1174.66, now + 0.18, 0.7, 0.7); // D6
    playNote(2349.32, now + 0.18, 0.4, 0.25); // Armónico D7
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de comanda:', err);
  }
}

export function playCashRegisterSound() {
  const ctx = createSoundContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Clic mecánico de la caja (resorte / apertura de gaveta)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(450, now);
    clickGain.gain.setValueAtTime(0.6, now);
    clickGain.gain.linearRampToValueAtTime(0.001, now + 0.08);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.1);

    // 2. Timbre metálico clásico "Cha-Ching!" (campana de registro)
    const playChime = (freq: number, start: number, duration: number, vol = 0.6) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.linearRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    // Acorde brillante ascendente de caja registradora (E6 -> G#6 -> C7 -> E7)
    playChime(1318.51, now + 0.05, 0.4, 0.55); // E6
    playChime(1661.22, now + 0.12, 0.5, 0.6);  // G#6
    playChime(2093.00, now + 0.20, 0.8, 0.7);  // C7 (Campana triunfal sostenida)
    playChime(2637.02, now + 0.25, 0.9, 0.45); // E7 (Armónico cristalino)
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de cobro:', err);
  }
}

// Sonido de "¡OÍDO COCINA! / PEDIDO DESPACHADO" (Efecto sónico de fuego y despacho exitoso)
export function playOrderReadySound() {
  const ctx = createSoundContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Golpe de platillo / fuego caliente (whoosh dinámico)
    const playWhoosh = (start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, start);
      osc.frequency.linearRampToValueAtTime(120, start + 0.18);
      gain.gain.setValueAtTime(0.5, start);
      gain.gain.linearRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    };

    // 2. Tono de éxito / listo para servir
    const playDing = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.65, start);
      gain.gain.linearRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    playWhoosh(now);
    playDing(987.77, now + 0.05, 0.25); // B5
    playDing(1318.51, now + 0.15, 0.4); // E6
    playDing(1975.53, now + 0.22, 0.55); // B6 (Tono brillante de pedido despachado)
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de despacho:', err);
  }
}
