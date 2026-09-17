/**
 * @file PlantelView.tsx
 * Gestión del plantel propio permanente.
 * Alta, edición, filtrado por posición y baja lógica (activo/inactivo).
 */

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Filter,
  Save,
  X,
  LayoutGrid,
  Star,
  Check,
  CheckSquare,
  Square,
  List as ListIcon,
  GripVertical
} from 'lucide-react';
import { Jugador, PosicionJugador, RolUsuario } from '../types';
import { getPosicionBadge } from '../utils/footballCalculations';
import { ApiService } from '../services/api';
import { FORMACIONES_DISPONIBLES } from '../utils/formations';
import { StorageService } from '../services/storage';
import { TacticaCancha, JugadorEnCancha } from './TacticaCancha';

interface PlantelViewProps {
  jugadores: Jugador[];
  onActualizarJugadores: () => void;
  rol: RolUsuario;
  nombreEquipo?: string;
  colorPropio?: string;
}

export const PlantelView: React.FC<PlantelViewProps> = ({
  jugadores,
  onActualizarJugadores,
  rol,
  nombreEquipo,
  colorPropio
}) => {
  const nombreClub = nombreEquipo || StorageService.getNombreEquipo();
  const colorClub = colorPropio || StorageService.getColorPropio();

  const [busqueda, setBusqueda] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('activos');
  const [criterioOrden, setCriterioOrden] = useState<'numero' | 'nombre' | 'posicion'>('numero');
  const [vistaModo, setVistaModo] = useState<'tarjetas' | 'lista'>('tarjetas');

  // Modal de alta/edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [jugadorEnEdicion, setJugadorEnEdicion] = useState<Partial<Jugador>>({
    nombre: '',
    posicion: 'Mediocampista',
    activo: true
  });
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Configuración Táctica y 11 Titular por Defecto con Cancha Interactiva
  const [modalTacticaAbierto, setModalTacticaAbierto] = useState(false);
  const [formacionPredeterminada, setFormacionPredeterminada] = useState<string>(
    () => StorageService.getFormacionPredeterminada() || '4-3-3'
  );
  const [canchaSlotsBase, setCanchaSlotsBase] = useState<(string | null)[]>(() => {
    const base = StorageService.getTitularesPredeterminados();
    const slots: (string | null)[] = Array(11).fill(null);
    base.slice(0, 11).forEach((id, idx) => {
      slots[idx] = id;
    });
    return slots;
  });
  const [jugadorSeleccionadoId, setJugadorSeleccionadoId] = useState<string | null>(null);
  const [busquedaTactica, setBusquedaTactica] = useState('');
  const [guardandoTactica, setGuardandoTactica] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Edición rápida de dorsal inline en la tarjeta
  const [editandoDorsalId, setEditandoDorsalId] = useState<string | null>(null);
  const [dorsalTemp, setDorsalTemp] = useState<string>('');

  const esEditor = rol === 'editor';

  const abrirModalNuevo = () => {
    setJugadorEnEdicion({
      id: '',
      nombre: '',
      numero: undefined,
      posicion: 'Mediocampista',
      activo: true,
      fecha_alta: new Date().toISOString().split('T')[0]
    });
    setErrorModal(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (jugador: Jugador) => {
    setJugadorEnEdicion({ ...jugador });
    setErrorModal(null);
    setModalAbierto(true);
  };

  const handleGuardarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jugadorEnEdicion.nombre || jugadorEnEdicion.nombre.trim() === '') {
      setErrorModal('El nombre del jugador es obligatorio.');
      return;
    }

    setGuardando(true);
    setErrorModal(null);

    const jugadorFinal: Jugador = {
      id: jugadorEnEdicion.id && jugadorEnEdicion.id !== '' ? jugadorEnEdicion.id : 'jug-' + Date.now().toString(36),
      nombre: jugadorEnEdicion.nombre.trim(),
      numero: jugadorEnEdicion.numero !== undefined && jugadorEnEdicion.numero !== null && !isNaN(Number(jugadorEnEdicion.numero)) ? Number(jugadorEnEdicion.numero) : undefined,
      posicion: (jugadorEnEdicion.posicion as PosicionJugador) || 'Mediocampista',
      activo: jugadorEnEdicion.activo !== false,
      fecha_alta: jugadorEnEdicion.fecha_alta || new Date().toISOString().split('T')[0]
    };

    await ApiService.guardarJugador(jugadorFinal);
    setGuardando(false);
    setModalAbierto(false);
    onActualizarJugadores();
  };

  const handleGuardarDorsalRapido = async (jugador: Jugador, nuevoNumeroStr: string) => {
    const num = parseInt(nuevoNumeroStr, 10);
    const numeroValido = !isNaN(num) && num >= 1 && num <= 99 ? num : undefined;
    const actualizado: Jugador = { ...jugador, numero: numeroValido };
    await ApiService.guardarJugador(actualizado);
    setEditandoDorsalId(null);
    onActualizarJugadores();
  };

  const abrirModalTactica = () => {
    const formacion = StorageService.getFormacionPredeterminada() || '4-3-3';
    setFormacionPredeterminada(formacion);
    const base = StorageService.getTitularesPredeterminados();
    const slots: (string | null)[] = Array(11).fill(null);
    base.slice(0, 11).forEach((id, idx) => {
      if (jugadores.some(j => j.id === id && j.activo)) {
        slots[idx] = id;
      }
    });
    setCanchaSlotsBase(slots);
    setJugadorSeleccionadoId(null);
    setBusquedaTactica('');
    setModalTacticaAbierto(true);
  };

  const handleAsignarJugadorASlot = (slotIndex: number, jugadorId: string) => {
    setCanchaSlotsBase(prev => {
      const copy = [...prev];
      const prevSlot = copy.indexOf(jugadorId);
      if (prevSlot !== -1 && prevSlot !== slotIndex) {
        copy[prevSlot] = copy[slotIndex];
      }
      copy[slotIndex] = jugadorId;
      return copy;
    });
    setJugadorSeleccionadoId(null);
  };

  const handleQuitarDeSlot = (slotIndex: number) => {
    setCanchaSlotsBase(prev => {
      const copy = [...prev];
      copy[slotIndex] = null;
      return copy;
    });
  };

  const handleQuitarJugadorDeCancha = (jugadorId: string) => {
    setCanchaSlotsBase(prev => prev.map(id => id === jugadorId ? null : id));
  };

  const handleVaciarCancha = () => {
    setCanchaSlotsBase(Array(11).fill(null));
    setJugadorSeleccionadoId(null);
  };

  const handleLlenarPrimeros11 = () => {
    const nuevos = [...canchaSlotsBase];
    const yaEnCancha = new Set(nuevos.filter(Boolean));
    const disponibles = jugadores
      .filter(j => j.activo && !yaEnCancha.has(j.id))
      .sort((a, b) => {
        const ordenPos: Record<string, number> = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
        const pA = ordenPos[a.posicion] || 5;
        const pB = ordenPos[b.posicion] || 5;
        if (pA !== pB) return pA - pB;
        return (a.numero || 99) - (b.numero || 99);
      });

    let dispIdx = 0;
    for (let i = 0; i < 11; i++) {
      if (!nuevos[i] && dispIdx < disponibles.length) {
        nuevos[i] = disponibles[dispIdx].id;
        dispIdx++;
      }
    }
    setCanchaSlotsBase(nuevos);
  };

  const handleGuardarTacticaPredeterminada = async () => {
    setGuardandoTactica(true);
    const titularesFinales = canchaSlotsBase.filter((id): id is string => Boolean(id));
    const updated = StorageService.saveClubConfig({
      formacionPredeterminada,
      titularesPredeterminados: titularesFinales
    });
    // Sincronizar remotamente con Google Sheets si está conectado
    await ApiService.guardarClubConfig(updated).catch(() => {});
    setGuardandoTactica(false);
    setModalTacticaAbierto(false);
    setMensajeExito(`Formación táctica (${formacionPredeterminada}) y 11 titular base (${titularesFinales.length}/11) guardados con éxito`);
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const handleToggleActivo = async (jugador: Jugador) => {
    if (!esEditor) return;
    const actualizado = { ...jugador, activo: !jugador.activo };
    await ApiService.guardarJugador(actualizado);
    onActualizarJugadores();
  };

  const titularesGuardados = StorageService.getTitularesPredeterminados();

  // Filtrado y ordenación
  const jugadoresFiltrados = jugadores.filter(j => {
    const coincideNombre = j.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
      (j.numero !== undefined && String(j.numero).includes(busqueda));
    const coincidePosicion = filtroPosicion === 'todas' || j.posicion === filtroPosicion;
    const coincideEstado = 
      filtroEstado === 'todos' || 
      (filtroEstado === 'activos' && j.activo) || 
      (filtroEstado === 'inactivos' && !j.activo);

    return coincideNombre && coincidePosicion && coincideEstado;
  }).sort((a, b) => {
    if (criterioOrden === 'numero') {
      const numA = (a.numero !== undefined && a.numero !== null) ? a.numero : 999;
      const numB = (b.numero !== undefined && b.numero !== null) ? b.numero : 999;
      if (numA !== numB) return numA - numB;
      return a.nombre.localeCompare(b.nombre);
    }
    if (criterioOrden === 'posicion') {
      const ordenPos: Record<string, number> = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
      const pA = ordenPos[a.posicion] || 5;
      const pB = ordenPos[b.posicion] || 5;
      if (pA !== pB) return pA - pB;
      const numA = (a.numero !== undefined && a.numero !== null) ? a.numero : 999;
      const numB = (b.numero !== undefined && b.numero !== null) ? b.numero : 999;
      if (numA !== numB) return numA - numB;
      return a.nombre.localeCompare(b.nombre);
    }
    return a.nombre.localeCompare(b.nombre);
  });

  const jugadoresMap = new Map<string, Jugador>(jugadores.map(j => [j.id, j]));
  const presetP = FORMACIONES_DISPONIBLES[formacionPredeterminada] || FORMACIONES_DISPONIBLES['4-3-3'];
  const titularesAsignadosCount = canchaSlotsBase.filter(Boolean).length;

  return (
    <div className="space-y-5 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#3ddc84]" />
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-wider">
              Plantel Permanente
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#9aa89f] mt-0.5">
            Jugadores registrados para {nombreClub} ({jugadores.filter(j => j.activo).length} activos). Configura dorsales fijos y el 11 titular por defecto.
          </p>
        </div>

        {esEditor && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-configurar-tactica-default"
              type="button"
              onClick={abrirModalTactica}
              className="px-3.5 py-2.5 bg-[#0f1712] hover:bg-[#182a1f] border border-[#243d2c] hover:border-[#3ddc84]/60 text-white font-bold text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              title="Configurar formación táctica y 11 inicial por defecto"
            >
              <LayoutGrid className="w-4 h-4 text-[#3ddc84]" />
              <span>11 TITULAR Y ESQUEMA BASE</span>
            </button>

            <button
              id="btn-agregar-jugador"
              onClick={abrirModalNuevo}
              className="px-4 py-2.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold font-display text-sm tracking-wider rounded-xl shadow-lg shadow-[#3ddc84]/20 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              AGREGAR JUGADOR
            </button>
          </div>
        )}
      </div>

      {mensajeExito && (
        <div className="p-3 bg-[#3ddc84]/15 border border-[#3ddc84]/40 rounded-xl text-xs sm:text-sm text-[#3ddc84] flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Barra de Filtros, Búsqueda, Orden y Modo de Vista */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* Input de Búsqueda */}
        <div className="relative w-full lg:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa89f]">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-buscar-jugador"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o #..."
            className="w-full pl-9 pr-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
          />
        </div>

        {/* Filtros de Posición y Estado */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap justify-between lg:justify-end">
          <select
            id="select-filtro-posicion"
            value={filtroPosicion}
            onChange={(e) => setFiltroPosicion(e.target.value)}
            className="px-2.5 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-[#3ddc84]"
          >
            <option value="todas">Todas las Posiciones</option>
            <option value="Arquero">Arqueros</option>
            <option value="Defensor">Defensores</option>
            <option value="Mediocampista">Mediocampistas</option>
            <option value="Delantero">Delanteros</option>
          </select>

          <select
            id="select-filtro-estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
            className="px-2.5 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-[#3ddc84]"
          >
            <option value="activos">Solo Activos</option>
            <option value="inactivos">Solo Inactivos</option>
            <option value="todos">Todos los Estados</option>
          </select>

          {/* Ordenar por: Número / Posición / Nombre */}
          <div className="flex items-center bg-[#0f1712] border border-[#243d2c] rounded-lg p-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 px-2 hidden sm:inline">Orden:</span>
            <button
              type="button"
              onClick={() => setCriterioOrden('numero')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                criterioOrden === 'numero'
                  ? 'bg-[#3ddc84] text-[#0f1712]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ordenar por Número de dorsal"
            >
              # Número
            </button>
            <button
              type="button"
              onClick={() => setCriterioOrden('posicion')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                criterioOrden === 'posicion'
                  ? 'bg-[#3ddc84] text-[#0f1712]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ordenar por Posición en cancha"
            >
              Posición
            </button>
            <button
              type="button"
              onClick={() => setCriterioOrden('nombre')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                criterioOrden === 'nombre'
                  ? 'bg-[#3ddc84] text-[#0f1712]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ordenar alfabéticamente por Nombre"
            >
              A-Z
            </button>
          </div>

          {/* Selector de Modo de Vista: Tarjetas vs Lista */}
          <div className="flex items-center bg-[#0f1712] border border-[#243d2c] rounded-lg p-0.5 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setVistaModo('tarjetas')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                vistaModo === 'tarjetas'
                  ? 'bg-[#3ddc84] text-[#0f1712]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setVistaModo('lista')}
              className={`p-1.5 rounded transition-all cursor-pointer ${
                vistaModo === 'lista'
                  ? 'bg-[#3ddc84] text-[#0f1712]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Vista en Lista"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Listado de Jugadores: Modo Lista o Modo Tarjetas */}
      {jugadoresFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-[#182a1f] border border-[#243d2c] rounded-2xl p-6">
          <Users className="w-10 h-10 text-[#9aa89f] mx-auto mb-2 opacity-50" />
          <p className="text-base text-white font-medium">No se encontraron jugadores</p>
          <p className="text-xs text-[#9aa89f] mt-1">
            Probá ajustando el término de búsqueda o los filtros de posición.
          </p>
        </div>
      ) : vistaModo === 'lista' ? (
        /* Vista en Lista (Tabular responsiva) */
        <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#243d2c] bg-[#0f1712]/70 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">#</th>
                  <th className="py-3 px-4">Jugador</th>
                  <th className="py-3 px-4">Posición</th>
                  <th className="py-3 px-4 text-center">11 Base</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243d2c]/60 text-sm">
                {jugadoresFiltrados.map((jugador) => {
                  const badge = getPosicionBadge(jugador.posicion);
                  const esTitularDefault = titularesGuardados.includes(jugador.id);
                  const estaEditandoDorsal = editandoDorsalId === jugador.id;

                  return (
                    <tr
                      key={jugador.id}
                      className={`hover:bg-[#0f1712]/40 transition-colors ${
                        !jugador.activo ? 'opacity-60 bg-black/10' : ''
                      }`}
                    >
                      {/* Dorsal */}
                      <td className="py-3 px-4 text-center">
                        {estaEditandoDorsal ? (
                          <input
                            type="number"
                            min="1"
                            max="99"
                            autoFocus
                            value={dorsalTemp}
                            onChange={(e) => setDorsalTemp(e.target.value)}
                            onBlur={() => handleGuardarDorsalRapido(jugador, dorsalTemp)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleGuardarDorsalRapido(jugador, dorsalTemp);
                              if (e.key === 'Escape') setEditandoDorsalId(null);
                            }}
                            className="w-11 h-7 px-1 bg-[#0f1712] border border-[#3ddc84] rounded text-center text-xs font-bold text-[#3ddc84] focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!esEditor) return;
                              setDorsalTemp(jugador.numero !== undefined && jugador.numero !== null ? String(jugador.numero) : '');
                              setEditandoDorsalId(jugador.id);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-xs mx-auto border transition-colors ${
                              jugador.numero !== undefined && jugador.numero !== null
                                ? 'bg-[#3ddc84]/15 border-[#3ddc84]/40 text-[#3ddc84] hover:border-[#3ddc84]'
                                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}
                            title={esEditor ? "Clic para editar dorsal permanente" : undefined}
                          >
                            {jugador.numero !== undefined && jugador.numero !== null ? jugador.numero : '-'}
                          </button>
                        )}
                      </td>

                      {/* Nombre */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">
                          {jugador.nombre}
                        </span>
                      </td>

                      {/* Posición */}
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* 11 Base */}
                      <td className="py-3 px-4 text-center">
                        {esTitularDefault ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#3ddc84] bg-[#3ddc84]/15 border border-[#3ddc84]/30 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-[#3ddc84]" />
                            Titular
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">-</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${
                          jugador.activo
                            ? 'bg-[#3ddc84]/15 text-[#3ddc84] border-[#3ddc84]/30'
                            : 'bg-[#e63946]/15 text-[#e63946] border-[#e63946]/30'
                        }`}>
                          {jugador.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        {esEditor && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => abrirModalEditar(jugador)}
                              className="p-1.5 rounded-lg text-[#9aa89f] hover:text-[#3ddc84] hover:bg-[#0f1712] transition-colors cursor-pointer"
                              title="Editar Jugador"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActivo(jugador)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                jugador.activo
                                  ? 'text-[#9aa89f] hover:text-[#e63946] hover:bg-[#0f1712]'
                                  : 'text-[#9aa89f] hover:text-[#3ddc84] hover:bg-[#0f1712]'
                              }`}
                              title={jugador.activo ? 'Desactivar (Baja lógica)' : 'Activar de nuevo'}
                            >
                              {jugador.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vista en Tarjetas */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {jugadoresFiltrados.map((jugador) => {
            const badge = getPosicionBadge(jugador.posicion);
            const esTitularDefault = titularesGuardados.includes(jugador.id);
            const estaEditandoDorsal = editandoDorsalId === jugador.id;

            return (
              <div
                key={jugador.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  jugador.activo
                    ? esTitularDefault
                      ? 'bg-[#182a1f] border-[#3ddc84]/60 shadow-md ring-1 ring-[#3ddc84]/30'
                      : 'bg-[#182a1f] border-[#243d2c] hover:border-[#3ddc84]/50 shadow-md'
                    : 'bg-[#182a1f]/40 border-[#243d2c]/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Dorsal con edición rápida */}
                      {estaEditandoDorsal ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            autoFocus
                            value={dorsalTemp}
                            onChange={(e) => setDorsalTemp(e.target.value)}
                            onBlur={() => handleGuardarDorsalRapido(jugador, dorsalTemp)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleGuardarDorsalRapido(jugador, dorsalTemp);
                              if (e.key === 'Escape') setEditandoDorsalId(null);
                            }}
                            className="w-10 h-6 px-1 bg-[#0f1712] border border-[#3ddc84] rounded text-center text-xs font-bold text-[#3ddc84] focus:outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!esEditor) return;
                            setDorsalTemp(jugador.numero !== undefined && jugador.numero !== null ? String(jugador.numero) : '');
                            setEditandoDorsalId(jugador.id);
                          }}
                          className={`font-display font-bold text-xs px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 ${
                            jugador.numero !== undefined && jugador.numero !== null
                              ? 'text-[#3ddc84] bg-[#3ddc84]/15 border-[#3ddc84]/30 hover:border-[#3ddc84]'
                              : 'text-zinc-400 bg-zinc-800/60 border-zinc-700 hover:border-zinc-500'
                          }`}
                          title={esEditor ? "Clic para editar dorsal permanente" : undefined}
                        >
                          <span>#{jugador.numero !== undefined && jugador.numero !== null ? jugador.numero : '-'}</span>
                          {esEditor && <Edit2 className="w-2.5 h-2.5 opacity-60" />}
                        </button>
                      )}

                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>

                      {esTitularDefault && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3ddc84]/20 border border-[#3ddc84]/40 text-[#3ddc84] flex items-center gap-0.5" title="Titular en el 11 base predeterminado">
                          <Star className="w-2.5 h-2.5 fill-[#3ddc84]" />
                          Titular 11
                        </span>
                      )}
                    </div>

                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        jugador.activo ? 'bg-[#3ddc84]' : 'bg-[#e63946]'
                      }`}
                      title={jugador.activo ? 'Activo' : 'Inactivo'}
                    />
                  </div>

                  <h3 className="font-semibold text-lg text-white truncate" title={jugador.nombre}>
                    {jugador.nombre}
                  </h3>
                  <p className="text-xs text-[#9aa89f] mt-0.5">
                    {jugador.posicion}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#243d2c] flex items-center justify-between">
                  <span className="text-[11px] text-[#9aa89f]">
                    {jugador.activo ? 'Listo para convocar' : 'Baja lógica'}
                  </span>

                  {esEditor && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirModalEditar(jugador)}
                        className="p-1.5 rounded-lg text-[#9aa89f] hover:text-[#3ddc84] hover:bg-[#0f1712] transition-colors cursor-pointer"
                        title="Editar Jugador"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActivo(jugador)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          jugador.activo
                            ? 'text-[#9aa89f] hover:text-[#e63946] hover:bg-[#0f1712]'
                            : 'text-[#9aa89f] hover:text-[#3ddc84] hover:bg-[#0f1712]'
                        }`}
                        title={jugador.activo ? 'Desactivar (Baja lógica)' : 'Activar de nuevo'}
                      >
                        {jugador.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Configurar Táctica y 11 Titular Base con Cancha Interactiva */}
      {modalTacticaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-5xl p-4 sm:p-6 shadow-2xl relative max-h-[94vh] flex flex-col">
            <button
              onClick={() => setModalTacticaAbierto(false)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera */}
            <div className="mb-3 pr-8">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-[#3ddc84]" />
                <h2 className="font-display font-bold text-lg sm:text-xl text-white uppercase tracking-wider">
                  11 Titular y Esquema por Defecto
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#3ddc84]/15 border border-[#3ddc84]/40 text-[#3ddc84]">
                  {titularesAsignadosCount}/11 en cancha
                </span>
              </div>
              <p className="text-xs text-[#9aa89f] mt-0.5">
                Arrastrá o tocá los futbolistas para ubicarlos en los puestos de la cancha. Esta táctica se cargará automáticamente en cada nuevo partido.
              </p>
            </div>

            {/* Barra de Formaciones y Acciones rápidas */}
            <div className="flex items-center justify-between gap-2 p-2 bg-[#0f1712] rounded-xl border border-[#243d2c] mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
                  Esquema:
                </span>
                {Object.keys(FORMACIONES_DISPONIBLES).map((esq) => (
                  <button
                    key={esq}
                    type="button"
                    onClick={() => setFormacionPredeterminada(esq)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      formacionPredeterminada === esq
                        ? 'bg-[#3ddc84] text-[#0f1712] border-[#3ddc84] shadow-sm'
                        : 'bg-[#182a1f] border-[#243d2c] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {esq}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLlenarPrimeros11}
                  className="px-2.5 py-1 rounded-lg bg-[#3ddc84]/15 hover:bg-[#3ddc84] text-[#3ddc84] hover:text-[#0f1712] text-xs font-bold border border-[#3ddc84]/30 transition-all cursor-pointer"
                  title="Autocompletar los puestos vacíos con jugadores disponibles"
                >
                  Autocompletar 11
                </button>
                <button
                  type="button"
                  onClick={handleVaciarCancha}
                  className="px-2.5 py-1 rounded-lg bg-[#0f1712] hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium border border-[#243d2c] transition-all cursor-pointer"
                >
                  Vaciar Cancha
                </button>
              </div>
            </div>

            {/* Contenedor principal: Lista a la izquierda, Cancha interactiva a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-y-auto pr-1">
              
              {/* Columna Izquierda: Plantel disponible */}
              <div className="lg:col-span-5 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Futbolistas del Plantel ({jugadores.filter(j => j.activo).length})
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Arrastrá o hacé clic
                  </span>
                </div>

                {/* Buscador */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o dorsal..."
                    value={busquedaTactica}
                    onChange={(e) => setBusquedaTactica(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
                  />
                  {busquedaTactica && (
                    <button
                      type="button"
                      onClick={() => setBusquedaTactica('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Lista de jugadores */}
                <div className="space-y-1.5 max-h-[360px] lg:max-h-[420px] overflow-y-auto pr-1">
                  {(() => {
                    const lista = jugadores
                      .filter(j => j.activo)
                      .filter(j => {
                        const q = busquedaTactica.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          j.nombre.toLowerCase().includes(q) ||
                          (j.posicion && j.posicion.toLowerCase().includes(q)) ||
                          String(j.numero || '').includes(q)
                        );
                      })
                      .sort((a, b) => {
                        const ordenPos: Record<string, number> = { 'Arquero': 1, 'Defensor': 2, 'Mediocampista': 3, 'Delantero': 4 };
                        const pA = ordenPos[a.posicion] || 5;
                        const pB = ordenPos[b.posicion] || 5;
                        if (pA !== pB) return pA - pB;
                        return (a.numero || 99) - (b.numero || 99);
                      });

                    if (lista.length === 0) {
                      return (
                        <div className="text-center py-8 text-zinc-500 text-xs">
                          No se encontraron jugadores activos.
                        </div>
                      );
                    }

                    return lista.map((j) => {
                      const slotIdx = canchaSlotsBase.indexOf(j.id);
                      const estaEnCancha = slotIdx !== -1;
                      const posAsignada = estaEnCancha ? (presetP[slotIdx]?.pos || 'TIT') : null;
                      const esSeleccionado = jugadorSeleccionadoId === j.id;
                      const badge = getPosicionBadge(j.posicion);

                      return (
                        <div
                          key={j.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify({ tipo: 'plantel', id: j.id }));
                          }}
                          onClick={() => {
                            setJugadorSeleccionadoId(esSeleccionado ? null : j.id);
                          }}
                          className={`p-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer select-none ${
                            esSeleccionado
                              ? 'bg-[#3ddc84]/20 border-[#3ddc84] ring-2 ring-[#3ddc84]/40'
                              : estaEnCancha
                              ? 'bg-[#182a1f] border-[#3ddc84]/40'
                              : 'bg-[#0f1712] border-[#243d2c] hover:border-zinc-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <GripVertical className="w-3.5 h-3.5 text-zinc-500 shrink-0 cursor-grab" />
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              estaEnCancha ? 'bg-[#3ddc84] text-[#0f1712]' : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {j.numero !== undefined && j.numero !== null ? j.numero : '-'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-white truncate block">
                                {j.nombre}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>

                          {/* Botón acción o indicador */}
                          <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {estaEnCancha ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-[#3ddc84] bg-[#3ddc84]/15 px-1.5 py-0.5 rounded border border-[#3ddc84]/30">
                                  {posAsignada}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuitarJugadorDeCancha(j.id)}
                                  className="w-5 h-5 rounded-full bg-zinc-800 hover:bg-[#e63946] text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                                  title="Quitar de la cancha"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const primerVacio = canchaSlotsBase.indexOf(null);
                                  if (primerVacio !== -1) {
                                    handleAsignarJugadorASlot(primerVacio, j.id);
                                  } else {
                                    setJugadorSeleccionadoId(j.id);
                                  }
                                }}
                                className="text-[10px] font-bold px-2 py-1 rounded bg-[#3ddc84]/15 hover:bg-[#3ddc84] text-[#3ddc84] hover:text-[#0f1712] transition-colors cursor-pointer"
                                title="Asignar al primer puesto libre o tocar un puesto"
                              >
                                + Cancha
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Columna Derecha: Cancha Táctica Interactiva */}
              <div className="lg:col-span-7 flex flex-col items-center">
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
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Cancha de fútbol verde con líneas de cal */}
                <div className="relative w-full max-w-[480px] aspect-[4/5] bg-gradient-to-b from-[#14532d] via-[#15803d] to-[#14532d] rounded-2xl border-4 border-[#243d2c] shadow-2xl overflow-hidden p-2 select-none">
                  {/* Líneas de la cancha */}
                  <div className="absolute inset-3 border-2 border-white/40 rounded-lg pointer-events-none">
                    {/* Línea media */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40 -translate-y-1/2" />
                    {/* Círculo central */}
                    <div className="absolute top-1/2 left-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
                    {/* Área Grande Superior */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 sm:w-48 h-16 sm:h-20 border-b-2 border-x-2 border-white/40" />
                    {/* Área Chica Superior */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-7 sm:h-8 border-b-2 border-x-2 border-white/40" />
                    {/* Área Grande Inferior */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 sm:w-48 h-16 sm:h-20 border-t-2 border-x-2 border-white/40" />
                    {/* Área Chica Inferior */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-7 sm:h-8 border-t-2 border-x-2 border-white/40" />
                  </div>

                  {/* Los 11 puestos tácticos */}
                  {presetP.slice(0, 11).map((coords, slotIdx) => {
                    const jugadorId = canchaSlotsBase[slotIdx];
                    const jugador = jugadorId ? jugadoresMap.get(jugadorId) : null;
                    const dorsal = jugadorId ? (jugador?.numero ?? (slotIdx + 1)) : null;

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
                              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#182a1f] border-2 border-[#3ddc84] shadow-xl flex items-center justify-center text-white font-display font-bold text-xs sm:text-sm ring-2 ring-black/40 group-hover:border-white transition-all cursor-grab active:cursor-grabbing"
                            >
                              <span>{dorsal}</span>

                              {/* Botón quitar de la cancha */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuitarDeSlot(slotIdx);
                                }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#e63946] text-white flex items-center justify-center text-xs font-bold opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md cursor-pointer hover:scale-110"
                                title="Quitar de este puesto"
                              >
                                ×
                              </button>
                            </div>

                            {/* Nombre y posición */}
                            <div className="mt-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-xs border border-white/20 text-center max-w-[90px] shadow-md">
                              <span className="text-[9px] sm:text-[10px] font-bold text-white truncate block leading-tight">
                                {jugador.nombre}
                              </span>
                              <span className="text-[7px] sm:text-[8px] text-[#3ddc84] font-semibold block uppercase">
                                {coords.pos}
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Slot Vacío */
                          <div className={`flex flex-col items-center ${jugadorSeleccionadoId ? 'animate-pulse' : ''}`}>
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 border-2 border-dashed border-white/60 hover:border-[#3ddc84] hover:bg-[#3ddc84]/20 flex items-center justify-center text-white font-bold text-xs shadow-md transition-all">
                              <span>{coords.pos}</span>
                            </div>
                            <div className="mt-0.5 px-1 py-0.2 rounded bg-black/50 text-[7px] text-zinc-300 font-medium">
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

            {/* Pie del modal: Cancelar y Guardar */}
            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-[#243d2c]">
              <div className="text-xs text-zinc-400">
                {titularesAsignadosCount === 11 ? (
                  <span className="text-[#3ddc84] font-semibold">✓ 11 Titulares listos para el esquema {formacionPredeterminada}</span>
                ) : (
                  <span>{11 - titularesAsignadosCount} puestos libres restantes</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalTacticaAbierto(false)}
                  className="px-4 py-2 bg-[#0f1712] text-xs text-[#9aa89f] hover:text-white rounded-xl border border-[#243d2c] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarTacticaPredeterminada}
                  disabled={guardandoTactica}
                  className="px-5 py-2 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold font-display text-xs tracking-wider rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>GUARDAR CONFIGURACIÓN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alta / Edición de Jugador */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setModalAbierto(false)}
              className="absolute top-4 right-4 text-[#9aa89f] hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-display font-bold text-xl text-white uppercase tracking-wider mb-4">
              {jugadorEnEdicion.id ? 'Editar Jugador' : 'Nuevo Jugador'}
            </h2>

            <form onSubmit={handleGuardarJugador} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1.5">
                  Nombre y Apellido
                </label>
                <input
                  type="text"
                  value={jugadorEnEdicion.nombre || ''}
                  onChange={(e) => setJugadorEnEdicion({ ...jugadorEnEdicion, nombre: e.target.value })}
                  placeholder="Ej: Lucas Martínez"
                  className="w-full px-3 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1.5">
                    Dorsal / Camiseta
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={jugadorEnEdicion.numero !== undefined && jugadorEnEdicion.numero !== null ? jugadorEnEdicion.numero : ''}
                    onChange={(e) => setJugadorEnEdicion({ ...jugadorEnEdicion, numero: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="Ej: 10"
                    className="w-full px-3 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1.5">
                    Posición
                  </label>
                  <select
                    value={jugadorEnEdicion.posicion || 'Mediocampista'}
                    onChange={(e) => setJugadorEnEdicion({ ...jugadorEnEdicion, posicion: e.target.value as PosicionJugador })}
                    className="w-full px-3 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="Arquero">Arquero</option>
                    <option value="Defensor">Defensor</option>
                    <option value="Mediocampista">Mediocampista</option>
                    <option value="Delantero">Delantero</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk-activo"
                  checked={jugadorEnEdicion.activo !== false}
                  onChange={(e) => setJugadorEnEdicion({ ...jugadorEnEdicion, activo: e.target.checked })}
                  className="w-4 h-4 rounded text-[#3ddc84] focus:ring-[#3ddc84] bg-[#0f1712] border-[#243d2c]"
                />
                <label htmlFor="chk-activo" className="text-xs text-white cursor-pointer select-none">
                  Jugador Activo en el plantel para convocatorias
                </label>
              </div>

              {errorModal && (
                <p className="text-xs text-[#e63946] bg-[#e63946]/10 p-2.5 rounded-lg border border-[#e63946]/30">
                  {errorModal}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2.5 bg-[#0f1712] text-sm text-[#9aa89f] hover:text-white rounded-xl border border-[#243d2c]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold font-display text-sm tracking-wider rounded-xl shadow-lg shadow-[#3ddc84]/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {guardando ? 'GUARDANDO...' : 'GUARDAR JUGADOR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
