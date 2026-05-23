// Pixel-art programático: cada función pinta un sprite con fillRect.
// La rejilla está pensada en celdas de 2px sobre el canvas para un look retro.

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// ---------- Mía ----------

const PALETTE = {
  skin: '#ffd9b8',
  skinShade: '#e6b894',
  skinDark: '#c69675',
  blush: '#ff9eb5',
  hair: '#ffffff',
  hairShade: '#dfe5f2',
  hairDeep: '#b9c1d6',
  hoodie: '#ff4fa3',
  hoodieMid: '#e0357e',
  hoodieShade: '#a8276c',
  hoodieDark: '#6f1746',
  hoodieHighlight: '#ff85c5',
  jeans: '#3a6cd8',
  jeansShade: '#23499a',
  jeansDark: '#142d6a',
  jeansSeam: '#5a8df0',
  shoe: '#f4f4f4',
  shoeStripe: '#ff4fa3',
  shoeSole: '#1a1a1a',
  shoeShade: '#bdbdbd',
  eye: '#1d1338',
  eyeShine: '#ffffff',
  brow: '#3a2a55',
  mouth: '#a83b6b',
  headphones: '#ffd14f',
  headphonesPad: '#ff8a3b',
  swordBlade: '#cfd8ec',
  swordEdge: '#7c8eb5',
  swordHilt: '#4a3585',
  swordGuard: '#ffd14f',
  swordPommel: '#ff4fa3',
};

/**
 * Dibuja a Mía mirando a la derecha en una caja de tamaño w×h, usando
 * una rejilla 24×36 (mucho más detalle que la versión 16×24 anterior).
 */
