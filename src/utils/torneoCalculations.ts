/**
 * @file torneoCalculations.ts
 * Utilidades para cálculo de tablas de posiciones, tabla anual acumulada,
 * copa FairPlay, ficha de equipo y sincronización automática de goleadores.
 */

import {
  TorneoDetalle,
  FechaTorneo,
  EstadisticasEquipoTorneo,
  TablaAnualBaseEquipo,
  FichaEquipoData,
  GoleadorTorneo,
  Partido,
  Incidencia,
  Jugador
} from '../types';

/**
 * Calcula la Tabla de Posiciones actual del torneo en base a los resultados de las fechas.
 * Reglas de puntaje:
 * - Victoria: 3 puntos
 * - Empate: 1 punto
 * - Derrota: 0 puntos
 * Criterio de desempate:
 * 1. Puntos descendente
 * 2. Diferencia de Gol descendente
 * 3. Goles a Favor descendente
 * 4. Partidos Ganados descendente
 * 5. Orden alfabético
 */
export function calcularTablaPosiciones(equipos: string[], fechas: FechaTorneo[]): EstadisticasEquipoTorneo[] {
  const mapStats = new Map<string, {
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    gf: number;
    gc: number;
    puntos: number;
  }>();

  const equiposSet = new Set(equipos.map(e => e.toLowerCase()));

  // Inicializar todos los equipos participantes
  equipos.forEach(eq => {
    mapStats.set(eq, {
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      puntos: 0
    });
  });

  // Procesar cada partido jugado
  fechas.forEach(fecha => {
    (fecha.partidos || []).forEach(partido => {
      if (
        partido.jugado &&
        partido.golesLocal !== null &&
        partido.golesLocal !== undefined &&
        partido.golesVisitante !== null &&
        partido.golesVisitante !== undefined
      ) {
        const local = partido.equipoLocal;
        const visitante = partido.equipoVisitante;
        const gl = Number(partido.golesLocal);
        const gv = Number(partido.golesVisitante);

        // Si tenemos lista de equipos, solo procesar si los equipos pertenecen a la lista actual
        if (equipos.length > 0 && (!equiposSet.has(local.toLowerCase()) || !equiposSet.has(visitante.toLowerCase()))) {
          return;
        }

        // Si algún equipo no estaba en la lista inicial, inicializarlo
        if (!mapStats.has(local)) {
          mapStats.set(local, { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0 });
        }
        if (!mapStats.has(visitante)) {
          mapStats.set(visitante, { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0 });
        }

        const statsL = mapStats.get(local)!;
        const statsV = mapStats.get(visitante)!;

        statsL.pj += 1;
        statsV.pj += 1;
        statsL.gf += gl;
        statsL.gc += gv;
        statsV.gf += gv;
        statsV.gc += gl;

        if (gl > gv) {
          statsL.pg += 1;
          statsL.puntos += 3;
          statsV.pp += 1;
        } else if (gl < gv) {
          statsV.pg += 1;
          statsV.puntos += 3;
          statsL.pp += 1;
        } else {
          statsL.pe += 1;
          statsL.puntos += 1;
          statsV.pe += 1;
          statsV.puntos += 1;
        }
      }
    });
  });

  // Convertir a array y ordenar
  const lista: EstadisticasEquipoTorneo[] = Array.from(mapStats.entries()).map(([equipo, s]) => ({
    equipo,
    posicion: 0,
    puntos: s.puntos,
    pj: s.pj,
    pg: s.pg,
    pe: s.pe,
    pp: s.pp,
    gf: s.gf,
    gc: s.gc,
    dg: s.gf - s.gc
  }));

  lista.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (b.pg !== a.pg) return b.pg - a.pg;
    return a.equipo.localeCompare(b.equipo);
  });

  // Asignar posición
  lista.forEach((item, index) => {
    item.posicion = index + 1;
  });

  return lista;
}

/**
 * Calcula la Tabla Anual acumulando: Base inicial (editable por el DT) + Tabla Actual del Torneo.
 */
