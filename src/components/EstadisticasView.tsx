/**
 * @file EstadisticasView.tsx
 * Tablas acumuladas de rendimiento de los futbolistas de Los Halcones FC:
 * - Goles, asistencias, minutos jugados totales, amarillas, rojas y partidos.
 * - Gráficos y métricas avanzadas (efectividad de remates, distribución de resultados).
 * - Ordenamiento por columna interactivo.
 */

import React, { useState } from 'react';
import { 
  BarChart3, 
  Trophy, 
  Award, 
  Target, 
  Users, 
  Clock, 
  ArrowUpDown, 
  Search,
  CheckCircle2,
  TrendingUp,
  X,
  ChevronRight,
  Shield,
  Activity,
  Calendar
} from 'lucide-react';
import { Jugador, Partido, Convocado, Incidencia, EstadisticaJugador } from '../types';
import { 
  calcularEstadisticasAcumuladas, 
  calcularResumenEquipo, 
  getPosicionBadge,
  obtenerHistorialDetalladoJugador 
} from '../utils/footballCalculations';
import { StorageService } from '../services/storage';

interface EstadisticasViewProps {
  jugadores: Jugador[];
  partidos: Partido[];
  convocados: Convocado[];
  incidencias: Incidencia[];
}

type CampoOrden = 
  | 'goles' 
  | 'asistencias' 
  | 'tirosTotal'
  | 'tirosArco' 
  | 'faltas' 
  | 'minutosJugados' 
  | 'partidosJugados' 
  | 'tarjetasAmarillas' 
  | 'tarjetasRojas';

