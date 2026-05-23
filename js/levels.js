// Niveles definidos como filas de texto. Caracteres:
//
//   '.' / ' '  vacío
//   '#'        suelo sólido
//   '='        plataforma (sólida pero ligera)
//   'B'        ladrillo (sólido; rompible si Mía está grande)
//   '?'        caja misteriosa con moneda
//   '$'        caja misteriosa con power-up (alterna bebida/auriculares)
//   '*'        caja misteriosa con auriculares mágicos garantizados
//   'C'        moneda suelta
//   'S'        slime de basura (Goomba)
//   'K'        cuervo robacarteras caminando
//   'F'        cuervo robacarteras volando
//   'X'        cactus rodante
//   'G'        meta (estación / parada)
//   'M'        spawn de Mía (siempre debe existir uno por nivel)
//
// Todos los niveles miden 15 filas de alto. La fila inferior debe ser piso.
// Los niveles con `alienAttack: true` activan la invasión de naves alien
// con un aviso imponente al inicio. Por petición del usuario, esto pasa
// cada 3 niveles (3 y 6 con la nueva longitud de campaña).

// ---------- Helper para pintar filas ---------------------------------------
// Construye una fila de exactamente `width` chars colocando piezas en
// posiciones específicas, rellenando con '.' (vacío). Esto hace que los
// niveles sean legibles como un blueprint en lugar de cadenas gigantes.
function _row(width, ...pieces) {
  const buf = new Array(width).fill('.');
  for (let i = 0; i < pieces.length; i += 2) {
    const idx = pieces[i];
    const str = pieces[i + 1];
    for (let k = 0; k < str.length; k++) {
      if (idx + k >= 0 && idx + k < width) buf[idx + k] = str[k];
    }
  }
  return buf.join('');
}

// Suelo sólido continuo (todos '#') o con huecos definidos como pares [start,len].
function _floor(width, ...gaps) {
  const buf = new Array(width).fill('#');
  for (let i = 0; i < gaps.length; i += 2) {
    const start = gaps[i];
    const len = gaps[i + 1];
    for (let k = start; k < start + len && k < width; k++) buf[k] = '.';
  }
  return buf.join('');
}

// =========================================================================
// NIVEL 1 — La Ciudad (rediseñado, 130 cols)
// Multi-tier, callejón con saltos suaves, escalera a un edificio con secreto,
// puente sobre callejón, cuervo+cactus en final. Aprende todas las mecánicas
// sin sentirse vacío.
// =========================================================================
const _L1_W = 130;
const LEVEL_1_ROWS = [
  _row(_L1_W),                                                                // 0  cielo
  _row(_L1_W, 65, 'CCCCC'),                                                   // 1  secreto: monedas en lo alto
  _row(_L1_W, 60, '==========', 95, '====='),                                 // 2  techo del edificio + plataforma alta
  _row(_L1_W, 63, '$', 96, 'CCC'),                                            // 3  power-up arriba del edificio
  _row(_L1_W, 7, 'CCC', 32, '?', 56, '====', 95, '====='),                    // 4  trail de monedas + caja alta + plat
  _row(_L1_W, 15, '====', 36, 'BBBB', 52, '====', 78, 'B?B', 110, '===='),    // 5  plataformas medias + brick puzzle
  _row(_L1_W, 14, '?', 18, 'C', 30, '?', 38, '$', 48, '====', 70, 'CCCC', 110, 'CC'),       // 6  cajas + monedas + plat baja
  _row(_L1_W, 25, 'CCC', 60, '?', 64, '*', 100, '$', 122, 'CCC'),             // 7  monedas + caja secreta de auriculares
  _row(_L1_W, 5, 'CCC', 22, 'F', 78, 'CC', 122, 'C'),                         // 8  cuervo volador en patrullaje + monedas
  _row(_L1_W, 38, '====', 88, '======'),                                      // 9  plataforma media-baja
  _row(_L1_W, 47, 'X', 105, 'C', 110, 'C', 115, 'C'),                         // 10 cactus rodando + monedas previas a meta
  _row(_L1_W, 28, 'S', 68, 'K', 95, 'X', 128, 'G'),                           // 11 slime + cuervo caminante + cactus + GOAL
  _floor(_L1_W),                                                              // 12 piso (continuo en L1, sin huecos profundos)
  _floor(_L1_W),                                                              // 13 piso
  _floor(_L1_W),                                                              // 14 piso
];