export function calcularTablaAnual(
  equipos: string[],
  tablaActual: EstadisticasEquipoTorneo[],
  baseAnual: Record<string, TablaAnualBaseEquipo> = {}
): EstadisticasEquipoTorneo[] {
  const mapActual = new Map<string, EstadisticasEquipoTorneo>();
  tablaActual.forEach(t => mapActual.set(t.equipo, t));

  const todosEquipos = new Set<string>(equipos);
  Object.keys(baseAnual).forEach(eq => todosEquipos.add(eq));
  tablaActual.forEach(t => todosEquipos.add(t.equipo));

  const lista: EstadisticasEquipoTorneo[] = Array.from(todosEquipos).map(equipo => {
    const act = mapActual.get(equipo);
    const base = baseAnual[equipo] || {
      equipo,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      puntos: 0
    };

    const pj = (base.pj || 0) + (act ? act.pj : 0);
    const pg = (base.pg || 0) + (act ? act.pg : 0);
    const pe = (base.pe || 0) + (act ? act.pe : 0);
    const pp = (base.pp || 0) + (act ? act.pp : 0);
    const gf = (base.gf || 0) + (act ? act.gf : 0);
    const gc = (base.gc || 0) + (act ? act.gc : 0);
    const puntos = (base.puntos || 0) + (act ? act.puntos : 0);
    const dg = gf - gc;

    return {
      equipo,
      posicion: 0,
      puntos,
      pj,
      pg,
      pe,
      pp,
      gf,
      gc,
      dg
    };
  });

  lista.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (b.pg !== a.pg) return b.pg - a.pg;
    return a.equipo.localeCompare(b.equipo);
  });

  lista.forEach((item, index) => {
    item.posicion = index + 1;
  });

  return lista;
}

/**
 * Calcula la clasificación de la Copa Fair-Play.
 * Regla clave: el que MENOS puntos tiene, MEJOR posición está (Pos 1 = Menos puntos de sanción).
 */
export function calcularTablaFairPlay(
  equipos: string[],
  fairPlayPuntos: Record<string, number> = {}
): { equipo: string; puntos: number; posicion: number }[] {
  const lista = equipos.map(equipo => ({
    equipo,
    puntos: Number(fairPlayPuntos[equipo] ?? 0),
    posicion: 0
  }));

  // Orden ascendente: menor puntaje es mejor posición
  lista.sort((a, b) => {
    if (a.puntos !== b.puntos) return a.puntos - b.puntos;
    return a.equipo.localeCompare(b.equipo);
  });

  lista.forEach((item, index) => {
    item.posicion = index + 1;
  });

  return lista;
}

/**
 * Genera la Ficha Completa del Equipo con toda su información:
 * - Stats del Torneo Actual
 * - Stats de la Tabla Anual
 * - Posición y puntos Fair Play
 * - Historial partido a partido del torneo con resultados
 * - Goleadores pertenecientes al equipo
 */
export function obtenerFichaEquipo(
  equipoBuscado: string,
  torneoDetalle: TorneoDetalle,
  nombreEquipoPropio: string
): FichaEquipoData {
  const tablaActual = calcularTablaPosiciones(torneoDetalle.equipos, torneoDetalle.fechas);
  const tablaAnual = calcularTablaAnual(torneoDetalle.equipos, tablaActual, torneoDetalle.tablaAnualBase);
  const tablaFP = calcularTablaFairPlay(torneoDetalle.equipos, torneoDetalle.fairPlay);

  const actualStat = tablaActual.find(t => t.equipo.toLowerCase() === equipoBuscado.toLowerCase()) || {
    equipo: equipoBuscado,
    posicion: 0,
    puntos: 0,
    pj: 0,
    pg: 0,
    pe: 0,
    pp: 0,
    gf: 0,
    gc: 0,
    dg: 0
  };

  const anualStat = tablaAnual.find(t => t.equipo.toLowerCase() === equipoBuscado.toLowerCase()) || {
    equipo: equipoBuscado,
    posicion: 0,
    puntos: 0,
    pj: 0,
    pg: 0,
    pe: 0,
    pp: 0,
    gf: 0,
    gc: 0,
    dg: 0
  };

  const fpItem = tablaFP.find(t => t.equipo.toLowerCase() === equipoBuscado.toLowerCase());
  const puntosFairPlay = fpItem ? fpItem.puntos : 0;
  const posicionFairPlay = fpItem ? fpItem.posicion : 0;

  // Historial de partidos del equipo en este torneo
  const partidosEquipo: FichaEquipoData['partidos'] = [];

  (torneoDetalle.fechas || []).forEach(fecha => {
    (fecha.partidos || []).forEach(p => {
      const esLocal = p.equipoLocal.toLowerCase() === equipoBuscado.toLowerCase();
      const esVisitante = p.equipoVisitante.toLowerCase() === equipoBuscado.toLowerCase();

      if (esLocal || esVisitante) {
        const rival = esLocal ? p.equipoVisitante : p.equipoLocal;
        let resultado: 'V' | 'E' | 'D' | 'P' = 'P';
        let gf: number | null = null;
        let gc: number | null = null;

        if (p.jugado && p.golesLocal !== null && p.golesVisitante !== null) {
          gf = esLocal ? p.golesLocal : p.golesVisitante;
          gc = esLocal ? p.golesVisitante : p.golesLocal;

          if (gf > gc) resultado = 'V';
          else if (gf < gc) resultado = 'D';
          else resultado = 'E';
        }

        partidosEquipo.push({
          partidoId: p.id,
          fechaNumero: fecha.numero,
          fechaNombre: fecha.nombre || `Fecha ${fecha.numero}`,
          rival,
          esLocal,
          golesFavor: gf,
          golesContra: gc,
          resultado,
          jugado: p.jugado,
          fechaHora: p.fechaHora,
          cancha: p.cancha
        });
      }
    });
  });

  // Ordenar partidos por número de fecha
  partidosEquipo.sort((a, b) => a.fechaNumero - b.fechaNumero);

  // Goleadores de este equipo
  const goleadores = (torneoDetalle.goleadores || [])
    .filter(g => g.equipo.toLowerCase() === equipoBuscado.toLowerCase())
    .sort((a, b) => b.goles - a.goles);

  const esPropio = equipoBuscado.toLowerCase() === nombreEquipoPropio.toLowerCase();

  return {
    equipo: equipoBuscado,
    esPropio,
    actual: actualStat,
    puntosFairPlay,
    posicionFairPlay,
    anual: anualStat,
    partidos: partidosEquipo,
    goleadores
  };
}

