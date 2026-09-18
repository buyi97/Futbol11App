/**
 * @file TacticaCancha.tsx
 * Componente interactivo de cancha de fútbol para:
 * - Armar la disposición táctica con esquemas (4-3-3, 4-4-2, 4-1-3-2, 4-3-1-2, 3-5-2, 4-2-3-1).
 * - Intercambiar jugadores de manera fluida tocando a uno y luego a otro (titulares y suplentes).
 * - Modificar el número de camiseta con doble click o botón de edición directa.
 * - Agregar y gestionar suplentes en el banco de relevos.
 * - Seleccionar jugadores para registrar incidencias durante el partido en vivo.
 */

import React, { useState } from 'react';
import { Edit2, ArrowRightLeft, Plus, X, Check } from 'lucide-react';

export interface JugadorEnCancha {
  id: string;
  nombre: string;
  numero: number | string;
  posicion?: string;
  x: number; // 0 - 100% horizontal
  y: number; // 0 - 100% vertical (0 arriba / arco rival, 100 abajo / arco propio)
  titular?: boolean;
  esRival?: boolean;
}

interface TacticaCanchaProps {
  jugadores: JugadorEnCancha[];
  suplentes?: JugadorEnCancha[];
  jugadorSeleccionadoId?: string | null;
  onSeleccionarJugador?: (jugadorId: string, jugador?: JugadorEnCancha) => void;
  onSeleccionarSuplente?: (jugadorId: string, jugador?: JugadorEnCancha) => void;
  
  // Modo intercambio y edición táctica
  permitirIntercambio?: boolean;
  onIntercambiarJugadores?: (idA: string, idB: string) => void;
  onEditarNumero?: (jugadorId: string, nuevoNumero: number) => void;
  onEditarNombre?: (jugadorId: string, nuevoNombre: string) => void;
  onAgregarSuplenteClick?: () => void;
  onEliminarSuplente?: (jugadorId: string) => void;

