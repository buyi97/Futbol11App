/**
 * @file formations.ts
 * Definición de esquemas tácticos y posiciones en la cancha (coordenadas x, y en porcentaje).
 */

export interface PosicionTactico {
  pos: string;
  x: number; // 0 - 100% horizontal
  y: number; // 0 - 100% vertical (0 arriba / arco rival, 100 abajo / arco propio)
}

export const FORMACIONES_DISPONIBLES: Record<string, PosicionTactico[]> = {
  '4-3-3': [
    { pos: 'ARQ', x: 50, y: 88 },
    { pos: 'LI',  x: 16, y: 72 },
    { pos: 'DFC', x: 38, y: 75 },
    { pos: 'DFC', x: 62, y: 75 },
    { pos: 'LD',  x: 84, y: 72 },
    { pos: 'MCD', x: 50, y: 55 },
    { pos: 'MI',  x: 28, y: 46 },
    { pos: 'MD',  x: 72, y: 46 },
    { pos: 'EI',  x: 18, y: 22 },
    { pos: 'DC',  x: 50, y: 16 },
    { pos: 'ED',  x: 82, y: 22 },
  ],
  '4-4-2': [
    { pos: 'ARQ', x: 50, y: 88 },
    { pos: 'LD',  x: 84, y: 72 },
    { pos: 'DFC', x: 62, y: 75 },
    { pos: 'DFC', x: 38, y: 75 },
    { pos: 'LI',  x: 16, y: 72 },
    { pos: 'MD',  x: 82, y: 48 },
    { pos: 'MC',  x: 60, y: 50 },
    { pos: 'MC',  x: 40, y: 50 },
    { pos: 'MI',  x: 18, y: 48 },
    { pos: 'DC',  x: 38, y: 18 },
    { pos: 'DC',  x: 62, y: 18 },
  ],
  '4-1-3-2': [
    { pos: 'ARQ', x: 50, y: 88 },
    { pos: 'LI',  x: 16, y: 72 },
    { pos: 'DFC', x: 38, y: 75 },
    { pos: 'DFC', x: 62, y: 75 },
    { pos: 'LD',  x: 84, y: 72 },
    { pos: 'MCD', x: 50, y: 58 },
    { pos: 'MI',  x: 20, y: 40 },
    { pos: 'MCO', x: 50, y: 38 },
    { pos: 'MD',  x: 80, y: 40 },
    { pos: 'DC',  x: 38, y: 18 },
    { pos: 'DC',  x: 62, y: 18 },
  ],
  '4-3-1-2': [
    { pos: 'ARQ', x: 50, y: 88 },
    { pos: 'LI',  x: 16, y: 72 },
    { pos: 'DFC', x: 38, y: 75 },
    { pos: 'DFC', x: 62, y: 75 },
    { pos: 'LD',  x: 84, y: 72 },
    { pos: 'MC',  x: 28, y: 54 },
    { pos: 'MCD', x: 50, y: 57 },
    { pos: 'MC',  x: 72, y: 54 },
    { pos: 'MCO', x: 50, y: 35 },
    { pos: 'DC',  x: 38, y: 18 },
    { pos: 'DC',  x: 62, y: 18 },
  ],
  '3-5-2': [
    { pos: 'ARQ', x: 50, y: 88 },
    { pos: 'DFC', x: 25, y: 75 },
    { pos: 'DFC', x: 50, y: 76 },
    { pos: 'DFC', x: 75, y: 75 },
    { pos: 'CAI', x: 14, y: 50 },
    { pos: 'MC',  x: 36, y: 52 },
    { pos: 'MCO', x: 50, y: 40 },
    { pos: 'MC',  x: 64, y: 52 },
    { pos: 'CAD', x: 86, y: 50 },
    { pos: 'DC',  x: 38, y: 18 },
    { pos: 'DC',  x: 62, y: 18 },
  ],
  '4-2-3-1': [
    { pos: 'ARQ', x: 50, y: 88 },
    { pos: 'LI',  x: 16, y: 72 },
    { pos: 'DFC', x: 38, y: 75 },
    { pos: 'DFC', x: 62, y: 75 },
    { pos: 'LD',  x: 84, y: 72 },
    { pos: 'MCD', x: 38, y: 58 },
    { pos: 'MCD', x: 62, y: 58 },
    { pos: 'MI',  x: 20, y: 38 },
    { pos: 'MCO', x: 50, y: 35 },
    { pos: 'MD',  x: 80, y: 38 },
    { pos: 'DC',  x: 50, y: 16 },
  ]
};