function drawMia(ctx, x, y, w, h, opts = {}) {
  const facing = opts.facing ?? 1;
  const walk = opts.walkPhase ?? 0;
  const jumping = !!opts.isJumping;
  const falling = !!opts.isFalling;
  const hp = !!opts.hasHeadphones;
  const blink = !!opts.blink;
  const showSword = opts.showSword !== false; // por defecto sí
  const swinging = !!opts.swinging;
  const swingT = opts.swingT ?? 0; // 0..1 progreso del swing
  const stretchY = opts.stretchY ?? 1;
  const stretchX = opts.stretchX ?? 1;

  ctx.save();
  // Squash & stretch desde el pie
  const cx = x + w / 2;
  const baseY = y + h;
  ctx.translate(cx, baseY);
  ctx.scale(stretchX, stretchY);
  ctx.translate(-cx, -baseY);

  if (facing < 0) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }

  // Rejilla relativa 24×36 escalada a w×h.
  const sx = w / 24, sy = h / 36;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, cx * sx, cy * sy, cw * sx, ch * sy, color);

  // ---------- Cabello (parte trasera) ----------
  u(4, 1, 16, 5, PALETTE.hair);
  u(3, 2, 1, 7, PALETTE.hair);
  u(20, 2, 1, 7, PALETTE.hair);
  u(2, 4, 1, 5, PALETTE.hairShade);
  u(21, 4, 1, 5, PALETTE.hairShade);
  // Mechones laterales largos
  u(3, 9, 2, 5, PALETTE.hair);
  u(19, 9, 2, 5, PALETTE.hair);
  u(3, 13, 2, 1, PALETTE.hairShade);
  u(19, 13, 2, 1, PALETTE.hairShade);
  // Sombra superior del cabello
  u(5, 6, 14, 1, PALETTE.hairShade);
  // Highlight del cabello
  u(7, 2, 4, 1, PALETTE.hair);
  u(13, 3, 3, 1, '#ffffff');
  // Flequillo asimétrico
  u(6, 5, 8, 3, PALETTE.hair);
  u(7, 7, 4, 1, PALETTE.hairShade);
  u(13, 6, 5, 2, PALETTE.hair);
  u(13, 7, 4, 1, PALETTE.hairShade);

  // ---------- Cara ----------
  u(6, 7, 12, 7, PALETTE.skin);
  u(6, 13, 12, 1, PALETTE.skinShade);
  u(6, 7, 1, 1, PALETTE.skinShade);
  u(17, 7, 1, 1, PALETTE.skinShade);
  // Mejillas
  u(7, 11, 2, 1, PALETTE.blush);
  u(15, 11, 2, 1, PALETTE.blush);

  // ---------- Cejas ----------
  u(8, 8, 2, 1, PALETTE.brow);
  u(14, 8, 2, 1, PALETTE.brow);

  // ---------- Ojos ----------
  if (!blink) {
    u(8, 9, 2, 3, PALETTE.eye);
    u(14, 9, 2, 3, PALETTE.eye);
    // Brillo en los ojos (vida!)
    u(9, 9, 1, 1, PALETTE.eyeShine);
    u(15, 9, 1, 1, PALETTE.eyeShine);
  } else {
    u(8, 11, 2, 1, PALETTE.eye);
    u(14, 11, 2, 1, PALETTE.eye);
  }

  // ---------- Boca ----------
  u(11, 12, 2, 1, PALETTE.mouth);
  u(10, 12, 1, 1, PALETTE.mouth);
  u(13, 12, 1, 1, PALETTE.mouth);

  // ---------- Capucha (asoma por detrás de la cabeza) ----------
  u(2, 9, 1, 6, PALETTE.hoodie);
  u(21, 9, 1, 6, PALETTE.hoodie);
  u(3, 14, 18, 1, PALETTE.hoodieShade);

  // ---------- Cuerpo / sudadera ----------
  u(5, 14, 14, 9, PALETTE.hoodie);
  // Highlight superior
  u(5, 14, 14, 1, PALETTE.hoodieHighlight);
  // Sombra inferior
  u(5, 21, 14, 2, PALETTE.hoodieMid);
  u(5, 22, 14, 1, PALETTE.hoodieShade);
  // Bolsillo central canguro
  u(8, 18, 8, 4, PALETTE.hoodieShade);
  u(8, 18, 8, 1, PALETTE.hoodieDark);
  u(9, 19, 1, 2, PALETTE.hoodieDark);
  u(14, 19, 1, 2, PALETTE.hoodieDark);
  // Cordones de la capucha
  u(10, 14, 1, 4, PALETTE.hairShade);
  u(13, 14, 1, 4, PALETTE.hairShade);
  // Remates de cordón
  u(10, 18, 1, 1, PALETTE.swordGuard);
  u(13, 18, 1, 1, PALETTE.swordGuard);
  // Pequeño detalle (corazón) en pecho
  u(15, 16, 1, 1, PALETTE.hoodieHighlight);
  u(16, 17, 1, 1, PALETTE.hoodieHighlight);
  u(15, 17, 1, 1, PALETTE.hoodieHighlight);

  // ---------- Brazos ----------
  const armSwing = swinging ? 1 : (jumping ? -1 : (walk === 1 ? 1 : walk === 3 ? -1 : 0));
  // Brazo izquierdo (desde nuestra perspectiva)
  u(4, 15, 1, 7 + (armSwing > 0 ? 1 : 0), PALETTE.hoodie);
  u(4, 15, 1, 1, PALETTE.hoodieHighlight);
  // Manga (cuff)
  u(3, 21 + (armSwing > 0 ? 1 : 0), 2, 1, PALETTE.hoodieDark);
  // Mano izquierda
  u(3, 22 + (armSwing > 0 ? 1 : 0), 2, 1, PALETTE.skin);

  // Brazo derecho
  u(19, 15, 1, 7 + (armSwing < 0 ? 1 : 0), PALETTE.hoodie);
  u(19, 15, 1, 1, PALETTE.hoodieHighlight);
  u(19, 21 + (armSwing < 0 ? 1 : 0), 2, 1, PALETTE.hoodieDark);
  u(19, 22 + (armSwing < 0 ? 1 : 0), 2, 1, PALETTE.skin);

  // ---------- Cinturón ----------
  u(5, 23, 14, 1, PALETTE.jeansDark);
  u(11, 23, 2, 1, PALETTE.swordGuard); // hebilla

  // ---------- Jeans ----------
  u(5, 24, 14, 6, PALETTE.jeans);
  u(5, 24, 14, 1, PALETTE.jeansSeam);
  // División de piernas
  u(11, 24, 2, 6, PALETTE.jeansShade);
  // Bolsillo trasero (lado)
  u(6, 26, 3, 2, PALETTE.jeansShade);
  u(15, 26, 3, 2, PALETTE.jeansShade);
  u(6, 26, 3, 1, PALETTE.jeansDark);
  u(15, 26, 3, 1, PALETTE.jeansDark);

  // ---------- Piernas ----------
  let legL = 0, legR = 0;
  if (jumping) { legL = -1; legR = 1; }
  else if (falling) { legL = 1; legR = -1; }
  else if (walk === 1) { legL = -1; legR = 1; }
  else if (walk === 3) { legL = 1; legR = -1; }

  // Pantorrillas
  u(6, 30 + legL, 4, 3, PALETTE.jeans);
  u(14, 30 + legR, 4, 3, PALETTE.jeans);
  u(6, 32 + legL, 4, 1, PALETTE.jeansShade);
  u(14, 32 + legR, 4, 1, PALETTE.jeansShade);

  // ---------- Zapatillas ----------
  // Pie izquierdo
  u(5, 33 + legL, 5, 2, PALETTE.shoe);
  u(5, 33 + legL, 5, 1, '#ffffff');
  u(5, 34 + legL, 5, 1, PALETTE.shoeShade);
  u(5, 35 + legL, 5, 1, PALETTE.shoeSole);
  u(5, 33 + legL, 1, 2, PALETTE.shoeStripe); // raya lateral
  u(8, 34 + legL, 1, 1, PALETTE.shoeStripe);

  // Pie derecho
  u(14, 33 + legR, 5, 2, PALETTE.shoe);
  u(14, 33 + legR, 5, 1, '#ffffff');
  u(14, 34 + legR, 5, 1, PALETTE.shoeShade);
  u(14, 35 + legR, 5, 1, PALETTE.shoeSole);
  u(18, 33 + legR, 1, 2, PALETTE.shoeStripe);
  u(15, 34 + legR, 1, 1, PALETTE.shoeStripe);

  // ---------- Auriculares mágicos (overlay sobre cabello) ----------
  if (hp) {
    u(4, 1, 16, 1, PALETTE.headphones);
    u(3, 1, 1, 3, PALETTE.headphones);
    u(20, 1, 1, 3, PALETTE.headphones);
    u(2, 4, 3, 5, PALETTE.headphonesPad);
    u(19, 4, 3, 5, PALETTE.headphonesPad);
    u(2, 4, 3, 1, PALETTE.headphones);
    u(19, 4, 3, 1, PALETTE.headphones);
  }

  // ---------- Espada en la mano derecha ----------
  if (showSword) {
    if (swinging) {
      // Arco de swing visible: la espada pivota frente a Mía (~135°)
      ctx.restore();
      ctx.save();
      // Re-aplicar transforms para el arco
      const cx2 = x + w / 2;
      const baseY2 = y + h;
      ctx.translate(cx2, baseY2);
      ctx.scale(stretchX, stretchY);
      ctx.translate(-cx2, -baseY2);
      if (facing < 0) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(x, y);
      }
      _drawSwordSwing(ctx, sx, sy, swingT);
    } else {
      // En reposo: empuñada al costado
      _drawSwordIdle(ctx, sx, sy, walk, jumping);
    }
  }

  ctx.restore();
}

