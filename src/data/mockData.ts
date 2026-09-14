/**
 * @file mockData.ts
 * Datos iniciales y de demostración para el equipo amateur "Los Halcones FC".
 * Permite que la aplicación sea 100% utilizable y demostrable de inmediato en modo local.
 */

import { Jugador, Partido, Convocado, RivalJugador, Incidencia } from '../types';

export const JUGADORES_INICIALES: Jugador[] = [
  { id: 'jug-01', nombre: 'Matías Rodríguez', numero: 1, posicion: 'Arquero', activo: true, fecha_alta: '2026-01-10' },
  { id: 'jug-02', nombre: 'Franco Benítez', numero: 2, posicion: 'Defensor', activo: true, fecha_alta: '2026-01-10' },
  { id: 'jug-03', nombre: 'Gonzalo ' + 'Pérez', numero: 3, posicion: 'Defensor', activo: true, fecha_alta: '2026-01-10' },
  { id: 'jug-04', nombre: 'Nicolás Rossi', numero: 4, posicion: 'Defensor', activo: true, fecha_alta: '2026-01-12' },
  { id: 'jug-05', nombre: 'Sebastián Gómez', numero: 6, posicion: 'Defensor', activo: true, fecha_alta: '2026-01-10' },
  { id: 'jug-06', nombre: 'Ignacio Silva', numero: 5, posicion: 'Mediocampista', activo: true, fecha_alta: '2026-01-10' },
  { id: 'jug-07', nombre: 'Lucas Morales', numero: 8, posicion: 'Mediocampista', activo: true, fecha_alta: '2026-01-15' },
  { id: 'jug-08', nombre: 'Agustín Fernández', numero: 10, posicion: 'Mediocampista', activo: true, fecha_alta: '2026-01-10' },
  { id: 'jug-09', nombre: 'Joaquín Castro', numero: 11, posicion: 'Mediocampista', activo: true, fecha_alta: '2026-01-18' },
  { id: 'jug-10', nombre: 'Lautaro Díaz', numero: 7, posicion: 'Delantero', activo: true, fecha_alta: '2026-01-10' },
  { id: 'jug-11', nombre: 'Facundo Romero', numero: 9, posicion: 'Delantero', activo: true, fecha_alta: '2026-01-10' },
  // Suplentes habituales
  { id: 'jug-12', nombre: 'Emiliano Suárez', numero: 12, posicion: 'Arquero', activo: true, fecha_alta: '2026-02-01' },
  { id: 'jug-13', nombre: 'Tomás Vargas', numero: 13, posicion: 'Defensor', activo: true, fecha_alta: '2026-02-01' },
  { id: 'jug-14', nombre: 'Mauro Cabrera', numero: 14, posicion: 'Mediocampista', activo: true, fecha_alta: '2026-02-05' },
  { id: 'jug-15', nombre: 'Esteban Ortiz', numero: 15, posicion: 'Delantero', activo: true, fecha_alta: '2026-02-10' },
  { id: 'jug-16', nombre: 'Javier Luna', numero: 16, posicion: 'Defensor', activo: true, fecha_alta: '2026-02-10' },
  { id: 'jug-17', nombre: 'Diego Molina', numero: 17, posicion: 'Mediocampista', activo: true, fecha_alta: '2026-02-12' },
  { id: 'jug-18', nombre: 'Ramiro Acosta', numero: 18, posicion: 'Delantero', activo: false, fecha_alta: '2026-01-10' }
];

export const PARTIDOS_INICIALES: Partido[] = [
  {
    id: 'part-01',
    fecha: '2026-03-01',
    rival: 'Deportivo Central',
    modo_rival: 'nombre_numero',
    cancha: 'Complejo El Ombú - Cancha 1',
    condicion: 'local',
    resultado_propio: 3,
    resultado_rival: 1,
    agregado_1T: 2,
    agregado_2T: 3,
    duracion_tiempo_min: 40,
    estado: 'finalizado',
    creado_por: 'dt1234'
  },
  {
    id: 'part-02',
    fecha: '2026-03-08',
    rival: 'Atlético San Martín',
    modo_rival: 'numero',
    cancha: 'Polideportivo Municipal',
    condicion: 'visitante',
    resultado_propio: 2,
    resultado_rival: 2,
    agregado_1T: 1,
    agregado_2T: 4,
    duracion_tiempo_min: 40,
    estado: 'finalizado',
    creado_por: 'dt1234'
  }
];

