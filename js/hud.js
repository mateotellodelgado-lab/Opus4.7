// HUD, mensajes, pantallas de pausa/game-over/victoria.

function drawHUD(ctx, viewW, state) {
  // Aviso imponente de INVASIÓN ALIEN: prioridad máxima, ocupa toda la
  // pantalla con strobe rojo, barras cinematográficas y texto pulsante.
  if (state.alertActive) {
    drawAlienAlert(ctx, viewW, ctx.canvas.height, state.t || 0,
                   state.alertTimer || 0, state.alertTotal || 3.6);
  }

  // Indicador permanente de "peligro alien activo" mientras el ataque dura
  if (state.alienAttackActive && !state.alertActive) {
    drawAlienDangerBanner(ctx, viewW, state.t || 0);
  }

  // barra superior
  ctx.fillStyle = 'rgba(8,5,22,0.55)';
  ctx.fillRect(0, 0, viewW, 36);

  ctx.fillStyle = '#f4eefb';
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.textBaseline = 'middle';

  // Mía mini + vidas
  drawMia(ctx, 8, 4, 20, 28, { facing: 1, hasHeadphones: state.hasHeadphones });
  ctx.fillText(`× ${state.lives}`, 32, 18);

  // Monedas
  drawCoin(ctx, 88, 6, 24, 0.1);
  ctx.fillText(`× ${String(state.coins).padStart(2, '0')}`, 116, 18);

  // Score
  ctx.fillText(`SCORE ${String(state.score).padStart(6, '0')}`, 180, 18);

  // Nivel
  ctx.fillText(`MUNDO ${state.world}`, 340, 18);

  // Tiempo
  const time = Math.max(0, Math.ceil(state.timeLeft));
  ctx.fillStyle = time < 30 ? '#ff7676' : '#f4eefb';
  ctx.fillText(`TIEMPO ${String(time).padStart(3, '0')}`, 460, 18);

  // Mochila status (si la tiene tras vencer al jefe)
  if (state.hasBackpack) {
    drawBackpack(ctx, viewW - 36, 4, 28);
  }

  // Mensaje de centro (level start, level complete, etc.)
  if (state.bigMessage) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, state.bigMessageY ?? 180, viewW, 100);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.bigMessage, viewW / 2, (state.bigMessageY ?? 180) + 40);
    if (state.bigSubMessage) {
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#cfc8e3';
      ctx.fillText(state.bigSubMessage, viewW / 2, (state.bigMessageY ?? 180) + 70);
    }
    ctx.textAlign = 'left';
  }

  // Toast (notificaciones cortas)
  if (state.toast && state.toastTime > 0) {
    ctx.fillStyle = 'rgba(8,5,22,0.7)';
    const tw = ctx.measureText(state.toast).width + 24;
    ctx.fillRect((viewW - tw) / 2, 50, tw, 26);
    ctx.fillStyle = '#ffd14f';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, viewW / 2, 67);
    ctx.textAlign = 'left';
  }

  // Barra de vida del jefe
  if (state.bossHpMax) {
    const x = viewW / 2 - 120, y = 44;
    ctx.fillStyle = 'rgba(8,5,22,0.7)';
    ctx.fillRect(x - 4, y - 4, 248, 22);
    ctx.fillStyle = '#3a2a55';
    ctx.fillRect(x, y, 240, 14);
    const ratio = Math.max(0, state.bossHp / state.bossHpMax);
    const grad = ctx.createLinearGradient(x, y, x + 240, y);
    grad.addColorStop(0, '#ff4fa3');
    grad.addColorStop(1, '#6cf0ff');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, 240 * ratio, 14);
    ctx.fillStyle = '#fff';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAPACHE GIGANTE MUTANTE', viewW / 2, y - 8);
    ctx.textAlign = 'left';
  }
}

// Pantalla de pausa
function drawPause(ctx, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,5,22,0.65)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSA', viewW / 2, viewH / 2);
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#cfc8e3';
  ctx.fillText('Pulsa P para continuar', viewW / 2, viewH / 2 + 30);
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,5,22,0.85)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#ff4fa3';
  ctx.font = 'bold 38px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', viewW / 2, viewH / 2 - 10);
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('Pulsa Enter para reintentar', viewW / 2, viewH / 2 + 24);
  ctx.textAlign = 'left';
}