// Espada en reposo (empuñada al costado/derecha)
function _drawSwordIdle(ctx, sx, sy, walk, jumping) {
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, cx * sx, cy * sy, cw * sx, ch * sy, color);

  // Mango (lo agarra la mano derecha, x≈19-20, y≈22-23)
  // La espada cuelga hacia abajo
  const ox = 21;
  const oy = 19;
  // Hoja
  u(ox, oy, 2, 8, PALETTE.swordBlade);
  u(ox, oy, 1, 8, '#ffffff');
  u(ox + 1, oy, 1, 8, PALETTE.swordEdge);
  u(ox, oy, 2, 1, '#ffffff');
  // Guarda
  u(ox - 1, oy + 8, 4, 1, PALETTE.swordGuard);
  // Mango
  u(ox, oy + 9, 2, 2, PALETTE.swordHilt);
  // Pomo
  u(ox - 1, oy + 11, 4, 1, PALETTE.swordPommel);
}

// Espada haciendo swing (arco frente a Mía)
function _drawSwordSwing(ctx, sx, sy, swingT) {
  // swingT va de 0 (inicio) a 1 (fin). El ángulo va de -45° a +90° aprox.
  // La espada pivota desde el hombro derecho (~20, 16).
  const angle = -Math.PI / 4 + swingT * (Math.PI * 0.85);
  const px0 = 18 * sx;
  const py0 = 17 * sy;
  ctx.save();
  ctx.translate(px0, py0);
  ctx.rotate(angle);

  // Hoja extendida
  const bladeLen = 14 * sx;
  const bladeW = 3 * sy;
  ctx.fillStyle = PALETTE.swordBlade;
  ctx.fillRect(0, -bladeW / 2, bladeLen, bladeW);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, -bladeW / 2, bladeLen, 1);
  ctx.fillStyle = PALETTE.swordEdge;
  ctx.fillRect(0, bladeW / 2 - 1, bladeLen, 1);
  // Punta
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bladeLen - 2, -bladeW / 2 + 1, 2, bladeW - 2);
  // Guarda (cruz)
  ctx.fillStyle = PALETTE.swordGuard;
  ctx.fillRect(-2, -bladeW / 2 - 1, 4, bladeW + 2);
  // Mango
  ctx.fillStyle = PALETTE.swordHilt;
  ctx.fillRect(-5 * sx, -1, 5 * sx, 2);
  // Pomo
  ctx.fillStyle = PALETTE.swordPommel;
  ctx.fillRect(-6 * sx, -2, 2, 4);

  ctx.restore();

  // Estela del swing (arco translúcido)
  ctx.save();
  ctx.translate(px0, py0);
  ctx.fillStyle = `rgba(255,255,255,${0.4 * (1 - swingT)})`;
  ctx.beginPath();
  const r = 16 * sx;
  ctx.arc(0, 0, r, -Math.PI / 4, angle, false);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------- Slime de Basura ----------
function drawSlime(ctx, x, y, w, h, opts = {}) {
  const sx = w / 16, sy = h / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * sx, y + cy * sy, cw * sx, ch * sy, color);

  // cuerpo gelatinoso
  u(3, 6, 10, 8, '#7aa845');
  u(2, 7, 1, 5, '#7aa845');
  u(13, 7, 1, 5, '#7aa845');
  u(4, 5, 8, 1, '#7aa845');
  // brillo
  u(5, 7, 2, 1, '#c0e074');
  // sombra inferior
  u(3, 13, 10, 1, '#4d6d28');
  // cáscara de plátano encima
  u(6, 3, 4, 2, '#f7d34a');
  u(6, 5, 4, 1, '#d2a51d');
  u(7, 1, 2, 2, '#a87b16');
  // ojos
  const blink = opts.blink;
  if (!blink) {
    u(6, 9, 1, 2, '#1a1a1a');
    u(10, 9, 1, 2, '#1a1a1a');
    u(6, 9, 1, 1, '#fff');
    u(10, 9, 1, 1, '#fff');
  } else {
    u(6, 10, 1, 1, '#1a1a1a');
    u(10, 10, 1, 1, '#1a1a1a');
  }
  // boca
  u(7, 12, 3, 1, '#1a1a1a');
}

