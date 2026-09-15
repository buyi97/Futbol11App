/**
 * @file PartidoVivoView.tsx
 * Pantalla principal de partido en vivo.
 * Optimizada para uso táctil con una mano en celular (mobile-first):
 * - Cronómetro deportivo gigante con 1T, 2T y tiempo agregado.
 * - Marcador en tiempo real.
 * - Botonera táctil de incidencias de gran tamaño (>48px).
 * - Modal rápido de asignación de jugador y sustituciones en dos pasos.
 * - Timeline de incidencias con opción de deshacer/editar.
 * - Guardado continuo en localStorage y encolado en background.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Plus, 
  Clock, 
  Flag, 
  Target, 
  ArrowRightLeft, 
  Undo2, 
  Trash2, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  Shield, 
  Users, 
  X, 
  Search,
  Check,
  ChevronRight
} from 'lucide-react';
import { 
  Partido, 
  Convocado, 
  RivalJugador, 
  Incidencia, 
  TipoIncidencia, 
  EquipoIncidencia,
  Jugador
} from '../types';
import { StorageService, PartidoEnVivoDraft } from '../services/storage';
import { ApiService } from '../services/api';
import { 
  formatTimeDigital, 
  calcularMinutoDisplay, 
  formatearMinutoIncidencia, 
  MinutoIncidenciaInfo 
} from '../utils/footballCalculations';
import { TacticaCancha, JugadorEnCancha } from './TacticaCancha';
import { FORMACIONES_DISPONIBLES } from './NuevoPartidoView';

interface PartidoVivoViewProps {
  jugadores: Jugador[];
  onPartidoFinalizado: (partidoId: string) => void;
  onVolver: () => void;
  nombreEquipo?: string;
  colorPropio?: string;
}

export const PartidoVivoView: React.FC<PartidoVivoViewProps> = ({
  jugadores,
  onPartidoFinalizado,
  onVolver,
  nombreEquipo,
  colorPropio
}) => {
  const nombreClub = nombreEquipo || StorageService.getNombreEquipo();
  const colorClub = colorPropio || StorageService.getColorPropio();

  // Cargar borrador del partido en vivo
  const [draft, setDraft] = useState<PartidoEnVivoDraft | null>(() => StorageService.getPartidoEnVivo());

  // Cronómetro interno
  const [tiempo, setTiempo] = useState<1 | 2>(draft?.timer.tiempo || 1);
  const [segundosTotales, setSegundosTotales] = useState<number>(draft?.timer.segundosTotales || 0);
  const [corriendo, setCorriendo] = useState<boolean>(draft?.timer.corriendo || false);
  const [agregado1T, setAgregado1T] = useState<number>(draft?.partido.agregado_1T || 0);
  const [agregado2T, setAgregado2T] = useState<number>(draft?.partido.agregado_2T || 0);

  // Marcador en vivo
  const [golesPropio, setGolesPropio] = useState<number>(draft?.partido.resultado_propio || 0);
  const [golesRival, setGolesRival] = useState<number>(draft?.partido.resultado_rival || 0);

  // Incidencias
  const [incidencias, setIncidencias] = useState<Incidencia[]>(draft?.incidencias || []);

  // Modal selector de incidencia
  const [modalIncidenciaAbierto, setModalIncidenciaAbierto] = useState(false);
  const [modalCornerAbierto, setModalCornerAbierto] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoIncidencia | null>(null);
  const [equipoIncidencia, setEquipoIncidencia] = useState<EquipoIncidencia>('propio');
  const [minutoCongelado, setMinutoCongelado] = useState(0);
  const [segundoCongelado, setSegundoCongelado] = useState(0);
  const [minutoInfoCongelado, setMinutoInfoCongelado] = useState<MinutoIncidenciaInfo | null>(null);
  const [filtroBuscador, setFiltroBuscador] = useState('');
  const [detalleTexto, setDetalleTexto] = useState('');

  // Vista táctica en modal
  const [vistaCancha, setVistaCancha] = useState(true);

  // Para sustituciones (2 pasos)
  const [pasoSustitucion, setPasoSustitucion] = useState<1 | 2>(1);
  const [jugadorSaleId, setJugadorSaleId] = useState<string | null>(null);

  // Para asistencias en goles
  const [pasoAsistencia, setPasoAsistencia] = useState(false);
  const [goleadorId, setGoleadorId] = useState<string | null>(null);
  const [asistenciaId, setAsistenciaId] = useState<string | null>(null);

  // Modal tiempo agregado
  const [modalAgregadoAbierto, setModalAgregadoAbierto] = useState(false);
  const [minutosAgregadoInput, setMinutosAgregadoInput] = useState(2);

  // Modal finalizar partido
  const [modalFinalizarAbierto, setModalFinalizarAbierto] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  // Duración reglamentaria
  const duracionReglamentariaMin = draft?.partido.duracion_tiempo_min || 40;
  const segundosReglamentarios = duracionReglamentariaMin * 60;
  const agregadoActualMin = tiempo === 1 ? agregado1T : agregado2T;

  const jugadoresMap = new Map<string, Jugador>(jugadores.map(j => [j.id, j]));

  // Manejador del reloj con requestAnimationFrame y timestamp real para que no se atrase en segundo plano
  const timerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (corriendo) {
      lastTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - lastTimeRef.current) / 1000);
        if (delta >= 1) {
          setSegundosTotales(prev => prev + delta);
          lastTimeRef.current = now;
        }
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [corriendo]);

  // Persistir estado cada vez que cambia
  useEffect(() => {
    if (!draft) return;
    const nuevoDraft: PartidoEnVivoDraft = {
      ...draft,
      partido: {
        ...draft.partido,
        resultado_propio: golesPropio,
        resultado_rival: golesRival,
        agregado_1T: agregado1T,
        agregado_2T: agregado2T
      },
      incidencias,
      timer: {
        tiempo,
        segundosTotales,
        corriendo,
        ultimoTimestamp: Date.now(),
        agregado1T,
        agregado2T,
        medioTiempoAlcanzado: draft.timer.medioTiempoAlcanzado || (tiempo === 1 && segundosTotales >= segundosReglamentarios)
      }
    };
    StorageService.savePartidoEnVivo(nuevoDraft);
  }, [segundosTotales, corriendo, tiempo, agregado1T, agregado2T, golesPropio, golesRival, incidencias]);

  // Recalcular goles cuando cambian incidencias
  const recalcularGoles = (incs: Incidencia[]) => {
    let p = 0;
    let r = 0;
    incs.forEach(inc => {
      if (inc.tipo === 'gol') {
        if (inc.equipo === 'propio') p++;
        else r++;
      } else if (inc.tipo === 'autogol') {
        if (inc.equipo === 'propio') r++;
        else p++;
      }
    });
    setGolesPropio(p);
    setGolesRival(r);

    if (draft) {
      const partidoActualizado = {
        ...draft.partido,
        resultado_propio: p,
        resultado_rival: r
      };
      StorageService.savePartido(partidoActualizado);
    }
  };

  if (!draft) {
    return (
      <div className="text-center py-16 bg-[#182a1f] border border-[#243d2c] rounded-2xl p-6">
        <AlertTriangle className="w-12 h-12 text-[#ffb703] mx-auto mb-3" />
        <h2 className="text-xl font-bold font-display text-white uppercase">
          No hay ningún partido en vivo activo
        </h2>
        <p className="text-sm text-[#9aa89f] mt-1 mb-6">
          Podés iniciar un nuevo partido desde la sección correspondiente o consultar el historial.
        </p>
        <button
          onClick={onVolver}
          className="px-6 py-2.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold rounded-xl font-display cursor-pointer"
        >
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  // Cálculos de minutos y segundos del reloj
  const minutosReloj = Math.floor(segundosTotales / 60);
  const segundosReloj = segundosTotales % 60;
  const tiempoExcedido = minutosReloj >= duracionReglamentariaMin;
  const minutosExcedidos = Math.max(0, minutosReloj - duracionReglamentariaMin);

  // Controles de Cronómetro
  const togglePlayPausa = () => {
    setCorriendo(!corriendo);
  };

  const iniciarSegundoTiempo = () => {
    setCorriendo(false);
    setTiempo(2);
    setSegundosTotales(0);
  };

  const aplicarTiempoAgregado = (minutos: number) => {
    if (tiempo === 1) setAgregado1T(minutos);
    else setAgregado2T(minutos);
    setModalAgregadoAbierto(false);
  };

  // Abrir selector de incidencia
  const triggerIncidencia = (tipo: TipoIncidencia) => {
    const minInfo = calcularMinutoDisplay(segundosTotales, tiempo, duracionReglamentariaMin);
    setMinutoInfoCongelado(minInfo);
    setMinutoCongelado(minInfo.minuto);
    setSegundoCongelado(minInfo.segundo);

    // Córner: solo requiere equipo, no jugador
    if (tipo === 'corner') {
      setModalCornerAbierto(true);
      return;
    }

    setTipoSeleccionado(tipo);
    setEquipoIncidencia('propio');
    setFiltroBuscador('');
    setDetalleTexto('');
    setPasoSustitucion(1);
    setJugadorSaleId(null);
    setPasoAsistencia(false);
    setGoleadorId(null);
    setAsistenciaId(null);
    setModalIncidenciaAbierto(true);
  };

  // Registrar Córner rápido por equipo
  const confirmarGuardadoCorner = async (equipo: EquipoIncidencia) => {
    if (!draft) return;
    const minInfo = minutoInfoCongelado || calcularMinutoDisplay(segundosTotales, tiempo, duracionReglamentariaMin);

    const nuevaInc: Incidencia = {
      id: 'inc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      partido_id: draft.partido.id,
      tiempo,
      minuto: minInfo.minuto,
      segundo: minInfo.segundo,
      minuto_display: minInfo.display,
      minuto_agregado: minInfo.esAgregado ? minInfo.minutoExtra : undefined,
      tipo: 'corner',
      equipo,
      jugador_id: 'equipo',
      created_at: Date.now()
    };

    const nuevasIncs = [nuevaInc, ...incidencias];
    setIncidencias(nuevasIncs);
    setModalCornerAbierto(false);

    await ApiService.guardarIncidencia(nuevaInc);
  };

  // Guardar Incidencia con jugador y opcional asistencia/secundario
  const confirmarGuardadoIncidencia = async (
    jugadorId: string, 
    jugadorSecundarioId?: string,
    asistId?: string
  ) => {
    if (!tipoSeleccionado || !draft) return;

    const minInfo = minutoInfoCongelado || calcularMinutoDisplay(segundosTotales, tiempo, duracionReglamentariaMin);
    const cleanJugadorId = typeof jugadorId === 'object' && jugadorId !== null 
      ? ((jugadorId as any).id || String((jugadorId as any).numero)) 
      : String(jugadorId || '').trim();

    const nuevaInc: Incidencia = {
      id: 'inc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      partido_id: draft.partido.id,
      tiempo,
      minuto: minInfo.minuto,
      segundo: minInfo.segundo,
      minuto_display: minInfo.display,
      minuto_agregado: minInfo.esAgregado ? minInfo.minutoExtra : undefined,
      tipo: tipoSeleccionado,
      equipo: equipoIncidencia,
      jugador_id: cleanJugadorId,
      jugador_id_secundario: jugadorSecundarioId ? String(jugadorSecundarioId).trim() : undefined,
      asistencia_id: (asistId || asistenciaId) ? String(asistId || asistenciaId).trim() : undefined,
      detalle: detalleTexto.trim() || undefined,
      created_at: Date.now()
    };

    const nuevasIncs = [nuevaInc, ...incidencias];
    setIncidencias(nuevasIncs);
    recalcularGoles(nuevasIncs);
    setModalIncidenciaAbierto(false);

    // Enviar a API / Storage
    await ApiService.guardarIncidencia(nuevaInc);
  };

  // Deshacer / Eliminar incidencia
  const handleEliminarIncidencia = async (incId: string) => {
    const filtradas = incidencias.filter(i => i.id !== incId);
    setIncidencias(filtradas);
    recalcularGoles(filtradas);
    await ApiService.eliminarIncidencia(incId, draft.partido.id);
  };

  // Finalizar Partido
  const handleConfirmarFinalizar = async () => {
    setFinalizando(true);
    await ApiService.finalizarPartido(draft.partido.id, agregado1T, agregado2T);
    setFinalizando(false);
    setModalFinalizarAbierto(false);
    onPartidoFinalizado(draft.partido.id);
  };

  // Listas de convocados para el selector
  const titulares = draft.convocados.filter(c => c.titular);
  const suplentes = draft.convocados.filter(c => !c.titular);

  // Jugadores que actualmente están en cancha (titulares que no salieron + suplentes que entraron)
  const jugadoresEnCanchaIds = new Set<string>(titulares.map(t => t.jugador_id));
  incidencias.forEach(inc => {
    if (inc.tipo === 'cambio' && inc.equipo === 'propio') {
      jugadoresEnCanchaIds.delete(inc.jugador_id);
      if (inc.jugador_id_secundario) {
        jugadoresEnCanchaIds.add(inc.jugador_id_secundario);
      }
    }
  });

  const jugadoresEnBancoIds = new Set<string>(
    draft.convocados.map(c => c.jugador_id).filter(id => !jugadoresEnCanchaIds.has(id))
  );

  // Preparar disposición táctica para el modal (Equipo Propio)
  const presetP = draft.partido.formacion_propia && FORMACIONES_DISPONIBLES[draft.partido.formacion_propia] 
    ? FORMACIONES_DISPONIBLES[draft.partido.formacion_propia] 
    : FORMACIONES_DISPONIBLES['4-3-3'];

  const convocadosEnCancha = draft.convocados.filter(c => jugadoresEnCanchaIds.has(c.jugador_id));
  const convocadosEnBanco = draft.convocados.filter(c => jugadoresEnBancoIds.has(c.jugador_id));

  const jugadoresCanchaPropia: JugadorEnCancha[] = convocadosEnCancha.map((c, idx) => {
    const jug = jugadoresMap.get(c.jugador_id);
    const coords = c.tactica_x !== undefined && c.tactica_y !== undefined 
      ? { x: c.tactica_x, y: c.tactica_y } 
      : (presetP[idx] || { x: 50, y: 50 });
    return {
      id: c.jugador_id,
      nombre: jug?.nombre || 'Jugador',
      numero: c.numero || jug?.numero || idx + 1,
      posicion: c.posicion_tactica || jug?.posicion || 'MC',
      x: coords.x,
      y: coords.y,
      titular: true
    };
  });

  const suplentesCanchaPropia: JugadorEnCancha[] = convocadosEnBanco.map((c, idx) => {
    const jug = jugadoresMap.get(c.jugador_id);
    return {
      id: c.jugador_id,
      nombre: jug?.nombre || 'Jugador',
      numero: c.numero || jug?.numero || 12 + idx,
      posicion: jug?.posicion || 'SUPL',
      x: 0,
      y: 0,
      titular: false
    };
  });

  // Preparar disposición táctica para el modal (Equipo Rival)
  const presetR = draft.partido.formacion_rival && FORMACIONES_DISPONIBLES[draft.partido.formacion_rival] 
    ? FORMACIONES_DISPONIBLES[draft.partido.formacion_rival] 
    : FORMACIONES_DISPONIBLES['4-3-3'];

  const jugadoresCanchaRival: JugadorEnCancha[] = draft.rivales.map((r, idx) => {
    const coords = r.tactica_x !== undefined && r.tactica_y !== undefined 
      ? { x: r.tactica_x, y: r.tactica_y } 
      : (presetR[idx] || { x: 50, y: 50 });
    return {
      id: String(r.numero),
      nombre: r.nombre ? r.nombre : `Rival #${r.numero}`,
      numero: r.numero,
      posicion: r.posicion_tactica || 'RIV',
      x: coords.x,
      y: coords.y,
      esRival: true
    };
  });

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      
      {/* ========================================================================= */}
      {/* 1. CRONÓMETRO DEPORTIVO & MARCADOR STICKY (MOBILE-FIRST)                  */}
      {/* ========================================================================= */}
      <div className="sticky top-16 z-30 bg-[#0f1712]/95 backdrop-blur-md border border-[#243d2c] rounded-2xl p-4 shadow-2xl">
        
        {/* Marcador En Vivo */}
        <div className="flex items-center justify-between gap-2 border-b border-[#243d2c]/60 pb-3 mb-3">
          
          {/* Equipo Propio */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <span 
              className="text-[11px] font-bold uppercase tracking-wider block truncate"
              style={{ color: colorClub }}
            >
              {nombreClub} ({draft.partido.condicion || 'Local'})
            </span>
            <div className="font-display font-bold text-3xl sm:text-4xl text-white">
              {golesPropio}
            </div>
          </div>

          {/* Estado del Tiempo & Agregado */}
          <div className="flex flex-col items-center justify-center px-3 text-center shrink-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                tiempo === 1 ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-[#ffb703]'
              }`}>
                {tiempo}º Tiempo
              </span>

              {agregadoActualMin > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#e63946]/20 text-[#e63946]">
                  +{agregadoActualMin}'
                </span>
              )}
            </div>

            <div className={`font-display font-bold text-3xl sm:text-4xl tracking-widest ${
              corriendo ? 'text-[#3ddc84]' : 'text-zinc-400'
            }`}>
              {formatTimeDigital(minutosReloj, segundosReloj)}
            </div>

            {tiempoExcedido && (
              <span className="text-[10px] text-[#ffb703] font-semibold animate-pulse">
                +{minutosExcedidos}' Agregado
              </span>
            )}
          </div>

          {/* Equipo Rival */}
          <div className="flex-1 text-center sm:text-right min-w-0">
            <span className="text-[11px] font-bold text-[#ffb703] uppercase tracking-wider block truncate">
              {draft.partido.rival}
            </span>
            <div className="font-display font-bold text-3xl sm:text-4xl text-white">
              {golesRival}
            </div>
          </div>

        </div>

        {/* Botonera de Control del Cronómetro */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Iniciar / Pausar */}
          <button
            id="btn-timer-play-pause"
            onClick={togglePlayPausa}
            className={`flex-1 py-3 px-4 rounded-xl font-display font-bold text-base tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
              corriendo
                ? 'bg-amber-500/20 text-[#ffb703] border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-[#3ddc84] text-[#0f1712] hover:bg-[#2bb46a] shadow-[#3ddc84]/20'
            }`}
          >
            {corriendo ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                PAUSAR
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                INICIAR
              </>
            )}
          </button>

          {/* Tiempo Agregado Sugerido */}
          <button
            id="btn-timer-add-time"
            onClick={() => setModalAgregadoAbierto(true)}
            className="py-3 px-3.5 bg-[#0f1712] border border-[#243d2c] hover:border-[#ffb703]/50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
            title="Ajustar tiempo agregado"
          >
            <Clock className="w-4 h-4 text-[#ffb703]" />
            <span className="hidden sm:inline">Descuento</span>
            <span className="text-[#ffb703]">+{agregadoActualMin}'</span>
          </button>

          {/* Pasar al 2do Tiempo */}
          {tiempo === 1 && (
            <button
              id="btn-timer-next-half"
              onClick={iniciarSegundoTiempo}
              className="py-3 px-3.5 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
            >
              <FastForward className="w-4 h-4 text-[#3ddc84]" />
              <span>2º T</span>
            </button>
          )}

          {/* Finalizar Partido */}
          {tiempo === 2 && (
            <button
              id="btn-timer-finish"
              onClick={() => setModalFinalizarAbierto(true)}
              className="py-3 px-4 bg-[#e63946] hover:bg-[#d92d3b] text-white rounded-xl text-xs font-bold font-display tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-md shadow-[#e63946]/30"
            >
              <Flag className="w-4 h-4" />
              FINALIZAR
            </button>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. BOTONERA TÁCTIL DE INCIDENCIAS (DISEÑADA PARA EL PULGAR EN CANCHA)       */}
      {/* ========================================================================= */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#9aa89f] uppercase tracking-wider">
            Cargar Incidencia Inmediata
          </span>
          <span className="text-[11px] text-[#3ddc84] font-medium">
            Minuto actual: {minutosReloj}'
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          
          {/* GOL */}
          <button
            id="btn-incidencia-gol"
            onClick={() => triggerIncidencia('gol')}
            className="min-h-[58px] p-3 rounded-xl bg-gradient-to-br from-[#243d2c] to-[#182a1f] border border-[#3ddc84]/40 hover:border-[#3ddc84] active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer group shadow-md"
          >
            <span className="text-2xl filter drop-shadow">⚽</span>
            <div className="text-left">
              <span className="font-display font-bold text-base text-[#3ddc84] block leading-tight">
                GOL
              </span>
              <span className="text-[10px] text-[#9aa89f]">Propio o Rival</span>
            </div>
          </button>

          {/* AMARILLA */}
          <button
            id="btn-incidencia-amarilla"
            onClick={() => triggerIncidencia('amarilla')}
            className="min-h-[58px] p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#f4c430]/60 active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-5 h-7 rounded-sm bg-[#f4c430] shadow-sm border border-yellow-200/30 shrink-0" />
            <div className="text-left">
              <span className="font-display font-bold text-sm text-[#f4c430] block leading-tight">
                AMARILLA
              </span>
              <span className="text-[10px] text-[#9aa89f]">Amonestación</span>
            </div>
          </button>

          {/* ROJA DIRECTA */}
          <button
            id="btn-incidencia-roja"
            onClick={() => triggerIncidencia('roja_directa')}
            className="min-h-[58px] p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#e63946]/60 active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-5 h-7 rounded-sm bg-[#e63946] shadow-sm border border-red-300/30 shrink-0" />
            <div className="text-left">
              <span className="font-display font-bold text-sm text-[#e63946] block leading-tight">
                ROJA DIRECTA
              </span>
              <span className="text-[10px] text-[#9aa89f]">Expulsión</span>
            </div>
          </button>

          {/* DOBLE AMARILLA */}
          <button
            id="btn-incidencia-doble-amarilla"
            onClick={() => triggerIncidencia('doble_amarilla')}
            className="min-h-[58px] p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#f4c430]/60 active:scale-[0.98] transition-all flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex -space-x-2 shrink-0">
              <div className="w-4 h-6 rounded-sm bg-[#f4c430] shadow-sm" />
              <div className="w-4 h-6 rounded-sm bg-[#f4c430] shadow-sm" />
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-sm text-[#f4c430] block leading-tight">
                2ª AMARILLA
              </span>
              <span className="text-[10px] text-[#9aa89f]">Doble tarjeta</span>
            </div>
          </button>

          {/* FALTA */}
          <button
            id="btn-incidencia-falta"
            onClick={() => triggerIncidencia('falta')}
            className="min-h-[58px] p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/50 active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer"
          >
            <span className="text-xl">🚫</span>
            <div className="text-left">
              <span className="font-display font-bold text-sm text-white block leading-tight">
                FALTA
              </span>
              <span className="text-[10px] text-[#9aa89f]">Infracción</span>
            </div>
          </button>

          {/* TIRO AL ARCO */}
          <button
            id="btn-incidencia-tiro-arco"
            onClick={() => triggerIncidencia('tiro_arco')}
            className="min-h-[58px] p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/50 active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer"
          >
            <Target className="w-5 h-5 text-[#3ddc84] shrink-0" />
            <div className="text-left">
              <span className="font-display font-bold text-sm text-[#3ddc84] block leading-tight">
                TIRO AL ARCO
              </span>
              <span className="text-[10px] text-[#9aa89f]">Remate a puerta</span>
            </div>
          </button>

          {/* TIRO DESVIADO */}
          <button
            id="btn-incidencia-tiro-desviado"
            onClick={() => triggerIncidencia('tiro')}
            className="min-h-[58px] p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-zinc-500 active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer"
          >
            <span className="text-xl">💨</span>
            <div className="text-left">
              <span className="font-display font-bold text-sm text-zinc-300 block leading-tight">
                TIRO DESVIADO
              </span>
              <span className="text-[10px] text-[#9aa89f]">No fue al arco</span>
            </div>
          </button>

          {/* CÓRNER */}
          <button
            id="btn-incidencia-corner"
            onClick={() => triggerIncidencia('corner')}
            className="min-h-[58px] p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#ffb703]/50 active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer"
          >
            <Flag className="w-5 h-5 text-[#ffb703] shrink-0" />
            <div className="text-left">
              <span className="font-display font-bold text-sm text-white block leading-tight">
                CÓRNER
              </span>
              <span className="text-[10px] text-[#9aa89f]">1 toque (equipo)</span>
            </div>
          </button>

          {/* CAMBIO / SUSTITUCIÓN */}
          <button
            id="btn-incidencia-cambio"
            onClick={() => triggerIncidencia('cambio')}
            className="min-h-[58px] p-3 rounded-xl bg-gradient-to-br from-[#182a1f] to-[#0f1712] border border-[#3ddc84]/40 hover:border-[#3ddc84] active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer"
          >
            <ArrowRightLeft className="w-5 h-5 text-[#3ddc84] shrink-0" />
            <div className="text-left">
              <span className="font-display font-bold text-sm text-[#3ddc84] block leading-tight">
                SUSTITUCIÓN
              </span>
              <span className="text-[10px] text-[#9aa89f]">2 pasos (sale/entra)</span>
            </div>
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LÍNEA DE TIEMPO (TIMELINE) DE INCIDENCIAS                              */}
      {/* ========================================================================= */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#3ddc84]" />
            <h2 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wider">
              Línea de Tiempo del Partido ({incidencias.length})
            </h2>
          </div>

          {incidencias.length > 0 && (
            <button
              onClick={() => handleEliminarIncidencia(incidencias[0].id)}
              className="text-xs font-semibold text-[#e63946] hover:bg-[#e63946]/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Deshacer última
            </button>
          )}
        </div>

        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {incidencias.length > 0 ? (
            incidencias.map((inc) => {
              const jugadorObj = jugadoresMap.get(inc.jugador_id);
              const convocadoObj = draft.convocados.find(c => c.jugador_id === inc.jugador_id);
              const jugadorSecObj = inc.jugador_id_secundario ? jugadoresMap.get(inc.jugador_id_secundario) : null;
              const convocadoSecObj = inc.jugador_id_secundario ? draft.convocados.find(c => c.jugador_id === inc.jugador_id_secundario) : null;
              const asistObj = inc.asistencia_id ? jugadoresMap.get(inc.asistencia_id) : null;
              const convocadoAsist = inc.asistencia_id ? draft.convocados.find(c => c.jugador_id === inc.asistencia_id) : null;
              const rivalObj = draft.rivales.find(r => String(r.numero) === String(inc.jugador_id) || r.id === inc.jugador_id);
              const esPropio = inc.equipo === 'propio';
              const minutoTxt = formatearMinutoIncidencia(inc, duracionReglamentariaMin);

              return (
                <div
                  key={inc.id}
                  className="p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    {/* Minuto del evento */}
                    <div className="w-16 text-center shrink-0">
                      <span className="font-display font-bold text-sm text-[#3ddc84]">
                        {minutoTxt}
                      </span>
                      <span className="text-[10px] text-[#9aa89f] block -mt-1">
                        {inc.tiempo}T
                      </span>
                    </div>

                    {/* Icono del tipo */}
                    <div className="w-8 h-8 rounded-lg bg-[#182a1f] border border-[#243d2c] flex items-center justify-center text-sm shrink-0">
                      {inc.tipo === 'gol' && '⚽'}
                      {inc.tipo === 'autogol' && '🥅'}
                      {inc.tipo === 'amarilla' && <div className="w-3 h-4 bg-[#f4c430] rounded-xs" />}
                      {inc.tipo === 'doble_amarilla' && <div className="w-3 h-4 bg-[#f4c430] rounded-xs border border-red-500" />}
                      {inc.tipo === 'roja_directa' && <div className="w-3 h-4 bg-[#e63946] rounded-xs" />}
                      {inc.tipo === 'falta' && '🚫'}
                      {inc.tipo === 'tiro' && '💨'}
                      {inc.tipo === 'tiro_arco' && '🎯'}
                      {inc.tipo === 'corner' && '🚩'}
                      {inc.tipo === 'cambio' && <ArrowRightLeft className="w-4 h-4 text-[#3ddc84]" />}
                    </div>

                    {/* Detalle descriptivo */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase">
                          {inc.tipo === 'cambio' ? 'Sustitución' : inc.tipo === 'tiro_arco' ? 'Tiro al arco' : inc.tipo === 'tiro' ? 'Tiro desviado' : inc.tipo.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          esPropio ? 'bg-[#3ddc84]/15 text-[#3ddc84]' : 'bg-[#ffb703]/15 text-[#ffb703]'
                        }`}>
                          {esPropio ? nombreClub : draft.partido.rival}
                        </span>
                      </div>

                      <p className="text-xs text-[#9aa89f] mt-0.5">
                        {inc.tipo === 'cambio' ? (
                          <>
                            Sale: <strong className="text-white">#{convocadoObj?.numero || jugadorObj?.numero} {jugadorObj?.nombre || 'Jugador'}</strong> ➔ Entra: <strong className="text-[#3ddc84]">#{convocadoSecObj?.numero || jugadorSecObj?.numero} {jugadorSecObj?.nombre || 'Jugador'}</strong>
                          </>
                        ) : inc.tipo === 'corner' ? (
                          <>Córner para {esPropio ? nombreClub : draft.partido.rival}</>
                        ) : esPropio ? (
                          <>
                            #{convocadoObj?.numero || jugadorObj?.numero} {jugadorObj?.nombre || 'Jugador del plantel'}
                            {asistObj && (
                              <span className="text-[#3ddc84] ml-1">
                                (Asistencia: #{convocadoAsist?.numero || asistObj.numero} {asistObj.nombre})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {rivalObj?.nombre ? (
                              <strong className="text-white">{rivalObj.nombre} (Dorsal #{rivalObj.numero})</strong>
                            ) : (
                              <>Jugador #{rivalObj?.numero || (inc.jugador_id && inc.jugador_id !== 'undefined' ? inc.jugador_id : '')} del rival</>
                            )}
                          </>
                        )}
                        {inc.detalle && ` • ${inc.detalle}`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEliminarIncidencia(inc.id)}
                    className="p-1.5 text-zinc-600 hover:text-[#e63946] transition-colors rounded-lg cursor-pointer"
                    title="Eliminar incidencia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-xs text-[#9aa89f]">
              Aún no hay incidencias registradas en este partido.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL CÓRNER RÁPIDO: SÓLO EQUIPO (SIN JUGADOR)                            */}
      {/* ========================================================================= */}
      {modalCornerAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <button
              onClick={() => setModalCornerAbierto(false)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Flag className="w-5 h-5 text-[#ffb703]" />
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                Registrar Córner
              </h3>
            </div>
            <p className="text-xs text-[#9aa89f] mb-4">
              Minuto: <strong className="text-white">{minutoInfoCongelado?.display || `${minutosReloj}'`}</strong> ({tiempo}T) • ¿Para qué equipo es el tiro de esquina?
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => confirmarGuardadoCorner('propio')}
                className="w-full p-3.5 rounded-xl bg-[#0f1712] border border-[#3ddc84]/50 hover:border-[#3ddc84] hover:bg-[#3ddc84]/10 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <span className="text-2xl">⚽</span>
                <div className="text-left">
                  <span className="font-display font-bold text-sm text-[#3ddc84] block">
                    {nombreClub} (Propio)
                  </span>
                  <span className="text-[11px] text-[#9aa89f]">Córner a favor</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => confirmarGuardadoCorner('rival')}
                className="w-full p-3.5 rounded-xl bg-[#0f1712] border border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/10 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <span className="text-2xl">🛡️</span>
                <div className="text-left">
                  <span className="font-display font-bold text-sm text-[#ffb703] block">
                    {draft.partido.rival} (Rival)
                  </span>
                  <span className="text-[11px] text-[#9aa89f]">Córner del rival</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SELECTOR DE JUGADOR CON DISPOSICIÓN TÁCTICA & ASISTENCIA         */}
      {/* ========================================================================= */}
      {modalIncidenciaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-xl p-4 sm:p-5 shadow-2xl relative max-h-[92vh] flex flex-col">
            
            <button
              onClick={() => setModalIncidenciaAbierto(false)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div className="border-b border-[#243d2c] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {tipoSeleccionado === 'gol' ? '⚽' : tipoSeleccionado === 'tiro_arco' ? '🎯' : tipoSeleccionado === 'tiro' ? '💨' : '⚡'}
                </span>
                <h3 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wide">
                  {tipoSeleccionado === 'cambio'
                    ? (pasoSustitucion === 1 ? 'Sustitución Paso 1: ¿Quién Sale?' : 'Sustitución Paso 2: ¿Quién Entra?')
                    : pasoAsistencia
                    ? '¿Quién dio la Asistencia? (Opcional)'
                    : `Registrar ${tipoSeleccionado === 'tiro_arco' ? 'Tiro al Arco' : tipoSeleccionado === 'tiro' ? 'Tiro Desviado' : tipoSeleccionado?.replace('_', ' ').toUpperCase()}`}
                </h3>
              </div>
              <p className="text-xs text-[#9aa89f] mt-0.5">
                Momento: <strong className="text-white">{minutoInfoCongelado?.display || `${minutoCongelado}'`}</strong> ({tiempo}T)
                {goleadorId && (
                  <span className="text-[#3ddc84] ml-1 font-semibold">
                    • Goleador: #{jugadoresMap.get(goleadorId)?.numero} {jugadoresMap.get(goleadorId)?.nombre}
                  </span>
                )}
              </p>
            </div>

            {/* Toggle Equipo (Propio vs Rival) si no es cambio ni paso de asistencia */}
            {tipoSeleccionado !== 'cambio' && !pasoAsistencia && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setEquipoIncidencia('propio')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    equipoIncidencia === 'propio'
                      ? 'bg-[#3ddc84]/20 border-[#3ddc84] text-[#3ddc84]'
                      : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                  }`}
                >
                  {nombreClub} (Propio)
                </button>
                <button
                  type="button"
                  onClick={() => setEquipoIncidencia('rival')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    equipoIncidencia === 'rival'
                      ? 'bg-amber-500/20 border-amber-500 text-[#ffb703]'
                      : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                  }`}
                >
                  {draft.partido.rival} (Rival)
                </button>
              </div>
            )}

            {/* Selector de modo visual: Cancha Táctica vs Lista */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#9aa89f]">
                {pasoAsistencia 
                  ? 'Tocá el asistidor o elegí gol individual:'
                  : tipoSeleccionado === 'cambio' && pasoSustitucion === 2 
                  ? 'Elegí el suplente que ingresa a la cancha:' 
                  : 'Tocá el jugador en la cancha o en la lista:'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVistaCancha(true)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    vistaCancha ? 'bg-[#3ddc84]/20 border-[#3ddc84] text-[#3ddc84]' : 'bg-[#0f1712] border-[#243d2c] text-zinc-400'
                  }`}
                >
                  ⚽ Cancha Táctica
                </button>
                <button
                  type="button"
                  onClick={() => setVistaCancha(false)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    !vistaCancha ? 'bg-[#3ddc84]/20 border-[#3ddc84] text-[#3ddc84]' : 'bg-[#0f1712] border-[#243d2c] text-zinc-400'
                  }`}
                >
                  📋 Lista
                </button>
              </div>
            </div>

            {/* Si estamos en paso de asistencia, botón para "Sin Asistencia" */}
            {pasoAsistencia && (
              <button
                type="button"
                onClick={() => confirmarGuardadoIncidencia(goleadorId!, undefined, undefined)}
                className="w-full mb-3 py-2 px-3 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>❌ Sin Asistencia / Jugada Individual</span>
              </button>
            )}

            {/* Contenido: Cancha o Lista */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] pr-1">
              {vistaCancha ? (
                // ================= VISTA CANCHA TÁCTICA =================
                <div className="py-1">
                  {equipoIncidencia === 'propio' ? (
                    <TacticaCancha
                      jugadores={
                        tipoSeleccionado === 'cambio' && pasoSustitucion === 2
                          ? suplentesCanchaPropia
                          : pasoAsistencia
                          ? jugadoresCanchaPropia.filter(j => j.id !== goleadorId)
                          : jugadoresCanchaPropia
                      }
                      suplentes={
                        tipoSeleccionado === 'cambio' && pasoSustitucion === 2 
                          ? [] 
                          : suplentesCanchaPropia
                      }
                      mostrarSuplentes={tipoSeleccionado !== 'cambio' || pasoSustitucion === 2}
                      colorEquipo="verde"
                      modoInteractivo={true}
                      onSeleccionarJugador={(idOrObj, obj) => {
                        const targetId = typeof idOrObj === 'object' && idOrObj !== null 
                          ? (idOrObj as any).id 
                          : (obj?.id || String(idOrObj));

                        if (pasoAsistencia) {
                          confirmarGuardadoIncidencia(goleadorId!, undefined, targetId);
                        } else if (tipoSeleccionado === 'gol' && equipoIncidencia === 'propio') {
                          setGoleadorId(targetId);
                          setPasoAsistencia(true);
                        } else if (tipoSeleccionado === 'cambio') {
                          if (pasoSustitucion === 1) {
                            setJugadorSaleId(targetId);
                            setPasoSustitucion(2);
                          } else {
                            confirmarGuardadoIncidencia(jugadorSaleId!, targetId);
                          }
                        } else {
                          confirmarGuardadoIncidencia(targetId);
                        }
                      }}
                      onSeleccionarSuplente={(idOrObj, obj) => {
                        const targetId = typeof idOrObj === 'object' && idOrObj !== null 
                          ? (idOrObj as any).id 
                          : (obj?.id || String(idOrObj));

                        if (pasoAsistencia) {
                          confirmarGuardadoIncidencia(goleadorId!, undefined, targetId);
                        } else if (tipoSeleccionado === 'gol' && equipoIncidencia === 'propio') {
                          setGoleadorId(targetId);
                          setPasoAsistencia(true);
                        } else if (tipoSeleccionado === 'cambio') {
                          if (pasoSustitucion === 1) {
                            setJugadorSaleId(targetId);
                            setPasoSustitucion(2);
                          } else {
                            confirmarGuardadoIncidencia(jugadorSaleId!, targetId);
                          }
                        } else {
                          confirmarGuardadoIncidencia(targetId);
                        }
                      }}
                    />
                  ) : (
                    <TacticaCancha
                      jugadores={jugadoresCanchaRival}
                      colorEquipo="amarillo"
                      modoInteractivo={true}
                      onSeleccionarJugador={(idOrObj, obj) => {
                        const num = typeof idOrObj === 'object' && idOrObj !== null 
                          ? String((idOrObj as any).numero) 
                          : (obj?.numero ? String(obj.numero) : String(idOrObj));
                        confirmarGuardadoIncidencia(num);
                      }}
                      onSeleccionarSuplente={(idOrObj, obj) => {
                        const num = typeof idOrObj === 'object' && idOrObj !== null 
                          ? String((idOrObj as any).numero) 
                          : (obj?.numero ? String(obj.numero) : String(idOrObj));
                        confirmarGuardadoIncidencia(num);
                      }}
                    />
                  )}
                </div>
              ) : (
                // ================= VISTA LISTA TRADICIONAL =================
                <div className="space-y-2">
                  <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa89f]">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={filtroBuscador}
                      onChange={(e) => setFiltroBuscador(e.target.value)}
                      placeholder="Buscar por dorsal o nombre..."
                      className="w-full pl-9 pr-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    {equipoIncidencia === 'propio' ? (
                      (tipoSeleccionado === 'cambio' && pasoSustitucion === 1
                        ? draft.convocados.filter(c => jugadoresEnCanchaIds.has(c.jugador_id))
                        : tipoSeleccionado === 'cambio' && pasoSustitucion === 2
                        ? draft.convocados.filter(c => jugadoresEnBancoIds.has(c.jugador_id) && c.jugador_id !== jugadorSaleId)
                        : pasoAsistencia
                        ? draft.convocados.filter(c => c.jugador_id !== goleadorId)
                        : draft.convocados
                      ).map(c => {
                        const jug = jugadoresMap.get(c.jugador_id);
                        if (!jug) return null;
                        if (
                          filtroBuscador &&
                          !jug.nombre.toLowerCase().includes(filtroBuscador.toLowerCase()) &&
                          !String(c.numero || jug.numero).includes(filtroBuscador)
                        ) {
                          return null;
                        }

                        return (
                          <button
                            key={jug.id}
                            type="button"
                            onClick={() => {
                              if (pasoAsistencia) {
                                confirmarGuardadoIncidencia(goleadorId!, undefined, jug.id);
                              } else if (tipoSeleccionado === 'gol' && equipoIncidencia === 'propio') {
                                setGoleadorId(jug.id);
                                setPasoAsistencia(true);
                              } else if (tipoSeleccionado === 'cambio') {
                                if (pasoSustitucion === 1) {
                                  setJugadorSaleId(jug.id);
                                  setPasoSustitucion(2);
                                  setFiltroBuscador('');
                                } else {
                                  confirmarGuardadoIncidencia(jugadorSaleId!, jug.id);
                                }
                              } else {
                                confirmarGuardadoIncidencia(jug.id);
                              }
                            }}
                            className="w-full p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] hover:bg-[#243d2c]/40 transition-all flex items-center justify-between text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-display font-bold text-base text-[#3ddc84] w-8 h-8 rounded-lg bg-[#182a1f] flex items-center justify-center shrink-0">
                                #{c.numero || jug.numero}
                              </span>
                              <div>
                                <span className="text-xs font-semibold text-white group-hover:text-[#3ddc84] transition-colors block">
                                  {jug.nombre}
                                </span>
                                <span className="text-[10px] text-[#9aa89f]">
                                  {c.posicion_tactica || jug.posicion}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#9aa89f] group-hover:text-white" />
                          </button>
                        );
                      })
                    ) : (
                      draft.rivales
                        .filter(r => 
                          !filtroBuscador || 
                          String(r.numero).includes(filtroBuscador) || 
                          r.nombre.toLowerCase().includes(filtroBuscador.toLowerCase())
                        )
                        .map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => confirmarGuardadoIncidencia(String(r.numero))}
                            className="w-full p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#ffb703] hover:bg-[#243d2c]/40 transition-all flex items-center justify-between text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-display font-bold text-base text-[#ffb703] w-8 h-8 rounded-lg bg-[#182a1f] flex items-center justify-center shrink-0">
                                #{r.numero}
                              </span>
                              <div>
                                <span className="text-xs font-semibold text-white group-hover:text-[#ffb703] transition-colors block">
                                  {r.nombre ? r.nombre : `Rival Dorsal #${r.numero}`}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#9aa89f] group-hover:text-white" />
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Detalle opcional */}
            {tipoSeleccionado !== 'cambio' && !pasoAsistencia && (
              <div className="mt-3 pt-3 border-t border-[#243d2c]">
                <input
                  type="text"
                  value={detalleTexto}
                  onChange={(e) => setDetalleTexto(e.target.value)}
                  placeholder="Detalle opcional (ej: de cabeza, penal, falta táctica)..."
                  className="w-full px-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-xl text-xs text-white focus:outline-none focus:border-[#3ddc84]"
                />
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CARGA DE TIEMPO AGREGADO                                         */}
      {/* ========================================================================= */}
      {modalAgregadoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setModalAgregadoAbierto(false)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-2">
              Tiempo Agregado ({tiempo}º Tiempo)
            </h3>
            <p className="text-xs text-[#9aa89f] mb-4">
              Definí los minutos de descuento que adicionó el árbitro:
            </p>

            {/* Atajos +1, +2, +3, +5 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 2, 3, 5].map(min => (
                <button
                  key={min}
                  type="button"
                  onClick={() => aplicarTiempoAgregado(min)}
                  className="py-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-white font-display font-bold text-base cursor-pointer"
                >
                  +{min}'
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="15"
                value={minutosAgregadoInput}
                onChange={(e) => setMinutosAgregadoInput(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-xl text-center font-display font-bold text-lg text-white"
              />
              <button
                type="button"
                onClick={() => aplicarTiempoAgregado(minutosAgregadoInput)}
                className="px-4 py-2 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold rounded-xl text-sm font-display cursor-pointer"
              >
                APLICAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FINALIZAR PARTIDO                                                */}
      {/* ========================================================================= */}
      {modalFinalizarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-[#e63946]/20 border border-[#e63946]/40 flex items-center justify-center mx-auto mb-3 text-[#e63946]">
              <Flag className="w-7 h-7" />
            </div>

            <h3 className="font-display font-bold text-xl text-white uppercase tracking-wider">
              ¿Finalizar el Partido?
            </h3>

            <p className="text-xs text-[#9aa89f] mt-1 mb-4">
              Se cerrará la planilla con el resultado final y se calcularán los minutos jugados de cada futbolista.
            </p>

            <div className="p-4 rounded-xl bg-[#0f1712] border border-[#243d2c] mb-6">
              <span className="text-xs text-[#9aa89f] block mb-1">Resultado Final</span>
              <div className="font-display font-bold text-3xl text-white">
                {nombreClub} <span className="text-[#3ddc84]">{golesPropio}</span> - <span className="text-[#ffb703]">{golesRival}</span> {draft.partido.rival}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setModalFinalizarAbierto(false)}
                className="px-5 py-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-sm text-[#9aa89f] hover:text-white"
              >
                Continuar Partido
              </button>

              <button
                type="button"
                disabled={finalizando}
                onClick={handleConfirmarFinalizar}
                className="px-6 py-2.5 bg-[#e63946] hover:bg-[#d92d3b] text-white font-bold font-display text-sm tracking-wider rounded-xl shadow-lg shadow-[#e63946]/30 cursor-pointer"
              >
                {finalizando ? 'FINALIZANDO...' : 'CONFIRMAR FINAL'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
