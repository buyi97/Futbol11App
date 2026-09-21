import React from 'react';
import { 
  X, 
  Clock, 
  Activity, 
  ShieldAlert, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { MinutosJugadorDetalle, Partido, Incidencia, Jugador, Convocado } from '../types';

export interface FichaJugadorPartidoModalProps {
  detalle: MinutosJugadorDetalle;
  partido: Partido;
  incidencias: Incidencia[];
  jugadores: Jugador[];
  convocados: Convocado[];
  colorClub: string;
  nombreClub: string;
  duracionTotalMin: number;
  onClose: () => void;
}

export const FichaJugadorPartidoModal: React.FC<FichaJugadorPartidoModalProps> = ({
  detalle,
  partido,
  incidencias,
  jugadores,
  convocados,
  colorClub,
  nombreClub,
  duracionTotalMin,
  onClose
}) => {
  const jugador = detalle.jugador;
  const conv = convocados.find(c => c.jugador_id === jugador.id);
  const dorsal = conv?.numero !== undefined && conv?.numero !== null ? conv.numero : jugador.numero;
  const jugadoresMap = new Map<string, Jugador>(jugadores.map(j => [j.id, j]));
  const convocadosMap = new Map<string, Convocado>(convocados.map(c => [c.jugador_id, c]));

  // Calcular porcentaje de minutos jugados
  const porcentajeJugado = duracionTotalMin > 0 
    ? Math.min(100, Math.round((detalle.minutosJugados / duracionTotalMin) * 100))
    : 0;

  // Filtrar incidencias de este jugador en el partido (goles, asistencias, disparos, faltas, tarjetas, cambios)
  const incidenciasDelJugador = incidencias.filter(inc => {
    const esPrincipal = inc.jugador_id === jugador.id;
    const asistId = inc.asistencia_id || (inc.tipo === 'gol' ? inc.jugador_id_secundario : undefined);
    const esAsistente = inc.tipo === 'gol' && asistId === jugador.id;
    const esSecundarioCambio = inc.tipo === 'cambio' && inc.jugador_id_secundario === jugador.id;
    return esPrincipal || esAsistente || esSecundarioCambio;
  }).sort((a, b) => {
    if (a.tiempo !== b.tiempo) return a.tiempo - b.tiempo;
    if (a.minuto !== b.minuto) return a.minuto - b.minuto;
    return a.segundo - b.segundo;
  });

  const getPosicionNombre = (pos: string) => {
    switch (pos) {
      case 'ARQ': return 'Arquero';
      case 'DEF': return 'Defensor';
      case 'MED': return 'Mediocampista';
      case 'DEL': return 'Delantero';
      default: return pos || 'Jugador';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Jugador */}
        <div className="p-4 sm:p-5 border-b border-[#243d2c] bg-gradient-to-r from-[#0f1712] via-[#182a1f] to-[#0f1712] relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#0f1712] border border-[#243d2c] text-[#9aa89f] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            {/* Dorsal Destacado */}
            <div 
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-display font-black text-xl sm:text-2xl shadow-lg shrink-0 border border-white/10"
              style={{
                backgroundColor: colorClub,
                color: '#0f1712'
              }}
            >
              #{dorsal}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                  detalle.titular 
                    ? 'bg-emerald-500/10 text-[#3ddc84] border-emerald-500/30' 
                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                }`}>
                  {detalle.titular ? 'Titular' : 'Suplente'}
                </span>
                <span className="text-[10px] text-[#9aa89f] font-semibold uppercase tracking-wider">
                  {getPosicionNombre(conv?.posicion_tactica || jugador.posicion)}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold font-display text-white truncate mt-0.5">
                {jugador.nombre}
              </h3>
              <p className="text-xs text-[#9aa89f]">
                {nombreClub} • vs {partido.rival}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Tarjeta de Minutos Jugados y Trayectoria */}
          <div className="p-3.5 rounded-xl bg-[#0f1712] border border-[#243d2c]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#9aa89f] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#3ddc84]" />
                Tiempo de Juego
              </span>
              <span className="text-xs font-bold text-white">
                {detalle.minutosJugados}' <span className="text-[#9aa89f] font-normal">/ {duracionTotalMin}' total ({porcentajeJugado}%)</span>
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-[#182a1f] h-2 rounded-full overflow-hidden mb-3 border border-[#243d2c]">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${porcentajeJugado}%`,
                  backgroundColor: detalle.fueExpulsado ? '#e63946' : colorClub
                }}
              />
            </div>

            {/* Trayectoria detallada */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {detalle.eventosTrayectoria && detalle.eventosTrayectoria.length > 0 ? (
                detalle.eventosTrayectoria.map((ev, idx) => {
                  if (ev.tipo === 'inicio') {
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 bg-[#182a1f] border border-[#243d2c] px-2 py-0.5 rounded-md text-[11px] text-zinc-300 font-semibold">
                        🏁 Inicio (0')
                      </span>
                    );
                  }
                  if (ev.tipo === 'entrada') {
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 bg-[#182a1f] border border-[#243d2c] px-2 py-0.5 rounded-md text-[11px] text-[#3ddc84] font-semibold">
                        <ArrowRight className="w-3 h-3 text-[#3ddc84]" />
                        Entró {ev.minuto}'
                      </span>
                    );
                  }
                  if (ev.tipo === 'salida') {
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 bg-[#182a1f] border border-[#243d2c] px-2 py-0.5 rounded-md text-[11px] text-[#e63946] font-semibold">
                        <ArrowLeft className="w-3 h-3 text-[#e63946]" />
                        Salió {ev.minuto}'
                      </span>
                    );
                  }
                  if (ev.tipo === 'expulsion') {
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded-md text-[11px] text-[#e63946] font-semibold">
                        <span>🟥</span> Expulsado {ev.minuto}'
                      </span>
                    );
                  }
                  return null;
                })
              ) : detalle.titular ? (
                <span className="text-zinc-300 text-xs font-semibold">
                  Jugó los {duracionTotalMin} minutos del partido
                </span>
              ) : (
                <span className="text-zinc-500 text-xs italic">
                  No ingresó en este partido
                </span>
              )}
            </div>
          </div>

          {/* Cuadrícula de Estadísticas Individuales */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9aa89f] mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#3ddc84]" />
              Estadísticas en este partido
            </h4>

            <div className="grid grid-cols-4 gap-2">
              {/* Goles */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">⚽</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.goles}
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Goles
                </span>
              </div>

              {/* Asistencias */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">👟</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.asistencias}
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Asistencias
                </span>
              </div>

              {/* Tiros al Arco */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">🎯</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.tirosArco}
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Al Arco
                </span>
              </div>

              {/* Tiros Totales */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">💨</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.tirosTotal}
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Tiros Tot.
                </span>
              </div>

              {/* Faltas */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">🚫</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.faltas}
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Faltas
                </span>
              </div>

              {/* Amarillas */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">🟨</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.amarillas || (detalle.tarjetaAmarilla ? 1 : 0)}
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Amarillas
                </span>
              </div>

              {/* Rojas */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">🟥</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.rojas || (detalle.tarjetaRoja ? 1 : 0)}
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Rojas
                </span>
              </div>

              {/* Minutos */}
              <div className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center">
                <span className="text-sm block">⏱️</span>
                <span className="font-display font-bold text-lg text-white block mt-0.5">
                  {detalle.minutosJugados}'
                </span>
                <span className="text-[10px] text-[#9aa89f] uppercase font-semibold">
                  Minutos
                </span>
              </div>
            </div>
          </div>

          {/* Desglose de Incidencias en las que intervino */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9aa89f] mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3ddc84]" />
              Intervenciones en el partido
            </h4>

            {incidenciasDelJugador.length > 0 ? (
              <div className="space-y-2">
                {incidenciasDelJugador.map((inc) => {
                  const asistId = inc.asistencia_id || (inc.tipo === 'gol' ? inc.jugador_id_secundario : undefined);
                  const esGolPropio = inc.tipo === 'gol' && inc.jugador_id === jugador.id;
                  const esAsistenciaPropia = inc.tipo === 'gol' && asistId === jugador.id;
                  const esCambioEntra = inc.tipo === 'cambio' && inc.jugador_id_secundario === jugador.id;
                  const esCambioSale = inc.tipo === 'cambio' && inc.jugador_id === jugador.id;

                  let icono = '⚽';
                  let titulo = '';
                  let subtitulo = '';

                  if (esGolPropio) {
                    icono = '⚽';
                    titulo = 'GOL MARCADO';
                    if (asistId) {
                      const asisJug = jugadoresMap.get(asistId);
                      const asisConv = convocadosMap.get(asistId);
                      subtitulo = `Asistencia de #${asisConv?.numero || asisJug?.numero || ''} ${asisJug?.nombre || 'Compañero'}`;
                    } else {
                      subtitulo = 'Jugada individual / Sin asistencia';
                    }
                  } else if (esAsistenciaPropia) {
                    icono = '👟';
                    titulo = 'ASISTENCIA DE GOL';
                    const golJug = jugadoresMap.get(inc.jugador_id || '');
                    const golConv = convocadosMap.get(inc.jugador_id || '');
                    subtitulo = `Para el gol de #${golConv?.numero || golJug?.numero || ''} ${golJug?.nombre || 'Compañero'}`;
                  } else if (inc.tipo === 'tiro_arco') {
                    icono = '🎯';
                    titulo = 'Tiro al Arco';
                    subtitulo = inc.detalle || 'Remate directo a portería';
                  } else if (inc.tipo === 'tiro') {
                    icono = '💨';
                    titulo = 'Tiro Desviado';
                    subtitulo = inc.detalle || 'Remate fuera del arco';
                  } else if (inc.tipo === 'falta') {
                    icono = '🚫';
                    titulo = 'Falta Cometida';
                    subtitulo = inc.detalle || 'Infracción reglamentaria';
                  } else if (inc.tipo === 'amarilla') {
                    icono = '🟨';
                    titulo = 'Tarjeta Amarilla';
                    subtitulo = inc.detalle || 'Amonestación disciplinaria';
                  } else if (inc.tipo === 'doble_amarilla') {
                    icono = '🟨🟨';
                    titulo = 'Doble Amarilla / Expulsión';
                    subtitulo = 'Segunda amonestación en el encuentro';
                  } else if (inc.tipo === 'roja_directa') {
                    icono = '🟥';
                    titulo = 'Roja Directa';
                    subtitulo = inc.detalle || 'Expulsión directa';
                  } else if (esCambioEntra) {
                    icono = '🔄';
                    titulo = 'Ingresó al Campo';
                    const saleJug = jugadoresMap.get(inc.jugador_id || '');
                    const saleConv = convocadosMap.get(inc.jugador_id || '');
                    subtitulo = `En reemplazo de #${saleConv?.numero || saleJug?.numero || ''} ${saleJug?.nombre || 'Compañero'}`;
                  } else if (esCambioSale) {
                    icono = '🔄';
                    titulo = 'Salió Sustituido';
                    const entraJug = inc.jugador_id_secundario ? jugadoresMap.get(inc.jugador_id_secundario) : null;
                    const entraConv = inc.jugador_id_secundario ? convocadosMap.get(inc.jugador_id_secundario) : null;
                    subtitulo = entraJug ? `Ingresó #${entraConv?.numero || entraJug.numero || ''} ${entraJug.nombre}` : 'Sustitución';
                  }

                  return (
                    <div 
                      key={inc.id}
                      className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{icono}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {titulo}
                          </span>
                          {subtitulo && (
                            <span className="text-[11px] text-[#9aa89f] block truncate">
                              {subtitulo}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#3ddc84]">
                          {inc.minuto}'
                        </span>
                        <span className="text-[10px] text-[#9aa89f] block">
                          {inc.tiempo}T
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0f1712] border border-[#243d2c] text-center text-xs text-[#9aa89f] italic">
                No se registraron incidencias individuales (goles, tiros o tarjetas) para este futbolista en este encuentro.
              </div>
            )}
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="p-3.5 sm:p-4 border-t border-[#243d2c] bg-[#0f1712] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#182a1f] hover:bg-[#243d2c] text-white border border-[#243d2c] rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
