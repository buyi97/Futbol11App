/**
 * @file PartidoDetalleView.tsx
 * Planilla oficial detallada de un partido disputado:
 * - Marcador final y desglose por tiempos
 * - Tabla de convocados con minutos jugados exactos (calculados con titularidad y cambios)
 * - Línea de tiempo de incidencias del encuentro
 * - Resumen disciplinario y de tiros al arco
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight,
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Trophy, 
  Shield, 
  Target, 
  Flag, 
  ArrowRightLeft,
  Edit3,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  Check,
  X,
  Calculator,
  Copy,
  DollarSign,
  Coins,
  Tag,
  AlertTriangle,
  Shirt,
  UserPlus
} from 'lucide-react';
import { Partido, Jugador, Convocado, RivalJugador, Incidencia, RolUsuario, TipoIncidencia, EquipoIncidencia, Torneo } from '../types';
import { calcularMinutosPartido, getPosicionBadge } from '../utils/footballCalculations';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';

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

interface PartidoDetalleViewProps {
  partido: Partido;
  convocados: Convocado[];
  rivales: RivalJugador[];
  incidencias: Incidencia[];
  jugadores: Jugador[];
  rol?: RolUsuario;
  onActualizarPartido?: () => void;
  onVolver: () => void;
  onEliminarPartido?: () => void;
  nombreEquipo?: string;
  colorPropio?: string;
  colorRival?: string;
}

export const PartidoDetalleView: React.FC<PartidoDetalleViewProps> = ({
  partido,
  convocados,
  rivales,
  incidencias,
  jugadores,
  rol,
  onActualizarPartido,
  onVolver,
  onEliminarPartido,
  nombreEquipo,
  colorPropio,
  colorRival
}) => {
  const esEditor = rol === 'editor';
  const nombreClub = nombreEquipo || StorageService.getNombreEquipo();
  const colorClub = colorPropio || StorageService.getColorPropio() || '#3ddc84';
  const colorRivalElegido = colorRival || StorageService.getColorRival() || '#e63946';

  const [modalEliminarPartido, setModalEliminarPartido] = useState(false);
  const [borrandoPartido, setBorrandoPartido] = useState(false);

  // Estados locales editables para convocados y rivales
  const [convocadosLocales, setConvocadosLocales] = useState<Convocado[]>(() => convocados);
  const [rivalesLocales, setRivalesLocales] = useState<RivalJugador[]>(() => rivales || []);
  const [modalEditarAlineaciones, setModalEditarAlineaciones] = useState(false);
  const [tabAlineaciones, setTabAlineaciones] = useState<'propio' | 'rival'>('propio');
  const [jugadorAConvocarId, setJugadorAConvocarId] = useState('');
  const [nuevoRivalNombre, setNuevoRivalNombre] = useState('');
  const [nuevoRivalNumero, setNuevoRivalNumero] = useState<number>(12);
  const [nuevoRivalTitular, setNuevoRivalTitular] = useState(false);
  const [guardandoAlineaciones, setGuardandoAlineaciones] = useState(false);

  const handleConfirmarEliminarPartido = async () => {
    setBorrandoPartido(true);
    try {
      await ApiService.eliminarPartido(partido.id);
      setModalEliminarPartido(false);
      if (onEliminarPartido) {
        onEliminarPartido();
      } else {
        onVolver();
      }
    } finally {
      setBorrandoPartido(false);
    }
  };

  const [modoEdicion, setModoEdicion] = useState(false);
  const [partidoEditado, setPartidoEditado] = useState<Partido>(partido);
  const [incidenciasLocales, setIncidenciasLocales] = useState<Incidencia[]>(incidencias);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [torneos, setTorneos] = useState<Torneo[]>(() => StorageService.getTorneos());

  useEffect(() => {
    const handleActualizar = () => {
      setTorneos(StorageService.getTorneos());
    };
    window.addEventListener('futbol11-datos-actualizados', handleActualizar);
    return () => {
      window.removeEventListener('futbol11-datos-actualizados', handleActualizar);
    };
  }, []);

  // Modal para agregar incidencia manual
  const [modalNuevaIncidencia, setModalNuevaIncidencia] = useState(false);
  const [nuevaTiempo, setNuevaTiempo] = useState<1 | 2>(1);
  const [nuevaMinuto, setNuevaMinuto] = useState<number>(1);
  const [nuevaTipo, setNuevaTipo] = useState<TipoIncidencia>('gol');
  const [nuevaEquipo, setNuevaEquipo] = useState<EquipoIncidencia>('propio');
  const [nuevaJugadorId, setNuevaJugadorId] = useState<string>('');
  const [nuevaJugadorSecundarioId, setNuevaJugadorSecundarioId] = useState<string>('');
  const [nuevaDetalle, setNuevaDetalle] = useState<string>('');

  // Modal para editar incidencia existente
  const [incidenciaEditando, setIncidenciaEditando] = useState<Incidencia | null>(null);
  const [editTiempo, setEditTiempo] = useState<1 | 2>(1);
  const [editMinuto, setEditMinuto] = useState<number>(1);
  const [editTipo, setEditTipo] = useState<TipoIncidencia>('gol');
  const [editEquipo, setEditEquipo] = useState<EquipoIncidencia>('propio');
  const [editJugadorId, setEditJugadorId] = useState<string>('');
  const [editJugadorSecundarioId, setEditJugadorSecundarioId] = useState<string>('');
  const [editDetalle, setEditDetalle] = useState<string>('');

  // Modal de confirmación para eliminar incidencia
  const [incidenciaAEliminar, setIncidenciaAEliminar] = useState<Incidencia | null>(null);

  // Modal para Calcular Costo del Partido
  const [modalCalcularCosto, setModalCalcularCosto] = useState(false);
  const [costoTotalInput, setCostoTotalInput] = useState<string>('');
  const [modoCalculoCosto, setModoCalculoCosto] = useState<'proporcional' | 'partes_iguales'>('proporcional');
  const [redondearCosto, setRedondearCosto] = useState<boolean>(true);
  const [jugadoresExcluidosCosto, setJugadoresExcluidosCosto] = useState<Set<string>>(new Set());
  const [jugadoresPagaronCosto, setJugadoresPagaronCosto] = useState<Set<string>>(new Set());
  const [copiadoWhatsApp, setCopiadoWhatsApp] = useState(false);

  // Sincronizar estado cuando cambian las props
  useEffect(() => {
    setPartidoEditado(partido);
    setIncidenciasLocales(incidencias);
    setConvocadosLocales(convocados);
    setRivalesLocales(rivales || []);
  }, [partido, incidencias, convocados, rivales]);

  // Handlers para edición de alineaciones y dorsales (Partido terminado)
  const handleToggleTitularPropio = (jugadorId: string) => {
    setConvocadosLocales(prev => prev.map(c => {
      if (c.jugador_id === jugadorId) {
        return { ...c, titular: !c.titular };
      }
      return c;
    }));
  };

  const handleCambiarNumeroPropio = (jugadorId: string, nuevoNumero: number) => {
    setConvocadosLocales(prev => prev.map(c => {
      if (c.jugador_id === jugadorId) {
        return { ...c, numero: nuevoNumero };
      }
      return c;
    }));
  };

  const handleDesconvocarJugador = (jugadorId: string) => {
    setConvocadosLocales(prev => prev.filter(c => c.jugador_id !== jugadorId));
  };

  const handleAgregarConvocado = () => {
    if (!jugadorAConvocarId) return;
    const jug = jugadores.find(j => j.id === jugadorAConvocarId);
    if (!jug) return;
    if (convocadosLocales.some(c => c.jugador_id === jugadorAConvocarId)) return;

    const nuevoConvocado: Convocado = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      partido_id: partidoEditado.id,
      jugador_id: jug.id,
      titular: convocadosLocales.filter(c => c.titular).length < 11,
      numero: jug.numero,
      posicion: jug.posicion
    };

    setConvocadosLocales(prev => [...prev, nuevoConvocado]);
    setJugadorAConvocarId('');
  };

  const handleToggleTitularRival = (rivalId: string) => {
    setRivalesLocales(prev => prev.map(r => {
      if (r.id === rivalId) {
        return { ...r, titular: !r.titular };
      }
      return r;
    }));
  };

  const handleCambiarNumeroRival = (rivalId: string, nuevoNum: number) => {
    setRivalesLocales(prev => prev.map(r => {
      if (r.id === rivalId) {
        return { ...r, numero: nuevoNum };
      }
      return r;
    }));
  };

  const handleCambiarNombreRival = (rivalId: string, nuevoNom: string) => {
    setRivalesLocales(prev => prev.map(r => {
      if (r.id === rivalId) {
        return { ...r, nombre: nuevoNom };
      }
      return r;
    }));
  };

  const handleAgregarJugadorRival = () => {
    if (!nuevoRivalNumero) return;
    const nuevoR: RivalJugador = {
      id: `rival_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      partido_id: partidoEditado.id,
      nombre: nuevoRivalNombre.trim() || `Jugador #${nuevoRivalNumero}`,
      numero: Number(nuevoRivalNumero),
      posicion: 'Rival',
      titular: nuevoRivalTitular
    };
    setRivalesLocales(prev => [...prev, nuevoR]);
    setNuevoRivalNombre('');
    setNuevoRivalNumero(prev => prev + 1);
  };

  const handleEliminarJugadorRival = (rivalId: string) => {
    setRivalesLocales(prev => prev.filter(r => r.id !== rivalId));
  };

  const handleGuardarAlineacionesYDorsales = async () => {
    setGuardandoAlineaciones(true);
    try {
      // 1. Guardar convocados en StorageService
      const todosLosConvocados = StorageService.getConvocados().filter(c => c.partido_id !== partidoEditado.id);
      StorageService.saveConvocados([...todosLosConvocados, ...convocadosLocales]);

      // 2. Guardar rivales en StorageService
      const todosLosRivales = StorageService.getRivales().filter(r => r.partido_id !== partidoEditado.id);
      StorageService.saveRivales([...todosLosRivales, ...rivalesLocales]);

      // 3. Sincronizar con backend si está disponible
      try {
        await ApiService.actualizarPartido(partidoEditado, convocadosLocales, rivalesLocales);
      } catch (err) {
        console.warn('Error al sincronizar alineaciones con el backend:', err);
      }

      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
      setModalEditarAlineaciones(false);

      if (onActualizarPartido) {
        onActualizarPartido();
      }
    } finally {
      setGuardandoAlineaciones(false);
    }
  };

  const detallesMinutos = calcularMinutosPartido(partidoEditado, convocadosLocales, jugadores, incidenciasLocales);
  const duracionTotalMin = (partidoEditado.duracion_tiempo_min || 40) * 2 + (partidoEditado.agregado_1T || 0) + (partidoEditado.agregado_2T || 0);

  // Ordenar incidencias cronológicamente
  const incidenciasCronologicas = [...incidenciasLocales].sort((a, b) => {
    if (a.tiempo !== b.tiempo) return a.tiempo - b.tiempo;
    if (a.minuto !== b.minuto) return a.minuto - b.minuto;
    return a.segundo - b.segundo;
  });

  const jugadoresMap = new Map<string, Jugador>(jugadores.map(j => [j.id, j]));
  const convocadosMap = new Map<string, Convocado>(convocadosLocales.map(c => [c.jugador_id, c]));

  // Incidencias principales para el encabezado (Goles, Tarjetas, Cambios) ordenadas cronológicamente
  const incidenciasPrincipales = React.useMemo(() => {
    return [...incidenciasLocales]
      .filter(i => 
        i.tipo === 'gol' || 
        i.tipo === 'autogol' || 
        i.tipo === 'amarilla' || 
        i.tipo === 'doble_amarilla' || 
        i.tipo === 'roja_directa' || 
        i.tipo === 'cambio'
      )
      .sort((a, b) => {
        const tA = (a.tiempo || 1) * 1000 + (a.minuto || 0);
        const tB = (b.tiempo || 1) * 1000 + (b.minuto || 0);
        return tA - tB;
      });
  }, [incidenciasLocales]);

  const esLocalPropio = partidoEditado.condicion !== 'visitante';
  const esNeutral = partidoEditado.condicion === 'neutral';

  const tituloColumnaLocal = esNeutral 
    ? `${nombreClub} (Neutral)` 
    : esLocalPropio 
    ? `${nombreClub} (Local)` 
    : `${partidoEditado.rival} (Local)`;

  const tituloColumnaVisitante = esNeutral 
    ? `${partidoEditado.rival} (Neutral)` 
    : esLocalPropio 
    ? `${partidoEditado.rival} (Visitante)` 
    : `${nombreClub} (Visitante)`;

  const colorColumnaLocal = (esNeutral || esLocalPropio) ? colorClub : colorRivalElegido;
  const colorColumnaVisitante = (esNeutral || esLocalPropio) ? colorRivalElegido : colorClub;

  const incidenciasLocal = incidenciasPrincipales.filter(i => {
    return (esNeutral || esLocalPropio) ? i.equipo === 'propio' : i.equipo === 'rival';
  });

  const incidenciasVisitante = incidenciasPrincipales.filter(i => {
    return (esNeutral || esLocalPropio) ? i.equipo === 'rival' : i.equipo === 'propio';
  });

  const renderItemIncidenciaEncabezado = (inc: Incidencia) => {
    const esPropio = inc.equipo === 'propio';
    const conv = esPropio ? convocadosMap.get(inc.jugador_id || '') : undefined;
    const jug = esPropio ? jugadoresMap.get(inc.jugador_id || '') : undefined;
    const convSec = esPropio && inc.jugador_id_secundario ? convocadosMap.get(inc.jugador_id_secundario) : undefined;
    const jugSec = esPropio && inc.jugador_id_secundario ? jugadoresMap.get(inc.jugador_id_secundario) : undefined;

    const rivalObj = !esPropio ? rivales.find(r => r.id === inc.jugador_id || String(r.numero) === inc.jugador_id) : undefined;

    let icono = '⚽';
    let textoPrincipal = '';
    let detalleSecundario = '';

    if (inc.tipo === 'gol') {
      icono = '⚽';
      if (esPropio) {
        const num = conv?.numero ?? jug?.numero;
        const nombre = jug?.nombre || 'Jugador';
        textoPrincipal = num ? `#${num} ${nombre}` : nombre;
        if (convSec || jugSec) {
          const numSec = convSec?.numero ?? jugSec?.numero;
          const nomSec = jugSec?.nombre || '';
          detalleSecundario = `Asist: ${numSec ? `#${numSec} ` : ''}${nomSec}`;
        }
      } else {
        if (rivalObj?.nombre) {
          textoPrincipal = `${rivalObj.nombre} (#${rivalObj.numero})`;
        } else {
          textoPrincipal = `Dorsal #${rivalObj?.numero || inc.jugador_id || ''} rival`;
        }
      }
    } else if (inc.tipo === 'autogol') {
      icono = '⚽🥅';
      textoPrincipal = esPropio ? `Autogol #${conv?.numero ?? jug?.numero ?? ''} (e/c)` : 'Autogol rival (e/c)';
    } else if (inc.tipo === 'amarilla') {
      icono = '🟨';
      if (esPropio) {
        const num = conv?.numero ?? jug?.numero;
        textoPrincipal = `${num ? `#${num} ` : ''}${jug?.nombre || 'Jugador'}`;
      } else {
        textoPrincipal = rivalObj?.nombre ? `${rivalObj.nombre} (#${rivalObj.numero})` : `Dorsal #${rivalObj?.numero || inc.jugador_id || ''}`;
      }
    } else if (inc.tipo === 'doble_amarilla') {
      icono = '🟨🟥';
      if (esPropio) {
        const num = conv?.numero ?? jug?.numero;
        textoPrincipal = `${num ? `#${num} ` : ''}${jug?.nombre || 'Jugador'} (Doble Amarilla)`;
      } else {
        textoPrincipal = `${rivalObj?.nombre ? rivalObj.nombre : `Dorsal #${rivalObj?.numero || inc.jugador_id || ''}`} (Doble Amarilla)`;
      }
    } else if (inc.tipo === 'roja_directa') {
      icono = '🟥';
      if (esPropio) {
        const num = conv?.numero ?? jug?.numero;
        textoPrincipal = `${num ? `#${num} ` : ''}${jug?.nombre || 'Jugador'} (Roja Directa)`;
      } else {
        textoPrincipal = `${rivalObj?.nombre ? rivalObj.nombre : `Dorsal #${rivalObj?.numero || inc.jugador_id || ''}`} (Roja Directa)`;
      }
    } else if (inc.tipo === 'cambio') {
      icono = '🔄';
      if (esPropio) {
        const numSale = conv?.numero ?? jug?.numero;
        const nomSale = jug?.nombre || 'Sale';
        const numEntra = convSec?.numero ?? jugSec?.numero;
        const nomEntra = jugSec?.nombre || 'Entra';
        textoPrincipal = `Entra: ${numEntra ? `#${numEntra} ` : ''}${nomEntra}`;
        detalleSecundario = `Sale: ${numSale ? `#${numSale} ` : ''}${nomSale}`;
      } else {
        textoPrincipal = inc.detalle || 'Cambio en equipo rival';
      }
    }

    return (
      <div key={inc.id} className="flex items-start gap-2 py-1.5 px-2.5 rounded-lg bg-[#0f1712]/75 border border-[#243d2c]/70 hover:border-[#3ddc84]/40 transition-colors">
        <span className="font-mono font-bold text-[#3ddc84] text-[11px] shrink-0 mt-0.5 min-w-[42px]">
          {inc.minuto}' <span className="text-[9px] text-zinc-400 font-sans font-semibold">({inc.tiempo || 1}T)</span>
        </span>
        <span className="text-sm shrink-0 mt-0.5">{icono}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-white truncate leading-tight">
            {textoPrincipal}
          </div>
          {detalleSecundario && (
            <div className="text-[10px] text-[#9aa89f] truncate leading-tight mt-0.5">
              {detalleSecundario}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Métricas del partido basadas en las incidencias locales actuales
  const golesPropios = incidenciasLocales.filter(i => (i.tipo === 'gol' && i.equipo === 'propio') || (i.tipo === 'autogol' && i.equipo === 'rival')).length;
  const golesRival = incidenciasLocales.filter(i => (i.tipo === 'gol' && i.equipo === 'rival') || (i.tipo === 'autogol' && i.equipo === 'propio')).length;

  const tirosAlArcoPropios = incidenciasLocales.filter(i => i.equipo === 'propio' && (i.tipo === 'tiro_arco' || i.tipo === 'gol')).length;
  const tirosAlArcoRival = incidenciasLocales.filter(i => i.equipo === 'rival' && (i.tipo === 'tiro_arco' || i.tipo === 'gol')).length;

  const tirosTotalesPropios = incidenciasLocales.filter(i => i.equipo === 'propio' && (i.tipo === 'tiro' || i.tipo === 'tiro_arco' || i.tipo === 'gol')).length;
  const tirosTotalesRival = incidenciasLocales.filter(i => i.equipo === 'rival' && (i.tipo === 'tiro' || i.tipo === 'tiro_arco' || i.tipo === 'gol')).length;

  const amarillasPropias = incidenciasLocales.filter(i => i.equipo === 'propio' && (i.tipo === 'amarilla' || i.tipo === 'doble_amarilla')).length;
  const amarillasRival = incidenciasLocales.filter(i => i.equipo === 'rival' && (i.tipo === 'amarilla' || i.tipo === 'doble_amarilla')).length;

  const rojasPropias = incidenciasLocales.filter(i => i.equipo === 'propio' && (i.tipo === 'roja_directa' || i.tipo === 'doble_amarilla')).length;
  const rojasRival = incidenciasLocales.filter(i => i.equipo === 'rival' && (i.tipo === 'roja_directa' || i.tipo === 'doble_amarilla')).length;

  const cornersPropios = incidenciasLocales.filter(i => i.equipo === 'propio' && i.tipo === 'corner').length;
  const cornersRival = incidenciasLocales.filter(i => i.equipo === 'rival' && i.tipo === 'corner').length;

  const faltasPropias = incidenciasLocales.filter(i => i.equipo === 'propio' && i.tipo === 'falta').length;
  const faltasRival = incidenciasLocales.filter(i => i.equipo === 'rival' && i.tipo === 'falta').length;

  // Recalcular goles desde incidencias
  const recalcularMarcador = () => {
    setPartidoEditado(prev => ({
      ...prev,
      resultado_propio: golesPropios,
      resultado_rival: golesRival
    }));
  };

  // Guardar modificaciones del partido
  const handleGuardarCambios = async () => {
    // 1. Guardar partido
    StorageService.savePartido(partidoEditado);

    // 2. Guardar incidencias actualizadas en el almacenamiento
    const todasLasIncidencias = StorageService.getIncidencias().filter(i => i.partido_id !== partidoEditado.id);
    const nuevasTotales = [...todasLasIncidencias, ...incidenciasLocales];
    StorageService.saveIncidencias(nuevasTotales);

    // 3. Encolar y sincronizar actualización para Google Sheets
    StorageService.agregarAColaSync('crearPartido', partidoEditado);
    try {
      await ApiService.actualizarPartido(partidoEditado);
    } catch (e) {
      console.warn('Error al sincronizar partido modificado con Sheets:', e);
    }

    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 3000);
    setModoEdicion(false);

    if (onActualizarPartido) {
      onActualizarPartido();
    }
  };

  // Eliminar incidencia específica
  const handleEliminarIncidencia = (incId: string) => {
    const incAEliminar = incidenciasLocales.find(i => i.id === incId);
    const actualizadas = incidenciasLocales.filter(i => i.id !== incId);
    setIncidenciasLocales(actualizadas);

    // Si era un gol, actualizar también el marcador en el partido
    let nuevoPropio = partidoEditado.resultado_propio;
    let nuevoRival = partidoEditado.resultado_rival;

    if (incAEliminar) {
      if ((incAEliminar.tipo === 'gol' && incAEliminar.equipo === 'propio') || (incAEliminar.tipo === 'autogol' && incAEliminar.equipo === 'rival')) {
        nuevoPropio = Math.max(0, nuevoPropio - 1);
      } else if ((incAEliminar.tipo === 'gol' && incAEliminar.equipo === 'rival') || (incAEliminar.tipo === 'autogol' && incAEliminar.equipo === 'propio')) {
        nuevoRival = Math.max(0, nuevoRival - 1);
      }
    }

    const partidoActualizado = {
      ...partidoEditado,
      resultado_propio: nuevoPropio,
      resultado_rival: nuevoRival
    };

    setPartidoEditado(partidoActualizado);
    StorageService.savePartido(partidoActualizado);

    const todas = StorageService.getIncidencias().filter(i => i.id !== incId);
    StorageService.saveIncidencias(todas);
    StorageService.agregarAColaSync('eliminarIncidencia', { id: incId });

    if (onActualizarPartido) {
      onActualizarPartido();
    }
  };

  // Agregar una nueva incidencia manual
  const handleGuardarNuevaIncidencia = (e: React.FormEvent) => {
    e.preventDefault();

    const nuevaInc: Incidencia = {
      id: 'inc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      partido_id: partidoEditado.id,
      tiempo: nuevaTiempo,
      minuto: Number(nuevaMinuto),
      segundo: 0,
      minuto_display: `${nuevaMinuto}'`,
      tipo: nuevaTipo,
      equipo: nuevaEquipo,
      jugador_id: nuevaJugadorId || undefined,
      jugador_id_secundario: (nuevaTipo === 'gol' || nuevaTipo === 'cambio') && nuevaJugadorSecundarioId ? nuevaJugadorSecundarioId : undefined,
      asistencia_id: nuevaTipo === 'gol' && nuevaJugadorSecundarioId ? nuevaJugadorSecundarioId : undefined,
      detalle: nuevaDetalle.trim() || undefined,
      created_at: Date.now()
    };

    const nuevasIncidencias = [...incidenciasLocales, nuevaInc];
    setIncidenciasLocales(nuevasIncidencias);

    // Si es gol, actualizar automáticamente el marcador
    let nuevoPropio = partidoEditado.resultado_propio;
    let nuevoRival = partidoEditado.resultado_rival;

    if ((nuevaTipo === 'gol' && nuevaEquipo === 'propio') || (nuevaTipo === 'autogol' && nuevaEquipo === 'rival')) {
      nuevoPropio += 1;
    } else if ((nuevaTipo === 'gol' && nuevaEquipo === 'rival') || (nuevaTipo === 'autogol' && nuevaEquipo === 'propio')) {
      nuevoRival += 1;
    }

    const partidoActualizado = {
      ...partidoEditado,
      resultado_propio: nuevoPropio,
      resultado_rival: nuevoRival
    };

    setPartidoEditado(partidoActualizado);
    StorageService.savePartido(partidoActualizado);
    StorageService.addIncidencia(nuevaInc);
    StorageService.agregarAColaSync('guardarIncidencia', nuevaInc);

    setModalNuevaIncidencia(false);
    setNuevaDetalle('');
    setNuevaJugadorId('');
    setNuevaJugadorSecundarioId('');

    if (onActualizarPartido) {
      onActualizarPartido();
    }
  };

  // Abrir modal de edición para una incidencia
  const handleAbrirEditarIncidencia = (inc: Incidencia) => {
    setIncidenciaEditando(inc);
    setEditTiempo(inc.tiempo);
    setEditMinuto(inc.minuto);
    setEditTipo(inc.tipo);
    setEditEquipo(inc.equipo);
    setEditJugadorId(inc.jugador_id || '');
    setEditJugadorSecundarioId(inc.jugador_id_secundario || inc.asistencia_id || '');
    setEditDetalle(inc.detalle || '');
  };

  // Guardar edición de incidencia
  const handleGuardarEdicionIncidencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidenciaEditando) return;

    const incidenciaActualizada: Incidencia = {
      ...incidenciaEditando,
      tiempo: editTiempo,
      minuto: Number(editMinuto),
      minuto_display: `${editMinuto}'`,
      tipo: editTipo,
      equipo: editEquipo,
      jugador_id: editJugadorId || undefined,
      jugador_id_secundario: (editTipo === 'gol' || editTipo === 'cambio') && editJugadorSecundarioId ? editJugadorSecundarioId : undefined,
      asistencia_id: editTipo === 'gol' && editJugadorSecundarioId ? editJugadorSecundarioId : undefined,
      detalle: editDetalle.trim() || undefined
    };

    const actualizadas = incidenciasLocales.map(i => i.id === incidenciaEditando.id ? incidenciaActualizada : i);
    setIncidenciasLocales(actualizadas);

    // Recalcular goles desde cero con la lista actualizada
    const nuevosGolesPropios = actualizadas.filter(i => (i.tipo === 'gol' && i.equipo === 'propio') || (i.tipo === 'autogol' && i.equipo === 'rival')).length;
    const nuevosGolesRival = actualizadas.filter(i => (i.tipo === 'gol' && i.equipo === 'rival') || (i.tipo === 'autogol' && i.equipo === 'propio')).length;

    const partidoActualizado = {
      ...partidoEditado,
      resultado_propio: nuevosGolesPropios,
      resultado_rival: nuevosGolesRival
    };

    setPartidoEditado(partidoActualizado);
    StorageService.savePartido(partidoActualizado);

    // Guardar incidencias actualizadas
    const todasLasIncidencias = StorageService.getIncidencias().filter(i => i.partido_id !== partidoEditado.id);
    StorageService.saveIncidencias([...todasLasIncidencias, ...actualizadas]);
    StorageService.agregarAColaSync('guardarIncidencia', incidenciaActualizada);

    setIncidenciaEditando(null);

    if (onActualizarPartido) {
      onActualizarPartido();
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Botón Volver y Controles de Edición */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onVolver}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182a1f] border border-[#243d2c] text-xs font-semibold text-[#9aa89f] hover:text-white hover:border-[#3ddc84]/50 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al Historial
        </button>

        {esEditor && (
          <div className="flex items-center gap-2">
            {guardadoExitoso && (
              <span className="text-xs text-[#3ddc84] flex items-center gap-1 font-semibold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                Cambios guardados con éxito
              </span>
            )}

            <button
              onClick={() => setModalEliminarPartido(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f1712] border border-[#e63946]/40 text-[#e63946] hover:bg-[#e63946]/20 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Borrar este partido permanentemente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Borrar Partido
            </button>
            
            <button
              onClick={() => setModoEdicion(!modoEdicion)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm ${
                modoEdicion 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-[#0f1712] text-[#3ddc84] border border-[#243d2c] hover:border-[#3ddc84]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {modoEdicion ? 'Cerrar Edición de Partido' : 'Editar Partido (Rol Editor)'}
            </button>
          </div>
        )}
      </div>

      {/* PANEL DE EDICIÓN DEL PARTIDO (Solo para rol Editor en modo edición) */}
      {esEditor && modoEdicion && (
        <div className="bg-[#182a1f] border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#243d2c] pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              <h3 className="font-display font-bold text-base text-white uppercase tracking-wider">
                Panel de Corrección y Edición del Partido
              </h3>
            </div>
            <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
              Rol Editor
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase flex items-center gap-1">
                <Trophy className="w-3 h-3 text-[#ffb703]" /> Torneo
              </label>
              <select
                value={partidoEditado.torneo_id || ''}
                onChange={e => {
                  const idSel = e.target.value;
                  const tObj = torneos.find(t => t.id === idSel);
                  setPartidoEditado({
                    ...partidoEditado,
                    torneo_id: idSel,
                    torneo_nombre: tObj ? tObj.nombre : (partidoEditado.torneo_nombre || 'Amistosos')
                  });
                }}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              >
                <option value="">-- Sin Torneo / Amistoso --</option>
                {torneos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
                {partidoEditado.torneo_id && !torneos.some(t => t.id === partidoEditado.torneo_id) && (
                  <option value={partidoEditado.torneo_id}>
                    {partidoEditado.torneo_nombre || partidoEditado.torneo_id}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Rival</label>
              <input 
                type="text" 
                value={partidoEditado.rival}
                onChange={e => setPartidoEditado({ ...partidoEditado, rival: e.target.value })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#3ddc84]" /> Instancia
              </label>
              <input 
                type="text" 
                value={partidoEditado.etiqueta || ''}
                onChange={e => setPartidoEditado({ ...partidoEditado, etiqueta: e.target.value })}
                placeholder="Ej: Fecha 1, Semifinal"
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Fecha</label>
              <input 
                type="date" 
                value={partidoEditado.fecha}
                onChange={e => setPartidoEditado({ ...partidoEditado, fecha: e.target.value })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Cancha / Sede</label>
              <input 
                type="text" 
                value={partidoEditado.cancha || ''}
                onChange={e => setPartidoEditado({ ...partidoEditado, cancha: e.target.value })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Condición</label>
              <select
                value={partidoEditado.condicion}
                onChange={e => setPartidoEditado({ ...partidoEditado, condicion: e.target.value as any })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              >
                <option value="local">Local</option>
                <option value="visitante">Visitante</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Goles {nombreClub}</label>
              <input 
                type="number" 
                min={0}
                value={partidoEditado.resultado_propio}
                onChange={e => setPartidoEditado({ ...partidoEditado, resultado_propio: Number(e.target.value) })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-[#3ddc84] font-bold focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Goles Rival</label>
              <input 
                type="number" 
                min={0}
                value={partidoEditado.resultado_rival}
                onChange={e => setPartidoEditado({ ...partidoEditado, resultado_rival: Number(e.target.value) })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-[#ffb703] font-bold focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Agregado 1T (min)</label>
              <input 
                type="number" 
                min={0}
                value={partidoEditado.agregado_1T || 0}
                onChange={e => setPartidoEditado({ ...partidoEditado, agregado_1T: Number(e.target.value) })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#9aa89f] block mb-1 uppercase">Agregado 2T (min)</label>
              <input 
                type="number" 
                min={0}
                value={partidoEditado.agregado_2T || 0}
                onChange={e => setPartidoEditado({ ...partidoEditado, agregado_2T: Number(e.target.value) })}
                className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#243d2c]">
            <button
              type="button"
              onClick={recalcularMarcador}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-xs font-semibold text-[#3ddc84] rounded-lg cursor-pointer transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              Recalcular Marcador ({golesPropios} - {golesRival}) según Incidencias
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalEditarAlineaciones(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#182a1f] border border-[#3ddc84]/50 hover:border-[#3ddc84] text-[#3ddc84] text-xs font-bold rounded-lg cursor-pointer transition-colors shadow"
              >
                <Shirt className="w-3.5 h-3.5" />
                Editar 11 y Dorsales
              </button>
              <button
                type="button"
                onClick={() => {
                  setPartidoEditado(partido);
                  setIncidenciasLocales(incidencias);
                  setModoEdicion(false);
                }}
                className="px-3.5 py-1.5 bg-transparent border border-[#243d2c] text-xs font-semibold text-[#9aa89f] hover:text-white rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarCambios}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#3ddc84] hover:bg-[#32b86e] text-[#0a100d] text-xs font-bold rounded-lg cursor-pointer shadow-md transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Correcciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta de Marcador Principal */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Etiqueta / Torneo Badge */}
        {(partidoEditado.etiqueta || partidoEditado.torneo_nombre) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {partidoEditado.etiqueta && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 inline-flex items-center gap-1.5 shadow-sm">
                <Tag className="w-3.5 h-3.5 text-[#3ddc84]" />
                {partidoEditado.etiqueta}
              </span>
            )}
            {partidoEditado.torneo_nombre && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#ffb703]/15 text-[#ffb703] border border-[#ffb703]/30 inline-flex items-center gap-1.5 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-[#ffb703]" />
                {partidoEditado.torneo_nombre}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Equipo Propio */}
          <div className="text-center md:text-left flex-1">
            <span 
              className="text-xs font-bold uppercase tracking-wider block mb-1"
              style={{ color: colorClub }}
            >
              Equipo propio
            </span>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
              {nombreClub}
            </h2>
          </div>

          {/* Marcador Central */}
          <div className="text-center px-6 py-2 bg-[#0f1712] border border-[#243d2c] rounded-2xl shrink-0">
            <span className="text-[11px] font-semibold text-[#9aa89f] uppercase tracking-wider block mb-1">
              {partidoEditado.estado === 'finalizado' ? 'Resultado Final' : 'Partido en Curso'}
            </span>
            <div className="font-display font-bold text-4xl sm:text-5xl text-white tracking-widest">
              <span style={{ color: colorClub }}>{partidoEditado.resultado_propio}</span>
              <span className="text-[#9aa89f] mx-2">-</span>
              <span style={{ color: colorRivalElegido }}>{partidoEditado.resultado_rival}</span>
            </div>
            <div className="text-[11px] text-[#9aa89f] mt-1">
              1T (+{partidoEditado.agregado_1T || 0}') • 2T (+{partidoEditado.agregado_2T || 0}')
            </div>
          </div>

          {/* Rival */}
          <div className="text-center md:text-right flex-1">
            <span 
              className="text-xs font-bold uppercase tracking-wider block mb-1"
              style={{ color: colorRivalElegido }}
            >
              Equipo Rival
            </span>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
              {partidoEditado.rival}
            </h2>
          </div>

        </div>

        {/* Línea de Tiempo Única y Cronológica de Incidencias Principales */}
        <div className="mt-6 pt-5 border-t border-[#243d2c]">
          {incidenciasPrincipales.length === 0 ? (
            <div className="py-3 text-center text-xs text-[#9aa89f] italic">
              Sin incidencias principales registradas en este encuentro
            </div>
          ) : (
            <div className="relative space-y-2.5 sm:space-y-3 before:hidden sm:before:block sm:before:absolute sm:before:inset-y-0 sm:before:left-1/2 sm:before:-translate-x-1/2 sm:before:w-0.5 sm:before:bg-[#243d2c]">
              {incidenciasPrincipales.map((inc, index) => {
                const esPropio = inc.equipo === 'propio';
                const conv = esPropio ? convocadosMap.get(inc.jugador_id || '') : undefined;
                const jug = esPropio ? jugadoresMap.get(inc.jugador_id || '') : undefined;
                const convSec = esPropio && inc.jugador_id_secundario ? convocadosMap.get(inc.jugador_id_secundario) : undefined;
                const jugSec = esPropio && inc.jugador_id_secundario ? jugadoresMap.get(inc.jugador_id_secundario) : undefined;
                const rivalObj = !esPropio ? rivalesLocales.find(r => r.id === inc.jugador_id || String(r.numero) === inc.jugador_id) : undefined;

                // Detectar si esta incidencia es la primera del 2T y la anterior era del 1T
                const esCambioDeTiempoA2T = inc.tiempo === 2 && (index === 0 || incidenciasPrincipales[index - 1].tiempo === 1);

                let icono = '⚽';
                let textoPrincipal = '';
                let detalleSecundario = '';

                if (inc.tipo === 'gol') {
                  icono = '⚽';
                  if (esPropio) {
                    const num = conv?.numero ?? jug?.numero;
                    const nombre = jug?.nombre || 'Jugador';
                    textoPrincipal = num ? `#${num} ${nombre}` : nombre;
                    if (convSec || jugSec) {
                      const numSec = convSec?.numero ?? jugSec?.numero;
                      const nomSec = jugSec?.nombre || '';
                      detalleSecundario = `Asist: ${numSec ? `#${numSec} ` : ''}${nomSec}`;
                    }
                  } else {
                    if (rivalObj?.nombre) {
                      textoPrincipal = `${rivalObj.nombre} (#${rivalObj.numero})`;
                    } else {
                      textoPrincipal = `Dorsal #${rivalObj?.numero || inc.jugador_id || ''} rival`;
                    }
                  }
                } else if (inc.tipo === 'autogol') {
                  icono = '⚽🥅';
                  textoPrincipal = esPropio ? `Autogol #${conv?.numero ?? jug?.numero ?? ''} (e/c)` : 'Autogol rival (e/c)';
                } else if (inc.tipo === 'amarilla') {
                  icono = '🟨';
                  if (esPropio) {
                    const num = conv?.numero ?? jug?.numero;
                    textoPrincipal = `${num ? `#${num} ` : ''}${jug?.nombre || 'Jugador'}`;
                  } else {
                    textoPrincipal = rivalObj?.nombre ? `${rivalObj.nombre} (#${rivalObj.numero})` : `Dorsal #${rivalObj?.numero || inc.jugador_id || ''}`;
                  }
                } else if (inc.tipo === 'doble_amarilla') {
                  icono = '🟨🟥';
                  if (esPropio) {
                    const num = conv?.numero ?? jug?.numero;
                    textoPrincipal = `${num ? `#${num} ` : ''}${jug?.nombre || 'Jugador'} (Doble Amarilla)`;
                  } else {
                    textoPrincipal = `${rivalObj?.nombre ? rivalObj.nombre : `Dorsal #${rivalObj?.numero || inc.jugador_id || ''}`} (Doble Amarilla)`;
                  }
                } else if (inc.tipo === 'roja_directa') {
                  icono = '🟥';
                  if (esPropio) {
                    const num = conv?.numero ?? jug?.numero;
                    textoPrincipal = `${num ? `#${num} ` : ''}${jug?.nombre || 'Jugador'} (Roja Directa)`;
                  } else {
                    textoPrincipal = `${rivalObj?.nombre ? rivalObj.nombre : `Dorsal #${rivalObj?.numero || inc.jugador_id || ''}`} (Roja Directa)`;
                  }
                } else if (inc.tipo === 'cambio') {
                  icono = '🔄';
                  if (esPropio) {
                    const numSale = conv?.numero ?? jug?.numero;
                    const nomSale = jug?.nombre || 'Sale';
                    const numEntra = convSec?.numero ?? jugSec?.numero;
                    const nomEntra = jugSec?.nombre || 'Entra';
                    textoPrincipal = `Entra: ${numEntra ? `#${numEntra} ` : ''}${nomEntra}`;
                    detalleSecundario = `Sale: ${numSale ? `#${numSale} ` : ''}${nomSale}`;
                  } else {
                    textoPrincipal = inc.detalle || 'Cambio en equipo rival';
                  }
                }

                return (
                  <React.Fragment key={inc.id}>
                    {/* Divisor de Inicio de Segundo Tiempo */}
                    {esCambioDeTiempoA2T && (
                      <div className="relative flex items-center justify-center my-3 sm:my-4 z-10">
                        <div className="px-3 py-1 bg-[#0f1712] border border-[#243d2c] rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest shadow-md flex items-center gap-1.5">
                          <span className="text-[#3ddc84]">⏱️</span>
                          <span>Segundo Tiempo (2T)</span>
                        </div>
                      </div>
                    )}

                    <div
                      className={`flex items-center gap-3 sm:gap-4 w-full ${
                        esPropio ? 'sm:flex-row' : 'sm:flex-row-reverse'
                      }`}
                    >
                      {/* Tarjeta del evento alineada al lado correspondiente */}
                      <div className={`flex-1 ${esPropio ? 'text-left' : 'text-right'}`}>
                        <div
                          className="inline-flex items-center gap-2 py-1.5 px-3 rounded-xl border transition-all bg-[#0f1712]/90 border-[#243d2c]"
                          style={{
                            borderLeftWidth: esPropio ? '3px' : undefined,
                            borderLeftColor: esPropio ? colorClub : undefined,
                            borderRightWidth: !esPropio ? '3px' : undefined,
                            borderRightColor: !esPropio ? colorRivalElegido : undefined,
                          }}
                        >
                          {esPropio && <span className="text-base shrink-0">{icono}</span>}
                          <div className={`min-w-0 ${esPropio ? 'text-left' : 'text-right'}`}>
                            <div className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-[260px]">
                              {textoPrincipal}
                            </div>
                            {detalleSecundario && (
                              <div className="text-[10px] text-[#9aa89f] truncate max-w-[200px] sm:max-w-[260px]">
                                {detalleSecundario}
                              </div>
                            )}
                          </div>
                          {!esPropio && <span className="text-base shrink-0">{icono}</span>}
                        </div>
                      </div>

                      {/* Badge Minuto Central con distinción explícita de 1T o 2T */}
                      <div
                        className="shrink-0 z-10 px-2.5 h-8 rounded-full flex items-center justify-center gap-1 font-mono font-bold text-xs shadow-md border"
                        style={{
                          backgroundColor: '#0f1712',
                          borderColor: esPropio ? colorClub : colorRivalElegido,
                          color: esPropio ? colorClub : colorRivalElegido,
                        }}
                        title={`${inc.minuto}' (${inc.tiempo || 1}T) • ${esPropio ? nombreClub : partidoEditado.rival}`}
                      >
                        <span>{inc.minuto}'</span>
                        <span className="text-[10px] font-sans font-bold opacity-80">
                          ({inc.tiempo || 1}T)
                        </span>
                      </div>

                      {/* Espacio vacío para equilibrar el otro lado en pantallas medianas/grandes */}
                      <div className="hidden sm:block flex-1" />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Metadatos del Encuentro */}
        <div className="mt-6 pt-4 border-t border-[#243d2c] flex flex-wrap items-center justify-center sm:justify-between gap-4 text-xs text-[#9aa89f]">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#3ddc84]" />
            <span>Fecha: <strong className="text-white">{partidoEditado.fecha}</strong></span>
          </div>

          {partidoEditado.cancha && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#ffb703]" />
              <span>Sede: <strong className="text-white">{partidoEditado.cancha}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span>Duración total jugada: <strong className="text-white">{duracionTotalMin} min</strong></span>
          </div>

          {partidoEditado.etiqueta && (
            <div className="flex items-center gap-1.5 text-[#3ddc84]">
              <Tag className="w-4 h-4" />
              <span>Instancia: <strong className="text-white">{partidoEditado.etiqueta}</strong></span>
            </div>
          )}
        </div>

      </div>

      {/* Resumen Comparativo de Estadísticas del Partido */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
        <h3 className="font-display font-bold text-base text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#3ddc84]" />
          Estadísticas del Encuentro
        </h3>

        <div className="space-y-3 max-w-xl mx-auto">
          {/* Tiros al arco */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-white mb-1">
              <span style={{ color: colorClub }}>{tirosAlArcoPropios}</span>
              <span className="text-[#9aa89f]">Tiros al arco</span>
              <span style={{ color: colorRivalElegido }}>{tirosAlArcoRival}</span>
            </div>
            <div className="h-2 rounded-full bg-[#0f1712] overflow-hidden flex">
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorClub,
                  width: `${tirosAlArcoPropios + tirosAlArcoRival > 0 ? (tirosAlArcoPropios / (tirosAlArcoPropios + tirosAlArcoRival)) * 100 : 50}%` 
                }} 
              />
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorRivalElegido,
                  width: `${tirosAlArcoPropios + tirosAlArcoRival > 0 ? (tirosAlArcoRival / (tirosAlArcoPropios + tirosAlArcoRival)) * 100 : 50}%` 
                }} 
              />
            </div>
          </div>

          {/* Tiros Totales */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-white mb-1">
              <span style={{ color: colorClub }}>{tirosTotalesPropios}</span>
              <span className="text-[#9aa89f]">Tiros Totales</span>
              <span style={{ color: colorRivalElegido }}>{tirosTotalesRival}</span>
            </div>
            <div className="h-2 rounded-full bg-[#0f1712] overflow-hidden flex">
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorClub,
                  width: `${tirosTotalesPropios + tirosTotalesRival > 0 ? (tirosTotalesPropios / (tirosTotalesPropios + tirosTotalesRival)) * 100 : 50}%` 
                }} 
              />
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorRivalElegido,
                  width: `${tirosTotalesPropios + tirosTotalesRival > 0 ? (tirosTotalesRival / (tirosTotalesPropios + tirosTotalesRival)) * 100 : 50}%` 
                }} 
              />
            </div>
          </div>

          {/* Corners */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-white mb-1">
              <span style={{ color: colorClub }}>{cornersPropios}</span>
              <span className="text-[#9aa89f]">Corners</span>
              <span style={{ color: colorRivalElegido }}>{cornersRival}</span>
            </div>
            <div className="h-2 rounded-full bg-[#0f1712] overflow-hidden flex">
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorClub,
                  width: `${cornersPropios + cornersRival > 0 ? (cornersPropios / (cornersPropios + cornersRival)) * 100 : 50}%` 
                }} 
              />
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorRivalElegido,
                  width: `${cornersPropios + cornersRival > 0 ? (cornersRival / (cornersPropios + cornersRival)) * 100 : 50}%` 
                }} 
              />
            </div>
          </div>

          {/* Faltas */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-white mb-1">
              <span style={{ color: colorClub }}>{faltasPropias}</span>
              <span className="text-[#9aa89f]">Faltas</span>
              <span style={{ color: colorRivalElegido }}>{faltasRival}</span>
            </div>
            <div className="h-2 rounded-full bg-[#0f1712] overflow-hidden flex">
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorClub,
                  width: `${faltasPropias + faltasRival > 0 ? (faltasPropias / (faltasPropias + faltasRival)) * 100 : 50}%` 
                }} 
              />
              <div 
                className="h-full transition-all" 
                style={{ 
                  backgroundColor: colorRivalElegido,
                  width: `${faltasPropias + faltasRival > 0 ? (faltasRival / (faltasPropias + faltasRival)) * 100 : 50}%` 
                }} 
              />
            </div>
          </div>

          {/* Tarjetas */}
          <div className="flex justify-between items-center text-xs py-1 border-t border-[#243d2c]/60">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[#f4c430] font-bold">
                {amarillasPropias} 🟨
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[#e63946] font-bold">
                {rojasPropias} 🟥
              </span>
            </div>
            <span className="text-[#9aa89f] font-semibold">Tarjetas</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[#f4c430] font-bold">
                {amarillasRival} 🟨
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[#e63946] font-bold">
                {rojasRival} 🟥
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Planilla de Minutos Jugados & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabla de Convocados y Minutos Jugados (2 columnas) */}
        <div className="lg:col-span-2 bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#3ddc84]" />
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                Planilla de Jugadores & Minutos Jugados
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {esEditor && (
                <button
                  type="button"
                  onClick={() => setModalEditarAlineaciones(true)}
                  className="px-3 py-1.5 bg-[#3ddc84]/15 hover:bg-[#3ddc84]/25 border border-[#3ddc84]/40 hover:border-[#3ddc84] text-[#3ddc84] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="Editar 11 inicial, suplentes y dorsales propios y rivales"
                >
                  <Shirt className="w-3.5 h-3.5" />
                  <span>Editar 11 y Dorsales</span>
                </button>
              )}
              <span className="text-xs text-[#9aa89f]">
                {detallesMinutos.length} convocados
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#243d2c] text-[#9aa89f] uppercase tracking-wider text-[10px]">
                  <th className="sticky left-0 z-20 bg-[#182a1f] border-r border-[#243d2c]/80 py-2.5 px-2.5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">Dorsal & Nombre</th>
                  <th className="hidden sm:table-cell py-2.5 px-2">Posición</th>
                  <th className="py-2.5 px-2">Condición</th>
                  <th className="hidden md:table-cell py-2.5 px-2 text-center">Entró / Salió</th>
                  <th className="py-2.5 px-2 text-right">Min.</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right">Aportes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243d2c]/60">
                {detallesMinutos.map((item) => {
                  const badge = getPosicionBadge(item.jugador.posicion);
                  const conv = convocadosMap.get(item.jugador.id);
                  const dorsalMostrar = conv?.numero !== undefined && conv?.numero !== null ? conv.numero : item.jugador.numero;

                  return (
                    <tr key={item.jugador.id} className="hover:bg-[#0f1712]/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-[#182a1f] border-r border-[#243d2c]/80 py-2 px-2.5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-1.5 max-w-[110px] sm:max-w-none">
                          <span className="font-display font-bold text-xs sm:text-sm text-[#3ddc84] shrink-0">
                            #{dorsalMostrar}
                          </span>
                          <span className="font-semibold text-white truncate text-xs">
                            {item.jugador.nombre}
                          </span>
                        </div>
                      </td>

                      <td className="hidden sm:table-cell py-2 px-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-2 px-2">
                        <div className="flex flex-col">
                          <span className={`text-[10px] sm:text-[11px] font-semibold ${
                            item.titular ? 'text-[#3ddc84]' : 'text-[#9aa89f]'
                          }`}>
                            {item.titular ? 'Titular' : 'Suplente'}
                          </span>
                          {item.eventosTrayectoria && item.eventosTrayectoria.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-0.5 md:hidden">
                              {item.eventosTrayectoria.map((ev, idx) => {
                                if (ev.tipo === 'inicio') {
                                  return <span key={idx} className="text-[9px] text-zinc-300 font-semibold">0'</span>;
                                }
                                if (ev.tipo === 'entrada') {
                                  return (
                                    <span key={idx} className="text-[9px] inline-flex items-center gap-0.5">
                                      <ArrowRight className="w-2.5 h-2.5 text-zinc-400" />
                                      <span className="text-[#3ddc84] font-bold">{ev.minuto}'</span>
                                    </span>
                                  );
                                }
                                if (ev.tipo === 'salida') {
                                  return (
                                    <span key={idx} className="text-[9px] inline-flex items-center gap-0.5">
                                      <ArrowLeft className="w-2.5 h-2.5 text-zinc-400" />
                                      <span className="text-[#e63946] font-bold">{ev.minuto}'</span>
                                    </span>
                                  );
                                }
                                if (ev.tipo === 'expulsion') {
                                  return (
                                    <span key={idx} className="text-[9px] inline-flex items-center gap-0.5 text-[#e63946] font-bold">
                                      <span>🟥</span> {ev.minuto}'
                                    </span>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                          {item.fueExpulsado && (!item.eventosTrayectoria || item.eventosTrayectoria.length === 0) && (
                            <span className="text-[9px] text-[#e63946] font-bold md:hidden flex items-center gap-0.5">
                              <span>🟥</span> Exp. {item.minutoSalida || item.minutoExpulsion}'
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="hidden md:table-cell py-2 px-2 text-center text-[11px] text-[#9aa89f]">
                        {item.eventosTrayectoria && item.eventosTrayectoria.length > 0 ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {item.eventosTrayectoria.map((ev, idx) => {
                              if (ev.tipo === 'inicio') {
                                return (
                                  <span key={idx} className="font-semibold text-zinc-300 bg-zinc-800/80 border border-zinc-700 px-1.5 py-0.5 rounded text-[10px]" title="Titular desde el inicio">
                                    0'
                                  </span>
                                );
                              } else if (ev.tipo === 'entrada') {
                                return (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-[#182a1f] border border-[#243d2c] px-1.5 py-0.5 rounded text-[10px]" title={`Ingresó a los ${ev.minuto}'`}>
                                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                                    <span className="font-bold text-[#3ddc84]">{ev.minuto}'</span>
                                  </span>
                                );
                              } else if (ev.tipo === 'salida') {
                                return (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-[#182a1f] border border-[#243d2c] px-1.5 py-0.5 rounded text-[10px]" title={`Salió a los ${ev.minuto}'`}>
                                    <ArrowLeft className="w-3 h-3 text-zinc-400" />
                                    <span className="font-bold text-[#e63946]">{ev.minuto}'</span>
                                  </span>
                                );
                              } else if (ev.tipo === 'expulsion') {
                                return (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-[#e63946]/10 border border-[#e63946]/30 px-1.5 py-0.5 rounded text-[10px]" title={`Expulsado a los ${ev.minuto}'`}>
                                    <span className="text-xs">🟥</span>
                                    <span className="font-bold text-[#e63946]">{ev.minuto}'</span>
                                  </span>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : item.titular ? (
                          <span className="font-semibold text-zinc-300 bg-zinc-800/80 border border-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                            0'
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[10px]">No ingresó</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-right">
                        <span className={`font-display font-bold text-xs sm:text-sm ${
                          item.fueExpulsado ? 'text-[#e63946]' : 'text-white'
                        }`} title={item.fueExpulsado ? `Jugó ${item.minutosJugados}' (descontado por expulsión en ${item.minutoSalida || item.minutoExpulsion}')` : undefined}>
                          {item.minutosJugados}'
                        </span>
                      </td>

                      <td className="py-2 px-2 sm:px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-xs">
                          {item.goles > 0 && (
                            <span className="font-bold text-[#3ddc84]" title={`${item.goles} goles`}>
                              ⚽ {item.goles}
                            </span>
                          )}
                          {item.asistencias > 0 && (
                            <span className="text-[#9aa89f]" title={`${item.asistencias} asistencias`}>
                              👟 {item.asistencias}
                            </span>
                          )}
                          {item.tarjetaAmarilla && (
                            <span title="Amonestado">🟨</span>
                          )}
                          {item.tarjetaRoja && (
                            <span title="Expulsado">🟥</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Botón para Calcular Costo del Partido (Solo Editor/DT) */}
          {esEditor && (
            <div className="mt-4 pt-3.5 border-t border-[#243d2c] flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-[#9aa89f]">
                Repartí los gastos del partido (cancha, árbitro, etc.) proporcionalmente a los minutos jugados.
              </div>
              <button
                type="button"
                onClick={() => setModalCalcularCosto(true)}
                className="px-3.5 py-2 bg-[#3ddc84]/15 hover:bg-[#3ddc84]/25 border border-[#3ddc84]/40 hover:border-[#3ddc84] text-[#3ddc84] rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Calculator className="w-4 h-4" />
                <span>Calcular costo</span>
              </button>
            </div>
          )}
        </div>

        {/* Línea de Tiempo del Partido (1 columna) */}
        <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3ddc84]" />
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                Línea de Tiempo ({incidenciasCronologicas.length})
              </h3>
            </div>

            {esEditor && (
              <button
                type="button"
                onClick={() => setModalNuevaIncidencia(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-[#3ddc84] text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Incidencia
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {incidenciasCronologicas.length > 0 ? (
              incidenciasCronologicas.map((inc) => {
                const jug = jugadoresMap.get(inc.jugador_id || '');
                const convocadoObj = convocados.find(c => c.jugador_id === inc.jugador_id);
                const jugSec = inc.jugador_id_secundario ? jugadoresMap.get(inc.jugador_id_secundario) : null;
                const convocadoSecObj = inc.jugador_id_secundario ? convocados.find(c => c.jugador_id === inc.jugador_id_secundario) : null;
                const asistObj = inc.asistencia_id ? jugadoresMap.get(inc.asistencia_id) : null;
                const convocadoAsist = inc.asistencia_id ? convocados.find(c => c.jugador_id === inc.asistencia_id) : null;
                const rivalObj = rivales?.find(r => String(r.numero) === String(inc.jugador_id) || r.id === inc.jugador_id);
                const esPropio = inc.equipo === 'propio';

                return (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] flex items-start gap-2.5 group hover:border-[#243d2c]/90 transition-all"
                  >
                    <div className="w-10 text-center shrink-0">
                      <span 
                        className="font-display font-bold text-sm"
                        style={{ color: esPropio ? colorClub : colorRivalElegido }}
                      >
                        {inc.minuto}'
                      </span>
                      <span className="text-[10px] text-[#9aa89f] block -mt-1">
                        {inc.tiempo}T
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">
                          {inc.tipo === 'gol' && '⚽'}
                          {inc.tipo === 'autogol' && '🥅'}
                          {inc.tipo === 'amarilla' && '🟨'}
                          {inc.tipo === 'doble_amarilla' && '🟨🟨'}
                          {inc.tipo === 'roja_directa' && '🟥'}
                          {inc.tipo === 'falta' && '🚫'}
                          {inc.tipo === 'tiro' && '💨'}
                          {inc.tipo === 'tiro_arco' && '🎯'}
                          {inc.tipo === 'corner' && '🚩'}
                          {inc.tipo === 'cambio' && '🔄'}
                        </span>
                        <span className="text-xs font-bold text-white uppercase">
                          {inc.tipo === 'cambio' ? 'Cambio' : inc.tipo === 'tiro_arco' ? 'Tiro al Arco' : inc.tipo.replace('_', ' ')}
                        </span>
                        <span 
                          className="text-[9px] font-semibold px-1 rounded"
                          style={{ color: esPropio ? colorClub : colorRivalElegido }}
                        >
                          {esPropio ? nombreClub : (partidoEditado.rival || 'Rival')}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#9aa89f] leading-tight">
                        {inc.tipo === 'cambio' ? (
                          <>
                            Sale: #{convocadoObj?.numero || jug?.numero} {jug?.nombre || 'Jugador'} <br />
                            Entra: #{convocadoSecObj?.numero || jugSec?.numero} {jugSec?.nombre || 'Jugador'}
                          </>
                        ) : inc.tipo === 'corner' ? (
                          <>Córner para {esPropio ? nombreClub : partidoEditado.rival}</>
                        ) : esPropio ? (
                          <>
                            #{convocadoObj?.numero || jug?.numero} {jug?.nombre || 'Jugador del plantel'}
                            {asistObj && (
                              <span className="ml-1" style={{ color: colorClub }}>
                                (Asistencia: #{convocadoAsist?.numero || asistObj.numero} {asistObj.nombre})
                              </span>
                            )}
                            {jugSec && !asistObj && (
                              <span className="ml-1" style={{ color: colorClub }}>
                                (Asistencia: #{convocadoSecObj?.numero || jugSec.numero} {jugSec.nombre})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {rivalObj?.nombre ? (
                              <strong className="text-white">{rivalObj.nombre} (Dorsal #{rivalObj.numero})</strong>
                            ) : (
                              <>Dorsal #{rivalObj?.numero || (inc.jugador_id && inc.jugador_id !== 'undefined' ? inc.jugador_id : '')} rival</>
                            )}
                          </>
                        )}
                        {inc.detalle && ` • ${inc.detalle}`}
                      </p>
                    </div>

                    {/* Botones Editar y Eliminar para el Rol Editor */}
                    {esEditor && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditarIncidencia(inc)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-[#3ddc84] hover:bg-[#3ddc84]/15 transition-colors cursor-pointer"
                          title="Editar esta incidencia"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIncidenciaAEliminar(inc)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-[#e63946] hover:bg-[#e63946]/15 transition-colors cursor-pointer"
                          title="Eliminar esta incidencia"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-[#9aa89f]">
                Sin incidencias registradas en este encuentro.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL PARA AGREGAR INCIDENCIA MANUALMENTE (Rol Editor) */}
      {esEditor && modalNuevaIncidencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setModalNuevaIncidencia(false)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#243d2c]">
              <Plus className="w-5 h-5 text-[#3ddc84]" />
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                Agregar Incidencia Manual
              </h3>
            </div>

            <form onSubmit={handleGuardarNuevaIncidencia} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">Tiempo</label>
                  <select
                    value={nuevaTiempo}
                    onChange={e => setNuevaTiempo(Number(e.target.value) as 1 | 2)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value={1}>1er Tiempo (1T)</option>
                    <option value={2}>2do Tiempo (2T)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">Minuto</label>
                  <input
                    type="number"
                    min={1}
                    max={130}
                    value={nuevaMinuto}
                    onChange={e => setNuevaMinuto(Number(e.target.value))}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">Tipo Incidencia</label>
                  <select
                    value={nuevaTipo}
                    onChange={e => setNuevaTipo(e.target.value as TipoIncidencia)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="gol">Gol ⚽</option>
                    <option value="autogol">Autogol 🥅</option>
                    <option value="tiro_arco">Tiro al Arco 🎯</option>
                    <option value="tiro">Tiro Desviado 💨</option>
                    <option value="falta">Falta 🚫</option>
                    <option value="amarilla">Tarjeta Amarilla 🟨</option>
                    <option value="doble_amarilla">Doble Amarilla 🟨🟨</option>
                    <option value="roja_directa">Roja Directa 🟥</option>
                    <option value="corner">Córner 🚩</option>
                    <option value="cambio">Sustitución / Cambio 🔄</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">Equipo</label>
                  <select
                    value={nuevaEquipo}
                    onChange={e => setNuevaEquipo(e.target.value as EquipoIncidencia)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="propio">{nombreClub}</option>
                    <option value="rival">Rival ({partidoEditado.rival})</option>
                  </select>
                </div>
              </div>

              {/* Selección de Jugador */}
              {nuevaEquipo === 'propio' ? (
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    {nuevaTipo === 'cambio' ? 'Jugador que SALE' : `Jugador ${nombreClub}`}
                  </label>
                  <select
                    value={nuevaJugadorId}
                    onChange={e => setNuevaJugadorId(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                    required={nuevaTipo !== 'corner'}
                  >
                    <option value="">-- Seleccionar jugador --</option>
                    {convocados.map(c => {
                      const j = jugadoresMap.get(c.jugador_id);
                      return (
                        <option key={c.jugador_id} value={c.jugador_id}>
                          #{c.numero || j?.numero} {j?.nombre || 'Jugador ' + c.jugador_id} {c.titular ? '(Titular)' : '(Suplente)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Dorsal / Nombre del Rival
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 9 o Juan Pérez"
                    value={nuevaJugadorId}
                    onChange={e => setNuevaJugadorId(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>
              )}

              {/* Jugador secundario (Asistencia o Cambio Entra) */}
              {nuevaTipo === 'gol' && nuevaEquipo === 'propio' && (
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Asistencia (Opcional)
                  </label>
                  <select
                    value={nuevaJugadorSecundarioId}
                    onChange={e => setNuevaJugadorSecundarioId(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="">Sin Asistencia / Jugada individual</option>
                    {convocados
                      .filter(c => c.jugador_id !== nuevaJugadorId)
                      .map(c => {
                        const j = jugadoresMap.get(c.jugador_id);
                        return (
                          <option key={c.jugador_id} value={c.jugador_id}>
                            #{c.numero || j?.numero} {j?.nombre || 'Jugador'}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              {nuevaTipo === 'cambio' && nuevaEquipo === 'propio' && (
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Jugador que ENTRA
                  </label>
                  <select
                    value={nuevaJugadorSecundarioId}
                    onChange={e => setNuevaJugadorSecundarioId(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                    required
                  >
                    <option value="">-- Seleccionar suplente que entra --</option>
                    {convocados
                      .filter(c => c.jugador_id !== nuevaJugadorId)
                      .map(c => {
                        const j = jugadoresMap.get(c.jugador_id);
                        return (
                          <option key={c.jugador_id} value={c.jugador_id}>
                            #{c.numero || j?.numero} {j?.nombre || 'Jugador'}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                  Detalle / Nota adicional (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Tiro libre al ángulo, penal, mano involuntaria..."
                  value={nuevaDetalle}
                  onChange={e => setNuevaDetalle(e.target.value)}
                  className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#243d2c]">
                <button
                  type="button"
                  onClick={() => setModalNuevaIncidencia(false)}
                  className="px-4 py-2 bg-transparent border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3ddc84] hover:bg-[#32b86e] text-[#0a100d] font-bold rounded-xl cursor-pointer transition-colors shadow-md"
                >
                  Guardar Incidencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminación de Incidencia */}
      {incidenciaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e63946]/20 border border-[#e63946]/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#e63946]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white uppercase tracking-wider">
                  ¿Eliminar Incidencia?
                </h3>
                <p className="text-xs text-[#9aa89f]">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#0f1712] border border-[#243d2c] rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between text-white font-bold uppercase">
                <span>{incidenciaAEliminar.tipo.replace('_', ' ')}</span>
                <span className="text-[#3ddc84]">Minuto {incidenciaAEliminar.minuto_display || `${incidenciaAEliminar.minuto}'`}</span>
              </div>
              <p className="text-[#9aa89f]">
                Equipo: <strong style={{ color: incidenciaAEliminar.equipo === 'propio' ? colorClub : colorRivalElegido }}>
                  {incidenciaAEliminar.equipo === 'propio' ? nombreClub : (partidoEditado.rival || 'Rival')}
                </strong>
              </p>
              {incidenciaAEliminar.tipo === 'gol' && (
                <p className="text-amber-300 text-[11px] font-semibold mt-1">
                  ⚠️ El marcador final del partido se actualizará automáticamente.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#243d2c]">
              <button
                type="button"
                onClick={() => setIncidenciaAEliminar(null)}
                className="px-4 py-2 bg-transparent border border-[#243d2c] text-zinc-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleEliminarIncidencia(incidenciaAEliminar.id);
                  setIncidenciaAEliminar(null);
                }}
                className="px-4 py-2 bg-[#e63946] hover:bg-[#d00000] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Incidencia Existente */}
      {incidenciaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-lg p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#3ddc84]" />
                <h3 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wider">
                  Editar Incidencia
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIncidenciaEditando(null)}
                className="text-[#9aa89f] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicionIncidencia} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Tiempo
                  </label>
                  <select
                    value={editTiempo}
                    onChange={e => setEditTiempo(Number(e.target.value) as 1 | 2)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value={1}>1º Tiempo</option>
                    <option value={2}>2º Tiempo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Minuto (ej: 1 a 90)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={130}
                    required
                    value={editMinuto}
                    onChange={e => setEditMinuto(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Tipo de Jugada
                  </label>
                  <select
                    value={editTipo}
                    onChange={e => setEditTipo(e.target.value as TipoIncidencia)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="gol">⚽ Gol a Favor</option>
                    <option value="autogol">🥅 Autogol</option>
                    <option value="tiro_arco">🎯 Tiro al Arco</option>
                    <option value="tiro">💨 Tiro Fuera / Palo</option>
                    <option value="falta">⚠️ Falta</option>
                    <option value="amarilla">🟨 Tarjeta Amarilla</option>
                    <option value="doble_amarilla">🟨🟥 Doble Amarilla</option>
                    <option value="roja_directa">🟥 Roja Directa</option>
                    <option value="corner">🚩 Córner</option>
                    <option value="cambio">🔄 Sustitución / Cambio</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Equipo
                  </label>
                  <select
                    value={editEquipo}
                    onChange={e => setEditEquipo(e.target.value as EquipoIncidencia)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="propio">⚽ {nombreClub}</option>
                    <option value="rival">🛡️ Equipo Rival</option>
                  </select>
                </div>
              </div>

              {/* Jugador principal */}
              <div>
                <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                  {editTipo === 'cambio' ? 'Jugador que SALE' : 'Jugador Protagonista'}
                </label>
                {editEquipo === 'propio' ? (
                  <select
                    value={editJugadorId}
                    onChange={e => setEditJugadorId(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                    required={editTipo !== 'corner'}
                  >
                    <option value="">-- Seleccionar jugador de {nombreClub} --</option>
                    {convocados.map(c => {
                      const j = jugadoresMap.get(c.jugador_id);
                      return (
                        <option key={c.jugador_id} value={c.jugador_id}>
                          #{c.numero || j?.numero} {j?.nombre || 'Jugador'} ({c.posicion || j?.posicion})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">Dorsal #:</span>
                    <input
                      type="text"
                      placeholder="Ej: 9"
                      value={editJugadorId}
                      onChange={e => setEditJugadorId(e.target.value)}
                      className="w-24 bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                    />
                  </div>
                )}
              </div>

              {/* Asistencia (en goles) */}
              {editTipo === 'gol' && editEquipo === 'propio' && (
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Asistencia de Gol (Opcional)
                  </label>
                  <select
                    value={editJugadorSecundarioId}
                    onChange={e => setEditJugadorSecundarioId(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="">-- Sin asistencia directa --</option>
                    {convocados
                      .filter(c => c.jugador_id !== editJugadorId)
                      .map(c => {
                        const j = jugadoresMap.get(c.jugador_id);
                        return (
                          <option key={c.jugador_id} value={c.jugador_id}>
                            #{c.numero || j?.numero} {j?.nombre || 'Jugador'}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              {/* Jugador que entra (en cambios) */}
              {editTipo === 'cambio' && editEquipo === 'propio' && (
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Jugador que ENTRA
                  </label>
                  <select
                    value={editJugadorSecundarioId}
                    onChange={e => setEditJugadorSecundarioId(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                    required
                  >
                    <option value="">-- Seleccionar suplente que entra --</option>
                    {convocados
                      .filter(c => c.jugador_id !== editJugadorId)
                      .map(c => {
                        const j = jugadoresMap.get(c.jugador_id);
                        return (
                          <option key={c.jugador_id} value={c.jugador_id}>
                            #{c.numero || j?.numero} {j?.nombre || 'Jugador'}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                  Detalle / Nota adicional (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Tiro libre al ángulo, penal, mano involuntaria..."
                  value={editDetalle}
                  onChange={e => setEditDetalle(e.target.value)}
                  className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#243d2c]">
                <button
                  type="button"
                  onClick={() => setIncidenciaEditando(null)}
                  className="px-4 py-2 bg-transparent border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3ddc84] hover:bg-[#32b86e] text-[#0a100d] font-bold rounded-xl cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Actualizar Incidencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación para Eliminar Incidencia */}
      {incidenciaAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#e63946]">
              <div className="w-10 h-10 rounded-xl bg-[#e63946]/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Eliminar Incidencia
                </h3>
                <span className="text-xs text-[#9aa89f]">Minuto {incidenciaAEliminar.minuto}' • {incidenciaAEliminar.tipo.replace('_', ' ')}</span>
              </div>
            </div>

            <p className="text-sm text-[#9aa89f]">
              ¿Estás seguro de que deseas eliminar esta incidencia? Si es un gol, el marcador del partido se recalculará automáticamente.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIncidenciaAEliminar(null)}
                className="px-4 py-2 bg-transparent border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleEliminarIncidencia(incidenciaAEliminar.id);
                  setIncidenciaAEliminar(null);
                }}
                className="px-4 py-2 bg-[#e63946] hover:bg-[#c92a37] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#e63946]/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Borrar Partido Completo */}
      {modalEliminarPartido && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#182a1f] border border-[#e63946]/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#e63946]">
              <div className="w-10 h-10 rounded-xl bg-[#e63946]/10 border border-[#e63946]/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  ¿Borrar este partido?
                </h3>
                <p className="text-xs text-[#9aa89f]">Esta acción eliminará la planilla, convocados y todas las incidencias asociadas.</p>
                <p className="text-[11px] text-[#3ddc84] font-medium mt-0.5">Podrás deshacer esta acción inmediatamente usando el botón flotante.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-xs text-white space-y-1">
              <div><strong className="text-[#9aa89f]">Partido:</strong> {nombreClub} vs {partidoEditado.rival}</div>
              <div><strong className="text-[#9aa89f]">Fecha:</strong> {partidoEditado.fecha}</div>
              {partidoEditado.etiqueta && (
                <div><strong className="text-[#9aa89f]">Etiqueta:</strong> {partidoEditado.etiqueta}</div>
              )}
              <div><strong className="text-[#9aa89f]">Resultado:</strong> {partidoEditado.resultado_propio} - {partidoEditado.resultado_rival}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={borrandoPartido}
                onClick={() => setModalEliminarPartido(false)}
                className="px-4 py-2 bg-[#0f1712] border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={borrandoPartido}
                onClick={handleConfirmarEliminarPartido}
                className="px-4 py-2 bg-[#e63946] hover:bg-[#d92d3b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#e63946]/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {borrandoPartido ? 'Borrando...' : 'Sí, Borrar Partido Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR 11 INICIAL Y DORSALES (PARTIDO TERMINADO)                   */}
      {/* ========================================================================= */}
      {modalEditarAlineaciones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            
            {/* Cerrar */}
            <button
              type="button"
              onClick={() => {
                setConvocadosLocales(convocados);
                setRivalesLocales(rivales || []);
                setModalEditarAlineaciones(false);
              }}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Encabezado */}
            <div className="mb-4 pr-8">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-[#3ddc84]" />
                <h3 className="font-display font-bold text-lg sm:text-xl text-white uppercase tracking-wider">
                  Editar 11 Inicial y Dorsales
                </h3>
              </div>
              <p className="text-xs text-[#9aa89f] mt-1">
                Ajustá los dorsales y la condición de titular o suplente de los jugadores propios y rivales. Los minutos y estadísticas se recalcularán automáticamente.
              </p>
            </div>

            {/* Pestañas: Nuestro Plantel vs Rival */}
            <div className="flex items-center gap-2 mb-4 p-1 bg-[#0f1712] rounded-xl border border-[#243d2c]">
              <button
                type="button"
                onClick={() => setTabAlineaciones('propio')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tabAlineaciones === 'propio'
                    ? 'bg-[#3ddc84] text-[#0f1712] shadow'
                    : 'text-[#9aa89f] hover:text-white'
                }`}
              >
                <span>{nombreClub}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tabAlineaciones === 'propio' ? 'bg-[#0f1712]/20 text-[#0f1712] font-bold' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {convocadosLocales.filter(c => c.titular).length}/11 Titulares
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabAlineaciones('rival')}
                style={tabAlineaciones === 'rival' ? {
                  backgroundColor: colorRivalElegido,
                  color: getContrastingTextColor(colorRivalElegido)
                } : undefined}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tabAlineaciones === 'rival'
                    ? 'shadow'
                    : 'text-[#9aa89f] hover:text-white'
                }`}
              >
                <span>{partidoEditado.rival}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tabAlineaciones === 'rival' ? 'bg-[#0f1712]/20 text-[#0f1712] font-bold' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {rivalesLocales.filter(r => r.titular).length} Titulares
                </span>
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
              {tabAlineaciones === 'propio' ? (
                <div className="space-y-3">
                  {/* Selector para agregar nuevo convocado del plantel */}
                  {jugadores.filter(j => !convocadosLocales.some(c => c.jugador_id === j.id)).length > 0 && (
                    <div className="p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] flex items-center gap-2">
                      <select
                        value={jugadorAConvocarId}
                        onChange={(e) => setJugadorAConvocarId(e.target.value)}
                        className="flex-1 bg-[#182a1f] border border-[#243d2c] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
                      >
                        <option value="">-- Agregar otro jugador del plantel a este partido --</option>
                        {jugadores
                          .filter(j => !convocadosLocales.some(c => c.jugador_id === j.id))
                          .map(j => (
                            <option key={j.id} value={j.id}>
                              #{j.numero} {j.nombre} ({j.posicion})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAgregarConvocado}
                        disabled={!jugadorAConvocarId}
                        className="px-3 py-1.5 bg-[#3ddc84] hover:bg-[#2bb46a] disabled:opacity-40 disabled:hover:bg-[#3ddc84] text-[#0f1712] font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Convocar</span>
                      </button>
                    </div>
                  )}

                  {/* Lista de convocados */}
                  <div className="space-y-2">
                    {convocadosLocales.map((c) => {
                      const jug = jugadoresMap.get(c.jugador_id);
                      const badge = getPosicionBadge(jug?.posicion || 'Mediocampista');
                      const dorsalActual = c.numero !== undefined && c.numero !== null ? c.numero : (jug?.numero || 1);

                      return (
                        <div
                          key={c.jugador_id}
                          className="p-2.5 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/40 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Input de Dorsal */}
                            <div className="flex items-center gap-1 bg-[#182a1f] px-2 py-1 rounded-lg border border-[#243d2c] shrink-0" title="Editar dorsal en este partido">
                              <span className="text-[10px] text-zinc-400 font-bold">#</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={dorsalActual}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) {
                                    handleCambiarNumeroPropio(c.jugador_id, val);
                                  }
                                }}
                                className="w-9 bg-transparent text-center font-bold text-sm text-[#3ddc84] focus:outline-none"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-white truncate block">
                                {jug?.nombre || 'Jugador ' + c.jugador_id}
                              </span>
                              <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>

                          {/* Toggle Titular / Suplente & Desconvocar */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleTitularPropio(c.jugador_id)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                c.titular
                                  ? 'bg-[#3ddc84] text-[#0f1712] shadow-sm'
                                  : 'bg-[#182a1f] text-[#9aa89f] border border-[#243d2c] hover:text-white'
                              }`}
                            >
                              {c.titular ? 'TITULAR' : 'SUPLENTE'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDesconvocarJugador(c.jugador_id)}
                              className="p-1.5 text-zinc-500 hover:text-[#e63946] hover:bg-[#e63946]/10 rounded-lg transition-colors cursor-pointer"
                              title="Quitar de este partido"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Pestaña Rival */
                <div className="space-y-3">
                  {/* Formulario rápido para agregar rival */}
                  <div className="p-3 bg-[#0f1712] border border-[#243d2c] rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-[#ffb703] uppercase tracking-wider block">
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
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setNuevoRivalNumero(parseInt(e.target.value) || 1)}
                          className="w-9 bg-transparent text-center font-bold text-xs text-[#ffb703] focus:outline-none"
                          placeholder="Num"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Nombre o apodo rival (ej: Gómez, 9 de área...)"
                        value={nuevoRivalNombre}
                        onChange={(e) => setNuevoRivalNombre(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ffb703]"
                      />
                      <button
                        type="button"
                        onClick={() => setNuevoRivalTitular(!nuevoRivalTitular)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          nuevoRivalTitular
                            ? 'bg-[#ffb703] text-[#0f1712]'
                            : 'bg-[#182a1f] text-[#9aa89f] border border-[#243d2c]'
                        }`}
                      >
                        {nuevoRivalTitular ? 'Titular' : 'Suplente'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAgregarJugadorRival}
                        className="px-3 py-1.5 bg-[#ffb703] hover:bg-[#e0a200] text-[#0f1712] font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista de rivales */}
                  {rivalesLocales.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-xs">
                      No hay jugadores rivales cargados en este partido. Podés agregarlos arriba con su dorsal y nombre.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rivalesLocales.map((r) => (
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
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleCambiarNumeroRival(r.id, val);
                                }
                              }}
                              className="w-9 bg-transparent text-center font-bold text-sm text-[#ffb703] focus:outline-none"
                            />
                          </div>

                          {/* Nombre editable */}
                          <input
                            type="text"
                            value={r.nombre || ''}
                            placeholder={`Rival #${r.numero}`}
                            onChange={(e) => handleCambiarNombreRival(r.id, e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs text-white focus:outline-none focus:border-[#ffb703]"
                          />

                          {/* Toggle Titular / Suplente Rival */}
                          <button
                            type="button"
                            onClick={() => handleToggleTitularRival(r.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              r.titular
                                ? 'bg-[#ffb703] text-[#0f1712]'
                                : 'bg-[#182a1f] text-[#9aa89f] border border-[#243d2c] hover:text-white'
                            }`}
                          >
                            {r.titular ? 'TITULAR' : 'SUPLENTE'}
                          </button>

                          {/* Quitar rival */}
                          <button
                            type="button"
                            onClick={() => handleEliminarJugadorRival(r.id)}
                            className="p-1.5 text-zinc-500 hover:text-[#e63946] hover:bg-[#e63946]/10 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Eliminar este rival"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pie del modal */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#243d2c]">
              <button
                type="button"
                onClick={() => {
                  setConvocadosLocales(convocados);
                  setRivalesLocales(rivales || []);
                  setModalEditarAlineaciones(false);
                }}
                className="px-4 py-2 bg-transparent border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={guardandoAlineaciones}
                onClick={handleGuardarAlineacionesYDorsales}
                className="px-5 py-2 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#3ddc84]/20"
              >
                <Save className="w-4 h-4" />
                <span>{guardandoAlineaciones ? 'Guardando...' : 'Guardar 11 y Dorsales'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Calcular Costo del Partido */}
      {modalCalcularCosto && (() => {
        const costoTotalNumerico = Math.max(0, parseFloat(costoTotalInput) || 0);

        const jugadoresCostoCalculados = detallesMinutos.map(item => {
          const conv = convocadosMap.get(item.jugador.id);
          const dorsalMostrar = conv?.numero !== undefined && conv?.numero !== null ? conv.numero : item.jugador.numero;
          const estaExcluido = jugadoresExcluidosCosto.has(item.jugador.id);
          const yaPago = jugadoresPagaronCosto.has(item.jugador.id);
          const minutos = item.minutosJugados || 0;
          return {
            ...item,
            dorsalMostrar,
            estaExcluido,
            yaPago,
            minutos,
          };
        });

        const jugadoresParticipantes = jugadoresCostoCalculados.filter(j => !j.estaExcluido);
        const totalMinutosParticipantes = jugadoresParticipantes.reduce((sum, j) => sum + j.minutos, 0);
        const cantidadConMinutos = jugadoresParticipantes.filter(j => j.minutos > 0).length || 1;

        const jugadoresConCuota = jugadoresCostoCalculados.map(j => {
          let cuotaExacta = 0;
          if (!j.estaExcluido && costoTotalNumerico > 0) {
            if (modoCalculoCosto === 'proporcional') {
              cuotaExacta = totalMinutosParticipantes > 0 ? (j.minutos / totalMinutosParticipantes) * costoTotalNumerico : 0;
            } else {
              cuotaExacta = j.minutos > 0 ? costoTotalNumerico / cantidadConMinutos : 0;
            }
          }
          const cuotaFinal = redondearCosto ? Math.round(cuotaExacta / 50) * 50 : Math.round(cuotaExacta);
          const porcentaje = totalMinutosParticipantes > 0 && !j.estaExcluido ? ((j.minutos / totalMinutosParticipantes) * 100).toFixed(1) : '0';
          return {
            ...j,
            cuotaExacta,
            cuotaFinal,
            porcentaje
          };
        });

        const totalRecaudado = jugadoresConCuota
          .filter(j => !j.estaExcluido && j.yaPago)
          .reduce((sum, j) => sum + j.cuotaFinal, 0);

        const totalPendiente = Math.max(0, costoTotalNumerico - totalRecaudado);

        const handleToggleExcluir = (id: string) => {
          setJugadoresExcluidosCosto(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        };

        const handleTogglePago = (id: string) => {
          setJugadoresPagaronCosto(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        };

        const handleCopiarWhatsApp = () => {
          const lineas = [
            `⚽ *REPARTO DE COSTOS - ${nombreClub} vs ${partidoEditado.rival}*`,
            `📅 Fecha: ${partidoEditado.fecha}`,
            `💰 *Costo Total:* $${costoTotalNumerico.toLocaleString('es-AR')}`,
            `📊 *Criterio:* ${modoCalculoCosto === 'proporcional' ? 'Proporcional a minutos jugados (con descuentos por cambios y expulsiones)' : 'Partes iguales entre los que jugaron'}`,
            '',
            `📋 *DETALLE POR JUGADOR:*`,
            ...jugadoresConCuota
              .filter(j => !j.estaExcluido && j.cuotaFinal > 0)
              .map(j => `• #${j.dorsalMostrar} ${j.jugador.nombre}: *$${j.cuotaFinal.toLocaleString('es-AR')}* (${j.minutos}' jugados${j.fueExpulsado ? ' - 🟥 Exp.' : ''})${j.yaPago ? ' ✅ PAGADO' : ''}`),
            ''
          ];

          if (totalRecaudado > 0) {
            lineas.push(`💳 *Recaudado:* $${totalRecaudado.toLocaleString('es-AR')} | *Pendiente:* $${totalPendiente.toLocaleString('es-AR')}`);
          }

          const texto = lineas.join('\n');
          navigator.clipboard.writeText(texto).then(() => {
            setCopiadoWhatsApp(true);
            setTimeout(() => setCopiadoWhatsApp(false), 2500);
          });
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col">
              
              {/* Encabezado */}
              <div className="flex items-center justify-between pb-3 border-b border-[#243d2c]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#3ddc84]/15 text-[#3ddc84]">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">
                      Calcular Costo del Partido
                    </h3>
                    <p className="text-xs text-[#9aa89f]">
                      {nombreClub} vs {partidoEditado.rival} • {partidoEditado.fecha}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCalcularCosto(false)}
                  className="p-1.5 rounded-lg text-[#9aa89f] hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel de Entradas de Configuración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0f1712] p-3.5 rounded-xl border border-[#243d2c]">
                <div>
                  <label className="block text-xs font-semibold text-[#9aa89f] mb-1">
                    Costo Total del Partido ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#3ddc84]">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={costoTotalInput}
                      onChange={(e) => setCostoTotalInput(e.target.value)}
                      placeholder="Ej: 50000"
                      className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl pl-7 pr-3 py-2 text-white font-display font-bold text-sm focus:outline-none focus:border-[#3ddc84]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9aa89f] mb-1">
                    Método de División
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#182a1f] border border-[#243d2c] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setModoCalculoCosto('proporcional')}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        modoCalculoCosto === 'proporcional'
                          ? 'bg-[#3ddc84] text-[#0f1712] shadow'
                          : 'text-[#9aa89f] hover:text-white'
                      }`}
                    >
                      Por minutos
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoCalculoCosto('partes_iguales')}
                      className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        modoCalculoCosto === 'partes_iguales'
                          ? 'bg-[#3ddc84] text-[#0f1712] shadow'
                          : 'text-[#9aa89f] hover:text-white'
                      }`}
                    >
                      Partes iguales
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={redondearCosto}
                      onChange={(e) => setRedondearCosto(e.target.checked)}
                      className="rounded border-[#243d2c] text-[#3ddc84] focus:ring-0 cursor-pointer"
                    />
                    <span>Redondear cuotas a múltiplos de $50</span>
                  </label>
                  <span className="text-[11px] text-[#9aa89f]">
                    {totalMinutosParticipantes}' minutos totales entre {jugadoresParticipantes.filter(j => j.minutos > 0).length} jugadores
                  </span>
                </div>
              </div>

              {/* Métricas rápidas de cobro */}
              {costoTotalNumerico > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-[#0f1712] border border-[#243d2c] rounded-xl">
                    <span className="text-[10px] text-[#9aa89f] block">Total a Cubrir</span>
                    <span className="font-display font-bold text-sm text-white">
                      ${costoTotalNumerico.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="p-2 bg-[#0f1712] border border-[#243d2c] rounded-xl">
                    <span className="text-[10px] text-[#3ddc84] block">Cobrado</span>
                    <span className="font-display font-bold text-sm text-[#3ddc84]">
                      ${totalRecaudado.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="p-2 bg-[#0f1712] border border-[#243d2c] rounded-xl">
                    <span className="text-[10px] text-amber-400 block">Pendiente</span>
                    <span className="font-display font-bold text-sm text-amber-400">
                      ${totalPendiente.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}

              {/* Lista scrolleable de jugadores */}
              <div className="flex-1 overflow-y-auto pr-1 min-h-0 border border-[#243d2c] rounded-xl bg-[#0f1712]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#182a1f] sticky top-0 z-10 border-b border-[#243d2c] text-[10px] text-[#9aa89f] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-2.5">Jugador</th>
                      <th className="py-2 px-2 text-center">Minutos</th>
                      <th className="py-2 px-2 text-center">% Part.</th>
                      <th className="py-2 px-2 text-right">Cuota ($)</th>
                      <th className="py-2 px-2 text-center">¿Pagó?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243d2c]/60">
                    {jugadoresConCuota.map((j) => (
                      <tr 
                        key={j.jugador.id} 
                        className={`hover:bg-[#182a1f]/60 transition-colors ${
                          j.estaExcluido ? 'opacity-40 bg-black/20' : ''
                        }`}
                      >
                        <td className="py-2 px-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleExcluir(j.jugador.id)}
                              className="text-[10px] text-[#9aa89f] hover:text-white"
                              title={j.estaExcluido ? 'Incluir en el cálculo' : 'Excluir del cálculo (no paga)'}
                            >
                              {j.estaExcluido ? '❌' : '✅'}
                            </button>
                            <span className="font-display font-bold text-xs text-[#3ddc84]">
                              #{j.dorsalMostrar}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold text-white truncate block">
                                {j.jugador.nombre}
                              </span>
                              {j.fueExpulsado && (
                                <span className="text-[9px] text-[#e63946] font-semibold flex items-center gap-0.5">
                                  🟥 Exp. {j.minutoSalida || j.minutoExpulsion}'
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-2 text-center text-zinc-300 font-semibold">
                          {j.minutos}'
                        </td>

                        <td className="py-2 px-2 text-center text-[#9aa89f] text-[11px]">
                          {!j.estaExcluido && j.minutos > 0 ? `${j.porcentaje}%` : '-'}
                        </td>

                        <td className="py-2 px-2 text-right">
                          <span className="font-display font-bold text-xs sm:text-sm text-white">
                            {costoTotalNumerico > 0 && !j.estaExcluido ? `$${j.cuotaFinal.toLocaleString('es-AR')}` : '$0'}
                          </span>
                        </td>

                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            disabled={j.estaExcluido || costoTotalNumerico === 0}
                            onClick={() => handleTogglePago(j.jugador.id)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              j.yaPago
                                ? 'bg-[#3ddc84] text-[#0f1712]'
                                : 'bg-[#182a1f] text-zinc-400 border border-[#243d2c] hover:text-white'
                            }`}
                          >
                            {j.yaPago ? 'PAGADO' : 'PENDIENTE'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botones de acción inferiores */}
              <div className="flex items-center justify-between pt-3 border-t border-[#243d2c] gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={costoTotalNumerico === 0}
                  onClick={handleCopiarWhatsApp}
                  className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copiadoWhatsApp ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>¡Copiado para WhatsApp!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar para WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setModalCalcularCosto(false)}
                  className="px-4 py-2 bg-transparent border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
