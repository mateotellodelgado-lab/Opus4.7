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
  hair: '#ffffff',
  hairShade: '#dfe5f2',
  hoodie: '#ff4fa3',
  hoodieShade: '#c3327b',
  hoodieDark: '#8a1f57',
  jeans: '#3a6cd8',
  jeansShade: '#23499a',
  shoe: '#f4f4f4',
  shoeSole: '#1a1a1a',
  eye: '#1d1338',
  mouth: '#a83b6b',
  headphones: '#ffd14f',
  headphonesPad: '#ff8a3b',
};

/**
 * Dibuja a Mía mirando a la derecha en una caja de tamaño w×h.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x posición top-left
 * @param {number} y
 * @param {number} w ancho del sprite
 * @param {number} h alto del sprite (32 para small, 48 para big)
 * @param {object} opts {facing:1|-1, walkPhase:0..3, isJumping, hasHeadphones, blink}
 */
export function drawMia(ctx, x, y, w, h, opts = {}) {
  const facing = opts.facing ?? 1;
  const walk = opts.walkPhase ?? 0;
  const jumping = !!opts.isJumping;
  const hp = !!opts.hasHeadphones;
  const blink = !!opts.blink;

  ctx.save();
  // flip horizontal si mira a la izquierda
  if (facing < 0) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }

  // Coordenadas relativas en una rejilla 16×24 escalada a w×h.
  const sx = w / 16, sy = h / 24;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, cx * sx, cy * sy, cw * sx, ch * sy, color);

  // Cabello (parte superior + lados)
  u(3, 1, 10, 4, PALETTE.hair);
  u(2, 2, 1, 5, PALETTE.hair);
  u(13, 2, 1, 5, PALETTE.hair);
  u(3, 5, 10, 1, PALETTE.hairShade);
  // mechones laterales
  u(2, 7, 2, 3, PALETTE.hair);
  u(12, 7, 2, 3, PALETTE.hair);

  // Cara
  u(4, 4, 8, 5, PALETTE.skin);
  u(4, 8, 8, 1, PALETTE.skinShade);

  // Ojos
  if (!blink) {
    u(6, 6, 1, 2, PALETTE.eye);
    u(10, 6, 1, 2, PALETTE.eye);
  } else {
    u(6, 7, 2, 1, PALETTE.eye);
    u(10, 7, 2, 1, PALETTE.eye);
  }
  // Boca (sonrisa pequeña)
  u(8, 8, 2, 1, PALETTE.mouth);

  // Capucha de la sudadera (asoma por detrás de la cabeza)
  u(2, 6, 1, 4, PALETTE.hoodie);
  u(13, 6, 1, 4, PALETTE.hoodie);

  // Cuerpo / sudadera
  u(4, 9, 8, 6, PALETTE.hoodie);
  u(4, 14, 8, 1, PALETTE.hoodieShade);
  // Bolsillo central
  u(6, 12, 4, 2, PALETTE.hoodieShade);
  u(7, 13, 2, 1, PALETTE.hoodieDark);
  // Cordones de la capucha
  u(7, 9, 1, 2, PALETTE.hairShade);
  u(8, 9, 1, 2, PALETTE.hairShade);

  // Brazos
  const armSwing = jumping ? -1 : (walk === 1 ? 1 : walk === 3 ? -1 : 0);
  u(3, 10, 1, 4 + (armSwing > 0 ? 1 : 0), PALETTE.hoodie);
  u(12, 10, 1, 4 + (armSwing < 0 ? 1 : 0), PALETTE.hoodie);
  // manos
  u(3, 14, 1, 1, PALETTE.skin);
  u(12, 14, 1, 1, PALETTE.skin);

  // Jeans
  u(5, 15, 6, 5, PALETTE.jeans);
  u(5, 19, 6, 1, PALETTE.jeansShade);
  u(8, 15, 1, 5, PALETTE.jeansShade); // separación de piernas

  // Piernas / zapatillas — animación de caminar
  let legL = 0, legR = 0;
  if (jumping) { legL = -1; legR = 1; }
  else if (walk === 1) { legL = -1; legR = 1; }
  else if (walk === 3) { legL = 1; legR = -1; }

  u(5, 20 + legL, 3, 2, PALETTE.jeans);
  u(9, 20 + legR, 3, 2, PALETTE.jeans);
  // zapatillas
  u(5, 22 + legL, 3, 1, PALETTE.shoe);
  u(9, 22 + legR, 3, 1, PALETTE.shoe);
  u(5, 23 + legL, 3, 1, PALETTE.shoeSole);
  u(9, 23 + legR, 3, 1, PALETTE.shoeSole);

  // Auriculares mágicos (overlay)
  if (hp) {
    u(3, 1, 10, 1, PALETTE.headphones);             // banda
    u(2, 1, 1, 2, PALETTE.headphones);
    u(13, 1, 1, 2, PALETTE.headphones);
    u(2, 3, 2, 3, PALETTE.headphonesPad);           // copa izq
    u(12, 3, 2, 3, PALETTE.headphonesPad);          // copa der
  }

  ctx.restore();
}

// ---------- Slime de Basura ----------
export function drawSlime(ctx, x, y, w, h, opts = {}) {
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
export function drawCrow(ctx, x, y, w, h, opts = {}) {
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
export function drawCactus(ctx, x, y, w, h, opts = {}) {
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
export function drawMysteryBox(ctx, x, y, size, opts = {}) {
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
export function drawBrick(ctx, x, y, size) {
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
export function drawGround(ctx, x, y, size, world = 'city') {
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
export function drawPlatform(ctx, x, y, size, world = 'city') {
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
  } else {
    u(0, 0, 16, 5, '#3a4a8a');
    u(0, 0, 16, 1, '#5a72b5');
    u(0, 4, 16, 1, '#1f2a55');
  }
}

// ---------- Moneda de plata ----------
export function drawCoin(ctx, x, y, size, t = 0) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  // animación de spin: anchura horizontal cambia con seno
  const spin = Math.abs(Math.sin(t * 6));
  const w = 2 + spin * 6;
  const cx = 8 - w / 2;
  u(cx, 4, w, 8, '#dfe5f2');
  u(cx + 1, 5, w - 2, 1, '#ffffff');
  u(cx + 1, 10, w - 2, 1, '#9aa3b8');
  if (w > 4) {
    u(cx + 2, 6, 1, 4, '#9aa3b8');
    u(cx + w - 3, 6, 1, 4, '#9aa3b8');
  }
}

// ---------- Bebida Energética ----------
export function drawEnergyDrink(ctx, x, y, size) {
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
export function drawHeadphonesItem(ctx, x, y, size) {
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
export function drawMusicNote(ctx, x, y, size, t = 0) {
  const s = size / 16;
  const u = (cx, cy, cw, ch, color) =>
    px(ctx, x + cx * s, y + cy * s, cw * s, ch * s, color);
  const c = Math.floor(t * 8) % 2 === 0 ? '#6cf0ff' : '#ff4fa3';
  u(4, 9, 4, 4, c);
  u(8, 4, 1, 8, c);
  u(8, 4, 3, 1, c);
}

// ---------- Estación de tren / parada ----------
export function drawGoal(ctx, x, y, w, h) {
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
export function drawBackpack(ctx, x, y, size) {
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
export function drawRaccoonBoss(ctx, x, y, w, h, opts = {}) {
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
