// Entidades del mundo: monedas, power-ups, notas musicales, meta y mochila.

class Coin {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 24; this.h = 24;
    this.collected = false;
    this.t = 0;
  }
  get aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt) { this.t += dt; }
  draw(ctx, cam) {
    drawCoin(ctx, this.x - cam.x + 4, this.y - cam.y + 4, 24, this.t);
  }
}

// Moneda volátil que aparece al golpear caja misteriosa.
class PopCoin {
  constructor(x, y) {
    this.x = x - 12; this.y = y - 24;
    this.vy = -360; this.vx = 0;
    this.w = 24; this.h = 24;
    this.t = 0;
    this.life = 0.7;
    this.collected = true; // no necesita ser recolectada — se cuenta al spawnear
  }
  update(dt) {
    this.t += dt;
    this.life -= dt;
    this.vy += 1400 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  get done() { return this.life <= 0; }
  draw(ctx, cam) {
    drawCoin(ctx, this.x - cam.x, this.y - cam.y, 24, this.t);
  }
}

// Power-up que sube de la caja y luego camina horizontal cayendo por gravedad.
class PowerUp {
  constructor(x, y, kind) {
    this.kind = kind; // 'energy' | 'headphones'
    this.x = x - 14; this.y = y;
    this.w = 28; this.h = 28;
    this.vx = 0;
    this.vy = -120;
    this.t = 0;
    this.spawnPhase = 0.5; // tiempo subiendo de la caja
    this.collected = false;
  }
  get aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt, world) {
    this.t += dt;
    if (this.spawnPhase > 0) {
      this.spawnPhase -= dt;
      this.y += this.vy * dt;
      if (this.spawnPhase <= 0) {
        this.vy = 0;
        this.vx = 90;
      }
      return;
    }
    this.vy += 1400 * dt;
    if (this.vy > 500) this.vy = 500;
    // X
    this.x += this.vx * dt;
    let l = Math.floor(this.x / TILE);
    let r = Math.floor((this.x + this.w - 1) / TILE);
    let tt = Math.floor(this.y / TILE);
    let bb = Math.floor((this.y + this.h - 1) / TILE);
    for (let row = tt; row <= bb; row++) {
      for (let col = l; col <= r; col++) {
        if (!world.isSolid(col, row) || world.isOneWay(col, row)) continue;
        const tile = world.tileRect(col, row);
        if (this.vx > 0) this.x = tile.x - this.w;
        else if (this.vx < 0) this.x = tile.x + tile.w;
        this.vx = -this.vx;
      }
    }
    // Y
    this.y += this.vy * dt;
    l = Math.floor(this.x / TILE);
    r = Math.floor((this.x + this.w - 1) / TILE);
    tt = Math.floor(this.y / TILE);
    bb = Math.floor((this.y + this.h - 1) / TILE);
    for (let row = tt; row <= bb; row++) {
      for (let col = l; col <= r; col++) {
        if (!world.isSolid(col, row)) continue;
        const tile = world.tileRect(col, row);
        const isOneWay = world.isOneWay(col, row);
        if (this.vy > 0) {
          if (isOneWay) {
            const prevBottom = this.y + this.h - this.vy * dt;
            if (prevBottom > tile.y + 1) continue;
          }
          this.y = tile.y - this.h; this.vy = 0;
        } else if (this.vy < 0) {
          if (isOneWay) continue;
          this.y = tile.y + tile.h; this.vy = 0;
        }
      }
    }
  }
  draw(ctx, cam) {
    if (this.kind === 'energy') {
      drawEnergyDrink(ctx, this.x - cam.x, this.y - cam.y, this.w);
    } else {
      drawHeadphonesItem(ctx, this.x - cam.x, this.y - cam.y, this.w);
    }
  }
}

// Proyectil "nota musical" — rebota en el suelo y puede destruir cactus.
class MusicNote {
  constructor(x, y, dir) {
    this.x = x; this.y = y;
    this.w = 20; this.h = 20;
    this.vx = dir * 460;
    this.vy = -80;
    this.life = 2.5;
    this.t = 0;
    this.dead = false;
  }
  get aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt, world) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vy += 1400 * dt;
    if (this.vy > 600) this.vy = 600;
    // X
    this.x += this.vx * dt;
    let l = Math.floor(this.x / TILE);
    let r = Math.floor((this.x + this.w - 1) / TILE);
    let tt = Math.floor(this.y / TILE);
    let bb = Math.floor((this.y + this.h - 1) / TILE);
    for (let row = tt; row <= bb; row++) {
      for (let col = l; col <= r; col++) {
        if (!world.isSolid(col, row) || world.isOneWay(col, row)) continue;
        // contra muro: muere
        this.dead = true;
        return;
      }
    }
    // Y
    this.y += this.vy * dt;
    l = Math.floor(this.x / TILE);
    r = Math.floor((this.x + this.w - 1) / TILE);
    tt = Math.floor(this.y / TILE);
    bb = Math.floor((this.y + this.h - 1) / TILE);
    for (let row = tt; row <= bb; row++) {
      for (let col = l; col <= r; col++) {
        if (!world.isSolid(col, row)) continue;
        const tile = world.tileRect(col, row);
        const isOneWay = world.isOneWay(col, row);
        if (this.vy > 0) {
          if (isOneWay) {
            const prevBottom = this.y + this.h - this.vy * dt;
            if (prevBottom > tile.y + 1) continue;
          }
          this.y = tile.y - this.h;
          this.vy = -440; // rebote
        } else if (this.vy < 0) {
          if (isOneWay) continue;
          this.y = tile.y + tile.h;
          this.vy = 80;
        }
      }
    }
  }
  draw(ctx, cam) {
    drawMusicNote(ctx, this.x - cam.x, this.y - cam.y, this.w, this.t);
  }
}

// Meta — estación de tren / parada de autobús.
class Goal {
  constructor(col, row) {
    this.x = col * TILE - 16;
    this.y = row * TILE - TILE * 2;
    this.w = 64; this.h = 96;
    this.touched = false;
  }
  get aabb() { return { x: this.x + 12, y: this.y, w: 32, h: this.h }; }
  draw(ctx, cam) {
    drawGoal(ctx, this.x - cam.x, this.y - cam.y, 64, 128);
  }
}

// La mochila, recompensa final del jefe.
class Backpack {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 32; this.h = 32;
    this.collected = false;
    this.t = 0;
  }
  get aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt) { this.t += dt; this.y += Math.sin(this.t * 3) * 0.3; }
  draw(ctx, cam) {
    drawBackpack(ctx, this.x - cam.x, this.y - cam.y, this.w);
  }
}
