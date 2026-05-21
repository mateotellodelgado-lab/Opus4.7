// Keyboard input. Mapea teclas crudas a "acciones" para que el resto del
// juego no tenga que conocer combinaciones (A/← son la misma acción).

const ACTION_BY_KEY = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', Space: 'jump',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyJ: 'shoot',
  KeyK: 'attack',
  KeyZ: 'attack',     // alternativa
  KeyP: 'pause',
  KeyR: 'restart',
  Enter: 'confirm',
};

class Input {
  constructor() {
    this.down = new Set();      // acciones presionadas
    this.pressed = new Set();   // acciones que cambiaron a "presionadas" este frame
    this.released = new Set();  // acciones soltadas este frame

    window.addEventListener('keydown', (e) => {
      const action = ACTION_BY_KEY[e.code];
      if (!action) return;
      e.preventDefault();
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    });

    window.addEventListener('keyup', (e) => {
      const action = ACTION_BY_KEY[e.code];
      if (!action) return;
      e.preventDefault();
      this.down.delete(action);
      this.released.add(action);
    });

    // Si la pestaña pierde el foco, soltamos todo (evita "running ghost").
    window.addEventListener('blur', () => {
      this.down.clear();
    });
  }

  isDown(action)    { return this.down.has(action); }
  wasPressed(action){ return this.pressed.has(action); }
  wasReleased(action){ return this.released.has(action); }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }
}