// ---------- Cuervo Robacarteras ----------
function drawCrow(ctx, x, y, w, h, opts = {}) {
  const sx = w / 16, sy = h / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * sx, y + cy * sy, cw * sx, ch * sy, color);

  if (opts.shellMode) {
    // Forma "concha": el cuervo escondido en sus alas, tipo bolita.
    u(3, 6, 10, 7, '#3b2a55');
    u(4, 5, 8, 1, '#3b2a55');
    u(2, 7, 1, 5, '#3b2a55');
    u(13, 7, 1, 5, '#3b2a55');
    u(3, 13, 10, 1, '#1d1133');
    // pluma destacada
    u(6, 8, 4, 1, '#6c3df0');
    u(7, 9, 2, 1, '#6c3df0');
    if (!opts.blink) {
      u(6, 10, 1, 1, '#ff4fa3');
      u(9, 10, 1, 1, '#ff4fa3');
    }
    return;
  }

  const facing = opts.facing ?? 1;
  ctx.save();
  if (facing < 0) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }
  const v = (cx, cy, cw, ch, color) =>
    px(ctx, cx * sx, cy * sy, cw * sx, ch * sy, color);

  // cuerpo
  v(4, 7, 7, 5, '#1d1133');
  v(3, 8, 1, 3, '#1d1133');
  v(11, 8, 1, 3, '#1d1133');
  // ala batiendo (si vuela)
  const flap = opts.flap ?? 0;
  if (opts.flying) {
    if (flap < 2) {
      v(2, 5, 4, 2, '#3b2a55');
    } else {
      v(2, 9, 4, 2, '#3b2a55');
    }
  } else {
    v(4, 8, 3, 1, '#3b2a55');
  }
  // cabeza
  v(9, 4, 4, 4, '#1d1133');
  // ojo
  v(11, 5, 1, 1, '#ff4fa3');
  // pico
  v(13, 6, 2, 1, '#ffae3b');
  v(13, 7, 1, 1, '#d2891f');
  // patas (si camina)
  if (!opts.flying) {
    v(6, 12, 1, 2, '#ffae3b');
    v(9, 12, 1, 2, '#ffae3b');
  }
  ctx.restore();
}

// ---------- Cactus Rodante ----------
function drawCactus(ctx, x, y, w, h, opts = {}) {
  const sx = w / 16, sy = h / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * sx, y + cy * sy, cw * sx, ch * sy, color);

  // bola espinosa rotando
  const rot = opts.rot ?? 0;
  u(3, 3, 10, 10, '#3aa84a');
  u(2, 4, 1, 8, '#3aa84a');
  u(13, 4, 1, 8, '#3aa84a');
  u(4, 2, 8, 1, '#3aa84a');
  u(4, 13, 8, 1, '#3aa84a');
  u(3, 12, 10, 1, '#1f6e2f');

  // espinas que rotan
  const spikes = [
    [4, 1], [11, 1], [1, 5], [1, 10], [14, 5], [14, 10], [4, 14], [11, 14],
  ];
  for (let i = 0; i < spikes.length; i++) {
    if ((i + Math.floor(rot)) % 2 === 0) {
      u(spikes[i][0], spikes[i][1], 1, 1, '#e9f7c3');
    } else {
      u(spikes[i][0], spikes[i][1], 1, 1, '#9be07a');
    }
  }
  // cara enojada
  u(6, 7, 1, 2, '#1a1a1a');
  u(9, 7, 1, 2, '#1a1a1a');
  u(7, 10, 2, 1, '#1a1a1a');
}

// ---------- Caja de cartón misteriosa ----------
function drawMysteryBox(ctx, x, y, size, opts = {}) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);

  if (opts.empty) {
    u(0, 0, 16, 16, '#6e4a25');
    u(0, 0, 16, 1, '#a06c39');
    u(0, 15, 16, 1, '#3e2a14');
    u(0, 0, 1, 16, '#a06c39');
    u(15, 0, 1, 16, '#3e2a14');
    u(7, 7, 2, 2, '#3e2a14');
    return;
  }
  // base cartón
  u(0, 0, 16, 16, '#c98a4d');
  u(0, 0, 16, 1, '#e9b073');
  u(0, 15, 16, 1, '#7a4d22');
  u(0, 0, 1, 16, '#e9b073');
  u(15, 0, 1, 16, '#7a4d22');
  // cinta adhesiva
  u(7, 0, 2, 16, '#f0e6c8');
  u(0, 7, 16, 2, '#f0e6c8');
  // signo de interrogación
  const blink = opts.blink ? '#ffe27a' : '#ffd14f';
  u(6, 3, 4, 1, blink);
  u(10, 3, 1, 2, blink);
  u(8, 5, 2, 2, blink);
  u(8, 8, 2, 1, blink);
  u(8, 11, 2, 1, blink);
}

