/**
 * @file Navbar.tsx
 * Barra de navegación superior deportiva, adaptada para mobile y desktop.
 * Muestra el escudo del equipo, la vista activa, el estado de sincronización (local/nube)
 * y el rol activo (Editor o Lector).
 */

import React from 'react';
import { 
  Shield, 
  Users, 
  PlusCircle, 
  Play, 
  Calendar, 
  BarChart3, 
  Settings, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  LogOut,
  UserCheck
} from 'lucide-react';
import { RolUsuario } from '../types';
import { SoccerBallLogo } from './SoccerBallLogo';
import { StorageService } from '../services/storage';

export type VistaActual = 
  | 'inicio' 
  | 'plantel' 
  | 'nuevo-partido' 
  | 'partido-vivo' 
  | 'historial' 
  | 'partido-detalle' 
  | 'estadisticas' 
  | 'configuracion';

interface NavbarProps {
  vistaActual: VistaActual;
  setVistaActual: (vista: VistaActual) => void;
  rol: RolUsuario;
  onLogout: () => void;
  hayPartidoEnVivo: boolean;
  colaSyncCount: number;
  isOnline: boolean;
  onSincronizarAhora: () => void;
  isSyncing: boolean;
  nombreEquipo?: string;
  colorPropio?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  vistaActual,
  setVistaActual,
  rol,
  onLogout,
  hayPartidoEnVivo,
  colaSyncCount,
  isOnline,
  onSincronizarAhora,
  isSyncing,
  nombreEquipo,
  colorPropio = '#3ddc84'
}) => {
  const nombreMostrar = nombreEquipo || StorageService.getNombreEquipo();

  return (
    <header className="sticky top-0 z-40 bg-[#0f1712]/95 backdrop-blur border-b border-[#243d2c]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo con Pelota de Fútbol y Nombre del Club */}
          <div 
            id="nav-brand"
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            onClick={() => setVistaActual('inicio')}
            title="Ir al inicio"
          >
            <div 
              className="w-10 h-10 rounded-xl p-0.5 shadow-lg flex items-center justify-center transition-transform group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${colorPropio}, #182a1f)`,
                boxShadow: `0 4px 14px -2px ${colorPropio}30`
              }}
            >
              <div className="w-full h-full bg-[#0f1712] rounded-[10px] flex items-center justify-center p-1.5">
                <SoccerBallLogo className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-lg tracking-wider text-white uppercase truncate max-w-[160px] sm:max-w-[240px]">
                  {nombreMostrar}
                </span>
                <span 
                  className="text-xs px-1.5 py-0.5 rounded font-bold font-display"
                  style={{
                    backgroundColor: `${colorPropio}20`,
                    color: colorPropio
                  }}
                >
                  F11
                </span>
              </div>
              <p className="text-[11px] text-[#9aa89f] -mt-0.5">Gestión de Partidos</p>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-btn-inicio"
              onClick={() => setVistaActual('inicio')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                vistaActual === 'inicio'
                  ? 'bg-[#182a1f] text-[#3ddc84] border border-[#2bb46a]/30'
                  : 'text-[#9aa89f] hover:text-white hover:bg-[#182a1f]/60'
              }`}
            >
              Inicio
            </button>

            <button
              id="nav-btn-plantel"
              onClick={() => setVistaActual('plantel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                vistaActual === 'plantel'
                  ? 'bg-[#182a1f] text-[#3ddc84] border border-[#2bb46a]/30'
                  : 'text-[#9aa89f] hover:text-white hover:bg-[#182a1f]/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Plantel
            </button>

            {rol === 'editor' && (
              <button
                id="nav-btn-nuevo-partido"
                onClick={() => setVistaActual('nuevo-partido')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  vistaActual === 'nuevo-partido'
                    ? 'bg-[#182a1f] text-[#3ddc84] border border-[#2bb46a]/30'
                    : 'text-[#9aa89f] hover:text-white hover:bg-[#182a1f]/60'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Nuevo Partido
              </button>
            )}

            {hayPartidoEnVivo && (
              <button
                id="nav-btn-partido-vivo"
                onClick={() => setVistaActual('partido-vivo')}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  vistaActual === 'partido-vivo'
                    ? 'bg-[#e63946] text-white shadow-lg shadow-[#e63946]/20'
                    : 'bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/40 hover:bg-[#e63946]/30'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <Play className="w-3.5 h-3.5 fill-current" />
                EN VIVO
              </button>
            )}

            <button
              id="nav-btn-historial"
              onClick={() => setVistaActual('historial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                vistaActual === 'historial' || vistaActual === 'partido-detalle'
                  ? 'bg-[#182a1f] text-[#3ddc84] border border-[#2bb46a]/30'
                  : 'text-[#9aa89f] hover:text-white hover:bg-[#182a1f]/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Historial
            </button>

            <button
              id="nav-btn-stats"
              onClick={() => setVistaActual('estadisticas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                vistaActual === 'estadisticas'
                  ? 'bg-[#182a1f] text-[#3ddc84] border border-[#2bb46a]/30'
                  : 'text-[#9aa89f] hover:text-white hover:bg-[#182a1f]/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Estadísticas
            </button>

            <button
              id="nav-btn-config"
              onClick={() => setVistaActual('configuracion')}
              className={`p-2 rounded-lg text-sm font-medium transition-all ${
                vistaActual === 'configuracion'
                  ? 'bg-[#182a1f] text-[#3ddc84] border border-[#2bb46a]/30'
                  : 'text-[#9aa89f] hover:text-white hover:bg-[#182a1f]/60'
              }`}
              title="Configuración y Google Sheets"
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>

          {/* Estado de conexión, Sync y Perfil */}
          <div className="flex items-center gap-2">
            
            {/* Pill de Sync */}
            <button
              id="btn-sync-status"
              onClick={onSincronizarAhora}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                colaSyncCount > 0
                  ? 'bg-amber-500/10 text-[#ffb703] border-amber-500/30 hover:bg-amber-500/20'
                  : isOnline
                  ? 'bg-[#243d2c]/40 text-[#3ddc84] border-[#243d2c] hover:bg-[#243d2c]/70'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
              title={colaSyncCount > 0 ? `${colaSyncCount} cambios pendientes de sincronizar` : 'Todo sincronizado'}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3ddc84]" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
              )}

              <span className="hidden sm:inline">
                {colaSyncCount > 0 ? `${colaSyncCount} pend.` : isOnline ? 'Local-First' : 'Offline'}
              </span>
            </button>

            {/* Badge de Rol */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#243d2c]">
              <span 
                className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
                  rol === 'editor'
                    ? 'bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30'
                    : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                }`}
              >
                {rol === 'editor' ? 'Editor DT' : 'Lector'}
              </span>

              {/* Salir */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-[#9aa89f] hover:text-white hover:bg-[#182a1f] transition-all"
                title="Cambiar de Rol / Salir"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Barra de navegación inferior móvil para pulgar */}
      <div className="md:hidden flex items-center justify-around bg-[#0f1712] border-t border-[#243d2c] py-2 px-1">
        <button
          onClick={() => setVistaActual('inicio')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[11px] font-medium transition-all ${
            vistaActual === 'inicio' ? 'text-[#3ddc84]' : 'text-[#9aa89f]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => setVistaActual('plantel')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[11px] font-medium transition-all ${
            vistaActual === 'plantel' ? 'text-[#3ddc84]' : 'text-[#9aa89f]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Plantel</span>
        </button>

        {hayPartidoEnVivo ? (
          <button
            onClick={() => setVistaActual('partido-vivo')}
            className="flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-xl bg-[#e63946] text-white font-bold text-[11px] shadow-md shadow-[#e63946]/30 animate-pulse"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>EN VIVO</span>
          </button>
        ) : rol === 'editor' ? (
          <button
            onClick={() => setVistaActual('nuevo-partido')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[11px] font-medium transition-all ${
              vistaActual === 'nuevo-partido' ? 'text-[#3ddc84]' : 'text-[#9aa89f]'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Partido</span>
          </button>
        ) : null}

        <button
          onClick={() => setVistaActual('historial')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[11px] font-medium transition-all ${
            vistaActual === 'historial' || vistaActual === 'partido-detalle' ? 'text-[#3ddc84]' : 'text-[#9aa89f]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Partidos</span>
        </button>

        <button
          onClick={() => setVistaActual('estadisticas')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[11px] font-medium transition-all ${
            vistaActual === 'estadisticas' ? 'text-[#3ddc84]' : 'text-[#9aa89f]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Stats</span>
        </button>

        <button
          onClick={() => setVistaActual('configuracion')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[11px] font-medium transition-all ${
            vistaActual === 'configuracion' ? 'text-[#3ddc84]' : 'text-[#9aa89f]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Ajustes</span>
        </button>
      </div>
    </header>
  );
};
