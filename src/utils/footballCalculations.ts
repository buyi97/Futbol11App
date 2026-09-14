/**
 * @file footballCalculations.ts
 * Lógica deportiva y cálculos precisos de minutos jugados, incidencias y estadísticas acumuladas.
 */

import {
  Jugador,
  Partido,
  Convocado,
  Incidencia,
  MinutosJugadorDetalle,
  EstadisticaJugadorAcumulada,
  EventoPartidoJugador
} from '../types';

export interface MinutoIncidenciaInfo {
  minuto: number;          // Minuto estándar reglamentario o acumulado (ej: 1, 40, 41, 80)
  segundo: number;
  esAgregado: boolean;
  minutoBase: number;      // e.g. 40 (o 45) en 1T, 80 (o 90) en 2T
  minutoExtra: number;     // e.g. +3
  display: string;         // e.g. "1'", "40'", "40' + 3'", "80' + 2'"
}

/**
 * Calcula el minuto deportivo exacto y su formato en pantalla.
 * Regla:
 * - 0:15 del partido -> Minuto 1'
 * - 39:34 del partido -> Minuto 40'
 * - En tiempo agregado de 1T a los 42:30 -> "40' + 3'" (NO "43'")
 * - En 2T a los 0:15 -> Minuto 41'
 * - En tiempo agregado de 2T a los 42:30 (82:30) -> "80' + 3'"
 */
export function calcularMinutoDisplay(
  segundosEnTiempo: number,
  tiempo: 1 | 2,
  duracionTiempoMin: number = 40
): MinutoIncidenciaInfo {
  const seg = Math.max(0, segundosEnTiempo);
  // Minuto transcurrido dentro del tiempo actual (0 a 59s -> min 1, 60 a 119s -> min 2, etc.)
  const minutoEnTiempo = Math.floor(seg / 60) + 1;
  const segundo = seg % 60;

  if (tiempo === 1) {
    if (minutoEnTiempo <= duracionTiempoMin) {
      return {
        minuto: minutoEnTiempo,
        segundo,
        esAgregado: false,
        minutoBase: minutoEnTiempo,
        minutoExtra: 0,
        display: `${minutoEnTiempo}'`
      };
    } else {
      const extra = minutoEnTiempo - duracionTiempoMin;
      return {
        minuto: duracionTiempoMin,
        segundo,
        esAgregado: true,
        minutoBase: duracionTiempoMin,
        minutoExtra: extra,
        display: `${duracionTiempoMin}' + ${extra}'`
      };
    }
  } else {
    // 2do Tiempo: el tiempo reglamentario va de (duracionTiempoMin + 1) hasta (duracionTiempoMin * 2)
    const finReglamentario = duracionTiempoMin * 2;
    const minutoTotal = duracionTiempoMin + minutoEnTiempo;

    if (minutoTotal <= finReglamentario) {
      return {
        minuto: minutoTotal,
        segundo,
        esAgregado: false,
        minutoBase: minutoTotal,
        minutoExtra: 0,
        display: `${minutoTotal}'`
      };
    } else {
      const extra = minutoTotal - finReglamentario;
      return {
        minuto: finReglamentario,
        segundo,
        esAgregado: true,
        minutoBase: finReglamentario,
        minutoExtra: extra,
        display: `${finReglamentario}' + ${extra}'`
      };
    }
  }
}

/**
 * Formatea una incidencia para mostrar su minuto de manera futbolera (ej: "40' + 3'")
 */
export function formatearMinutoIncidencia(
  incidencia: Incidencia,
  duracionTiempoMin: number = 40
): string {
  if (incidencia.minuto_display) {
    return incidencia.minuto_display;
  }

  if (incidencia.minuto_agregado && incidencia.minuto_agregado > 0) {
    const base = incidencia.tiempo === 1 ? duracionTiempoMin : duracionTiempoMin * 2;
    return `${base}' + ${incidencia.minuto_agregado}'`;
  }

  // Fallback si fue grabado como minuto directo
  if (incidencia.tiempo === 1 && incidencia.minuto > duracionTiempoMin) {
    const extra = incidencia.minuto - duracionTiempoMin;
    return `${duracionTiempoMin}' + ${extra}'`;
  }

  const finReglamentario = duracionTiempoMin * 2;
  if (incidencia.tiempo === 2 && incidencia.minuto > finReglamentario) {
    const extra = incidencia.minuto - finReglamentario;
    return `${finReglamentario}' + ${extra}'`;
  }

  return `${Math.max(1, incidencia.minuto)}'`;
}

