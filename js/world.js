// Tipos y constantes de tilemap, fondos parallax y render de tiles.

const TILE = 40; // px por celda (era 32 — 25% más grande para mejor legibilidad)

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

class World {
  constructor(level) {
    this.level = level;
    this.world = level.world;
    this.cols = level.cols;
    this.rows = level.rowsCount;
    this.timeLimit = level.timeLimit;
    this.tiles = new Uint8Array(this.cols * this.rows);
    this.bumpAnim = new Map(); // key="col,row" -> {t, dir} para animación al golpear

    // Listas para spawnear entidades (se procesan desde main al cargar)
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
          default: /* vacío */ break;
        }
      }
    }

    this.widthPx = this.cols * TILE;
    this.heightPx = this.rows * TILE;

    // Cache de parallax: pre-renderizamos las capas estáticas
    // (edificios, colinas, árboles) a un offscreen canvas. Solo la
    // capa más cercana se redibuja en tiempo real con offset.
    this._parallaxCache = null;
    this._parallaxCacheW = 0;
    this._parallaxCacheH = 0;
  }

  idx(c, r) { return r * this.cols + c; }
  inBounds(c, r) { return c >= 0 && c < this.cols && r >= 0 && r < this.rows; }
  get(c, r) { return this.inBounds(c, r) ? this.tiles[this.idx(c, r)] : T.EMPTY; }
  set(c, r, v) { if (this.inBounds(c, r)) this.tiles[this.idx(c, r)] = v; }

  isSolid(c, r) {
    const v = this.get(c, r);
    return SOLID.has(v);
  }

  // Plataformas son sólidas solo desde arriba — útil para "saltar a través".
  isOneWay(c, r) { return this.get(c, r) === T.PLATFORM; }

  // Devuelve {x, y, w, h} del rectángulo del tile en píxeles.
  tileRect(c, r) { return { x: c * TILE, y: r * TILE, w: TILE, h: TILE }; }

  /**
   * Maneja un golpe de cabeza desde abajo en (col,row).
   * Devuelve un objeto describiendo qué pasó:
   *   { kind: 'coin'|'powerup'|'headphones'|'brick'|'none', x, y }
   */
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
      // Si Mía es pequeña: bebida. Si ya es grande: auriculares.
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
        // Mía grande rompe el ladrillo
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
  }

  // ----- render -----
  drawBackground(ctx, cam, viewW, viewH, t) {
    // Gradiente de cielo (rápido, lo redibujamos cada frame).
    const [c1, c2] = this.level.bgColor;
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    // Cache de parallax: una sola tira ancha (3× viewW) que se repite
    // según offset. Lo creamos una vez por nivel.
    this._ensureParallaxCache(viewW, viewH);

    // Pintamos el cache con offset wrap-around horizontal según cam.x.
    const cacheW = this._parallaxCache.width;
    const offset = -((cam.x * 0.3) % cacheW);
    ctx.drawImage(this._parallaxCache, offset, 0);
    if (offset + cacheW < viewW) {
      ctx.drawImage(this._parallaxCache, offset + cacheW, 0);
    }

    // Capa "viva" de detalles (estrellas titilando, gotas) — barata.
    if (this.world === 'roof') {
      this._drawRoofStars(ctx, viewW, viewH, t);
    } else if (this.world === 'sewer') {
      this._drawSewerDrips(ctx, cam, viewW, viewH);
    }
  }

  _ensureParallaxCache(viewW, viewH) {
    if (this._parallaxCache &&
        this._parallaxCacheW === viewW &&
        this._parallaxCacheH === viewH) return;

    // Tira de 2× viewW para que el wrap sea suave.
    const W = viewW * 2;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = viewH;
    const c = off.getContext('2d');

    if (this.world === 'city') this._renderCityToCache(c, W, viewH);
    else if (this.world === 'park') this._renderParkToCache(c, W, viewH);
    else if (this.world === 'sewer') this._renderSewerToCache(c, W, viewH);
    else if (this.world === 'roof') this._renderRoofToCache(c, W, viewH);

    this._parallaxCache = off;
    this._parallaxCacheW = viewW;
    this._parallaxCacheH = viewH;
  }

  _renderCityToCache(ctx, W, H) {
    // Luna
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath();
    ctx.arc(W * 0.18, 90, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(W * 0.18, 90, 56, 0, Math.PI * 2);
    ctx.fill();

    // Edificios lejanos (capa profunda)
    for (let i = 0; i < W / 160 + 1; i++) {
      const bx = i * 160;
      const bh = 240 + ((i * 53) % 130);
      ctx.fillStyle = '#1c1338';
      ctx.fillRect(bx, H - bh, 140, bh);
      ctx.fillStyle = '#ffd14f';
      for (let wy = H - bh + 20; wy < H - 30; wy += 28) {
        for (let wx = bx + 12; wx < bx + 130; wx += 24) {
          if (((wx + wy + i) % 5) < 2) ctx.fillRect(wx, wy, 8, 12);
        }
      }
    }
    // Edificios cercanos (encima)
    for (let i = 0; i < W / 220 + 1; i++) {
      const bx = i * 220 + 30;
      const bh = 340 + ((i * 71) % 90);
      ctx.fillStyle = '#0e0820';
      ctx.fillRect(bx, H - bh, 160, bh);
      ctx.fillStyle = '#3a2a8a';
      for (let wy = H - bh + 30; wy < H - 60; wy += 36) {
        for (let wx = bx + 20; wx < bx + 150; wx += 32) {
          if (((wx * 3 + wy + i) % 7) < 3) ctx.fillRect(wx, wy, 12, 16);
        }
      }
      // Antena
      ctx.fillStyle = '#444';
      ctx.fillRect(bx + 80, H - bh - 18, 2, 18);
      ctx.fillStyle = '#ff4fa3';
      ctx.fillRect(bx + 78, H - bh - 20, 6, 4);
    }
  }

  _renderParkToCache(ctx, W, H) {
    // Colinas
    ctx.fillStyle = '#1a3d2a';
    for (let i = 0; i < W / 320 + 1; i++) {
      const bx = i * 320;
      ctx.beginPath();
      ctx.moveTo(bx, H);
      ctx.quadraticCurveTo(bx + 160, H - 220, bx + 320, H);
      ctx.fill();
    }
    // Árboles oscuros
    ctx.fillStyle = '#0e2418';
    for (let i = 0; i < W / 180 + 1; i++) {
      const bx = i * 180;
      ctx.fillRect(bx + 60, H - 170, 12, 170);
      ctx.beginPath();
      ctx.arc(bx + 66, H - 180, 54, 0, Math.PI * 2);
      ctx.fill();
    }
    // Luna pálida
    ctx.fillStyle = '#e9f0d6';
    ctx.beginPath();
    ctx.arc(W * 0.7, 70, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderSewerToCache(ctx, W, H) {
    // Tuberías verticales
    ctx.fillStyle = '#241a3a';
    for (let i = 0; i < W / 80 + 1; i++) {
      ctx.fillRect(i * 80, 0, 60, H);
    }
    // Arcos
    ctx.fillStyle = '#0c0820';
    for (let i = 0; i < W / 200 + 1; i++) {
      const bx = i * 200;
      ctx.beginPath();
      ctx.arc(bx + 100, H - 60, 95, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    // Brillos
    ctx.fillStyle = '#3a2c5c';
    for (let i = 0; i < W / 40; i++) {
      const x = (i * 137) % W;
      const y = (i * 53) % (H - 80) + 40;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  _renderRoofToCache(ctx, W, H) {
    // Skyline lejanísima
    ctx.fillStyle = '#0a061a';
    for (let i = 0; i < W / 240 + 1; i++) {
      const bx = i * 240;
      const bh = 180 + ((i * 41) % 90);
      ctx.fillRect(bx, H - bh, 130, bh);
      ctx.fillStyle = '#a36ad8';
      for (let wy = H - bh + 20; wy < H - 20; wy += 30) {
        for (let wx = bx + 10; wx < bx + 120; wx += 18) {
          if ((wx + wy + i) % 4 < 2) ctx.fillRect(wx, wy, 6, 10);
        }
      }
      ctx.fillStyle = '#0a061a';
    }
  }

  _drawRoofStars(ctx, viewW, viewH, t) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      const x = (i * 137) % viewW;
      const y = (i * 53) % (viewH * 0.6);
      const tw = 0.5 + 0.5 * Math.sin(t * 4 + i);
      ctx.globalAlpha = 0.3 + tw * 0.6;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  _drawSewerDrips(ctx, cam, viewW, viewH) {
    ctx.fillStyle = 'rgba(108,240,255,0.25)';
    const tt = Date.now() * 0.05;
    for (let i = 0; i < 18; i++) {
      const x = (i * 73 + cam.x * 0.1) % viewW;
      const y = (i * 131 + tt) % viewH;
      ctx.fillRect(x, y, 2, 5);
    }
  }

  drawTiles(ctx, cam, viewW, viewH, t) {
    const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const c1 = Math.min(this.cols, Math.ceil((cam.x + viewW) / TILE) + 1);
    const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const r1 = Math.min(this.rows, Math.ceil((cam.y + viewH) / TILE) + 1);

    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        const v = this.get(c, r);
        if (v === T.EMPTY) continue;

        // bump animation offset
        const bump = this.bumpAnim.get(`${c},${r}`);
        const oy = bump ? -Math.sin((bump.t / 0.25) * Math.PI) * 8 : 0;

        const px = c * TILE - cam.x;
        const py = r * TILE - cam.y + oy;

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
