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
  ChevronRight,
  Shirt
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
  MinutoIncidenciaInfo,
  getPosicionBadge
} from '../utils/footballCalculations';
import { TacticaCancha, JugadorEnCancha } from './TacticaCancha';
import { FORMACIONES_DISPONIBLES } from './NuevoPartidoView';

interface PartidoVivoViewProps {
  jugadores: Jugador[];
  onPartidoFinalizado: (partidoId: string) => void;
  onVolver: () => void;
  nombreEquipo?: string;
  colorPropio?: string;
  colorRival?: string;
}

function getContrastingTextColor(hexColor?: string): string {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#0f1712' : '#ffffff';
}

export const PartidoVivoView: React.FC<PartidoVivoViewProps> = ({
  jugadores,
  onPartidoFinalizado,
  onVolver,
  nombreEquipo: propNombreEquipo,
  colorPropio: propColorPropio,
  colorRival: propColorRival
}) => {
  const clubConfig = StorageService.getClubConfig();
  const nombreClub = propNombreEquipo || clubConfig.nombre || StorageService.getNombreEquipo() || 'Los Halcones FC';
  const colorClub = propColorPropio || clubConfig.colorPropio || StorageService.getColorPropio() || '#3ddc84';
  const colorRivalConfig = propColorRival || clubConfig.colorRival || '#e63946';

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

  // Bandera para evitar que los efectos o temporizadores re-guarden el borrador tras finalizar
  const finalizadoRef = useRef(false);

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

  // Modal edición de dorsales en vivo
  const [modalDorsalesAbierto, setModalDorsalesAbierto] = useState(false);
  const [tabDorsales, setTabDorsales] = useState<'propio' | 'rival'>('propio');
  const [busquedaDorsales, setBusquedaDorsales] = useState('');
  const [nuevoRivalNombre, setNuevoRivalNombre] = useState('');
  const [nuevoRivalNumero, setNuevoRivalNumero] = useState<number>(12);

  // Duración reglamentaria
  const duracionReglamentariaMin = draft?.partido.duracion_tiempo_min || 40;
  const segundosReglamentarios = duracionReglamentariaMin * 60;
  const agregadoActualMin = tiempo === 1 ? agregado1T : agregado2T;

  const jugadoresMap = new Map<string, Jugador>(jugadores.map(j => [j.id, j]));

  // Manejador del reloj con requestAnimationFrame y timestamp real para que no se atrase en segundo plano
  const timerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  // Ajustar minutos del reloj manualmente (+1 min / -1 min)
  const ajustarMinutosReloj = (deltaMinutos: number) => {
    setSegundosTotales(prev => Math.max(0, prev + deltaMinutos * 60));
  };

  // Actualizar dorsal propio en vivo
  const handleActualizarDorsalPropio = (jugadorId: string, nuevoNum: number) => {
    if (!draft) return;
    const convocadosActualizados = draft.convocados.map(c => {
      if (c.jugador_id === jugadorId) {
        return { ...c, numero: nuevoNum };
      }
      return c;
    });
    const nuevoDraft = { ...draft, convocados: convocadosActualizados };
    setDraft(nuevoDraft);
    StorageService.savePartidoEnVivo(nuevoDraft);
  };

  // Actualizar dorsal y nombre rival en vivo
  const handleActualizarRival = (rivalId: string, nuevoNum: number, nuevoNombre?: string) => {
    if (!draft) return;
    const rivalesActualizados = draft.rivales.map(r => {
      if (r.id === rivalId || String(r.numero) === rivalId) {
        return { 
          ...r, 
          numero: nuevoNum, 
          nombre: nuevoNombre !== undefined ? nuevoNombre : r.nombre 
        };
      }
      return r;
    });
    const nuevoDraft = { ...draft, rivales: rivalesActualizados };
    setDraft(nuevoDraft);
    StorageService.savePartidoEnVivo(nuevoDraft);
  };

  // Agregar nuevo jugador rival en vivo
  const handleAgregarRivalEnVivo = () => {
    if (!draft) return;
    const nuevoR: RivalJugador = {
      id: 'riv-vivo-' + Date.now(),
      partido_id: draft.partido.id,
      numero: Number(nuevoRivalNumero) || (draft.rivales.length + 1),
      nombre: nuevoRivalNombre.trim() || `Rival #${nuevoRivalNumero || draft.rivales.length + 1}`,
      posicion_tactica: 'RIV',
      titular: false,
      tactica_x: 50,
      tactica_y: 50
    };
    const rivalesActualizados = [...draft.rivales, nuevoR];
    const nuevoDraft = { ...draft, rivales: rivalesActualizados };
    setDraft(nuevoDraft);
    StorageService.savePartidoEnVivo(nuevoDraft);
    setNuevoRivalNombre('');
    setNuevoRivalNumero(draft.rivales.length + 2);
  };

  // Eliminar jugador rival en vivo
  const handleEliminarRivalEnVivo = (rivalId: string) => {
    if (!draft) return;
    const rivalesActualizados = draft.rivales.filter(r => r.id !== rivalId && String(r.numero) !== rivalId);
    const nuevoDraft = { ...draft, rivales: rivalesActualizados };
    setDraft(nuevoDraft);
    StorageService.savePartidoEnVivo(nuevoDraft);
  };

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

  // Persistir estado cada vez que cambia (evitar si el partido ya fue finalizado)
  useEffect(() => {
    if (!draft || finalizadoRef.current) return;
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

    // Si es 2ª amarilla, restringir obligatoriamente al modo Lista
    if (tipo === 'doble_amarilla') {
      setVistaCancha(false);
    } else {
      setVistaCancha(true);
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
    finalizadoRef.current = true;
    setCorriendo(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setFinalizando(true);
    const partidoIdFinalizado = draft.partido.id;
    await ApiService.finalizarPartido(partidoIdFinalizado, agregado1T, agregado2T);
    StorageService.clearPartidoEnVivo();
    setDraft(null);
    setFinalizando(false);
    setModalFinalizarAbierto(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('futbol11-datos-actualizados'));
    }
    onPartidoFinalizado(partidoIdFinalizado);
  };

  // Tarjetas acumuladas y expulsiones
  const amarillasPropias = new Map<string, number>();
  const amarillasRivales = new Map<string, number>();
  const expulsadosPropiosIds = new Set<string>();
  const expulsadosRivalesIds = new Set<string>();

  incidencias.forEach(inc => {
    if (inc.tipo === 'amarilla') {
      if (inc.equipo === 'propio') {
        amarillasPropias.set(inc.jugador_id, (amarillasPropias.get(inc.jugador_id) || 0) + 1);
      } else {
        const idR = String(inc.jugador_id);
        amarillasRivales.set(idR, (amarillasRivales.get(idR) || 0) + 1);
      }
    } else if (inc.tipo === 'doble_amarilla' || inc.tipo === 'roja_directa') {
      if (inc.equipo === 'propio') {
        expulsadosPropiosIds.add(inc.jugador_id);
      } else {
        expulsadosRivalesIds.add(String(inc.jugador_id));
      }
    }
  });

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

  // Los jugadores expulsados DESAPARECEN de la cancha activa
  expulsadosPropiosIds.forEach(id => {
    jugadoresEnCanchaIds.delete(id);
  });

  const jugadoresEnBancoIds = new Set<string>(
    draft.convocados
      .map(c => c.jugador_id)
      .filter(id => !jugadoresEnCanchaIds.has(id) && !expulsadosPropiosIds.has(id))
  );

  // Manejar cambio de esquema táctico en vivo
  const handleCambiarEsquemaEnVivo = (nuevoEsquema: string) => {
    if (!draft || finalizadoRef.current) return;
    const nuevoDraft: PartidoEnVivoDraft = {
      ...draft,
      partido: {
        ...draft.partido,
        formacion_propia: nuevoEsquema
      }
    };
    setDraft(nuevoDraft);
    StorageService.savePartidoEnVivo(nuevoDraft);
    StorageService.savePartido(nuevoDraft.partido);
  };

  // Preparar disposición táctica para el modal (Equipo Propio)
  const formacionPropiaActual = draft.partido.formacion_propia || StorageService.getFormacionPredeterminada() || '4-3-3';
  const presetP = FORMACIONES_DISPONIBLES[formacionPropiaActual] || FORMACIONES_DISPONIBLES['4-3-3'];

  // Mapear sustituciones para que el ingresante herede el slot táctico del saliente
  const sustitutosMap = new Map<string, string>(); // entraId -> saleId
  incidencias.forEach(inc => {
    if (inc.tipo === 'cambio' && inc.equipo === 'propio' && inc.jugador_id && inc.jugador_id_secundario) {
      sustitutosMap.set(inc.jugador_id_secundario, inc.jugador_id);
    }
  });

  const titularesOriginales = draft.convocados.filter(c => c.titular);

  const convocadosEnCancha = draft.convocados.filter(c => jugadoresEnCanchaIds.has(c.jugador_id) && !expulsadosPropiosIds.has(c.jugador_id));
  const convocadosEnBanco = draft.convocados.filter(c => jugadoresEnBancoIds.has(c.jugador_id) && !expulsadosPropiosIds.has(c.jugador_id));

  const jugadoresCanchaPropia: JugadorEnCancha[] = convocadosEnCancha.map((c, idx) => {
    const jug = jugadoresMap.get(c.jugador_id);

    // Encontrar slot táctico (0 a 10) en base a la formación activa
    let slotIdx = titularesOriginales.findIndex(t => t.jugador_id === c.jugador_id);
    if (slotIdx === -1 && sustitutosMap.has(c.jugador_id)) {
      const saleId = sustitutosMap.get(c.jugador_id);
      slotIdx = titularesOriginales.findIndex(t => t.jugador_id === saleId);
    }
    if (slotIdx === -1 || slotIdx >= presetP.length) {
      slotIdx = idx % presetP.length;
    }

    const coords = presetP[slotIdx] || { pos: 'MC', x: 50, y: 50 };

    return {
      id: c.jugador_id,
      nombre: jug?.nombre || 'Jugador',
      numero: c.numero || jug?.numero || idx + 1,
      posicion: coords.pos || c.posicion_tactica || jug?.posicion || 'MC',
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
  const formacionRivalActual = draft.partido.formacion_rival || '4-4-2';
  const presetR = FORMACIONES_DISPONIBLES[formacionRivalActual] || FORMACIONES_DISPONIBLES['4-4-2'];

  const rivalesActivos = draft.rivales.filter(r => 
    !expulsadosRivalesIds.has(String(r.numero)) && !expulsadosRivalesIds.has(r.id)
  );

  const rivalesTitulares = rivalesActivos.filter(r => r.titular !== false);
  const rivalesSuplentes = rivalesActivos.filter(r => r.titular === false);

  const jugadoresCanchaRival: JugadorEnCancha[] = rivalesTitulares.map((r, idx) => {
    const coords = presetR[idx % presetR.length] || { pos: 'RIV', x: 50, y: 50 };
    return {
      id: String(r.numero),
      nombre: r.nombre ? r.nombre : `Rival #${r.numero}`,
      numero: r.numero,
      posicion: coords.pos || r.posicion_tactica || 'RIV',
      x: coords.x,
      y: coords.y,
      esRival: true,
      titular: true
    };
  });

  const suplentesCanchaRival: JugadorEnCancha[] = rivalesSuplentes.map(r => ({
    id: String(r.numero),
    nombre: r.nombre ? r.nombre : `Rival #${r.numero}`,
    numero: r.numero,
    posicion: r.posicion_tactica || 'SUPL',
    x: 0,
    y: 0,
    esRival: true,
    titular: false
  }));

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

            {/* Ajuste Rápido del Reloj (+1 min / -1 min) */}
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <button
                type="button"
                id="btn-timer-minus-one"
                onClick={() => ajustarMinutosReloj(-1)}
                className="px-2 py-0.5 rounded-lg bg-[#182a1f] border border-[#243d2c] hover:border-[#e63946] text-[#9aa89f] hover:text-white text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                title="Restar 1 minuto (-1')"
              >
                -1'
              </button>
              <button
                type="button"
                id="btn-timer-plus-one"
                onClick={() => ajustarMinutosReloj(1)}
                className="px-2 py-0.5 rounded-lg bg-[#182a1f] border border-[#243d2c] hover:border-[#3ddc84] text-[#9aa89f] hover:text-white text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                title="Sumar 1 minuto (+1')"
              >
                +1'
              </button>
            </div>

            {tiempoExcedido && (
              <span className="text-[10px] text-[#ffb703] font-semibold animate-pulse mt-0.5">
                +{minutosExcedidos}' Agregado
              </span>
            )}
          </div>

          {/* Equipo Rival */}
          <div className="flex-1 text-center sm:text-right min-w-0">
            <span 
              className="text-[11px] font-bold uppercase tracking-wider block truncate"
              style={{ color: colorRivalConfig }}
            >
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

          {/* Editar Dorsales en Vivo */}
          <button
            id="btn-timer-edit-dorsales"
            onClick={() => setModalDorsalesAbierto(true)}
            className="py-3 px-3 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/60 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
            title="Editar dorsales y nombres de jugadores"
          >
            <Shirt className="w-4 h-4 text-[#3ddc84]" />
            <span className="hidden sm:inline">Dorsales</span>
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
              <span className="text-[10px] text-[#9aa89f]">{nombreClub} o {draft.partido.rival}</span>
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
                      <span 
                        className="font-display font-bold text-sm"
                        style={{ color: esPropio ? colorClub : colorRivalConfig }}
                      >
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
                      {inc.tipo === 'cambio' && (
                        <ArrowRightLeft 
                          className="w-4 h-4" 
                          style={{ color: esPropio ? colorClub : colorRivalConfig }} 
                        />
                      )}
                    </div>

                    {/* Detalle descriptivo */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase">
                          {inc.tipo === 'cambio' ? 'Sustitución' : inc.tipo === 'tiro_arco' ? 'Tiro al arco' : inc.tipo === 'tiro' ? 'Tiro desviado' : inc.tipo.replace('_', ' ')}
                        </span>
                        <span 
                          style={esPropio 
                            ? { backgroundColor: `${colorClub}26`, color: colorClub, borderColor: `${colorClub}40` }
                            : { backgroundColor: `${colorRivalConfig}26`, color: colorRivalConfig, borderColor: `${colorRivalConfig}40` }
                          }
                          className="text-[10px] px-1.5 py-0.2 rounded font-semibold border"
                        >
                          {esPropio ? nombreClub : draft.partido.rival}
                        </span>
                      </div>

                      <p className="text-xs text-[#9aa89f] mt-0.5">
                        {inc.tipo === 'cambio' ? (
                          <>
                            Sale: <strong className="text-white">#{convocadoObj?.numero || jugadorObj?.numero} {jugadorObj?.nombre || 'Jugador'}</strong> ➔ Entra: <strong style={{ color: colorClub }}>#{convocadoSecObj?.numero || jugadorSecObj?.numero} {jugadorSecObj?.nombre || 'Jugador'}</strong>
                          </>
                        ) : inc.tipo === 'corner' ? (
                          <>Córner para {esPropio ? nombreClub : draft.partido.rival}</>
                        ) : esPropio ? (
                          <>
                            #{convocadoObj?.numero || jugadorObj?.numero} {jugadorObj?.nombre || 'Jugador'}
                            {asistObj && (
                              <span className="ml-1" style={{ color: colorClub }}>
                                (Asistencia: #{convocadoAsist?.numero || asistObj.numero} {asistObj.nombre})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {rivalObj?.nombre ? (
                              <strong className="text-white">#{rivalObj.numero} {rivalObj.nombre}</strong>
                            ) : (
                              <>#{rivalObj?.numero || (inc.jugador_id && inc.jugador_id !== 'undefined' ? inc.jugador_id : '')} {draft.partido.rival}</>
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
                style={{ borderColor: `${colorClub}66` }}
                className="w-full p-3.5 rounded-xl bg-[#0f1712] border hover:opacity-90 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <span className="text-2xl">⚽</span>
                <div className="text-left">
                  <span className="font-display font-bold text-sm block" style={{ color: colorClub }}>
                    {nombreClub}
                  </span>
                  <span className="text-[11px] text-[#9aa89f]">Córner a favor</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => confirmarGuardadoCorner('rival')}
                style={{ borderColor: `${colorRivalConfig}66` }}
                className="w-full p-3.5 rounded-xl bg-[#0f1712] border hover:opacity-90 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <span className="text-2xl">🛡️</span>
                <div className="text-left">
                  <span className="font-display font-bold text-sm block" style={{ color: colorRivalConfig }}>
                    {draft.partido.rival}
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
                  style={equipoIncidencia === 'propio' ? { backgroundColor: `${colorClub}26`, borderColor: colorClub, color: colorClub } : undefined}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    equipoIncidencia === 'propio'
                      ? 'shadow-sm'
                      : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                  }`}
                >
                  {nombreClub}
                </button>
                <button
                  type="button"
                  onClick={() => setEquipoIncidencia('rival')}
                  style={equipoIncidencia === 'rival' ? { backgroundColor: `${colorRivalConfig}26`, borderColor: colorRivalConfig, color: colorRivalConfig } : undefined}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    equipoIncidencia === 'rival'
                      ? 'shadow-sm'
                      : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                  }`}
                >
                  {draft.partido.rival}
                </button>
              </div>
            )}

            {/* Selector de modo visual: Formación vs Lista */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#9aa89f]">
                {tipoSeleccionado === 'doble_amarilla'
                  ? 'Seleccioná el jugador con 1 amarilla previa:'
                  : pasoAsistencia 
                  ? 'Tocá el asistidor o elegí gol individual:'
                  : tipoSeleccionado === 'cambio' && pasoSustitucion === 2 
                  ? 'Elegí el suplente que ingresa a la cancha:' 
                  : 'Tocá el jugador en la cancha o en la lista:'}
              </span>

              {/* Selector Vista Cancha / Vista Lista */}
              {tipoSeleccionado !== 'doble_amarilla' && !(tipoSeleccionado === 'cambio' && pasoSustitucion === 2) ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setVistaCancha(true)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      vistaCancha ? '' : 'bg-[#0f1712] border-[#243d2c] text-zinc-400'
                    }`}
                    style={vistaCancha ? {
                      backgroundColor: `${equipoIncidencia === 'propio' ? colorClub : colorRivalConfig}26`,
                      borderColor: equipoIncidencia === 'propio' ? colorClub : colorRivalConfig,
                      color: equipoIncidencia === 'propio' ? colorClub : colorRivalConfig
                    } : undefined}
                  >
                    ⚽ Formación
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaCancha(false)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      !vistaCancha ? '' : 'bg-[#0f1712] border-[#243d2c] text-zinc-400'
                    }`}
                    style={!vistaCancha ? {
                      backgroundColor: `${equipoIncidencia === 'propio' ? colorClub : colorRivalConfig}26`,
                      borderColor: equipoIncidencia === 'propio' ? colorClub : colorRivalConfig,
                      color: equipoIncidencia === 'propio' ? colorClub : colorRivalConfig
                    } : undefined}
                  >
                    📋 Lista
                  </button>
                </div>
              ) : (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${equipoIncidencia === 'propio' ? colorClub : colorRivalConfig}26`,
                    borderColor: `${equipoIncidencia === 'propio' ? colorClub : colorRivalConfig}40`,
                    color: equipoIncidencia === 'propio' ? colorClub : colorRivalConfig
                  }}
                >
                  {tipoSeleccionado === 'cambio' ? '📋 Selección de Suplente: Formato Lista' : 'Modo Lista Exclusivo'}
                </span>
              )}
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
              {vistaCancha && tipoSeleccionado !== 'doble_amarilla' && !(tipoSeleccionado === 'cambio' && pasoSustitucion === 2) ? (
                // ================= VISTA FORMACIÓN =================
                <div className="py-1">
                  {equipoIncidencia === 'propio' ? (
                    <>
                      {/* Indicador de Táctica y Selector en Vivo */}
                      <div className="flex items-center justify-between bg-[#132319] border border-[#243d2c] rounded-xl px-2.5 py-1.5 mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-zinc-300">Táctica:</span>
                          <span 
                            className="text-xs font-bold font-mono px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: `${colorClub}26`,
                              borderColor: `${colorClub}50`,
                              color: colorClub
                            }}
                          >
                            {formacionPropiaActual}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {Object.keys(FORMACIONES_DISPONIBLES).map(esq => (
                            <button
                              key={esq}
                              type="button"
                              onClick={() => handleCambiarEsquemaEnVivo(esq)}
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                                formacionPropiaActual === esq
                                  ? 'border-transparent'
                                  : 'bg-[#0f1712] text-zinc-400 border-[#243d2c] hover:text-white'
                              }`}
                              style={formacionPropiaActual === esq ? {
                                backgroundColor: colorClub,
                                color: getContrastingTextColor(colorClub)
                              } : undefined}
                              title={`Cambiar a ${esq}`}
                            >
                              {esq}
                            </button>
                          ))}
                        </div>
                      </div>

                      <TacticaCancha
                        titulo={`${nombreClub} (${formacionPropiaActual})`}
                        jugadores={
                          pasoAsistencia
                            ? jugadoresCanchaPropia.filter(j => j.id !== goleadorId)
                            : jugadoresCanchaPropia
                        }
                        suplentes={suplentesCanchaPropia}
                        mostrarSuplentes={tipoSeleccionado !== 'cambio'}
                        colorHex={colorClub}
                        modoInteractivo={true}
                        editableDorsales={true}
                      onEditarNumero={(id, num) => handleActualizarDorsalPropio(id, num)}
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
                            setVistaCancha(false);
                            setFiltroBuscador('');
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
                            setVistaCancha(false);
                            setFiltroBuscador('');
                          } else {
                            confirmarGuardadoIncidencia(jugadorSaleId!, targetId);
                          }
                        } else {
                          confirmarGuardadoIncidencia(targetId);
                        }
                      }}
                    />
                  </>
                  ) : (
                    <TacticaCancha
                      titulo={`Rival: ${draft.partido.rival} (${formacionRivalActual})`}
                      jugadores={jugadoresCanchaRival}
                      suplentes={suplentesCanchaRival}
                      colorHex={colorRivalConfig}
                      modoInteractivo={true}
                      editableDorsales={true}
                      onEditarNumero={(id, num) => handleActualizarRival(id, num)}
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
                      (() => {
                        // Jugadores elegibles para la acción seleccionada
                        let convocadosFiltrados = draft.convocados;

                        if (tipoSeleccionado === 'doble_amarilla') {
                          // Solo jugadores que tengan exactamente 1 amarilla acumulada y no estén expulsados
                          convocadosFiltrados = draft.convocados.filter(c => 
                            amarillasPropias.get(c.jugador_id) === 1 && !expulsadosPropiosIds.has(c.jugador_id)
                          );
                        } else if (tipoSeleccionado === 'cambio' && pasoSustitucion === 1) {
                          convocadosFiltrados = draft.convocados.filter(c => 
                            jugadoresEnCanchaIds.has(c.jugador_id) && !expulsadosPropiosIds.has(c.jugador_id)
                          );
                        } else if (tipoSeleccionado === 'cambio' && pasoSustitucion === 2) {
                          convocadosFiltrados = draft.convocados.filter(c => 
                            jugadoresEnBancoIds.has(c.jugador_id) && c.jugador_id !== jugadorSaleId && !expulsadosPropiosIds.has(c.jugador_id)
                          );
                        } else if (pasoAsistencia) {
                          convocadosFiltrados = draft.convocados.filter(c => 
                            c.jugador_id !== goleadorId && !expulsadosPropiosIds.has(c.jugador_id)
                          );
                        } else {
                          // Cualquier otra acción: excluir expulsados
                          convocadosFiltrados = draft.convocados.filter(c => !expulsadosPropiosIds.has(c.jugador_id));
                        }

                        if (convocadosFiltrados.length === 0) {
                          return (
                            <div className="p-4 rounded-xl bg-[#0f1712] border border-amber-500/30 text-center my-2">
                              <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                              <p className="text-xs text-amber-300 font-semibold">
                                {tipoSeleccionado === 'doble_amarilla' 
                                  ? `Ningún jugador de ${nombreClub} tiene 1 tarjeta amarilla previa para registrar una 2ª amarilla.`
                                  : `No hay jugadores disponibles de ${nombreClub} para esta acción.`}
                              </p>
                              {tipoSeleccionado === 'doble_amarilla' && (
                                <p className="text-[11px] text-[#9aa89f] mt-1">
                                  La 2ª amarilla sólo se puede aplicar a futbolistas que ya cuenten con 1 amonestación previa en el partido.
                                </p>
                              )}
                            </div>
                          );
                        }

                        return convocadosFiltrados.map(c => {
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
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-[#9aa89f]">
                                      {c.posicion_tactica || jug.posicion}
                                    </span>
                                    {amarillasPropias.get(c.jugador_id) === 1 && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                        1ª Amarilla previa
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-[#9aa89f] group-hover:text-white" />
                            </button>
                          );
                        });
                      })()
                    ) : (
                      (() => {
                        let rivalesFiltrados = draft.rivales;

                        if (tipoSeleccionado === 'doble_amarilla') {
                          rivalesFiltrados = draft.rivales.filter(r => 
                            (amarillasRivales.get(String(r.numero)) === 1 || amarillasRivales.get(r.id) === 1) &&
                            !expulsadosRivalesIds.has(String(r.numero)) &&
                            !expulsadosRivalesIds.has(r.id)
                          );
                        } else {
                          rivalesFiltrados = draft.rivales.filter(r => 
                            !expulsadosRivalesIds.has(String(r.numero)) && !expulsadosRivalesIds.has(r.id)
                          );
                        }

                        if (rivalesFiltrados.length === 0) {
                          return (
                            <div className="p-4 rounded-xl bg-[#0f1712] border border-amber-500/30 text-center my-2">
                              <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                              <p className="text-xs text-amber-300 font-semibold">
                                {tipoSeleccionado === 'doble_amarilla'
                                  ? `Ningún jugador de ${draft.partido.rival} tiene 1 tarjeta amarilla previa para registrar una 2ª amarilla.`
                                  : `No hay jugadores rivales disponibles.`}
                              </p>
                              {tipoSeleccionado === 'doble_amarilla' && (
                                <p className="text-[11px] text-[#9aa89f] mt-1">
                                  La 2ª amarilla sólo se puede aplicar a futbolistas que ya cuenten con 1 amonestación previa en el partido.
                                </p>
                              )}
                            </div>
                          );
                        }

                        return rivalesFiltrados
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
                              style={{ borderColor: `${colorRivalConfig}40` }}
                              className="w-full p-2.5 rounded-xl bg-[#0f1712] border hover:opacity-95 transition-all flex items-center justify-between text-left cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5">
                                <span 
                                  style={{ backgroundColor: `${colorRivalConfig}26`, color: colorRivalConfig }}
                                  className="font-display font-bold text-base w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                >
                                  #{r.numero}
                                </span>
                                <div>
                                  <span 
                                    className="text-xs font-semibold text-white transition-colors block"
                                  >
                                    {r.nombre ? r.nombre : `Dorsal #${r.numero}`}
                                  </span>
                                  {(amarillasRivales.get(String(r.numero)) === 1 || amarillasRivales.get(r.id) === 1) && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                      1ª Amarilla previa
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-[#9aa89f] group-hover:text-white" />
                            </button>
                          ));
                      })()
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
      {/* MODAL 2.5: EDICIÓN DE DORSALES Y NOMBRES EN VIVO                          */}
      {/* ========================================================================= */}
      {modalDorsalesAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Botón cerrar */}
            <button
              onClick={() => setModalDorsalesAbierto(false)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Encabezado */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-[#3ddc84]" />
                <h3 className="font-display font-bold text-lg sm:text-xl text-white uppercase tracking-wider">
                  Edición de Dorsales en Vivo
                </h3>
              </div>
              <p className="text-xs text-[#9aa89f] mt-1">
                Editá las camisetas y nombres durante el juego. Los cambios se actualizan automáticamente en el marcador, planilla y cancha táctica.
              </p>
            </div>

            {/* Pestañas: Nuestro Plantel vs Rival */}
            <div className="flex items-center gap-2 mb-3 p-1 bg-[#0f1712] rounded-xl border border-[#243d2c]">
              <button
                type="button"
                onClick={() => setTabDorsales('propio')}
                style={tabDorsales === 'propio' ? { backgroundColor: colorClub, color: getContrastingTextColor(colorClub) } : undefined}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tabDorsales === 'propio'
                    ? 'shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">{nombreClub}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
                  {draft.convocados.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabDorsales('rival')}
                style={tabDorsales === 'rival' ? { backgroundColor: colorRivalConfig, color: getContrastingTextColor(colorRivalConfig) } : undefined}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tabDorsales === 'rival'
                    ? 'shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="truncate">Rival: {draft.partido.rival}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
                  {draft.rivales.length}
                </span>
              </button>
            </div>

            {/* Buscador de jugadores */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={tabDorsales === 'propio' ? "Buscar convocado por nombre o dorsal..." : "Buscar rival por nombre o dorsal..."}
                value={busquedaDorsales}
                onChange={(e) => setBusquedaDorsales(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
              />
              {busquedaDorsales && (
                <button
                  type="button"
                  onClick={() => setBusquedaDorsales('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Contenido según pestaña */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[380px]">
              {tabDorsales === 'propio' ? (
                /* LISTA DE CONVOCADOS PROPIOS */
                (() => {
                  const convocadosFiltrados = draft.convocados.filter(c => {
                    const jug = jugadoresMap.get(c.jugador_id);
                    const q = busquedaDorsales.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (jug?.nombre && jug.nombre.toLowerCase().includes(q)) ||
                      String(c.numero || jug?.numero || '').includes(q)
                    );
                  });

                  if (convocadosFiltrados.length === 0) {
                    return (
                      <div className="text-center py-8 text-zinc-500 text-xs">
                        No se encontraron jugadores que coincidan con la búsqueda.
                      </div>
                    );
                  }

                  return convocadosFiltrados.map((c) => {
                    const jug = jugadoresMap.get(c.jugador_id);
                    const badge = getPosicionBadge(jug?.posicion || 'Mediocampista');
                    const estaEnCancha = jugadoresEnCanchaIds.has(c.jugador_id);
                    const dorsalActual = c.numero !== undefined && c.numero !== null ? c.numero : (jug?.numero || '');

                    return (
                      <div
                        key={c.jugador_id}
                        className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/40 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Input de Dorsal */}
                          <div className="flex items-center gap-1 bg-[#182a1f] px-2 py-1 rounded-lg border border-[#243d2c] shrink-0" title="Editar dorsal">
                            <span className="text-[10px] text-zinc-400 font-bold">#</span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={dorsalActual}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleActualizarDorsalPropio(c.jugador_id, val);
                                }
                              }}
                              className="w-9 bg-transparent text-center font-bold text-sm text-[#3ddc84] focus:outline-none"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-white truncate block">
                              {jug?.nombre || 'Jugador'}
                            </span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Estado */}
                        <div className="shrink-0 text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            estaEnCancha
                              ? 'bg-[#3ddc84]/15 border-[#3ddc84]/40 text-[#3ddc84]'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}>
                            {estaEnCancha ? 'En Cancha' : 'En Banco'}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                /* LISTA DE JUGADORES RIVALES + AGREGAR RIVAL */
                <div className="space-y-3">
                  {/* Formulario rápido para agregar rival */}
                  <div className="p-3 bg-[#0f1712] border border-[#243d2c] rounded-xl">
                    <span 
                      className="text-[11px] font-bold uppercase tracking-wider block mb-2"
                      style={{ color: colorRivalConfig }}
                    >
                      + Agregar Jugador Rival
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-[#182a1f] px-2 py-1.5 rounded-lg border border-[#243d2c] shrink-0">
                        <span className="text-[10px] text-zinc-400 font-bold">#</span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={nuevoRivalNumero}
                          onChange={(e) => setNuevoRivalNumero(parseInt(e.target.value) || 1)}
                          style={{ color: colorRivalConfig }}
                          className="w-8 bg-transparent text-center font-bold text-xs focus:outline-none"
                          placeholder="Num"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Nombre o apodo (ej: Central, Delantero 9...)"
                        value={nuevoRivalNombre}
                        onChange={(e) => setNuevoRivalNombre(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarRivalEnVivo}
                        style={{ backgroundColor: colorRivalConfig, color: getContrastingTextColor(colorRivalConfig) }}
                        className="px-3 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shrink-0 transition-opacity hover:opacity-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista de rivales */}
                  {(() => {
                    const rivalesFiltrados = draft.rivales.filter(r => {
                      const q = busquedaDorsales.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (r.nombre && r.nombre.toLowerCase().includes(q)) ||
                        String(r.numero).includes(q)
                      );
                    });

                    if (rivalesFiltrados.length === 0) {
                      return (
                        <div className="text-center py-6 text-zinc-500 text-xs">
                          No hay jugadores rivales registrados con ese criterio.
                        </div>
                      );
                    }

                    return rivalesFiltrados.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#ffb703]/40 flex items-center justify-between gap-2.5 transition-colors"
                      >
                        {/* Dorsal editable */}
                        <div className="flex items-center gap-1 bg-[#182a1f] px-2 py-1 rounded-lg border border-[#243d2c] shrink-0" title="Editar dorsal rival">
                          <span className="text-[10px] text-zinc-400 font-bold">#</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={r.numero}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                handleActualizarRival(r.id, val, r.nombre);
                              }
                            }}
                            className="w-9 bg-transparent text-center font-bold text-sm focus:outline-none"
                            style={{ color: colorRivalConfig }}
                          />
                        </div>

                        {/* Nombre editable */}
                        <input
                          type="text"
                          value={r.nombre || ''}
                          placeholder={`Rival #${r.numero}`}
                          onChange={(e) => {
                            handleActualizarRival(r.id, r.numero, e.target.value);
                          }}
                          className="flex-1 px-2.5 py-1.5 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs text-white focus:outline-none"
                        />

                        {/* Quitar rival */}
                        <button
                          type="button"
                          onClick={() => handleEliminarRivalEnVivo(r.id)}
                          className="p-1.5 text-zinc-500 hover:text-[#e63946] hover:bg-[#e63946]/10 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar este rival"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="flex items-center justify-end pt-3 mt-3 border-t border-[#243d2c]">
              <button
                type="button"
                onClick={() => setModalDorsalesAbierto(false)}
                className="px-5 py-2 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Listo / Guardado
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
                {nombreClub} <span style={{ color: colorClub }}>{golesPropio}</span> - <span style={{ color: colorRivalConfig }}>{golesRival}</span> {draft.partido.rival}
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
