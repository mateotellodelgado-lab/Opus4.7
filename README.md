# Mía: La Mochila Robada

Un plataformero 2D inspirado en _Super Mario Bros_ con una protagonista y un
mundo renovados. Construido en HTML5 Canvas + JavaScript (ES modules), sin
frameworks ni assets externos: todo el pixel art se dibuja programáticamente.

> Mía está en un viaje para recuperar su **Mochila de Diseños**, robada por el
> **Mapache Gigante Mutante**. Para llegar hasta él tendrá que cruzar la
> Ciudad, el Parque Abandonado y las Alcantarillas hasta su guarida en la
> azotea de un rascacielos.

## Cómo jugar

Abre `index.html` desde un servidor estático (los módulos ES requieren HTTP,
no `file://`). Por ejemplo:

```bash
# Python 3
python3 -m http.server 8000
# luego abre http://localhost:8000

# o con Node
npx serve .
```

Pulsa **Comenzar aventura** y a jugar.

### Controles

| Acción              | Tecla                              |
| ------------------- | ---------------------------------- |
| Caminar             | `A`/`D` o `←`/`→`                  |
| Correr              | mantén `Shift`                     |
| Saltar              | `Espacio` o `↑` (mantén = más alto) |
| Lanzar nota musical | `J` (con auriculares mágicos)      |
| Pausar              | `P`                                |
| Reiniciar nivel     | `R`                                |
| Confirmar           | `Enter`                            |

## Mecánicas implementadas

- **Mía** con sprite original (cabello blanco, sudadera vibrante, jeans,
  zapatillas) y animación de caminar/saltar.
- **Salto variable**: la altura depende de cuánto tiempo se mantenga el botón.
  Incluye _coyote time_ y _jump buffer_ para que se sienta justo.
- **Cajas de cartón misteriosas** con tres variantes:
  - `?` da una **moneda de plata** (100 = 1 vida extra).
  - `$` da una **bebida energética** si Mía es pequeña, o **auriculares
    mágicos** si ya creció.
  - `*` da auriculares mágicos garantizados.
- **Power-Ups**:
  - **Bebida Energética** → Mía crece (resiste un golpe extra).
  - **Auriculares Mágicos** → puede lanzar **notas musicales** que rebotan en
    el suelo y derrotan enemigos a distancia, incluyendo cactus.
- **Enemigos**:
  - **Slimes de Basura** (Goombas) — patrullan; pisotón los aplasta.
  - **Cuervos Robacarteras** (Koopas) — caminantes o voladores. Al pisarlos se
    esconden en sus alas; un nuevo contacto los lanza como proyectil que
    elimina a otros enemigos.
  - **Cactus Rodantes** — invencibles al salto: hay que esquivarlos o
    destruirlos con notas musicales.
- **Meta** al final del nivel: **Estación / Parada de autobús** (no banderín).
- **Temporizador** por nivel; si se acaba, Mía pierde una vida.
- **Cuatro mundos**:
  1. La Ciudad
  2. El Parque Abandonado
  3. Las Alcantarillas
  4. El Rascacielos (jefe final)
- **Jefe final**: Mapache Gigante Mutante. 5 puntos de vida; aceptar pisotones
  y notas musicales por igual. Tras vencerlo aparece la **Mochila de Diseños**:
  recógela y llega a la parada para ganar.

## Estructura del proyecto

```
.
├── index.html
├── css/
│   └── style.css
└── js/
    ├── main.js       # bucle, estados, cámara, colisiones de alto nivel
    ├── input.js      # mapeo de teclado a acciones
    ├── audio.js      # SFX sintetizados con WebAudio (sin assets)
    ├── sprites.js    # pixel-art programático (fillRect)
    ├── world.js      # tilemap, fondos parallax, render de tiles
    ├── player.js     # Mía y su física
    ├── enemies.js    # Slime, Cuervo, Cactus, Jefe
    ├── entities.js   # Monedas, power-ups, notas, meta, mochila
    ├── levels.js     # niveles definidos como filas de texto
    └── hud.js        # interfaz, pantallas de pausa/win/gameover
```

Cada nivel es una rejilla de caracteres en `levels.js`:

| Char | Significado                                        |
| ---- | -------------------------------------------------- |
| `#`  | suelo                                              |
| `=`  | plataforma (atravesable desde abajo)               |
| `B`  | ladrillo (rompible si Mía es grande)               |
| `?`  | caja misteriosa con moneda                         |
| `$`  | caja con power-up adaptativo (bebida/auriculares)  |
| `*`  | caja con auriculares garantizados                  |
| `C`  | moneda suelta                                      |
| `S`  | slime · `K` cuervo · `F` cuervo volador · `X` cactus |
| `G`  | meta (estación / parada)                           |

Crear un nivel nuevo es tan fácil como añadir una entrada al array `LEVELS`.
