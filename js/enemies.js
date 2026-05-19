import { TILE } from './world.js';
import { drawSlime, drawCrow, drawCactus, drawRaccoonBoss } from './sprites.js';
import { SFX } from './audio.js';

// Helper: colisión vertical contra el world. Se usa para que enemies caigan
// y caminen sobre tiles sólidos. (Versión simple, no tan estricta como la
// del jugador.)
function collideTiles(ent, world) {
  // ejes separados
  // X
  ent.x += ent.vx * ent.dt;
  let l = Math.floor(ent.x / TILE);
  let r = Math.floor((ent.x + ent.w - 1) / TILE);
  let t = Math.floor(ent.y / TILE);
  let b = Math.floor((ent.y + ent.h - 1) / TILE);
  for (let row = t; row <= b; row++) {
    for (let col = l; col <= r; col++) {
      if (!world.isSolid(col, row) || world.isOneWay(col, row)) continue;
      const tile = world.tileRect(col, row);
      if (ent.vx > 0) ent.x = tile.x - ent.w;
      else if (ent.vx < 0) ent.x = tile.x + tile.w;
      ent.vx = -ent.vx;
      ent.facing = -ent.facing;
    }
  }

  // Y
  ent.y += ent.vy * ent.dt;
  ent.onGround = false;
  l = Math.floor(ent.x / TILE);
  r = Math.floor((ent.x + ent.w - 1) / TILE);
  t = Math.floor(ent.y / TILE);
  b = Math.floor((ent.y + ent.h - 1) / TILE);
  for (let row = t; row <= b; row++) {
    for (let col = l; col <= r; col++) {
      if (!world.isSolid(col, row)) continue;
      const tile = world.tileRect(col, row);
      const isOneWay = world.isOneWay(col, row);
      if (ent.vy > 0) {
        if (isOneWay) {
          const prevBottom = ent.y + ent.h - ent.vy * ent.dt;
          if (prevBottom > tile.y + 1) continue;
        }
        ent.y = tile.y - ent.h;
        ent.vy = 0;
        ent.onGround = true;
      } else if (ent.vy < 0) {
        if (isOneWay) continue;
        ent.y = tile.y + tile.h;
        ent.vy = 0;
      }
    }
  }
}

class Enemy {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.dead = false;
    this.deadTimer = 0;
    this.dt = 1 / 60;
    this.onGround = false;
    this.canStomp = true;
    this.kind = 'enemy';
  }
  get aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  killByStomp() { this.dead = true; this.deadTimer = 0; this.vy = -200; this.canStomp = false; SFX.stomp(); }
  killByProjectile() { this.dead = true; this.deadTimer = 0; this.vy = -260; this.vx = this.facing * 80; SFX.stomp(); }
}

// ---------- Slime de Basura ----------
export class Slime extends Enemy {
  constructor(x, y) {
    super(x, y, 28, 28);
    this.kind = 'slime';
    this.vx = -50;
    this.canBeStomped = true;
    this.canBeProjectiled = true;
    this.canBeDeflected = true;
  }
  update(dt, world) {
    this.dt = dt;
    if (this.dead) {
      this.deadTimer += dt;
      this.vy += 1800 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }
    this.vy += 1800 * dt;
    if (this.vy > 600) this.vy = 600;
    // Detectar borde del piso para no caerse:
    if (this.onGround) {
      const aheadX = Math.floor((this.x + (this.vx > 0 ? this.w + 1 : -1)) / TILE);
      const belowR = Math.floor((this.y + this.h + 2) / TILE);
      if (!world.isSolid(aheadX, belowR)) {
        this.vx = -this.vx;
        this.facing = -this.facing;
      }
    }
    collideTiles(this, world);
  }
  draw(ctx, cam, t) {
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x - cam.x + this.w / 2, this.y - cam.y + this.h / 2);
      ctx.scale(1, -1);
      drawSlime(ctx, -this.w / 2, -this.h / 2, this.w, this.h, {});
      ctx.restore();
      return;
    }
    const blink = (Math.floor(t * 6) % 7) === 0;
    drawSlime(ctx, this.x - cam.x, this.y - cam.y, this.w, this.h, { blink });
  }
}

