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
  X
} from 'lucide-react';
import { Jugador, PosicionJugador, RolUsuario } from '../types';
import { getPosicionBadge } from '../utils/footballCalculations';
import { ApiService } from '../services/api';

import { StorageService } from '../services/storage';

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

  // Modal de alta/edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [jugadorEnEdicion, setJugadorEnEdicion] = useState<Partial<Jugador>>({
    nombre: '',
    posicion: 'Mediocampista',
    activo: true
  });
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const esEditor = rol === 'editor';

  const abrirModalNuevo = () => {
    setJugadorEnEdicion({
      id: '',
      nombre: '',
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
      posicion: (jugadorEnEdicion.posicion as PosicionJugador) || 'Mediocampista',
      activo: jugadorEnEdicion.activo !== false,
      fecha_alta: jugadorEnEdicion.fecha_alta || new Date().toISOString().split('T')[0]
    };

    await ApiService.guardarJugador(jugadorFinal);
    setGuardando(false);
    setModalAbierto(false);
    onActualizarJugadores();
  };

  const handleToggleActivo = async (jugador: Jugador) => {
    if (!esEditor) return;
    const actualizado = { ...jugador, activo: !jugador.activo };
    await ApiService.guardarJugador(actualizado);
    onActualizarJugadores();
  };

  // Filtrado
  const jugadoresFiltrados = jugadores.filter(j => {
    const coincideNombre = j.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincidePosicion = filtroPosicion === 'todas' || j.posicion === filtroPosicion;
    const coincideEstado = 
      filtroEstado === 'todos' || 
      (filtroEstado === 'activos' && j.activo) || 
      (filtroEstado === 'inactivos' && !j.activo);

    return coincideNombre && coincidePosicion && coincideEstado;
  }).sort((a, b) => a.nombre.localeCompare(b.nombre));

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
            Jugadores registrados para {nombreClub} ({jugadores.filter(j => j.activo).length} activos). Los dorsales se asignan para cada partido.
          </p>
        </div>

        {esEditor && (
          <button
            id="btn-agregar-jugador"
            onClick={abrirModalNuevo}
            className="px-4 py-2.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold font-display text-sm tracking-wider rounded-xl shadow-lg shadow-[#3ddc84]/20 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            AGREGAR JUGADOR
          </button>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-center gap-3">
        
        {/* Input de Búsqueda */}
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa89f]">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-buscar-jugador"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de jugador..."
            className="w-full pl-9 pr-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
          />
        </div>

        {/* Filtros de Posición y Estado */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            id="select-filtro-posicion"
            value={filtroPosicion}
            onChange={(e) => setFiltroPosicion(e.target.value)}
            className="px-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-[#3ddc84]"
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
            className="px-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-[#3ddc84]"
          >
            <option value="activos">Solo Activos</option>
            <option value="inactivos">Solo Inactivos</option>
            <option value="todos">Todos los Estados</option>
          </select>
        </div>

      </div>

      {/* Grid de Jugadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {jugadoresFiltrados.length > 0 ? (
          jugadoresFiltrados.map((jugador) => {
            const badge = getPosicionBadge(jugador.posicion);

            return (
              <div
                key={jugador.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  jugador.activo
                    ? 'bg-[#182a1f] border-[#243d2c] hover:border-[#3ddc84]/50 shadow-md'
                    : 'bg-[#182a1f]/40 border-[#243d2c]/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>

                    <span
                      className={`w-2 h-2 rounded-full ${
                        jugador.activo ? 'bg-[#3ddc84]' : 'bg-[#e63946]'
                      }`}
                      title={jugador.activo ? 'Activo' : 'Inactivo'}
                    />
                  </div>

                  <h3 className="font-semibold text-lg text-white truncate">
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
          })
        ) : (
          <div className="col-span-full text-center py-12 bg-[#182a1f] border border-[#243d2c] rounded-2xl p-6">
            <Users className="w-10 h-10 text-[#9aa89f] mx-auto mb-2 opacity-50" />
            <p className="text-base text-white font-medium">No se encontraron jugadores</p>
            <p className="text-xs text-[#9aa89f] mt-1">
              Probá ajustando el término de búsqueda o los filtros de posición.
            </p>
          </div>
        )}
      </div>

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

              <div>
                <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1.5">
                  Posición Habitual
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