  titulo?: string;
  colorEquipo?: 'verde' | 'amarillo' | 'azul' | 'rojo';
  colorHex?: string; // Color personalizado del equipo / rival
  editableDorsales?: boolean;
  mostrarSuplentes?: boolean;
  modoInteractivo?: boolean;
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

export const TacticaCancha: React.FC<TacticaCanchaProps> = ({
  jugadores,
  suplentes = [],
  jugadorSeleccionadoId,
  onSeleccionarJugador,
  onSeleccionarSuplente,
  permitirIntercambio = false,
  onIntercambiarJugadores,
  onEditarNumero,
  onEditarNombre,
  onAgregarSuplenteClick,
  onEliminarSuplente,
  titulo,
  colorEquipo = 'verde',
  colorHex,
  editableDorsales = true,
  mostrarSuplentes = false,
  modoInteractivo = false
}) => {
  // Estado local para el intercambio de jugadores (tocar A, luego tocar B)
  const [jugadorParaSwapId, setJugadorParaSwapId] = useState<string | null>(null);

  // Estado para editar número con doble click / input inline
  const [editandoNumeroId, setEditandoNumeroId] = useState<string | null>(null);
  const [numeroTemp, setNumeroTemp] = useState<string>('');

  const textColor = colorHex ? getContrastingTextColor(colorHex) : undefined;

  const getBadgeColors = () => {
    if (colorHex) {
      return {
        jerseyBg: '',
        glow: 'ring-4 scale-110 shadow-lg',
        indicator: ''
      };
    }
    switch (colorEquipo) {
      case 'amarillo':
        return {
          jerseyBg: 'bg-[#ffb703] text-[#0f1712] border-[#ffd166]',
          glow: 'ring-4 ring-[#ffb703]/50 scale-110 shadow-lg shadow-[#ffb703]/30',
          indicator: 'bg-[#ffb703]'
        };
      case 'azul':
        return {
          jerseyBg: 'bg-blue-600 text-white border-blue-400',
          glow: 'ring-4 ring-blue-500/50 scale-110 shadow-lg shadow-blue-500/30',
          indicator: 'bg-blue-500'
        };
      case 'rojo':
        return {
          jerseyBg: 'bg-rose-600 text-white border-rose-400',
          glow: 'ring-4 ring-rose-500/50 scale-110 shadow-lg shadow-rose-500/30',
          indicator: 'bg-rose-500'
        };
      case 'verde':
      default:
        return {
          jerseyBg: 'bg-[#3ddc84] text-[#0f1712] border-[#80ed99]',
          glow: 'ring-4 ring-[#3ddc84]/50 scale-110 shadow-lg shadow-[#3ddc84]/30',
          indicator: 'bg-[#3ddc84]'
        };
    }
  };

  const colors = getBadgeColors();

  // Manejo de clic en jugador (en cancha o banco)
  const handleItemClick = (id: string, esSuplente: boolean) => {
    if (editandoNumeroId) return;

    // Si el modo intercambio está activo o configurado
    if (permitirIntercambio && onIntercambiarJugadores) {
      if (!jugadorParaSwapId) {
        setJugadorParaSwapId(id);
      } else if (jugadorParaSwapId === id) {
        // Deseleccionar si toca el mismo
        setJugadorParaSwapId(null);
      } else {
        // Intercambiar A con B
        onIntercambiarJugadores(jugadorParaSwapId, id);
        setJugadorParaSwapId(null);
      }
      return;
    }

    // Modo selección estándar para incidencias o visualización
    const jugadorEncontrado = jugadores.find(j => j.id === id) || suplentes.find(s => s.id === id);
    if (esSuplente && onSeleccionarSuplente) {
      onSeleccionarSuplente(id, jugadorEncontrado);
    } else if (onSeleccionarJugador) {
      onSeleccionarJugador(id, jugadorEncontrado);
    }
  };

  // Iniciar edición de número con doble click
  const handleDoubleClick = (id: string, numeroActual: number | string) => {
    if (!editableDorsales || !onEditarNumero) return;
    setEditandoNumeroId(id);
    setNumeroTemp(String(numeroActual));
  };

  const guardarNumero = (id: string) => {
    if (!onEditarNumero) return;
    const num = parseInt(numeroTemp, 10);
    if (!isNaN(num) && num >= 1 && num <= 99) {
      onEditarNumero(id, num);
    }
    setEditandoNumeroId(null);
  };

  // Obtener nombre del jugador que se está intercambiando
  const todosLosJugadores = [...jugadores, ...suplentes];
  const jugadorParaSwap = jugadorParaSwapId ? todosLosJugadores.find(j => j.id === jugadorParaSwapId) : null;

  return (
    <div className="flex flex-col items-center w-full">
      {titulo && (
        <div className="flex items-center justify-between w-full mb-2 px-1">
          <span className="text-xs font-bold font-display uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${colors.indicator}`} />
            {titulo}
          </span>
          <span className="text-[11px] text-zinc-400">
            {jugadores.length} titulares • {suplentes.length} suplentes
          </span>
        </div>
      )}

      {/* Barra de ayuda si hay un jugador seleccionado para intercambio */}
      {permitirIntercambio && (
        <div className="w-full max-w-lg mb-2">
          {jugadorParaSwapId ? (
            <div className="flex items-center justify-between bg-amber-500/20 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-200 animate-pulse">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  Seleccionado: <strong>#{jugadorParaSwap?.numero} {jugadorParaSwap?.nombre}</strong>. Tocá otro jugador (titular o suplente) para intercambiar.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setJugadorParaSwapId(null)}
                className="ml-2 px-2 py-0.5 bg-black/40 hover:bg-black/60 rounded text-[11px] text-amber-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-[#9aa89f] px-1 py-1">
              <span>💡 <strong>Tip táctico:</strong> Tocá un jugador y luego otro para intercambiar sus puestos. Hacé doble clic en el número para editarlo.</span>
            </div>
          )}
        </div>
      )}

      {/* Cancha de fútbol interactiva */}
      <div 
        className="relative w-full max-w-lg aspect-[3/4] bg-gradient-to-b from-[#134024] via-[#113820] to-[#0f301b] border-2 border-[#377148] rounded-2xl p-3 shadow-2xl overflow-hidden select-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.02) 0px,
              rgba(255, 255, 255, 0.02) 40px,
              transparent 40px,
              transparent 80px
            )
          `
        }}
      >
        {/* Líneas reglamentarias de la cancha */}
        <div className="absolute inset-3 border border-white/25 rounded-lg pointer-events-none">
          {/* Línea de mitad de cancha */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/25 -translate-y-1/2" />
          
          {/* Círculo central */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white/25 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />

          {/* Área Grande Superior (Arco Rival) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-20 border-b border-x border-white/25">
            {/* Área Chica Superior */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 border-b border-x border-white/25" />
            {/* Punto penal superior */}
            <div className="absolute top-14 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
          </div>

          {/* Área Grande Inferior (Arco Propio) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-20 border-t border-x border-white/25">
            {/* Área Chica Inferior */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 border-t border-x border-white/25" />
            {/* Punto penal inferior */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
          </div>
        </div>

        {/* Jugadores Titulares en Cancha */}
        {jugadores.map((j) => {
          const estaSeleccionadoParaIncidencia = jugadorSeleccionadoId === j.id;
          const estaParaSwap = jugadorParaSwapId === j.id;
          const estaEditandoNumero = editandoNumeroId === j.id;

          return (
            <div
              key={j.id}
              onClick={() => handleItemClick(j.id, false)}
              onDoubleClick={() => handleDoubleClick(j.id, j.numero)}
              style={{
                left: `${j.x}%`,
                top: `${j.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className={`absolute flex flex-col items-center cursor-pointer transition-all duration-150 z-20 group ${
                estaParaSwap 
                  ? 'scale-125 z-40' 
                  : estaSeleccionadoParaIncidencia 
                  ? 'scale-110 z-30' 
                  : 'hover:scale-110 hover:z-30'
              }`}
            >
              {/* Círculo dorsal de la camiseta */}
              <div
                className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold font-display text-sm sm:text-base border shadow-md transition-all ${
                  colors.jerseyBg
                } ${
                  estaParaSwap 
                    ? 'ring-4 ring-amber-400 scale-110 shadow-xl shadow-amber-400/40 animate-bounce' 
                    : estaSeleccionadoParaIncidencia 
                    ? colors.glow 
                    : 'group-hover:ring-2 group-hover:ring-white/60'
                }`}
                style={colorHex ? {
                  backgroundColor: colorHex,
                  color: textColor,
                  borderColor: 'rgba(255,255,255,0.4)',
                  boxShadow: estaSeleccionadoParaIncidencia ? `0 0 16px ${colorHex}` : undefined
                } : undefined}
                title={permitirIntercambio ? "Tocá para intercambiar posición" : undefined}
              >
                {estaEditandoNumero ? (
                  <input
                    type="number"
                    min="1"
                    max="99"
                    autoFocus
                    ref={(inputEl) => {
                      if (inputEl) {
                        inputEl.focus();
                        inputEl.select();
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    value={numeroTemp}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setNumeroTemp(e.target.value)}
                    onBlur={() => guardarNumero(j.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') guardarNumero(j.id);
                      if (e.key === 'Escape') setEditandoNumeroId(null);
                    }}
                    className="w-full text-center bg-black/90 text-white rounded font-bold text-xs p-0 border border-white focus:outline-none"
                  />
                ) : (
                  <>
                    <span>{j.numero}</span>
                    {editableDorsales && onEditarNumero && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoubleClick(j.id, j.numero);
                        }}
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] rounded-full text-[#3ddc84] flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                        title="Doble clic o toque para editar dorsal"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </>
                )}

                {/* Ícono de intercambio sutil en hover si está activo */}
                {permitirIntercambio && !estaParaSwap && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black/80 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRightLeft className="w-2.5 h-2.5 text-[#3ddc84]" />
                  </div>
                )}
              </div>

              {/* Nombre del jugador */}
              <div 
                className="mt-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-sm border border-black/50 text-[10px] sm:text-[11px] font-semibold text-white tracking-tight max-w-[110px] truncate text-center shadow whitespace-nowrap"
                title={j.nombre}
              >
                {j.nombre}
              </div>

              {/* Posición táctica */}
              {j.posicion && (
                <span className="text-[8px] uppercase tracking-wider text-emerald-300 font-bold opacity-80 mt-0.5">
                  {j.posicion}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Banco de Suplentes / Relevos */}
      {mostrarSuplentes && (
        <div className="w-full max-w-lg mt-3 p-3 bg-[#131f17] border border-[#243d2c] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🪑 Banco de Suplentes</span>
              <span className="text-zinc-400 font-normal">({suplentes.length})</span>
            </div>

            {onAgregarSuplenteClick && (
              <button
                type="button"
                onClick={onAgregarSuplenteClick}
                style={colorHex ? { borderColor: `${colorHex}66`, color: colorHex } : undefined}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84] text-[#3ddc84] hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Suplente
              </button>
            )}
          </div>

          {suplentes.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {suplentes.map((s) => {
                const estaSeleccionadoParaIncidencia = jugadorSeleccionadoId === s.id;
                const estaParaSwap = jugadorParaSwapId === s.id;
                const estaEditandoNumero = editandoNumeroId === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleItemClick(s.id, true)}
                    onDoubleClick={() => handleDoubleClick(s.id, s.numero)}
                    style={
                      colorHex && estaSeleccionadoParaIncidencia
                        ? { borderColor: colorHex, backgroundColor: `${colorHex}26` }
                        : undefined
                    }
                    className={`flex items-center justify-between gap-1 p-1.5 rounded-lg border text-left transition-all cursor-pointer group ${
                      estaParaSwap
                        ? 'bg-amber-500/30 border-amber-400 text-white ring-2 ring-amber-400 animate-pulse'
                        : estaSeleccionadoParaIncidencia
                        ? 'bg-[#3ddc84]/20 border-[#3ddc84] text-white'
                        : 'bg-[#182a1f]/60 hover:bg-[#182a1f] border-[#243d2c] text-zinc-300'
                    }`}
                    title={permitirIntercambio ? "Tocá para intercambiar con un titular o suplente" : undefined}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {estaEditandoNumero ? (
                        <input
                          type="number"
                          min="1"
                          max="99"
                          autoFocus
                          ref={(inputEl) => {
                            if (inputEl) {
                              inputEl.focus();
                              inputEl.select();
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          value={numeroTemp}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setNumeroTemp(e.target.value)}
                          onBlur={() => guardarNumero(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') guardarNumero(s.id);
                            if (e.key === 'Escape') setEditandoNumeroId(null);
                          }}
                          className="w-6 h-6 rounded-full bg-black text-center text-white font-bold text-xs border border-white focus:outline-none"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-zinc-700 text-zinc-200 text-xs font-bold font-display flex items-center justify-center shrink-0">
                          {s.numero}
                        </span>
                      )}

                      <span className="text-xs truncate font-medium" title={s.nombre}>
                        {s.nombre}
                      </span>
                    </div>

                    {/* Acciones de suplente */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {onEliminarSuplente && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEliminarSuplente(s.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-[#e63946] rounded opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Quitar suplente"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 py-1 italic">
              No hay suplentes cargados en el banco.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