// ---------- Bloque ladrillo ----------
function drawBrick(ctx, x, y, size) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  u(0, 0, 16, 16, '#a83b29');
  u(0, 0, 16, 1, '#d36049');
  u(0, 15, 16, 1, '#6f1f12');
  // mortero
  u(0, 4, 16, 1, '#3b1409');
  u(0, 9, 16, 1, '#3b1409');
  u(7, 0, 1, 4, '#3b1409');
  u(3, 5, 1, 4, '#3b1409');
  u(11, 5, 1, 4, '#3b1409');
  u(7, 10, 1, 6, '#3b1409');
}

// ---------- Tile sólido (suelo) ----------
function drawGround(ctx, x, y, size, world = 'city') {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);

  if (world === 'park') {
    u(0, 0, 16, 4, '#5fb24a');
    u(0, 4, 16, 12, '#7a4f2c');
    u(0, 4, 16, 1, '#3a8030');
    // raicillas
    u(2, 6, 1, 2, '#4a2d18');
    u(8, 9, 1, 2, '#4a2d18');
    u(13, 12, 1, 2, '#4a2d18');
  } else if (world === 'sewer') {
    u(0, 0, 16, 16, '#3a3550');
    u(0, 0, 16, 1, '#5a5378');
    u(0, 15, 16, 1, '#1f1c30');
    // patrón de losetas
    u(0, 7, 16, 1, '#1f1c30');
    u(7, 0, 1, 16, '#1f1c30');
    u(2, 3, 1, 1, '#5a5378');
    u(11, 11, 1, 1, '#5a5378');
  } else if (world === 'roof') {
    u(0, 0, 16, 16, '#566075');
    u(0, 0, 16, 2, '#7a8499');
    u(0, 14, 16, 2, '#3a4156');
    u(0, 5, 16, 1, '#3a4156');
    u(0, 10, 16, 1, '#3a4156');
  } else if (world === 'neon') {
    // Suelo de avenida con neón rosa/cyan
    u(0, 0, 16, 16, '#1a0a30');
    u(0, 0, 16, 1, '#ff4fa3');     // borde superior brillante
    u(0, 1, 16, 1, '#a8276c');
    u(0, 14, 16, 2, '#0a0218');
    // Líneas luminosas internas
    u(0, 7, 16, 1, '#6cf0ff');
    u(0, 8, 16, 1, '#3a8aa8');
    // Ladrillos pequeños
    u(3, 3, 1, 3, '#3a1a55');
    u(11, 10, 1, 3, '#3a1a55');
    u(7, 12, 1, 2, '#3a1a55');
  } else if (world === 'storm') {
    // Tejados mojados con reflejo
    u(0, 0, 16, 16, '#2a2a44');
    u(0, 0, 16, 2, '#4a4a72');     // borde superior
    u(0, 14, 16, 2, '#0a0a1a');
    u(0, 6, 16, 1, '#1a1a3a');
    u(0, 11, 16, 1, '#1a1a3a');
    // Reflejo brillante (charco)
    u(2, 1, 4, 1, '#7a8aa8');
    u(10, 2, 3, 1, '#7a8aa8');
  } else {
    // ciudad: asfalto
    u(0, 0, 16, 16, '#2a2a32');
    u(0, 0, 16, 2, '#3e3e4c');
    u(0, 14, 16, 2, '#16161c');
    u(3, 5, 2, 1, '#56566a');
    u(10, 9, 2, 1, '#56566a');
    u(6, 12, 2, 1, '#56566a');
  }
}

// ---------- Plataforma flotante ----------
function drawPlatform(ctx, x, y, size, world = 'city') {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  if (world === 'park') {
    u(0, 0, 16, 5, '#8a5a32');
    u(0, 0, 16, 1, '#b5784a');
    u(0, 4, 16, 1, '#5a3618');
    u(0, 5, 16, 11, '#3a221068');
  } else if (world === 'sewer') {
    u(0, 0, 16, 5, '#4a4565');
    u(0, 0, 16, 1, '#6c6790');
    u(0, 4, 16, 1, '#241f3a');
  } else if (world === 'roof') {
    u(0, 0, 16, 5, '#a36ad8');
    u(0, 0, 16, 1, '#c98aff');
    u(0, 4, 16, 1, '#5e3990');
  } else if (world === 'neon') {
    u(0, 0, 16, 5, '#ff4fa3');
    u(0, 0, 16, 1, '#ffb1d8');
    u(0, 1, 16, 1, '#ff85c5');
    u(0, 4, 16, 1, '#a8276c');
    // Detalles cyan
    u(0, 2, 1, 1, '#6cf0ff');
    u(7, 2, 1, 1, '#6cf0ff');
    u(14, 2, 1, 1, '#6cf0ff');
  } else if (world === 'storm') {
    u(0, 0, 16, 5, '#3a4566');
    u(0, 0, 16, 1, '#6a78a0');
    u(0, 1, 16, 1, '#5a6890');
    u(0, 4, 16, 1, '#1a2240');
  } else {
    u(0, 0, 16, 5, '#3a4a8a');
    u(0, 0, 16, 1, '#5a72b5');
    u(0, 4, 16, 1, '#1f2a55');
  }
}

