# La Confesión — Mateo y Rossy

Juego HTML pixel art (vanilla JS + canvas, sin librerías ni assets
externos) sobre un chico llamado **Mateo** que decide hoy, por fin,
confesarle sus sentimientos a **Rossy** en el colegio.

Pero el Colegio San Esteban no es lo que parece.

A medida que las horas avanzan, los pasillos cambian, los compañeros
empiezan a susurrar cosas extrañas, y la realidad se desmorona en
sangre, distorsión y silencios demasiado largos.

> Todo en un único `index.html`. Lo abres en el navegador (PC o móvil)
> y juegas.

## Sinopsis

Mateo lleva seis meses queriendo decírselo. Hoy es el día. Hoy va a
encontrar a Rossy en el colegio y va a confesarle lo que siente.
Pero algo no encaja en este sitio. Algo que no recuerda.

Cuanto más se acerca a Rossy, más se rompe el mundo.

## Cómo jugar

| PC                                                       | Móvil                              |
| -------------------------------------------------------- | ---------------------------------- |
| `↑ ↓ ← →` o `WASD` — moverse                              | D-pad táctil (esquina inferior izq) |
| `Espacio`, `E` o `Enter` — interactuar / avanzar diálogo  | botón **A** (esquina inferior der)  |
| `M` — silenciar audio                                     |                                    |

Acércate a un personaje y pulsa **acción** para hablar con él. Pisa
una puerta y pulsa **acción** para cambiar de escenario.

## Los cuatro actos

1. **I — La carta**: 8:00 AM. Pasillo principal. Habla con Pablo y
   Sofía, esquiva a Diego y entra al aula 3-B. Encuentra a Rossy.
2. **II — El recreo**: 10:30. Algo se siente mal. Las luces parpadean,
   sombras en las paredes. Encuentra a Rossy en el patio.
3. **III — Lo que se rompió**: 13:00. El colegio se ha transformado.
   Sangre en el suelo. El profesor ya no es humano. Pablo no parpadea.
4. **IV — La confesión**: La verdad sobre por qué Rossy te esperó
   tanto tiempo. Y por qué el colegio te ha dejado entrar otra vez.

## Personajes

- **Mateo** (jugador) — pelo castaño, camisa blanca, pantalón azul.
- **Rossy** — pelo magenta, vestido rosa. La razón por la que Mateo está aquí.
- **Pablo** — su mejor amigo. Camiseta verde.
- **Sofía** — amiga de Rossy. Vestido amarillo.
- **Diego** — el matón. El rival. Camiseta roja.
- **Prof. Ramírez** — el profesor. En el acto 3 ya no es lo que parece.
- **???** — la sombra que parpadea al fondo de los pasillos.

## Características técnicas

- Canvas lógico **480×270** escalado al viewport con
  `image-rendering: pixelated`. Pixel art real, no texturas filtradas.
- **Sprites 16×16** definidos como arrays de strings y pintados
  píxel a píxel sobre canvas off-screen, cacheados por (sprite + paleta + flip).
- **Tiles 16×16** procedurales (paredes, lockers, mesas, pizarra,
  puerta, árboles, banca, ventana, charcos de sangre) con
  redibujado completo cuando cambia la paleta del horror.
- **Cuatro paletas de mundo** (`NORMAL → UNEASY → BROKEN → FINAL`)
  que el motor invalida y regenera al avanzar de acto.
- **Efectos visuales**: glitch (desplazamiento de scanlines + tinte
  rojo), screen shake en sustos, vignette progresiva, "caras"
  parpadeantes en las paredes desde el acto 3, manchas de sangre
  procedurales sobre cada tile en horror alto.
- **Audio sintetizado** (WebAudio API): pasos, blips de typewriter,
  abrir puerta, susto grave, glitches.
- **Sistema de diálogo** con efecto typewriter, soporte de eventos
  embebidos en líneas (`!evento|texto`) y modo "glitch" para líneas
  corruptas.
- **Input** unificado teclado + táctil con detección de flanco
  (`_actionEdge`) para que un mismo botón sirva como "interactuar"
  y "avanzar diálogo" sin doble disparo.
- **Colisiones** AABB tile-based contra el mapa y contra los NPCs.

## Arquitectura del código

`index.html` es un único archivo organizado en bloques numerados:

1. Constantes y paletas (`W`, `H`, `TILE`, `COLS`, `ROWS`, `WORLD_PAL`, `HORROR`)
2. Audio sintetizado (`Audio`)
3. Input unificado (`Input`)
4. Sprites pixel art (`SP_*`, `getSprite`)
5. Tiles procedurales (`getTile`, `drawTile`)
6. Mapas de escenas (`MAP_HALLWAY`, `MAP_CLASSROOM`, …)
7. Definición de escenas (`SCENES`)
8. Diálogos (`DIALOGS`) con eventos embebidos
9. Entidades (`Entity`, `Player`, `NPC`)
10. Sistema de diálogo (`DialogBox`)
11. Estado de juego (`Game`) — máquina de estados
    (`TITLE → INTRO → PLAY ↔ DIALOG → TRANS → … → END`)
12. Render con efectos de horror (vignette, glitch, caras de pared)
13. Bucle principal con `requestAnimationFrame` y delta clampeado a 50 ms

## Añadir contenido

- **Un nuevo personaje**: añade su paleta (array de 6 colores) y su
  bloque en `DIALOGS[id]`. Crea el NPC en `Game.spawnNPCs` para la
  escena/acto que toque.
- **Una nueva escena**: define el mapa como array de 14 strings de
  30 chars usando los tiles documentados arriba. Añade una entrada
  a `SCENES` con su `spawn` y sus `exits`.
- **Un nuevo evento**: añade un `case` a `Game.fireEvent` y úsalo
  desde un diálogo con `'!miEvento|texto opcional'`.

## Aviso

Contiene horror psicológico estilizado (pixel art): sangre dibujada
con rectángulos rojos, distorsiones visuales, sustos suaves. Apto
para fans de juegos como *Yume Nikki*, *Doki Doki Literature Club*
o *Mad Father*. Si te incomodan los parpadeos rápidos en pantalla,
considéralo antes de jugar.
