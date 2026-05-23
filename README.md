# Mátame Otra Vez — Troll Platformer

Un plataformas 2D estilo Cat Mario / Level Devil, contenido en
**un único `index.html`** sin librerías ni assets externos. Vanilla
JavaScript + HTML5 Canvas. Funciona en cualquier navegador moderno
(PC y móvil) con un solo archivo: lo abres y juegas.

> Regla nº 1: no confíes en nada que parezca seguro.<br>
> Regla nº 2: cuando mueras, mira dónde lo hiciste. Luego repite.

## Cómo jugarlo

Doble clic en `index.html` y listo. También puedes servirlo desde
cualquier sitio:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Controles

| PC                                   | Móvil                  |
| ------------------------------------ | ---------------------- |
| `← →` o `A` `D` — moverse            | botones ◀ ▶ (abajo izq) |
| `Espacio` / `↑` / `W` — saltar       | botón ▲ (abajo der)    |
| `R` — reiniciar el nivel             | tap en pantalla = saltar (en menús) |
| `M` — silenciar audio                |                        |

El salto es de **altura variable** (mantén el botón para saltar
más alto), con **coyote time** (100 ms tras dejar el borde) y
**buffer de salto** (120 ms antes de tocar el suelo).

## Las trampas (5 tipos + pinchos básicos)

| Trampa              | Cómo te jode |
| ------------------- | -------------- |
| **Plataforma falsa**  | Idéntica visualmente a una normal. Cae 0.18 s después de pisarla. |
| **Pincho troll**      | Oculto bajo el suelo, sale disparado cuando estás a ~100 px. |
| **Bloque caída libre**| Bloque de techo que se desploma cuando pasas por debajo. |
| **Meta falsa**        | El portal se mueve 50 px a la derecha al acercarte y revela un foso de pinchos donde ibas a aterrizar. |
| **Gravedad invertida**| Zona invisible: tu gravedad se invierte 2 s. Útil (y mortal) para sobrevolar fosos infranqueables. |
| Pincho normal         | Lo de siempre. Tocas, mueres, instantáneo. |

## Niveles

1. **La falsa seguridad** — Línea recta con tres saltos sobre fosos.
   Parece un platformer normal hasta el último salto, donde un Pincho
   Troll sale del suelo en el borde de aterrizaje exacto.
2. **La decepción** — Vertical. Subes por una escalera de plataformas.
   La 3ª es FALSA y cae. Tienes que reaccionar y aterrizar en una
   plataforma oculta debajo que lleva por la izquierda a la meta real.
   La "ruta obvia" hacia arriba está plagada de bloques de techo
   que se desploman.
3. **El caos mecánico** — Horizontal con vertical mezclado. Puente
   de plataformas falsas sobre un foso, pincho troll de refuerzo,
   y al final una zona de gravedad invertida que te obliga a
   sobrevolar un foso enorme. Remate: meta falsa que se aparta
   revelando pinchos justo donde habías saltado.

## Arquitectura del código

Todo está en `index.html` en el orden estricto que pide un proyecto
limpio:

1. **Constantes globales** (`CFG`, `COLORS`, `TRAP`, `STATE`)
2. **Sistema de audio** — WebAudio API, sonidos sintetizados
3. **Sistema de entrada** — teclado + touch con edge-detection
4. **Clases de entidad** — `Vec2`, `GameObject`, `Platform`, `Goal`, `Trap`, `Player`
5. **Motor de colisiones** — AABB clásico, resolución eje a eje
6. **Cámara** — lerp y bounds del nivel
7. **Gestor de estados** — `MENU` · `PLAYING` · `GAME_OVER` · `transition` · `WIN`
8. **Sistema de niveles** — `LEVELS[]` en JSON puro
9. **Bucle principal** — `requestAnimationFrame` con delta time clampeado a 1/30 s
10. **Renderizado** — con culling de viewport ± 100 px (objetos fuera no se actualizan ni dibujan)

### Optimización: culling

Tanto el `update` como el `render` saltan los objetos que estén
fuera del viewport más una franja de 100 px. Los objetos
"dinámicos" (plataformas falsas cayendo, bloques desplomándose,
meta falsa moviéndose) se marcan con `dynamic = true` para que
sigan actualizándose incluso si están fuera de cámara, evitando
estados inconsistentes.

## Estética

- Fondo `#222`, jugador `#0F0`, plataformas `#AAA`, peligros `#F00`,
  meta `#00F`. Cuadrícula de fondo sutil para leer el movimiento.
- Sin sprites: todo se dibuja con `fillRect` y `fill()`.

## Añadir un nivel

Edita `LEVELS` en `index.html`. Cada nivel es un objeto JSON con
`name`, `width`, `height`, `spawn`, `platforms`, `spikes`, `traps`
y `goal` (opcional si la meta es una `fake_goal`). Los IDs de
trampa están en la constante `TRAP`. Las trampas pueden tener
parámetros (`delay`, `triggerDist`, `popHeight`, `shift`,
`fallReach`, `duration`, `linkedSpikes`).