// ---------- Moneda de plata (con halo y sparkle) ----------
function drawCoin(ctx, x, y, size, t = 0) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);

  // Halo radial
  const cxC = x + size / 2;
  const cyC = y + size / 2;
  const haloR = size * 0.95;
  const halo = ctx.createRadialGradient(cxC, cyC, 0, cxC, cyC, haloR);
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  halo.addColorStop(0, `rgba(255,247,200,${0.35 + pulse * 0.25})`);
  halo.addColorStop(0.5, `rgba(255,209,79,${0.18 + pulse * 0.12})`);
  halo.addColorStop(1, 'rgba(255,209,79,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cxC - haloR, cyC - haloR, haloR * 2, haloR * 2);

  // Animación de spin: anchura horizontal cambia con seno
  const spin = Math.abs(Math.sin(t * 6));
  const w = 2 + spin * 6;
  const cx = 8 - w / 2;
  u(cx, 4, w, 8, '#fff5d0');
  u(cx + 1, 5, w - 2, 1, '#ffffff');
  u(cx + 1, 10, w - 2, 1, '#d2a51d');
  if (w > 4) {
    u(cx + 2, 6, 1, 4, '#ffd14f');
    u(cx + w - 3, 6, 1, 4, '#a8801a');
  }

  // Sparkle pequeño que aparece y desaparece
  const sparkle = Math.sin(t * 3.5) > 0.7;
  if (sparkle) {
    u(13, 2, 1, 1, '#ffffff');
    u(12, 3, 3, 1, '#ffffff');
    u(13, 4, 1, 1, '#ffffff');
  }
}

// ---------- Bebida Energética ----------
function drawEnergyDrink(ctx, x, y, size) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  // lata
  u(4, 3, 8, 11, '#e23a3a');
  u(4, 3, 8, 2, '#ff6c6c');
  u(4, 12, 8, 1, '#7e1414');
  // tapa
  u(5, 2, 6, 1, '#dcdcdc');
  u(7, 1, 2, 1, '#bcbcbc');
  // rayo
  u(7, 5, 2, 2, '#ffe27a');
  u(6, 7, 4, 1, '#ffe27a');
  u(7, 8, 2, 2, '#ffe27a');
  // texto fake
  u(5, 11, 6, 1, '#ffffff66');
}

// ---------- Auriculares Mágicos (item) ----------
function drawHeadphonesItem(ctx, x, y, size) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  // banda
  u(4, 3, 8, 2, '#ffd14f');
  u(3, 4, 1, 4, '#ffd14f');
  u(12, 4, 1, 4, '#ffd14f');
  // copas
  u(2, 7, 3, 5, '#ff8a3b');
  u(11, 7, 3, 5, '#ff8a3b');
  u(2, 7, 3, 1, '#ffd14f');
  u(11, 7, 3, 1, '#ffd14f');
  // notitas
  u(6, 12, 1, 2, '#6cf0ff');
  u(7, 13, 2, 1, '#6cf0ff');
  u(10, 11, 1, 2, '#6cf0ff');
}

// ---------- Nota musical (proyectil) ----------
function drawMusicNote(ctx, x, y, size, t = 0) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  const c = Math.floor(t * 8) % 2 === 0 ? '#6cf0ff' : '#ff4fa3';
  u(4, 9, 4, 4, c);
  u(8, 4, 1, 8, c);
  u(8, 4, 3, 1, c);
}

// ---------- Estación de tren / parada ----------
function drawGoal(ctx, x, y, w, h) {
  const sx = w / 32, sy = h / 64;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * sx, y + cy * sy, cw * sx, ch * sy, color);
  // poste
  u(15, 8, 2, 56, '#a8a8b8');
  u(14, 8, 4, 1, '#cfcfdc');
  // letrero
  u(4, 0, 24, 12, '#1d8aff');
  u(4, 0, 24, 2, '#5cb1ff');
  u(4, 10, 24, 2, '#0e5fbf');
  // texto BUS / TREN
  u(8, 4, 2, 4, '#ffffff');  u(11, 4, 2, 4, '#ffffff'); u(14, 4, 2, 4, '#ffffff');
  u(18, 4, 2, 4, '#ffe27a');  u(21, 4, 2, 4, '#ffe27a');
  // banco
  u(2, 56, 28, 2, '#5a3a18');
  u(4, 58, 2, 6, '#3a2410');
  u(26, 58, 2, 6, '#3a2410');
}

// ---------- Mochila de Mía (objetivo final) ----------
function drawBackpack(ctx, x, y, size) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  u(3, 4, 10, 11, '#ff4fa3');
  u(3, 4, 10, 2, '#ff85c5');
  u(3, 13, 10, 2, '#a8276c');
  u(5, 2, 6, 3, '#ff4fa3');
  u(6, 6, 4, 4, '#ffffff');
  u(7, 7, 2, 2, '#ff4fa3');
  // correas
  u(3, 6, 1, 8, '#a8276c');
  u(12, 6, 1, 8, '#a8276c');
}

