/**
 * @file NuevoPartidoView.tsx
 * Configuración previa de un partido nuevo:
 * - Datos generales (rival, fecha, cancha, condición, duración del tiempo)
 * - Convocatoria de jugadores del plantel propio (marcando titulares y suplentes con dorsales)
 * - 3. Disposición Táctica en Cancha para el equipo propio (con esquemas 4-3-3, 4-4-2, 4-1-3-2, 4-3-1-2, 3-5-2, 4-2-3-1,
 *   intercambio interactivo tocando a uno y luego a otro, edición de dorsal con doble clic y agregado de suplentes).
 * - 4. Jugadores del Rival con Disposición Táctica interactiva (por defecto 4-4-2 con orden 1; 4,2,6,3; 8,5,10,7; 11,9,
 *   edición de números y nombres, tácticas y agregado de suplentes).
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
  Tag
} from 'lucide-react';
import { 
  Jugador, 
  Partido, 
  Convocado, 
  RivalJugador, 
  ModoRival, 
  CondicionPartido 
} from '../types';
import { getPosicionBadge } from '../utils/footballCalculations';
import { ApiService } from '../services/api';
import { StorageService, PartidoEnVivoDraft } from '../services/storage';
import { TacticaCancha, JugadorEnCancha } from './TacticaCancha';
import { FORMACIONES_DISPONIBLES, PosicionTactico } from '../utils/formations';

export { FORMACIONES_DISPONIBLES };

interface NuevoPartidoViewProps {
  jugadores: Jugador[];
  onIniciarPartido: () => void;
  onCancelar: () => void;
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
  onCancelar
}) => {
  // Datos generales
  const torneos = StorageService.getTorneos();
  const nombreEquipo = StorageService.getNombreEquipo();
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
  const [formacionPropia, setFormacionPropia] = useState<string>('4-3-3');
  const [formacionRival, setFormacionRival] = useState<string>('4-4-2');

  // Lista de jugadores activos del club
  const jugadoresActivos = jugadores.filter(j => j.activo);

  // Dorsales asignados para el partido: { [jugadorId]: numero }
  const [dorsalesMap, setDorsalesMap] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    jugadoresActivos.forEach((j, idx) => {
      init[j.id] = idx + 1;
    });
    return init;
  });

  // Orden de Titulares de Halcones (IDs en orden táctico de la formación 0 a 10)
  const [ordenTitulares, setOrdenTitulares] = useState<string[]>(() => {
    return jugadoresActivos.slice(0, 11).map(j => j.id);
  });

  // Orden de Suplentes de Halcones (IDs en orden del banco)
  const [ordenSuplentes, setOrdenSuplentes] = useState<string[]>(() => {
    return jugadoresActivos.slice(11, 16).map(j => j.id);
  });

  // Modal para agregar suplente al banco de Halcones
  const [modalAgregarSuplenteHalcones, setModalAgregarSuplenteHalcones] = useState(false);

  // RIVALES: Por defecto 4-4-2 con orden 1; 4,2,6,3 ; 8,5,10,7 ; 11,9
  const [rivalesTitulares, setRivalesTitulares] = useState<RivalItem[]>(() => {
    // 4-4-2 pos order: 0: ARQ (1), 1: LD (4), 2: DFC (2), 3: DFC (6), 4: LI (3), 5: MD (8), 6: MC (5), 7: MC (10), 8: MI (7), 9: DC (11), 10: DC (9)
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
  const [iniciando, setIniciando] = useState(false);

  // Diccionario de jugadores de Halcones para lookup rápido
  const jugadoresMap = new Map<string, Jugador>(jugadores.map(j => [j.id, j]));

  // --- INTERCAMBIO HALCONES (Tocar A y luego B) ---
  const handleIntercambiarHalcones = (idA: string, idB: string) => {
    const aEsTitular = ordenTitulares.includes(idA);
    const bEsTitular = ordenTitulares.includes(idB);
    const aEsSuplente = ordenSuplentes.includes(idA);
    const bEsSuplente = ordenSuplentes.includes(idB);

    if (aEsTitular && bEsTitular) {
      // Intercambiar posiciones entre dos titulares
      const nuevoTitulares = [...ordenTitulares];
      const idxA = nuevoTitulares.indexOf(idA);
      const idxB = nuevoTitulares.indexOf(idB);
      nuevoTitulares[idxA] = idB;
      nuevoTitulares[idxB] = idA;
      setOrdenTitulares(nuevoTitulares);
    } else if (aEsTitular && bEsSuplente) {
      // Titular A pasa al banco, Suplente B entra a la cancha en el lugar de A
      const nuevoTitulares = [...ordenTitulares];
      const nuevoSuplentes = [...ordenSuplentes];
      const idxA = nuevoTitulares.indexOf(idA);
      const idxB = nuevoSuplentes.indexOf(idB);
      nuevoTitulares[idxA] = idB;
      nuevoSuplentes[idxB] = idA;
      setOrdenTitulares(nuevoTitulares);
      setOrdenSuplentes(nuevoSuplentes);
    } else if (aEsSuplente && bEsTitular) {
      // Suplente A entra a la cancha en el lugar de Titular B
      const nuevoTitulares = [...ordenTitulares];
      const nuevoSuplentes = [...ordenSuplentes];
      const idxA = nuevoSuplentes.indexOf(idA);
      const idxB = nuevoTitulares.indexOf(idB);
      nuevoTitulares[idxB] = idA;
      nuevoSuplentes[idxA] = idB;
      setOrdenTitulares(nuevoTitulares);
      setOrdenSuplentes(nuevoSuplentes);
    } else if (aEsSuplente && bEsSuplente) {
      // Intercambiar orden en el banco
      const nuevoSuplentes = [...ordenSuplentes];
      const idxA = nuevoSuplentes.indexOf(idA);
      const idxB = nuevoSuplentes.indexOf(idB);
      nuevoSuplentes[idxA] = idB;
      nuevoSuplentes[idxB] = idA;
      setOrdenSuplentes(nuevoSuplentes);
    }
  };

  // Editar dorsal de Halcones directamente en la cancha
  const handleEditarNumeroHalcones = (jugadorId: string, nuevoNumero: number) => {
    setDorsalesMap(prev => ({
      ...prev,
      [jugadorId]: nuevoNumero
    }));
  };

  // Quitar suplente de Halcones
  const handleEliminarSuplenteHalcones = (jugadorId: string) => {
    setOrdenSuplentes(prev => prev.filter(id => id !== jugadorId));
  };

  // Agregar suplente a Halcones
  const handleAgregarSuplenteHalcones = (jugadorId: string) => {
    if (!ordenTitulares.includes(jugadorId) && !ordenSuplentes.includes(jugadorId)) {
      setOrdenSuplentes(prev => [...prev, jugadorId]);
    }
    setModalAgregarSuplenteHalcones(false);
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

  const handleAgregarSuplenteRivalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevo: RivalItem = {
      id: `riv-s-${Date.now()}`,
      numero: Number(nuevoSuplenteRivalNum) || 12,
      nombre: nuevoSuplenteRivalNom.trim(),
      titular: false
    };
    setRivalesSuplentes(prev => [...prev, nuevo]);
    setNuevoSuplenteRivalNum(Number(nuevoSuplenteRivalNum) + 1);
    setNuevoSuplenteRivalNom('');
    setModalAgregarSuplenteRival(false);
  };

  // --- ARMAR JUGADORES PARA CANCHA HALCONES ---
  const presetP = FORMACIONES_DISPONIBLES[formacionPropia] || FORMACIONES_DISPONIBLES['4-3-3'];
  const jugadoresCanchaPropia: JugadorEnCancha[] = ordenTitulares.map((jugadorId, idx) => {
    const j = jugadoresMap.get(jugadorId);
    const coords = presetP[idx] || { pos: 'MC', x: 50, y: 50 };
    return {
      id: jugadorId,
      nombre: j?.nombre || `Jugador ${idx + 1}`,
      numero: dorsalesMap[jugadorId] || idx + 1,
      posicion: coords.pos || j?.posicion,
      x: coords.x,
      y: coords.y,
      titular: true
    };
  });

  const suplentesCanchaPropia: JugadorEnCancha[] = ordenSuplentes.map((jugadorId, idx) => {
    const j = jugadoresMap.get(jugadorId);
    return {
      id: jugadorId,
      nombre: j?.nombre || `Suplente ${idx + 1}`,
      numero: dorsalesMap[jugadorId] || 12 + idx,
      posicion: j?.posicion,
      x: 0,
      y: 0,
      titular: false
    };
  });

  // --- ARMAR JUGADORES PARA CANCHA RIVAL ---
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

  const suplentesCanchaRival: JugadorEnCancha[] = rivalesSuplentes.map((r, idx) => ({
    id: r.id,
    nombre: r.nombre ? r.nombre : `Rival #${r.numero}`,
    numero: r.numero,
    x: 0,
    y: 0,
    esRival: true,
    titular: false
  }));

  // Jugadores disponibles para agregar como suplente a Halcones
  const jugadoresDisponiblesHalcones = jugadoresActivos.filter(
    j => !ordenTitulares.includes(j.id) && !ordenSuplentes.includes(j.id)
  );

  // --- INICIAR PARTIDO ---
  const handleComenzarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!rival.trim()) {
      setErrorValidacion('Por favor ingresá el nombre del equipo rival.');
      return;
    }

    if (ordenTitulares.length !== 11) {
      setErrorValidacion(`Se requieren exactamente 11 titulares para ${nombreEquipo} (actualmente hay ${ordenTitulares.length}).`);
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
      created_at: Date.now(),
      torneo_id: torneoElegido ? torneoElegido.id : undefined,
      torneo_nombre: torneoElegido ? torneoElegido.nombre : undefined,
      etiqueta: etiqueta.trim() || undefined
    };

    // Convocados finales Halcones (titulares con posiciones x, y)
    const convocadosFinales: Convocado[] = [];

    ordenTitulares.forEach((jugadorId, idx) => {
      const coords = presetP[idx] || { pos: 'MC', x: 50, y: 50 };
      convocadosFinales.push({
        id: 'conv-' + partidoId + '-' + jugadorId,
        partido_id: partidoId,
        jugador_id: jugadorId,
        titular: true,
        posicion: coords.pos,
        posicion_x: coords.x,
        posicion_y: coords.y,
        numero: dorsalesMap[jugadorId] || idx + 1
      });
    });

    ordenSuplentes.forEach((jugadorId, idx) => {
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
        posicion_y: coords.y
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

    StorageService.savePartidoEnVivo(draft);
    await ApiService.crearPartido(nuevoPartido, convocadosFinales, rivalesFinales);

    setIniciando(false);
    onIniciarPartido();
  };

  return (
    <form onSubmit={handleComenzarPartido} className="space-y-6 pb-16">
      
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
            Definí los datos del encuentro, ordená las disposiciones tácticas en cancha e iniciá el cronómetro.
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
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondicion('local')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  condicion === 'local'
                    ? 'bg-[#3ddc84]/15 border-[#3ddc84] text-[#3ddc84]'
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
                    ? 'bg-[#3ddc84]/15 border-[#3ddc84] text-[#3ddc84]'
                    : 'bg-[#0f1712] border-[#243d2c] text-[#9aa89f]'
                }`}
              >
                Visitante
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#3ddc84]" />
              2. Convocatoria y Dorsales de {nombreEquipo}
            </h2>
            <p className="text-xs text-[#9aa89f]">
              Asigná los dorsales para este partido. Los titulares y suplentes se ordenan e intercambian directamente en la cancha táctica.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-white">
              <strong className="text-[#3ddc84]">{ordenTitulares.length}</strong>/11 Titulares • <strong className="text-[#ffb703]">{ordenSuplentes.length}</strong> Suplentes
            </span>
          </div>
        </div>

        {/* Grilla de Convocados rápida para dorsales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto p-1">
          {jugadoresActivos.map((j) => {
            const esTitular = ordenTitulares.includes(j.id);
            const esSuplente = ordenSuplentes.includes(j.id);
            const esConvocado = esTitular || esSuplente;
            const badge = getPosicionBadge(j.posicion);

            return (
              <div
                key={j.id}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                  esTitular
                    ? 'bg-[#182a1f] border-[#3ddc84]/60'
                    : esSuplente
                    ? 'bg-[#182a1f] border-[#ffb703]/50'
                    : 'bg-[#0f1712]/60 border-[#243d2c] opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white truncate block">
                      {j.nombre}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {esConvocado ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 bg-[#0f1712] px-2 py-1 rounded-lg border border-[#243d2c]" title="Dorsal">
                      <span className="text-[10px] text-zinc-400 font-bold">#</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={dorsalesMap[j.id] || 1}
                        onChange={(e) => handleEditarNumeroHalcones(j.id, parseInt(e.target.value) || 1)}
                        className="w-8 bg-transparent text-center font-bold text-xs text-[#3ddc84] focus:outline-none"
                      />
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                      esTitular ? 'bg-[#3ddc84] text-[#0f1712]' : 'bg-[#ffb703] text-[#0f1712]'
                    }`}>
                      {esTitular ? 'TIT' : 'SUP'}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAgregarSuplenteHalcones(j.id)}
                    className="px-2 py-1 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-xs font-semibold text-[#9aa89f] hover:text-white rounded-lg cursor-pointer"
                  >
                    Convocar
                  </button>
                )}
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
              Intercambiá puestos tocando a un jugador y luego a otro (titulares y suplentes). Doble clic sobre el dorsal para editarlo.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0f1712] px-3 py-1.5 rounded-xl border border-[#243d2c]">
            <span className="text-xs font-bold text-[#3ddc84]">⚽ {nombreEquipo}: {formacionPropia}</span>
          </div>
        </div>

        {/* Selector de esquema táctico con 4-1-3-2 y 4-3-1-2 */}
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

        {/* Cancha Táctica Interactiva Equipo Propio */}
        <div className="flex justify-center p-2 bg-[#0a110d] border border-[#243d2c]/60 rounded-2xl">
          <TacticaCancha
            titulo={`Formación ${nombreEquipo} (${formacionPropia})`}
            jugadores={jugadoresCanchaPropia}
            suplentes={suplentesCanchaPropia}
            colorEquipo="verde"
            permitirIntercambio={true}
            onIntercambiarJugadores={handleIntercambiarHalcones}
            onEditarNumero={handleEditarNumeroHalcones}
            onAgregarSuplenteClick={() => setModalAgregarSuplenteHalcones(true)}
            onEliminarSuplente={handleEliminarSuplenteHalcones}
          />
        </div>
      </div>

      {/* 4. Jugadores del Rival con Disposición Táctica Interactiva */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#ffb703]" />
              4. Jugadores del Rival ({rival || 'Equipo Rival'})
            </h2>
            <p className="text-xs text-[#9aa89f]">
              Disposición táctica por defecto 4-4-2 (1; 4,2,6,3; 8,5,10,7; 11,9). Tocá y tocá otro para intercambiarlos. Doble clic para cambiar número o agregá nombres.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalAgregarSuplenteRival(true)}
              className="px-3 py-1.5 bg-[#0f1712] hover:bg-[#243d2c] text-white text-xs font-semibold rounded-lg border border-[#243d2c] flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#ffb703]" />
              Agregar Suplente Rival
            </button>
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
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                formacionRival === esquema
                  ? 'bg-[#ffb703]/20 border-[#ffb703] text-[#ffb703]'
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
            colorEquipo="amarillo"
            permitirIntercambio={true}
            onIntercambiarJugadores={handleIntercambiarRivales}
            onEditarNumero={handleEditarNumeroRival}
            onEditarNombre={handleEditarNombreRival}
            onAgregarSuplenteClick={() => setModalAgregarSuplenteRival(true)}
            onEliminarSuplente={handleEliminarSuplenteRival}
          />
        </div>

        {/* Tabla / Lista de Nombres y Dorsales del Rival (Opcional para edición rápida de nombres) */}
        <div className="border-t border-[#243d2c] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Nombres y Apellidos de los Jugadores Rivales (Opcional)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto p-1">
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
                    onChange={(e) => handleEditarNumeroRival(r.id, parseInt(e.target.value) || 1)}
                    className="w-full px-1.5 py-1 bg-[#182a1f] border border-[#243d2c] rounded-lg text-center font-display font-bold text-xs text-[#ffb703] focus:outline-none focus:border-[#ffb703]"
                    title="Dorsal Rival"
                  />
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={r.nombre}
                    onChange={(e) => handleEditarNombreRival(r.id, e.target.value)}
                    placeholder="Nombre / Apellido"
                    className="w-full px-2 py-1 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ffb703]"
                  />
                </div>

                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  r.titular ? 'bg-amber-400/20 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {r.titular ? 'TIT' : 'SUP'}
                </span>
              </div>
            ))}
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
          type="submit"
          disabled={iniciando}
          className="px-7 py-3.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold font-display text-lg tracking-wider rounded-xl shadow-xl shadow-[#3ddc84]/25 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
        >
          <Play className="w-5 h-5 fill-current" />
          {iniciando ? 'INICIALIZANDO...' : 'INICIAR PARTIDO EN VIVO'}
        </button>
      </div>

      {/* MODAL: Agregar Suplente a Halcones */}
      {modalAgregarSuplenteHalcones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-md p-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3 mb-3">
              <h3 className="font-display font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#3ddc84]" />
                Agregar Suplente al Banco
              </h3>
              <button
                type="button"
                onClick={() => setModalAgregarSuplenteHalcones(false)}
                className="text-[#9aa89f] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#9aa89f] mb-3">
              Seleccioná un jugador del plantel que aún no está convocado para sumarlo al banco de relevos:
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {jugadoresDisponiblesHalcones.length > 0 ? (
                jugadoresDisponiblesHalcones.map(j => {
                  const badge = getPosicionBadge(j.posicion);
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handleAgregarSuplenteHalcones(j.id)}
                      className="w-full flex items-center justify-between p-2.5 bg-[#0f1712] hover:bg-[#1f3527] border border-[#243d2c] hover:border-[#3ddc84] rounded-xl text-left transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{j.nombre}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-xs text-[#3ddc84] font-bold flex items-center gap-1">
                        + Agregar
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500 py-3 text-center italic">
                  Todos los jugadores activos del plantel ya están convocados.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-[#243d2c] flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setModalAgregarSuplenteHalcones(false)}
                className="px-4 py-1.5 bg-transparent border border-[#243d2c] text-xs font-semibold text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Agregar Suplente Rival */}
      {modalAgregarSuplenteRival && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3 mb-3">
              <h3 className="font-display font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#ffb703]" />
                Agregar Suplente Rival
              </h3>
              <button
                type="button"
                onClick={() => setModalAgregarSuplenteRival(false)}
                className="text-[#9aa89f] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAgregarSuplenteRivalSubmit} className="space-y-3 text-xs">
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
                  className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-[#ffb703]"
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
                  className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#ffb703]"
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
                  type="submit"
                  className="px-4 py-1.5 bg-[#ffb703] hover:bg-[#e0a102] text-[#0f1712] font-bold rounded-lg cursor-pointer transition-colors shadow-md"
                >
                  Agregar Suplente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </form>
  );
};