function drawWin(ctx, viewW, viewH, state) {
  ctx.fillStyle = 'rgba(8,5,22,0.85)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#6cf0ff';
  ctx.font = 'bold 32px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('¡MOCHILA RECUPERADA!', viewW / 2, viewH / 2 - 30);
  ctx.fillStyle = '#fff';
  ctx.font = '15px "JetBrains Mono", monospace';
  ctx.fillText(`Mía vence al Mapache Gigante Mutante.`, viewW / 2, viewH / 2);
  ctx.fillStyle = '#ffd14f';
  ctx.fillText(`Score final: ${state.score}   ·   Monedas: ${state.totalCoins}`, viewW / 2, viewH / 2 + 24);
  ctx.fillStyle = '#cfc8e3';
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillText('Pulsa Enter para volver a empezar', viewW / 2, viewH / 2 + 56);
  ctx.textAlign = 'left';
}



// =========================================================================
// AVISO IMPONENTE DE INVASIÓN ALIEN (cada 3 niveles)
// =========================================================================
//
// Diseño cinematográfico:
//   - Strobe rojo de fondo (alpha pulsante)
//   - Barras negras superior/inferior (estilo "letterbox")
//   - Rayas diagonales animadas
//   - Texto "⚠ ALERTA: INVASIÓN ALIEN ⚠" GIGANTE pulsando + glow
//   - Subtexto explicativo
//   - Cuenta regresiva visual (barra de progreso)
//   - "Static" / scanlines parpadeantes
//
function drawAlienAlert(ctx, viewW, viewH, t, alertTimer, alertTotal) {
  const k = 1 - Math.max(0, Math.min(1, alertTimer / alertTotal)); // 0..1 progresión
  const fadeIn = Math.min(1, k * 4);          // entra rápido los primeros 0.25
  const fadeOut = Math.min(1, alertTimer / 0.4); // sale en los últimos 0.4
  const alpha = Math.min(fadeIn, fadeOut);

  // 1) Strobe rojo (parpadeo)
  const strobe = (Math.floor(t * 12) % 2 === 0) ? 0.6 : 0.25;
  ctx.fillStyle = `rgba(180,20,30,${strobe * alpha})`;
  ctx.fillRect(0, 0, viewW, viewH);

  // Capa oscura sobre el strobe
  ctx.fillStyle = `rgba(20,5,10,${0.55 * alpha})`;
  ctx.fillRect(0, 0, viewW, viewH);

  // 2) Rayas diagonales animadas (peligro)
  const stripeOffset = (t * 200) % 60;
  ctx.save();
  ctx.globalAlpha = 0.18 * alpha;
  ctx.fillStyle = '#ffd14f';
  for (let x = -viewH; x < viewW + viewH; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x + stripeOffset, 0);
    ctx.lineTo(x + 30 + stripeOffset, 0);
    ctx.lineTo(x + 30 + stripeOffset + viewH, viewH);
    ctx.lineTo(x + stripeOffset + viewH, viewH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3) Barras letterbox (cinematográficas)
  const barH = 60 * alpha;
  ctx.fillStyle = `rgba(0,0,0,${0.95 * alpha})`;
  ctx.fillRect(0, 0, viewW, barH);
  ctx.fillRect(0, viewH - barH, viewW, barH);
  // bordes brillantes
  ctx.fillStyle = `rgba(255,79,79,${alpha})`;
  ctx.fillRect(0, barH - 2, viewW, 2);
  ctx.fillRect(0, viewH - barH, viewW, 2);

  // 4) Iconos UFO en los laterales (entran desde fuera)
  const ufoX = 40 + Math.sin(t * 4) * 8;
  drawAlienShip(ctx, ufoX, 80 + Math.sin(t * 2) * 6, 60, 30, { t });
  drawAlienShip(ctx, viewW - ufoX - 60, 80 + Math.cos(t * 2) * 6, 60, 30, { t: t + 0.7 });

  // 5) Texto principal con glow y escala pulsante
  ctx.save();
  ctx.textAlign = 'center';
  const cx = viewW / 2;
  const cy = viewH / 2 - 10;

  // Pulse de escala
  const pulse = 1 + Math.sin(t * 8) * 0.06;

  // Glow fuerte detrás del texto (varios layers)
  for (let i = 5; i > 0; i--) {
    ctx.fillStyle = `rgba(255,79,79,${(0.16 / i) * alpha})`;
    ctx.font = `bold ${Math.round(56 * pulse + i * 6)}px "JetBrains Mono", monospace`;
    ctx.fillText('⚠ ALERTA ⚠', cx, cy);
  }

  // Texto principal
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.font = `bold ${Math.round(56 * pulse)}px "JetBrains Mono", monospace`;
  // Sombra dura
  ctx.fillStyle = `rgba(80,0,0,${alpha})`;
  ctx.fillText('⚠ ALERTA ⚠', cx + 4, cy + 4);
  // Texto blanco
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillText('⚠ ALERTA ⚠', cx, cy);

  // Subtexto: INVASIÓN ALIEN
  ctx.font = `bold ${Math.round(38 * pulse)}px "JetBrains Mono", monospace`;
  for (let i = 4; i > 0; i--) {
    ctx.fillStyle = `rgba(108,240,255,${(0.18 / i) * alpha})`;
    ctx.fillText('INVASIÓN ALIEN', cx, cy + 50);
  }
  ctx.fillStyle = `rgba(108,240,255,${alpha})`;
  ctx.fillText('INVASIÓN ALIEN', cx, cy + 50);

  // Línea pequeña de instrucciones (más suave)
  ctx.font = `bold 16px "JetBrains Mono", monospace`;
  ctx.fillStyle = `rgba(255,209,79,${alpha})`;
  ctx.fillText('NAVES HOSTILES DETECTADAS · ESQUIVA LOS RAYOS LÁSER', cx, cy + 90);
  ctx.fillStyle = `rgba(220,200,200,${alpha})`;
  ctx.font = `13px "JetBrains Mono", monospace`;
  ctx.fillText('un toque de láser o de nave = derrota instantánea', cx, cy + 112);

  ctx.restore();

  // 6) Barra de progreso del aviso (countdown)
  const barY = viewH - barH - 20;
  if (alpha > 0.3) {
    const w = viewW * 0.35;
    const x = (viewW - w) / 2;
    ctx.fillStyle = `rgba(0,0,0,${0.6 * alpha})`;
    ctx.fillRect(x - 2, barY - 2, w + 4, 8);
    ctx.fillStyle = `rgba(255,79,79,${alpha})`;
    ctx.fillRect(x, barY, w * (1 - k), 4);
  }

  // 7) "Static" / scanlines parpadeantes para look de transmisión rota
  if (Math.random() < 0.18) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 * alpha})`;
    const ny = Math.random() * viewH;
    ctx.fillRect(0, ny, viewW, 2);
  }
  ctx.fillStyle = `rgba(0,0,0,${0.18 * alpha})`;
  for (let y = 0; y < viewH; y += 4) ctx.fillRect(0, y, viewW, 1);

  ctx.textAlign = 'left';
}

// Banner permanente mientras la invasión está activa (después del aviso).
function drawAlienDangerBanner(ctx, viewW, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);

  // Borde rojo superior pulsante
  ctx.fillStyle = `rgba(255,40,80,${0.45 + pulse * 0.35})`;
  ctx.fillRect(0, 0, viewW, 4);

  // Texto centrado de aviso pequeño
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  const flash = Math.floor(t * 4) % 2 === 0;
  ctx.fillStyle = flash ? '#ff4f4f' : '#ffd14f';
  ctx.fillText('⚠  INVASIÓN ALIEN ACTIVA  ⚠', viewW / 2, 16);
  ctx.restore();
  ctx.textAlign = 'left';
}