/**
 * Sincroniza automáticamente los goleadores del equipo propio en base
 * a las incidencias registradas en los partidos de este torneo.
 */
export function sincronizarGoleadoresPropios(
  torneoId: string,
  partidos: Partido[],
  incidencias: Incidencia[],
  jugadores: Jugador[],
  goleadoresActuales: GoleadorTorneo[],
  nombreEquipoPropio: string
): GoleadorTorneo[] {
  // Partidos del torneo
  const partidosTorneo = partidos.filter(p => p.torneo_id === torneoId);
  const idsPartidosTorneo = new Set(partidosTorneo.map(p => p.id));

  // Mapa de conteo de goles por jugador_id
  const golesPorJugador = new Map<string, number>();

  incidencias.forEach(inc => {
    if (
      idsPartidosTorneo.has(inc.partido_id) &&
      inc.tipo === 'gol' &&
      inc.equipo === 'propio' &&
      inc.jugador_id
    ) {
      const act = golesPorJugador.get(inc.jugador_id) || 0;
      golesPorJugador.set(inc.jugador_id, act + 1);
    }
  });

  // Conservar goleadores de rivales exactamente como están
  const rivalGoleadores = goleadoresActuales.filter(
    g => g.equipo.toLowerCase() !== nombreEquipoPropio.toLowerCase()
  );

  // Mapear jugadores propios
  const jugadoresMap = new Map<string, Jugador>();
  jugadores.forEach(j => jugadoresMap.set(j.id, j));

  const propiosGoleadores: GoleadorTorneo[] = [];

  // Agregar los que tienen goles calculados en partidos
  golesPorJugador.forEach((goles, jugId) => {
    const jug = jugadoresMap.get(jugId);
    const nombre = jug ? jug.nombre : 'Jugador Propio';
    propiosGoleadores.push({
      id: `gol-propio-${jugId}`,
      nombre,
      equipo: nombreEquipoPropio,
      goles,
      jugadorAppId: jugId
    });
  });

  // Mantener también jugadores propios que hayan sido añadidos manualmente en la tabla
  goleadoresActuales.forEach(g => {
    if (g.equipo.toLowerCase() === nombreEquipoPropio.toLowerCase()) {
      const yaEsta = propiosGoleadores.some(
        pg => (g.jugadorAppId && pg.jugadorAppId === g.jugadorAppId) ||
              pg.nombre.toLowerCase() === g.nombre.toLowerCase()
      );
      if (!yaEsta) {
        propiosGoleadores.push(g);
      }
    }
  });

  const todos = [...rivalGoleadores, ...propiosGoleadores];
  todos.sort((a, b) => b.goles - a.goles);
  return todos;
}