// =========================================================================
// NIVEL 2 — El Parque Abandonado (mejorado)
// =========================================================================
const _L2_W = 120;
const LEVEL_2_ROWS = [
  _row(_L2_W),
  _row(_L2_W, 12, 'CCCC', 70, 'CCC'),
  _row(_L2_W, 10, '======', 38, '$', 68, '====='),
  _row(_L2_W, 90, 'F'),
  _row(_L2_W, 4, 'F', 35, '?BBB?', 52, 'CCCCC', 88, '?$?'),
  _row(_L2_W, 50, '================', 95, '======'),
  _row(_L2_W, 22, '?', 26, 'B', 28, '?', 84, 'CCCC'),
  _row(_L2_W, 5, 'CCC', 20, '====', 78, '======================'),
  _row(_L2_W, 98, 'F'),
  _row(_L2_W, 14, 'BBBB', 44, '====', 60, 'BBB', 96, 'BBB'),
  _row(_L2_W, 8, 'X', 32, 'S', 60, '====', 70, 'X'),
  _row(_L2_W, 4, 'S', 27, 'X', 50, 'S', 80, 'K', 118, 'G'),
  _floor(_L2_W, 6, 3, 38, 4, 75, 4),                                          // huecos: enseñar saltos
  _floor(_L2_W, 6, 3, 38, 4, 75, 4),
  _floor(_L2_W),
];

// =========================================================================
// NIVEL 3 — La Avenida Neón (NUEVO, ¡INVASIÓN ALIEN!)
// Nivel "puente" entre el parque y las alcantarillas: una avenida de neones
// en altura. Aquí descienden las naves alienígenas por primera vez.
// Diseñado con muchas plataformas para que el jugador pueda esquivar láseres.
// =========================================================================
const _L3_W = 140;
const LEVEL_3_ROWS = [
  _row(_L3_W, 5, 'CCCCCCC'),
  _row(_L3_W, 22, '==========', 70, '==========', 105, '=========='),
  _row(_L3_W, 25, '*', 73, '$', 108, '?'),
  _row(_L3_W, 15, 'F', 40, '====', 55, '====', 85, '====', 120, '===='),
  _row(_L3_W, 42, '?B?', 87, '?B?', 122, 'C'),
  _row(_L3_W, 10, '======', 30, 'F', 60, '======', 95, 'F', 125, 'CC'),
  _row(_L3_W, 12, '$', 65, '?', 96, 'CCCC'),
  _row(_L3_W, 25, 'CCCC', 50, '====', 78, '====', 110, '===='),
  _row(_L3_W, 38, 'BBB', 80, 'BBB', 100, 'F'),
  _row(_L3_W, 5, '====', 60, '====', 90, '======'),
  _row(_L3_W, 18, 'C', 22, 'C', 26, 'C', 92, 'X', 130, 'C'),
  _row(_L3_W, 8, 'S', 35, 'X', 70, 'S', 100, 'K', 138, 'G'),
  _floor(_L3_W, 16, 5, 48, 6, 82, 5, 115, 5),
  _floor(_L3_W, 16, 5, 48, 6, 82, 5, 115, 5),
  _floor(_L3_W),
];

// =========================================================================
// NIVEL 4 — Las Alcantarillas (mejorado)
// =========================================================================
const _L4_W = 130;
const LEVEL_4_ROWS = [
  _row(_L4_W),
  _row(_L4_W, 28, 'CCCC', 88, 'CCCCC'),
  _row(_L4_W, 25, '======', 86, '======='),
  _row(_L4_W, 12, 'F', 50, 'F', 105, 'F'),
  _row(_L4_W, 18, '?$?BBB?', 60, 'CCCCCCC', 110, '*'),
  _row(_L4_W, 35, '================', 90, '================'),
  _row(_L4_W, 8, 'CCC', 75, 'CCCC', 122, 'C'),
  _row(_L4_W, 5, '====', 38, '======', 70, '====', 98, '======'),
  _row(_L4_W),
  _row(_L4_W, 16, 'BBB', 48, 'BBBB', 84, 'BBB', 116, 'BBB'),
  _row(_L4_W, 4, 'S', 28, 'X', 56, 'S', 78, 'K', 100, 'X'),
  _row(_L4_W, 14, 'K', 40, 'F', 64, 'X', 92, 'S', 128, 'G'),
  _floor(_L4_W, 22, 4, 58, 4, 92, 4),
  _floor(_L4_W, 22, 4, 58, 4, 92, 4),
  _floor(_L4_W),
];

