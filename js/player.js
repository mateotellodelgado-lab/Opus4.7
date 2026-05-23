// Mía: jugadora con física de plataformas, salto variable, espada y power-ups.
// Constantes de física escaladas por 1.25 para acompañar TILE=40 (era 32).

// Constantes de física (px/seg).
const GRAVITY = 2250;            // 1800 * 1.25
const MAX_FALL = 1125;           // 900 * 1.25
const WALK_ACCEL = 1125;         // 900 * 1.25
const RUN_ACCEL  = 1750;         // 1400 * 1.25
const WALK_MAX   = 225;          // 180 * 1.25
const RUN_MAX    = 400;          // 320 * 1.25
const FRICTION   = 1625;         // 1300 * 1.25
const JUMP_VEL   = -700;         // -560 * 1.25
const JUMP_HOLD_FORCE = -1375;   // -1100 * 1.25
const JUMP_HOLD_TIME  = 0.22;
const COYOTE_TIME = 0.08;
const JUMP_BUFFER = 0.10;

// Espada
const SWORD_DURATION = 0.22;     // duración del swing visible
const SWORD_COOLDOWN = 0.32;     // tiempo mínimo entre swings
const SWORD_REACH = 38;          // alcance horizontal del hitbox

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.size = 'small';   // 'small' | 'big'
    this.hasHeadphones = false;
    this.onGround = false;
    this.onPlatform = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpHold = 0;
    this.jumping = false;
    this.invuln = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.walkPhase = 0;
    this.walkTimer = 0;
    this.shootCooldown = 0;
    this.justBumped = null;
    this.justHit = null;
    this.spawnX = x; this.spawnY = y;
    this.completed = false;
    this.win = false;

    // Espada
    this.swordTimer = 0;       // > 0 mientras está activa
    this.swordCooldown = 0;
    this.swordHits = new Set(); // ids ya golpeados en este swing
    this.swordSwingId = 0;

    // Squash & stretch
    this.landSquash = 0;       // > 0 brevemente al aterrizar
    this._wasOnGround = false;
  }

  // Ligeramente más grandes que antes para acompañar TILE=40
  get width()  { return 30; }
  get height() { return this.size === 'big' ? 60 : 36; }

  get aabb() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  // Hitbox del swing de espada (frente a Mía mientras swordTimer > 0)
  get swordHitbox() {
    if (this.swordTimer <= 0) return null;
    const hx = this.facing > 0 ? (this.x + this.width - 4) : (this.x - SWORD_REACH + 4);
    return {
      x: hx,
      y: this.y + 6,
      w: SWORD_REACH,
      h: this.height - 10,
    };
  }

  get isSwinging() { return this.swordTimer > 0; }
  get swingProgress() {
    return this.swordTimer > 0 ? 1 - (this.swordTimer / SWORD_DURATION) : 0;
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.size = 'small';
    this.hasHeadphones = false;
    this.onGround = false;
    this.invuln = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.completed = false;
    this.swordTimer = 0;
    this.swordCooldown = 0;
  }

  attack() {
    if (this.swordCooldown > 0 || this.dead) return false;
    this.swordTimer = SWORD_DURATION;
    this.swordCooldown = SWORD_COOLDOWN;
    this.swordHits = new Set();
    this.swordSwingId++;
    SFX.shoot();
    return true;
  }

  takeDamage() {
    if (this.invuln > 0 || this.dead) return false;
    if (this.hasHeadphones) {
      this.hasHeadphones = false;
      this.invuln = 1.5;
      SFX.hit();
      return false;
    }
    if (this.size === 'big') {
      this.size = 'small';
      this.invuln = 1.5;
      SFX.hit();
      return false;
    }
    this.dead = true;
    this.deathTimer = 0;
    this.vx = 0;
    this.vy = -560;
    SFX.death();
    return true;
  }

  grow() {
    if (this.size === 'small') {
      this.size = 'big';
      this.y -= 24;
      SFX.power();
    }
  }

  giveHeadphones() {
    this.hasHeadphones = true;
    if (this.size === 'small') {
      this.size = 'big';
      this.y -= 24;
    }
    SFX.power();
  }

  bounce(small = false) {
    this.vy = small ? -380 : -600;
    this.jumping = false;
    this.jumpHold = 0;
  }

  update(dt, input, world) {
    if (this.dead) {
      this.deathTimer += dt;
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      return;
    }

    // Timers de espada
    if (this.swordTimer > 0) this.swordTimer -= dt;
    if (this.swordCooldown > 0) this.swordCooldown -= dt;

    // Trigger de ataque
    if (input.wasPressed('attack')) {
      this.attack();
    }

    // Squash & stretch: aterrizaje
    if (this.landSquash > 0) this.landSquash -= dt;

    // Entrada horizontal
    const left = input.isDown('left');
    const right = input.isDown('right');
    const running = input.isDown('run');
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    const maxSpeed = running ? RUN_MAX : WALK_MAX;
    const accel = running ? RUN_ACCEL : WALK_ACCEL;

    if (dir !== 0) {
      this.vx += dir * accel * dt;
      this.facing = dir;
      if (Math.abs(this.vx) > maxSpeed) {
        const sign = Math.sign(this.vx);
        this.vx = sign * Math.max(maxSpeed, Math.abs(this.vx) - FRICTION * 0.5 * dt);
      }
    } else {
      const sign = Math.sign(this.vx);
      this.vx -= sign * FRICTION * dt;
      if (Math.sign(this.vx) !== sign) this.vx = 0;
    }
    this.vx = Math.max(-RUN_MAX, Math.min(RUN_MAX, this.vx));

    // Coyote / buffer
    this.coyote = this.onGround ? COYOTE_TIME : Math.max(0, this.coyote - dt);
    if (input.wasPressed('jump')) this.jumpBuffer = JUMP_BUFFER;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = JUMP_VEL;
      this.jumping = true;
      this.jumpHold = JUMP_HOLD_TIME;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.onGround = false;
      SFX.jump();
    }

    if (this.jumping && input.isDown('jump') && this.jumpHold > 0 && this.vy < 0) {
      this.vy += JUMP_HOLD_FORCE * dt;
      this.jumpHold -= dt;
    } else {
      this.jumping = false;
      this.jumpHold = 0;
    }

    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    this.vy += GRAVITY * dt;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    this.justBumped = null;
    this.moveAndCollide(dt, world);

    // Detectar aterrizaje para squash
    if (this.onGround && !this._wasOnGround) {
      this.landSquash = 0.12;
    }
    this._wasOnGround = this.onGround;

    // Animación de caminar
    if (this.onGround && Math.abs(this.vx) > 10) {
      this.walkTimer += Math.abs(this.vx) * dt * 0.04;
      this.walkPhase = Math.floor(this.walkTimer) % 4;
    } else {
      this.walkPhase = 0;
    }

    if (this.invuln > 0) this.invuln -= dt;

    if (this.y > world.heightPx + 200) {
      if (!this.dead) {
        this.dead = true;
        this.deathTimer = 0;
        SFX.death();
      }
    }
  }

  moveAndCollide(dt, world) {
    // X axis
    let dx = this.vx * dt;
    this.x += dx;
    this.collideAxis(world, 'x');

    // Y axis
    let dy = this.vy * dt;
    const wasOnGround = this.onGround;
    this.onGround = false;
    this.onPlatform = false;
    this.y += dy;
    this.collideAxis(world, 'y');

    if (this.onGround && !wasOnGround) {
      this.jumping = false;
    }
  }

  collideAxis(world, axis) {
    const left = Math.floor(this.x / TILE);
    const right = Math.floor((this.x + this.width - 1) / TILE);
    const top = Math.floor(this.y / TILE);
    const bottom = Math.floor((this.y + this.height - 1) / TILE);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (!world.isSolid(c, r)) continue;
        const tile = world.tileRect(c, r);
        const isOneWay = world.isOneWay(c, r);

        if (axis === 'x') {
          if (isOneWay) continue; // las plataformas no bloquean lateralmente
          if (this.vx > 0) {
            this.x = tile.x - this.width;
          } else if (this.vx < 0) {
            this.x = tile.x + tile.w;
          }
          this.vx = 0;
        } else {
          if (this.vy > 0) {
            // cayendo: aterrizamos sobre tile
            if (isOneWay) {
              // plataforma: solo si el pie estaba por encima en el frame anterior
              const prevBottom = (this.y - this.vy * (1 / 60)) + this.height;
              if (prevBottom > tile.y + 1) continue;
            }
            this.y = tile.y - this.height;
            this.vy = 0;
            this.onGround = true;
            if (isOneWay) this.onPlatform = true;
          } else if (this.vy < 0) {
            if (isOneWay) continue; // plataformas se atraviesan hacia arriba
            this.y = tile.y + tile.h;
            this.vy = 0;
            // golpe de cabeza con el bloque c,r — registrar
            this.justBumped = { col: c, row: r };
            this.jumping = false;
            this.jumpHold = 0;
          }
        }
      }
    }
  }

  draw(ctx, cam, t) {
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    // Sprite displays más grandes (1.5x el grid 24x36)
    const w = this.size === 'big' ? 48 : 36;
    const h = this.size === 'big' ? 72 : 54;

    const drawX = this.x - cam.x + (this.width - w) / 2;
    const drawY = this.y - cam.y - (h - this.height);

    // Squash & stretch
    let stretchY = 1, stretchX = 1;
    if (this.landSquash > 0) {
      // Aplastarse al aterrizar
      const k = this.landSquash / 0.12;
      stretchY = 1 - 0.18 * k;
      stretchX = 1 + 0.14 * k;
    } else if (!this.onGround) {
      if (this.vy < -50) {
        // Subiendo: estirar verticalmente
        const k = Math.min(1, -this.vy / 700);
        stretchY = 1 + 0.18 * k;
        stretchX = 1 - 0.10 * k;
      } else if (this.vy > 100) {
        // Cayendo: levemente alargar pero menos
        stretchY = 1.06;
        stretchX = 0.96;
      }
    }

    // Aura/glow siempre encendida (modo ULTRA). Más intensa con auriculares
    // y al correr. Aporta el "look" mejorado que el jugador pidió.
    const speed = Math.abs(this.vx);
    const speedFrac = Math.min(1, speed / RUN_MAX);
    const auraColor = this.hasHeadphones ? '#6cf0ff' : '#ff4fa3';
    const auraIntensity = 0.18 + speedFrac * 0.18 + (this.hasHeadphones ? 0.12 : 0);
    drawCharacterAura(ctx, drawX, drawY, w, h, {
      color: auraColor,
      intensity: auraIntensity,
      scale: 0.95 + speedFrac * 0.15,
    });

    const blink = (Math.floor(t * 2) % 8) === 0;
    drawMia(ctx, drawX, drawY, w, h, {
      facing: this.facing,
      walkPhase: this.walkPhase,
      isJumping: !this.onGround && this.vy < 0,
      isFalling: !this.onGround && this.vy >= 0,
      hasHeadphones: this.hasHeadphones,
      blink,
      swinging: this.isSwinging,
      swingT: this.swingProgress,
      stretchX, stretchY,
    });
  }
}