// ---------- Cuervo Robacarteras ----------
export class Crow extends Enemy {
  constructor(x, y, flying) {
    super(x, y, 28, 28);
    this.kind = 'crow';
    this.flying = flying;
    this.shellMode = false;
    this.shellTimer = 0;
    this.shellMoving = false;
    this.flap = 0;
    this.baseY = y;
    this.tParam = 0;
    this.vx = flying ? 80 : -60;
    this.canBeStomped = true;
    this.canBeProjectiled = true;
    this.canBeDeflected = true;
  }
  killByStomp() {
    if (!this.shellMode) {
      // primer pisotón: convertir en concha
      this.shellMode = true;
      this.shellTimer = 8;
      this.shellMoving = false;
      this.vx = 0;
      this.vy = -100;
      this.flying = false;
      SFX.stomp();
      return;
    }
    if (this.shellMoving) {
      // pisotón sobre concha en movimiento -> detener
      this.shellMoving = false;
      this.vx = 0;
      SFX.stomp();
      return;
    }
    // pisotón sobre concha quieta -> patear
    // dirección depende de quién pisó (la sets desde main)
    this.shellMoving = true;
    this.vx = this.kickDir > 0 ? 360 : -360;
    SFX.stomp();
  }
  update(dt, world) {
    this.dt = dt;
    this.tParam += dt;
    if (this.dead) {
      this.deadTimer += dt;
      this.vy += 1800 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }
    if (this.shellMode) {
      this.shellTimer -= dt;
      if (this.shellTimer < 0 && !this.shellMoving) {
        // sale del modo concha
        this.shellMode = false;
        this.flying = false;
        this.vx = -60;
      }
    }
    if (this.flying) {
      // patrón sinusoidal
      this.vy = Math.sin(this.tParam * 3) * 120;
      this.flap = Math.floor(this.tParam * 6) % 4;
      this.x += this.vx * dt;
      this.y = this.baseY + Math.sin(this.tParam * 2) * 20;
      // rebotar contra muros sólidos
      const l = Math.floor(this.x / TILE);
      const r = Math.floor((this.x + this.w) / TILE);
      const row = Math.floor((this.y + this.h / 2) / TILE);
      if (world.isSolid(l, row) || world.isSolid(r, row)) {
        this.vx = -this.vx;
        this.facing = -this.facing;
      }
    } else {
      this.vy += 1800 * dt;
      if (this.vy > 600) this.vy = 600;
      if (this.onGround && !this.shellMode) {
        const aheadX = Math.floor((this.x + (this.vx > 0 ? this.w + 1 : -1)) / TILE);
        const belowR = Math.floor((this.y + this.h + 2) / TILE);
        if (!world.isSolid(aheadX, belowR)) {
          this.vx = -this.vx;
          this.facing = -this.facing;
        }
      }
      collideTiles(this, world);
    }
  }
  draw(ctx, cam, t) {
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x - cam.x + this.w / 2, this.y - cam.y + this.h / 2);
      ctx.scale(1, -1);
      drawCrow(ctx, -this.w / 2, -this.h / 2, this.w, this.h, { facing: this.facing, shellMode: this.shellMode });
      ctx.restore();
      return;
    }
    const blink = (Math.floor(t * 6) % 11) === 0;
    drawCrow(ctx, this.x - cam.x, this.y - cam.y, this.w, this.h, {
      facing: this.facing,
      flying: this.flying,
      shellMode: this.shellMode,
      flap: this.flap,
      blink,
    });
  }
}

// ---------- Cactus Rodante (invencible al salto) ----------
export class Cactus extends Enemy {
  constructor(x, y) {
    super(x, y, 30, 30);
    this.kind = 'cactus';
    this.vx = -90;
    this.canBeStomped = false;
    this.canBeProjectiled = true; // se destruye con notas
    this.canBeDeflected = false;
    this.rot = 0;
  }
  update(dt, world) {
    this.dt = dt;
    this.rot += Math.abs(this.vx) * dt * 0.05;
    if (this.dead) {
      this.deadTimer += dt;
      this.vy += 1800 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }
    this.vy += 1800 * dt;
    if (this.vy > 600) this.vy = 600;
    if (this.onGround) {
      const aheadX = Math.floor((this.x + (this.vx > 0 ? this.w + 1 : -1)) / TILE);
      const belowR = Math.floor((this.y + this.h + 2) / TILE);
      if (!world.isSolid(aheadX, belowR)) {
        this.vx = -this.vx;
        this.facing = -this.facing;
      }
    }
    collideTiles(this, world);
  }
  draw(ctx, cam) {
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x - cam.x + this.w / 2, this.y - cam.y + this.h / 2);
      ctx.scale(1, -1);
      drawCactus(ctx, -this.w / 2, -this.h / 2, this.w, this.h, { rot: this.rot });
      ctx.restore();
      return;
    }
    drawCactus(ctx, this.x - cam.x, this.y - cam.y, this.w, this.h, { rot: this.rot });
  }
}

// ---------- Mapache Gigante Mutante (jefe) ----------
export class RaccoonBoss extends Enemy {
  constructor(x, y) {
    super(x, y, 96, 96);
    this.kind = 'boss';
    this.hp = 5;
    this.facing = -1;
    this.vx = -120;
    this.canBeStomped = true;
    this.canBeProjectiled = true;
    this.canBeDeflected = false;
    this.hurtTimer = 0;
    this.jumpTimer = 1.5;
  }
  hit() {
    this.hp -= 1;
    this.hurtTimer = 0.3;
    SFX.bossHit();
    if (this.hp <= 0) {
      this.dead = true;
      this.deadTimer = 0;
      this.vy = -300;
      this.vx = this.facing * 80;
    } else {
      // rebote
      this.vy = -500;
      this.vx *= 1.1;
    }
  }
  killByStomp() { this.hit(); }
  killByProjectile() { this.hit(); }
  update(dt, world) {
    this.dt = dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.dead) {
      this.deadTimer += dt;
      this.vy += 1800 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }
    this.vy += 1800 * dt;
    if (this.vy > 700) this.vy = 700;

    this.jumpTimer -= dt;
    if (this.onGround && this.jumpTimer < 0) {
      this.vy = -700;
      this.jumpTimer = 1.2 + Math.random() * 0.6;
    }

    // patrullaje en su zona (con gestion de bordes)
    if (this.onGround) {
      const aheadX = Math.floor((this.x + (this.vx > 0 ? this.w + 2 : -2)) / TILE);
      const belowR = Math.floor((this.y + this.h + 2) / TILE);
      if (!world.isSolid(aheadX, belowR)) {
        this.vx = -this.vx;
        this.facing = -this.facing;
      }
    }
    collideTiles(this, world);
  }
  draw(ctx, cam) {
    if (this.dead) {
      ctx.save();
      ctx.translate(this.x - cam.x + this.w / 2, this.y - cam.y + this.h / 2);
      ctx.scale(1, -1);
      drawRaccoonBoss(ctx, -this.w / 2, -this.h / 2, this.w, this.h, { facing: this.facing });
      ctx.restore();
      return;
    }
    drawRaccoonBoss(ctx, this.x - cam.x, this.y - cam.y, this.w, this.h, {
      facing: this.facing,
      hurt: this.hurtTimer > 0,
    });
  }
}