// ---------- Mapache Gigante Mutante (jefe) ----------
function drawRaccoonBoss(ctx, x, y, w, h, opts = {}) {
  const sx = w / 32, sy = h / 32;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * sx, y + cy * sy, cw * sx, ch * sy, color);
  const facing = opts.facing ?? 1;
  ctx.save();
  if (facing < 0) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }
  const v = (cx, cy, cw, ch, color) =>
    px(ctx, cx * sx, cy * sy, cw * sx, ch * sy, color);

  const hurt = opts.hurt;
  const bodyA = hurt ? '#9a8aa8' : '#6e6480';
  const bodyB = hurt ? '#cabad8' : '#9a8aa8';

  // cuerpo
  v(6, 12, 20, 16, bodyA);
  v(6, 12, 20, 2, bodyB);
  v(6, 26, 20, 2, '#3a3548');
  // cabeza
  v(8, 4, 16, 12, bodyA);
  v(8, 4, 16, 2, bodyB);
  // orejas
  v(8, 2, 4, 3, bodyA);
  v(20, 2, 4, 3, bodyA);
  // máscara de mapache (negra)
  v(9, 8, 14, 4, '#1d1133');
  v(11, 9, 4, 2, '#ffffff');
  v(17, 9, 4, 2, '#ffffff');
  // ojos
  v(12, 9, 2, 2, opts.hurt ? '#ff4fa3' : '#ffd14f');
  v(18, 9, 2, 2, opts.hurt ? '#ff4fa3' : '#ffd14f');
  // hocico
  v(13, 12, 6, 3, '#dcd2e5');
  v(15, 13, 2, 1, '#1a1a1a');
  v(13, 14, 6, 1, '#1a1a1a');
  // dientes
  v(13, 14, 1, 1, '#ffffff');
  v(18, 14, 1, 1, '#ffffff');
  // brazos
  v(2, 14, 4, 6, bodyA);
  v(26, 14, 4, 6, bodyA);
  v(2, 19, 4, 2, '#1d1133');
  v(26, 19, 4, 2, '#1d1133');
  // cola con rayas
  v(26, 22, 6, 4, '#3a3548');
  v(26, 22, 6, 1, '#7a7090');
  v(28, 24, 4, 1, '#7a7090');
  // patas
  v(8, 28, 5, 4, '#3a3548');
  v(19, 28, 5, 4, '#3a3548');
  ctx.restore();
}