/**
 * Calcula los minutos exactos jugados por cada convocado en un partido determinado.
 * Reglas:
 * - Un titular entra en el minuto 0.
 * - Si fue sustituido ('cambio' con jugador_id == jugador.id), su tiempo concluye en el minuto del cambio.
 * - Si ingresó desde el banco ('cambio' con jugador_id_secundario == jugador.id), su tiempo inicia en el minuto del cambio.
 * - Si fue expulsado ('roja_directa', 'doble_amarilla', o acumulación de 2 tarjetas amarillas):
 *   su tiempo en cancha concluye exactamente en el minuto de la expulsión, descontándose todo lo que no jugó.
 * - Si no fue sustituido ni expulsado, juega hasta el final del partido (incluyendo los minutos agregados en 1T y 2T).
 */
export function calcularMinutosPartido(
  partido: Partido,
  convocados: Convocado[],
  jugadores: Jugador[],
  incidencias: Incidencia[]
): MinutosJugadorDetalle[] {
  const duracionReg = partido.duracion_tiempo_min || 40;
  const duracion1T = duracionReg + (partido.agregado_1T || 0);
  const duracion2T = duracionReg + (partido.agregado_2T || 0);
  const duracionTotal = duracion1T + duracion2T;

  const jugadoresMap = new Map(jugadores.map(j => [j.id, j]));

  // Helper para convertir el tiempo de cualquier incidencia a minuto absoluto corrido
  const calcularMinutoAbsoluto = (inc: Incidencia): number => {
    if (inc.tiempo === 1) {
      if (inc.minuto_agregado && inc.minuto_agregado > 0) {
        return duracionReg + inc.minuto_agregado;
      }
      return Math.max(0, inc.minuto);
    } else {
      // 2do tiempo
      if (inc.minuto_agregado && inc.minuto_agregado > 0) {
        return duracion1T + duracionReg + inc.minuto_agregado;
      }
      // En 2T, inc.minuto puede registrarse corrido (ej: 55') o relativo al tiempo (ej: 15')
      if (inc.minuto > duracionReg) {
        return duracion1T + (inc.minuto - duracionReg);
      }
      return duracion1T + Math.max(0, inc.minuto);
    }
  };

  // Ordenar incidencias cronológicamente
  const incidenciasOrdenadas = [...incidencias].sort((a, b) => {
    if (a.tiempo !== b.tiempo) return a.tiempo - b.tiempo;
    const minA = a.minuto + (a.minuto_agregado || 0);
    const minB = b.minuto + (b.minuto_agregado || 0);
    if (minA !== minB) return minA - minB;
    return a.segundo - b.segundo;
  });

  return convocados.map(convocado => {
    const jugador = jugadoresMap.get(convocado.jugador_id) || {
      id: convocado.jugador_id,
      nombre: 'Jugador ' + convocado.jugador_id,
      numero: convocado.numero || 0,
      posicion: 'Mediocampista',
      activo: true,
      fecha_alta: ''
    };

    const coincideJugador = (id?: string) => {
      if (!id) return false;
      return id === jugador.id || id === convocado.jugador_id;
    };

    let minutosJugados = 0;
    let estaEnCancha = convocado.titular;
    let momentoEntradaActual: number | undefined = convocado.titular ? 0 : undefined;
    let primerMinutoEntrada: number | undefined = convocado.titular ? 0 : undefined;
    let ultimoMinutoSalida: number | undefined = undefined;
    let fueExpulsado = false;
    let minutoExpulsion: number | undefined = undefined;
    let motivoSalida: 'cambio' | 'expulsion' | undefined = undefined;
    let contadorAmarillas = 0;

    // Procesar incidencias en orden cronológico
    for (const inc of incidenciasOrdenadas) {
      const minAbsoluto = calcularMinutoAbsoluto(inc);

      // 1. MANEJO DE CAMBIOS / SUSTITUCIONES
      if (inc.tipo === 'cambio') {
        // Jugador que sale
        if (coincideJugador(inc.jugador_id) && estaEnCancha && !fueExpulsado) {
          if (momentoEntradaActual !== undefined) {
            minutosJugados += Math.max(0, minAbsoluto - momentoEntradaActual);
          }
          estaEnCancha = false;
          momentoEntradaActual = undefined;
          ultimoMinutoSalida = minAbsoluto;
          motivoSalida = 'cambio';
        }

        // Jugador que ingresa (sólo si no fue expulsado previamente)
        if (coincideJugador(inc.jugador_id_secundario) && !estaEnCancha && !fueExpulsado) {
          estaEnCancha = true;
          momentoEntradaActual = minAbsoluto;
          if (primerMinutoEntrada === undefined) {
            primerMinutoEntrada = minAbsoluto;
          }
        }
      }

      // 2. MANEJO DE TARJETAS Y EXPULSIONES
      if (coincideJugador(inc.jugador_id) && inc.equipo === 'propio') {
        if (inc.tipo === 'amarilla') {
          contadorAmarillas++;
        }

        // Determinar si esta incidencia provoca la expulsión
        const esExpulsion = 
          inc.tipo === 'roja_directa' || 
          inc.tipo === 'doble_amarilla' || 
          contadorAmarillas >= 2;

        if (esExpulsion && !fueExpulsado) {
          fueExpulsado = true;
          minutoExpulsion = minAbsoluto;

          if (estaEnCancha) {
            // Estaba jugando: su tiempo concluye en el momento exacto de la expulsión.
            // Se descuentan todos los minutos que falten del partido.
            if (momentoEntradaActual !== undefined) {
              minutosJugados += Math.max(0, minAbsoluto - momentoEntradaActual);
            }
            estaEnCancha = false;
            momentoEntradaActual = undefined;
            ultimoMinutoSalida = minAbsoluto;
            motivoSalida = 'expulsion';
          } else {
            // Expulsado en el banco (o ya reemplazado): se registra pero no altera los minutos ya jugados
            if (!motivoSalida) {
              motivoSalida = 'expulsion';
            }
          }
        }
      }
    }

    // Si aún seguía en cancha al concluir el partido (no fue sustituido ni expulsado)
    if (estaEnCancha && momentoEntradaActual !== undefined) {
      const tiempoFinal = duracionTotal;
      minutosJugados += Math.max(0, tiempoFinal - momentoEntradaActual);
    }

    // Calcular estadísticas individuales del jugador en este partido
    let goles = 0;
    let asistencias = 0;
    let tirosArco = 0;
    let tirosTotal = 0;
    let faltas = 0;

    incidencias.forEach(inc => {
      if (inc.equipo === 'propio') {
        if (inc.tipo === 'gol' && coincideJugador(inc.jugador_id)) {
          goles++;
          tirosArco++;
          tirosTotal++;
        }
        if (inc.tipo === 'gol' && (coincideJugador(inc.asistencia_id) || coincideJugador(inc.jugador_id_secundario))) {
          asistencias++;
        }
        if (inc.tipo === 'tiro_arco' && coincideJugador(inc.jugador_id)) {
          tirosArco++;
          tirosTotal++;
        }
        if (inc.tipo === 'tiro' && coincideJugador(inc.jugador_id)) {
          tirosTotal++;
        }
        if (inc.tipo === 'falta' && coincideJugador(inc.jugador_id)) {
          faltas++;
        }
      }
    });

    return {
      jugador,
      numero: convocado.numero || jugador.numero,
      titular: convocado.titular,
      minutosJugados,
      minutoEntrada: primerMinutoEntrada,
      minutoSalida: ultimoMinutoSalida,
      fueExpulsado,
      minutoExpulsion,
      motivoSalida,
      amarillas: contadorAmarillas,
      rojas: fueExpulsado ? 1 : 0,
      goles,
      asistencias,
      tirosArco,
      tirosTotal,
      faltas,
      tarjetaAmarilla: contadorAmarillas > 0,
      tarjetaRoja: fueExpulsado
    };
  });
}

