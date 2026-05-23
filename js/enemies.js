// Enemigos: Slime de Basura, Cuervo Robacarteras, Cactus Rodante, Mapache jefe.

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
  // Por defecto, la espada se comporta como proyectil (mata si canBeStomped).
  // Cactus override este método para ser inmune.
  killBySword(fromDir) {
    this.dead = true;
    this.deadTimer = 0;
    this.vy = -320;
    this.vx = (fromDir || 1) * 220;
    SFX.stomp();
  }
}

// ---------- Slime de Basura ----------
class Slime extends Enemy {
  constructor(x, y) {
    super(x, y, 36, 36);
    this.kind = 'slime';
    this.vx = -65;
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
class Crow extends Enemy {
  constructor(x, y, flying) {
    super(x, y, 36, 36);
    this.kind = 'crow';
    this.flying = flying;
    this.shellMode = false;
    this.shellTimer = 0;
    this.shellMoving = false;
    this.flap = 0;
    this.baseY = y;
    this.tParam = 0;
    this.vx = flying ? 100 : -75;
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
  // Espada sobre cuervo: si no está en concha, lo mata; si está, lo patea.
  killBySword(fromDir) {
    if (this.shellMode) {
      this.shellMoving = true;
      this.vx = (fromDir || 1) * 420;
      SFX.stomp();
    } else {
      this.dead = true;
      this.deadTimer = 0;
      this.vy = -320;
      this.vx = (fromDir || 1) * 220;
      SFX.stomp();
    }
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

// ---------- Cactus Rodante (invencible al salto Y a la espada) ----------
class Cactus extends Enemy {
  constructor(x, y) {
    super(x, y, 38, 38);
    this.kind = 'cactus';
    this.vx = -110;
    this.canBeStomped = false;
    this.canBeProjectiled = true; // se destruye con notas
    this.canBeDeflected = false;
    this.rot = 0;
  }
  // La espada NO daña al cactus (sus espinas paran el filo).
  killBySword() { /* ignored — solo notas musicales lo destruyen */ }
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
class RaccoonBoss extends Enemy {
  constructor(x, y) {
    super(x, y, 120, 120);
    this.kind = 'boss';
    this.hp = 5;
    this.facing = -1;
    this.vx = -150;
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
  killBySword() { this.hit(); }
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



// ---------- Nave Alien (invasión cada 3 niveles) ----------
//
// Vuela horizontal sin colisionar con tiles. Cada cierto tiempo carga su
// cañón y dispara un láser vertical hasta el suelo. Tocar la nave o el
// láser mata al jugador instantáneamente. Se puede destruir con espada o
// notas musicales (recompensa de 500 puntos).
class AlienShip extends Enemy {
  constructor(x, y, dir) {
    super(x, y, 100, 50);
    this.kind = 'alien';
    this.vx = dir * 130;
    this.facing = dir;
    this.canBeStomped = false;        // pisarla mata al jugador
    this.canBeProjectiled = true;     // las notas pueden derribarla
    this.canBeDeflected = false;
    this.lifetime = 14;               // safety despawn

    // FSM del láser
    this.laserState = 'idle';         // 'idle' | 'charging' | 'firing'
    this.laserTimer = 1.4 + Math.random() * 1.4;
    this.LASER_CHARGE = 0.65;
    this.LASER_FIRE   = 0.55;
    this.laserHeight = 0;

    this.t = 0;
    this.bobBase = y;
  }

  // Hitbox del rayo (sólo activo mientras dispara, no durante carga)
  get laserHitbox() {
    if (this.laserState !== 'firing') return null;
    const cx = this.x + this.w / 2;
    return {
      x: cx - 8,
      y: this.y + this.h - 4,
      w: 16,
      h: this.laserHeight,
    };
  }

  // Cargando = peligro visual pero no daña aún
  get isLaserActive() { return this.laserState === 'firing'; }

  killByStomp()                  { /* invulnerable a pisotón */ }
  killBySword(fromDir)           { this._destroy(fromDir || 1); }
  killByProjectile()             { this._destroy(this.facing); }
  _destroy(dir) {
    if (this.dead) return;
    this.dead = true;
    this.deadTimer = 0;
    this.vx = dir * 100;
    this.vy = 100;
    this.laserState = 'idle';
    SFX.bossHit && SFX.bossHit();
  }

  update(dt, world) {
    this.dt = dt;
    this.t += dt;

    if (this.dead) {
      this.deadTimer += dt;
      this.vy += 800 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      // rotar al caer (visual lo maneja draw)
      return;
    }

    this.lifetime -= dt;

    // Movimiento horizontal con bobbing vertical sutil
    this.x += this.vx * dt;
    this.y = this.bobBase + Math.sin(this.t * 2.2) * 6;

    // FSM del láser
    this.laserTimer -= dt;
    if (this.laserState === 'idle') {
      if (this.laserTimer <= 0) {
        this.laserState = 'charging';
        this.laserTimer = this.LASER_CHARGE;
        // Distancia al suelo del nivel (la altura del rayo)
        this.laserHeight = Math.max(60, world.heightPx - (this.y + this.h) - 40);
        SFX.laserCharge && SFX.laserCharge();
      }
    } else if (this.laserState === 'charging') {
      if (this.laserTimer <= 0) {
        this.laserState = 'firing';
        this.laserTimer = this.LASER_FIRE;
        SFX.laserFire && SFX.laserFire();
      }
    } else if (this.laserState === 'firing') {
      if (this.laserTimer <= 0) {
        this.laserState = 'idle';
        this.laserTimer = 2.2 + Math.random() * 1.6;
      }
    }

    // Despawn si sale del mundo o vence su vida
    if (this.lifetime <= 0 || this.x < -260 || this.x > world.widthPx + 260) {
      this.dead = true;
      this.deadTimer = 5; // se elimina del array rápidamente
    }
  }

  draw(ctx, cam, t) {
    if (this.dead) {
      // Cae girando
      ctx.save();
      ctx.translate(this.x - cam.x + this.w / 2, this.y - cam.y + this.h / 2);
      ctx.rotate(this.deadTimer * 4);
      drawAlienShip(ctx, -this.w / 2, -this.h / 2, this.w, this.h, { t: this.t, damaged: true });
      ctx.restore();
      return;
    }

    drawAlienShip(ctx, this.x - cam.x, this.y - cam.y, this.w, this.h, { t: this.t });

    // Indicador de carga (esfera roja pulsante bajo la nave)
    if (this.laserState === 'charging') {
      const k = 1 - (this.laserTimer / this.LASER_CHARGE);
      drawLaserCharge(ctx, this.x - cam.x + this.w / 2, this.y - cam.y + this.h - 2, this.t, k);

      // Línea de "mira" tenue hasta el suelo (aviso al jugador)
      ctx.strokeStyle = `rgba(255,79,79,${0.25 + 0.4 * k})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x - cam.x + this.w / 2, this.y - cam.y + this.h - 2);
      ctx.lineTo(this.x - cam.x + this.w / 2, this.y - cam.y + this.h - 2 + this.laserHeight);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    // Rayo láser activo
    if (this.laserState === 'firing') {
      const elapsed = this.LASER_FIRE - this.laserTimer;
      const fadeIn  = Math.min(1, elapsed / 0.06);
      const fadeOut = Math.min(1, this.laserTimer / 0.12);
      const charge = Math.min(fadeIn, fadeOut);
      drawAlienLaser(
        ctx,
        this.x - cam.x + this.w / 2,
        this.y - cam.y + this.h - 2,
        this.laserHeight,
        { t: this.t, charge, color: '#ff4fa3', outer: '#6cf0ff' }
      );
    }
  }
}
