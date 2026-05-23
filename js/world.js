// Tipos y constantes de tilemap, fondos parallax y render de tiles.
// Modo gráfico siempre en ULTRA: sin selector, todo el mundo se beneficia.
//
// Pipeline de fondo:
//   1. drawBackground:  cielo + 3 capas de parallax cacheadas + capa viva
//      (estrellas, nubes, gotas, neón).
//   2. drawTiles:       tiles del mapa con bordes biselados.
//   3. drawForeground:  niebla / lluvia / vignette (lo llama main.js
//                       DESPUÉS de pintar entidades).

const TILE = 40; // px por celda

// Tipos de tile
const T = {
  EMPTY: 0,
  GROUND: 1,
  PLATFORM: 2,
  BRICK: 3,
  MYSTERY: 4,        // con moneda
  MYSTERY_POWER: 5,  // con bebida o auriculares (según estado de Mía)
  MYSTERY_HP: 6,     // siempre auriculares
  EMPTY_BOX: 7,      // caja golpeada
};

const SOLID = new Set([T.GROUND, T.PLATFORM, T.BRICK, T.MYSTERY, T.MYSTERY_POWER, T.MYSTERY_HP, T.EMPTY_BOX]);

// Generador pseudo-aleatorio determinístico (xorshift) para que las
// estrellas/edificios queden iguales entre frames sin necesitar guardar
// posiciones — pero distintas en cada nivel.
function _seedRand(seed) {
  let s = seed | 0 || 1;
  return function() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

class World {
  constructor(level) {
    this.level = level;
    this.world = level.world;
    this.cols = level.cols;
    this.rows = level.rowsCount;
    this.timeLimit = level.timeLimit;
    this.tiles = new Uint8Array(this.cols * this.rows);
    this.bumpAnim = new Map();
    this.entitySeeds = [];

    for (let r = 0; r < this.rows; r++) {
      const row = level.rows[r];
      for (let c = 0; c < this.cols; c++) {
        const ch = row[c];
        switch (ch) {
          case '#': this.set(c, r, T.GROUND); break;
          case '=': this.set(c, r, T.PLATFORM); break;
          case 'B': this.set(c, r, T.BRICK); break;
          case '?': this.set(c, r, T.MYSTERY); break;
          case '$': this.set(c, r, T.MYSTERY_POWER); break;
          case '*': this.set(c, r, T.MYSTERY_HP); break;
          case 'C': this.entitySeeds.push({ kind: 'coin', col: c, row: r }); break;
          case 'S': this.entitySeeds.push({ kind: 'slime', col: c, row: r }); break;
          case 'K': this.entitySeeds.push({ kind: 'crow', col: c, row: r, flying: false }); break;
          case 'F': this.entitySeeds.push({ kind: 'crow', col: c, row: r, flying: true }); break;
          case 'X': this.entitySeeds.push({ kind: 'cactus', col: c, row: r }); break;
          case 'G': this.entitySeeds.push({ kind: 'goal', col: c, row: r }); break;
          default: break;
        }
      }
    }

    this.widthPx = this.cols * TILE;
    this.heightPx = this.rows * TILE;

    // 3 capas de parallax cacheadas, cada una con su factor de scroll
    // (más cerca = scroll más rápido).
    this._parallax = null;        // {far, mid, near, w, h}
    this._cacheW = 0;
    this._cacheH = 0;

    // Estrellas pre-generadas (posiciones, tamaño, color, fase de twinkle).
    this._stars = null;
    // Shooting stars (estrellas fugaces): se generan al vuelo.
    this._shootingStars = [];
    this._nextShootingStar = 1.5 + Math.random() * 3;

    // Nubes/neblina (para city, neon, storm)
    this._clouds = null;

    // Rayos de tormenta (storm) — flashes esporádicos
    this._lightningTimer = 2 + Math.random() * 3;
    this._lightningFlash = 0;
  }

  idx(c, r) { return r * this.cols + c; }
  inBounds(c, r) { return c >= 0 && c < this.cols && r >= 0 && r < this.rows; }
  get(c, r) { return this.inBounds(c, r) ? this.tiles[this.idx(c, r)] : T.EMPTY; }
  set(c, r, v) { if (this.inBounds(c, r)) this.tiles[this.idx(c, r)] = v; }

  isSolid(c, r) { return SOLID.has(this.get(c, r)); }
  isOneWay(c, r) { return this.get(c, r) === T.PLATFORM; }
  tileRect(c, r) { return { x: c * TILE, y: r * TILE, w: TILE, h: TILE }; }

  bump(col, row, mia) {
    const v = this.get(col, row);
    if (v === T.MYSTERY) {
      this.set(col, row, T.EMPTY_BOX);
      this.bumpAnim.set(`${col},${row}`, { t: 0.0 });
      return { kind: 'coin', x: col * TILE + TILE / 2, y: row * TILE };
    }
    if (v === T.MYSTERY_POWER) {
      this.set(col, row, T.EMPTY_BOX);
      this.bumpAnim.set(`${col},${row}`, { t: 0.0 });
      const item = mia && mia.size === 'big' ? 'headphones' : 'energy';
      return { kind: 'powerup', item, x: col * TILE + TILE / 2, y: row * TILE };
    }
    if (v === T.MYSTERY_HP) {
      this.set(col, row, T.EMPTY_BOX);
      this.bumpAnim.set(`${col},${row}`, { t: 0.0 });
      return { kind: 'powerup', item: 'headphones', x: col * TILE + TILE / 2, y: row * TILE };
    }
    if (v === T.BRICK) {
      this.bumpAnim.set(`${col},${row}`, { t: 0.0 });
      if (mia && mia.size !== 'small') {
        this.set(col, row, T.EMPTY);
        return { kind: 'brick-break', x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
      }
      return { kind: 'brick-bump', x: col * TILE + TILE / 2, y: row * TILE };
    }
    return { kind: 'none' };
  }

  update(dt) {
    for (const [k, v] of this.bumpAnim) {
      v.t += dt;
      if (v.t > 0.25) this.bumpAnim.delete(k);
    }
    // Shooting stars
    this._nextShootingStar -= dt;
    if (this._nextShootingStar <= 0 && this._isStarryWorld()) {
      this._spawnShootingStar();
      this._nextShootingStar = 2 + Math.random() * 5;
    }
    for (const s of this._shootingStars) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this._shootingStars = this._shootingStars.filter(s => s.life > 0);

    // Lightning (storm world)
    if (this.world === 'storm') {
      if (this._lightningFlash > 0) this._lightningFlash -= dt;
      this._lightningTimer -= dt;
      if (this._lightningTimer <= 0) {
        this._lightningFlash = 0.35;
        this._lightningTimer = 4 + Math.random() * 6;
      }
    }
  }

  _isStarryWorld() {
    return this.world === 'roof' || this.world === 'neon' ||
           this.world === 'city' || this.world === 'storm';
  }

  _spawnShootingStar() {
    const fromLeft = Math.random() < 0.5;
    this._shootingStars.push({
      x: fromLeft ? -40 : 980,
      y: 30 + Math.random() * 200,
      vx: fromLeft ? 700 + Math.random() * 250 : -(700 + Math.random() * 250),
      vy: 100 + Math.random() * 80,
      life: 0.7,
      maxLife: 0.7,
    });
  }

  // ============================================================
  // BACKGROUND
  // ============================================================
  drawBackground(ctx, cam, viewW, viewH, t) {
    // 1) Cielo gradiente (con sutil pulsación de color)
    const [c1, c2] = this.level.bgColor;
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    // Aura nebulosa (radial gradient sutil) — da profundidad
    if (this._isStarryWorld()) {
      const neb = ctx.createRadialGradient(viewW * 0.3, viewH * 0.4, 30,
                                            viewW * 0.3, viewH * 0.4, viewW * 0.7);
      neb.addColorStop(0, this.world === 'neon' ? 'rgba(255,79,163,0.18)' : 'rgba(108,143,255,0.14)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, viewW, viewH);

      const neb2 = ctx.createRadialGradient(viewW * 0.75, viewH * 0.3, 20,
                                             viewW * 0.75, viewH * 0.3, viewW * 0.6);
      neb2.addColorStop(0, this.world === 'neon' ? 'rgba(108,240,255,0.16)' : 'rgba(255,79,163,0.12)');
      neb2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    this._ensureParallax(viewW, viewH);

    // 2) Estrellas (capa más profunda, scroll lentísimo) y luna
    if (this._isStarryWorld()) {
      this._drawStars(ctx, cam, viewW, viewH, t);
    }

    // 3) Capa lejana (factor 0.15)
    this._drawCachedLayer(ctx, this._parallax.far, cam.x * 0.15, viewW);

    // 4) Capa media (factor 0.35)
    this._drawCachedLayer(ctx, this._parallax.mid, cam.x * 0.35, viewW);

    // 5) Nubes / niebla animadas
    if (this._clouds) this._drawClouds(ctx, cam, viewW, viewH, t);

    // 6) Capa cercana (factor 0.6)
    this._drawCachedLayer(ctx, this._parallax.near, cam.x * 0.6, viewW);

    // 7) Detalles vivos por mundo (gotas alcantarilla, neón flicker, rayos)
    if (this.world === 'sewer') this._drawSewerDrips(ctx, cam, viewW, viewH, t);
    if (this.world === 'neon')  this._drawNeonHaze(ctx, cam, viewW, viewH, t);
    if (this.world === 'storm') this._drawStormFlash(ctx, viewW, viewH);
  }

  _drawCachedLayer(ctx, layer, scrollX, viewW) {
    if (!layer) return;
    const w = layer.width;
    const offset = -((scrollX % w + w) % w);
    ctx.drawImage(layer, offset, 0);
    if (offset + w < viewW) ctx.drawImage(layer, offset + w, 0);
  }

  // ============================================================
  // ESTRELLAS (mucho más llamativas)
  // ============================================================
  _ensureStars(viewW, viewH) {
    if (this._stars) return;
    const rng = _seedRand(this.level.id * 7919 + 13);
    const stars = [];
    const count = this.world === 'neon' ? 70 : 110;
    const colors = this.world === 'neon'
      ? ['#fff', '#ffe7ff', '#c8ffff', '#ffb1ff', '#a8e0ff']
      : ['#ffffff', '#fff7d6', '#c8e0ff', '#ffd7ff', '#a8f0ff'];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rng() * viewW * 1.2,
        y: rng() * viewH * 0.65,
        // Tamaño con pesos: la mayoría pequeñas, pocas grandes
        size: rng() < 0.85 ? (1 + Math.floor(rng() * 2)) : (3 + Math.floor(rng() * 2)),
        color: colors[Math.floor(rng() * colors.length)],
        phase: rng() * Math.PI * 2,
        speed: 1.5 + rng() * 3,
        // Algunas estrellas tienen "cross flare"
        cross: rng() < 0.18,
      });
    }
    this._stars = stars;
  }

  _drawStars(ctx, cam, viewW, viewH, t) {
    this._ensureStars(viewW, viewH);
    // scroll lentísimo (factor 0.05)
    const scroll = (cam.x * 0.05) % viewW;

    for (const s of this._stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const alpha = 0.35 + tw * 0.65;
      const x = ((s.x - scroll) % (viewW * 1.2) + viewW * 1.2) % (viewW * 1.2);
      const y = s.y;
      if (x > viewW + 10) continue;

      // Halo difuso (radial gradient) para las estrellas grandes
      if (s.size >= 3) {
        const halo = ctx.createRadialGradient(x, y, 0, x, y, s.size * 4);
        halo.addColorStop(0, s.color);
        halo.addColorStop(0.5, s.color + (this.world === 'neon' ? '55' : '40'));
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = halo;
        ctx.fillRect(x - s.size * 4, y - s.size * 4, s.size * 8, s.size * 8);
      }

      // Núcleo de la estrella
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      const sz = s.size;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);

      // Brazos cruzados (twinkle): aparecen y desaparecen
      if (s.cross && tw > 0.6) {
        const armLen = sz * (1.5 + tw * 2.5);
        ctx.fillRect(x - armLen / 2, y, armLen, 1);
        ctx.fillRect(x, y - armLen / 2, 1, armLen);
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillRect(x - armLen / 4, y, armLen / 2, 1);
        ctx.fillRect(x, y - armLen / 4, 1, armLen / 2);
      }
    }
    ctx.globalAlpha = 1;

    // Estrellas fugaces (vivas)
    for (const ss of this._shootingStars) {
      const k = ss.life / ss.maxLife;
      // Estela
      ctx.globalAlpha = 0.85 * k;
      const trailLen = 80;
      const dx = ss.vx > 0 ? -trailLen : trailLen;
      const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x + dx, ss.y - (ss.vy / 2));
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, this.world === 'neon' ? '#ff85c5' : '#a8f0ff');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x + dx, ss.y - (ss.vy / 2));
      ctx.stroke();
      // Cabeza brillante
      ctx.globalAlpha = k;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ss.x - 2, ss.y - 2, 4, 4);
      // Halo
      const headHalo = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 14);
      headHalo.addColorStop(0, '#ffffff');
      headHalo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = headHalo;
      ctx.fillRect(ss.x - 14, ss.y - 14, 28, 28);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  // ============================================================
  // NUBES / NEBLINA (city, neon, storm)
  // ============================================================
  _ensureClouds() {
    if (this._clouds) return;
    if (this.world !== 'city' && this.world !== 'neon' && this.world !== 'storm') {
      this._clouds = false;
      return;
    }
    const rng = _seedRand(this.level.id * 113 + 47);
    const clouds = [];
    const tint = this.world === 'neon' ? '#3a1a55'
               : this.world === 'storm' ? '#2a2540'
               : '#3a2a55';
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: rng() * 1200,
        y: 30 + rng() * 180,
        scale: 0.7 + rng() * 1.4,
        speed: 6 + rng() * 14,
        tint,
        alpha: 0.35 + rng() * 0.35,
      });
    }
    this._clouds = clouds;
  }

  _drawClouds(ctx, cam, viewW, viewH, t) {
    this._ensureClouds();
    if (!this._clouds || this._clouds === false) return;
    const scroll = cam.x * 0.25;
    for (const c of this._clouds) {
      const x = ((c.x - scroll + t * c.speed) % (viewW + 400) + (viewW + 400)) % (viewW + 400) - 200;
      ctx.globalAlpha = c.alpha;
      // Cuerpo de nube (varias bolas)
      ctx.fillStyle = c.tint;
      const s = c.scale;
      ctx.beginPath();
      ctx.arc(x, c.y, 28 * s, 0, Math.PI * 2);
      ctx.arc(x + 30 * s, c.y - 8 * s, 32 * s, 0, Math.PI * 2);
      ctx.arc(x + 60 * s, c.y, 26 * s, 0, Math.PI * 2);
      ctx.arc(x + 18 * s, c.y + 6 * s, 24 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // PARALLAX CACHE — 3 capas
  // ============================================================
  _ensureParallax(viewW, viewH) {
    if (this._parallax && this._cacheW === viewW && this._cacheH === viewH) return;
    const W = viewW * 2;
    const make = () => {
      const off = document.createElement('canvas');
      off.width = W; off.height = viewH;
      return off;
    };
    const far = make(), mid = make(), near = make();

    if (this.world === 'city')      this._renderCity(far.getContext('2d'), mid.getContext('2d'), near.getContext('2d'), W, viewH);
    else if (this.world === 'park') this._renderPark(far.getContext('2d'), mid.getContext('2d'), near.getContext('2d'), W, viewH);
    else if (this.world === 'sewer')this._renderSewer(far.getContext('2d'), mid.getContext('2d'), near.getContext('2d'), W, viewH);
    else if (this.world === 'roof') this._renderRoof(far.getContext('2d'), mid.getContext('2d'), near.getContext('2d'), W, viewH);
    else if (this.world === 'neon') this._renderNeon(far.getContext('2d'), mid.getContext('2d'), near.getContext('2d'), W, viewH);
    else if (this.world === 'storm')this._renderStorm(far.getContext('2d'), mid.getContext('2d'), near.getContext('2d'), W, viewH);

    this._parallax = { far, mid, near };
    this._cacheW = viewW; this._cacheH = viewH;
  }

  // ----- CITY -----
  _renderCity(far, mid, near, W, H) {
    const rng = _seedRand(101);
    // Luna con halo grande
    const moonX = W * 0.15, moonY = 80;
    const moonHalo = far.createRadialGradient(moonX, moonY, 0, moonX, moonY, 90);
    moonHalo.addColorStop(0, 'rgba(255,247,214,0.45)');
    moonHalo.addColorStop(1, 'rgba(255,247,214,0)');
    far.fillStyle = moonHalo;
    far.fillRect(moonX - 90, moonY - 90, 180, 180);
    far.fillStyle = '#fff7d6';
    far.beginPath(); far.arc(moonX, moonY, 32, 0, Math.PI * 2); far.fill();
    far.fillStyle = '#e8d8a0';
    far.beginPath(); far.arc(moonX - 8, moonY - 6, 4, 0, Math.PI * 2); far.fill();
    far.beginPath(); far.arc(moonX + 6, moonY + 10, 5, 0, Math.PI * 2); far.fill();

    // Edificios lejanos (silueta plana, oscura)
    for (let i = 0; i < W / 90 + 1; i++) {
      const bx = i * 90 + (rng() * 20);
      const bh = 140 + rng() * 100;
      far.fillStyle = '#0e0820';
      far.fillRect(bx, H - bh, 80, bh);
      far.fillStyle = '#1c1338';
      far.fillRect(bx, H - bh, 80, 4);
    }

    // Edificios medios con ventanas luminosas
    for (let i = 0; i < W / 160 + 1; i++) {
      const bx = i * 160 + 10;
      const bh = 220 + rng() * 130;
      mid.fillStyle = '#1c1338';
      mid.fillRect(bx, H - bh, 140, bh);
      mid.fillStyle = '#2b1f55';
      mid.fillRect(bx, H - bh, 140, 6);
      // Ventanas
      for (let wy = H - bh + 20; wy < H - 30; wy += 24) {
        for (let wx = bx + 12; wx < bx + 130; wx += 22) {
          const lit = ((wx + wy + i * 7) % 9) < 4;
          if (!lit) continue;
          mid.fillStyle = '#ffd14f';
          mid.fillRect(wx, wy, 8, 12);
          // Halo de la ventana
          mid.fillStyle = 'rgba(255,209,79,0.18)';
          mid.fillRect(wx - 2, wy - 2, 12, 16);
        }
      }
      // Antena
      mid.fillStyle = '#444';
      mid.fillRect(bx + 70, H - bh - 18, 2, 18);
      mid.fillStyle = '#ff4fa3';
      mid.fillRect(bx + 68, H - bh - 22, 6, 4);
    }

    // Edificios cercanos (más detalle)
    for (let i = 0; i < W / 240 + 1; i++) {
      const bx = i * 240 + 50;
      const bh = 320 + rng() * 80;
      near.fillStyle = '#06030f';
      near.fillRect(bx, H - bh, 180, bh);
      near.fillStyle = '#1a0e30';
      near.fillRect(bx, H - bh, 180, 8);
      // Ventanas grandes
      for (let wy = H - bh + 30; wy < H - 60; wy += 32) {
        for (let wx = bx + 18; wx < bx + 170; wx += 28) {
          const lit = ((wx * 3 + wy + i * 5) % 11) < 5;
          if (!lit) continue;
          const cyan = ((wx + wy) % 17) < 4;
          near.fillStyle = cyan ? '#6cf0ff' : '#ffd14f';
          near.fillRect(wx, wy, 12, 16);
          near.fillStyle = cyan ? 'rgba(108,240,255,0.25)' : 'rgba(255,209,79,0.25)';
          near.fillRect(wx - 3, wy - 3, 18, 22);
        }
      }
      // Cartel de neón ocasional
      if (i % 2 === 0) {
        near.fillStyle = '#ff4fa3';
        near.fillRect(bx + 30, H - bh + 60, 50, 8);
        near.fillStyle = 'rgba(255,79,163,0.4)';
        near.fillRect(bx + 26, H - bh + 56, 58, 16);
      }
    }
  }

  // ----- PARK -----
  _renderPark(far, mid, near, W, H) {
    // Luna pálida
    far.fillStyle = '#e9f0d6';
    far.beginPath(); far.arc(W * 0.7, 70, 28, 0, Math.PI * 2); far.fill();
    const moonHalo = far.createRadialGradient(W * 0.7, 70, 0, W * 0.7, 70, 80);
    moonHalo.addColorStop(0, 'rgba(233,240,214,0.35)');
    moonHalo.addColorStop(1, 'rgba(0,0,0,0)');
    far.fillStyle = moonHalo;
    far.fillRect(W * 0.7 - 80, -10, 160, 160);

    // Colinas lejanas
    far.fillStyle = '#1a3d2a';
    for (let i = 0; i < W / 320 + 1; i++) {
      const bx = i * 320;
      far.beginPath();
      far.moveTo(bx, H);
      far.quadraticCurveTo(bx + 160, H - 240, bx + 320, H);
      far.fill();
    }
    // Niebla entre colinas
    far.fillStyle = 'rgba(120,200,150,0.08)';
    far.fillRect(0, H - 130, W, 60);

    // Bosque medio
    mid.fillStyle = '#0e2418';
    for (let i = 0; i < W / 110 + 1; i++) {
      const bx = i * 110;
      mid.fillRect(bx + 60, H - 200, 14, 200);
      mid.beginPath(); mid.arc(bx + 67, H - 210, 60, 0, Math.PI * 2); mid.fill();
      mid.fillStyle = '#1a3a25';
      mid.beginPath(); mid.arc(bx + 50, H - 220, 26, 0, Math.PI * 2); mid.fill();
      mid.fillStyle = '#0e2418';
    }

    // Árboles cercanos con detalle
    for (let i = 0; i < W / 200 + 1; i++) {
      const bx = i * 200 + 60;
      // tronco
      near.fillStyle = '#3a2410';
      near.fillRect(bx, H - 180, 18, 180);
      near.fillStyle = '#4a3018';
      near.fillRect(bx, H - 180, 4, 180);
      // copa
      near.fillStyle = '#2a5a30';
      near.beginPath(); near.arc(bx + 9, H - 200, 70, 0, Math.PI * 2); near.fill();
      near.fillStyle = '#1f4a25';
      near.beginPath(); near.arc(bx - 20, H - 220, 30, 0, Math.PI * 2); near.fill();
      near.beginPath(); near.arc(bx + 36, H - 215, 28, 0, Math.PI * 2); near.fill();
      // hojas brillantes
      near.fillStyle = '#5fb24a';
      near.beginPath(); near.arc(bx + 30, H - 230, 8, 0, Math.PI * 2); near.fill();
      near.beginPath(); near.arc(bx - 14, H - 200, 6, 0, Math.PI * 2); near.fill();
    }
  }

  // ----- SEWER -----
  _renderSewer(far, mid, near, W, H) {
    // Pared lejana de losetas oscuras
    far.fillStyle = '#0c0820';
    far.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 12) {
      for (let x = 0; x < W; x += 24) {
        if ((x + y) % 24 === 0) {
          far.fillStyle = '#1a132d';
          far.fillRect(x, y, 22, 10);
        }
      }
    }

    // Tuberías horizontales con brillos
    mid.fillStyle = '#241a3a';
    for (let i = 0; i < W / 60 + 1; i++) {
      mid.fillRect(i * 60, 0, 50, H);
      mid.fillStyle = '#3a2a55';
      mid.fillRect(i * 60, 0, 3, H);
      mid.fillStyle = '#241a3a';
    }
    // Anillos en las tuberías
    mid.fillStyle = '#1a1130';
    for (let y = 60; y < H; y += 90) {
      mid.fillRect(0, y, W, 6);
      mid.fillStyle = '#3a2a55';
      mid.fillRect(0, y, W, 1);
      mid.fillStyle = '#1a1130';
    }

    // Arcos cercanos
    near.fillStyle = '#0a0618';
    for (let i = 0; i < W / 220 + 1; i++) {
      const bx = i * 220;
      near.beginPath(); near.arc(bx + 110, H - 60, 100, Math.PI, Math.PI * 2); near.fill();
      // borde luminoso
      near.strokeStyle = '#3a2c5c';
      near.lineWidth = 2;
      near.beginPath(); near.arc(bx + 110, H - 60, 100, Math.PI, Math.PI * 2); near.stroke();
    }
    near.lineWidth = 1;

    // Brillos puntuales
    for (let i = 0; i < 60; i++) {
      const x = (i * 137) % W;
      const y = (i * 53) % (H - 80) + 40;
      near.fillStyle = i % 3 === 0 ? '#6cf0ff' : '#3a2c5c';
      near.fillRect(x, y, 2, 2);
    }
  }

  // ----- ROOF -----
  _renderRoof(far, mid, near, W, H) {
    // Skyline lejano
    for (let i = 0; i < W / 200 + 1; i++) {
      const bx = i * 200;
      const bh = 160 + ((i * 41) % 90);
      far.fillStyle = '#0a061a';
      far.fillRect(bx, H - bh, 130, bh);
      // ventanas pequeñísimas púrpura
      for (let wy = H - bh + 15; wy < H - 20; wy += 26) {
        for (let wx = bx + 8; wx < bx + 122; wx += 16) {
          if ((wx + wy + i) % 4 < 2) {
            far.fillStyle = '#a36ad8';
            far.fillRect(wx, wy, 5, 8);
          }
        }
      }
    }

    // Edificios medios con ventanas iluminadas
    for (let i = 0; i < W / 250 + 1; i++) {
      const bx = i * 250 + 40;
      const bh = 280 + ((i * 53) % 60);
      mid.fillStyle = '#180a30';
      mid.fillRect(bx, H - bh, 180, bh);
      mid.fillStyle = '#2a1148';
      mid.fillRect(bx, H - bh, 180, 6);
      for (let wy = H - bh + 25; wy < H - 50; wy += 30) {
        for (let wx = bx + 16; wx < bx + 170; wx += 24) {
          if ((wx + wy + i * 3) % 5 < 2) {
            mid.fillStyle = '#c98aff';
            mid.fillRect(wx, wy, 8, 12);
            mid.fillStyle = 'rgba(201,138,255,0.25)';
            mid.fillRect(wx - 2, wy - 2, 12, 16);
          }
        }
      }
    }

    // Borde de la azotea cercana (silueta)
    near.fillStyle = '#0a061a';
    for (let i = 0; i < W / 300 + 1; i++) {
      const bx = i * 300;
      const bh = 80;
      near.fillRect(bx, H - bh, 280, bh);
      // antenas y vallas
      near.fillStyle = '#3a2a55';
      near.fillRect(bx + 30, H - bh - 24, 2, 24);
      near.fillRect(bx + 100, H - bh - 18, 2, 18);
      near.fillRect(bx + 200, H - bh - 30, 2, 30);
      near.fillStyle = '#ff4fa3';
      near.fillRect(bx + 30 - 2, H - bh - 26, 6, 3);
      near.fillStyle = '#0a061a';
    }
  }

  // ----- NEON (nuevo) -----
  _renderNeon(far, mid, near, W, H) {
    // Cielo púrpura con neblina rosa lejana
    far.fillStyle = 'rgba(120,30,90,0.15)';
    far.fillRect(0, H * 0.4, W, H * 0.6);

    // Hologramas distantes
    for (let i = 0; i < W / 280 + 1; i++) {
      const bx = i * 280 + 40;
      const bh = 200 + (i * 37) % 80;
      far.fillStyle = '#1a0828';
      far.fillRect(bx, H - bh, 100, bh);
      // banda de neón en el techo
      far.fillStyle = i % 2 === 0 ? '#ff4fa3' : '#6cf0ff';
      far.fillRect(bx, H - bh, 100, 4);
      far.fillStyle = i % 2 === 0 ? 'rgba(255,79,163,0.35)' : 'rgba(108,240,255,0.35)';
      far.fillRect(bx - 4, H - bh - 4, 108, 12);
    }

    // Rascacielos medios con neón intenso
    for (let i = 0; i < W / 180 + 1; i++) {
      const bx = i * 180 + 20;
      const bh = 320 + (i * 53) % 100;
      mid.fillStyle = '#0a0220';
      mid.fillRect(bx, H - bh, 140, bh);
      mid.fillStyle = '#220a40';
      mid.fillRect(bx, H - bh, 140, 6);

      // Letrero vertical de neón con rectángulos pulsantes
      const neonColor = ['#ff4fa3', '#6cf0ff', '#ffd14f', '#a86dff'][i % 4];
      mid.fillStyle = neonColor;
      mid.fillRect(bx + 12, H - bh + 30, 5, bh - 80);
      mid.fillStyle = neonColor + (typeof neonColor === 'string' && neonColor.length === 7 ? '44' : '');
      // halo
      mid.fillRect(bx + 10, H - bh + 28, 9, bh - 76);

      // Ventanas
      for (let wy = H - bh + 20; wy < H - 40; wy += 22) {
        for (let wx = bx + 30; wx < bx + 130; wx += 18) {
          const lit = ((wx + wy + i * 11) % 7) < 3;
          if (!lit) continue;
          const c = (wx + wy) % 13 < 4 ? '#ff85c5' : '#6cf0ff';
          mid.fillStyle = c;
          mid.fillRect(wx, wy, 6, 9);
          mid.fillStyle = c + '55';
          mid.fillRect(wx - 1, wy - 1, 8, 11);
        }
      }
    }

    // Cables suspendidos cercanos
    near.strokeStyle = '#1a0828';
    near.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const yBase = 40 + i * 18;
      near.beginPath();
      near.moveTo(0, yBase);
      for (let x = 0; x < W; x += 40) {
        near.lineTo(x, yBase + Math.sin(x * 0.02 + i) * 6);
      }
      near.stroke();
    }
    // Faroles colgantes
    for (let i = 0; i < W / 220 + 1; i++) {
      const x = i * 220 + 60;
      near.fillStyle = '#ffd14f';
      near.fillRect(x - 4, 90, 8, 12);
      near.fillStyle = 'rgba(255,209,79,0.35)';
      near.fillRect(x - 10, 86, 20, 22);
    }
    near.lineWidth = 1;
  }

  // ----- STORM (nuevo) -----
  _renderStorm(far, mid, near, W, H) {
    // Cielo tormentoso lejano con nubes oscuras
    far.fillStyle = '#1a1235';
    for (let i = 0; i < 6; i++) {
      const cx = (i * 250 + 50) % W;
      const cy = 80 + (i * 23) % 80;
      far.beginPath(); far.arc(cx, cy, 60, 0, Math.PI * 2); far.fill();
      far.beginPath(); far.arc(cx + 50, cy + 10, 50, 0, Math.PI * 2); far.fill();
      far.beginPath(); far.arc(cx - 40, cy + 5, 45, 0, Math.PI * 2); far.fill();
    }

    // Skyline distante en silueta
    mid.fillStyle = '#0a0a25';
    for (let i = 0; i < W / 180 + 1; i++) {
      const bx = i * 180;
      const bh = 220 + (i * 41) % 100;
      mid.fillRect(bx, H - bh, 130, bh);
      // antenas y rayos rojos arriba
      mid.fillStyle = '#3a2a55';
      mid.fillRect(bx + 60, H - bh - 16, 2, 16);
      mid.fillStyle = '#ff4fa3';
      mid.fillRect(bx + 58, H - bh - 18, 6, 3);
      mid.fillStyle = '#0a0a25';
    }

    // Borde de tejados cercano
    near.fillStyle = '#06061a';
    for (let i = 0; i < W / 260 + 1; i++) {
      const bx = i * 260;
      near.fillRect(bx, H - 110, 220, 110);
      // chimeneas
      near.fillStyle = '#1a1230';
      near.fillRect(bx + 40, H - 140, 14, 30);
      near.fillRect(bx + 150, H - 130, 12, 20);
      near.fillStyle = '#06061a';
    }
  }

  _drawNeonHaze(ctx, cam, viewW, viewH, t) {
    // Halo pulsante general en el aire (rosa)
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
    ctx.fillStyle = `rgba(255,79,163,${0.04 + pulse * 0.04})`;
    ctx.fillRect(0, 0, viewW, viewH);

    // Pequeñas partículas que flotan
    const N = 14;
    for (let i = 0; i < N; i++) {
      const x = ((i * 173 + t * 30) % viewW + viewW) % viewW;
      const y = ((i * 91) % viewH + Math.sin(t * 2 + i) * 8 + viewH) % viewH;
      ctx.fillStyle = i % 2 === 0 ? '#ff85c5' : '#6cf0ff';
      ctx.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.3;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  _drawStormFlash(ctx, viewW, viewH) {
    if (this._lightningFlash <= 0) return;
    const k = this._lightningFlash / 0.35;
    ctx.fillStyle = `rgba(220,220,255,${0.55 * k})`;
    ctx.fillRect(0, 0, viewW, viewH);
    // Rayo zigzag
    if (k > 0.6) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      let x = 100 + Math.random() * (viewW - 200);
      let y = 0;
      ctx.moveTo(x, y);
      while (y < viewH * 0.7) {
        y += 20 + Math.random() * 30;
        x += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  _drawSewerDrips(ctx, cam, viewW, viewH, t) {
    ctx.fillStyle = 'rgba(108,240,255,0.35)';
    const tt = t * 80;
    for (let i = 0; i < 22; i++) {
      const x = (i * 73 + cam.x * 0.1) % viewW;
      const y = (i * 131 + tt) % viewH;
      ctx.fillRect(x, y, 2, 6);
    }
    // Pequeñas salpicaduras al fondo
    ctx.fillStyle = 'rgba(108,240,255,0.18)';
    for (let i = 0; i < 8; i++) {
      const x = (i * 137 + cam.x * 0.05) % viewW;
      const y = viewH - 40 - (i * 17) % 40;
      ctx.fillRect(x, y, 4, 1);
    }
  }

  // ============================================================
  // FOREGROUND (vignette + lluvia/niebla — tras pintar entidades)
  // ============================================================
  drawForeground(ctx, cam, viewW, viewH, t) {
    // Lluvia diagonal en storm world
    if (this.world === 'storm') {
      ctx.strokeStyle = 'rgba(180,200,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 80; i++) {
        const x = (i * 53 + cam.x * 0.3 + t * 600) % (viewW + 80) - 40;
        const y = (i * 37 + t * 800) % viewH;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + 14);
        ctx.stroke();
      }
    }

    // Vignette suave en TODOS los mundos
    const vg = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.45,
                                         viewW / 2, viewH / 2, viewH * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, viewW, viewH);

    // Línea de scanlines sutiles (estética CRT/retro)
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = 0; y < viewH; y += 4) {
      ctx.fillRect(0, y, viewW, 1);
    }
  }

  // ============================================================
  // TILES con biselado y glow en cajas
  // ============================================================
  drawTiles(ctx, cam, viewW, viewH, t) {
    const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const c1 = Math.min(this.cols, Math.ceil((cam.x + viewW) / TILE) + 1);
    const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const r1 = Math.min(this.rows, Math.ceil((cam.y + viewH) / TILE) + 1);

    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        const v = this.get(c, r);
        if (v === T.EMPTY) continue;

        const bump = this.bumpAnim.get(`${c},${r}`);
        const oy = bump ? -Math.sin((bump.t / 0.25) * Math.PI) * 8 : 0;

        const px = c * TILE - cam.x;
        const py = r * TILE - cam.y + oy;

        // Mystery box con halo brillante en modo "lleno"
        if (v === T.MYSTERY || v === T.MYSTERY_POWER || v === T.MYSTERY_HP) {
          const glow = 0.5 + 0.5 * Math.sin(t * 5 + c + r);
          const gColor = v === T.MYSTERY_HP ? '#6cf0ff'
                       : v === T.MYSTERY_POWER ? '#ff4fa3' : '#ffd14f';
          ctx.fillStyle = gColor + Math.floor(20 + glow * 35).toString(16).padStart(2, '0');
          ctx.fillRect(px - 4, py - 4, TILE + 8, TILE + 8);
        }

        switch (v) {
          case T.GROUND: drawGround(ctx, px, py, TILE, this.world); break;
          case T.PLATFORM: drawPlatform(ctx, px, py, TILE, this.world); break;
          case T.BRICK: drawBrick(ctx, px, py, TILE); break;
          case T.MYSTERY:
          case T.MYSTERY_POWER:
          case T.MYSTERY_HP: {
            const blink = (Math.floor(t * 4) % 2) === 0;
            drawMysteryBox(ctx, px, py, TILE, { blink });
            break;
          }
          case T.EMPTY_BOX: drawMysteryBox(ctx, px, py, TILE, { empty: true }); break;
        }
      }
    }
  }
}