// =========================================================================
// NIVEL 5 — La Azotea Eléctrica (NUEVO, transición al jefe)
// Tejados conectados por cables y plataformas. Sin alien attack, pero con
// muchos cuervos voladores y saltos largos.
// =========================================================================
const _L5_W = 130;
const LEVEL_5_ROWS = [
  _row(_L5_W, 30, 'CCCCC', 90, 'CCCCC'),
  _row(_L5_W, 18, '========', 50, '*', 75, '==========='),
  _row(_L5_W, 20, 'F', 78, '$'),
  _row(_L5_W, 8, '======', 45, '========', 95, '======'),
  _row(_L5_W, 10, '?$?', 48, 'BBBB', 96, '?B?'),
  _row(_L5_W, 32, 'F', 60, 'CCC', 105, 'F'),
  _row(_L5_W, 25, '====', 65, '======', 105, '===='),
  _row(_L5_W, 5, 'CCCCC', 80, 'F', 115, 'CCC'),
  _row(_L5_W, 38, '======', 85, '======'),
  _row(_L5_W, 14, 'BB?BB', 56, 'BBB', 90, 'BBBB'),
  _row(_L5_W, 22, 'F', 58, 'X', 102, 'F'),
  _row(_L5_W, 6, 'X', 28, 'S', 50, 'K', 75, 'X', 100, 'S', 128, 'G'),
  _floor(_L5_W, 18, 6, 52, 6, 88, 6),
  _floor(_L5_W, 18, 6, 52, 6, 88, 6),
  _floor(_L5_W),
];

// =========================================================================
// NIVEL 6 — El Rascacielos (jefe + INVASIÓN ALIEN final)
// Mismo objetivo: derrotar al jefe y recoger la mochila. Pero ahora también
// caen naves alien para complicar la pelea: aviso imponente al entrar.
// =========================================================================
const _L6_W = 90;
const LEVEL_6_ROWS = [
  _row(_L6_W),
  _row(_L6_W),
  _row(_L6_W, 10, 'CCCCC', 70, 'CCCCC'),
  _row(_L6_W, 15, '*', 72, '$'),
  _row(_L6_W, 30, '==========', 50, '=========='),
  _row(_L6_W, 8, '========', 70, '========'),
  _row(_L6_W, 18, 'CCCCC', 60, 'CCCCC'),
  _row(_L6_W, 30, '==========', 50, '=========='),
  _row(_L6_W),
  _row(_L6_W, 14, '?$?', 70, '?*?'),
  _row(_L6_W, 6, 'BBBB', 78, 'BBBB'),
  _row(_L6_W, 88, 'G'),
  _floor(_L6_W),
  _floor(_L6_W),
  _floor(_L6_W),
];

// =========================================================================
const LEVELS = [
  {
    id: 1,
    name: 'La Ciudad',
    world: 'city',
    timeLimit: 260,
    bgColor: ['#1f1240', '#3a2065'],
    music: 'city',
    rows: LEVEL_1_ROWS,
    spawn: { col: 3, row: 11 },
  },
  {
    id: 2,
    name: 'El Parque Abandonado',
    world: 'park',
    timeLimit: 240,
    bgColor: ['#0e2a1a', '#1a4a2c'],
    music: 'park',
    rows: LEVEL_2_ROWS,
    spawn: { col: 2, row: 11 },
  },
  {
    id: 3,
    name: 'La Avenida Neón',
    world: 'neon',
    timeLimit: 280,
    bgColor: ['#0a0220', '#3d0f5e'],
    music: 'neon',
    rows: LEVEL_3_ROWS,
    spawn: { col: 2, row: 11 },
    alienAttack: true,                    // ¡ATAQUE ALIEN!
  },
  {
    id: 4,
    name: 'Las Alcantarillas',
    world: 'sewer',
    timeLimit: 260,
    bgColor: ['#0a0814', '#241a3a'],
    music: 'sewer',
    rows: LEVEL_4_ROWS,
    spawn: { col: 2, row: 11 },
  },
  {
    id: 5,
    name: 'La Azotea Eléctrica',
    world: 'storm',
    timeLimit: 260,
    bgColor: ['#0a0a25', '#2a1f55'],
    music: 'storm',
    rows: LEVEL_5_ROWS,
    spawn: { col: 2, row: 11 },
  },
  {
    id: 6,
    name: 'El Rascacielos',
    world: 'roof',
    timeLimit: 320,
    bgColor: ['#180a30', '#3d1466'],
    music: 'boss',
    isBoss: true,
    rows: LEVEL_6_ROWS,
    spawn: { col: 2, row: 11 },
    alienAttack: true,                    // ¡ATAQUE ALIEN final!
  },
];

// Validación / saneo: cada fila debe tener la misma longitud.
for (const lvl of LEVELS) {
  const w = lvl.rows[0].length;
  for (let i = 0; i < lvl.rows.length; i++) {
    if (lvl.rows[i].length !== w) {
      lvl.rows[i] = lvl.rows[i].padEnd(w, '.').slice(0, w);
    }
  }
  lvl.cols = w;
  lvl.rowsCount = lvl.rows.length;
}
