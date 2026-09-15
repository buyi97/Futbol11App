/**
 * @file DashboardView.tsx
 * Pantalla de inicio con métricas principales, acceso al partido en vivo en curso,
 * últimos resultados del equipo y accesos directos a las distintas áreas.
 */

import React, { useMemo } from 'react';
import { 
  Shield, 
  Play, 
  PlusCircle, 
  Users, 
  Calendar, 
  BarChart3, 
  Trophy, 
  Flame, 
  Target, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { Partido, Jugador, Incidencia, RolUsuario } from '../types';
import { VistaActual } from './Navbar';
import { calcularResumenEquipo, calcularEstadisticasAcumuladas } from '../utils/footballCalculations';
import { StorageService } from '../services/storage';

interface DashboardViewProps {
  setVistaActual: (vista: VistaActual) => void;
  rol: RolUsuario;
  partidos: Partido[];
  jugadores: Jugador[];
  incidencias: Incidencia[];
  onSeleccionarPartido: (partidoId: string) => void;
  nombreEquipo?: string;
  colorPropio?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setVistaActual,
  rol,
  partidos,
  jugadores,
  incidencias,
  onSeleccionarPartido,
  nombreEquipo,
  colorPropio
}) => {
  const nombreClub = nombreEquipo || StorageService.getNombreEquipo();
  const colorClub = colorPropio || StorageService.getColorPropio();
  const torneoActivo = StorageService.getTorneoActivo();

  const resumen = calcularResumenEquipo(partidos, incidencias);
  const statsJugadores = calcularEstadisticasAcumuladas(
    jugadores, 
    partidos, 
    StorageService.getConvocados(), 
    incidencias
  );

  const draftVivo = StorageService.getPartidoEnVivo();
  
  // Deduplicar partidos por ID antes de calcular últimos partidos
  const ultimosPartidos = useMemo(() => {
    const map = new Map<string, Partido>();
    partidos.forEach(p => {
      if (p && p.id && !map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values())
      .filter(p => p.estado === 'finalizado')
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 3);
  }, [partidos]);

  const topGoleadores = statsJugadores
    .filter(j => j.goles > 0)
    .slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Banner de Partido En Curso (si existe) */}
      {draftVivo && (
        <div className="bg-gradient-to-r from-[#e63946]/20 via-[#182a1f] to-[#182a1f] border border-[#e63946]/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-[#e63946] text-white shadow-lg shadow-[#e63946]/30 shrink-0">
              <Play className="w-6 h-6 fill-current ml-0.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#e63946] text-white uppercase tracking-wider">
                  Partido En Vivo
                </span>
                <span className="text-xs text-[#9aa89f]">
                  {draftVivo.timer.tiempo}º Tiempo • Minuto {Math.floor(draftVivo.timer.segundosTotales / 60)}'
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white mt-0.5">
                {nombreClub} {draftVivo.partido.resultado_propio} - {draftVivo.partido.resultado_rival} {draftVivo.partido.rival}
              </h2>
            </div>
          </div>

          <button
            id="btn-resume-live"
            onClick={() => setVistaActual('partido-vivo')}
            className="w-full sm:w-auto px-6 py-3 bg-[#e63946] hover:bg-[#d92d3b] text-white font-bold font-display tracking-wider rounded-xl transition-all shadow-lg shadow-[#e63946]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            CONTINUAR CRONÓMETRO E INCIDENCIAS
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Card del Equipo */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div 
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: colorClub }}
        />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${colorClub}20`, color: colorClub }}
              >
                {torneoActivo ? `${torneoActivo.nombre} • Temporada ${torneoActivo.anio}` : 'Temporada 2026 • Torneo Amateur F11'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white uppercase tracking-wide mt-1">
              {nombreClub}
            </h1>
            <p className="text-sm text-[#9aa89f] mt-1 max-w-xl">
              Panel general de rendimiento, gestión de convocatorias, planillas oficiales y registro en vivo local-first.
            </p>

            {/* Racha actual */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider">
                Racha reciente:
              </span>
              <div className="flex items-center gap-1.5">
                {resumen.racha.length > 0 ? (
                  resumen.racha.map((r, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center ${
                        r === 'V'
                          ? 'bg-[#3ddc84]/20 text-[#3ddc84] border border-[#3ddc84]/40'
                          : r === 'E'
                          ? 'bg-amber-500/20 text-[#ffb703] border border-amber-500/40'
                          : 'bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/40'
                      }`}
                    >
                      {r}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">Sin partidos disputados</span>
                )}
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {rol === 'editor' && !draftVivo && (
              <button
                id="btn-quick-new-match"
                onClick={() => setVistaActual('nuevo-partido')}
                className="w-full sm:w-auto px-5 py-3 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold font-display text-base tracking-wider rounded-xl shadow-lg shadow-[#3ddc84]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <PlusCircle className="w-5 h-5" />
                NUEVO PARTIDO
              </button>
            )}

            <button
              id="btn-quick-plantel"
              onClick={() => setVistaActual('plantel')}
              className="w-full sm:w-auto px-4 py-3 bg-[#0f1712] hover:bg-[#243d2c]/40 text-white font-medium text-sm rounded-xl border border-[#243d2c] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#3ddc84]" />
              Ver Plantel ({jugadores.filter(j => j.activo).length})
            </button>
          </div>
        </div>
      </div>

      {/* Métricas Resumen Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider">
              Partidos
            </span>
            <Calendar className="w-4 h-4 text-[#3ddc84]" />
          </div>
          <p className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
            {resumen.partidosDisputados}
          </p>
          <div className="flex items-center gap-2 text-xs text-[#9aa89f] mt-1">
            <span className="text-[#3ddc84]">{resumen.victorias}V</span> • 
            <span className="text-[#ffb703]">{resumen.empates}E</span> • 
            <span className="text-[#e63946]">{resumen.derrotas}D</span>
          </div>
        </div>

        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider">
              Goles a Favor
            </span>
            <Trophy className="w-4 h-4 text-[#ffb703]" />
          </div>
          <p className="font-display text-3xl sm:text-4xl font-bold text-[#3ddc84] mt-1">
            {resumen.golesFavor}
          </p>
          <p className="text-xs text-[#9aa89f] mt-1">
            Diferencia: {resumen.diferenciaGol >= 0 ? `+${resumen.diferenciaGol}` : resumen.diferenciaGol}
          </p>
        </div>

        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider">
              Goles en Contra
            </span>
            <Shield className="w-4 h-4 text-[#e63946]" />
          </div>
          <p className="font-display text-3xl sm:text-4xl font-bold text-[#e63946] mt-1">
            {resumen.golesContra}
          </p>
          <p className="text-xs text-[#9aa89f] mt-1">
            {resumen.partidosDisputados > 0 
              ? `${(resumen.golesContra / resumen.partidosDisputados).toFixed(1)} por partido` 
              : '0 por partido'}
          </p>
        </div>

        <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9aa89f] uppercase tracking-wider">
              Efectividad Remates
            </span>
            <Target className="w-4 h-4 text-[#3ddc84]" />
          </div>
          <p className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
            {resumen.efectividadGol}%
          </p>
          <p className="text-xs text-[#9aa89f] mt-1">
            {resumen.tirosArco} tiros al arco / {resumen.golesEquipo} goles
          </p>
        </div>

      </div>

      {/* Grid de Contenido: Últimos Resultados y Goleadores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Últimos Partidos (2 columnas) */}
        <div className="lg:col-span-2 bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#3ddc84]" />
              <h2 className="font-display font-bold text-lg sm:text-xl text-white uppercase tracking-wider">
                Últimos Partidos
              </h2>
            </div>
            <button
              onClick={() => setVistaActual('historial')}
              className="text-xs font-semibold text-[#3ddc84] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver todos ({partidos.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {ultimosPartidos.length > 0 ? (
              ultimosPartidos.map((partido, idx) => {
                const esVictoria = partido.resultado_propio > partido.resultado_rival;
                const esEmpate = partido.resultado_propio === partido.resultado_rival;

                return (
                  <div
                    key={`${partido.id}-${idx}`}
                    onClick={() => onSeleccionarPartido(partido.id)}
                    className="p-3.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/50 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg font-display font-bold text-xs flex items-center justify-center shrink-0 ${
                          esVictoria
                            ? 'bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30'
                            : esEmpate
                            ? 'bg-amber-500/15 text-[#ffb703] border border-amber-500/30'
                            : 'bg-[#e63946]/15 text-[#e63946] border border-[#e63946]/30'
                        }`}
                      >
                        {esVictoria ? 'V' : esEmpate ? 'E' : 'D'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white group-hover:text-[#3ddc84] transition-colors">
                            vs {partido.rival}
                          </span>
                          <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#182a1f] text-[#9aa89f] capitalize">
                            {partido.condicion}
                          </span>
                        </div>
                        <p className="text-xs text-[#9aa89f]">
                          {partido.fecha} • {partido.cancha || 'Cancha asignada'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-display font-bold text-xl sm:text-2xl text-white">
                        <span className={esVictoria ? 'text-[#3ddc84]' : ''}>{partido.resultado_propio}</span>
                        <span className="text-[#9aa89f] mx-1">-</span>
                        <span className={!esVictoria && !esEmpate ? 'text-[#e63946]' : ''}>{partido.resultado_rival}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9aa89f] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-sm text-[#9aa89f]">
                No hay partidos jugados todavía.
              </div>
            )}
          </div>
        </div>

        {/* Goleadores del Equipo (1 columna) */}
        <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#ffb703]" />
              <h2 className="font-display font-bold text-lg sm:text-xl text-white uppercase tracking-wider">
                Goleadores
              </h2>
            </div>
            <button
              onClick={() => setVistaActual('estadisticas')}
              className="text-xs font-semibold text-[#3ddc84] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Tabla completa
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {topGoleadores.length > 0 ? (
              topGoleadores.map((jug, idx) => (
                <div
                  key={jug.jugadorId}
                  className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-display font-bold text-sm text-[#ffb703] w-4 text-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {jug.nombre}
                      </p>
                      <p className="text-[11px] text-[#9aa89f]">
                        Dorsal #{jug.numero} • {jug.partidosJugados} partidos
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-display font-bold text-lg text-[#3ddc84]">
                      {jug.goles} ⚽
                    </span>
                    {jug.asistencias > 0 && (
                      <p className="text-[10px] text-[#9aa89f]">
                        {jug.asistencias} asist.
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-[#9aa89f]">
                Sin goles registrados aún.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
