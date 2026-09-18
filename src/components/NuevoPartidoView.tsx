/**
 * @file NuevoPartidoView.tsx
 * Configuración previa de un partido nuevo:
 * - Datos generales (rival, fecha, cancha, condición, duración del tiempo)
 * - Convocatoria de jugadores del plantel propio (marcando titulares y suplentes con dorsales)
 * - 3. Disposición Táctica en Cancha para el equipo propio (con esquemas 4-3-3, 4-4-2, 4-1-3-2, 4-3-1-2, 3-5-2, 4-2-3-1,
 *   intercambio interactivo tocando a uno y luego a otro, edición de dorsal con doble clic y agregado de suplentes).
 * - 4. Jugadores del Rival con Disposición Táctica interactiva (edición de números y nombres, tácticas y agregado de suplentes).
 * - Iniciar partido y transicionar al cronómetro en vivo.
 */

import React, { useState } from 'react';
import { 
  PlusCircle, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Shield, 
  UserPlus, 
  Trash2, 
  Play, 
  CheckSquare, 
  Square,
  AlertCircle,
  LayoutGrid,
  ArrowRightLeft,
  X,
  Check,
  Tag,
  Star,
  Search,
  GripVertical,
  UserCheck,
  BookmarkCheck,
  Plus
} from 'lucide-react';
import { 
  Jugador, 
  Partido, 
  Convocado, 
  RivalJugador, 
  ModoRival, 
  CondicionPartido 
} from '../types';
import { getPosicionBadge, getContrastingTextColor } from '../utils/footballCalculations';
import { ApiService } from '../services/api';
import { StorageService, PartidoEnVivoDraft } from '../services/storage';
import { TacticaCancha, JugadorEnCancha } from './TacticaCancha';
import { FORMACIONES_DISPONIBLES, PosicionTactico } from '../utils/formations';

export { FORMACIONES_DISPONIBLES };

interface NuevoPartidoViewProps {
  jugadores: Jugador[];
  onIniciarPartido: () => void;
  onCancelar: () => void;
  nombreEquipo?: string;
  colorPropio?: string;
  colorRival?: string;
}

interface RivalItem {
  id: string;
  numero: number;
  nombre: string;
  posicion?: string;
  titular: boolean;
}

