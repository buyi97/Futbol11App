/**
 * @file FichaEquipoModal.tsx
 * Modal interactivo que muestra la FICHA DEL EQUIPO completa al tocar un equipo:
 * - Posición, puntos, PG, PE, PP, GF, GC, DG y FairPlay en el Torneo Actual
 * - Posición, puntos, PG, PE, PP, GF, GC, DG en la Tabla Anual
 * - Historial partido a partido del torneo con resultados
 * - Goleadores del equipo en este torneo
 */

import React from 'react';
import { 
  X, 
  Shield, 
  Trophy, 
  Calendar, 
  Flame, 
  CheckCircle2, 
  MinusCircle, 
  XCircle, 
  Clock,
  Sparkles,
  MapPin
} from 'lucide-react';
import { FichaEquipoData } from '../types';

interface FichaEquipoModalProps {
  ficha: FichaEquipoData | null;
  nombreTorneo: string;
  colorPropio?: string;
  onClose: () => void;
}

export const FichaEquipoModal: React.FC<FichaEquipoModalProps> = ({
  ficha,
  nombreTorneo,
  colorPropio = '#3ddc84',
  onClose
}) => {
  if (!ficha) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#121c15] border border-[#243d2c] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con Escudo y Nombre */}
        <div 
          className="relative px-6 py-5 border-b border-[#243d2c] flex items-center justify-between"
          style={{
            background: ficha.esPropio 
              ? `linear-gradient(135deg, ${colorPropio}20, #121c15)`
              : 'linear-gradient(135deg, #182a1f, #121c15)'
          }}
        >
          <div className="flex items-center gap-3.5">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg font-display font-bold text-xl"
              style={{
                backgroundColor: ficha.esPropio ? `${colorPropio}30` : '#243d2c',
                color: ficha.esPropio ? colorPropio : '#9aa89f',
                border: `1.5px solid ${ficha.esPropio ? colorPropio : '#3a5843'}`
              }}
            >
              <Shield className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-xl sm:text-2xl text-white tracking-wide">
                  {ficha.equipo}
                </h3>
                {ficha.esPropio && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm"
                    style={{
                      backgroundColor: colorPropio,
                      color: '#0f1712'
                    }}
                  >
                    <Sparkles className="w-3 h-3 fill-current" />
                    Nuestro Equipo
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9aa89f] mt-0.5">
                Ficha del Club • {nombreTorneo}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar ficha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* 1. SECCIÓN: TORNEO ACTUAL */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#3ddc84] uppercase tracking-wider flex items-center gap-1.5 font-display">
                Rendimiento en el Torneo Actual
              </h4>
            </div>

            {/* Grid Stats Torneo Actual (5 Tarjetas independientes) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Posición */}
              <div className="bg-[#182a1f] border border-[#243d2c] p-3.5 rounded-xl text-center shadow-sm">
                <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">Posición</span>
                <span className="text-2xl sm:text-3xl font-display font-bold text-white my-1 block">
                  {ficha.actual.posicion}°
                </span>
                <span className="text-xs font-medium text-zinc-400 block">En la tabla</span>
              </div>

              {/* Puntos */}
              <div className="bg-[#182a1f] border border-[#243d2c] p-3.5 rounded-xl text-center shadow-sm">
                <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">Puntos (PTS)</span>
                <span className="text-2xl sm:text-3xl font-display font-bold text-[#3ddc84] my-1 block">
                  {ficha.actual.puntos}
                </span>
                <span className="text-xs font-medium text-zinc-400 block">{ficha.actual.pj} jugados</span>
              </div>

              {/* Partidos Ganados / Empatados / Perdidos */}
              <div className="bg-[#182a1f] border border-[#243d2c] p-3.5 rounded-xl text-center shadow-sm">
                <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">Partidos (G-E-P)</span>
                <div className="text-base sm:text-lg font-display font-bold text-white my-1.5 flex items-center justify-center gap-1">
                  <span className="text-emerald-400">{ficha.actual.pg}G</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-400">{ficha.actual.pe}E</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-rose-400">{ficha.actual.pp}P</span>
                </div>
                <span className="text-xs font-medium text-zinc-400 block">Récord</span>
              </div>

              {/* Diferencia de Gol */}
              <div className="bg-[#182a1f] border border-[#243d2c] p-3.5 rounded-xl text-center shadow-sm">
                <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">Diferencia Gol</span>
                <span className={`text-2xl sm:text-3xl font-display font-bold my-1 block ${
                  ficha.actual.dg > 0 ? 'text-emerald-400' : ficha.actual.dg < 0 ? 'text-rose-400' : 'text-zinc-200'
                }`}>
                  {ficha.actual.dg > 0 ? `+${ficha.actual.dg}` : ficha.actual.dg}
                </span>
                <span className="text-xs font-medium text-zinc-400 block">
                  {ficha.actual.gf} GF • {ficha.actual.gc} GC
                </span>
              </div>

              {/* Tarjeta independiente de Fair Play */}
              <div className="bg-[#182a1f] border border-[#243d2c] p-3.5 rounded-xl text-center shadow-sm col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">Fair-Play</span>
                <span className="text-2xl sm:text-3xl font-display font-bold text-sky-400 my-1 block">
                  {ficha.puntosFairPlay % 1 === 0 ? ficha.puntosFairPlay : ficha.puntosFairPlay.toFixed(1)} <span className="text-xs font-normal text-sky-400/80">pts</span>
                </span>
                <span className="text-xs font-medium text-zinc-400 block">
                  {ficha.posicionFairPlay > 0 ? `${ficha.posicionFairPlay}° en tabla Fair-Play` : 'En tabla Fair-Play'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. SECCIÓN: TABLA ANUAL ACUMULADA */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#ffb703] uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Calendar className="w-4 h-4 text-[#ffb703]" />
                Tabla Anual Acumulada
              </h4>
              <span className="text-xs text-zinc-400">
                Posición anual: <strong className="text-white text-sm font-display">{ficha.anual.posicion}°</strong>
              </span>
            </div>

            <div className="bg-[#15231b] border border-[#243d2c] rounded-xl p-3.5">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Posición</span>
                  <span className="text-lg font-display font-bold text-[#ffb703]">{ficha.anual.posicion}°</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Puntos</span>
                  <span className="text-lg font-display font-bold text-white">{ficha.anual.puntos}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">PJ</span>
                  <span className="text-lg font-display font-bold text-zinc-300">{ficha.anual.pj}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">G / E / P</span>
                  <span className="text-sm font-display font-bold text-zinc-200 mt-1 block">
                    {ficha.anual.pg}-{ficha.anual.pe}-{ficha.anual.pp}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">GF / GC</span>
                  <span className="text-sm font-display font-bold text-zinc-200 mt-1 block">
                    {ficha.anual.gf} / {ficha.anual.gc}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Dif Gol</span>
                  <span className={`text-sm font-display font-bold mt-1 block ${ficha.anual.dg > 0 ? 'text-emerald-400' : ficha.anual.dg < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                    {ficha.anual.dg > 0 ? `+${ficha.anual.dg}` : ficha.anual.dg}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SECCIÓN: HISTORIAL DE PARTIDOS EN EL TORNEO */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Clock className="w-4 h-4 text-emerald-400" />
                Historial de Fechas en este Torneo ({ficha.partidos.length})
              </h4>
              <span className="text-[11px] text-zinc-500">
                Resultados y próximos compromisos
              </span>
            </div>

            {ficha.partidos.length === 0 ? (
              <div className="bg-[#182a1f]/30 border border-dashed border-[#243d2c] p-6 rounded-xl text-center text-xs text-zinc-500">
                Este equipo aún no tiene partidos asignados en las fechas del torneo.
              </div>
            ) : (
              <div className="space-y-2">
                {ficha.partidos.map((p, idx) => {
                  let badgeBg = 'bg-zinc-800 text-zinc-400 border-zinc-700';
                  let badgeText = 'Pendiente';
                  let BadgeIcon = Clock;

                  if (p.resultado === 'V') {
                    badgeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                    badgeText = 'Victoria';
                    BadgeIcon = CheckCircle2;
                  } else if (p.resultado === 'E') {
                    badgeBg = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                    badgeText = 'Empate';
                    BadgeIcon = MinusCircle;
                  } else if (p.resultado === 'D') {
                    badgeBg = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
                    badgeText = 'Derrota';
                    BadgeIcon = XCircle;
                  }

                  return (
                    <div 
                      key={p.partidoId || idx}
                      className="bg-[#15231b] border border-[#243d2c] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[#2bb46a]/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-400 bg-[#182a1f] px-2 py-1 rounded-md font-display shrink-0">
                          {p.fechaNombre}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base text-white font-bold font-display tracking-wide">
                              vs {p.rival}
                            </span>
                          </div>
                          {(p.cancha || p.fechaHora) && (
                            <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                              {p.cancha || 'Cancha'} {p.fechaHora ? `• ${p.fechaHora}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {p.jugado && p.golesFavor !== null && p.golesContra !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-base font-display font-bold text-white bg-[#182a1f] px-2.5 py-0.5 rounded border border-[#243d2c]">
                              {p.golesFavor} - {p.golesContra}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${badgeBg}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badgeText}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 bg-[#182a1f] px-2.5 py-1 rounded border border-dashed border-[#243d2c] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            Por jugar
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. SECCIÓN: GOLEADORES DE ESTE EQUIPO */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-[#3ddc84] uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Flame className="w-4 h-4 text-orange-400" />
                Goleadores de {ficha.equipo} ({ficha.goleadores.length})
              </h4>
            </div>

            {ficha.goleadores.length === 0 ? (
              <div className="bg-[#182a1f]/30 border border-dashed border-[#243d2c] p-5 rounded-xl text-center text-xs text-zinc-500">
                Este equipo aún no registra jugadores en la tabla de goleadores.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ficha.goleadores.map((g, idx) => (
                  <div 
                    key={g.id || idx}
                    className="bg-[#15231b] border border-[#243d2c] rounded-xl px-3.5 py-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#182a1f] text-zinc-400 text-xs font-display font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-white truncate">
                        {g.nombre}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-base font-display font-bold text-[#3ddc84]">
                        {g.goles}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {g.goles === 1 ? 'gol' : 'goles'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#243d2c] bg-[#0f1712] flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {ficha.esPropio ? 'Datos vinculados a tu plantilla oficial' : 'Datos del equipo rival en este torneo'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#182a1f] text-zinc-300 hover:text-white border border-[#243d2c] hover:bg-[#243d2c] transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
