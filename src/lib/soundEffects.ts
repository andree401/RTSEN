// Utilidad de efectos de sonido sintetizados mediante Web Audio API
// 100% autónomo: no depende de archivos externos .mp3 ni CDNs que puedan fallar o dar 404

export function playOrderBell() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Campana de cocina de restaurante (Doble timbre brillante Ding-Dong / Bell)
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
    playNote(880, now, 0.4, 0.35);       // A5
    playNote(1760, now, 0.25, 0.15);     // Armónico A6
    // Dong!
    playNote(1174.66, now + 0.18, 0.6, 0.4); // D6
    playNote(2349.32, now + 0.18, 0.35, 0.12); // Armónico D7
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de comanda:', err);
  }
}

export function playCashRegisterSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;

    // 1. Clic mecánico de la caja (resorte)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(320, now);
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    // 2. Timbre clásico metálico "Cha-Ching!" (campana de registro de ventas)
    const playChime = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Acorde brillante ascendente de caja registradora
    playChime(1318.51, now + 0.06, 0.35); // E6
    playChime(1661.22, now + 0.12, 0.45); // G#6
    playChime(2093.00, now + 0.18, 0.7);  // C7 (Campana triunfal sostenida)
  } catch (err) {
    console.warn('No se pudo reproducir el sonido de cobro:', err);
  }
}