/**
 * Calcula estadísticas acumuladas de todos los jugadores a lo largo de los partidos disputados
 */
export function calcularEstadisticasAcumuladas(
  jugadores: Jugador[],
  partidos: Partido[],
  convocados: Convocado[],
  incidencias: Incidencia[]
): EstadisticaJugadorAcumulada[] {
  const partidosFinalizados = partidos.filter(p => p.estado === 'finalizado');
  const convocadosMap = new Map<string, Convocado[]>();

  convocados.forEach(c => {
    const arr = convocadosMap.get(c.partido_id) || [];
    arr.push(c);
    convocadosMap.set(c.partido_id, arr);
  });

  const statsMap = new Map<string, EstadisticaJugadorAcumulada>();

  // Inicializar mapa con todos los jugadores
  jugadores.forEach(j => {
    statsMap.set(j.id, {
      jugadorId: j.id,
      nombre: j.nombre,
      numero: j.numero,
      posicion: j.posicion,
      partidosJugados: 0,
      partidosTitular: 0,
      minutosTotales: 0,
      minutosJugados: 0,
      promedioMinutos: 0,
      goles: 0,
      asistencias: 0,
      tirosArco: 0,
      tirosTotal: 0,
      faltas: 0,
      amarillas: 0,
      rojas: 0,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0
    });
  });

  // Procesar cada partido finalizado
  partidosFinalizados.forEach(partido => {
    const convs = convocadosMap.get(partido.id) || [];
    const incs = incidencias.filter(i => i.partido_id === partido.id);
    const detalles = calcularMinutosPartido(partido, convs, jugadores, incs);

    detalles.forEach(d => {
      const stat = statsMap.get(d.jugador.id);
      if (stat && (d.titular || d.minutosJugados > 0 || d.tarjetaAmarilla || d.tarjetaRoja)) {
        stat.partidosJugados += 1;
        if (d.titular) stat.partidosTitular += 1;
        stat.minutosTotales += d.minutosJugados;
        stat.minutosJugados += d.minutosJugados;
        stat.goles += d.goles;
        stat.asistencias += d.asistencias;
        stat.tirosArco += d.tirosArco;
        stat.tirosTotal += d.tirosTotal;
        stat.faltas += d.faltas;
        const cantAmarillas = d.amarillas !== undefined ? d.amarillas : (d.tarjetaAmarilla ? 1 : 0);
        const cantRojas = d.rojas !== undefined ? d.rojas : (d.tarjetaRoja ? 1 : 0);
        stat.amarillas += cantAmarillas;
        stat.tarjetasAmarillas += cantAmarillas;
        stat.rojas += cantRojas;
        stat.tarjetasRojas += cantRojas;
      }
    });
  });

  // Calcular promedios
  const results = Array.from(statsMap.values());
  results.forEach(s => {
    s.promedioMinutos = s.partidosJugados > 0 
      ? Math.round(s.minutosTotales / s.partidosJugados) 
      : 0;
  });

  // Ordenar por goles desc, luego minutos desc
  return results.sort((a, b) => b.goles - a.goles || b.minutosTotales - a.minutosTotales);
}