export const CONVOCADOS_INICIALES: Convocado[] = [
  // Partido 1
  { id: 'c-01', partido_id: 'part-01', jugador_id: 'jug-01', titular: true },
  { id: 'c-02', partido_id: 'part-01', jugador_id: 'jug-02', titular: true },
  { id: 'c-03', partido_id: 'part-01', jugador_id: 'jug-03', titular: true },
  { id: 'c-04', partido_id: 'part-01', jugador_id: 'jug-04', titular: true },
  { id: 'c-05', partido_id: 'part-01', jugador_id: 'jug-05', titular: true },
  { id: 'c-06', partido_id: 'part-01', jugador_id: 'jug-06', titular: true },
  { id: 'c-07', partido_id: 'part-01', jugador_id: 'jug-07', titular: true },
  { id: 'c-08', partido_id: 'part-01', jugador_id: 'jug-08', titular: true },
  { id: 'c-09', partido_id: 'part-01', jugador_id: 'jug-09', titular: true },
  { id: 'c-10', partido_id: 'part-01', jugador_id: 'jug-10', titular: true },
  { id: 'c-11', partido_id: 'part-01', jugador_id: 'jug-11', titular: true },
  { id: 'c-12', partido_id: 'part-01', jugador_id: 'jug-13', titular: false },
  { id: 'c-13', partido_id: 'part-01', jugador_id: 'jug-14', titular: false },
  { id: 'c-14', partido_id: 'part-01', jugador_id: 'jug-15', titular: false },

  // Partido 2
  { id: 'c-20', partido_id: 'part-02', jugador_id: 'jug-01', titular: true },
  { id: 'c-21', partido_id: 'part-02', jugador_id: 'jug-02', titular: true },
  { id: 'c-22', partido_id: 'part-02', jugador_id: 'jug-03', titular: true },
  { id: 'c-23', partido_id: 'part-02', jugador_id: 'jug-04', titular: true },
  { id: 'c-24', partido_id: 'part-02', jugador_id: 'jug-05', titular: true },
  { id: 'c-25', partido_id: 'part-02', jugador_id: 'jug-06', titular: true },
  { id: 'c-26', partido_id: 'part-02', jugador_id: 'jug-07', titular: true },
  { id: 'c-27', partido_id: 'part-02', jugador_id: 'jug-08', titular: true },
  { id: 'c-28', partido_id: 'part-02', jugador_id: 'jug-10', titular: true },
  { id: 'c-29', partido_id: 'part-02', jugador_id: 'jug-11', titular: true },
  { id: 'c-30', partido_id: 'part-02', jugador_id: 'jug-15', titular: true },
  { id: 'c-31', partido_id: 'part-02', jugador_id: 'jug-09', titular: false },
  { id: 'c-32', partido_id: 'part-02', jugador_id: 'jug-14', titular: false },
  { id: 'c-33', partido_id: 'part-02', jugador_id: 'jug-17', titular: false }
];

export const RIVALES_INICIALES: RivalJugador[] = [
  // Partido 1
  { id: 'riv-01', partido_id: 'part-01', numero: 1, nombre: 'Suárez' },
  { id: 'riv-02', partido_id: 'part-01', numero: 2, nombre: 'Domínguez' },
  { id: 'riv-03', partido_id: 'part-01', numero: 4, nombre: 'Ríos' },
  { id: 'riv-04', partido_id: 'part-01', numero: 6, nombre: 'Alonso' },
  { id: 'riv-05', partido_id: 'part-01', numero: 5, nombre: 'Barrios' },
  { id: 'riv-06', partido_id: 'part-01', numero: 8, nombre: 'Mendoza' },
  { id: 'riv-07', partido_id: 'part-01', numero: 10, nombre: 'Gómez' },
  { id: 'riv-08', partido_id: 'part-01', numero: 7, nombre: 'Paz' },
  { id: 'riv-09', partido_id: 'part-01', numero: 9, nombre: 'Coronel' },
  { id: 'riv-10', partido_id: 'part-01', numero: 11, nombre: 'Villalba' },
  { id: 'riv-11', partido_id: 'part-01', numero: 3, nombre: 'Cardozo' },

  // Partido 2 (solo números)
  { id: 'riv-21', partido_id: 'part-02', numero: 1, nombre: '' },
  { id: 'riv-22', partido_id: 'part-02', numero: 2, nombre: '' },
  { id: 'riv-23', partido_id: 'part-02', numero: 3, nombre: '' },
  { id: 'riv-24', partido_id: 'part-02', numero: 4, nombre: '' },
  { id: 'riv-25', partido_id: 'part-02', numero: 5, nombre: '' },
  { id: 'riv-26', partido_id: 'part-02', numero: 7, nombre: '' },
  { id: 'riv-27', partido_id: 'part-02', numero: 8, nombre: '' },
  { id: 'riv-28', partido_id: 'part-02', numero: 9, nombre: '' },
  { id: 'riv-29', partido_id: 'part-02', numero: 10, nombre: '' },
  { id: 'riv-30', partido_id: 'part-02', numero: 11, nombre: '' },
  { id: 'riv-31', partido_id: 'part-02', numero: 14, nombre: '' }
];

