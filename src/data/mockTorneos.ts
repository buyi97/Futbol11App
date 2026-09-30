/**
 * @file mockTorneos.ts
 * Datos iniciales y de demostración para torneos, fixture de fechas, tabla anual y copa FairPlay.
 */

import { TorneoDetalle } from '../types';

export const MOCK_TORNEO_APERTURA_2026: TorneoDetalle = {
  torneoId: 'torneo-apertura-2026',
  equipos: [
    'Los Halcones FC',
    'Deportivo Central',
    'Atlético San Martín',
    'Sportivo Belgrano',
    'Juventud Unida',
    'Defensores del Norte',
    'Racing Club Amateur',
    'Unión Vecinal'
  ],
  fechaProximaNumero: 3,
  fechas: [
    {
      numero: 1,
      nombre: 'Fecha 1',
      estado: 'jugada',
      esProxima: false,
      partidos: [
        {
          id: 'f1-p1',
          equipoLocal: 'Los Halcones FC',
          equipoVisitante: 'Deportivo Central',
          golesLocal: 3,
          golesVisitante: 1,
          jugado: true,
          fechaHora: '01/03/2026 - 16:00 hs',
          cancha: 'Complejo El Ombú - Cancha 1',
          partidoAppId: 'part-01'
        },
        {
          id: 'f1-p2',
          equipoLocal: 'Atlético San Martín',
          equipoVisitante: 'Sportivo Belgrano',
          golesLocal: 2,
          golesVisitante: 0,
          jugado: true,
          fechaHora: '01/03/2026 - 14:00 hs',
          cancha: 'Polideportivo San Martín'
        },
        {
          id: 'f1-p3',
          equipoLocal: 'Juventud Unida',
          equipoVisitante: 'Defensores del Norte',
          golesLocal: 1,
          golesVisitante: 1,
          jugado: true,
          fechaHora: '01/03/2026 - 15:30 hs',
          cancha: 'Predio Los Aromos'
        },
        {
          id: 'f1-p4',
          equipoLocal: 'Racing Club Amateur',
          equipoVisitante: 'Unión Vecinal',
          golesLocal: 0,
          golesVisitante: 2,
          jugado: true,
          fechaHora: '01/03/2026 - 17:00 hs',
          cancha: 'Cancha La Ribera'
        }
      ]
    },
    {
      numero: 2,
      nombre: 'Fecha 2',
      estado: 'jugada',
      esProxima: false,
      partidos: [
        {
          id: 'f2-p1',
          equipoLocal: 'Atlético San Martín',
          equipoVisitante: 'Los Halcones FC',
          golesLocal: 2,
          golesVisitante: 2,
          jugado: true,
          fechaHora: '08/03/2026 - 16:30 hs',
          cancha: 'Polideportivo Municipal',
          partidoAppId: 'part-02'
        },
        {
          id: 'f2-p2',
          equipoLocal: 'Deportivo Central',
          equipoVisitante: 'Racing Club Amateur',
          golesLocal: 1,
          golesVisitante: 0,
          jugado: true,
          fechaHora: '08/03/2026 - 14:00 hs',
          cancha: 'Complejo El Ombú - Cancha 2'
        },
        {
          id: 'f2-p3',
          equipoLocal: 'Sportivo Belgrano',
          equipoVisitante: 'Juventud Unida',
          golesLocal: 3,
          golesVisitante: 2,
          jugado: true,
          fechaHora: '08/03/2026 - 15:30 hs',
          cancha: 'Club Belgrano'
        },
        {
          id: 'f2-p4',
          equipoLocal: 'Unión Vecinal',
          equipoVisitante: 'Defensores del Norte',
          golesLocal: 0,
          golesVisitante: 0,
          jugado: true,
          fechaHora: '08/03/2026 - 17:00 hs',
          cancha: 'Predio Unión'
        }
      ]
    },
    {
      numero: 3,
      nombre: 'Fecha 3',
      estado: 'proxima',
      esProxima: true,
      partidos: [
        {
          id: 'f3-p1',
          equipoLocal: 'Los Halcones FC',
          equipoVisitante: 'Sportivo Belgrano',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Próx. Sábado - 16:00 hs',
          cancha: 'Complejo El Ombú - Cancha 1'
        },
        {
          id: 'f3-p2',
          equipoLocal: 'Defensores del Norte',
          equipoVisitante: 'Deportivo Central',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Próx. Sábado - 14:00 hs',
          cancha: 'Cancha Defensores'
        },
        {
          id: 'f3-p3',
          equipoLocal: 'Juventud Unida',
          equipoVisitante: 'Atlético San Martín',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Próx. Sábado - 17:30 hs',
          cancha: 'Predio Los Aromos'
        },
        {
          id: 'f3-p4',
          equipoLocal: 'Unión Vecinal',
          equipoVisitante: 'Racing Club Amateur',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Próx. Domingo - 11:00 hs',
          cancha: 'Cancha La Ribera'
        }
      ]
    },
    {
      numero: 4,
      nombre: 'Fecha 4',
      estado: 'pendiente',
      esProxima: false,
      partidos: [
        {
          id: 'f4-p1',
          equipoLocal: 'Defensores del Norte',
          equipoVisitante: 'Los Halcones FC',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Cancha Defensores'
        },
        {
          id: 'f4-p2',
          equipoLocal: 'Deportivo Central',
          equipoVisitante: 'Juventud Unida',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Complejo El Ombú'
        },
        {
          id: 'f4-p3',
          equipoLocal: 'Sportivo Belgrano',
          equipoVisitante: 'Unión Vecinal',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Club Belgrano'
        },
        {
          id: 'f4-p4',
          equipoLocal: 'Racing Club Amateur',
          equipoVisitante: 'Atlético San Martín',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Cancha La Ribera'
        }
      ]
    },
    {
      numero: 5,
      nombre: 'Fecha 5',
      estado: 'pendiente',
      esProxima: false,
      partidos: [
        {
          id: 'f5-p1',
          equipoLocal: 'Los Halcones FC',
          equipoVisitante: 'Unión Vecinal',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Complejo El Ombú'
        },
        {
          id: 'f5-p2',
          equipoLocal: 'Juventud Unida',
          equipoVisitante: 'Racing Club Amateur',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Predio Los Aromos'
        },
        {
          id: 'f5-p3',
          equipoLocal: 'Atlético San Martín',
          equipoVisitante: 'Defensores del Norte',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Polideportivo San Martín'
        },
        {
          id: 'f5-p4',
          equipoLocal: 'Sportivo Belgrano',
          equipoVisitante: 'Deportivo Central',
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          fechaHora: 'Por programar',
          cancha: 'Club Belgrano'
        }
      ]
    }
  ],
  tablaAnualBase: {
    'Los Halcones FC': { equipo: 'Los Halcones FC', pj: 14, pg: 9, pe: 3, pp: 2, gf: 28, gc: 14, puntos: 30 },
    'Atlético San Martín': { equipo: 'Atlético San Martín', pj: 14, pg: 9, pe: 2, pp: 3, gf: 25, gc: 12, puntos: 29 },
    'Sportivo Belgrano': { equipo: 'Sportivo Belgrano', pj: 14, pg: 8, pe: 2, pp: 4, gf: 22, gc: 16, puntos: 26 },
    'Deportivo Central': { equipo: 'Deportivo Central', pj: 14, pg: 7, pe: 3, pp: 4, gf: 20, gc: 17, puntos: 24 },
    'Unión Vecinal': { equipo: 'Unión Vecinal', pj: 14, pg: 5, pe: 4, pp: 5, gf: 18, gc: 18, puntos: 19 },
    'Defensores del Norte': { equipo: 'Defensores del Norte', pj: 14, pg: 4, pe: 4, pp: 6, gf: 15, gc: 21, puntos: 16 },
    'Juventud Unida': { equipo: 'Juventud Unida', pj: 14, pg: 3, pe: 3, pp: 8, gf: 14, gc: 26, puntos: 12 },
    'Racing Club Amateur': { equipo: 'Racing Club Amateur', pj: 14, pg: 1, pe: 3, pp: 10, gf: 9, gc: 31, puntos: 6 }
  },
  goleadores: [
    { id: 'gol-1', nombre: 'Facundo Romero', equipo: 'Los Halcones FC', goles: 2, jugadorAppId: 'jug-11' },
    { id: 'gol-2', nombre: 'Carlos Mendoza', equipo: 'Deportivo Central', goles: 2 },
    { id: 'gol-3', nombre: 'Matías Benítez', equipo: 'Atlético San Martín', goles: 2 },
    { id: 'gol-4', nombre: 'Lautaro Díaz', equipo: 'Los Halcones FC', goles: 1, jugadorAppId: 'jug-10' },
    { id: 'gol-5', nombre: 'Agustín Fernández', equipo: 'Los Halcones FC', goles: 1, jugadorAppId: 'jug-08' },
    { id: 'gol-6', nombre: 'Esteban Ortiz', equipo: 'Los Halcones FC', goles: 1, jugadorAppId: 'jug-15' },
    { id: 'gol-7', nombre: 'Franco Ríos', equipo: 'Sportivo Belgrano', goles: 2 },
    { id: 'gol-8', nombre: 'Joaquín Suárez', equipo: 'Unión Vecinal', goles: 1 },
    { id: 'gol-9', nombre: 'Nicolás Gómez', equipo: 'Juventud Unida', goles: 1 },
    { id: 'gol-10', nombre: 'Santiago Paz', equipo: 'Defensores del Norte', goles: 1 }
  ],
  fairPlay: {
    'Los Halcones FC': 1.5,
    'Unión Vecinal': 2.0,
    'Sportivo Belgrano': 2.5,
    'Defensores del Norte': 3.0,
    'Atlético San Martín': 4.5,
    'Juventud Unida': 5.0,
    'Deportivo Central': 6.5,
    'Racing Club Amateur': 7.0
  }
};
