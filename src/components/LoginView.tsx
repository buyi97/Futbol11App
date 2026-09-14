/**
 * @file LoginView.tsx
 * Pantalla de inicio de sesión por contraseña para Editor (DT) o Lector.
 * Incluye atajos rápidos para probar ambos roles en modo demostración.
 */

import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { RolUsuario, SesionAuth } from '../types';
import { StorageService } from '../services/storage';

interface LoginViewProps {
  onLoginExitoso: (sesion: SesionAuth) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginExitoso }) => {
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = (e?: React.FormEvent, customPass?: string) => {
    if (e) e.preventDefault();
    const pass = (customPass !== undefined ? customPass : password).trim();
    if (!pass) {
      setError('Por favor ingresá una contraseña');
      return;
    }

    setCargando(true);
    setError(null);

    setTimeout(() => {
      // Comparación con contraseñas por defecto (o verificables vía Apps Script si se desea)
      // Editor default: dt1234
      // Lector default: hincha11
      if (pass === 'dt1234' || pass.toLowerCase() === 'editor') {
        const sesion: SesionAuth = {
          rol: 'editor',
          nombreUsuario: 'Director Técnico',
          token: 'tok-' + Date.now(),
          expiraEn: Date.now() + 12 * 60 * 60 * 1000
        };
        StorageService.setAuth(sesion);
        onLoginExitoso(sesion);
      } else if (pass === 'hincha11' || pass.toLowerCase() === 'lector') {
        const sesion: SesionAuth = {
          rol: 'lector',
          nombreUsuario: 'Aficionado / Lector',
          token: 'tok-' + Date.now(),
          expiraEn: Date.now() + 12 * 60 * 60 * 1000
        };
        StorageService.setAuth(sesion);
        onLoginExitoso(sesion);
      } else {
        setError('Contraseña incorrecta. Probá "dt1234" (Editor) o "hincha11" (Lector).');
        setCargando(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#182a1f]/90 border border-[#243d2c] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        
        {/* Glow deportivo de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#3ddc84]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ffb703]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header con Escudo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ddc84] to-[#1b5e3a] p-1 shadow-lg shadow-[#3ddc84]/20 mb-3">
            <div className="w-full h-full bg-[#0f1712] rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-[#3ddc84]" />
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wide uppercase">
            Los Halcones FC
          </h1>
          <p className="text-sm text-[#9aa89f] mt-1">
            Gestión de Partidos e Incidencias en Vivo — Fútbol 11
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase tracking-wider mb-2">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9aa89f]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-password"
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ingresá contraseña (ej: dt1234)"
                className="w-full pl-10 pr-11 py-3 bg-[#0f1712] border border-[#243d2c] focus:border-[#3ddc84] focus:ring-1 focus:ring-[#3ddc84] rounded-xl text-white placeholder-zinc-500 text-sm transition-all outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9aa89f] hover:text-white transition-colors"
              >
                {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-[#e63946] bg-[#e63946]/10 border border-[#e63946]/30 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="btn-submit-login"
            type="submit"
            disabled={cargando}
            className="w-full py-3 px-4 bg-[#3ddc84] hover:bg-[#2bb46a] active:scale-[0.99] text-[#0f1712] font-bold rounded-xl transition-all shadow-lg shadow-[#3ddc84]/20 flex items-center justify-center gap-2 cursor-pointer font-display text-base tracking-wider"
          >
            {cargando ? (
              <span className="inline-block animate-spin mr-2">⭮</span>
            ) : (
              <>
                INGRESAR AL SISTEMA
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Acceso Rápido para Demostración */}
        <div className="mt-8 pt-6 border-t border-[#243d2c]">
          <p className="text-xs font-medium text-[#9aa89f] text-center mb-3">
            Atajos de prueba rápida para esta demo:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="btn-quick-editor"
              type="button"
              onClick={() => handleSubmit(undefined, 'dt1234')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-[#3ddc84]/50 hover:bg-[#243d2c]/30 transition-all text-center cursor-pointer group"
            >
              <span className="text-xs font-bold text-[#3ddc84] group-hover:scale-105 transition-transform flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Rol Editor (DT)
              </span>
              <span className="text-[11px] text-[#9aa89f] mt-0.5">Clave: dt1234</span>
            </button>

            <button
              id="btn-quick-lector"
              type="button"
              onClick={() => handleSubmit(undefined, 'hincha11')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0f1712] border border-[#243d2c] hover:border-blue-400/50 hover:bg-[#243d2c]/30 transition-all text-center cursor-pointer group"
            >
              <span className="text-xs font-bold text-blue-400 group-hover:scale-105 transition-transform flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Rol Lector
              </span>
              <span className="text-[11px] text-[#9aa89f] mt-0.5">Clave: hincha11</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