export const INCIDENCIAS_INICIALES: Incidencia[] = [
  // Partido 1 (Victoria 3 - 1)
  { id: 'inc-01', partido_id: 'part-01', tiempo: 1, minuto: 12, segundo: 40, tipo: 'tiro', equipo: 'propio', jugador_id: 'jug-08', detalle: 'Remate de media distancia' },
  { id: 'inc-02', partido_id: 'part-01', tiempo: 1, minuto: 18, segundo: 15, tipo: 'gol', equipo: 'propio', jugador_id: 'jug-11', jugador_id_secundario: 'jug-08', detalle: 'Definición cruzada tras pase filtrado' },
  { id: 'inc-03', partido_id: 'part-01', tiempo: 1, minuto: 27, segundo: 30, tipo: 'amarilla', equipo: 'propio', jugador_id: 'jug-06', detalle: 'Corte de contraataque' },
  { id: 'inc-04', partido_id: 'part-01', tiempo: 1, minuto: 34, segundo: 10, tipo: 'gol', equipo: 'rival', jugador_id: 'riv-07', detalle: 'Tiro libre al ángulo' },
  { id: 'inc-05', partido_id: 'part-01', tiempo: 1, minuto: 41, segundo: 5, tipo: 'tiro_arco', equipo: 'propio', jugador_id: 'jug-10', detalle: 'Tapada del arquero rival' },
  // Segundo tiempo
  { id: 'inc-06', partido_id: 'part-01', tiempo: 2, minuto: 52, segundo: 20, tipo: 'gol', equipo: 'propio', jugador_id: 'jug-10', jugador_id_secundario: 'jug-07', detalle: 'Cabezazo tras tiro de esquina' },
  { id: 'inc-07', partido_id: 'part-01', tiempo: 2, minuto: 60, segundo: 0, tipo: 'cambio', equipo: 'propio', jugador_id: 'jug-09', jugador_id_secundario: 'jug-14', detalle: 'Sustitución táctica' },
  { id: 'inc-08', partido_id: 'part-01', tiempo: 2, minuto: 68, segundo: 45, tipo: 'cambio', equipo: 'propio', jugador_id: 'jug-11', jugador_id_secundario: 'jug-15', detalle: 'Delantero por delantero' },
  { id: 'inc-09', partido_id: 'part-01', tiempo: 2, minuto: 75, segundo: 10, tipo: 'gol', equipo: 'propio', jugador_id: 'jug-15', jugador_id_secundario: 'jug-10', detalle: 'Empujándola sobre la línea' },
  { id: 'inc-10', partido_id: 'part-01', tiempo: 2, minuto: 79, segundo: 50, tipo: 'amarilla', equipo: 'rival', jugador_id: 'riv-05', detalle: 'Reiteración de faltas' },

  // Partido 2 (Empate 2 - 2)
  { id: 'inc-20', partido_id: 'part-02', tiempo: 1, minuto: 8, segundo: 15, tipo: 'gol', equipo: 'rival', jugador_id: 'riv-28', detalle: 'Mano a mano' },
  { id: 'inc-21', partido_id: 'part-02', tiempo: 1, minuto: 22, segundo: 40, tipo: 'gol', equipo: 'propio', jugador_id: 'jug-08', detalle: 'Penal cobrado con precisión' },
  { id: 'inc-22', partido_id: 'part-02', tiempo: 1, minuto: 31, segundo: 10, tipo: 'amarilla', equipo: 'propio', jugador_id: 'jug-04', detalle: 'Falta sobre el lateral' },
  { id: 'inc-23', partido_id: 'part-02', tiempo: 2, minuto: 49, segundo: 30, tipo: 'gol', equipo: 'propio', jugador_id: 'jug-11', jugador_id_secundario: 'jug-08', detalle: 'Remate rasante' },
  { id: 'inc-24', partido_id: 'part-02', tiempo: 2, minuto: 64, segundo: 0, tipo: 'cambio', equipo: 'propio', jugador_id: 'jug-15', jugador_id_secundario: 'jug-09', detalle: 'Ingreso volante ofensivo' },
  { id: 'inc-25', partido_id: 'part-02', tiempo: 2, minuto: 78, segundo: 15, tipo: 'gol', equipo: 'rival', jugador_id: 'riv-29', detalle: 'Rebote tras tiro al travesaño' }
];

export const MOCK_PLANTEL = JUGADORES_INICIALES;
export const MOCK_PARTIDOS = PARTIDOS_INICIALES;
export const MOCK_CONVOCADOS = CONVOCADOS_INICIALES;
export const MOCK_RIVALES = RIVALES_INICIALES;
export const MOCK_INCIDENCIAS = INCIDENCIAS_INICIALES;

