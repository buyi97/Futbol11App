/**
 * @file types.ts
 * Definición de modelos de datos e interfaces para la gestión de fútbol 11 amateur.
 * Mapea las hojas de Google Sheets: Jugadores, Partidos, Convocados, RivalesPartido, Incidencias.
 */

export type PosicionJugador = 'Arquero' | 'Defensor' | 'Mediocampista' | 'Delantero';

export interface Jugador {
  id: string;
  nombre: string;
  numero?: number; // Opcional: los números se asignan partido a partido
  posicion: PosicionJugador;
  activo: boolean;
  fecha_alta: string; // YYYY-MM-DD
}

export type ModoRival = 'numero' | 'nombre_numero';
export type CondicionPartido = 'local' | 'visitante' | 'neutral';
export type EstadoPartido = 'programado' | 'en_curso' | 'finalizado';

export type TipoTorneo = 'Apertura' | 'Clausura' | 'Anual' | 'Copa' | 'Amistoso';
export type EstadoTorneo = 'activo' | 'cerrado';

export interface Torneo {
  id: string;
  nombre: string; // ej: "Torneo Apertura 2026"
  tipo: TipoTorneo;
  anio: number; // ej: 2026
  estado: EstadoTorneo; // 'activo' | 'cerrado'
  fechaInicio?: string;
  fechaCierre?: string;
  descripcion?: string;
}

export interface ClubConfig {
  nombre: string; // Nombre del equipo (default: 'Los Halcones FC')
  colorPropio: string; // Color hexadecimal principal del equipo (default: '#3ddc84')
  colorRival: string; // Color hexadecimal por defecto del rival (default: '#e63946')
  subtitulo?: string;
  formacionPredeterminada?: string; // Formación táctica por defecto (ej: '4-3-3', '4-4-2', '4-1-3-2', '4-3-1-2')
  titularesPredeterminados?: string[]; // IDs de jugadores titulares asignados por defecto
}

export interface Partido {
  id: string;
  fecha: string; // YYYY-MM-DD
  rival: string;
  modo_rival: ModoRival;
  cancha: string;
  condicion: CondicionPartido;
  resultado_propio: number;
  resultado_rival: number;
  agregado_1T: number;
  agregado_2T: number;
  duracion_tiempo_min: number; // defecto 40
  estado: EstadoPartido;
  creado_por: string;
  hora?: string;
  notas?: string;
  formacion_propia?: string;
  formacion_rival?: string;
  tiempo_actual?: 1 | 2;
  etiqueta?: string; // Ej: 'Fecha 1', 'Fecha 2', 'Cuartos de final', 'Amistoso'
  torneo_id?: string; // ID del torneo o temporada
  torneo_nombre?: string; // Nombre amigable del torneo
  created_at?: number;
}

export interface Convocado {
  id: string;
  partido_id: string;
  jugador_id: string;
  titular: boolean; // true: titular, false: suplente
  numero?: number; // Número asignado para este partido
  posicion_tactica?: string; // ej: 'ARQ', 'DFC', 'MC', 'DEL'
  posicion?: string;
  tactica_x?: number; // 0 - 100% en la cancha
  tactica_y?: number; // 0 - 100% en la cancha
  posicion_x?: number;
  posicion_y?: number;
}

export interface RivalJugador {
  id: string;
  partido_id: string;
  numero: number;
  nombre?: string; // opcional o vacio si modo_rival === 'numero'
  titular?: boolean;
  posicion_tactica?: string;
  posicion?: string;
  tactica_x?: number;
  tactica_y?: number;
  posicion_x?: number;
  posicion_y?: number;
}

export type TipoIncidencia = 
  | 'gol'
  | 'autogol'
  | 'falta'
  | 'amarilla'
  | 'doble_amarilla'
  | 'roja_directa'
  | 'tiro'
  | 'tiro_arco'
  | 'corner'
  | 'cambio';

export type EquipoIncidencia = 'propio' | 'rival';

export interface Incidencia {
  id: string;
  partido_id: string;
  tiempo: 1 | 2; // 1: 1er tiempo, 2: 2do tiempo
  minuto: number;
  segundo: number;
  minuto_display?: string; // Ej: "1'", "40'", "40' + 3'", "80' + 2'"
  minuto_agregado?: number; // Si fue en tiempo de descuento
  tipo: TipoIncidencia;
  equipo: EquipoIncidencia;
  jugador_id?: string; // ID jugador propio o ID/número del rival (opcional en córner)
  jugador_id_secundario?: string; // En 'cambio': jugador que ingresa. En 'gol': asistencia (opcional).
  asistencia_id?: string; // ID del jugador asistente (opcional en gol)
  detalle?: string;
  created_at?: number;
}

export type RolUsuario = 'editor' | 'lector' | null;

export interface SesionAuth {
  rol: RolUsuario;
  nombreUsuario?: string;
  token: string;
  expiraEn: number; // timestamp ms
}

export interface EventoTrayectoriaMinutos {
  tipo: 'inicio' | 'entrada' | 'salida' | 'expulsion';
  minuto: number;
}

export interface MinutosJugadorDetalle {
  jugador: Jugador;
  numero?: number;
  titular: boolean;
  minutosJugados: number;
  minutoEntrada?: number;
  minutoSalida?: number;
  fueExpulsado?: boolean;
  minutoExpulsion?: number;
  motivoSalida?: 'cambio' | 'expulsion';
  eventosTrayectoria?: EventoTrayectoriaMinutos[];
  amarillas?: number;
  rojas?: number;
  goles: number;
  asistencias: number;
  tirosArco: number;
  tirosTotal: number;
  faltas: number;
  tarjetaAmarilla: boolean;
  tarjetaRoja: boolean;
}

export interface EstadisticaJugadorAcumulada {
  jugadorId: string;
  nombre: string;
  numero?: number;
  posicion: PosicionJugador;
  partidosJugados: number;
  partidosTitular: number;
  minutosTotales: number;
  minutosJugados: number;
  promedioMinutos: number;
  goles: number;
  asistencias: number;
  tirosArco: number;
  tirosTotal: number;
  faltas: number;
  amarillas: number;
  rojas: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
}

export type EstadisticaJugador = EstadisticaJugadorAcumulada;

export interface EventoPartidoJugador {
  partidoId: string;
  fecha: string;
  rival: string;
  resultadoPropio: number;
  resultadoRival: number;
  condicion: CondicionPartido;
  minutosJugados: number;
  titular: boolean;
  numero?: number;
  goles: number;
  asistencias: number;
  tirosArco: number;
  tirosTotal: number;
  faltas: number;
  amarillas: number;
  rojas: number;
  fueExpulsado?: boolean;
  minutoExpulsion?: number;
}

export interface ItemColaSync {
  id: string;
  accion: 'guardarIncidencia' | 'eliminarIncidencia' | 'finalizarPartido' | 'crearPartido' | 'guardarJugador' | 'eliminarPartido' | 'guardarConfiguracion' | 'eliminarTorneo' | 'actualizarPartido' | 'guardarTorneo';
  payload: any;
  timestamp: number;
  intentos: number;
}

export interface AccionDeshacer {
  id: string;
  tipo: 'partido' | 'torneo';
  titulo: string;
  descripcion: string;
  timestamp: number;
  datos: {
    torneo?: Torneo;
    partidos: Partido[];
    convocados: Convocado[];
    rivales: RivalJugador[];
    incidencias: Incidencia[];
  };
}