export const EstadisticasView: React.FC<EstadisticasViewProps> = ({
  jugadores,
  partidos,
  convocados,
  incidencias
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [campoOrden, setCampoOrden] = useState<CampoOrden>('goles');
  const [ordenAsc, setOrdenAsc] = useState(false);
  const [jugadorModalId, setJugadorModalId] = useState<string | null>(null);
  const [filtroTorneo, setFiltroTorneo] = useState<string>('todos');

  const torneos = StorageService.getTorneos();
  const nombreEquipo = StorageService.getNombreEquipo();

  // Filtrado por Torneo / Temporada
  const partidosFiltradosPorTorneo = filtroTorneo === 'todos'
    ? partidos
    : partidos.filter(p => p.torneo_id === filtroTorneo);

  const stats = calcularEstadisticasAcumuladas(jugadores, partidosFiltradosPorTorneo, convocados, incidencias);
  const resumen = calcularResumenEquipo(partidosFiltradosPorTorneo, incidencias);

  // Ordenamiento
  const statsOrdenadas = [...stats]
    .filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase()) || String(s.numero).includes(busqueda))
    .sort((a, b) => {
      const valA = a[campoOrden];
      const valB = b[campoOrden];
      if (valA === valB) {
        if (campoOrden === 'tirosTotal') return b.tirosArco - a.tirosArco;
        return b.goles - a.goles;
      }
      return ordenAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

  const cambiarOrden = (campo: CampoOrden) => {
    if (campoOrden === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setCampoOrden(campo);
      setOrdenAsc(false);
    }
  };

  // Jugador seleccionado para el modal de detalle
  const jugadorSeleccionado = jugadorModalId ? jugadores.find(j => j.id === jugadorModalId) : null;
  const statsJugadorSeleccionado = jugadorModalId ? stats.find(s => s.jugadorId === jugadorModalId) : null;
  const historialJugadorSeleccionado = jugadorModalId ? obtenerHistorialDetalladoJugador(jugadorModalId, partidos, convocados, incidencias, jugadores) : [];

  // Top 5 goleadores para el gráfico de barras
  const topGoleadores = [...stats]
    .filter(s => s.goles > 0)
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 5);

  const maxGoles = topGoleadores.length > 0 ? topGoleadores[0].goles : 1;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header con Filtro por Temporada / Torneo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#3ddc84]" />
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-wider">
              Estadísticas del Equipo
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#9aa89f] mt-0.5">
            Métricas acumuladas del plantel de <span className="text-white font-semibold">{nombreEquipo}</span>.
          </p>
        </div>

        {/* Selector de Torneo / Temporada */}
        <div className="flex items-center gap-2 bg-[#182a1f] border border-[#243d2c] p-1.5 rounded-xl self-start sm:self-auto">
          <Trophy className="w-4 h-4 text-[#ffb703] ml-1.5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-[#9aa89f] uppercase font-bold tracking-wider leading-none">
              Torneo / Temporada
            </span>
            <select
              value={filtroTorneo}
              onChange={(e) => setFiltroTorneo(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2 pt-0.5"
            >
              <option value="todos" className="bg-[#182a1f] text-white">
                Todos los Torneos ({partidos.length} partidos)
              </option>
              {torneos.map(t => (
                <option key={t.id} value={t.id} className="bg-[#182a1f] text-white">
                  {t.nombre} {t.estado === 'activo' ? '🟢 (En curso)' : '🔒 (Cerrado)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider block">
            Efectividad de Puntos
          </span>
          <div className="font-display font-bold text-3xl text-[#3ddc84] mt-1">
            {resumen.efectividadPuntos}%
          </div>
          <span className="text-xs text-[#9aa89f]">
            {resumen.victorias} victorias en {resumen.partidosDisputados} partidos
          </span>
        </div>

        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider block">
            Promedio de Gol
          </span>
          <div className="font-display font-bold text-3xl text-white mt-1">
            {resumen.partidosDisputados > 0 ? (resumen.golesFavor / resumen.partidosDisputados).toFixed(1) : '0.0'}
          </div>
          <span className="text-xs text-[#9aa89f]">
            {resumen.golesFavor} goles a favor
          </span>
        </div>

        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider block">
            Efectividad Remates
          </span>
          <div className="font-display font-bold text-3xl text-[#ffb703] mt-1">
            {resumen.efectividadGol}%
          </div>
          <span className="text-xs text-[#9aa89f]">
            {resumen.golesEquipo} goles / {resumen.tirosArco} al arco
          </span>
        </div>

        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider block">
            Disciplina
          </span>
          <div className="font-display font-bold text-3xl text-white mt-1 flex items-center gap-2">
            <span>{resumen.amarillasEquipo} 🟨</span>
            <span className="text-[#e63946]">{resumen.rojasEquipo} 🟥</span>
          </div>
          <span className="text-xs text-[#9aa89f]">
            {resumen.faltasEquipo} faltas cometidas
          </span>
        </div>

      </div>

      {/* Gráficos Visuales de Rendimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Top Goleadores */}
        <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#ffb703]" />
              Tabla de Goleadores (Top 5)
            </h3>
            <span className="text-xs text-[#9aa89f]">Goles oficiales</span>
          </div>

          <div className="space-y-3">
            {topGoleadores.length > 0 ? (
              topGoleadores.map((jug, idx) => {
                const porcentaje = (jug.goles / maxGoles) * 100;

                return (
                  <div key={jug.jugadorId} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-[#ffb703] w-4">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-white">
                          #{jug.numero} {jug.nombre}
                        </span>
                      </div>
                      <span className="font-display font-bold text-sm text-[#3ddc84]">
                        {jug.goles} goles
                      </span>
                    </div>

                    <div className="h-3 rounded-full bg-[#0f1712] overflow-hidden p-0.5 border border-[#243d2c]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1b5e3a] to-[#3ddc84] transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-[#9aa89f]">
                No hay goles registrados todavía.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Embudo de Remates y Goles */}
        <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-[#3ddc84]" />
              Conversión de Ataque del Equipo
            </h3>
            <span className="text-xs text-[#9aa89f]">Tiros vs Goles</span>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold text-white mb-1">
                <span>Tiros Totales Intentados</span>
                <span className="text-zinc-300">{resumen.tirosTotales}</span>
              </div>
              <div className="h-3 rounded-full bg-[#0f1712] overflow-hidden">
                <div className="bg-zinc-500 h-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-white mb-1">
                <span>Tiros con Destino al Arco</span>
                <span className="text-[#3ddc84]">{resumen.tirosArco} ({resumen.tirosTotales > 0 ? Math.round((resumen.tirosArco / resumen.tirosTotales) * 100) : 0}%)</span>
              </div>
              <div className="h-3 rounded-full bg-[#0f1712] overflow-hidden">
                <div 
                  className="bg-[#3ddc84] h-full transition-all" 
                  style={{ width: `${resumen.tirosTotales > 0 ? (resumen.tirosArco / resumen.tirosTotales) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-white mb-1">
                <span>Goles Convertidos</span>
                <span className="text-[#ffb703] font-bold">{resumen.golesEquipo} ({resumen.efectividadGol}%)</span>
              </div>
              <div className="h-3 rounded-full bg-[#0f1712] overflow-hidden">
                <div 
                  className="bg-[#ffb703] h-full transition-all" 
                  style={{ width: `${resumen.tirosTotales > 0 ? (resumen.golesEquipo / resumen.tirosTotales) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Tabla Completa de Rendimiento de Jugadores */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#3ddc84]" />
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">
              Tabla Acumulada del Plantel
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa89f]">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por jugador o número..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#243d2c] text-[#9aa89f] uppercase tracking-wider text-[10px]">
                <th className="sticky left-0 z-20 bg-[#182a1f] border-r border-[#243d2c]/80 py-2 sm:py-2.5 px-2 sm:px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                  Dorsal & Nombre
                </th>
                <th className="hidden sm:table-cell py-2.5 px-2">Posición</th>
                
                <th 
                  onClick={() => cambiarOrden('partidosJugados')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    <span>PJ</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => cambiarOrden('minutosJugados')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-right cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <span className="hidden sm:inline">Minutos</span>
                    <span className="sm:hidden inline">Min</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => cambiarOrden('goles')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-right cursor-pointer hover:text-white transition-colors select-none text-[#3ddc84]"
                >
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <span className="hidden sm:inline">Goles ⚽</span>
                    <span className="sm:hidden inline">⚽</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => cambiarOrden('asistencias')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-right cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <span className="hidden sm:inline">Asist. 👟</span>
                    <span className="sm:hidden inline">👟</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => cambiarOrden('tirosTotal')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-right cursor-pointer hover:text-white transition-colors select-none"
                  title="Tiros Totales (y Tiros al Arco entre paréntesis)"
                >
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <span className="hidden sm:inline">Tiros 🎯</span>
                    <span className="sm:hidden inline">🎯</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => cambiarOrden('faltas')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-right cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <span className="hidden sm:inline">Faltas 🚫</span>
                    <span className="sm:hidden inline">🚫</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => cambiarOrden('tarjetasAmarillas')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    <span>🟨</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th 
                  onClick={() => cambiarOrden('tarjetasRojas')}
                  className="py-2 sm:py-2.5 px-1 sm:px-2 text-center cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    <span>🟥</span>
                    <ArrowUpDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                </th>

                <th className="hidden sm:table-cell py-2.5 px-2 text-center">Ficha</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#243d2c]/60">
              {statsOrdenadas.map((j) => {
                const badge = getPosicionBadge(j.posicion);

                return (
                  <tr 
                    key={j.jugadorId} 
                    onClick={() => setJugadorModalId(j.jugadorId)}
                    className="hover:bg-[#243d2c]/40 transition-colors cursor-pointer group"
                    title="Hacé clic para ver el detalle y partidos del jugador"
                  >
                    <td className="sticky left-0 z-10 bg-[#182a1f] border-r border-[#243d2c]/80 py-2 sm:py-2.5 px-2 sm:px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-1.5 max-w-[100px] sm:max-w-none">
                        <span className="font-display font-bold text-xs sm:text-sm text-[#3ddc84] shrink-0">
                          #{j.numero}
                        </span>
                        <span className="font-semibold text-white group-hover:text-[#3ddc84] transition-colors truncate text-xs">
                          {j.nombre}
                        </span>
                      </div>
                    </td>

                    <td className="hidden sm:table-cell py-2 sm:py-2.5 px-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-center font-display font-bold text-xs sm:text-sm text-white">
                      {j.partidosJugados}
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-right font-display font-bold text-xs sm:text-sm text-white">
                      {j.minutosJugados}'
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-right font-display font-bold text-xs sm:text-base text-[#3ddc84]">
                      {j.goles}
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-right font-display font-bold text-xs sm:text-sm text-zinc-300">
                      {j.asistencias}
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-right font-display text-xs sm:text-sm whitespace-nowrap">
                      <span className="font-bold text-white">{j.tirosTotal}</span>
                      <span className="text-[#3ddc84] font-semibold ml-1">({j.tirosArco})</span>
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-right font-display font-bold text-xs sm:text-sm text-zinc-300">
                      {j.faltas}
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-center text-xs font-semibold text-amber-400">
                      {j.tarjetasAmarillas > 0 ? j.tarjetasAmarillas : '-'}
                    </td>

                    <td className="py-2 sm:py-2.5 px-1 sm:px-2 text-center text-xs font-semibold text-[#e63946]">
                      {j.tarjetasRojas > 0 ? j.tarjetasRojas : '-'}
                    </td>

                    <td className="hidden sm:table-cell py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJugadorModalId(j.jugadorId);
                        }}
                        className="px-2 py-1 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-[#3ddc84] text-[11px] font-semibold rounded-md transition-colors"
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DETALLE COMPLETO DEL JUGADOR CON HISTORIAL PARTIDO A PARTIDO         */}
      {/* ========================================================================= */}
      {jugadorSeleccionado && statsJugadorSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            
            {/* Cerrar modal */}
            <button
              type="button"
              onClick={() => setJugadorModalId(null)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Jugador */}
            <div className="flex items-start gap-4 pb-4 border-b border-[#243d2c]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#243d2c] to-[#0f1712] border border-[#3ddc84]/40 flex items-center justify-center text-[#3ddc84] font-display font-bold text-2xl shrink-0 shadow-lg">
                #{jugadorSeleccionado.numero || statsJugadorSeleccionado.numero}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
                    {jugadorSeleccionado.nombre}
                  </h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPosicionBadge(jugadorSeleccionado.posicion).bg}`}>
                    {getPosicionBadge(jugadorSeleccionado.posicion).label}
                  </span>
                </div>
                <p className="text-xs text-[#9aa89f] mt-1">
                  {nombreEquipo} • Estado: {jugadorSeleccionado.activo ? 'En plantilla activa' : 'Inactivo'}
                </p>
              </div>
            </div>

            {/* Contenido scrolleable: Estadísticas Resumidas + Historial */}
            <div className="flex-1 overflow-y-auto space-y-5 pt-4 pr-1">
              
              {/* Tarjetas de Estadísticas Globales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#0f1712] border border-[#243d2c]">
                  <span className="text-[10px] text-[#9aa89f] uppercase font-bold block">Partidos Jugados</span>
                  <div className="font-display font-bold text-xl text-white mt-0.5">
                    {statsJugadorSeleccionado.partidosJugados}
                  </div>
                  <span className="text-[10px] text-[#9aa89f]">
                    {statsJugadorSeleccionado.partidosTitular} como titular
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1712] border border-[#243d2c]">
                  <span className="text-[10px] text-[#9aa89f] uppercase font-bold block">Minutos Totales</span>
                  <div className="font-display font-bold text-xl text-white mt-0.5">
                    {statsJugadorSeleccionado.minutosJugados}'
                  </div>
                  <span className="text-[10px] text-[#9aa89f]">
                    Prom. {statsJugadorSeleccionado.promedioMinutos}' / partido
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1712] border border-[#243d2c]">
                  <span className="text-[10px] text-[#9aa89f] uppercase font-bold block">Goles & Asistencias</span>
                  <div className="font-display font-bold text-xl text-[#3ddc84] mt-0.5 flex items-center gap-2">
                    <span>⚽ {statsJugadorSeleccionado.goles}</span>
                    <span className="text-zinc-300 text-sm">👟 {statsJugadorSeleccionado.asistencias}</span>
                  </div>
                  <span className="text-[10px] text-[#9aa89f]">
                    Contribución directa
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1712] border border-[#243d2c]">
                  <span className="text-[10px] text-[#9aa89f] uppercase font-bold block">Tiros: Totales (Al Arco)</span>
                  <div className="font-display font-bold text-xl text-white mt-0.5 flex items-center gap-1.5">
                    <span>🎯 {statsJugadorSeleccionado.tirosTotal}</span>
                    <span className="text-[#3ddc84] text-sm">({statsJugadorSeleccionado.tirosArco})</span>
                  </div>
                  <span className="text-[10px] text-[#9aa89f]">
                    🚫 {statsJugadorSeleccionado.faltas} faltas cometidas
                  </span>
                </div>
              </div>

              {/* Disciplina */}
              <div className="p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] flex items-center justify-between">
                <span className="text-xs text-[#9aa89f] font-semibold">Registro de Tarjetas:</span>
                <div className="flex items-center gap-4 text-sm font-bold">
                  <span className="text-amber-400 flex items-center gap-1.5 font-display" title="Tarjetas amarillas">
                    <span className="w-3.5 h-4.5 bg-[#f4c430] rounded-xs inline-block shadow-sm" />
                    {statsJugadorSeleccionado.tarjetasAmarillas}
                  </span>
                  <span className="text-[#e63946] flex items-center gap-1.5 font-display" title="Tarjetas rojas">
                    <span className="w-3.5 h-4.5 bg-[#e63946] rounded-xs inline-block shadow-sm" />
                    {statsJugadorSeleccionado.tarjetasRojas}
                  </span>
                </div>
              </div>

              {/* Historial Partido a Partido */}
              <div>
                <h3 className="font-display font-bold text-base text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3ddc84]" />
                  Partidos en los que Jugó ({historialJugadorSeleccionado.length})
                </h3>

                {historialJugadorSeleccionado.length > 0 ? (
                  <div className="space-y-2.5">
                    {historialJugadorSeleccionado.map((h) => {
                      const gano = h.resultadoPropio > h.resultadoRival;
                      const empato = h.resultadoPropio === h.resultadoRival;
                      const resultadoColor = gano ? 'text-[#3ddc84]' : empato ? 'text-[#ffb703]' : 'text-[#e63946]';
                      const resultadoBadge = gano ? 'bg-[#3ddc84]/20 text-[#3ddc84] border-[#3ddc84]/40' : empato ? 'bg-[#ffb703]/20 text-[#ffb703] border-[#ffb703]/40' : 'bg-[#e63946]/20 text-[#e63946] border-[#e63946]/40';

                      return (
                        <div 
                          key={h.partidoId}
                          className="p-3.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#243d2c]/80 transition-all"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <div>
                              <span className="text-xs text-[#9aa89f] block">
                                {h.fecha} • {h.condicion === 'local' ? 'Local' : 'Visitante'}
                              </span>
                              <div className="font-display font-bold text-sm text-white">
                                vs {h.rival}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold font-display border ${resultadoBadge}`}>
                                {h.resultadoPropio} - {h.resultadoRival}
                              </span>
                            </div>
                          </div>

                          {/* Estadísticas de este partido */}
                          <div className="flex items-center gap-3 text-xs text-[#9aa89f] flex-wrap pt-2 border-t border-[#243d2c]/60">
                            <span className="text-white font-semibold">
                              #{h.numero || statsJugadorSeleccionado.numero} • {h.titular ? 'Titular' : 'Suplente'} ({h.minutosJugados}')
                            </span>

                            {h.fueExpulsado && (
                              <span className="text-[#e63946] font-bold text-[11px] bg-[#e63946]/10 border border-[#e63946]/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <span>🟥</span> Expulsado{h.minutoExpulsion ? ` (${h.minutoExpulsion}')` : ''}
                              </span>
                            )}

                            {h.goles > 0 && (
                              <span className="text-[#3ddc84] font-bold">
                                ⚽ {h.goles} {h.goles === 1 ? 'Gol' : 'Goles'}
                              </span>
                            )}

                            {h.asistencias > 0 && (
                              <span className="text-zinc-200 font-semibold">
                                👟 {h.asistencias} {h.asistencias === 1 ? 'Asistencia' : 'Asistencias'}
                              </span>
                            )}

                            {h.tirosArco > 0 && (
                              <span className="text-[#3ddc84]">
                                🎯 {h.tirosArco} {h.tirosArco === 1 ? 'tiro al arco' : 'tiros al arco'}
                              </span>
                            )}

                            {h.tirosTotal > h.tirosArco && (
                              <span className="text-zinc-400">
                                💨 {h.tirosTotal - h.tirosArco} desviado(s)
                              </span>
                            )}

                            {h.faltas > 0 && (
                              <span className="text-zinc-300">
                                🚫 {h.faltas} {h.faltas === 1 ? 'falta cometida' : 'faltas cometidas'}
                              </span>
                            )}

                            {h.amarillas > 0 && (
                              <span className="text-amber-400 font-bold font-display flex items-center gap-1">
                                🟨 {h.amarillas}
                              </span>
                            )}

                            {h.rojas > 0 && (
                              <span className="text-[#e63946] font-bold font-display flex items-center gap-1">
                                🟥 {h.rojas}
                              </span>
                            )}

                            {h.goles === 0 && h.asistencias === 0 && h.tirosTotal === 0 && h.faltas === 0 && h.amarillas === 0 && h.rojas === 0 && (
                              <span className="text-zinc-500 italic">
                                Sin incidencias registradas
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-[#9aa89f] bg-[#0f1712] rounded-xl border border-[#243d2c]">
                    Este jugador aún no disputó minutos en partidos finalizados.
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-[#243d2c] flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setJugadorModalId(null)}
                className="px-5 py-2 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                CERRAR FICHA
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
