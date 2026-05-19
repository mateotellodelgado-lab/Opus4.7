import { drawMia, drawCoin, drawBackpack } from './sprites.js';

export function drawHUD(ctx, viewW, state) {
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
export function drawPause(ctx, viewW, viewH) {
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

export function drawGameOver(ctx, viewW, viewH) {
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

export function drawWin(ctx, viewW, viewH, state) {
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
