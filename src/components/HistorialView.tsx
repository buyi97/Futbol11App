/**
 * @file HistorialView.tsx
 * Listado histórico de partidos disputados y programados con filtros por resultado y fecha.
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  ChevronRight, 
  Trophy, 
  MapPin, 
  Clock,
  Play,
  Plus,
  X,
  Check,
  Users,
  Trash2,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { Partido, Jugador, RolUsuario, Convocado, CondicionPartido, Torneo } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';

interface HistorialViewProps {
  partidos: Partido[];
  plantel?: Jugador[];
  rol?: RolUsuario;
  onSeleccionarPartido: (partidoId: string) => void;
  onIrAPartidoVivo?: () => void;
  onPartidoCreado?: (partidoId: string) => void;
  hayPartidoEnVivo?: boolean;
  onActualizarPartidos?: () => void;
  nombreEquipo?: string;
  colorPropio?: string;
}

export const HistorialView: React.FC<HistorialViewProps> = ({
  partidos,
  plantel = [],
  rol,
  onSeleccionarPartido,
  onIrAPartidoVivo,
  onPartidoCreado,
  hayPartidoEnVivo,
  onActualizarPartidos,
  nombreEquipo,
  colorPropio
}) => {
  const esEditor = rol === 'editor';
  const [torneos, setTorneos] = useState<Torneo[]>(() => StorageService.getTorneos());
  const nombreClub = nombreEquipo || StorageService.getNombreEquipo();

  useEffect(() => {
    const handleActualizar = () => {
      setTorneos(StorageService.getTorneos());
    };
    window.addEventListener('futbol11-datos-actualizados', handleActualizar);
    return () => {
      window.removeEventListener('futbol11-datos-actualizados', handleActualizar);
    };
  }, []);

  // Estado para confirmación de borrado de partido
  const [partidoABorrar, setPartidoABorrar] = useState<Partido | null>(null);
  const [borrando, setBorrando] = useState(false);

  const handleConfirmarBorrarPartido = async () => {
    if (!partidoABorrar) return;
    setBorrando(true);
    try {
      await ApiService.eliminarPartido(partidoABorrar.id);
      setPartidoABorrar(null);
      if (onActualizarPartidos) {
        onActualizarPartidos();
      }
    } finally {
      setBorrando(false);
    }
  };

  const [busqueda, setBusqueda] = useState('');
  const [filtroResultado, setFiltroResultado] = useState<'todos' | 'victorias' | 'empates' | 'derrotas'>('todos');
  const [filtroTorneo, setFiltroTorneo] = useState<string>('todos');

  // Modal para registrar partido jugado anteriormente
  const [modalRegistroPasado, setModalRegistroPasado] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [rival, setRival] = useState('');
  const [etiquetaModal, setEtiquetaModal] = useState('Fecha 1');
  const [cancha, setCancha] = useState(`Predio ${nombreClub}`);
  const [condicion, setCondicion] = useState<CondicionPartido>('local');
  const [torneoIdModal, setTorneoIdModal] = useState<string>(() => StorageService.getTorneoActivo()?.id || '');
  const [golesPropio, setGolesPropio] = useState<number>(0);
  const [golesRival, setGolesRival] = useState<number>(0);
  const [duracionTiempoMin, setDuracionTiempoMin] = useState<number>(40);
  const [notas, setNotas] = useState('');
  const [jugadoresSeleccionados, setJugadoresSeleccionados] = useState<string[]>([]);

  const abrirModalPasado = () => {
    if (plantel && plantel.length > 0) {
      setJugadoresSeleccionados(plantel.filter(j => j.activo).map(j => j.id));
    }
    const activo = StorageService.getTorneoActivo();
    if (activo) {
      setTorneoIdModal(activo.id);
    } else if (torneos.length > 0) {
      setTorneoIdModal(torneos[0].id);
    }
    setCancha(`Predio ${nombreClub}`);
    setEtiquetaModal(`Fecha ${partidos.length + 1}`);
    setModalRegistroPasado(true);
  };

  const handleCrearPartidoPasado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rival.trim()) return;

    const partidoId = 'partido-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const torneoElegido = torneos.find(t => t.id === torneoIdModal);

    const nuevoPartido: Partido = {
      id: partidoId,
      fecha,
      rival: rival.trim(),
      modo_rival: 'numero',
      cancha: cancha.trim(),
      condicion,
      resultado_propio: Number(golesPropio),
      resultado_rival: Number(golesRival),
      agregado_1T: 0,
      agregado_2T: 0,
      duracion_tiempo_min: Number(duracionTiempoMin) || 40,
      estado: 'finalizado',
      creado_por: 'Director Técnico',
      notas: notas.trim() || undefined,
      created_at: Date.now(),
      torneo_id: torneoElegido ? torneoElegido.id : undefined,
      torneo_nombre: torneoElegido ? torneoElegido.nombre : undefined,
      etiqueta: etiquetaModal.trim() || undefined
    };

    // Crear convocados
    const nuevosConvocados: Convocado[] = jugadoresSeleccionados.map((jugId, idx) => ({
      id: 'conv-' + partidoId + '-' + jugId,
      partido_id: partidoId,
      jugador_id: jugId,
      titular: idx < 11, // Primeros 11 como titulares por defecto
      numero: idx + 1
    }));

    // Guardar en Storage
    StorageService.savePartido(nuevoPartido);
    const todosConvocados = StorageService.getConvocados();
    StorageService.saveConvocados([...todosConvocados, ...nuevosConvocados]);
    StorageService.agregarAColaSync('crearPartido', nuevoPartido);

    setModalRegistroPasado(false);

    if (onPartidoCreado) {
      onPartidoCreado(partidoId);
    } else {
      onSeleccionarPartido(partidoId);
    }
  };

  const partidosFiltrados = partidos.filter(p => {
    const coincideRival = p.rival.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.cancha && p.cancha.toLowerCase().includes(busqueda.toLowerCase()));

    let coincideResultado = true;
    if (p.estado === 'finalizado') {
      if (filtroResultado === 'victorias') coincideResultado = p.resultado_propio > p.resultado_rival;
      if (filtroResultado === 'empates') coincideResultado = p.resultado_propio === p.resultado_rival;
      if (filtroResultado === 'derrotas') coincideResultado = p.resultado_propio < p.resultado_rival;
    } else if (filtroResultado !== 'todos') {
      coincideResultado = false;
    }

    let coincideTorneo = true;
    if (filtroTorneo !== 'todos') {
      coincideTorneo = p.torneo_id === filtroTorneo;
    }

    return coincideRival && coincideResultado && coincideTorneo;
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="space-y-5 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#3ddc84]" />
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-wider">
              Historial de Partidos
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#9aa89f] mt-0.5">
            Registro de encuentros disputados, planillas y resultados de la temporada.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {esEditor && (
            <button
              type="button"
              onClick={abrirModalPasado}
              className="px-3.5 py-2.5 bg-[#182a1f] hover:bg-[#243d2c] border border-[#243d2c] hover:border-[#3ddc84] text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#3ddc84]" />
              <span>Registrar Partido Anterior</span>
            </button>
          )}

          {hayPartidoEnVivo && onIrAPartidoVivo && (
            <button
              onClick={onIrAPartidoVivo}
              className="px-4 py-2.5 bg-[#e63946] text-white font-bold font-display text-sm tracking-wider rounded-xl shadow-lg shadow-[#e63946]/20 flex items-center gap-2 cursor-pointer animate-pulse shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              PARTIDO EN CURSO
            </button>
          )}
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9aa89f]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por rival o sede..."
            className="w-full pl-9 pr-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filtroTorneo}
            onChange={(e) => setFiltroTorneo(e.target.value)}
            className="px-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-[#3ddc84] max-w-[200px]"
          >
            <option value="todos">🏆 Todos los Torneos</option>
            {torneos.map(t => (
              <option key={t.id} value={t.id}>
                {t.nombre} {t.estado === 'activo' ? '(Activo)' : ''}
              </option>
            ))}
          </select>

          <select
            value={filtroResultado}
            onChange={(e) => setFiltroResultado(e.target.value as any)}
            className="px-3 py-2 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs font-medium text-white focus:outline-none focus:border-[#3ddc84]"
          >
            <option value="todos">Todos los Resultados</option>
            <option value="victorias">Solo Victorias</option>
            <option value="empates">Solo Empates</option>
            <option value="derrotas">Solo Derrotas</option>
          </select>
        </div>
      </div>

      {/* Lista de Partidos */}
      <div className="space-y-3">
        {partidosFiltrados.length > 0 ? (
          partidosFiltrados.map((partido) => {
            const esFinalizado = partido.estado === 'finalizado';
            const esVictoria = esFinalizado && partido.resultado_propio > partido.resultado_rival;
            const esEmpate = esFinalizado && partido.resultado_propio === partido.resultado_rival;
            const esDerrota = esFinalizado && partido.resultado_propio < partido.resultado_rival;

            return (
              <div
                key={partido.id}
                onClick={() => onSeleccionarPartido(partido.id)}
                className="bg-[#182a1f] border border-[#243d2c] hover:border-[#3ddc84]/50 rounded-2xl p-4 sm:p-5 shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start sm:items-center gap-4">
                  {/* Badge V/E/D o En Vivo */}
                  <div
                    className={`w-12 h-12 rounded-xl font-display font-bold text-lg flex items-center justify-center shrink-0 ${
                      partido.estado === 'en_curso'
                        ? 'bg-[#e63946] text-white animate-pulse'
                        : esVictoria
                        ? 'bg-[#3ddc84]/20 text-[#3ddc84] border border-[#3ddc84]/40'
                        : esEmpate
                        ? 'bg-amber-500/20 text-[#ffb703] border border-amber-500/40'
                        : 'bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/40'
                    }`}
                  >
                    {partido.estado === 'en_curso'
                      ? 'VIVO'
                      : esVictoria
                      ? 'V'
                      : esEmpate
                      ? 'E'
                      : 'D'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-lg sm:text-xl text-white group-hover:text-[#3ddc84] transition-colors">
                        vs {partido.rival}
                      </h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0f1712] text-[#9aa89f] border border-[#243d2c] capitalize">
                        {partido.condicion}
                      </span>
                      {partido.etiqueta && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-[#3ddc84]" />
                          {partido.etiqueta}
                        </span>
                      )}
                      {partido.torneo_nombre && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ffb703]/15 text-[#ffb703] border border-[#ffb703]/30 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-[#ffb703]" />
                          {partido.torneo_nombre}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9aa89f] mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#3ddc84]" />
                        {partido.fecha}
                      </span>
                      {partido.cancha && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#ffb703]" />
                          {partido.cancha}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {partido.duracion_tiempo_min || 40}' x tiempo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Marcador y Botón */}
                <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#243d2c]">
                  <div className="text-right">
                    <span className="text-[10px] text-[#9aa89f] block uppercase tracking-wider">
                      {esFinalizado ? 'Resultado Final' : 'Marcador Actual'}
                    </span>
                    <div className="font-display font-bold text-2xl sm:text-3xl text-white">
                      <span className={esVictoria ? 'text-[#3ddc84]' : ''}>{partido.resultado_propio}</span>
                      <span className="text-[#9aa89f] mx-1.5">-</span>
                      <span className={esDerrota ? 'text-[#e63946]' : ''}>{partido.resultado_rival}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {esEditor && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPartidoABorrar(partido);
                        }}
                        className="w-10 h-10 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#e63946] hover:bg-[#e63946]/20 text-[#9aa89f] hover:text-[#e63946] flex items-center justify-center transition-all cursor-pointer"
                        title="Borrar partido del historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="w-10 h-10 rounded-xl bg-[#0f1712] border border-[#243d2c] group-hover:border-[#3ddc84] flex items-center justify-center transition-colors">
                      <ChevronRight className="w-5 h-5 text-[#9aa89f] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-[#182a1f] border border-[#243d2c] rounded-2xl p-6">
            <Calendar className="w-10 h-10 text-[#9aa89f] mx-auto mb-2 opacity-50" />
            <p className="text-base text-white font-medium">No se encontraron partidos</p>
            <p className="text-xs text-[#9aa89f] mt-1">
              Probá ajustando el filtro de búsqueda o cargá un nuevo partido.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: Registrar Partido Anterior */}
      {modalRegistroPasado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl w-full max-w-xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#3ddc84]" />
                <h3 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wider">
                  Registrar Partido Anterior
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalRegistroPasado(false)}
                className="text-[#9aa89f] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearPartidoPasado} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Fecha del Partido
                  </label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Nombre del Rival
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Deportivo Morón"
                    value={rival}
                    onChange={e => setRival(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Cancha / Sede
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={`Ej: Predio ${nombreEquipo}`}
                    value={cancha}
                    onChange={e => setCancha(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Condición
                  </label>
                  <select
                    value={condicion}
                    onChange={e => setCondicion(e.target.value as CondicionPartido)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="local">Local</option>
                    <option value="visitante">Visitante</option>
                  </select>
                </div>
              </div>

              {/* Asignación de Torneo / Temporada y Etiqueta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Torneo / Temporada Asignada
                  </label>
                  <select
                    value={torneoIdModal}
                    onChange={e => setTorneoIdModal(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  >
                    <option value="">(Sin Torneo / Amistoso Libre)</option>
                    {torneos.map(t => (
                      <option key={t.id} value={t.id}>
                        🏆 {t.nombre} {t.estado === 'activo' ? '🟢 (En curso)' : '🔒 (Cerrado)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#3ddc84]" />
                    Etiqueta / Instancia
                  </label>
                  <input
                    type="text"
                    value={etiquetaModal}
                    onChange={e => setEtiquetaModal(e.target.value)}
                    placeholder="Ej: Fecha 1, Semifinal, Amistoso"
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>
              </div>

              {/* Marcador Final */}
              <div className="bg-[#0f1712] border border-[#243d2c] rounded-xl p-3">
                <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-2 text-center">
                  Resultado Final del Partido
                </label>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <span className="text-[10px] text-[#3ddc84] font-bold block uppercase mb-1">
                      {nombreClub}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      required
                      value={golesPropio}
                      onChange={e => setGolesPropio(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center text-xl font-bold bg-[#182a1f] border border-[#243d2c] rounded-lg py-1.5 text-white focus:outline-none focus:border-[#3ddc84]"
                    />
                  </div>
                  <span className="text-xl font-bold text-[#9aa89f] pt-4">-</span>
                  <div className="text-center">
                    <span className="text-[10px] text-amber-400 font-bold block uppercase mb-1">
                      Rival
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      required
                      value={golesRival}
                      onChange={e => setGolesRival(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center text-xl font-bold bg-[#182a1f] border border-[#243d2c] rounded-lg py-1.5 text-white focus:outline-none focus:border-[#3ddc84]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Duración Tiempo (minutos)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={60}
                    value={duracionTiempoMin}
                    onChange={e => setDuracionTiempoMin(Number(e.target.value))}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase block mb-1">
                    Notas adicionales (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Fecha 3 Torneo Clausura"
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    className="w-full bg-[#0f1712] border border-[#243d2c] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#3ddc84]"
                  />
                </div>
              </div>

              {/* Convocados del Plantel */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#9aa89f] uppercase">
                    Jugadores que jugaron ({jugadoresSeleccionados.length} seleccionados)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setJugadoresSeleccionados(plantel.map(j => j.id))}
                      className="text-[10px] text-[#3ddc84] hover:underline cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      type="button"
                      onClick={() => setJugadoresSeleccionados([])}
                      className="text-[10px] text-zinc-400 hover:underline cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="max-h-36 overflow-y-auto bg-[#0f1712] border border-[#243d2c] rounded-xl p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {plantel.map(j => {
                    const sel = jugadoresSeleccionados.includes(j.id);
                    return (
                      <label
                        key={j.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors ${
                          sel 
                            ? 'bg-[#3ddc84]/15 border-[#3ddc84]/50 text-white font-medium' 
                            : 'bg-transparent border-[#243d2c]/40 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={e => {
                            if (e.target.checked) {
                              setJugadoresSeleccionados(prev => [...prev, j.id]);
                            } else {
                              setJugadoresSeleccionados(prev => prev.filter(id => id !== j.id));
                            }
                          }}
                          className="accent-[#3ddc84]"
                        />
                        <span className="truncate text-[11px]">
                          {j.nombre}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#243d2c]">
                <button
                  type="button"
                  onClick={() => setModalRegistroPasado(false)}
                  className="px-4 py-2 bg-transparent border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3ddc84] hover:bg-[#32b86e] text-[#0a100d] font-bold rounded-xl cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Guardar y Ver Planilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Borrar Partido */}
      {partidoABorrar && (
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
                <p className="text-xs text-[#9aa89f]">Esta acción eliminará la planilla y sus estadísticas.</p>
                <p className="text-[11px] text-[#3ddc84] font-medium mt-0.5">Podrás deshacer esta acción si te equivocás desde el botón flotante.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0f1712] border border-[#243d2c] text-xs text-white space-y-1">
              <div><strong className="text-[#9aa89f]">Partido:</strong> vs {partidoABorrar.rival}</div>
              <div><strong className="text-[#9aa89f]">Fecha:</strong> {partidoABorrar.fecha}</div>
              {partidoABorrar.etiqueta && (
                <div><strong className="text-[#9aa89f]">Etiqueta:</strong> {partidoABorrar.etiqueta}</div>
              )}
              <div><strong className="text-[#9aa89f]">Resultado:</strong> {partidoABorrar.resultado_propio} - {partidoABorrar.resultado_rival}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={borrando}
                onClick={() => setPartidoABorrar(null)}
                className="px-4 py-2 bg-[#0f1712] border border-[#243d2c] text-[#9aa89f] hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={borrando}
                onClick={handleConfirmarBorrarPartido}
                className="px-4 py-2 bg-[#e63946] hover:bg-[#d92d3b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#e63946]/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {borrando ? 'Borrando...' : 'Sí, Borrar Partido'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
