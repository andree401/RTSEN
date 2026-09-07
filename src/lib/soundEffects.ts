// Utilidad de efectos de sonido sintetizados mediante Web Audio API
// 100% autónomo: no depende de archivos externos .mp3 ni CDNs que puedan fallar o dar 404

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    return globalAudioCtx;
  } catch (e) {
    console.warn('Error inicializando AudioContext:', e);
    return null;
  }
}

export function playOrderBell() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playNote = (freq: number, start: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(gainVal, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    // Ding!
    playNote(880, now, 0.45, 0.5);          // A5
    playNote(1760, now, 0.3, 0.25);        // Armónico A6
    // Dong!
    playNote(1174.66, now + 0.18, 0.7, 0.6); // D6
    playNote(2349.32, now + 0.18, 0.4, 0.2); // Armónico D7
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de comanda:', err);
  }
}

export function playCashRegisterSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 1. Clic mecánico de la caja (resorte / apertura de gaveta)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(450, now);
    clickGain.gain.setValueAtTime(0.5, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.08);

    // 2. Timbre metálico clásico "Cha-Ching!" (campana de registro)
    const playChime = (freq: number, start: number, duration: number, vol = 0.55) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Acorde brillante ascendente de caja registradora (E6 -> G#6 -> C7 -> E7)
    playChime(1318.51, now + 0.05, 0.4, 0.5);  // E6
    playChime(1661.22, now + 0.12, 0.5, 0.55); // G#6
    playChime(2093.00, now + 0.20, 0.8, 0.65); // C7 (Campana triunfal sostenida)
    playChime(2637.02, now + 0.25, 0.9, 0.4);  // E7 (Armónico cristalino)
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de cobro:', err);
  }
}

// Sonido de "¡OÍDO COCINA! / PEDIDO DESPACHADO" (Efecto sónico de fuego y despacho exitoso)
export function playOrderReadySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 1. Golpe de platillo / wok caliente (whoosh rápido)
    const playWhoosh = (start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, start);
      osc.frequency.exponentialRampToValueAtTime(150, start + 0.15);
      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    };

    // 2. Tono de éxito / listo para servir (acorde ascendente rápido de 2 notas)
    const playDing = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.6, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playWhoosh(now);
    playDing(987.77, now + 0.05, 0.25); // B5
    playDing(1318.51, now + 0.15, 0.4); // E6
    playDing(1975.53, now + 0.22, 0.5); // B6 (Tono brillante de pedido despachado)
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de despacho:', err);
  }
}