export const NuevoPartidoView: React.FC<NuevoPartidoViewProps> = ({
  jugadores,
  onIniciarPartido,
  onCancelar,
  nombreEquipo: propNombreEquipo,
  colorPropio: propColorPropio,
  colorRival: propColorRival
}) => {
  // Datos y configuración del club
  const clubConfig = StorageService.getClubConfig();
  const nombreEquipo = propNombreEquipo || clubConfig.nombre || StorageService.getNombreEquipo() || 'Los Halcones FC';
  const colorClub = propColorPropio || clubConfig.colorPropio || '#3ddc84';
  const colorRivalConfig = propColorRival || clubConfig.colorRival || '#e63946';

  const torneos = StorageService.getTorneos();
  const [torneoId, setTorneoId] = useState<string>(() => StorageService.getTorneoActivo()?.id || '');

  const partidosExistentes = StorageService.getPartidos();
  const [etiqueta, setEtiqueta] = useState<string>(() => `Fecha ${partidosExistentes.length + 1}`);

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [rival, setRival] = useState('');
  const [cancha, setCancha] = useState(`Predio ${nombreEquipo} - Cancha 1`);
  const [condicion, setCondicion] = useState<CondicionPartido>('local');
  const [duracionTiempoMin, setDuracionTiempoMin] = useState(40);
  const [modoRival, setModoRival] = useState<ModoRival>('nombre_numero');

  // Formaciones tácticas
  const [formacionPropia, setFormacionPropia] = useState<string>(() => StorageService.getFormacionPredeterminada() || '4-3-3');
  const [formacionRival, setFormacionRival] = useState<string>('4-4-2');

  // Lista de jugadores activos del club
  const jugadoresActivos = jugadores.filter(j => j.activo);

  // Diccionario de jugadores de Halcones para lookup rápido
  const jugadoresMap = new Map<string, Jugador>(jugadores.map(j => [j.id, j]));

  // Dorsales asignados para el partido: { [jugadorId]: numero }
  const [dorsalesMap, setDorsalesMap] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    jugadoresActivos.forEach((j, idx) => {
      init[j.id] = (j.numero !== undefined && j.numero !== null && j.numero > 0) ? j.numero : (idx + 1);
    });
    return init;
  });

  // Convocados para el partido (Paso 2): jugadores que asistirán al encuentro
  const [convocadosIds, setConvocadosIds] = useState<string[]>(() => {
    const baseTitulares = StorageService.getTitularesPredeterminados();
    if (baseTitulares.length > 0) {
      // Convocamos a los del 11 base + el resto de los activos
      const todosActivos = jugadoresActivos.map(j => j.id);
      return Array.from(new Set([...baseTitulares, ...todosActivos]));
    }
    return jugadoresActivos.map(j => j.id);
  });

  // Slots de cancha para los titulares (Paso 3): 11 puestos indexados 0 a 10
  // Si hay formación y 11 titular predeterminado guardado en Plantel o previa anterior, cargarlo; sino iniciar vacío
  const [canchaSlots, setCanchaSlots] = useState<(string | null)[]>(() => {
    const conf = StorageService.getClubConfig();
    if (conf.slotsPredeterminados && Array.isArray(conf.slotsPredeterminados) && conf.slotsPredeterminados.length === 11) {
      return conf.slotsPredeterminados.map(id => (id && jugadoresActivos.some(j => j.id === id) ? id : null));
    }
    const baseTitulares = conf.titularesPredeterminados || [];
    const slots: (string | null)[] = Array(11).fill(null);
    if (baseTitulares.length > 0) {
      baseTitulares.slice(0, 11).forEach((id, idx) => {
        if (jugadoresActivos.some(j => j.id === id)) {
          slots[idx] = id;
        }
      });
    }
    return slots;
  });

  // Estado para ordenar la lista de disponibles en Paso 3 ('posicion' | 'nombre' | 'numero')
  const [ordenDisponiblesTactica, setOrdenDisponiblesTactica] = useState<'posicion' | 'nombre' | 'numero'>('posicion');

  // Estado para selección táctica mediante toque en pantalla (móvil / clic directo)
  const [jugadorSeleccionadoId, setJugadorSeleccionadoId] = useState<string | null>(null);
  const [filtroConvocadosTactica, setFiltroConvocadosTactica] = useState<string>('');

  // RIVALES: 4-4-2
  const [rivalesTitulares, setRivalesTitulares] = useState<RivalItem[]>(() => {
    const defaults = [
      { id: 'riv-t-0', numero: 1,  nombre: '', posicion: 'ARQ', titular: true },
      { id: 'riv-t-1', numero: 4,  nombre: '', posicion: 'LD',  titular: true },
      { id: 'riv-t-2', numero: 2,  nombre: '', posicion: 'DFC', titular: true },
      { id: 'riv-t-3', numero: 6,  nombre: '', posicion: 'DFC', titular: true },
      { id: 'riv-t-4', numero: 3,  nombre: '', posicion: 'LI',  titular: true },
      { id: 'riv-t-5', numero: 8,  nombre: '', posicion: 'MD',  titular: true },
      { id: 'riv-t-6', numero: 5,  nombre: '', posicion: 'MC',  titular: true },
      { id: 'riv-t-7', numero: 10, nombre: '', posicion: 'MC',  titular: true },
      { id: 'riv-t-8', numero: 7,  nombre: '', posicion: 'MI',  titular: true },
      { id: 'riv-t-9', numero: 11, nombre: '', posicion: 'DC',  titular: true },
      { id: 'riv-t-10', numero: 9, nombre: '', posicion: 'DC',  titular: true },
    ];
    return defaults;
  });

  const [rivalesSuplentes, setRivalesSuplentes] = useState<RivalItem[]>(() => [
    { id: 'riv-s-0', numero: 12, nombre: '', titular: false },
    { id: 'riv-s-1', numero: 13, nombre: '', titular: false },
    { id: 'riv-s-2', numero: 14, nombre: '', titular: false }
  ]);

  // Modal para agregar suplente rival
  const [modalAgregarSuplenteRival, setModalAgregarSuplenteRival] = useState(false);
  const [nuevoSuplenteRivalNum, setNuevoSuplenteRivalNum] = useState<number>(15);
  const [nuevoSuplenteRivalNom, setNuevoSuplenteRivalNom] = useState<string>('');

  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [mensajeExitoTactica, setMensajeExitoTactica] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);

  // Ordenamiento de jugadores en la lista de convocatoria
  const [ordenConvocatoria, setOrdenConvocatoria] = useState<'numero' | 'nombre' | 'posicion'>('numero');

  // --- CONTROL DE CONVOCATORIA (Paso 2) ---
  const handleToggleConvocado = (jugadorId: string) => {
    if (convocadosIds.includes(jugadorId)) {
      // Desconvocar: quitar de convocados y si está en la cancha, removerlo del slot
      setConvocadosIds(prev => prev.filter(id => id !== jugadorId));
      setCanchaSlots(prev => prev.map(id => id === jugadorId ? null : id));
      if (jugadorSeleccionadoId === jugadorId) setJugadorSeleccionadoId(null);
    } else {
      // Convocar
      setConvocadosIds(prev => [...prev, jugadorId]);
    }
  };

  const handleConvocarTodos = () => {
    setConvocadosIds(jugadoresActivos.map(j => j.id));
  };

  const handleConvocarSoloBase = () => {
    let base = StorageService.getTitularesPredeterminados();
    if (!base || base.length === 0) {
      // Fallback a los 11 primeros activos
      const ordenados = [...jugadoresActivos].sort((a, b) => {
        const ordenPos: Record<string, number> = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
        const pA = ordenPos[a.posicion] || 5;
        const pB = ordenPos[b.posicion] || 5;
        if (pA !== pB) return pA - pB;
        return (dorsalesMap[a.id] || a.numero || 99) - (dorsalesMap[b.id] || b.numero || 99);
      });
      base = ordenados.slice(0, 11).map(j => j.id);
    }

    if (base.length > 0) {
      setConvocadosIds(base);
      const slots: (string | null)[] = Array(11).fill(null);
      base.slice(0, 11).forEach((id, idx) => {
        if (jugadoresActivos.some(j => j.id === id)) {
          slots[idx] = id;
        }
      });
      setCanchaSlots(slots);
    }
  };

  const handleLimpiarConvocatoria = () => {
    setConvocadosIds([]);
    setCanchaSlots(Array(11).fill(null));
    setJugadorSeleccionadoId(null);
  };

  // --- CONTROL DE TÁCTICA Y CANCHA (Paso 3) ---
  const handleVaciarCancha = () => {
    setCanchaSlots(Array(11).fill(null));
    setJugadorSeleccionadoId(null);
  };

  const handleCargarBaseEnCancha = () => {
    // 1. Cargar el esquema predeterminado configurado en Plantel
    const formacionBase = StorageService.getFormacionPredeterminada() || '4-3-3';
    setFormacionPropia(formacionBase);

    // 2. Cargar slots si existen guardados
    const conf = StorageService.getClubConfig();
    if (conf.slotsPredeterminados && Array.isArray(conf.slotsPredeterminados) && conf.slotsPredeterminados.length === 11) {
      const slots = conf.slotsPredeterminados.map(id => (id && jugadoresActivos.some(j => j.id === id) ? id : null));
      const validos = slots.filter((id): id is string => Boolean(id));
      setConvocadosIds(prev => Array.from(new Set([...prev, ...validos])));
      setCanchaSlots(slots);
      setJugadorSeleccionadoId(null);
      setMensajeExitoTactica(`✓ 11 Base y puestos cargados con esquema ${formacionBase}`);
      setTimeout(() => setMensajeExitoTactica(null), 4000);
      return;
    }

    // Si no hay slots específicos, cargar los 11 titulares base
    let base = StorageService.getTitularesPredeterminados();
    if (!base || base.length === 0) {
      // Si el usuario aún no configuró una base fija en Plantel, tomar los primeros 11 activos ordenados futbolísticamente
      const ordenados = [...jugadoresActivos].sort((a, b) => {
        const ordenPos: Record<string, number> = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
        const pA = ordenPos[a.posicion] || 5;
        const pB = ordenPos[b.posicion] || 5;
        if (pA !== pB) return pA - pB;
        return (dorsalesMap[a.id] || a.numero || 99) - (dorsalesMap[b.id] || b.numero || 99);
      });
      base = ordenados.slice(0, 11).map(j => j.id);
    }

    // 3. Asegurar que estén en la lista de convocados
    setConvocadosIds(prev => Array.from(new Set([...prev, ...base])));
    
    // 4. Asignar ordenadamente a los 11 puestos en cancha
    const slots: (string | null)[] = Array(11).fill(null);
    base.slice(0, 11).forEach((id, idx) => {
      if (jugadoresActivos.some(j => j.id === id)) {
        slots[idx] = id;
      }
    });
    setCanchaSlots(slots);
    setJugadorSeleccionadoId(null);
    setMensajeExitoTactica(`✓ 11 Base cargado en cancha con esquema ${formacionBase}`);
    setTimeout(() => setMensajeExitoTactica(null), 4000);
  };

  const handleGuardarComoBaseDelClub = () => {
    const titularesFinales = canchaSlots.filter((id): id is string => Boolean(id));
    StorageService.saveClubConfig({
      formacionPredeterminada: formacionPropia,
      titularesPredeterminados: titularesFinales,
      slotsPredeterminados: canchaSlots
    });
    setMensajeExitoTactica(`✓ Esquema ${formacionPropia} y titulares guardados como base del club`);
    setTimeout(() => setMensajeExitoTactica(null), 4000);
  };

  const handleLlenarPrimeros11 = () => {
    const nuevosSlots = [...canchaSlots];
    const yaEnCancha = new Set(nuevosSlots.filter(Boolean));
    const disponibles = convocadosIds.filter(id => !yaEnCancha.has(id));
    let dispIdx = 0;

    for (let i = 0; i < 11; i++) {
      if (!nuevosSlots[i] && dispIdx < disponibles.length) {
        nuevosSlots[i] = disponibles[dispIdx];
        dispIdx++;
      }
    }
    setCanchaSlots(nuevosSlots);
  };

  const handleAsignarJugadorASlot = (slotIndex: number, jugadorId: string) => {
    setCanchaSlots(prev => {
      const copy = [...prev];
      // Si el jugador ya estaba en otro slot, lo liberamos de ese slot
      const prevSlot = copy.indexOf(jugadorId);
      if (prevSlot !== -1 && prevSlot !== slotIndex) {
        // Intercambiar si el slot destino estaba ocupado
        copy[prevSlot] = copy[slotIndex];
      }
      copy[slotIndex] = jugadorId;
      return copy;
    });
    // Asegurar que el jugador esté convocado
    if (!convocadosIds.includes(jugadorId)) {
      setConvocadosIds(prev => [...prev, jugadorId]);
    }
    setJugadorSeleccionadoId(null);
  };

  const handleQuitarDeSlot = (slotIndex: number) => {
    setCanchaSlots(prev => {
      const copy = [...prev];
      copy[slotIndex] = null;
      return copy;
    });
  };

  const handleQuitarJugadorDeCancha = (jugadorId: string) => {
    setCanchaSlots(prev => prev.map(id => id === jugadorId ? null : id));
  };

  const handleEditarNumero = (jugadorId: string, nuevoNumero: number) => {
    setDorsalesMap(prev => ({
      ...prev,
      [jugadorId]: nuevoNumero
    }));
  };

  // --- INTERCAMBIO RIVALES (Tocar A y luego B) ---
  const handleIntercambiarRivales = (idA: string, idB: string) => {
    const aTitularIdx = rivalesTitulares.findIndex(r => r.id === idA);
    const bTitularIdx = rivalesTitulares.findIndex(r => r.id === idB);
    const aSuplenteIdx = rivalesSuplentes.findIndex(r => r.id === idA);
    const bSuplenteIdx = rivalesSuplentes.findIndex(r => r.id === idB);

    if (aTitularIdx !== -1 && bTitularIdx !== -1) {
      // Intercambiar dos titulares rivales
      const copia = [...rivalesTitulares];
      const temp = copia[aTitularIdx];
      copia[aTitularIdx] = { ...copia[bTitularIdx], posicion: temp.posicion };
      copia[bTitularIdx] = { ...temp, posicion: copia[bTitularIdx].posicion };
      setRivalesTitulares(copia);
    } else if (aTitularIdx !== -1 && bSuplenteIdx !== -1) {
      // Titular por suplente
      const titCopia = [...rivalesTitulares];
      const supCopia = [...rivalesSuplentes];
      const tit = titCopia[aTitularIdx];
      const sup = supCopia[bSuplenteIdx];

      titCopia[aTitularIdx] = { ...sup, titular: true, posicion: tit.posicion };
      supCopia[bSuplenteIdx] = { ...tit, titular: false, posicion: undefined };

      setRivalesTitulares(titCopia);
      setRivalesSuplentes(supCopia);
    } else if (aSuplenteIdx !== -1 && bTitularIdx !== -1) {
      // Suplente por titular
      const titCopia = [...rivalesTitulares];
      const supCopia = [...rivalesSuplentes];
      const sup = supCopia[aSuplenteIdx];
      const tit = titCopia[bTitularIdx];

      titCopia[bTitularIdx] = { ...sup, titular: true, posicion: tit.posicion };
      supCopia[aSuplenteIdx] = { ...tit, titular: false, posicion: undefined };

      setRivalesTitulares(titCopia);
      setRivalesSuplentes(supCopia);
    } else if (aSuplenteIdx !== -1 && bSuplenteIdx !== -1) {
      // Intercambiar dos suplentes
      const supCopia = [...rivalesSuplentes];
      const temp = supCopia[aSuplenteIdx];
      supCopia[aSuplenteIdx] = supCopia[bSuplenteIdx];
      supCopia[bSuplenteIdx] = temp;
      setRivalesSuplentes(supCopia);
    }
  };

  const handleEditarNumeroRival = (id: string, nuevoNumero: number) => {
    setRivalesTitulares(prev => prev.map(r => r.id === id ? { ...r, numero: nuevoNumero } : r));
    setRivalesSuplentes(prev => prev.map(r => r.id === id ? { ...r, numero: nuevoNumero } : r));
  };

  const handleEditarNombreRival = (id: string, nuevoNombre: string) => {
    setRivalesTitulares(prev => prev.map(r => r.id === id ? { ...r, nombre: nuevoNombre } : r));
    setRivalesSuplentes(prev => prev.map(r => r.id === id ? { ...r, nombre: nuevoNombre } : r));
  };

  const handleEliminarSuplenteRival = (id: string) => {
    setRivalesSuplentes(prev => prev.filter(r => r.id !== id));
  };

  const handleAgregarSuplenteRivalSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const num = Number(nuevoSuplenteRivalNum);
    if (!num || num < 1) return;
    const nuevo: RivalItem = {
      id: `riv-s-${Date.now()}`,
      numero: num,
      nombre: nuevoSuplenteRivalNom.trim(),
      titular: false
    };
    setRivalesSuplentes(prev => [...prev, nuevo]);
    setNuevoSuplenteRivalNum(num + 1);
    setNuevoSuplenteRivalNom('');
    setModalAgregarSuplenteRival(false);
  };

  // --- INICIAR PARTIDO ---
  const handleComenzarPartido = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorValidacion(null);

    if (!rival.trim()) {
      setErrorValidacion('Por favor ingresá el nombre del equipo rival.');
      return;
    }

    // Titulares asignados en canchaSlots
    const titularesEnCancha = canchaSlots
      .map((id, idx) => ({ id, idx }))
      .filter((item): item is { id: string; idx: number } => item.id !== null);

    if (titularesEnCancha.length !== 11) {
      setErrorValidacion(`Se requieren exactamente 11 titulares en la cancha para ${nombreEquipo} (actualmente hay ${titularesEnCancha.length}).`);
      return;
    }

    setIniciando(true);

    const partidoId = 'partido-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const torneoElegido = torneos.find(t => t.id === torneoId);

    const nuevoPartido: Partido = {
      id: partidoId,
      fecha,
      rival: rival.trim(),
      modo_rival: modoRival,
      cancha: cancha.trim(),
      condicion,
      duracion_tiempo_min: duracionTiempoMin,
      estado: 'en_curso',
      creado_por: 'Director Técnico',
      tiempo_actual: 1,
      resultado_propio: 0,
      resultado_rival: 0,
      agregado_1T: 0,
      agregado_2T: 0,
      formacion_propia: formacionPropia,
      formacion_rival: formacionRival,
      created_at: Date.now(),
      torneo_id: torneoElegido ? torneoElegido.id : undefined,
      torneo_nombre: torneoElegido ? torneoElegido.nombre : undefined,
      etiqueta: etiqueta.trim() || undefined
    };

    // Convocados finales Halcones (titulares con posiciones x, y)
    const convocadosFinales: Convocado[] = [];
    const titularesSet = new Set<string>();

    titularesEnCancha.forEach(({ id: jugadorId, idx }) => {
      titularesSet.add(jugadorId);
      const coords = presetP[idx] || { pos: 'MC', x: 50, y: 50 };
      convocadosFinales.push({
        id: 'conv-' + partidoId + '-' + jugadorId,
        partido_id: partidoId,
        jugador_id: jugadorId,
        titular: true,
        posicion: coords.pos,
        posicion_x: coords.x,
        posicion_y: coords.y,
        posicion_tactica: coords.pos,
        tactica_x: coords.x,
        tactica_y: coords.y,
        numero: dorsalesMap[jugadorId] || idx + 1
      });
    });

    // Suplentes: los que están en convocadosIds pero no en titulares
    const suplentesIds = convocadosIds.filter(id => !titularesSet.has(id));
    suplentesIds.forEach((jugadorId, idx) => {
      convocadosFinales.push({
        id: 'conv-' + partidoId + '-' + jugadorId,
        partido_id: partidoId,
        jugador_id: jugadorId,
        titular: false,
        numero: dorsalesMap[jugadorId] || 12 + idx
      });
    });

    // Rivales finales (titulares y suplentes)
    const rivalesFinales: RivalJugador[] = [];

    rivalesTitulares.forEach((r, idx) => {
      const coords = presetR[idx] || { pos: 'MC', x: 50, y: 50 };
      rivalesFinales.push({
        id: 'riv-' + partidoId + '-' + r.numero + '-' + idx,
        partido_id: partidoId,
        numero: r.numero,
        nombre: r.nombre || undefined,
        titular: true,
        posicion: coords.pos,
        posicion_x: coords.x,
        posicion_y: coords.y,
        posicion_tactica: coords.pos,
        tactica_x: coords.x,
        tactica_y: coords.y
      });
    });

    rivalesSuplentes.forEach((r, idx) => {
      rivalesFinales.push({
        id: 'riv-' + partidoId + '-sup-' + r.numero + '-' + idx,
        partido_id: partidoId,
        numero: r.numero,
        nombre: r.nombre || undefined,
        titular: false
      });
    });

    // Crear borrador en vivo para el cronómetro
    const draft: PartidoEnVivoDraft = {
      partido: nuevoPartido,
      convocados: convocadosFinales,
      rivales: rivalesFinales,
      incidencias: [],
      timer: {
        tiempo: 1,
        segundosTotales: 0,
        corriendo: false,
        ultimoTimestamp: Date.now(),
        agregado1T: 0,
        agregado2T: 0,
        medioTiempoAlcanzado: false
      }
    };

    // Guardar también la última formación y slots como base del club para que se recuerde siempre
    const updatedClubConfig = StorageService.saveClubConfig({
      formacionPredeterminada: formacionPropia,
      titularesPredeterminados: canchaSlots.filter((id): id is string => Boolean(id)),
      slotsPredeterminados: canchaSlots
    });
    ApiService.guardarClubConfig(updatedClubConfig).catch(err => {
      console.warn('Sincronización en segundo plano de configuración táctica base:', err);
    });

    StorageService.savePartidoEnVivo(draft);
    
    // Sincronización en segundo plano sin bloquear el paso inmediato al partido en vivo
    ApiService.crearPartido(nuevoPartido, convocadosFinales, rivalesFinales).catch(err => {
      console.warn('Sincronización en segundo plano de partido nuevo:', err);
    });

    setIniciando(false);
    onIniciarPartido();
  };

  // Coordenadas tácticas según esquema elegido
  const presetP = FORMACIONES_DISPONIBLES[formacionPropia] || FORMACIONES_DISPONIBLES['4-3-3'];
  const presetR = FORMACIONES_DISPONIBLES[formacionRival] || FORMACIONES_DISPONIBLES['4-4-2'];

  const jugadoresCanchaRival: JugadorEnCancha[] = rivalesTitulares.slice(0, 11).map((r, idx) => {
    const coords = presetR[idx] || { pos: 'MC', x: 50, y: 50 };
    return {
      id: r.id,
      nombre: r.nombre ? r.nombre : `Rival #${r.numero}`,
      numero: r.numero,
      posicion: coords.pos,
      x: coords.x,
      y: coords.y,
      esRival: true,
      titular: true
    };
  });

  const suplentesCanchaRival: JugadorEnCancha[] = rivalesSuplentes.map((r) => ({
    id: r.id,
    nombre: r.nombre ? r.nombre : `Rival #${r.numero}`,
    numero: r.numero,
    x: 0,
    y: 0,
    esRival: true,
    titular: false
  }));

  // Mapa de orden canónico de posiciones para la lista de disponibles
  const POS_ORDER: Record<string, number> = {
    'Portero': 1, 'Arquero': 1, 'Guardameta': 1, 'ARQ': 1, 'POR': 1,
    'Defensor': 2, 'Defensa': 2, 'Lateral': 2, 'Central': 2, 'DEF': 2, 'DFC': 2, 'LI': 2, 'LD': 2,
    'Mediocampista': 3, 'Volante': 3, 'Medio': 3, 'MED': 3, 'MC': 3, 'MCD': 3, 'MCO': 3, 'MI': 3, 'MD': 3,
    'Delantero': 4, 'Extremo': 4, 'Punta': 4, 'DEL': 4, 'DC': 4, 'EI': 4, 'ED': 4
  };

  // Lista filtrada y ordenada de convocados para el lateral en Paso 3:
  // Se excluyen los jugadores que YA están ubicados en la cancha táctica para simplificar la selección
  const convocadosFiltradosTactica = convocadosIds
    .map(id => jugadoresMap.get(id))
    .filter((j): j is Jugador => !!j)
    .filter(j => !canchaSlots.includes(j.id))
    .filter(j => {
      if (!filtroConvocadosTactica.trim()) return true;
      const q = filtroConvocadosTactica.toLowerCase();
      const num = String(dorsalesMap[j.id] || j.numero || '');
      return j.nombre.toLowerCase().includes(q) || j.posicion.toLowerCase().includes(q) || num.includes(q);
    })
    .sort((a, b) => {
      if (ordenDisponiblesTactica === 'posicion') {
        const orderA = POS_ORDER[a.posicion] || 5;
        const orderB = POS_ORDER[b.posicion] || 5;
        if (orderA !== orderB) return orderA - orderB;
        return a.nombre.localeCompare(b.nombre);
      } else if (ordenDisponiblesTactica === 'nombre') {
        return a.nombre.localeCompare(b.nombre);
      } else {
        const numA = dorsalesMap[a.id] !== undefined ? dorsalesMap[a.id] : (a.numero || 999);
        const numB = dorsalesMap[b.id] !== undefined ? dorsalesMap[b.id] : (b.numero || 999);
        return numA - numB;
      }
    });

  const titularesAsignadosCount = canchaSlots.filter(Boolean).length;
  const suplentesCount = Math.max(0, convocadosIds.length - titularesAsignadosCount);

  // Jugadores activos ordenados según el criterio seleccionado en Paso 2
  const jugadoresActivosOrdenados = [...jugadoresActivos].sort((a, b) => {
    if (ordenConvocatoria === 'numero') {
      const numA = dorsalesMap[a.id] !== undefined ? dorsalesMap[a.id] : (a.numero || 999);
      const numB = dorsalesMap[b.id] !== undefined ? dorsalesMap[b.id] : (b.numero || 999);
      return numA - numB;
    }
    if (ordenConvocatoria === 'posicion') {
      const ordenPos: Record<string, number> = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
      const pA = ordenPos[a.posicion] || 5;
      const pB = ordenPos[b.posicion] || 5;
      if (pA !== pB) return pA - pB;
      const numA = dorsalesMap[a.id] !== undefined ? dorsalesMap[a.id] : (a.numero || 999);
      const numB = dorsalesMap[b.id] !== undefined ? dorsalesMap[b.id] : (b.numero || 999);
      return numA - numB;
    }
    return a.nombre.localeCompare(b.nombre);
  });

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-[#3ddc84]" />
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-wider">
              Configurar Nuevo Partido
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#9aa89f] mt-0.5">
            Definí los datos del encuentro, seleccioná la convocatoria y ordená las disposiciones tácticas en cancha.
          </p>
        </div>
      </div>

      {errorValidacion && (
        <div className="flex items-center gap-2 text-sm text-[#e63946] bg-[#e63946]/10 border border-[#e63946]/30 p-3.5 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorValidacion}</span>
        </div>
      )}

      {/* 1. Datos del Partido */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#3ddc84]" />
          1. Datos Generales del Encuentro
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              Equipo Rival *
            </label>
            <input
              type="text"
              required
              value={rival}
              onChange={(e) => setRival(e.target.value)}
              placeholder="Ej: Defensores del Norte"
              className="w-full px-3.5 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#9aa89f] uppercase flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#3ddc84]" />
                Etiqueta / Instancia
              </label>
              <span className="text-[10px] text-zinc-400">Ej: Fecha 1, Semifinal, Amistoso</span>
            </div>
            <input
              type="text"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="Ej: Fecha 1, Amistoso, Cuartos"
              className="w-full px-3.5 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
            />
            {/* Sugerencias rápidas de etiquetas */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['Fecha 1', 'Fecha 2', 'Fecha 3', 'Fecha 4', 'Fecha 5', 'Amistoso', 'Octavos', 'Cuartos', 'Semifinal', 'Final'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setEtiqueta(sug)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                    etiqueta === sug
                      ? 'bg-[#3ddc84] text-[#0f1712] font-bold border-[#3ddc84]'
                      : 'bg-[#0f1712] text-[#9aa89f] hover:text-white border-[#243d2c]'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              Fecha del Partido
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              Torneo / Temporada
            </label>
            <select
              value={torneoId}
              onChange={(e) => setTorneoId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
            >
              <option value="">(Sin Torneo / Partido Amistoso)</option>
              {torneos.map(t => (
                <option key={t.id} value={t.id}>
                  🏆 {t.nombre} {t.estado === 'activo' ? '🟢 (En curso)' : '🔒 (Cerrado)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              Cancha / Sede
            </label>
            <input
              type="text"
              value={cancha}
              onChange={(e) => setCancha(e.target.value)}
              placeholder={`Ej: Predio ${nombreEquipo} - Cancha 1`}
              className="w-full px-3.5 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              Condición
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCondicion('local')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  condicion === 'local'
                    ? 'bg-[#3ddc84] text-[#0f1712] border-[#3ddc84]'
                    : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                }`}
              >
                Local
              </button>
              <button
                type="button"
                onClick={() => setCondicion('visitante')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  condicion === 'visitante'
                    ? 'bg-[#3ddc84] text-[#0f1712] border-[#3ddc84]'
                    : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                }`}
              >
                Visitante
              </button>
              <button
                type="button"
                onClick={() => setCondicion('neutral')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  condicion === 'neutral'
                    ? 'bg-[#3ddc84] text-[#0f1712] border-[#3ddc84]'
                    : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                }`}
              >
                Neutral
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              Duración de cada Tiempo (minutos)
            </label>
            <div className="flex items-center gap-2">
              {[35, 40, 45].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDuracionTiempoMin(min)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    duracionTiempoMin === min
                      ? 'bg-[#3ddc84] text-[#0f1712] border-[#3ddc84]'
                      : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                  }`}
                >
                  {min}'
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              Registro del Rival
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModoRival('nombre_numero')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  modoRival === 'nombre_numero'
                    ? 'bg-[#ffb703]/20 border-[#ffb703] text-[#ffb703]'
                    : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                }`}
              >
                Número + Nombre
              </button>
              <button
                type="button"
                onClick={() => setModoRival('solo_numero')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  modoRival === 'solo_numero'
                    ? 'bg-[#ffb703]/20 border-[#ffb703] text-[#ffb703]'
                    : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                }`}
              >
                Solo Número
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Convocatoria y Dorsales del Equipo Propio */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#3ddc84]" />
              2. Convocatoria y Dorsales de {nombreEquipo}
            </h2>
            <p className="text-xs text-[#9aa89f]">
              Marcá quiénes van al partido y ajustá sus dorsales si es necesario. En el siguiente paso ordenarás el 11 titular en la cancha táctica.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-white">
              <strong className="text-[#3ddc84]">{convocadosIds.length}</strong>/{jugadoresActivos.length} Convocados
            </span>
            <button
              type="button"
              onClick={handleConvocarTodos}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-[#3ddc84] transition-all cursor-pointer"
            >
              Convocar Todos
            </button>
            <button
              type="button"
              onClick={handleConvocarSoloBase}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-[#9aa89f] hover:text-white transition-all cursor-pointer"
              title="Cargar los 11 titulares base"
            >
              Solo 11 Base
            </button>
            <button
              type="button"
              onClick={handleLimpiarConvocatoria}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#0f1712] border border-[#243d2c] hover:border-zinc-500 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Barra de Ordenamiento del Plantel Convocado */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#243d2c]/60 flex-wrap">
          <span className="text-xs font-medium text-zinc-400">
            Ordenar lista por:
          </span>
          <div className="flex items-center gap-1 bg-[#0f1712] p-1 rounded-xl border border-[#243d2c]">
            <button
              type="button"
              onClick={() => setOrdenConvocatoria('numero')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                ordenConvocatoria === 'numero'
                  ? 'bg-[#3ddc84] text-[#0f1712] shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>#</span> Por Número
            </button>
            <button
              type="button"
              onClick={() => setOrdenConvocatoria('posicion')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                ordenConvocatoria === 'posicion'
                  ? 'bg-[#3ddc84] text-[#0f1712] shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>⚽</span> Por Posición
            </button>
            <button
              type="button"
              onClick={() => setOrdenConvocatoria('nombre')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                ordenConvocatoria === 'nombre'
                  ? 'bg-[#3ddc84] text-[#0f1712] shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>🔤</span> Por Nombre
            </button>
          </div>
        </div>

        {/* Grilla de Selección de Convocatoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[320px] overflow-y-auto p-1">
          {jugadoresActivosOrdenados.map((j) => {
            const esConvocado = convocadosIds.includes(j.id);
            const badge = getPosicionBadge(j.posicion);
            const enSlot = canchaSlots.includes(j.id);

            return (
              <div
                key={j.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  esConvocado
                    ? 'bg-[#182a1f] border-[#3ddc84]/60 shadow-sm'
                    : 'bg-[#0f1712]/50 border-[#243d2c] opacity-65'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleConvocado(j.id)}
                    className="cursor-pointer text-[#3ddc84] shrink-0"
                    title={esConvocado ? "Desconvocar del partido" : "Convocar al partido"}
                  >
                    {esConvocado ? (
                      <CheckSquare className="w-5 h-5 text-[#3ddc84]" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <span 
                      onClick={() => handleToggleConvocado(j.id)}
                      className="text-xs font-semibold text-white truncate block cursor-pointer hover:text-[#3ddc84]"
                      title={j.nombre}
                    >
                      {j.nombre}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      {enSlot && (
                        <span className="text-[10px] text-[#3ddc84] font-bold">
                          • En Cancha
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edición de Dorsal para este partido */}
                <div className="flex items-center gap-1 bg-[#0f1712] px-2 py-1 rounded-lg border border-[#243d2c] shrink-0" title="Dorsal para este partido">
                  <span className="text-[10px] text-zinc-400 font-bold">#</span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={dorsalesMap[j.id] !== undefined ? dorsalesMap[j.id] : (j.numero || 1)}
                    onChange={(e) => handleEditarNumero(j.id, parseInt(e.target.value) || 1)}
                    className="w-7 bg-transparent text-center font-bold text-xs text-[#3ddc84] focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Disposición Táctica en Cancha (EQUIPO PROPIO) */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[#3ddc84]" />
              3. Disposición Táctica en Cancha ({nombreEquipo})
            </h2>
            <p className="text-xs text-[#9aa89f]">
              Arrastrá los jugadores de la lista hacia los puestos de la cancha o tocalos para asignarlos. Los no ubicados quedan como suplentes.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-white">
              <strong className="text-[#3ddc84]">{titularesAsignadosCount}</strong>/11 Titulares • <strong className="text-[#ffb703]">{suplentesCount}</strong> Suplentes
            </span>
            <button
              type="button"
              onClick={handleCargarBaseEnCancha}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-[#3ddc84] transition-all cursor-pointer flex items-center gap-1"
              title="Cargar la formación y titulares predeterminados del Plantel"
            >
              <Star className="w-3.5 h-3.5" />
              11 Base
            </button>
            <button
              type="button"
              onClick={handleGuardarComoBaseDelClub}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#3ddc84]/15 hover:bg-[#3ddc84] border border-[#3ddc84]/40 text-[#3ddc84] hover:text-[#0f1712] transition-all cursor-pointer flex items-center gap-1"
              title="Guardar este esquema y los 11 titulares actuales como base del club"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              Guardar como 11 Base
            </button>
            <button
              type="button"
              onClick={handleLlenarPrimeros11}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#0f1712] border border-[#243d2c] hover:border-zinc-400 text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              Auto-Completar 11
            </button>
            <button
              type="button"
              onClick={handleVaciarCancha}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#0f1712] border border-[#243d2c] hover:border-zinc-500 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              Vaciar Cancha
            </button>
          </div>
        </div>

        {/* Notificación de carga exitosa de 11 Base */}
        {mensajeExitoTactica && (
          <div className="p-2.5 rounded-xl bg-[#3ddc84]/15 border border-[#3ddc84]/40 text-[#3ddc84] text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <span>{mensajeExitoTactica}</span>
            <button
              type="button"
              onClick={() => setMensajeExitoTactica(null)}
              className="text-[#3ddc84] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selector de Esquema Táctico */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">
            Esquema:
          </span>
          {Object.keys(FORMACIONES_DISPONIBLES).map(esquema => (
            <button
              key={esquema}
              type="button"
              onClick={() => setFormacionPropia(esquema)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                formacionPropia === esquema
                  ? 'bg-[#3ddc84]/20 border-[#3ddc84] text-[#3ddc84]'
                  : 'bg-[#0f1712] border-[#243d2c] text-zinc-400 hover:text-white'
              }`}
            >
              {esquema}
            </button>
          ))}
        </div>

        {/* Contenedor en 2 Columnas: Convocados a la izquierda y Cancha Táctica a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          
          {/* Columna Izquierda: Lista de Convocados Disponibles (se quitan los que ya están en la cancha) */}
          <div className="lg:col-span-4 flex flex-col bg-[#0f1712] border border-[#243d2c] rounded-2xl p-3.5 space-y-3 max-h-[580px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#3ddc84]" />
                Disponibles ({convocadosFiltradosTactica.length})
              </span>
              <span className="text-[11px] text-[#9aa89f]">
                {jugadorSeleccionadoId ? '👉 Tocá un puesto' : 'Arrastrá o tocá'}
              </span>
            </div>

            {/* Opciones de ordenamiento de disponibles */}
            <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
              <span className="text-[11px] text-zinc-400 font-medium">Ordenar por:</span>
              <div className="inline-flex rounded-lg bg-[#182a1f] p-0.5 border border-[#243d2c]">
                <button
                  type="button"
                  onClick={() => setOrdenDisponiblesTactica('posicion')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    ordenDisponiblesTactica === 'posicion' ? 'bg-[#3ddc84] text-[#0f1712]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Posición
                </button>
                <button
                  type="button"
                  onClick={() => setOrdenDisponiblesTactica('nombre')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    ordenDisponiblesTactica === 'nombre' ? 'bg-[#3ddc84] text-[#0f1712]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Nombre
                </button>
                <button
                  type="button"
                  onClick={() => setOrdenDisponiblesTactica('numero')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    ordenDisponiblesTactica === 'numero' ? 'bg-[#3ddc84] text-[#0f1712]' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Número
                </button>
              </div>
            </div>

            {/* Buscador rápido de convocados */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por nombre o número..."
                value={filtroConvocadosTactica}
                onChange={(e) => setFiltroConvocadosTactica(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
              />
            </div>

            {/* Lista scrollable de convocados */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {convocadosFiltradosTactica.length > 0 ? (
                convocadosFiltradosTactica.map((j) => {
                  const slotIdx = canchaSlots.indexOf(j.id);
                  const estaEnCancha = slotIdx !== -1;
                  const posCancha = estaEnCancha ? (presetP[slotIdx]?.pos || 'TIT') : null;
                  const esSeleccionado = jugadorSeleccionadoId === j.id;
                  const badge = getPosicionBadge(j.posicion);

                  return (
                    <div
                      key={j.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ tipo: 'convocado', id: j.id }));
                      }}
                      onClick={() => {
                        // Toggle selección por toque
                        setJugadorSeleccionadoId(esSeleccionado ? null : j.id);
                      }}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer select-none ${
                        esSeleccionado
                          ? 'bg-[#3ddc84]/20 border-[#3ddc84] ring-2 ring-[#3ddc84]/40'
                          : estaEnCancha
                          ? 'bg-[#182a1f] border-[#3ddc84]/40 hover:border-[#3ddc84]'
                          : 'bg-[#182a1f]/60 border-[#243d2c] hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <GripVertical className="w-3.5 h-3.5 text-zinc-500 shrink-0 cursor-grab" />

                        {/* Dorsal editable directamente en la lista con box amplio y auto-select */}
                        <div 
                          className="flex items-center justify-center min-w-[48px] px-2 py-1 bg-[#0a110d] rounded-lg border border-[#243d2c] shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          title="Editar dorsal (hacé clic para cambiar)"
                        >
                          <span className="text-[10px] text-zinc-400 font-bold mr-0.5">#</span>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={dorsalesMap[j.id] !== undefined ? dorsalesMap[j.id] : (j.numero || 1)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleEditarNumero(j.id, parseInt(e.target.value) || 1)}
                            className="w-8 min-w-[32px] bg-transparent text-center font-bold text-xs text-[#3ddc84] focus:outline-none"
                          />
                        </div>

                        {/* Nombre completo */}
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-white truncate block" title={j.nombre}>
                            {j.nombre}
                          </span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* Estado y Acción */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            // Buscar primer slot vacío
                            const primerVacio = canchaSlots.indexOf(null);
                            if (primerVacio !== -1) {
                              handleAsignarJugadorASlot(primerVacio, j.id);
                            } else {
                              setErrorValidacion('La cancha ya tiene los 11 titulares asignados.');
                            }
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-[#3ddc84]/15 hover:bg-[#3ddc84] text-[#3ddc84] hover:text-[#0f1712] transition-colors flex items-center gap-0.5 cursor-pointer"
                          title="Ubicar en el primer puesto libre"
                        >
                          + Cancha
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-400 text-xs px-2">
                  {titularesAsignadosCount === 11 ? (
                    <div className="space-y-1.5">
                      <span className="text-xl block">⚽</span>
                      <p className="font-semibold text-[#3ddc84]">11 Titulares asignados en cancha</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">Para liberar un puesto o mover un jugador, tocalo o arrastralo directamente en la cancha.</p>
                    </div>
                  ) : (
                    <p>No hay jugadores disponibles para ubicar</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Cancha Táctica Interactiva con Slots */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {jugadorSeleccionadoId && (
              <div className="w-full mb-2 p-2 bg-[#3ddc84]/15 border border-[#3ddc84]/40 rounded-xl text-xs text-[#3ddc84] flex items-center justify-between animate-fadeIn">
                <span>
                  Tocá cualquier puesto en la cancha para ubicar a <strong>{jugadoresMap.get(jugadorSeleccionadoId)?.nombre}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setJugadorSeleccionadoId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Cancha de fútbol verde profesional */}
            <div className="relative w-full max-w-[580px] aspect-[4/5] bg-gradient-to-b from-[#14532d] via-[#15803d] to-[#14532d] rounded-2xl border-4 border-[#243d2c] shadow-2xl overflow-hidden p-2 select-none">
              {/* Líneas de la cancha (Césped profesional) */}
              <div className="absolute inset-3 border-2 border-white/40 rounded-lg pointer-events-none">
                {/* Línea media */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40 -translate-y-1/2" />
                {/* Círculo central */}
                <div className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
                {/* Área Grande Superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-b-2 border-x-2 border-white/40" />
                {/* Área Chica Superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 border-b-2 border-x-2 border-white/40" />
                {/* Área Grande Inferior */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-x-2 border-white/40" />
                {/* Área Chica Inferior */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 border-t-2 border-x-2 border-white/40" />
              </div>

              {/* Los 11 puestos tácticos */}
              {presetP.slice(0, 11).map((coords, slotIdx) => {
                const jugadorId = canchaSlots[slotIdx];
                const jugador = jugadorId ? jugadoresMap.get(jugadorId) : null;
                const dorsal = jugadorId ? (dorsalesMap[jugadorId] || jugador?.numero || (slotIdx + 1)) : null;

                return (
                  <div
                    key={slotIdx}
                    style={{
                      position: 'absolute',
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const data = e.dataTransfer.getData('text/plain');
                      if (data) {
                        try {
                          const parsed = JSON.parse(data);
                          if (parsed.id) {
                            handleAsignarJugadorASlot(slotIdx, parsed.id);
                          }
                        } catch {}
                      }
                    }}
                    onClick={() => {
                      if (jugadorSeleccionadoId) {
                        handleAsignarJugadorASlot(slotIdx, jugadorSeleccionadoId);
                      } else if (jugadorId) {
                        // Si ya está ocupado y no hay seleccionado, seleccionamos a este jugador
                        setJugadorSeleccionadoId(jugadorId);
                      }
                    }}
                    className="flex flex-col items-center justify-center cursor-pointer group z-10 transition-transform active:scale-95"
                  >
                    {jugador ? (
                      /* Slot Ocupado */
                      <div className="flex flex-col items-center">
                        <div 
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify({ tipo: 'slot', id: jugador.id }));
                          }}
                          style={{ borderColor: colorClub }}
                          className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#182a1f] border-2 shadow-xl flex items-center justify-center text-white font-display font-bold text-sm sm:text-base ring-2 ring-black/40 group-hover:border-white transition-all"
                        >
                          <span>{dorsal}</span>
                          
                          {/* Botón quitar de la cancha */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuitarDeSlot(slotIdx);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#e63946] text-white flex items-center justify-center text-xs font-bold opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md cursor-pointer hover:scale-110"
                            title="Quitar de este puesto"
                          >
                            ×
                          </button>
                        </div>

                        {/* Nombre y posición en cápsula semitransparente */}
                        <div className="mt-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs border border-white/20 text-center max-w-[100px] shadow-md">
                          <span className="text-[10px] sm:text-[11px] font-bold text-white truncate block leading-tight">
                            {jugador.nombre}
                          </span>
                          <span 
                            className="text-[8px] sm:text-[9px] font-semibold block uppercase"
                            style={{ color: colorClub }}
                          >
                            {coords.pos}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Slot Vacío */
                      <div className={`flex flex-col items-center ${jugadorSeleccionadoId ? 'animate-pulse' : ''}`}>
                        <div 
                          style={jugadorSeleccionadoId ? { borderColor: colorClub } : undefined}
                          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 border-2 border-dashed border-white/60 hover:border-white flex items-center justify-center text-white font-bold text-xs shadow-md transition-all"
                        >
                          <span>{coords.pos}</span>
                        </div>
                        <div className="mt-0.5 px-1 py-0.2 rounded bg-black/50 text-[8px] text-zinc-300 font-medium">
                          Vacío
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Jugadores del Rival con Disposición Táctica Interactiva */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: colorRivalConfig }} />
              <span>4. Jugadores del Rival ({rival || 'Equipo Rival'})</span>
            </h2>
            <p className="text-xs text-[#9aa89f]">
              Disposición táctica. Tocá y tocá otro para intercambiarlos. Doble clic para cambiar número o agregá nombres.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-white">
              <strong style={{ color: colorRivalConfig }}>{rivalesTitulares.length}</strong> Titulares • <strong className="text-zinc-400">{rivalesSuplentes.length}</strong> Suplentes
            </span>
          </div>
        </div>

        {/* Selector de esquema táctico del Rival */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">
            Esquema Rival:
          </span>
          {Object.keys(FORMACIONES_DISPONIBLES).map(esquema => (
            <button
              key={esquema}
              type="button"
              onClick={() => setFormacionRival(esquema)}
              style={
                formacionRival === esquema
                  ? { backgroundColor: `${colorRivalConfig}26`, borderColor: colorRivalConfig, color: colorRivalConfig }
                  : undefined
              }
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                formacionRival === esquema
                  ? 'shadow-sm'
                  : 'bg-[#0f1712] border-[#243d2c] text-zinc-400 hover:text-white'
              }`}
            >
              {esquema}
            </button>
          ))}
        </div>

        {/* Cancha Táctica Interactiva del Rival */}
        <div className="flex justify-center p-2 bg-[#0a110d] border border-[#243d2c]/60 rounded-2xl">
          <TacticaCancha
            titulo={`Formación Rival: ${rival || 'Equipo Rival'} (${formacionRival})`}
            jugadores={jugadoresCanchaRival}
            suplentes={suplentesCanchaRival}
            colorHex={colorRivalConfig}
            permitirIntercambio={true}
            onIntercambiarJugadores={handleIntercambiarRivales}
            onEditarNumero={handleEditarNumeroRival}
            onEditarNombre={handleEditarNombreRival}
            onAgregarSuplenteClick={() => setModalAgregarSuplenteRival(true)}
            onEliminarSuplente={handleEliminarSuplenteRival}
          />
        </div>

        {/* Tabla / Lista de Nombres y Dorsales del Rival */}
        <div className="border-t border-[#243d2c] pt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Nombres y Apellidos de los Jugadores Rivales (Opcional)
            </h3>
            <span className="text-[11px] text-zinc-500">
              {rivalesTitulares.length} Titulares / {rivalesSuplentes.length} Suplentes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto p-1 mb-3">
            {[...rivalesTitulares, ...rivalesSuplentes].map((r) => (
              <div
                key={r.id}
                className="p-2 rounded-xl bg-[#0f1712] border border-[#243d2c] flex items-center gap-2"
              >
                <div className="w-12">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={r.numero}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleEditarNumeroRival(r.id, parseInt(e.target.value) || 1)}
                    style={{ color: colorRivalConfig }}
                    className="w-full px-1.5 py-1 bg-[#182a1f] border border-[#243d2c] rounded-lg text-center font-display font-bold text-xs focus:outline-none"
                    title="Dorsal Rival"
                  />
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={r.nombre}
                    onChange={(e) => handleEditarNombreRival(r.id, e.target.value)}
                    placeholder="Nombre / Apellido"
                    className="w-full px-2 py-1 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <span 
                  style={r.titular ? { backgroundColor: `${colorRivalConfig}26`, color: colorRivalConfig } : undefined}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    r.titular ? '' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {r.titular ? 'TIT' : 'SUP'}
                </span>
              </div>
            ))}
          </div>

          {/* Botón de Agregar Suplente Rival colocado ergonómicamente en la zona inferior */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setModalAgregarSuplenteRival(true)}
              style={{ color: colorRivalConfig, borderColor: `${colorRivalConfig}40` }}
              className="px-4 py-2 bg-[#0f1712] hover:bg-[#243d2c] text-xs font-semibold rounded-xl border flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" style={{ color: colorRivalConfig }} />
              Agregar suplente Rival
            </button>
            <span className="text-[11px] text-zinc-500">
              Total jugadores rivales: {rivalesTitulares.length + rivalesSuplentes.length}
            </span>
          </div>
        </div>
      </div>

      {/* Botón de Lanzamiento */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 py-3 rounded-xl bg-[#0f1712] border border-[#243d2c] text-sm text-[#9aa89f] hover:text-white font-medium cursor-pointer transition-all"
        >
          Cancelar
        </button>

        <button
          id="btn-iniciar-partido-submit"
          type="button"
          onClick={handleComenzarPartido}
          disabled={iniciando}
          className="px-7 py-3.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold font-display text-lg tracking-wider rounded-xl shadow-xl shadow-[#3ddc84]/25 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
        >
          <Play className="w-5 h-5 fill-current" />
          {iniciando ? 'INICIALIZANDO...' : 'INICIAR PARTIDO EN VIVO'}
        </button>
      </div>

      {/* MODAL: Agregar Suplente Rival */}
      {modalAgregarSuplenteRival && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3 mb-3">
              <h3 className="font-display font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: colorRivalConfig }} />
                <span>Agregar Suplente Rival</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalAgregarSuplenteRival(false)}
                className="text-[#9aa89f] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                  Número / Dorsal *
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  required
                  value={nuevoSuplenteRivalNum}
                  onChange={(e) => setNuevoSuplenteRivalNum(Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAgregarSuplenteRivalSubmit();
                    }
                  }}
                  className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white font-bold text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                  Nombre o Apellido (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Martínez"
                  value={nuevoSuplenteRivalNom}
                  onChange={(e) => setNuevoSuplenteRivalNom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAgregarSuplenteRivalSubmit();
                    }
                  }}
                  className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-[#243d2c] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAgregarSuplenteRival(false)}
                  className="px-3.5 py-1.5 bg-transparent border border-[#243d2c] text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAgregarSuplenteRivalSubmit}
                  style={{ backgroundColor: colorRivalConfig, color: getContrastingTextColor(colorRivalConfig) }}
                  className="px-4 py-1.5 font-bold rounded-lg cursor-pointer transition-opacity hover:opacity-90 shadow-md"
                >
                  Agregar Suplente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