/**
 * Obtiene el historial partido a partido de un jugador específico con todas sus incidencias
 */
export function obtenerHistorialDetalladoJugador(
  jugadorId: string,
  partidos: Partido[],
  convocados: Convocado[],
  incidencias: Incidencia[],
  jugadores: Jugador[]
): EventoPartidoJugador[] {
  const finalizados = partidos.filter(p => p.estado === 'finalizado');
  const historial: EventoPartidoJugador[] = [];

  // Ordenar partidos de más reciente a más antiguo
  const ordenados = [...finalizados].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  ordenados.forEach(partido => {
    const convocado = convocados.find(c => c.partido_id === partido.id && c.jugador_id === jugadorId);
    if (!convocado) return; // No estuvo convocado

    const convsDelPartido = convocados.filter(c => c.partido_id === partido.id);
    const incsDelPartido = incidencias.filter(i => i.partido_id === partido.id);
    const detalles = calcularMinutosPartido(partido, convsDelPartido, jugadores, incsDelPartido);
    const miDetalle = detalles.find(d => d.jugador.id === jugadorId);

    if (miDetalle && (miDetalle.titular || miDetalle.minutosJugados > 0 || miDetalle.tarjetaAmarilla || miDetalle.tarjetaRoja)) {
      historial.push({
        partidoId: partido.id,
        fecha: partido.fecha,
        rival: partido.rival,
        resultadoPropio: partido.resultado_propio,
        resultadoRival: partido.resultado_rival,
        condicion: partido.condicion,
        minutosJugados: miDetalle.minutosJugados,
        titular: miDetalle.titular,
        numero: convocado.numero,
        goles: miDetalle.goles,
        asistencias: miDetalle.asistencias,
        tirosArco: miDetalle.tirosArco,
        tirosTotal: miDetalle.tirosTotal,
        faltas: miDetalle.faltas,
        amarillas: miDetalle.amarillas !== undefined ? miDetalle.amarillas : (miDetalle.tarjetaAmarilla ? 1 : 0),
        rojas: miDetalle.rojas !== undefined ? miDetalle.rojas : (miDetalle.tarjetaRoja ? 1 : 0),
        fueExpulsado: miDetalle.fueExpulsado,
        minutoExpulsion: miDetalle.minutoExpulsion
      });
    }
  });

  return historial;
}


