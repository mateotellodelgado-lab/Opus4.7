// Mía: jugadora con física de plataformas, salto variable y power-ups.

// Constantes de física (px/seg).
const GRAVITY = 1800;
const MAX_FALL = 900;
const WALK_ACCEL = 900;
const RUN_ACCEL  = 1400;
const WALK_MAX   = 180;
const RUN_MAX    = 320;
const FRICTION   = 1300;
const JUMP_VEL   = -560;            // velocidad inicial al saltar
const JUMP_HOLD_FORCE = -1100;      // contra-gravedad mientras se mantiene espacio
const JUMP_HOLD_TIME  = 0.22;       // seg máx que la fuerza extra se aplica
const COYOTE_TIME = 0.08;
const JUMP_BUFFER = 0.10;

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
    this.invuln = 0;       // segundos de invulnerabilidad tras recibir golpe
    this.dead = false;
    this.deathTimer = 0;
    this.walkPhase = 0;
    this.walkTimer = 0;
    this.shootCooldown = 0;
    this.justBumped = null;  // {col, row} a procesar por main
    this.justHit = null;     // resultado de bump
    this.spawnX = x; this.spawnY = y;
    this.completed = false;
    this.win = false;
  }

  get width()  { return 24; }
  get height() { return this.size === 'big' ? 48 : 28; }

  // Caja de colisión con padding interior.
  get aabb() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
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
    // muerte
    this.dead = true;
    this.deathTimer = 0;
    this.vx = 0;
    this.vy = -500;
    SFX.death();
    return true;
  }

  grow() {
    if (this.size === 'small') {
      this.size = 'big';
      // empujar un poco hacia arriba para no quedar atascada
      this.y -= 20;
      SFX.power();
    } else {
      // si ya está grande, dar puntos extra
    }
  }

  giveHeadphones() {
    this.hasHeadphones = true;
    if (this.size === 'small') {
      this.size = 'big';
      this.y -= 20;
    }
    SFX.power();
  }

  bounce(small = false) {
    this.vy = small ? -300 : -480;
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
      // si va más rápido del máximo (porque venía corriendo y soltó shift), frenar suave
      if (Math.abs(this.vx) > maxSpeed) {
        const sign = Math.sign(this.vx);
        this.vx = sign * Math.max(maxSpeed, Math.abs(this.vx) - FRICTION * 0.5 * dt);
      }
    } else {
      // fricción
      const sign = Math.sign(this.vx);
      this.vx -= sign * FRICTION * dt;
      if (Math.sign(this.vx) !== sign) this.vx = 0;
    }
    this.vx = Math.max(-RUN_MAX, Math.min(RUN_MAX, this.vx));

    // Coyote time / buffer
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

    // Salto variable: aplicar fuerza extra hacia arriba mientras se mantenga.
    if (this.jumping && input.isDown('jump') && this.jumpHold > 0 && this.vy < 0) {
      this.vy += JUMP_HOLD_FORCE * dt;
      this.jumpHold -= dt;
    } else {
      this.jumping = false;
      this.jumpHold = 0;
    }

    // Cooldown de disparo
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Gravedad
    this.vy += GRAVITY * dt;
    if (this.vy > MAX_FALL) this.vy = MAX_FALL;

    // Movimiento + colisiones (separado por eje)
    this.justBumped = null;
    this.moveAndCollide(dt, world);

    // Animación de caminar
    if (this.onGround && Math.abs(this.vx) > 10) {
      this.walkTimer += Math.abs(this.vx) * dt * 0.05;
      this.walkPhase = Math.floor(this.walkTimer) % 4;
    } else {
      this.walkPhase = 0;
    }

    // Invulnerabilidad
    if (this.invuln > 0) this.invuln -= dt;

    // Caer fuera del mapa = muerte
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
    // parpadeo si invulnerable
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    const w = this.size === 'big' ? 32 : 24;
    const h = this.size === 'big' ? 48 : 32;
    // alinear el sprite con la AABB (la AABB es 24x28/48; el sprite extra contiene
    // un poco de cabello/auriculares fuera del top — desplazamos hacia arriba)
    const drawX = this.x - cam.x + (this.width - w) / 2;
    const drawY = this.y - cam.y - (h - this.height);

    const blink = (Math.floor(t * 2) % 8) === 0;
    drawMia(ctx, drawX, drawY, w, h, {
      facing: this.facing,
      walkPhase: this.walkPhase,
      isJumping: !this.onGround,
      hasHeadphones: this.hasHeadphones,
      blink,
    });
  }
}
