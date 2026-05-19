# Mía: La Mochila Robada

Un plataformero 2D inspirado en _Super Mario Bros_ con una protagonista y un
mundo renovados. Construido en HTML5 Canvas + JavaScript (ES5+ clásico, sin
módulos ES). No usa frameworks ni assets externos: todo el pixel art se
dibuja programáticamente.

> Mía está en un viaje para recuperar su **Mochila de Diseños**, robada por el
> **Mapache Gigante Mutante**. Para llegar hasta él tendrá que cruzar la
> Ciudad, el Parque Abandonado y las Alcantarillas hasta su guarida en la
> azotea de un rascacielos.

## Cómo descargarlo y jugarlo

### Opción A — Descarga ZIP (la más fácil, sin terminal)

1. Entra al repo en GitHub:
   <https://github.com/mateotellodelgado-lab/Opus4.7>
2. Pulsa el botón verde **`<> Code`** → **Download ZIP**.
3. Extrae el ZIP en cualquier carpeta.
4. Haz **doble clic en `index.html`** — se abrirá en tu navegador.
5. Pulsa **Comenzar aventura** y juega.

> El juego corre 100% en local; no necesita conexión a internet ni instalar
> nada.

### Opción B — Clonar con git

```bash
git clone https://github.com/mateotellodelgado-lab/Opus4.7.git
cd Opus4.7
# abre index.html con doble clic, o:
xdg-open index.html      # Linux
open index.html          # macOS
start index.html         # Windows
```

### Controles

| Acción              | Tecla                                |
| ------------------- | ------------------------------------ |
| Caminar             | `A`/`D` o `←`/`→`                    |
| Correr              | mantén `Shift`                       |
| Saltar              | `Espacio` o `↑` (mantén = más alto)   |
| Lanzar nota musical | `J` (con auriculares mágicos)        |
| Pausar              | `P`                                  |
| Reiniciar nivel     | `R`                                  |
| Confirmar           | `Enter`                              |

> Para que el sonido se active, el navegador exige una interacción del
> usuario. El primer clic en **Comenzar aventura** lo desbloquea.

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
  - **Slimes de Basura** (Goomba) — patrullan; pisotón los aplasta.
  - **Cuervos Robacarteras** (Koopa) — caminantes o voladores. Al pisarlos se
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
- **Jefe final**: Mapache Gigante Mutante. 5 puntos de vida, recibe pisotones
  y notas musicales por igual. Tras vencerlo aparece la **Mochila de Diseños**:
  recógela y llega a la parada para ganar.

## Estructura del proyecto

```
.
├── index.html
├── css/
│   └── style.css
└── js/
    ├── audio.js      # SFX sintetizados con WebAudio (sin assets)
    ├── sprites.js    # pixel-art programático (fillRect)
    ├── levels.js     # 4 niveles definidos como filas de texto
    ├── world.js      # tilemap, fondos parallax, render de tiles
    ├── player.js     # Mía y su física
    ├── enemies.js    # Slime, Cuervo, Cactus, Jefe
    ├── entities.js   # Monedas, power-ups, notas, meta, mochila
    ├── hud.js        # interfaz, pantallas de pausa/win/gameover
    ├── input.js      # mapeo de teclado a acciones
    └── main.js       # bucle, estados, cámara, colisiones de alto nivel
```

Cada nivel es una rejilla de caracteres en `levels.js`:

| Char | Significado                                         |
| ---- | --------------------------------------------------- |
| `#`  | suelo                                               |
| `=`  | plataforma (atravesable desde abajo)                |
| `B`  | ladrillo (rompible si Mía es grande)                |
| `?`  | caja misteriosa con moneda                          |
| `$`  | caja con power-up adaptativo (bebida/auriculares)   |
| `*`  | caja con auriculares garantizados                   |
| `C`  | moneda suelta                                       |
| `S`  | slime · `K` cuervo · `F` cuervo volador · `X` cactus |
| `G`  | meta (estación / parada)                            |

Crear un nivel nuevo es tan fácil como añadir una entrada al array `LEVELS`.