/**
 * Calcula el resumen general del equipo
 */
export function calcularResumenEquipo(
  partidos: Partido[],
  incidencias: Incidencia[]
) {
  const finalizados = partidos.filter(p => p.estado === 'finalizado');
  let victorias = 0;
  let empates = 0;
  let derrotas = 0;
  let golesFavor = 0;
  let golesContra = 0;

  finalizados.forEach(p => {
    golesFavor += p.resultado_propio;
    golesContra += p.resultado_rival;
    if (p.resultado_propio > p.resultado_rival) victorias++;
    else if (p.resultado_propio === p.resultado_rival) empates++;
    else derrotas++;
  });

  // Racha (últimos 5 partidos)
  const ultimosPartidos = [...finalizados]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5)
    .reverse();

  const racha = ultimosPartidos.map(p => {
    if (p.resultado_propio > p.resultado_rival) return 'V';
    if (p.resultado_propio === p.resultado_rival) return 'E';
    return 'D';
  });

  // Estadísticas de remates e incidencias
  let tirosTotal = 0;
  let tirosArco = 0;
  let golesEquipo = 0;
  let faltasEquipo = 0;
  let amarillasEquipo = 0;
  let rojasEquipo = 0;

  incidencias.forEach(inc => {
    if (inc.equipo === 'propio') {
      if (inc.tipo === 'tiro') tirosTotal++;
      if (inc.tipo === 'tiro_arco') {
        tirosTotal++;
        tirosArco++;
      }
      if (inc.tipo === 'gol') {
        tirosTotal++;
        tirosArco++;
        golesEquipo++;
      }
      if (inc.tipo === 'falta') faltasEquipo++;
      if (inc.tipo === 'amarilla') amarillasEquipo++;
      if (inc.tipo === 'doble_amarilla') {
        amarillasEquipo += 2;
        rojasEquipo++;
      }
      if (inc.tipo === 'roja_directa') rojasEquipo++;
    }
  });

  const efectividadArco = tirosTotal > 0 ? Math.round((tirosArco / tirosTotal) * 100) : 0;
  const efectividadGol = tirosArco > 0 ? Math.round((golesEquipo / tirosArco) * 100) : 0;
  const puntosPosibles = finalizados.length * 3;
  const puntosObtenidos = victorias * 3 + empates * 1;
  const efectividadPuntos = puntosPosibles > 0 ? Math.round((puntosObtenidos / puntosPosibles) * 100) : 0;

  return {
    partidosDisputados: finalizados.length,
    victorias,
    empates,
    derrotas,
    golesFavor,
    golesContra,
    diferenciaGol: golesFavor - golesContra,
    racha,
    tirosTotal,
    tirosTotales: tirosTotal,
    tirosArco,
    golesEquipo,
    efectividadArco,
    efectividadGol,
    faltasEquipo,
    amarillasEquipo,
    rojasEquipo,
    efectividadPuntos
  };
}


/**
 * Formatea minutos y segundos a formato digital "42:15"
 */
export function formatTimeDigital(minutos: number, segundos: number): string {
  const m = String(minutos).padStart(2, '0');
  const s = String(segundos).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Retorna color y etiqueta según la posición del jugador
 */
export function getPosicionBadge(posicion: Jugador['posicion']) {
  switch (posicion) {
    case 'Arquero':
      return { label: 'ARQ', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'Defensor':
      return { label: 'DEF', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    case 'Mediocampista':
      return { label: 'MED', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'Delantero':
      return { label: 'DEL', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    default:
      return { label: 'JUG', bg: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' };
  }
}
