// Sonidos sintetizados con Web Audio (sin assets externos, estilo retro).
// Inicialización perezosa porque los navegadores requieren un gesto del
// usuario antes de permitir audio.

let audioCtx = null;

function ensureCtx() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

function blip({ freq = 440, dur = 0.1, type = 'square', vol = 0.18, slide = 0 }) {
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SFX = {
  jump:    () => blip({ freq: 520, dur: 0.12, type: 'square', slide: 280 }),
  coin:    () => { blip({ freq: 880, dur: 0.06, type: 'square' }); setTimeout(() => blip({ freq: 1320, dur: 0.1, type: 'square' }), 50); },
  stomp:   () => blip({ freq: 180, dur: 0.1, type: 'sawtooth', slide: -100 }),
  hit:     () => blip({ freq: 220, dur: 0.18, type: 'sawtooth', slide: -180 }),
  break:   () => blip({ freq: 320, dur: 0.12, type: 'triangle', slide: -200 }),
  power:   () => { blip({ freq: 440, dur: 0.08, type: 'square' }); setTimeout(() => blip({ freq: 660, dur: 0.08, type: 'square' }), 80); setTimeout(() => blip({ freq: 880, dur: 0.16, type: 'square' }), 160); },
  shoot:   () => blip({ freq: 720, dur: 0.08, type: 'triangle', slide: 220 }),
  death:   () => { blip({ freq: 440, dur: 0.18, type: 'square', slide: -380 }); setTimeout(() => blip({ freq: 220, dur: 0.3, type: 'sawtooth', slide: -180 }), 200); },
  goal:    () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip({ freq: f, dur: 0.12, type: 'square' }), i * 100)); },
  bossHit: () => blip({ freq: 110, dur: 0.2, type: 'sawtooth', slide: -50 }),
  win:     () => { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => blip({ freq: f, dur: 0.18, type: 'square', vol: 0.22 }), i * 140)); },

  // ----- Sonidos del ataque alien -----
  // Sirena imponente: dos tonos alternándose, baja y alta. Repetida 4 veces.
  alarm:   () => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => blip({ freq: 320, dur: 0.18, type: 'sawtooth', vol: 0.26 }), i * 380);
      setTimeout(() => blip({ freq: 540, dur: 0.18, type: 'sawtooth', vol: 0.26 }), i * 380 + 180);
    }
  },
  // Carga: zumbido ascendente que sube de tono
  laserCharge: () => blip({ freq: 200, dur: 0.55, type: 'square', slide: 700, vol: 0.18 }),
  // Disparo: pulso fuerte y sostenido
  laserFire:   () => {
    blip({ freq: 1100, dur: 0.18, type: 'square', slide: -400, vol: 0.22 });
    setTimeout(() => blip({ freq: 220, dur: 0.35, type: 'sawtooth', slide: -120, vol: 0.18 }), 60);
  },
  // Trueno (storm world)
  thunder: () => {
    blip({ freq: 80, dur: 0.5, type: 'sawtooth', slide: -40, vol: 0.22 });
    setTimeout(() => blip({ freq: 120, dur: 0.4, type: 'square', slide: -80, vol: 0.18 }), 120);
  },
};
