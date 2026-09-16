/**
 * @file LoginView.tsx
 * Pantalla de inicio de sesión por contraseña para Editor (DT) o Lector.
 * Incluye atajos rápidos para probar ambos roles en modo demostración.
 */

import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  UserCheck, 
  AlertCircle, 
  Cloud, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { RolUsuario, SesionAuth } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { SoccerBallLogo } from './SoccerBallLogo';

interface LoginViewProps {
  onLoginExitoso: (sesion: SesionAuth) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginExitoso }) => {
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  
  // Configuración de URL en la pantalla de login
  const [appsScriptUrl, setAppsScriptUrl] = useState(() => StorageService.getAppsScriptUrl());
  const [mostrarConfigUrl, setMostrarConfigUrl] = useState(false);
  const [guardandoUrl, setGuardandoUrl] = useState(false);
  const [mensajeUrl, setMensajeUrl] = useState<string | null>(null);

  const hayUrlConfigurada = Boolean(appsScriptUrl);

  const handleGuardarUrlDirecta = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = appsScriptUrl.trim();
    if (!trimmed) {
      StorageService.setAppsScriptUrl('');
      setMensajeUrl('Modo demo activado (URL vacía).');
      return;
    }

    setGuardandoUrl(true);
    setMensajeUrl(null);
    StorageService.setAppsScriptUrl(trimmed);

    try {
      const pingRes = await ApiService.testConexion(trimmed);
      if (pingRes.ok) {
        setMensajeUrl('¡Conexión exitosa con tu Google Apps Script!');
        setTimeout(() => setMostrarConfigUrl(false), 1500);
      } else {
        setMensajeUrl('Guardada, pero falló el ping: ' + pingRes.message);
      }
    } catch (err: any) {
      setMensajeUrl('Error de conexión: ' + err.message);
    } finally {
      setGuardandoUrl(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, customPass?: string) => {
    if (e) e.preventDefault();
    const pass = (customPass !== undefined ? customPass : password).trim();
    if (!pass) {
      setError('Por favor ingresá una contraseña');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await ApiService.login(pass);
      if (res.ok && res.session) {
        // Si no es demo, intentar descargar datos frescos en segundo plano
        if (!res.esModoDemo) {
          ApiService.descargarTodoDeGoogleSheets().catch(() => {});
        }
        onLoginExitoso(res.session);
      } else {
        setError(res.error || 'Contraseña incorrecta');
      }
    } catch (err: any) {
      setError('Error inesperado al iniciar sesión: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#182a1f]/90 border border-[#243d2c] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        
        {/* Glow deportivo de fondo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#3ddc84]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ffb703]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge de Estado: Google Sheets vs Modo Demo */}
        <div className="mb-4 flex items-center justify-center">
          {hayUrlConfigurada ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#3ddc84]/15 border border-[#3ddc84]/40 text-[#3ddc84]">
              <span className="w-2 h-2 rounded-full bg-[#3ddc84] animate-pulse" />
              Base de Datos Google Sheets Conectada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#ffb703]/15 border border-[#ffb703]/40 text-[#ffb703]">
              <span className="w-2 h-2 rounded-full bg-[#ffb703]" />
              Modo Demostración (Local)
            </span>
          )}
        </div>

        {/* Header con Pelota de Fútbol */}
        <div className="text-center mb-6">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl p-1 shadow-lg shadow-[#3ddc84]/20 mb-3"
            style={{
              background: `linear-gradient(135deg, ${StorageService.getClubConfig().colorPropio}, #182a1f)`
            }}
          >
            <div className="w-full h-full bg-[#0f1712] rounded-xl flex items-center justify-center p-2.5">
              <SoccerBallLogo className="w-10 h-10" />
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wide uppercase">
            {StorageService.getNombreEquipo()}
          </h1>
          <p className="text-xs sm:text-sm text-[#9aa89f] mt-1">
            Gestión de Partidos e Incidencias en Vivo — Fútbol 11
          </p>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#9aa89f] uppercase tracking-wider">
                Contraseña de Acceso
              </label>
              {hayUrlConfigurada && (
                <span className="text-[10px] text-[#3ddc84]">
                  Validación en vivo
                </span>
              )}
            </div>
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
                placeholder={hayUrlConfigurada ? "Tu contraseña (DT o Lector)" : "Ingresá contraseña (ej: dt1234)"}
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
            className="w-full py-3 px-4 bg-[#3ddc84] hover:bg-[#2bb46a] active:scale-[0.99] text-[#0f1712] font-bold rounded-xl transition-all shadow-lg shadow-[#3ddc84]/20 flex items-center justify-center gap-2 cursor-pointer font-display text-base tracking-wider disabled:opacity-50"
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

        {/* Indicador de conexión predeterminada */}
        <div className="mt-6 pt-4 border-t border-[#243d2c] text-center">
          <p className="text-[11px] text-[#9aa89f] inline-flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-[#3ddc84]" />
            <span>Sincronización oficial con Google Sheets activa</span>
          </p>
        </div>

      </div>
    </div>
  );
};
