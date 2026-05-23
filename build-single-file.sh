#!/usr/bin/env bash
#
# Construye Mia.html: una versión autocontenida del juego en un único
# archivo HTML. Inlinea el CSS y todos los scripts del directorio js/
# en el orden de carga correcto.
#
# Uso:   ./build-single-file.sh
# Salida: Mia.html  (≈ 4700 líneas, ~150 KB)
#
set -euo pipefail
cd "$(dirname "$0")"

OUT=Neo.html
JS_FILES=(
  js/audio.js
  js/sprites.js
  js/levels.js
  js/world.js
  js/player.js
  js/enemies.js
  js/entities.js
  js/hud.js
  js/input.js
  js/main.js
)

# ----- HEAD (HTML + CSS embebido) -----------------------------------------
cat > "$OUT" <<'HTML_HEAD'
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mía: La Mochila Robada</title>
  <meta name="description" content="Plataformero 2D al estilo clásico. Mía debe recuperar su mochila de las garras del Mapache Gigante Mutante. ¡Cuidado con la invasión alien!" />
  <style>
HTML_HEAD

cat css/style.css >> "$OUT"

cat >> "$OUT" <<'HTML_AFTER_CSS'
  </style>
</head>
<body>
  <div id="app">
    <header>
      <h1>Mía: La Mochila Robada</h1>
      <p class="tagline">Un plataformero 2D al estilo clásico — todo en un solo archivo</p>
    </header>

    <div id="stage">
      <canvas id="game" width="960" height="540"></canvas>
      <div id="overlay" class="overlay">
        <div class="panel">
          <h2>Mía: La Mochila Robada</h2>
          <p>
            Recupera tu mochila de diseños de las garras del
            <strong>Mapache Gigante Mutante</strong>.
          </p>
          <ul class="controls">
            <li><kbd>A</kbd>/<kbd>D</kbd> o <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> &mdash; moverse</li>
            <li><kbd>Shift</kbd> &mdash; correr</li>
            <li><kbd>Espacio</kbd> o <kbd>&uarr;</kbd> &mdash; saltar (mantén para saltar más alto)</li>
            <li><kbd>K</kbd> o <kbd>Z</kbd> &mdash; atacar con espada &#9876;</li>
            <li><kbd>J</kbd> &mdash; lanzar nota musical (con auriculares mágicos)</li>
            <li><kbd>P</kbd> &mdash; pausar &nbsp;&middot;&nbsp; <kbd>R</kbd> &mdash; reiniciar nivel</li>
          </ul>
          <p class="tip">
            &#9888; <strong>Cada 3 niveles</strong> caen <strong>naves alienígenas</strong>
            disparando rayos láser. ¡Esquívalas o caerás al instante!
          </p>
          <button id="startBtn" type="button">Comenzar aventura</button>
        </div>
      </div>
    </div>

    <footer>
      <p>
        Mundos: <strong>La Ciudad</strong> &middot; <strong>El Parque Abandonado</strong> &middot;
        <strong>La Avenida Neón</strong> &middot; <strong>Las Alcantarillas</strong> &middot;
        <strong>La Azotea Eléctrica</strong> &middot; <strong>El Rascacielos</strong>
      </p>
    </footer>
  </div>

  <script>
"use strict";
HTML_AFTER_CSS

# ----- JS embebido --------------------------------------------------------
# Cada módulo se concatena en orden, con un banner separador para mantener
# el archivo navegable.
for f in "${JS_FILES[@]}"; do
  name=$(basename "$f")
  printf '\n/* =============================================================\n   %s\n   ============================================================= */\n' "$name" >> "$OUT"
  cat "$f" >> "$OUT"
done

# ----- Cierre -------------------------------------------------------------
cat >> "$OUT" <<'HTML_TAIL'
  </script>
</body>
</html>
HTML_TAIL

echo "OK: $(wc -l < "$OUT") lineas, $(wc -c < "$OUT") bytes en $OUT"