// ---------- Aura/Glow para personajes (siempre activa en modo ULTRA) ----------
function drawCharacterAura(ctx, x, y, w, h, opts = {}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.max(w, h) * (opts.scale || 0.85);
  const color = opts.color || '#ff4fa3';
  const intensity = opts.intensity ?? 0.35;

  const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
  grad.addColorStop(0, hexToRgba(color, intensity * 0.6));
  grad.addColorStop(0.5, hexToRgba(color, intensity * 0.25));
  grad.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

function hexToRgba(hex, a) {
  // soporta #rgb, #rrggbb
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------- Nube de polvo (al correr/saltar/aterrizar) ----------
function drawDust(ctx, x, y, life, maxLife) {
  const k = Math.max(0, life / maxLife);
  const r = (1 - k) * 12 + 4;
  ctx.fillStyle = `rgba(220,210,230,${0.45 * k})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.25 * k})`;
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Nave Alien (UFO) ----------
//
// Sprite imponente: cúpula con piloto verde, casco metálico con luces
// circulares, halo bajo el platillo, antena con bola pulsante arriba.
function drawAlienShip(ctx, x, y, w, h, opts = {}) {
  const sx = w / 32, sy = h / 16;
  const t = opts.t || 0;
  const damaged = !!opts.damaged;

  // Halo bajo el platillo (verde/cyan brillante)
  const haloC = damaged ? '#ff4fa3' : '#6cf0ff';
  const haloX = x + w / 2;
  const haloY = y + h * 0.85;
  const haloR = w * 0.7;
  const grad = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, haloR);
  grad.addColorStop(0, hexToRgba(haloC, 0.55 + 0.2 * Math.sin(t * 8)));
  grad.addColorStop(0.5, hexToRgba(haloC, 0.2));
  grad.addColorStop(1, hexToRgba(haloC, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(haloX - haloR, haloY - haloR, haloR * 2, haloR * 2);

  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * sx, y + cy * sy, cw * sx, ch * sy, color);

  // Cuerpo del platillo (elipse pixelada)
  // fila por fila simulando una elipse
  // y rows: 5..11 con anchos crecientes/decrecientes
  const bodyDark  = damaged ? '#5a3038' : '#2a2a3a';
  const bodyMid   = damaged ? '#a04a55' : '#5a5a72';
  const bodyLight = damaged ? '#ff85a8' : '#a8b0c8';

  // Sombra inferior
  u(4, 11, 24, 1, bodyDark);
  u(2, 10, 28, 1, bodyDark);
  u(1, 9,  30, 1, bodyMid);
  u(0, 8,  32, 1, bodyMid);
  u(1, 7,  30, 1, bodyLight);
  u(3, 6,  26, 1, bodyLight);
  u(6, 5,  20, 1, bodyMid);

  // Cúpula transparente con piloto
  u(11, 1, 10, 4, '#0a1a30');         // cúpula (cristal oscuro)
  u(11, 1, 10, 1, '#6cf0ff');         // borde superior cyan
  u(11, 4, 10, 1, '#3a8aa8');         // borde inferior
  // Reflejo en cristal
  u(13, 2, 2, 1, '#a8e0ff');
  u(13, 3, 1, 1, '#a8e0ff');

  // Piloto alien (cabezota verde con un solo ojo)
  u(14, 2, 4, 2, '#5fd84a');          // cabeza
  u(15, 1, 2, 1, '#5fd84a');          // tope
  u(16, 2, 1, 1, '#1a1a1a');          // ojo (cíclope)
  u(15, 3, 3, 1, '#3a8a30');          // sombra
  // Antenas
  u(14, 0, 1, 1, '#ffd14f');
  u(17, 0, 1, 1, '#ffd14f');

  // Luces circulares en la base del platillo (parpadean)
  const blinkPhase = Math.floor(t * 8) % 4;
  const lights = [3, 8, 14, 19, 24];
  for (let i = 0; i < lights.length; i++) {
    const lit = (i + blinkPhase) % 2 === 0;
    const cx = lights[i];
    u(cx, 8, 2, 1, lit ? '#ff4fa3' : '#5a3060');
    if (lit) {
      // pequeño halo
      ctx.fillStyle = 'rgba(255,79,163,0.35)';
      ctx.fillRect(x + (cx - 1) * sx, y + 7 * sy, 4 * sx, 3 * sy);
    }
  }

  // Antena superior con esfera roja pulsante
  u(15, 0, 2, 1, '#3a3a55');
  // Bolita
  const pulseSize = 1 + Math.sin(t * 10) * 0.3;
  ctx.fillStyle = '#ff4f4f';
  ctx.beginPath();
  ctx.arc(x + 16 * sx, y - 1 * sy, 2.5 * sx * pulseSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,79,79,0.5)';
  ctx.beginPath();
  ctx.arc(x + 16 * sx, y - 1 * sy, 5 * sx * pulseSize, 0, Math.PI * 2);
  ctx.fill();

  // Cañón inferior (donde sale el láser)
  u(15, 11, 2, 2, '#1a1a2a');
  u(14, 12, 4, 1, '#3a3a55');
}

// ---------- Láser vertical (rayo de la nave alien) ----------
//
// Dibuja un rayo vertical que va desde (x,y) hacia abajo con altura h.
// Tiene núcleo blanco intenso, corona verde/rosa, halo amplio y partículas.
function drawAlienLaser(ctx, x, y, h, opts = {}) {
  const t = opts.t || 0;
  const charge = opts.charge ?? 1;       // 0..1 para fade-in al aparecer
  const colorCore = '#ffffff';
  const colorMid = opts.color || '#ff4fa3';
  const colorOuter = opts.outer || '#6cf0ff';

  // Halo lateral muy ancho
  const haloW = 36 * charge;
  const grad = ctx.createLinearGradient(x - haloW / 2, 0, x + haloW / 2, 0);
  grad.addColorStop(0, hexToRgba(colorOuter, 0));
  grad.addColorStop(0.4, hexToRgba(colorMid, 0.25 * charge));
  grad.addColorStop(0.5, hexToRgba(colorCore, 0.6 * charge));
  grad.addColorStop(0.6, hexToRgba(colorMid, 0.25 * charge));
  grad.addColorStop(1, hexToRgba(colorOuter, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(x - haloW / 2, y, haloW, h);

  // Capas: outer, mid, core
  ctx.fillStyle = hexToRgba(colorOuter, 0.5 * charge);
  ctx.fillRect(x - 8 * charge, y, 16 * charge, h);

  ctx.fillStyle = hexToRgba(colorMid, 0.85 * charge);
  ctx.fillRect(x - 4 * charge, y, 8 * charge, h);

  ctx.fillStyle = colorCore;
  ctx.fillRect(x - 2 * charge, y, 4 * charge, h);

  // "Pulsos" que viajan por el rayo
  for (let i = 0; i < 4; i++) {
    const py = y + ((t * 600 + i * 60) % h);
    ctx.fillStyle = hexToRgba(colorCore, 0.9 * charge);
    ctx.fillRect(x - 4 * charge, py, 8 * charge, 4);
  }

  // Punto de impacto al final (chispa)
  ctx.fillStyle = colorCore;
  ctx.beginPath();
  ctx.arc(x, y + h - 2, 6 * charge, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hexToRgba(colorMid, 0.5 * charge);
  ctx.beginPath();
  ctx.arc(x, y + h - 2, 14 * charge, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Carga del láser (antes de disparar) ----------
function drawLaserCharge(ctx, x, y, t, charge) {
  const k = Math.min(1, charge);
  ctx.fillStyle = `rgba(255,79,163,${0.5 * k})`;
  ctx.beginPath();
  ctx.arc(x, y, 8 * k + 2 * Math.sin(t * 30), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
  ctx.beginPath();
  ctx.arc(x, y, 3 * k + 1.5 * Math.sin(t * 40), 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Explosión alien ----------
function drawAlienExplosion(ctx, x, y, life, maxLife) {
  const k = life / maxLife;
  const r = (1 - k) * 30 + 8;
  // núcleo
  ctx.fillStyle = `rgba(255,255,255,${k * 0.9})`;
  ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill();
  // anillo verde
  ctx.fillStyle = `rgba(95,216,74,${k * 0.6})`;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // anillo exterior cyan
  ctx.strokeStyle = `rgba(108,240,255,${k * 0.5})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
}
