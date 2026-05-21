// Bucle principal del juego: estados, cámara, lógica de alto nivel.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_INTRO: 'level_intro',
  LEVEL_COMPLETE: 'level_complete',
  GAME_OVER: 'game_over',
  WIN: 'win',
};

// AABB overlap
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

class Game {
  constructor() {
    this.input = new Input();
    this.state = STATE.MENU;
    this.levelIndex = 0;
    this.lives = 3;
    this.totalCoins = 0;
    this.score = 0;
    this.t = 0;
    this.cam = { x: 0, y: 0 };
    this.player = null;
    this.world = null;
    this.enemies = [];
    this.coins = [];
    this.popCoins = [];
    this.powerUps = [];
    this.notes = [];
    this.particles = [];
    this.goal = null;
    this.backpack = null;
    this.timeLeft = 0;
    this.boss = null;
    this.bossDefeated = false;
    this.toast = '';
    this.toastTime = 0;
    this.bigMessage = '';
    this.bigSubMessage = '';
    this.bigMessageTimer = 0;
    this.completeTimer = 0;
    this.hasBackpack = false;

    // Screen shake (intensidad y tiempo restante)
    this.shakeIntensity = 0;
    this.shakeTime = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Bind menu start button
    const startBtn = document.getElementById('startBtn');
    const overlay = document.getElementById('overlay');
    startBtn.addEventListener('click', () => {
      unlockAudio();
      overlay.classList.add('hidden');
      this.startNewGame();
    });

    requestAnimationFrame(this.loop.bind(this));
    this.lastTime = performance.now();
  }

  startNewGame() {
    this.lives = 3;
    this.totalCoins = 0;
    this.score = 0;
    this.levelIndex = 0;
    this.hasBackpack = false;
    this.bossDefeated = false;
    this.loadLevel(0);
  }

  loadLevel(index) {
    const def = LEVELS[index];
    this.levelIndex = index;
    this.world = new World(def);
    this.cam = { x: 0, y: 0 };
    this.enemies = [];
    this.coins = [];
    this.popCoins = [];
    this.powerUps = [];
    this.notes = [];
    this.particles = [];
    this.goal = null;
    this.backpack = null;
    this.boss = null;
    this.timeLeft = def.timeLimit;
    this.completeTimer = 0;

    // Spawn entities desde semillas del world
    for (const seed of this.world.entitySeeds) {
      const x = seed.col * TILE;
      const y = seed.row * TILE;
      switch (seed.kind) {
        case 'coin': this.coins.push(new Coin(x + 4, y + 4)); break;
        case 'slime': this.enemies.push(new Slime(x + 2, y + 4)); break;
        case 'crow': this.enemies.push(new Crow(x + 2, y + 4, seed.flying)); break;
        case 'cactus': this.enemies.push(new Cactus(x + 1, y + 2)); break;
        case 'goal':
          this.goal = new Goal(seed.col, seed.row);
          break;
      }
    }

    // Spawn de Mía
    const sp = def.spawn;
    const px = sp.col * TILE;
    const py = sp.row * TILE - 28;
    this.player = new Player(px, py);

    // Si es boss level, crear jefe y mochila
    if (def.isBoss) {
      const bx = (def.cols - 14) * TILE;
      const by = (def.rowsCount - 6) * TILE;
      this.boss = new RaccoonBoss(bx, by);
      this.enemies.push(this.boss);
      // mochila escondida en una plataforma alta
      this.backpack = new Backpack((def.cols - 18) * TILE + 8, 6 * TILE);
    }

    // Mensaje grande de inicio
    this.bigMessage = `MUNDO ${index + 1}-1   ${def.name.toUpperCase()}`;
    this.bigSubMessage = def.isBoss
      ? '¡La guarida del Mapache Gigante Mutante!'
      : 'Llega a la estación antes de que se agote el tiempo';
    this.bigMessageTimer = 2.4;

    this.state = STATE.PLAYING;
  }

  showToast(msg, duration = 1.4) {
    this.toast = msg;
    this.toastTime = duration;
  }

  shake(intensity, duration = 0.25) {
    if (intensity > this.shakeIntensity) {
      this.shakeIntensity = intensity;
      this.shakeTime = duration;
    }
  }

