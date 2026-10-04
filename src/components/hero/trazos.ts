/**
 * Trazos "a mano" del arte del hero. Todos viven en el mismo sistema de
 * coordenadas (viewBox 0 0 600 560) para que la taza, el vapor, la flecha y
 * las capas HTML encastren con porcentajes.
 *
 * Nada de círculos perfectos: cada curva tiene su desvío, los cierres se
 * pasan de largo y algunos contornos se repasan, como en un pizarrón.
 */

export const ARTE_ANCHO = 600;
export const ARTE_ALTO = 560;
export const ARTE_VIEWBOX = `0 0 ${ARTE_ANCHO} ${ARTE_ALTO}`;

/** Centro de la superficie del café: de ahí sale el vapor. */
export const BOCA_TAZA = { x: 372, y: 318 } as const;

/* ------------------------------------------------------------------ plato */
export const PLATO = {
  frente:
    "M203 474C201 491 236 503 286 508C318 511 346 512 372 511C432 510 486 503 518 492C531 487 539 482 538 476",
  atrasIzq: "M205 479C199 466 230 455 272 451C286 449 300 448 314 448",
  atrasDer: "M428 448C474 450 512 457 531 466C537 469 540 473 537 478",
  base: "M217 489C229 510 296 523 371 523C441 523 506 513 523 492",
  hueco: "M296 479C306 490 342 494 372 494C402 494 432 490 444 480",
} as const;

/* ------------------------------------------------------------------ cuerpo */
export const CUERPO = {
  silueta:
    "M259 333C258 360 263 392 276 420C290 446 308 461 332 468C356 476 386 477 410 468C437 458 458 438 470 410C480 386 483 360 482 331",
  repaso: "M264 352C268 392 285 428 314 452C320 457 326 461 332 464",
  pie: "M323 462C319 472 343 480 371 480C399 480 421 474 419 463",
  guardaArriba: "M264 371C292 386 330 393 372 393C414 393 452 386 478 370",
  guardaAbajo: "M271 397C300 411 334 417 371 417C410 417 444 411 471 396",
} as const;

/** Rombitos de la guarda, calculados sobre la curva media de la banda. */
export const GUARDA_ROMBOS: string = (() => {
  const p0 = [267, 384];
  const p1 = [306, 404];
  const p2 = [436, 404];
  const p3 = [475, 384];
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = "";
  for (let i = 1; i <= 11; i++) {
    const t = i / 12;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    // Rombos un poco más chicos hacia los costados (perspectiva)
    const s = 3.2 + 1.6 * Math.sin(Math.PI * t);
    d += `M${r(x - s)} ${r(y)}L${r(x)} ${r(y - s)}L${r(x + s)} ${r(y)}L${r(x)} ${r(y + s)}Z`;
  }
  return d;
})();

/* ------------------------------------------------------------------ asa */
export const ASA = {
  afuera: "M481 352C504 342 529 343 539 360C549 378 541 400 523 413C506 425 485 426 465 421",
  adentro: "M479 369C496 362 513 365 517 378C521 392 510 404 494 408C485 410 476 409 469 406",
} as const;

/* ------------------------------------------------------------------ boca */
export const BORDE =
  "M260 333C258 314 313 304 370 304C428 304 482 312 482 329C483 346 430 356 370 356C312 357 258 348 259 331C260 324 268 318 281 314";

export const CAFE = {
  superficie:
    "M277 337C278 325 322 318 371 318C420 318 465 326 465 336C464 348 419 354 371 354C323 354 276 349 277 337Z",
  brillo: "M306 330C334 323 381 322 414 326",
  remolino: "M350 341C360 334 382 335 388 342C384 347 370 348 362 344",
} as const;

/** Sombreado de tiza sobre el plato, a la derecha de la taza. */
export const SOMBRA_PLATO =
  "M424 487L437 478M436 489L449 480M448 490L460 482M460 490L471 483M311 487L299 479M300 486L289 479";

/* ------------------------------------------------------------------ vapor */
/** Cada voluta tiene dos formas: el vapor ondula morfando entre una y otra. */
export const VOLUTAS = [
  {
    a: "M334 318C318 290 350 268 336 238C322 208 352 186 340 156C332 136 344 120 338 104",
    b: "M334 318C352 292 320 266 340 238C358 210 324 186 344 158C354 138 334 122 342 104",
    ancho: 5,
    dash: "64 18 26 22",
  },
  {
    a: "M372 314C390 286 356 260 374 228C392 196 358 170 376 138C386 118 370 98 378 78",
    b: "M372 314C354 288 388 258 370 228C352 198 388 172 368 140C358 120 380 100 372 78",
    ancho: 6,
    dash: "80 20 34 26",
  },
  {
    a: "M410 318C428 294 400 274 416 246C432 220 406 200 420 172C428 154 416 140 424 124",
    b: "M410 318C394 296 424 272 406 246C390 222 418 200 402 174C394 156 410 140 404 124",
    ancho: 5,
    dash: "56 16 22 24",
  },
] as const;

/* ------------------------------------------------------------------ flecha */
export const FLECHA = {
  cuerpo: "M93 362C90 381 99 400 119 412C146 428 196 425 247 404",
  punta: "M222 389C232 394 242 399 250 403C243 409 236 414 229 421",
} as const;

/* ------------------------------------------------------------------ grano */
export const GRANO = {
  contorno:
    "M1 -18C11 -18.5 15.5 -7 14.5 2.5C13.5 12.5 7.5 19.5 -0.5 19C-9.5 18.5 -14.5 9 -14 -0.5C-13.5 -10.5 -9 -17.5 2.5 -18.2",
  surco: "M-0.5 -15C-6 -8.5 5.5 -2 0.5 4.5C-3.5 10 2 14 0 16.5",
} as const;

/* ------------------------------------------------------------- subrayado */
/** Garabato bajo "café": ida, vuelta corta y un rulito al final. */
export const SUBRAYADO = {
  viewBox: "0 0 240 34",
  ida: "M6 19C38 13 84 10 132 11C168 12 202 14 232 12",
  vuelta: "M224 16C180 20 128 22 80 23C56 24 34 25 18 27",
} as const;
