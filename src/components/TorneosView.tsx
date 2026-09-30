/**
 * @file TorneosView.tsx
 * Vista principal de "Torneos" con soporte completo para:
 * - Selector de torneos jugados (creación/edición para Editor)
 * - Configuración de equipos (siempre incluye equipo propio)
 * - Tabla actual (posiciones automáticas de partidos jugados)
 * - Tabla anual (base inicial editable por DT + torneo actual)
 * - Fechas (fechas pasadas, fecha próxima destacada, fixtures pendientes y resultados)
 * - Tabla de goleadores (editable, con auto-sync de jugadores propios)
 * - Copa Fair-Play (menor puntaje = mejor posición, puntos con decimales)
 * - Ficha del Equipo al tocar cualquier equipo
 * - Modo Lector (solo lectura) y Modo Editor (gestión completa)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trophy, 
  Calendar, 
  Plus, 
  Settings2, 
  Flame, 
  ShieldCheck, 
  Clock, 
  Edit3, 
  Trash2, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ChevronRight, 
  Users, 
  ChevronDown, 
  X,
  Sparkles,
  MapPin,
  CalendarCheck,
  ChevronLeft
} from 'lucide-react';

import { 
  Torneo, 
  TorneoDetalle, 
  FechaTorneo, 
  PartidoTorneoFecha, 
  GoleadorTorneo, 
  TablaAnualBaseEquipo, 
  RolUsuario, 
  Partido, 
  Jugador, 
  Incidencia,
  FichaEquipoData
} from '../types';

import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { 
  calcularTablaPosiciones, 
  calcularTablaAnual, 
  calcularTablaFairPlay, 
  obtenerFichaEquipo,
  sincronizarGoleadoresPropios
} from '../utils/torneoCalculations';
import { FichaEquipoModal } from './FichaEquipoModal';

interface TorneosViewProps {
  rol: RolUsuario;
  nombreEquipo: string;
  colorPropio?: string;
  partidos: Partido[];
  jugadores: Jugador[];
  incidencias: Incidencia[];
  onActualizarDatos?: () => void;
}

type SubSolapa = 'tabla-actual' | 'tabla-anual' | 'fechas' | 'goleadores' | 'fair-play';
type FiltroFechas = 'todas' | 'pasadas' | 'proxima' | 'especifica';

export const TorneosView: React.FC<TorneosViewProps> = ({
  rol,
  nombreEquipo,
  colorPropio = '#3ddc84',
  partidos,
  jugadores,
  incidencias,
  onActualizarDatos
}) => {
  const esEditor = rol === 'editor';

  // Lista de Torneos
  const [torneos, setTorneos] = useState<Torneo[]>(() => StorageService.getTorneos());
  const [torneoSeleccionadoId, setTorneoSeleccionadoId] = useState<string>(() => {
    const list = StorageService.getTorneos();
    const activo = list.find(t => t.estado === 'activo');
    return activo ? activo.id : (list[0]?.id || 'torneo-apertura-2026');
  });

  // Datos detallados del torneo seleccionado
  const [detalle, setDetalle] = useState<TorneoDetalle>(() => 
    StorageService.getTorneoDetalle(torneoSeleccionadoId)
  );

  // Sub-solapa activa
  const [solapa, setSolapa] = useState<SubSolapa>('tabla-actual');

  // Filtro dentro de Fechas
  const [filtroFechas, setFiltroFechas] = useState<FiltroFechas>('todas');
  const [fechaEspecificaNum, setFechaEspecificaNum] = useState<number>(1);

  // Estado para Ficha del Equipo
  const [equipoFichaSeleccionado, setEquipoFichaSeleccionado] = useState<string | null>(null);

  // Modales de Edición para el Editor
  const [modalTorneoAbierto, setModalTorneoAbierto] = useState<boolean>(false);
  const [modoEdicionTorneo, setModoEdicionTorneo] = useState<'crear' | 'editar'>('crear');
  const [formTorneo, setFormTorneo] = useState({
    nombre: '',
    tipo: 'Apertura' as Torneo['tipo'],
    anio: new Date().getFullYear(),
    estado: 'activo' as Torneo['estado'],
    descripcion: ''
  });

  const [modalEquiposAbierto, setModalEquiposAbierto] = useState<boolean>(false);
  const [nuevoNombreEquipo, setNuevoNombreEquipo] = useState<string>('');

  const [modalBaseAnualAbierto, setModalBaseAnualAbierto] = useState<boolean>(false);
  const [baseAnualEdicion, setBaseAnualEdicion] = useState<Record<string, TablaAnualBaseEquipo>>({});

  const [modalPartidoFechaAbierto, setModalPartidoFechaAbierto] = useState<boolean>(false);
  const [fechaNumeroParaPartido, setFechaNumeroParaPartido] = useState<number>(1);
  const [partidoEditando, setPartidoEditando] = useState<PartidoTorneoFecha | null>(null);
  const [formPartido, setFormPartido] = useState({
    equipoLocal: '',
    equipoVisitante: '',
    golesLocal: '' as string | number,
    golesVisitante: '' as string | number,
    jugado: false,
    fechaHora: '',
    cancha: ''
  });

  const [modalGoleadorAbierto, setModalGoleadorAbierto] = useState<boolean>(false);
  const [formGoleador, setFormGoleador] = useState({
    nombre: '',
    equipo: nombreEquipo,
    goles: 1
  });

  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState<boolean>(false);
  const [dialogoConfirmacion, setDialogoConfirmacion] = useState<{
    titulo: string;
    mensaje: string;
    textoBoton?: string;
    onConfirm: () => void;
  } | null>(null);

  // Sincronizar datos locales cuando cambia el torneo seleccionado
  useEffect(() => {
    if (torneoSeleccionadoId) {
      const data = StorageService.getTorneoDetalle(torneoSeleccionadoId);
      setDetalle(data);
      if (data.fechas && data.fechas.length > 0) {
        setFechaEspecificaNum(data.fechas[0].numero);
      }
    }
  }, [torneoSeleccionadoId]);

  // Escuchar eventos globales de torneos
  useEffect(() => {
    const handleDatosActualizados = () => {
      const tList = StorageService.getTorneos();
      setTorneos(tList);
      if (torneoSeleccionadoId) {
        setDetalle(StorageService.getTorneoDetalle(torneoSeleccionadoId));
      }
    };
    window.addEventListener('futbol11-datos-actualizados', handleDatosActualizados);
    window.addEventListener('futbol11-torneo-detalle-actualizado', handleDatosActualizados);
    return () => {
      window.removeEventListener('futbol11-datos-actualizados', handleDatosActualizados);
      window.removeEventListener('futbol11-torneo-detalle-actualizado', handleDatosActualizados);
    };
  }, [torneoSeleccionadoId]);

  const showToast = (msg: string) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 3000);
  };

  const torneoActualObj = useMemo(() => {
    return torneos.find(t => t.id === torneoSeleccionadoId) || torneos[0];
  }, [torneos, torneoSeleccionadoId]);

  // Cálculos reactivos de tablas
  const tablaPosiciones = useMemo(() => {
    return calcularTablaPosiciones(detalle.equipos, detalle.fechas);
  }, [detalle.equipos, detalle.fechas]);

  const tablaAnual = useMemo(() => {
    return calcularTablaAnual(detalle.equipos, tablaPosiciones, detalle.tablaAnualBase);
  }, [detalle.equipos, tablaPosiciones, detalle.tablaAnualBase]);

  const tablaFairPlay = useMemo(() => {
    return calcularTablaFairPlay(detalle.equipos, detalle.fairPlay);
  }, [detalle.equipos, detalle.fairPlay]);

  // Ficha de equipo computada
  const fichaEquipo = useMemo(() => {
    if (!equipoFichaSeleccionado) return null;
    return obtenerFichaEquipo(equipoFichaSeleccionado, detalle, nombreEquipo);
  }, [equipoFichaSeleccionado, detalle, nombreEquipo]);

  // Helper para guardar detalle
  const guardarDetalleYNotificar = useCallback((nuevoDetalle: TorneoDetalle) => {
    setDetalle(nuevoDetalle);
    StorageService.saveTorneoDetalle(torneoSeleccionadoId, nuevoDetalle);
    ApiService.guardarDatosTorneo(torneoSeleccionadoId, nuevoDetalle).catch(() => {});
    onActualizarDatos?.();
  }, [torneoSeleccionadoId, onActualizarDatos]);

  // =========================================================================
  // HANDLERS DEL TORNEO (CREAR / EDITAR / ELIMINAR)
  // =========================================================================
  const abrirModalCrearTorneo = () => {
    setModoEdicionTorneo('crear');
    setFormTorneo({
      nombre: '',
      tipo: 'Apertura',
      anio: new Date().getFullYear(),
      estado: 'activo',
      descripcion: ''
    });
    setModalTorneoAbierto(true);
  };

  const abrirModalEditarTorneo = () => {
    if (!torneoActualObj) return;
    setModoEdicionTorneo('editar');
    setFormTorneo({
      nombre: torneoActualObj.nombre,
      tipo: torneoActualObj.tipo,
      anio: torneoActualObj.anio,
      estado: torneoActualObj.estado,
      descripcion: torneoActualObj.descripcion || ''
    });
    setModalTorneoAbierto(true);
  };

  const handleGuardarTorneo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTorneo.nombre.trim()) return;

    if (modoEdicionTorneo === 'crear') {
      const nuevo = StorageService.iniciarTorneo(
        formTorneo.tipo,
        formTorneo.anio,
        formTorneo.nombre,
        formTorneo.descripcion,
        formTorneo.estado === 'activo'
      );
      // Inicializar plantilla
      const nuevaPlantilla = StorageService.getTorneoDetalle(nuevo.id);
      setTorneos(StorageService.getTorneos());
      setTorneoSeleccionadoId(nuevo.id);
      setDetalle(nuevaPlantilla);
      showToast(`Torneo "${nuevo.nombre}" creado con éxito.`);
      await ApiService.guardarTorneo(nuevo);
      await ApiService.guardarDatosTorneo(nuevo.id, nuevaPlantilla);
    } else {
      if (!torneoActualObj) return;
      const actualizados = torneos.map(t => {
        if (t.id === torneoActualObj.id) {
          return {
            ...t,
            nombre: formTorneo.nombre.trim(),
            tipo: formTorneo.tipo,
            anio: formTorneo.anio,
            estado: formTorneo.estado,
            descripcion: formTorneo.descripcion.trim() || undefined
          };
        }
        return t;
      });
      StorageService.saveTorneos(actualizados);
      setTorneos(actualizados);
      const torneoActualizado = actualizados.find(t => t.id === torneoActualObj.id)!;
      await ApiService.guardarTorneo(torneoActualizado);
      showToast(`Torneo "${torneoActualizado.nombre}" actualizado.`);
    }

    setModalTorneoAbierto(false);
  };

  const handleEliminarTorneoActual = () => {
    if (!torneoActualObj) return;
    if (torneos.length <= 1) {
      showToast('No es posible eliminar el único torneo existente.');
      return;
    }
    setDialogoConfirmacion({
      titulo: 'Eliminar Torneo',
      mensaje: `¿Estás seguro de eliminar el torneo "${torneoActualObj.nombre}" y todos sus fixtures y datos asociados?`,
      textoBoton: 'Sí, Eliminar Torneo',
      onConfirm: async () => {
        await ApiService.eliminarTorneo(torneoActualObj.id);
        const restantes = StorageService.getTorneos();
        setTorneos(restantes);
        setTorneoSeleccionadoId(restantes[0]?.id || '');
        showToast('Torneo eliminado con éxito.');
      }
    });
  };

  // =========================================================================
  // GESTIÓN DE EQUIPOS DEL TORNEO
  // =========================================================================
  const handleAgregarEquipo = () => {
    const nombre = nuevoNombreEquipo.trim();
    if (!nombre) return;
    if (detalle.equipos.some(e => e.toLowerCase() === nombre.toLowerCase())) {
      showToast('Ese equipo ya está en el torneo.');
      return;
    }
    const nuevosEquipos = [...detalle.equipos, nombre];
    const nuevoFairPlay = { ...detalle.fairPlay };
    if (nuevoFairPlay[nombre] === undefined) {
      nuevoFairPlay[nombre] = 0;
    }
    const nuevoDetalle = {
      ...detalle,
      equipos: nuevosEquipos,
      fairPlay: nuevoFairPlay
    };
    guardarDetalleYNotificar(nuevoDetalle);
    setNuevoNombreEquipo('');
    showToast(`Equipo "${nombre}" agregado al torneo.`);
  };

  const handleEliminarEquipo = (equipo: string) => {
    if (equipo.toLowerCase() === nombreEquipo.toLowerCase()) {
      showToast('No podés eliminar tu propio equipo del torneo.');
      return;
    }
    setDialogoConfirmacion({
      titulo: 'Quitar Equipo del Torneo',
      mensaje: `¿Estás seguro de quitar al equipo "${equipo}" de este torneo? También se eliminarán los partidos y registros asociados a este rival.`,
      textoBoton: 'Sí, Quitar Equipo',
      onConfirm: () => {
        const nuevosEquipos = detalle.equipos.filter(e => e !== equipo);
        const nuevoFairPlay = { ...detalle.fairPlay };
        delete nuevoFairPlay[equipo];

        const nuevaBaseAnual = { ...detalle.tablaAnualBase };
        delete nuevaBaseAnual[equipo];

        const nuevasFechas = (detalle.fechas || []).map(f => ({
          ...f,
          partidos: (f.partidos || []).filter(
            p => p.equipoLocal.toLowerCase() !== equipo.toLowerCase() &&
                 p.equipoVisitante.toLowerCase() !== equipo.toLowerCase()
          )
        }));

        const nuevosGoleadores = (detalle.goleadores || []).filter(
          g => g.equipo.toLowerCase() !== equipo.toLowerCase()
        );

        const nuevoDetalle = {
          ...detalle,
          equipos: nuevosEquipos,
          fairPlay: nuevoFairPlay,
          tablaAnualBase: nuevaBaseAnual,
          fechas: nuevasFechas,
          goleadores: nuevosGoleadores
        };
        guardarDetalleYNotificar(nuevoDetalle);
        showToast(`Equipo "${equipo}" eliminado.`);
      }
    });
  };

  // =========================================================================
  // GESTIÓN DE FECHAS Y PARTIDOS
  // =========================================================================
  const handleAgregarFecha = () => {
    const siguienteNumero = (detalle.fechas.length > 0)
      ? Math.max(...detalle.fechas.map(f => f.numero)) + 1
      : 1;

    const nuevaFecha: FechaTorneo = {
      numero: siguienteNumero,
      nombre: `Fecha ${siguienteNumero}`,
      estado: 'pendiente',
      esProxima: detalle.fechas.length === 0,
      partidos: []
    };

    const nuevasFechas = [...detalle.fechas, nuevaFecha];
    const nuevoDetalle = {
      ...detalle,
      fechas: nuevasFechas
    };
    guardarDetalleYNotificar(nuevoDetalle);
    setFechaEspecificaNum(siguienteNumero);
    setFiltroFechas('especifica');
    showToast(`Fecha ${siguienteNumero} creada con éxito.`);
  };

  const handleMarcarComoProximaFecha = (fechaNum: number) => {
    const nuevasFechas = detalle.fechas.map(f => ({
      ...f,
      esProxima: f.numero === fechaNum,
      estado: f.numero === fechaNum ? ('proxima' as const) : f.estado === 'proxima' ? ('pendiente' as const) : f.estado
    }));

    const nuevoDetalle: TorneoDetalle = {
      ...detalle,
      fechaProximaNumero: fechaNum,
      fechas: nuevasFechas
    };
    guardarDetalleYNotificar(nuevoDetalle);
    showToast(`Fecha ${fechaNum} marcada como Próxima Fecha.`);
  };

  const handleEliminarFecha = (fechaNum: number) => {
    setDialogoConfirmacion({
      titulo: `Eliminar Fecha ${fechaNum}`,
      mensaje: `¿Estás seguro de eliminar la Fecha ${fechaNum} y todos sus partidos asociados?`,
      textoBoton: 'Sí, Eliminar Fecha',
      onConfirm: () => {
        const nuevasFechas = detalle.fechas.filter(f => f.numero !== fechaNum);
        const nuevoDetalle = {
          ...detalle,
          fechas: nuevasFechas
        };
        guardarDetalleYNotificar(nuevoDetalle);
        showToast(`Fecha ${fechaNum} eliminada.`);
      }
    });
  };

  const abrirModalCrearPartido = (fechaNum: number) => {
    setFechaNumeroParaPartido(fechaNum);
    setPartidoEditando(null);
    const equiposDisponibles = detalle.equipos;
    setFormPartido({
      equipoLocal: equiposDisponibles[0] || nombreEquipo,
      equipoVisitante: equiposDisponibles[1] || 'Rival',
      golesLocal: '',
      golesVisitante: '',
      jugado: false,
      fechaHora: '',
      cancha: ''
    });
    setModalPartidoFechaAbierto(true);
  };

  const abrirModalEditarPartido = (fechaNum: number, partido: PartidoTorneoFecha) => {
    setFechaNumeroParaPartido(fechaNum);
    setPartidoEditando(partido);
    setFormPartido({
      equipoLocal: partido.equipoLocal,
      equipoVisitante: partido.equipoVisitante,
      golesLocal: partido.golesLocal !== null ? partido.golesLocal : '',
      golesVisitante: partido.golesVisitante !== null ? partido.golesVisitante : '',
      jugado: partido.jugado,
      fechaHora: partido.fechaHora || '',
      cancha: partido.cancha || ''
    });
    setModalPartidoFechaAbierto(true);
  };

  const handleGuardarPartidoFecha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPartido.equipoLocal || !formPartido.equipoVisitante) {
      showToast('Debes seleccionar equipo local y visitante.');
      return;
    }
    if (formPartido.equipoLocal === formPartido.equipoVisitante) {
      showToast('El equipo local y visitante no pueden ser el mismo.');
      return;
    }

    const gl = formPartido.golesLocal !== '' && formPartido.golesLocal !== null 
      ? Number(formPartido.golesLocal) 
      : null;
    const gv = formPartido.golesVisitante !== '' && formPartido.golesVisitante !== null 
      ? Number(formPartido.golesVisitante) 
      : null;
    const esJugado = formPartido.jugado || (gl !== null && gv !== null);

    const nuevasFechas = detalle.fechas.map(f => {
      if (f.numero === fechaNumeroParaPartido) {
        let nuevosPartidos = [...(f.partidos || [])];
        if (partidoEditando) {
          nuevosPartidos = nuevosPartidos.map(p => {
            if (p.id === partidoEditando.id) {
              return {
                ...p,
                equipoLocal: formPartido.equipoLocal,
                equipoVisitante: formPartido.equipoVisitante,
                golesLocal: gl,
                golesVisitante: gv,
                jugado: esJugado,
                fechaHora: formPartido.fechaHora || undefined,
                cancha: formPartido.cancha || undefined
              };
            }
            return p;
          });
        } else {
          nuevosPartidos.push({
            id: `part-${fechaNumeroParaPartido}-${Date.now()}`,
            equipoLocal: formPartido.equipoLocal,
            equipoVisitante: formPartido.equipoVisitante,
            golesLocal: gl,
            golesVisitante: gv,
            jugado: esJugado,
            fechaHora: formPartido.fechaHora || undefined,
            cancha: formPartido.cancha || undefined
          });
        }
        return { ...f, partidos: nuevosPartidos };
      }
      return f;
    });

    const nuevoDetalle = {
      ...detalle,
      fechas: nuevasFechas
    };
    guardarDetalleYNotificar(nuevoDetalle);
    setModalPartidoFechaAbierto(false);
    showToast('Partido guardado. La tabla de posiciones se actualizó automáticamente.');
  };

  const handleEliminarPartidoFecha = (fechaNum: number, partidoId: string) => {
    setDialogoConfirmacion({
      titulo: 'Eliminar Partido',
      mensaje: '¿Estás seguro de eliminar este partido de la fecha?',
      textoBoton: 'Sí, Eliminar Partido',
      onConfirm: () => {
        const nuevasFechas = detalle.fechas.map(f => {
          if (f.numero === fechaNum) {
            return {
              ...f,
              partidos: f.partidos.filter(p => p.id !== partidoId)
            };
          }
          return f;
        });

        const nuevoDetalle = {
          ...detalle,
          fechas: nuevasFechas
        };
        guardarDetalleYNotificar(nuevoDetalle);
        showToast('Partido eliminado.');
      }
    });
  };

  // =========================================================================
  // GESTIÓN DE TABLA ANUAL BASE
  // =========================================================================
  const abrirModalEditarBaseAnual = () => {
    const baseActual = { ...detalle.tablaAnualBase };
    detalle.equipos.forEach(eq => {
      if (!baseActual[eq]) {
        baseActual[eq] = {
          equipo: eq,
          pj: 0,
          pg: 0,
          pe: 0,
          pp: 0,
          gf: 0,
          gc: 0,
          puntos: 0
        };
      }
    });
    setBaseAnualEdicion(baseActual);
    setModalBaseAnualAbierto(true);
  };

  const handleGuardarBaseAnual = () => {
    const nuevoDetalle = {
      ...detalle,
      tablaAnualBase: baseAnualEdicion
    };
    guardarDetalleYNotificar(nuevoDetalle);
    setModalBaseAnualAbierto(false);
    showToast('Base de la Tabla Anual actualizada.');
  };

  // =========================================================================
  // GESTIÓN DE GOLEADORES
  // =========================================================================
  const handleAutoSincronizarGoleadoresPropios = () => {
    const goleadoresActualizados = sincronizarGoleadoresPropios(
      torneoSeleccionadoId,
      partidos,
      incidencias,
      jugadores,
      detalle.goleadores,
      nombreEquipo
    );

    const nuevoDetalle = {
      ...detalle,
      goleadores: goleadoresActualizados
    };
    guardarDetalleYNotificar(nuevoDetalle);
    showToast('Goleadores del equipo propio sincronizados desde el registro de partidos.');
  };

  const handleModificarGolesGoleador = (goleadorId: string, delta: number) => {
    const nuevos = detalle.goleadores.map(g => {
      if (g.id === goleadorId) {
        return { ...g, goles: Math.max(0, g.goles + delta) };
      }
      return g;
    });
    nuevos.sort((a, b) => b.goles - a.goles);
    guardarDetalleYNotificar({ ...detalle, goleadores: nuevos });
  };

  const handleEliminarGoleador = (goleadorId: string) => {
    const nuevos = detalle.goleadores.filter(g => g.id !== goleadorId);
    guardarDetalleYNotificar({ ...detalle, goleadores: nuevos });
    showToast('Goleador eliminado de la tabla.');
  };

  const handleAgregarGoleador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGoleador.nombre.trim()) return;

    const nuevo: GoleadorTorneo = {
      id: `gol-ext-${Date.now()}`,
      nombre: formGoleador.nombre.trim(),
      equipo: formGoleador.equipo.trim() || nombreEquipo,
      goles: Number(formGoleador.goles) || 1
    };

    const nuevos = [...detalle.goleadores, nuevo];
    nuevos.sort((a, b) => b.goles - a.goles);
    guardarDetalleYNotificar({ ...detalle, goleadores: nuevos });
    setModalGoleadorAbierto(false);
    setFormGoleador({ nombre: '', equipo: nombreEquipo, goles: 1 });
    showToast(`Goleador ${nuevo.nombre} agregado.`);
  };

  // =========================================================================
  // GESTIÓN DE FAIR PLAY
  // =========================================================================
  const handleModificarFairPlay = (equipo: string, valorStr: string) => {
    const num = parseFloat(valorStr);
    const nuevoFairPlay = {
      ...detalle.fairPlay,
      [equipo]: isNaN(num) ? 0 : num
    };
    guardarDetalleYNotificar({ ...detalle, fairPlay: nuevoFairPlay });
  };

  // Sincronizar en la nube manual
  const handleSincronizarNube = async () => {
    setIsSavingCloud(true);
    try {
      await ApiService.guardarDatosTorneo(torneoSeleccionadoId, detalle);
      showToast('¡Datos del torneo sincronizados en la nube!');
    } catch {
      showToast('Guardado localmente. Se sincronizará al conectar.');
    } finally {
      setIsSavingCloud(false);
    }
  };

  // Fechas filtradas según la solapa
  const fechasFiltradas = useMemo(() => {
    if (filtroFechas === 'todas') return detalle.fechas;
    if (filtroFechas === 'pasadas') {
      return detalle.fechas.filter(f => 
        (f.partidos && f.partidos.length > 0 && f.partidos.every(p => p.jugado)) || f.estado === 'jugada'
      );
    }
    if (filtroFechas === 'proxima') {
      const prox = detalle.fechas.find(f => f.esProxima || f.numero === detalle.fechaProximaNumero);
      if (prox) return [prox];
      const primeraConPendientes = detalle.fechas.find(f => f.partidos.some(p => !p.jugado));
      return primeraConPendientes ? [primeraConPendientes] : detalle.fechas.slice(0, 1);
    }
    if (filtroFechas === 'especifica') {
      return detalle.fechas.filter(f => f.numero === fechaEspecificaNum);
    }
    return detalle.fechas;
  }, [detalle.fechas, filtroFechas, fechaEspecificaNum, detalle.fechaProximaNumero]);

  return (
    <div className="space-y-6">

      {/* TOAST FLOTANTE */}
      {toastMensaje && (
        <div className="fixed bottom-20 right-6 z-50 bg-[#182a1f] border border-[#2bb46a] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#3ddc84]" />
          <span>{toastMensaje}</span>
        </div>
      )}

      {/* 1. BARRA SUPERIOR: SELECTOR DE TORNEO Y ACCIONES */}
      <div className="bg-[#121c15] border border-[#243d2c] rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Título y Selector de Torneo */}
          <div className="flex flex-wrap items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md shrink-0"
              style={{
                backgroundColor: `${colorPropio}20`,
                border: `1.5px solid ${colorPropio}`
              }}
            >
              <Trophy className="w-5 h-5 text-[#3ddc84]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-display font-semibold">
                  Torneos & Campeonatos
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  torneoActualObj?.estado === 'activo'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {torneoActualObj?.estado === 'activo' ? 'Torneo Activo' : 'Finalizado'}
                </span>
              </div>

              {/* Selector de Torneos */}
              <div className="relative mt-1">
                <select
                  value={torneoSeleccionadoId}
                  onChange={(e) => setTorneoSeleccionadoId(e.target.value)}
                  className="bg-[#182a1f] border border-[#2bb46a]/30 text-white font-display font-bold text-base sm:text-lg rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:border-[#3ddc84] cursor-pointer appearance-none"
                >
                  {torneos.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#121c15] text-white">
                      {t.nombre} ({t.anio}) {t.estado === 'activo' ? '• Activo' : '• Cerrado'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Acciones para el EDITOR */}
          {esEditor && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={abrirModalCrearTorneo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182a1f] text-emerald-400 hover:text-white border border-[#2bb46a]/40 hover:bg-[#243d2c] transition-all"
                title="Crear un nuevo torneo"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Torneo</span>
              </button>

              <button
                onClick={abrirModalEditarTorneo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182a1f] text-zinc-300 hover:text-white border border-[#243d2c] hover:bg-[#243d2c] transition-all"
                title="Editar nombre, año o estado de este torneo"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => setModalEquiposAbierto(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182a1f] text-zinc-300 hover:text-white border border-[#243d2c] hover:bg-[#243d2c] transition-all"
                title="Elegir y gestionar los equipos participantes de este torneo"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Equipos ({detalle.equipos.length})</span>
              </button>

              <button
                onClick={handleSincronizarNube}
                disabled={isSavingCloud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#3ddc84]/15 text-[#3ddc84] hover:bg-[#3ddc84]/25 border border-[#3ddc84]/30 transition-all"
                title="Sincronizar todos los datos de torneos con Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSavingCloud ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Guardar Nube</span>
              </button>

              {torneos.length > 1 && (
                <button
                  onClick={handleEliminarTorneoActual}
                  className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                  title="Eliminar este torneo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

        </div>

        {/* Info adicional del Torneo */}
        {torneoActualObj?.descripcion && (
          <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-[#243d2c]/60">
            {torneoActualObj.descripcion}
          </p>
        )}
      </div>

      {/* 2. SUB-SOLAPAS DE NAVEGACIÓN DENTRO DE TORNEOS */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-[#243d2c]">
        
        <button
          onClick={() => setSolapa('tabla-actual')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
            solapa === 'tabla-actual'
              ? 'bg-[#182a1f] text-[#3ddc84] border-[#3ddc84]'
              : 'text-zinc-400 hover:text-white hover:bg-[#182a1f]/50 border-transparent'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Tabla Actual
        </button>

        <button
          onClick={() => setSolapa('tabla-anual')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
            solapa === 'tabla-anual'
              ? 'bg-[#182a1f] text-[#ffb703] border-[#ffb703]'
              : 'text-zinc-400 hover:text-white hover:bg-[#182a1f]/50 border-transparent'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Tabla Anual
        </button>

        <button
          onClick={() => setSolapa('fechas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
            solapa === 'fechas'
              ? 'bg-[#182a1f] text-emerald-400 border-emerald-400'
              : 'text-zinc-400 hover:text-white hover:bg-[#182a1f]/50 border-transparent'
          }`}
        >
          <Clock className="w-4 h-4" />
          Fechas & Fixture
          <span className="text-[10px] px-1.5 py-0.2 bg-[#243d2c] text-zinc-300 rounded-full">
            {detalle.fechas.length}
          </span>
        </button>

        <button
          onClick={() => setSolapa('goleadores')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
            solapa === 'goleadores'
              ? 'bg-[#182a1f] text-orange-400 border-orange-400'
              : 'text-zinc-400 hover:text-white hover:bg-[#182a1f]/50 border-transparent'
          }`}
        >
          <Flame className="w-4 h-4" />
          Goleadores
          <span className="text-[10px] px-1.5 py-0.2 bg-[#243d2c] text-zinc-300 rounded-full">
            {detalle.goleadores.length}
          </span>
        </button>

        <button
          onClick={() => setSolapa('fair-play')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-display font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
            solapa === 'fair-play'
              ? 'bg-[#182a1f] text-sky-400 border-sky-400'
              : 'text-zinc-400 hover:text-white hover:bg-[#182a1f]/50 border-transparent'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Copa Fair-Play
        </button>

      </div>

      {/* 3. VISTAS DE CONTENIDO POR SOLAPA */}

      {/* SOLAPA 1: TABLA ACTUAL */}
      {solapa === 'tabla-actual' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#3ddc84]" />
                Tabla de Posiciones — {torneoActualObj?.nombre}
              </h3>
              <p className="text-xs text-zinc-400">
                Se alimenta automáticamente de los partidos jugados en las fechas. Tocá un equipo para ver su Ficha Completa.
              </p>
            </div>
          </div>

          <div className="bg-[#121c15] border border-[#243d2c] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#182a1f] text-zinc-400 font-display font-semibold uppercase text-[11px] border-b border-[#243d2c]">
                    <th className="py-3 px-3 sm:px-4 text-center w-12">Pos</th>
                    <th className="py-3 px-3 sm:px-4">Equipo</th>
                    <th className="py-3 px-2 sm:px-3 text-center font-bold text-white">PTS</th>
                    <th className="py-3 px-2 sm:px-3 text-center">PJ</th>
                    <th className="py-3 px-2 sm:px-3 text-center text-emerald-400">PG</th>
                    <th className="py-3 px-2 sm:px-3 text-center text-amber-400">PE</th>
                    <th className="py-3 px-2 sm:px-3 text-center text-rose-400">PP</th>
                    <th className="py-3 px-2 sm:px-3 text-center hidden md:table-cell">GF</th>
                    <th className="py-3 px-2 sm:px-3 text-center hidden md:table-cell">GC</th>
                    <th className="py-3 px-2 sm:px-3 text-center font-semibold">DG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243d2c]/60">
                  {tablaPosiciones.map((row) => {
                    const esPropio = row.equipo.toLowerCase() === nombreEquipo.toLowerCase();
                    return (
                      <tr 
                        key={row.equipo}
                        onClick={() => setEquipoFichaSeleccionado(row.equipo)}
                        className={`cursor-pointer transition-all hover:bg-[#182a1f]/80 ${
                          esPropio ? 'bg-[#3ddc84]/10 font-medium' : ''
                        }`}
                        title="Ver ficha completa de este equipo"
                      >
                        {/* Posición */}
                        <td className="py-3 px-3 sm:px-4 text-center font-display font-bold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            row.posicion === 1
                              ? 'bg-amber-400/20 text-amber-400 border border-amber-400/50'
                              : row.posicion === 2
                              ? 'bg-zinc-300/20 text-zinc-200 border border-zinc-300/40'
                              : row.posicion === 3
                              ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                              : 'text-zinc-400'
                          }`}>
                            {row.posicion}°
                          </span>
                        </td>

                        {/* Nombre Equipo */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${esPropio ? 'text-[#3ddc84]' : 'text-white'}`}>
                              {row.equipo}
                            </span>
                            {esPropio && (
                              <span 
                                className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase"
                                style={{ backgroundColor: `${colorPropio}25`, color: colorPropio }}
                              >
                                Propio
                              </span>
                            )}
                          </div>
                        </td>

                        {/* PTS */}
                        <td className="py-3 px-2 sm:px-3 text-center font-display font-bold text-base text-white bg-[#182a1f]/30">
                          {row.puntos}
                        </td>

                        {/* PJ */}
                        <td className="py-3 px-2 sm:px-3 text-center text-zinc-300">
                          {row.pj}
                        </td>

                        {/* PG */}
                        <td className="py-3 px-2 sm:px-3 text-center text-emerald-400 font-semibold">
                          {row.pg}
                        </td>

                        {/* PE */}
                        <td className="py-3 px-2 sm:px-3 text-center text-amber-400">
                          {row.pe}
                        </td>

                        {/* PP */}
                        <td className="py-3 px-2 sm:px-3 text-center text-rose-400">
                          {row.pp}
                        </td>

                        {/* GF */}
                        <td className="py-3 px-2 sm:px-3 text-center text-zinc-400 hidden md:table-cell">
                          {row.gf}
                        </td>

                        {/* GC */}
                        <td className="py-3 px-2 sm:px-3 text-center text-zinc-400 hidden md:table-cell">
                          {row.gc}
                        </td>

                        {/* DG */}
                        <td className={`py-3 px-2 sm:px-3 text-center font-bold ${
                          row.dg > 0 ? 'text-emerald-400' : row.dg < 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {row.dg > 0 ? `+${row.dg}` : row.dg}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#182a1f]/40 border-t border-[#243d2c] flex items-center justify-between text-xs text-zinc-400">
              <span>* Tocá cualquier equipo para abrir su Ficha Técnica</span>
              <span>PTS: 3 Victoria • 1 Empate • 0 Derrota</span>
            </div>
          </div>
        </div>
      )}

      {/* SOLAPA 2: TABLA ANUAL */}
      {solapa === 'tabla-anual' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#ffb703]" />
                Tabla Anual Acumulada
              </h3>
              <p className="text-xs text-zinc-400">
                Suma la base histórica del año más los resultados del torneo actual. Tocá un equipo para ver su Ficha.
              </p>
            </div>

            {esEditor && (
              <button
                onClick={abrirModalEditarBaseAnual}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#ffb703]/15 text-[#ffb703] hover:bg-[#ffb703]/25 border border-[#ffb703]/30 transition-all self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Base Inicial Anual</span>
              </button>
            )}
          </div>

          <div className="bg-[#121c15] border border-[#243d2c] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#182a1f] text-zinc-400 font-display font-semibold uppercase text-[11px] border-b border-[#243d2c]">
                    <th className="py-3 px-3 sm:px-4 text-center w-12">Pos</th>
                    <th className="py-3 px-3 sm:px-4">Equipo</th>
                    <th className="py-3 px-2 sm:px-3 text-center font-bold text-[#ffb703]">PTS</th>
                    <th className="py-3 px-2 sm:px-3 text-center">PJ</th>
                    <th className="py-3 px-2 sm:px-3 text-center text-emerald-400">PG</th>
                    <th className="py-3 px-2 sm:px-3 text-center text-amber-400">PE</th>
                    <th className="py-3 px-2 sm:px-3 text-center text-rose-400">PP</th>
                    <th className="py-3 px-2 sm:px-3 text-center hidden md:table-cell">GF</th>
                    <th className="py-3 px-2 sm:px-3 text-center hidden md:table-cell">GC</th>
                    <th className="py-3 px-2 sm:px-3 text-center font-semibold">DG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243d2c]/60">
                  {tablaAnual.map((row) => {
                    const esPropio = row.equipo.toLowerCase() === nombreEquipo.toLowerCase();
                    return (
                      <tr 
                        key={row.equipo}
                        onClick={() => setEquipoFichaSeleccionado(row.equipo)}
                        className={`cursor-pointer transition-all hover:bg-[#182a1f]/80 ${
                          esPropio ? 'bg-[#ffb703]/10 font-medium' : ''
                        }`}
                        title="Ver ficha completa de este equipo"
                      >
                        <td className="py-3 px-3 sm:px-4 text-center font-display font-bold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            row.posicion === 1
                              ? 'bg-amber-400/20 text-amber-400 border border-amber-400/50'
                              : row.posicion === 2
                              ? 'bg-zinc-300/20 text-zinc-200 border border-zinc-300/40'
                              : row.posicion === 3
                              ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                              : 'text-zinc-400'
                          }`}>
                            {row.posicion}°
                          </span>
                        </td>

                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${esPropio ? 'text-[#ffb703]' : 'text-white'}`}>
                              {row.equipo}
                            </span>
                            {esPropio && (
                              <span 
                                className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#ffb703]/20 text-[#ffb703]"
                              >
                                Propio
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center font-display font-bold text-base text-[#ffb703] bg-[#182a1f]/30">
                          {row.puntos}
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center text-zinc-300">
                          {row.pj}
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center text-emerald-400 font-semibold">
                          {row.pg}
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center text-amber-400">
                          {row.pe}
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center text-rose-400">
                          {row.pp}
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center text-zinc-400 hidden md:table-cell">
                          {row.gf}
                        </td>

                        <td className="py-3 px-2 sm:px-3 text-center text-zinc-400 hidden md:table-cell">
                          {row.gc}
                        </td>

                        <td className={`py-3 px-2 sm:px-3 text-center font-bold ${
                          row.dg > 0 ? 'text-emerald-400' : row.dg < 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {row.dg > 0 ? `+${row.dg}` : row.dg}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#182a1f]/40 border-t border-[#243d2c] flex items-center justify-between text-xs text-zinc-400">
              <span>* Cálculo: Puntos Base Históricos + Puntos Torneo Actual</span>
              {esEditor && (
                <span className="text-[#ffb703] font-medium">DT: Podés editar los valores base iniciales de cada club</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOLAPA 3: FECHAS & FIXTURE */}
      {solapa === 'fechas' && (
        <div className="space-y-4">
          
          {/* Barra de Filtros de Fechas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#121c15] p-1.5 rounded-xl border border-[#243d2c]">
              <button
                onClick={() => setFiltroFechas('todas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroFechas === 'todas'
                    ? 'bg-[#182a1f] text-emerald-400 border border-[#2bb46a]/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todas las Fechas
              </button>

              <button
                onClick={() => setFiltroFechas('pasadas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroFechas === 'pasadas'
                    ? 'bg-[#182a1f] text-emerald-400 border border-[#2bb46a]/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Fechas Pasadas
              </button>

              <button
                onClick={() => setFiltroFechas('proxima')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filtroFechas === 'proxima'
                    ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                Fecha Próxima
              </button>

              {/* Selector individual de Fecha */}
              {detalle.fechas.length > 0 && (
                <div className="relative">
                  <select
                    value={filtroFechas === 'especifica' ? fechaEspecificaNum : ''}
                    onChange={(e) => {
                      setFiltroFechas('especifica');
                      setFechaEspecificaNum(Number(e.target.value));
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border bg-[#182a1f] cursor-pointer focus:outline-none ${
                      filtroFechas === 'especifica'
                        ? 'text-emerald-400 border-emerald-400/40'
                        : 'text-zinc-400 border-[#243d2c]'
                    }`}
                  >
                    <option value="" disabled>Elegir Fecha...</option>
                    {detalle.fechas.map(f => (
                      <option key={f.numero} value={f.numero}>
                        {f.nombre || `Fecha ${f.numero}`} {f.esProxima ? '★ Próxima' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {esEditor && (
              <button
                onClick={handleAgregarFecha}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#3ddc84]/15 text-[#3ddc84] hover:bg-[#3ddc84]/25 border border-[#3ddc84]/30 transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Fecha {detalle.fechas.length + 1}</span>
              </button>
            )}
          </div>

          {/* Listado de Fechas */}
          {fechasFiltradas.length === 0 ? (
            <div className="bg-[#121c15] border border-dashed border-[#243d2c] p-12 rounded-2xl text-center space-y-3">
              <Clock className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-zinc-400 text-sm font-medium">No se encontraron fechas bajo este filtro.</p>
              {esEditor && (
                <button
                  onClick={handleAgregarFecha}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#182a1f] text-[#3ddc84] border border-[#2bb46a]/30 hover:bg-[#243d2c] transition-all"
                >
                  Crear la primera fecha del torneo
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {fechasFiltradas.map((fecha) => {
                const esProximaFecha = fecha.esProxima || fecha.numero === detalle.fechaProximaNumero;
                return (
                  <div 
                    key={fecha.numero}
                    className={`bg-[#121c15] border rounded-2xl overflow-hidden shadow-lg transition-all ${
                      esProximaFecha 
                        ? 'border-amber-400/50 ring-1 ring-amber-400/20' 
                        : 'border-[#243d2c]'
                    }`}
                  >
                    {/* Header de la Fecha */}
                    <div className={`px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#243d2c] ${
                      esProximaFecha ? 'bg-gradient-to-r from-amber-500/10 to-[#121c15]' : 'bg-[#182a1f]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-base sm:text-lg text-white">
                          {fecha.nombre || `Fecha ${fecha.numero}`}
                        </span>

                        {esProximaFecha && (
                          <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-400 text-[#0f1712] shadow-sm animate-pulse">
                            <Sparkles className="w-3 h-3 fill-current" />
                            Fecha Próxima
                          </span>
                        )}

                        <span className="text-xs text-zinc-400">
                          ({fecha.partidos?.length || 0} partidos)
                        </span>
                      </div>

                      {esEditor && (
                        <div className="flex items-center gap-2">
                          {!esProximaFecha && (
                            <button
                              onClick={() => handleMarcarComoProximaFecha(fecha.numero)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-400/10 border border-amber-400/30 transition-all"
                              title="Marcar esta fecha como la próxima a disputarse"
                            >
                              Fijar como Próxima
                            </button>
                          )}

                          <button
                            onClick={() => abrirModalCrearPartido(fecha.numero)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#182a1f] text-[#3ddc84] hover:bg-[#243d2c] border border-[#2bb46a]/30 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Agregar Partido</span>
                          </button>

                          <button
                            onClick={() => handleEliminarFecha(fecha.numero)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Eliminar esta fecha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Partidos de la Fecha */}
                    <div className="p-3 sm:p-4 space-y-2.5">
                      {(!fecha.partidos || fecha.partidos.length === 0) ? (
                        <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-[#243d2c] rounded-xl">
                          No hay partidos configurados para esta fecha todavía.
                          {esEditor && (
                            <button
                              onClick={() => abrirModalCrearPartido(fecha.numero)}
                              className="block mx-auto mt-2 text-[#3ddc84] font-semibold hover:underline"
                            >
                              + Agregar primer partido
                            </button>
                          )}
                        </div>
                      ) : (
                        fecha.partidos.map((partido) => {
                          const localEsPropio = partido.equipoLocal.toLowerCase() === nombreEquipo.toLowerCase();
                          const visitEsPropio = partido.equipoVisitante.toLowerCase() === nombreEquipo.toLowerCase();
                          const incluyePropio = localEsPropio || visitEsPropio;

                          return (
                            <div 
                              key={partido.id}
                              className={`border rounded-xl p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                                incluyePropio 
                                  ? 'bg-[#182a1f]/80 border-[#2bb46a]/40 shadow-sm' 
                                  : 'bg-[#15231b] border-[#243d2c]'
                              }`}
                            >
                              {/* Equipos y Marcador */}
                              <div className="flex-1 flex items-center justify-between sm:justify-start gap-4">
                                
                                {/* Equipo Local */}
                                <div 
                                  onClick={() => setEquipoFichaSeleccionado(partido.equipoLocal)}
                                  className="flex-1 text-right flex items-center justify-end gap-2 cursor-pointer group"
                                  title="Ver ficha de este equipo"
                                >
                                  <span className={`text-sm font-semibold truncate group-hover:text-[#3ddc84] transition-colors ${
                                    localEsPropio ? 'text-[#3ddc84]' : 'text-white'
                                  }`}>
                                    {partido.equipoLocal}
                                  </span>
                                  {localEsPropio && (
                                    <span 
                                      className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase hidden sm:inline"
                                      style={{ backgroundColor: `${colorPropio}25`, color: colorPropio }}
                                    >
                                      Propio
                                    </span>
                                  )}
                                </div>

                                {/* Resultado / VS */}
                                <div className="shrink-0 px-3 py-1 rounded-lg bg-[#0f1712] border border-[#243d2c] min-w-[70px] text-center font-display">
                                  {partido.jugado && partido.golesLocal !== null && partido.golesVisitante !== null ? (
                                    <div className="text-base font-bold text-white tracking-wider">
                                      <span className={partido.golesLocal > partido.golesVisitante ? 'text-emerald-400' : ''}>
                                        {partido.golesLocal}
                                      </span>
                                      <span className="text-zinc-500 mx-1.5">-</span>
                                      <span className={partido.golesVisitante > partido.golesLocal ? 'text-emerald-400' : ''}>
                                        {partido.golesVisitante}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                                      VS
                                    </span>
                                  )}
                                </div>

                                {/* Equipo Visitante */}
                                <div 
                                  onClick={() => setEquipoFichaSeleccionado(partido.equipoVisitante)}
                                  className="flex-1 text-left flex items-center justify-start gap-2 cursor-pointer group"
                                  title="Ver ficha de este equipo"
                                >
                                  {visitEsPropio && (
                                    <span 
                                      className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase hidden sm:inline"
                                      style={{ backgroundColor: `${colorPropio}25`, color: colorPropio }}
                                    >
                                      Propio
                                    </span>
                                  )}
                                  <span className={`text-sm font-semibold truncate group-hover:text-[#3ddc84] transition-colors ${
                                    visitEsPropio ? 'text-[#3ddc84]' : 'text-white'
                                  }`}>
                                    {partido.equipoVisitante}
                                  </span>
                                </div>

                              </div>

                              {/* Info Cancha / Fecha y Acciones Editor */}
                              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#243d2c]">
                                {(partido.cancha || partido.fechaHora) && (
                                  <div className="text-right text-[11px] text-zinc-400 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                                    <span>{partido.cancha || 'Cancha'}</span>
                                    {partido.fechaHora && <span className="text-zinc-500">• {partido.fechaHora}</span>}
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5">
                                  {partido.jugado ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                      Finalizado
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                      Pendiente
                                    </span>
                                  )}

                                  {esEditor && (
                                    <>
                                      <button
                                        onClick={() => abrirModalEditarPartido(fecha.numero, partido)}
                                        className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
                                        title="Editar resultado o datos del partido"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleEliminarPartidoFecha(fecha.numero, partido.id)}
                                        className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        title="Eliminar partido"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* SOLAPA 4: TABLA DE GOLEADORES */}
      {solapa === 'goleadores' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                Tabla de Goleadores — {torneoActualObj?.nombre}
              </h3>
              <p className="text-xs text-zinc-400">
                Líderes de goleo del torneo. Los jugadores de tu equipo propio se pueden sincronizar automáticamente.
              </p>
            </div>

            {esEditor && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAutoSincronizarGoleadoresPropios}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#3ddc84]/15 text-[#3ddc84] hover:bg-[#3ddc84]/25 border border-[#3ddc84]/30 transition-all"
                  title="Detectar goles anotados por nuestros jugadores en los partidos jugados"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar Equipo Propio</span>
                </button>

                <button
                  onClick={() => setModalGoleadorAbierto(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182a1f] text-white hover:bg-[#243d2c] border border-[#2bb46a]/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-[#3ddc84]" />
                  <span>Agregar Goleador</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#121c15] border border-[#243d2c] rounded-2xl overflow-hidden shadow-xl">
            {detalle.goleadores.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
                <Flame className="w-8 h-8 text-zinc-600 mx-auto" />
                <p>No hay goleadores registrados en este torneo aún.</p>
                {esEditor && (
                  <button
                    onClick={handleAutoSincronizarGoleadoresPropios}
                    className="text-[#3ddc84] font-semibold hover:underline"
                  >
                    Sincronizar goleadores de nuestro equipo
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#182a1f] text-zinc-400 font-display font-semibold uppercase text-[11px] border-b border-[#243d2c]">
                      <th className="py-3 px-3 sm:px-4 text-center w-12">Pos</th>
                      <th className="py-3 px-3 sm:px-4">Jugador</th>
                      <th className="py-3 px-3 sm:px-4">Equipo</th>
                      <th className="py-3 px-3 sm:px-4 text-center font-bold text-[#3ddc84]">Goles</th>
                      {esEditor && <th className="py-3 px-3 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243d2c]/60">
                    {detalle.goleadores.map((g, idx) => {
                      const esPropio = g.equipo.toLowerCase() === nombreEquipo.toLowerCase();
                      return (
                        <tr 
                          key={g.id || idx}
                          className={`transition-colors hover:bg-[#182a1f]/60 ${
                            esPropio ? 'bg-[#3ddc84]/5 font-medium' : ''
                          }`}
                        >
                          {/* Posición */}
                          <td className="py-3 px-3 sm:px-4 text-center font-display font-bold">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                              idx === 0
                                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/50'
                                : idx === 1
                                ? 'bg-zinc-300/20 text-zinc-200 border border-zinc-300/40'
                                : idx === 2
                                ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                                : 'text-zinc-400'
                            }`}>
                              {idx + 1}°
                            </span>
                          </td>

                          {/* Nombre del Jugador */}
                          <td className="py-3 px-3 sm:px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{g.nombre}</span>
                              {esPropio && (
                                <span 
                                  className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                                  style={{ backgroundColor: `${colorPropio}25`, color: colorPropio }}
                                >
                                  Plantel Propio
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Equipo */}
                          <td 
                            onClick={() => setEquipoFichaSeleccionado(g.equipo)}
                            className="py-3 px-3 sm:px-4 text-zinc-300 hover:text-[#3ddc84] cursor-pointer"
                            title="Ver ficha de este equipo"
                          >
                            <span className="underline decoration-dotted underline-offset-2">
                              {g.equipo}
                            </span>
                          </td>

                          {/* Goles */}
                          <td className="py-3 px-3 sm:px-4 text-center font-display font-bold text-base text-[#3ddc84]">
                            {g.goles}
                          </td>

                          {/* Acciones para Editor */}
                          {esEditor && (
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleModificarGolesGoleador(g.id, -1)}
                                  className="w-6 h-6 rounded bg-[#182a1f] text-zinc-400 hover:text-white border border-[#243d2c] flex items-center justify-center font-bold text-xs"
                                  title="Restar 1 gol"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => handleModificarGolesGoleador(g.id, 1)}
                                  className="w-6 h-6 rounded bg-[#182a1f] text-[#3ddc84] hover:bg-[#2bb46a]/20 border border-[#2bb46a]/40 flex items-center justify-center font-bold text-xs"
                                  title="Sumar 1 gol"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => handleEliminarGoleador(g.id)}
                                  className="w-6 h-6 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center ml-1"
                                  title="Quitar de la tabla"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOLAPA 5: COPA FAIR-PLAY */}
      {solapa === 'fair-play' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                Copa Fair-Play — {torneoActualObj?.nombre}
              </h3>
              <p className="text-xs text-zinc-400">
                Regla Fair Play: <strong className="text-white">el equipo con MENOS puntos ocupa la mejor posición (1° puesto)</strong>. Permite decimales.
              </p>
            </div>
          </div>

          <div className="bg-[#121c15] border border-[#243d2c] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#182a1f] text-zinc-400 font-display font-semibold uppercase text-[11px] border-b border-[#243d2c]">
                    <th className="py-3 px-3 sm:px-4 text-center w-12">Pos</th>
                    <th className="py-3 px-3 sm:px-4">Equipo</th>
                    <th className="py-3 px-3 sm:px-4 text-center font-bold text-sky-400">Puntos Fair-Play</th>
                    {esEditor && <th className="py-3 px-3 text-right">Editar Puntos</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243d2c]/60">
                  {tablaFairPlay.map((row) => {
                    const esPropio = row.equipo.toLowerCase() === nombreEquipo.toLowerCase();
                    return (
                      <tr 
                        key={row.equipo}
                        className={`transition-colors hover:bg-[#182a1f]/60 ${
                          esPropio ? 'bg-sky-500/10 font-medium' : ''
                        }`}
                      >
                        {/* Posición */}
                        <td className="py-3 px-3 sm:px-4 text-center font-display font-bold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            row.posicion === 1
                              ? 'bg-amber-400/20 text-amber-400 border border-amber-400/50'
                              : row.posicion === 2
                              ? 'bg-zinc-300/20 text-zinc-200 border border-zinc-300/40'
                              : row.posicion === 3
                              ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                              : 'text-zinc-400'
                          }`}>
                            {row.posicion}°
                          </span>
                        </td>

                        {/* Equipo */}
                        <td 
                          onClick={() => setEquipoFichaSeleccionado(row.equipo)}
                          className="py-3 px-3 sm:px-4 cursor-pointer"
                          title="Ver ficha de este equipo"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold hover:text-sky-400 transition-colors ${
                              esPropio ? 'text-sky-400' : 'text-white'
                            }`}>
                              {row.equipo}
                            </span>
                            {esPropio && (
                              <span 
                                className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-sky-500/20 text-sky-400"
                              >
                                Propio
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Puntos Fair Play */}
                        <td className="py-3 px-3 sm:px-4 text-center font-display font-bold text-base text-sky-400">
                          {row.puntos % 1 === 0 ? row.puntos : row.puntos.toFixed(2)} pts
                        </td>

                        {/* Editor de Puntos para DT */}
                        {esEditor && (
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={detalle.fairPlay[row.equipo] ?? 0}
                                onChange={(e) => handleModificarFairPlay(row.equipo, e.target.value)}
                                className="w-20 px-2 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white text-xs font-display font-bold text-center focus:outline-none focus:border-sky-400"
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#182a1f]/40 border-t border-[#243d2c] flex items-center justify-between text-xs text-zinc-400">
              <span>* Puntos de penalización (tarjetas/conducta): menor puntaje gana el premio</span>
              {esEditor && <span className="text-sky-400 font-medium">Editor: podés ingresar números decimales (ej: 1.5, 2.5)</span>}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FICHA DEL EQUIPO */}
      {/* ========================================================================= */}
      {equipoFichaSeleccionado && (
        <FichaEquipoModal
          ficha={fichaEquipo}
          nombreTorneo={torneoActualObj?.nombre || 'Torneo'}
          colorPropio={colorPropio}
          onClose={() => setEquipoFichaSeleccionado(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA EDITOR: CREAR / EDITAR TORNEO */}
      {/* ========================================================================= */}
      {modalTorneoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c15] border border-[#243d2c] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                {modoEdicionTorneo === 'crear' ? 'Nuevo Torneo' : 'Editar Torneo'}
              </h3>
              <button 
                onClick={() => setModalTorneoAbierto(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarTorneo} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Nombre del Torneo *</label>
                <input
                  type="text"
                  required
                  value={formTorneo.nombre}
                  onChange={(e) => setFormTorneo({ ...formTorneo, nombre: e.target.value })}
                  placeholder="ej: Torneo Clausura 2026"
                  className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3ddc84]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Tipo</label>
                  <select
                    value={formTorneo.tipo}
                    onChange={(e) => setFormTorneo({ ...formTorneo, tipo: e.target.value as any })}
                    className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Apertura">Apertura</option>
                    <option value="Clausura">Clausura</option>
                    <option value="Anual">Anual</option>
                    <option value="Copa">Copa</option>
                    <option value="Amistoso">Amistoso</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Año</label>
                  <input
                    type="number"
                    value={formTorneo.anio}
                    onChange={(e) => setFormTorneo({ ...formTorneo, anio: Number(e.target.value) })}
                    className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Estado</label>
                <select
                  value={formTorneo.estado}
                  onChange={(e) => setFormTorneo({ ...formTorneo, estado: e.target.value as any })}
                  className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="activo">Activo (en curso)</option>
                  <option value="cerrado">Cerrado (finalizado)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Descripción / Notas</label>
                <textarea
                  rows={2}
                  value={formTorneo.descripcion}
                  onChange={(e) => setFormTorneo({ ...formTorneo, descripcion: e.target.value })}
                  placeholder="Detalles sobre reglamento, formato o sede..."
                  className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalTorneoAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#3ddc84] text-[#0f1712] hover:bg-[#2bb46a] transition-all font-display uppercase tracking-wider"
                >
                  {modoEdicionTorneo === 'crear' ? 'Crear Torneo' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA EDITOR: GESTIONAR EQUIPOS PARTICIPANTES */}
      {/* ========================================================================= */}
      {modalEquiposAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c15] border border-[#243d2c] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3 shrink-0">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Equipos del Torneo ({detalle.equipos.length})
                </h3>
                <p className="text-xs text-zinc-400">
                  Agregá o quitá equipos participantes. Tu equipo propio siempre está incluido.
                </p>
              </div>
              <button 
                onClick={() => setModalEquiposAbierto(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input para agregar nuevo equipo */}
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={nuevoNombreEquipo}
                onChange={(e) => setNuevoNombreEquipo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarEquipo(); } }}
                placeholder="Nombre del nuevo club rival..."
                className="flex-1 bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3ddc84]"
              />
              <button
                type="button"
                onClick={handleAgregarEquipo}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#3ddc84] text-[#0f1712] hover:bg-[#2bb46a] shrink-0"
              >
                + Agregar
              </button>
            </div>

            {/* Lista de equipos actuales */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {detalle.equipos.map((eq, idx) => {
                const esPropio = eq.toLowerCase() === nombreEquipo.toLowerCase();
                return (
                  <div 
                    key={eq}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      esPropio 
                        ? 'bg-[#3ddc84]/10 border-[#3ddc84]/30' 
                        : 'bg-[#182a1f]/60 border-[#243d2c]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-zinc-500 font-display font-bold w-5">
                        {idx + 1}.
                      </span>
                      <span className={`text-sm font-semibold ${esPropio ? 'text-[#3ddc84]' : 'text-white'}`}>
                        {eq}
                      </span>
                      {esPropio && (
                        <span 
                          className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                          style={{ backgroundColor: `${colorPropio}25`, color: colorPropio }}
                        >
                          Equipo Propio
                        </span>
                      )}
                    </div>

                    {!esPropio && (
                      <button
                        onClick={() => handleEliminarEquipo(eq)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                        title="Quitar equipo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#243d2c] flex justify-end shrink-0">
              <button
                onClick={() => setModalEquiposAbierto(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#182a1f] text-white hover:bg-[#243d2c] border border-[#243d2c]"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA EDITOR: EDITAR BASE INICIAL DE LA TABLA ANUAL */}
      {/* ========================================================================= */}
      {modalBaseAnualAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c15] border border-[#243d2c] w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3 shrink-0">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Editar Base Inicial de la Tabla Anual
                </h3>
                <p className="text-xs text-zinc-400">
                  Configurá el punto de partida (ej: semestre previo) para cada equipo. A estos valores se les sumará automáticamente el torneo actual.
                </p>
              </div>
              <button 
                onClick={() => setModalBaseAnualAbierto(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#182a1f] text-zinc-400 font-display font-semibold uppercase text-[10px] border-b border-[#243d2c]">
                    <th className="py-2.5 px-3">Equipo</th>
                    <th className="py-2.5 px-2 text-center">PTS</th>
                    <th className="py-2.5 px-2 text-center">PJ</th>
                    <th className="py-2.5 px-2 text-center">PG</th>
                    <th className="py-2.5 px-2 text-center">PE</th>
                    <th className="py-2.5 px-2 text-center">PP</th>
                    <th className="py-2.5 px-2 text-center">GF</th>
                    <th className="py-2.5 px-2 text-center">GC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#243d2c]/60">
                  {detalle.equipos.map(eq => {
                    const row = baseAnualEdicion[eq] || {
                      equipo: eq,
                      pj: 0,
                      pg: 0,
                      pe: 0,
                      pp: 0,
                      gf: 0,
                      gc: 0,
                      puntos: 0
                    };
                    const esPropio = eq.toLowerCase() === nombreEquipo.toLowerCase();

                    const updateField = (field: keyof TablaAnualBaseEquipo, val: number) => {
                      setBaseAnualEdicion(prev => ({
                        ...prev,
                        [eq]: {
                          ...row,
                          [field]: val
                        }
                      }));
                    };

                    return (
                      <tr key={eq} className={esPropio ? 'bg-[#ffb703]/5' : ''}>
                        <td className="py-2 px-3 font-semibold text-white truncate max-w-[140px]">
                          {eq} {esPropio ? '(Propio)' : ''}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.puntos}
                            onChange={(e) => updateField('puntos', Number(e.target.value))}
                            className="w-14 px-1.5 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white font-bold text-center"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.pj}
                            onChange={(e) => updateField('pj', Number(e.target.value))}
                            className="w-12 px-1 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white text-center"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.pg}
                            onChange={(e) => updateField('pg', Number(e.target.value))}
                            className="w-12 px-1 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white text-center text-emerald-400"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.pe}
                            onChange={(e) => updateField('pe', Number(e.target.value))}
                            className="w-12 px-1 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white text-center text-amber-400"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.pp}
                            onChange={(e) => updateField('pp', Number(e.target.value))}
                            className="w-12 px-1 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white text-center text-rose-400"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.gf}
                            onChange={(e) => updateField('gf', Number(e.target.value))}
                            className="w-12 px-1 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white text-center"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            value={row.gc}
                            onChange={(e) => updateField('gc', Number(e.target.value))}
                            className="w-12 px-1 py-1 rounded bg-[#182a1f] border border-[#243d2c] text-white text-center"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-[#243d2c] flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-500">
                Al guardar, la tabla anual se recalculará instantáneamente.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalBaseAnualAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarBaseAnual}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#ffb703] text-[#0f1712] hover:bg-amber-400 transition-all font-display uppercase tracking-wider font-bold"
                >
                  Guardar Base Anual
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA EDITOR: CREAR / EDITAR PARTIDO DE FECHA */}
      {/* ========================================================================= */}
      {modalPartidoFechaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c15] border border-[#243d2c] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {partidoEditando ? 'Editar Partido' : 'Agregar Partido'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Fecha {fechaNumeroParaPartido} • {torneoActualObj?.nombre}
                </p>
              </div>
              <button 
                onClick={() => setModalPartidoFechaAbierto(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarPartidoFecha} className="space-y-4">
              
              {/* Equipo Local vs Visitante */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Equipo Local</label>
                  <select
                    value={formPartido.equipoLocal}
                    onChange={(e) => setFormPartido({ ...formPartido, equipoLocal: e.target.value })}
                    className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    {detalle.equipos.map(eq => (
                      <option key={eq} value={eq}>{eq} {eq.toLowerCase() === nombreEquipo.toLowerCase() ? '(Propio)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Equipo Visitante</label>
                  <select
                    value={formPartido.equipoVisitante}
                    onChange={(e) => setFormPartido({ ...formPartido, equipoVisitante: e.target.value })}
                    className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    {detalle.equipos.map(eq => (
                      <option key={eq} value={eq}>{eq} {eq.toLowerCase() === nombreEquipo.toLowerCase() ? '(Propio)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resultado (Goles) */}
              <div className="bg-[#182a1f]/60 border border-[#243d2c] p-3.5 rounded-xl space-y-3">
                <span className="text-xs font-semibold text-zinc-300 block">
                  Resultado del Partido (Dejar vacío si está pendiente)
                </span>

                <div className="flex items-center justify-center gap-3">
                  <div className="text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block mb-1">Goles Local</span>
                    <input
                      type="number"
                      min="0"
                      value={formPartido.golesLocal}
                      onChange={(e) => setFormPartido({ ...formPartido, golesLocal: e.target.value })}
                      placeholder="-"
                      className="w-16 h-12 text-center text-xl font-display font-bold bg-[#121c15] border border-[#243d2c] rounded-xl text-white focus:outline-none focus:border-[#3ddc84]"
                    />
                  </div>

                  <span className="text-zinc-500 font-display font-bold text-lg mt-4">-</span>

                  <div className="text-center">
                    <span className="text-[10px] text-zinc-400 uppercase block mb-1">Goles Visitante</span>
                    <input
                      type="number"
                      min="0"
                      value={formPartido.golesVisitante}
                      onChange={(e) => setFormPartido({ ...formPartido, golesVisitante: e.target.value })}
                      placeholder="-"
                      className="w-16 h-12 text-center text-xl font-display font-bold bg-[#121c15] border border-[#243d2c] rounded-xl text-white focus:outline-none focus:border-[#3ddc84]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formPartido.jugado}
                    onChange={(e) => setFormPartido({ ...formPartido, jugado: e.target.checked })}
                    className="rounded bg-[#121c15] border-[#243d2c] text-[#3ddc84] focus:ring-0"
                  />
                  <span className="text-xs text-zinc-300">
                    Marcar partido como <strong>Jugado</strong> (alimenta la tabla)
                  </span>
                </label>
              </div>

              {/* Cancha y Día/Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Cancha / Predio</label>
                  <input
                    type="text"
                    value={formPartido.cancha}
                    onChange={(e) => setFormPartido({ ...formPartido, cancha: e.target.value })}
                    placeholder="ej: Cancha 1"
                    className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Día y Hora</label>
                  <input
                    type="text"
                    value={formPartido.fechaHora}
                    onChange={(e) => setFormPartido({ ...formPartido, fechaHora: e.target.value })}
                    placeholder="ej: Sáb 16:00 hs"
                    className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalPartidoFechaAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#3ddc84] text-[#0f1712] hover:bg-[#2bb46a] transition-all font-display uppercase tracking-wider font-bold"
                >
                  Guardar Partido
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA EDITOR: AGREGAR GOLEADOR */}
      {/* ========================================================================= */}
      {modalGoleadorAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c15] border border-[#243d2c] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                Agregar Goleador
              </h3>
              <button 
                onClick={() => setModalGoleadorAbierto(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAgregarGoleador} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Nombre del Jugador *</label>
                <input
                  type="text"
                  required
                  value={formGoleador.nombre}
                  onChange={(e) => setFormGoleador({ ...formGoleador, nombre: e.target.value })}
                  placeholder="ej: Carlos Tevez"
                  className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3ddc84]"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Equipo</label>
                <select
                  value={formGoleador.equipo}
                  onChange={(e) => setFormGoleador({ ...formGoleador, equipo: e.target.value })}
                  className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {detalle.equipos.map(eq => (
                    <option key={eq} value={eq}>{eq} {eq.toLowerCase() === nombreEquipo.toLowerCase() ? '(Propio)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Cantidad de Goles</label>
                <input
                  type="number"
                  min="1"
                  value={formGoleador.goles}
                  onChange={(e) => setFormGoleador({ ...formGoleador, goles: Number(e.target.value) })}
                  className="w-full bg-[#182a1f] border border-[#243d2c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalGoleadorAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#3ddc84] text-[#0f1712] hover:bg-[#2bb46a] font-display font-bold uppercase tracking-wider"
                >
                  Guardar Goleador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIÁLOGO MODAL DE CONFIRMACIÓN (ELIMINAR EQUIPO, PARTIDO, FECHA O TORNEO) */}
      {/* ========================================================================= */}
      {dialogoConfirmacion && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121c15] border border-rose-500/50 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  {dialogoConfirmacion.titulo}
                </h3>
                <p className="text-xs text-rose-400/90 font-medium">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed bg-[#182a1f]/60 p-3 rounded-xl border border-[#243d2c]">
              {dialogoConfirmacion.mensaje}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDialogoConfirmacion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConfirm = dialogoConfirmacion.onConfirm;
                  setDialogoConfirmacion(null);
                  onConfirm();
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-all font-display uppercase tracking-wider font-bold shadow-lg shadow-rose-600/20"
              >
                {dialogoConfirmacion.textoBoton || 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