  updateShake(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / 0.25);
      const amount = this.shakeIntensity * k;
      this.shakeOffsetX = (Math.random() - 0.5) * amount * 2;
      this.shakeOffsetY = (Math.random() - 0.5) * amount * 2;
      if (this.shakeTime <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }
  }

  killPlayer() {
    if (this.player.dead) return;
    const wasDead = this.player.dead;
    this.player.takeDamage();
    // Screen shake fuerte si murió, suave si sólo perdió power
    if (this.player.dead && !wasDead) {
      this.shake(14, 0.4);
    } else {
      this.shake(6, 0.2);
    }
  }

  spawnHitParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.4 + Math.random() * 0.2,
        color,
      });
    }
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.t += dt;

    if (this.state === STATE.MENU) {
      // pinta una "atracción" sencilla
      ctx.fillStyle = '#0e0820';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#1f1240';
      ctx.fillRect(0, VIEW_H - 80, VIEW_W, 80);
      ctx.fillStyle = '#6cf0ff';
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Mía: La Mochila Robada', VIEW_W / 2, VIEW_H / 2);
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#cfc8e3';
      ctx.fillText('Pulsa "Comenzar aventura"', VIEW_W / 2, VIEW_H / 2 + 28);
      ctx.textAlign = 'left';
      this.input.endFrame();
      requestAnimationFrame(this.loop.bind(this));
      return;
    }

    // Pause toggle (desde playing o paused)
    if (this.input.wasPressed('pause') && (this.state === STATE.PLAYING || this.state === STATE.PAUSED)) {
      this.state = this.state === STATE.PLAYING ? STATE.PAUSED : STATE.PLAYING;
    }

    if (this.state === STATE.GAME_OVER) {
      this.render();
      drawGameOver(ctx, VIEW_W, VIEW_H);
      if (this.input.wasPressed('confirm')) {
        this.startNewGame();
      }
    } else if (this.state === STATE.WIN) {
      this.render();
      drawWin(ctx, VIEW_W, VIEW_H, { score: this.score, totalCoins: this.totalCoins });
      if (this.input.wasPressed('confirm')) {
        this.startNewGame();
      }
    } else if (this.state === STATE.PAUSED) {
      this.render();
      drawPause(ctx, VIEW_W, VIEW_H);
    } else {
      // PLAYING / LEVEL_COMPLETE
      this.update(dt);
      this.render();
    }

    this.input.endFrame();
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    // Reiniciar nivel
    if (this.input.wasPressed('restart')) {
      this.loadLevel(this.levelIndex);
      return;
    }

    // Mensaje de inicio
    if (this.bigMessageTimer > 0) {
      this.bigMessageTimer -= dt;
      if (this.bigMessageTimer <= 0) {
        this.bigMessage = '';
        this.bigSubMessage = '';
      }
    }
    if (this.toastTime > 0) this.toastTime -= dt;

    if (this.state === STATE.LEVEL_COMPLETE) {
      this.completeTimer -= dt;
      // mover a Mía hacia la meta para "celebración"
      this.player.x += 80 * dt;
      this.player.update(dt, this.input, this.world);
      if (this.completeTimer <= 0) {
        // siguiente nivel o win
        if (this.levelIndex >= LEVELS.length - 1) {
          this.state = STATE.WIN;
          SFX.win();
        } else {
          this.loadLevel(this.levelIndex + 1);
        }
      }
      return;
    }

    // Tiempo
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      if (!this.player.dead) {
        this.player.dead = true;
        SFX.death();
      }
    }

    // Update player (a menos que esté muerto y haya pasado animación)
    this.player.update(dt, this.input, this.world);

    // Si el jugador golpeó un bloque por debajo
    if (this.player.justBumped) {
      const { col, row } = this.player.justBumped;
      const result = this.world.bump(col, row, this.player);
      if (result.kind === 'coin') {
        this.popCoins.push(new PopCoin(result.x, result.y));
        this.addCoin();
      } else if (result.kind === 'powerup') {
        this.powerUps.push(new PowerUp(result.x, result.y, result.item));
      } else if (result.kind === 'brick-break') {
        this.score += 50;
        SFX.break();
        // partículas
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: result.x, y: result.y,
            vx: (Math.random() - 0.5) * 300,
            vy: -200 - Math.random() * 200,
            life: 0.6, color: '#a83b29',
          });
        }
      } else if (result.kind === 'brick-bump') {
        SFX.stomp();
      }
    }

    // Disparo
    if (this.player.hasHeadphones && this.input.wasPressed('shoot') && this.player.shootCooldown <= 0) {
      const px = this.player.x + this.player.width / 2 - 10;
      const py = this.player.y + 8;
      this.notes.push(new MusicNote(px, py, this.player.facing));
      this.player.shootCooldown = 0.4;
      SFX.shoot();
    }

    // World tile animations
    this.world.update(dt);

    // Coins
    for (const c of this.coins) {
      if (c.collected) continue;
      c.update(dt);
      if (overlap(c.aabb, this.player.aabb)) {
        c.collected = true;
        this.addCoin();
      }
    }
    this.coins = this.coins.filter(c => !c.collected);

    // PopCoins
    for (const pc of this.popCoins) pc.update(dt);
    this.popCoins = this.popCoins.filter(pc => !pc.done);

    // PowerUps
    for (const pu of this.powerUps) {
      if (pu.collected) continue;
      pu.update(dt, this.world);
      if (overlap(pu.aabb, this.player.aabb)) {
        pu.collected = true;
        if (pu.kind === 'energy') {
          this.player.grow();
          this.showToast('¡Bebida energética! +1 golpe', 1.2);
        } else {
          this.player.giveHeadphones();
          this.showToast('¡Auriculares mágicos! Pulsa J para lanzar notas', 1.8);
        }
        this.score += 1000;
      }
    }
    this.powerUps = this.powerUps.filter(p => !p.collected);

    // Notes
    for (const n of this.notes) n.update(dt, this.world);

    // Enemies
    for (const e of this.enemies) {
      if (e.dead && e.deadTimer > 1.2) continue;
      e.update(dt, this.world);
    }

    // Note <-> enemy
    for (const n of this.notes) {
      if (n.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || !e.canBeProjectiled) continue;
        if (overlap(n.aabb, e.aabb)) {
          if (e.kind === 'boss') {
            e.hit();
          } else {
            e.killByProjectile();
            this.score += 100;
          }
          n.dead = true;
          break;
        }
      }
    }
    this.notes = this.notes.filter(n => !n.dead);

    // Sword <-> enemy
    if (this.player.swordTimer > 0) {
      const sb = this.player.swordHitbox;
      if (sb) {
        for (const e of this.enemies) {
          if (e.dead) continue;
          // Evitar pegar al mismo enemigo dos veces en el mismo swing
          const key = e.__id || (e.__id = Math.random().toString(36).slice(2));
          const hitKey = this.player.swordSwingId + ':' + key;
          if (this.player.swordHits.has(hitKey)) continue;
          if (!overlap(sb, e.aabb)) continue;

          this.player.swordHits.add(hitKey);
          const fromDir = this.player.facing;

          if (e.kind === 'boss') {
            e.killBySword(fromDir);
            this.shake(8, 0.25);
            this.spawnHitParticles(e.x + e.w / 2, e.y + e.h / 2, '#ffd14f');
          } else if (e.kind === 'cactus') {
            // Espada rebota en cactus (sólo SFX, sin daño)
            SFX.hit();
            this.shake(2, 0.1);
          } else {
            e.killBySword(fromDir);
            this.score += 150;
            this.shake(4, 0.18);
            this.spawnHitParticles(e.x + e.w / 2, e.y + e.h / 2, '#fff');
          }
        }
      }
    }

    // Player <-> enemies
    if (!this.player.dead && this.player.invuln <= 0) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (!overlap(this.player.aabb, e.aabb)) continue;

        // Concha en movimiento daña a Mía
        if (e.kind === 'crow' && e.shellMode && e.shellMoving) {
          this.killPlayer();
          break;
        }

        // ¿Pisotón?
        const playerBottom = this.player.y + this.player.height;
        const enemyTop = e.y;
        const fallingOnto = this.player.vy > 80 && playerBottom - this.player.vy * 0.016 <= enemyTop + 8;

        if (fallingOnto && e.canBeStomped) {
          // dirección de patada para conchas
          if (e.kind === 'crow') {
            e.kickDir = (this.player.x + this.player.width / 2) < (e.x + e.w / 2) ? 1 : -1;
          }
          e.killByStomp();
          this.player.bounce(this.input.isDown('jump'));
          if (e.kind !== 'boss') this.score += 100;
          this.shake(3, 0.12);
          this.spawnHitParticles(e.x + e.w / 2, e.y, '#fff');
          break;
        }

        // Concha quieta: empujarla
        if (e.kind === 'crow' && e.shellMode && !e.shellMoving) {
          e.kickDir = (this.player.x + this.player.width / 2) < (e.x + e.w / 2) ? 1 : -1;
          e.shellMoving = true;
          e.vx = e.kickDir > 0 ? 360 : -360;
          SFX.stomp();
          break;
        }

        // Daño normal
        this.killPlayer();
        break;
      }
    }

    // Enemy <-> enemy: una concha en movimiento elimina otros enemigos
    for (const e of this.enemies) {
      if (e.kind !== 'crow' || !e.shellMode || !e.shellMoving || e.dead) continue;
      for (const other of this.enemies) {
        if (other === e || other.dead) continue;
        if (other.kind === 'boss') continue;
        if (overlap(e.aabb, other.aabb)) {
          if (other.kind === 'cactus' || (other.kind === 'crow' && other !== e && !other.shellMode)) {
            other.killByProjectile();
            this.score += 200;
          } else if (other.kind === 'slime') {
            other.killByProjectile();
            this.score += 200;
          }
        }
      }
    }

    // Backpack pickup (boss level)
    if (this.backpack && !this.backpack.collected) {
      this.backpack.update(dt);
      if (this.bossDefeated && overlap(this.backpack.aabb, this.player.aabb)) {
        this.backpack.collected = true;
        this.hasBackpack = true;
        this.score += 5000;
        this.showToast('¡Mochila de diseños recuperada!', 2);
      }
    }

    // Boss defeat
    if (this.boss && this.boss.dead && !this.bossDefeated) {
      this.bossDefeated = true;
      this.showToast('¡Derrotaste al Mapache Gigante Mutante!', 2.4);
      this.score += 3000;
      // Si la mochila ya está sobre el suelo, ahora se puede tomar.
    }

    // Goal touched
    if (this.goal && !this.goal.touched && overlap(this.goal.aabb, this.player.aabb)) {
      const def = LEVELS[this.levelIndex];
      if (def.isBoss) {
        // En el nivel del jefe sólo se completa si tomamos la mochila
        if (this.hasBackpack) {
          this.goal.touched = true;
          this.startLevelComplete();
        } else {
          this.showToast('¡Necesitas la mochila primero!', 1.2);
        }
      } else {
        this.goal.touched = true;
        this.startLevelComplete();
      }
    }

    // Particles
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 1400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Death sequence
    if (this.player.dead && this.player.deathTimer > 1.5) {
      this.lives -= 1;
      if (this.lives < 0) {
        this.state = STATE.GAME_OVER;
      } else {
        this.loadLevel(this.levelIndex);
      }
    }

    // Camera follow
    const targetX = this.player.x + this.player.width / 2 - VIEW_W / 2;
    this.cam.x = Math.max(0, Math.min(this.world.widthPx - VIEW_W, targetX));
    const targetY = this.player.y + this.player.height / 2 - VIEW_H / 2;
    this.cam.y = Math.max(0, Math.min(Math.max(0, this.world.heightPx - VIEW_H), targetY));

    // Shake update
    this.updateShake(dt);
  }

  addCoin() {
    this.totalCoins += 1;
    this.score += 100;
    SFX.coin();
    if (this.totalCoins > 0 && this.totalCoins % 100 === 0) {
      this.lives += 1;
      this.showToast('¡Vida extra!', 1.4);
      SFX.power();
    }
  }

  startLevelComplete() {
    this.state = STATE.LEVEL_COMPLETE;
    this.completeTimer = 2.0;
    this.bigMessage = '¡NIVEL COMPLETADO!';
    this.bigSubMessage = `Tiempo restante: +${Math.ceil(this.timeLeft)}`;
    this.bigMessageTimer = 2.0;
    this.score += Math.ceil(this.timeLeft) * 10;
    SFX.goal();
  }

  render() {
    // Aplicar screen shake (transform global excepto HUD)
    ctx.save();
    if (this.shakeIntensity > 0) {
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }

    // fondo + parallax
    this.world.drawBackground(ctx, this.cam, VIEW_W, VIEW_H, this.t);
    // tiles
    this.world.drawTiles(ctx, this.cam, VIEW_W, VIEW_H, this.t);

    // entidades
    if (this.goal) this.goal.draw(ctx, this.cam);
    if (this.backpack && !this.backpack.collected) this.backpack.draw(ctx, this.cam);

    for (const c of this.coins) c.draw(ctx, this.cam);
    for (const pu of this.powerUps) pu.draw(ctx, this.cam);
    for (const e of this.enemies) {
      if (e.dead && e.deadTimer > 1.5) continue;
      e.draw(ctx, this.cam, this.t);
    }
    for (const n of this.notes) n.draw(ctx, this.cam);
    for (const pc of this.popCoins) pc.draw(ctx, this.cam);

    // partículas
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      const size = Math.max(2, 4 * (p.life / 0.6));
      ctx.fillRect(p.x - this.cam.x, p.y - this.cam.y, size, size);
    }

    // jugador
    if (this.player) this.player.draw(ctx, this.cam, this.t);

    ctx.restore(); // fin de shake — el HUD va encima sin temblar

    // HUD
    drawHUD(ctx, VIEW_W, {
      lives: this.lives,
      coins: this.totalCoins % 100,
      score: this.score,
      world: `${this.levelIndex + 1}-1`,
      timeLeft: this.timeLeft,
      hasHeadphones: this.player ? this.player.hasHeadphones : false,
      hasBackpack: this.hasBackpack,
      bigMessage: this.bigMessage,
      bigSubMessage: this.bigSubMessage,
      bigMessageY: 160,
      toast: this.toast,
      toastTime: this.toastTime,
      bossHp: this.boss ? this.boss.hp : 0,
      bossHpMax: this.boss && !this.boss.dead ? 5 : 0,
    });
  }
}

new Game();
