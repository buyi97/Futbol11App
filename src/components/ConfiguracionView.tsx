/**
 * @file ConfiguracionView.tsx
 * Configuración de la sincronización con Google Sheets (Google Apps Script),
 * sincronización total del historial vigente, inspector de la cola offline,
 * prueba de conexión (ping), backup en JSON y visualizador/copiador de Code.gs.
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  FileCode, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  Check,
  CloudUpload,
  CloudDownload,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Share2,
  Key,
  Users,
  Link,
  Trophy,
  Palette,
  Shield,
  Lock,
  Plus,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { APPS_SCRIPT_CODE } from '../data/appsScriptCode';
import { RolUsuario, ClubConfig, Torneo, TipoTorneo } from '../types';
import { SoccerBallLogo } from './SoccerBallLogo';

interface ConfiguracionViewProps {
  rol?: RolUsuario;
  onDatosActualizados: () => void;
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  rol,
  onDatosActualizados
}) => {
  const [urlAppScript, setUrlAppScript] = useState<string>(() => StorageService.getAppsScriptUrl());
  const [probando, setProbando] = useState(false);
  const [resultadoPing, setResultadoPing] = useState<{
    ok: boolean;
    mensaje: string;
    diagnostic?: {
      esDevUrl?: boolean;
      esSheetUrl?: boolean;
      esEditorUrl?: boolean;
      urlUsada?: string;
      urlSugerida?: string;
    };
  } | null>(null);
  
  const [sincronizando, setSincronizando] = useState(false);
  const [colaItems, setColaItems] = useState(StorageService.getColaSync());
  const [copiado, setCopiado] = useState(false);
  const [inicializando, setInicializando] = useState(false);
  const [mensajeInit, setMensajeInit] = useState<string | null>(null);

  // Estados para la Sincronización Total del Historial
  const [sincronizandoTodo, setSincronizandoTodo] = useState(false);
  const [progresoTexto, setProgresoTexto] = useState<string>('');
  const [progresoPorcentaje, setProgresoPorcentaje] = useState<number>(0);
  const [resultadoSincronizacion, setResultadoSincronizacion] = useState<{
    ok: boolean;
    message: string;
    detalles?: any;
    metodo?: string;
  } | null>(null);
  
  const [autoSincronizarAlConectar, setAutoSincronizarAlConectar] = useState<boolean>(() => {
    return localStorage.getItem('futbol11_autosync_al_conectar') !== 'false';
  });
  const [mostrarInvitacionSincronizar, setMostrarInvitacionSincronizar] = useState(false);
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [copiadoSnippet, setCopiadoSnippet] = useState(false);

  const getLinkCompartir = () => {
    if (typeof window === 'undefined') return '';
    const urlBase = window.location.origin + window.location.pathname;
    if (!urlAppScript) return urlBase;
    return `${urlBase}?script=${encodeURIComponent(urlAppScript.trim())}`;
  };

  const handleCopiarLink = () => {
    const link = getLinkCompartir();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 2500);
    }
  };

  const handleCopiarSnippet = () => {
    const snippet = `export const DEFAULT_APPS_SCRIPT_URL = '${urlAppScript.trim()}';`;
    navigator.clipboard.writeText(snippet);
    setCopiadoSnippet(true);
    setTimeout(() => setCopiadoSnippet(false), 2500);
  };

  // Contadores de BD Local
  const totalJugadores = StorageService.getPlantel().length;
  const totalPartidos = StorageService.getPartidos().length;
  const totalConvocados = StorageService.getConvocados().length;
  const totalRivales = StorageService.getRivales().length;
  const totalIncidencias = StorageService.getIncidencias().length;

  // Rol del usuario actual
  const esEditor = rol === 'editor';

  // Configuración de Identidad del Club y Colores
  const [clubConfig, setClubConfig] = useState<ClubConfig>(() => StorageService.getClubConfig());
  const [nombreEquipoInput, setNombreEquipoInput] = useState(clubConfig.nombre);
  const [colorPropioInput, setColorPropioInput] = useState(clubConfig.colorPropio);
  const [colorRivalInput, setColorRivalInput] = useState(clubConfig.colorRival);
  const [mensajeClubGuardado, setMensajeClubGuardado] = useState(false);

  // Gestión de Temporadas / Torneos
  const [torneos, setTorneos] = useState<Torneo[]>(() => StorageService.getTorneos());
  const [mostrarFormNuevoTorneo, setMostrarFormNuevoTorneo] = useState(false);
  const [tipoNuevoTorneo, setTipoNuevoTorneo] = useState<TipoTorneo>('Apertura');
  const [anioNuevoTorneo, setAnioNuevoTorneo] = useState<number>(new Date().getFullYear());
  const [nombreNuevoTorneo, setNombreNuevoTorneo] = useState(`Torneo Apertura ${new Date().getFullYear()}`);
  const [mensajeTorneoGuardado, setMensajeTorneoGuardado] = useState<string | null>(null);

  // Partidos para contar por torneo
  const partidos = StorageService.getPartidos();

  const handleGuardarClubConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esEditor) return;
    const nuevoNombre = nombreEquipoInput.trim() || 'Los Halcones FC';
    const nuevoConfig: ClubConfig = {
      nombre: nuevoNombre,
      colorPropio: colorPropioInput,
      colorRival: colorRivalInput
    };
    StorageService.saveClubConfig(nuevoConfig);
    setClubConfig(nuevoConfig);
    setMensajeClubGuardado(true);
    setTimeout(() => setMensajeClubGuardado(false), 3500);
    onDatosActualizados();
  };

  const handleTipoTorneoChange = (tipo: TipoTorneo) => {
    setTipoNuevoTorneo(tipo);
    const tipoLabel = tipo === 'Copa' ? 'Copa' : `Torneo ${tipo}`;
    setNombreNuevoTorneo(`${tipoLabel} ${anioNuevoTorneo}`);
  };

  const handleAnioTorneoChange = (anio: number) => {
    setAnioNuevoTorneo(anio);
    const tipoLabel = tipoNuevoTorneo === 'Copa' ? 'Copa' : `Torneo ${tipoNuevoTorneo}`;
    setNombreNuevoTorneo(`${tipoLabel} ${anio}`);
  };

  const handleCrearTorneo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esEditor || !nombreNuevoTorneo.trim()) return;

    const nuevo = StorageService.iniciarTorneo(
      tipoNuevoTorneo,
      Number(anioNuevoTorneo) || new Date().getFullYear(),
      nombreNuevoTorneo.trim()
    );

    setTorneos(StorageService.getTorneos());
    setMostrarFormNuevoTorneo(false);
    setMensajeTorneoGuardado(`¡Torneo "${nuevo.nombre}" iniciado como temporada activa!`);
    setTimeout(() => setMensajeTorneoGuardado(null), 4000);
    onDatosActualizados();
  };

  const handleCerrarTorneo = (id: string, nombre: string) => {
    if (!esEditor) return;
    if (confirm(`¿Estás seguro de cerrar la temporada/torneo "${nombre}"? Los nuevos partidos no pertenecerán a este torneo a menos que lo reabras.`)) {
      StorageService.cerrarTorneo(id);
      setTorneos(StorageService.getTorneos());
      setMensajeTorneoGuardado(`Se cerró la temporada "${nombre}".`);
      setTimeout(() => setMensajeTorneoGuardado(null), 3500);
      onDatosActualizados();
    }
  };

  const handleReabrirTorneo = (id: string, nombre: string) => {
    if (!esEditor) return;
    StorageService.reabrirTorneo(id);
    setTorneos(StorageService.getTorneos());
    setMensajeTorneoGuardado(`Se reabrió "${nombre}" como torneo activo.`);
    setTimeout(() => setMensajeTorneoGuardado(null), 3500);
    onDatosActualizados();
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSincronizarAlConectar(checked);
    localStorage.setItem('futbol11_autosync_al_conectar', checked ? 'true' : 'false');
  };

  const handleGuardarUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlAppScript.trim();
    StorageService.setAppsScriptUrl(trimmed);
    setResultadoPing(null);
    setResultadoSincronizacion(null);
  };

  const handleSincronizarTodoElHistorial = async () => {
    const url = StorageService.getAppsScriptUrl();
    if (!url) {
      setResultadoSincronizacion({
        ok: false,
        message: 'Primero configurá y guardá la URL de tu Google Apps Script.'
      });
      return;
    }

    setSincronizandoTodo(true);
    setProgresoTexto('Iniciando sincronización completa del historial...');
    setProgresoPorcentaje(5);
    setResultadoSincronizacion(null);

    try {
      const res = await ApiService.sincronizarTodoElHistorial((msg, pct) => {
        setProgresoTexto(msg);
        setProgresoPorcentaje(pct);
      });

      setResultadoSincronizacion(res);
      if (res.ok) {
        setMostrarInvitacionSincronizar(false);
        // La cola se vacía porque todo el estado vigente ya fue empujado a Sheets
        StorageService.limpiarColaSync();
        setColaItems([]);
        onDatosActualizados();
      }
    } catch (err: any) {
      setResultadoSincronizacion({
        ok: false,
        message: 'Error inesperado al sincronizar: ' + (err.message || err.toString())
      });
    } finally {
      setSincronizandoTodo(false);
    }
  };

  const handleDescargarTodoDeGoogleSheets = async () => {
    const url = StorageService.getAppsScriptUrl();
    if (!url) {
      alert('Primero configurá la URL de tu Google Apps Script.');
      return;
    }

    const confirmar = window.confirm(
      '¿Descargar y actualizar los datos locales desde Google Sheets? Se importará el plantel, partidos e incidencias existentes en la planilla.'
    );
    if (!confirmar) return;

    setSincronizandoTodo(true);
    setProgresoTexto('Descargando datos desde Google Sheets...');
    setProgresoPorcentaje(20);
    setResultadoSincronizacion(null);

    try {
      const res = await ApiService.descargarTodoDeGoogleSheets((msg, pct) => {
        setProgresoTexto(msg);
        setProgresoPorcentaje(pct);
      });

      if (res.ok) {
        setResultadoSincronizacion({
          ok: true,
          message: '¡Datos descargados e integrados exitosamente en tu dispositivo!',
          detalles: res.datos
        });
        onDatosActualizados();
      } else {
        setResultadoSincronizacion({
          ok: false,
          message: res.message
        });
      }
    } catch (err: any) {
      setResultadoSincronizacion({
        ok: false,
        message: 'Error al descargar datos: ' + (err.message || err.toString())
      });
    } finally {
      setSincronizandoTodo(false);
    }
  };

  const handleProbarPing = async () => {
    const trimmed = urlAppScript.trim();
    if (!trimmed) {
      setResultadoPing({ ok: false, mensaje: 'Primero ingresá la URL de tu Web App de Google Apps Script' });
      return;
    }
    setProbando(true);
    setResultadoPing(null);
    setResultadoSincronizacion(null);

    StorageService.setAppsScriptUrl(trimmed);
    const res = await ApiService.testConexion(trimmed);
    setProbando(false);

    if (res.ok) {
      setResultadoPing({
        ok: true,
        mensaje: res.message || '¡Conexión exitosa con Google Apps Script y Google Sheets!'
      });

      const hayDatosLocales = (totalJugadores > 0 || totalPartidos > 0);
      if (hayDatosLocales) {
        if (autoSincronizarAlConectar) {
          // Disparo automático de subida total de datos
          handleSincronizarTodoElHistorial();
        } else {
          setMostrarInvitacionSincronizar(true);
        }
      }
    } else {
      setResultadoPing({
        ok: false,
        mensaje: res.message || 'No se pudo conectar con el script.',
        diagnostic: res.diagnostic
      });
    }
  };

  const handleInitSheets = async () => {
    setInicializando(true);
    setMensajeInit(null);
    const res = await ApiService.inicializarHojas();
    setInicializando(false);
    if (res.ok) {
      setMensajeInit('Hojas creadas / verificadas exitosamente en tu Google Spreadsheet.');
    } else {
      setMensajeInit('Error al inicializar: ' + (res.error || 'Verificá tu URL.'));
    }
  };

  const handleProcesarCola = async () => {
    setSincronizando(true);
    await ApiService.procesarColaSync();
    setColaItems(StorageService.getColaSync());
    setSincronizando(false);
    onDatosActualizados();
  };

  const handleLimpiarCola = () => {
    StorageService.limpiarColaSync();
    setColaItems([]);
  };

  const handleCopiarCodigo = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Exportar backup JSON
  const handleExportarBackup = () => {
    const backup = {
      version: '1.0.0',
      fecha: new Date().toISOString(),
      plantel: StorageService.getPlantel(),
      partidos: StorageService.getPartidos(),
      convocados: StorageService.getConvocados(),
      rivales: StorageService.getRivales(),
      incidencias: StorageService.getIncidencias()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `los_halcones_fc_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar backup JSON
  const handleImportarBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.plantel) StorageService.savePlantel(data.plantel);
        if (data.partidos) StorageService.savePartidos(data.partidos);
        if (data.convocados) StorageService.saveConvocados(data.convocados);
        if (data.rivales) StorageService.saveRivales(data.rivales);
        if (data.incidencias) StorageService.saveIncidencias(data.incidencias);

        alert('¡Datos restaurados con éxito desde el archivo JSON!');
        onDatosActualizados();
      } catch (err) {
        alert('Archivo JSON no válido para restauración.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#3ddc84]" />
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-wider">
            Configuración & Google Sheets
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#9aa89f] mt-0.5">
          Conexión con tu base de datos en Google Drive mediante Google Apps Script y sincronización integral.
        </p>
      </div>

      {/* Banner de Invitación de Sincronización Inmediata tras conexión exitosa */}
      {mostrarInvitacionSincronizar && !sincronizandoTodo && (
        <div className="bg-gradient-to-r from-[#1b3a24] to-[#12281a] border-2 border-[#3ddc84] rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 text-[#3ddc84]">
              <Sparkles className="w-6 h-6 shrink-0" />
              <h3 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wide">
                ¡Conexión Exitosa! ¿Sincronizar historial vigente ahora?
              </h3>
            </div>
            <button
              onClick={() => setMostrarInvitacionSincronizar(false)}
              className="text-[#9aa89f] hover:text-white text-xs px-2 py-1 rounded-md transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>

          <p className="text-xs sm:text-sm text-[#b8d5c0] leading-relaxed">
            Tu dispositivo cuenta con <strong>{totalJugadores} jugadores</strong> en el plantel,{' '}
            <strong>{totalPartidos} partidos</strong> en el historial y <strong>{totalIncidencias} incidencias</strong> registradas.
            Hacé clic en el botón para subirlos todos inmediatamente a tu planilla de Google Sheets.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSincronizarTodoElHistorial}
              className="px-4 py-2.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#3ddc84]/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CloudUpload className="w-4 h-4" />
              SUBIR Y SINCRONIZAR TODO AHORA
            </button>
            <button
              type="button"
              onClick={() => setMostrarInvitacionSincronizar(false)}
              className="px-3.5 py-2 text-xs text-[#9aa89f] hover:text-white border border-[#243d2c] rounded-xl transition-all cursor-pointer"
            >
              Más tarde
            </button>
          </div>
        </div>
      )}

      {/* SECCIÓN A: IDENTIDAD DEL CLUB Y COLORES DE EQUIPACIÓN */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-[#3ddc84]" />
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
              Identidad del Club & Colores
            </h2>
          </div>
          {esEditor ? (
            <span className="text-[11px] font-semibold text-[#3ddc84] bg-[#3ddc84]/15 border border-[#3ddc84]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Modo Editor (Podés cambiar nombre y colores)
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-zinc-400 bg-zinc-800/80 border border-zinc-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Solo Lectura (Ingresá como Editor para modificar)
            </span>
          )}
        </div>

        <p className="text-xs text-[#9aa89f] leading-relaxed">
          Personalizá el nombre oficial de tu equipo y la paleta de colores para camisetas, insignias y equipos rivales.
        </p>

        {mensajeClubGuardado && (
          <div className="p-3 bg-[#3ddc84]/15 border border-[#3ddc84]/50 rounded-xl text-xs font-semibold text-[#3ddc84] flex items-center gap-2 animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            ¡Identidad y colores guardados exitosamente en la aplicación!
          </div>
        )}

        <form onSubmit={handleGuardarClubConfig} className="space-y-4">
          {/* Nombre del Equipo */}
          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1.5">
              Nombre Oficial del Equipo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={!esEditor}
                value={nombreEquipoInput}
                onChange={(e) => setNombreEquipoInput(e.target.value)}
                placeholder="Ej: Los Halcones FC"
                className="flex-1 px-3.5 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#3ddc84] disabled:opacity-60"
              />
            </div>
          </div>

          {/* Colores: Propio y Rival */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Color Primario Propio */}
            <div className="p-4 bg-[#0f1712] border border-[#243d2c] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: colorPropioInput }} />
                  Color Principal (Tu Equipo)
                </span>
                <span className="text-[11px] font-mono text-zinc-400 font-semibold">{colorPropioInput}</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled={!esEditor}
                  value={colorPropioInput}
                  onChange={(e) => setColorPropioInput(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {[
                    { hex: '#3ddc84', label: 'Verde (Default)' },
                    { hex: '#2563eb', label: 'Azul' },
                    { hex: '#0284c7', label: 'Celeste' },
                    { hex: '#e63946', label: 'Rojo' },
                    { hex: '#f59e0b', label: 'Dorado' },
                    { hex: '#8b5cf6', label: 'Violeta' },
                    { hex: '#18181b', label: 'Negro' },
                    { hex: '#f8fafc', label: 'Blanco' }
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      disabled={!esEditor}
                      onClick={() => setColorPropioInput(color.hex)}
                      title={color.label}
                      style={{ backgroundColor: color.hex }}
                      className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                        colorPropioInput.toLowerCase() === color.hex.toLowerCase()
                          ? 'ring-2 ring-white scale-110 border-white'
                          : 'border-black/30 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Color Predeterminado Rival */}
            <div className="p-4 bg-[#0f1712] border border-[#243d2c] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: colorRivalInput }} />
                  Color Por Defecto (Rivales)
                </span>
                <span className="text-[11px] font-mono text-zinc-400 font-semibold">{colorRivalInput}</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled={!esEditor}
                  value={colorRivalInput}
                  onChange={(e) => setColorRivalInput(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {[
                    { hex: '#ffb703', label: 'Ámbar (Default)' },
                    { hex: '#ef4444', label: 'Rojo' },
                    { hex: '#1e40af', label: 'Azul' },
                    { hex: '#f97316', label: 'Naranja' },
                    { hex: '#15803d', label: 'Verde' },
                    { hex: '#64748b', label: 'Gris' },
                    { hex: '#0f172a', label: 'Negro' },
                    { hex: '#ffffff', label: 'Blanco' }
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      disabled={!esEditor}
                      onClick={() => setColorRivalInput(color.hex)}
                      title={color.label}
                      style={{ backgroundColor: color.hex }}
                      className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                        colorRivalInput.toLowerCase() === color.hex.toLowerCase()
                          ? 'ring-2 ring-white scale-110 border-white'
                          : 'border-black/30 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Vista previa en vivo del resultado */}
          <div className="p-4 bg-[#0a100d] border border-[#243d2c] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SoccerBallLogo primaryColor={colorPropioInput} size={36} />
              <div>
                <span className="text-[10px] text-[#9aa89f] font-semibold uppercase tracking-wider block">
                  Vista Previa del Escudo y Marcador
                </span>
                <span className="text-sm font-bold text-white tracking-wide">
                  {nombreEquipoInput || 'Tu Equipo'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span
                className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-white"
                style={{ backgroundColor: `${colorPropioInput}25`, borderColor: colorPropioInput }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorPropioInput }} />
                {nombreEquipoInput || 'Local'}
              </span>
              <span className="text-zinc-500 font-mono">VS</span>
              <span
                className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-white"
                style={{ backgroundColor: `${colorRivalInput}25`, borderColor: colorRivalInput }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorRivalInput }} />
                Equipo Rival
              </span>
            </div>
          </div>

          {esEditor && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#3ddc84]/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                GUARDAR NOMBRE Y COLORES
              </button>
            </div>
          )}
        </form>
      </div>

      {/* SECCIÓN B: HISTORIAL POR TEMPORADAS Y TORNEOS */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-[#ffb703]" />
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
              Temporadas & Torneos
            </h2>
          </div>
          {esEditor && (
            <button
              type="button"
              onClick={() => setMostrarFormNuevoTorneo(!mostrarFormNuevoTorneo)}
              className="px-3 py-1.5 bg-[#ffb703] hover:bg-[#e0a000] text-[#0f1712] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {mostrarFormNuevoTorneo ? 'Cancelar' : 'Iniciar Nueva Temporada / Torneo'}
            </button>
          )}
        </div>

        <p className="text-xs text-[#9aa89f] leading-relaxed">
          Organizá tus partidos por torneo (Apertura, Clausura, Torneo Anual) con su año correspondiente. Al iniciar una nueva temporada, quedará activa como predeterminada para los partidos nuevos. Al cerrarla, queda archivada en el historial.
        </p>

        {mensajeTorneoGuardado && (
          <div className="p-3 bg-[#3ddc84]/15 border border-[#3ddc84]/50 rounded-xl text-xs font-semibold text-[#3ddc84] flex items-center gap-2 animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {mensajeTorneoGuardado}
          </div>
        )}

        {/* Formulario desplegable para Iniciar Torneo */}
        {mostrarFormNuevoTorneo && esEditor && (
          <form onSubmit={handleCrearTorneo} className="p-4 sm:p-5 bg-[#0f1712] border border-[#ffb703]/50 rounded-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#243d2c] pb-2">
              <span className="text-xs font-bold text-[#ffb703] uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4" /> Iniciar Nueva Temporada o Torneo
              </span>
              <button
                type="button"
                onClick={() => setMostrarFormNuevoTorneo(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Tipo de Torneo */}
              <div>
                <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
                  Tipo de Competencia
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'Apertura', label: 'Apertura' },
                    { id: 'Clausura', label: 'Clausura' },
                    { id: 'Anual', label: 'Anual' },
                    { id: 'Copa', label: 'Copa / Otro' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTipoTorneoChange(t.id as TipoTorneo)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        tipoNuevoTorneo === t.id
                          ? 'bg-[#ffb703] text-[#0f1712] border-[#ffb703]'
                          : 'bg-[#182a1f] border-[#243d2c] text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Año */}
              <div>
                <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
                  Año del Torneo
                </label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={anioNuevoTorneo}
                  onChange={(e) => handleAnioTorneoChange(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full px-3 py-2 bg-[#182a1f] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#ffb703]"
                />
              </div>

              {/* Nombre Final */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
                  Nombre a Mostrar
                </label>
                <input
                  type="text"
                  required
                  value={nombreNuevoTorneo}
                  onChange={(e) => setNombreNuevoTorneo(e.target.value)}
                  placeholder="Ej: Torneo Apertura 2026"
                  className="w-full px-3 py-2 bg-[#182a1f] border border-[#243d2c] rounded-xl text-sm text-white focus:outline-none focus:border-[#ffb703]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#9aa89f]">
              ℹ️ Al crear este torneo, pasará automáticamente a ser la <strong>temporada activa en curso</strong>. Podrás cerrarla en cualquier momento al concluir las fechas del torneo.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMostrarFormNuevoTorneo(false)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white border border-[#243d2c] rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#ffb703] hover:bg-[#e0a000] text-[#0f1712] font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all cursor-pointer"
              >
                INICIAR TEMPORADA AHORA
              </button>
            </div>
          </form>
        )}

        {/* Lista de Torneos Existentes */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Historial de Torneos Registrados ({torneos.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {torneos.map((t) => {
              const partidosTorneo = partidos.filter(p => p.torneo_id === t.id);
              const esActivo = t.estado === 'activo';

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    esActivo
                      ? 'bg-[#0f1712] border-[#3ddc84]/60 shadow-lg shadow-[#3ddc84]/5'
                      : 'bg-[#0f1712]/70 border-[#243d2c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy className={`w-4 h-4 ${esActivo ? 'text-[#3ddc84]' : 'text-zinc-500'}`} />
                        <h4 className="text-sm font-bold text-white">{t.nombre}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#9aa89f]">
                        <span className="capitalize">{t.tipo}</span>
                        <span>•</span>
                        <span>Año {t.anio}</span>
                        <span>•</span>
                        <strong className="text-white">{partidosTorneo.length} partidos</strong>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md shrink-0 ${
                      esActivo
                        ? 'bg-[#3ddc84]/20 text-[#3ddc84] border border-[#3ddc84]/40'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {esActivo ? '🟢 En curso' : '🔒 Cerrado'}
                    </span>
                  </div>

                  {esEditor && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#243d2c]">
                      {esActivo ? (
                        <button
                          type="button"
                          onClick={() => handleCerrarTorneo(t.id, t.nombre)}
                          className="px-3 py-1 bg-[#0f1712] hover:bg-[#e63946]/20 border border-[#e63946]/40 text-[#e63946] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Cerrar Temporada
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReabrirTorneo(t.id, t.nombre)}
                          className="px-3 py-1 bg-[#0f1712] hover:bg-[#3ddc84]/20 border border-[#3ddc84]/40 text-[#3ddc84] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Reabrir como Activo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 1. Sincronización Total del Historial con Google Sheets (Card Principal) */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-[#3ddc84]" />
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
              Sincronización Total del Historial
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-[#3ddc84] bg-[#3ddc84]/10 border border-[#3ddc84]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Local-First Activo
          </span>
        </div>

        <p className="text-xs text-[#9aa89f] leading-relaxed">
          Al conectar una nueva URL de Google Apps Script o cuando lo necesites, podés <strong>subir y guardar todos los datos vigentes hasta el momento</strong> (plantel completo, historial de partidos, listas de convocados, rivales y todas las incidencias) directamente en tu Google Sheet.
        </p>

        {/* Chips con datos locales vigentes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-[#0f1712] border border-[#243d2c] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-white">{totalJugadores}</span>
            <span className="text-[11px] text-[#9aa89f] font-semibold uppercase">Jugadores</span>
          </div>
          <div className="bg-[#0f1712] border border-[#243d2c] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-white">{totalPartidos}</span>
            <span className="text-[11px] text-[#9aa89f] font-semibold uppercase">Partidos</span>
          </div>
          <div className="bg-[#0f1712] border border-[#243d2c] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-white">{totalConvocados}</span>
            <span className="text-[11px] text-[#9aa89f] font-semibold uppercase">Convocatorias</span>
          </div>
          <div className="bg-[#0f1712] border border-[#243d2c] rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-white">{totalIncidencias}</span>
            <span className="text-[11px] text-[#9aa89f] font-semibold uppercase">Incidencias</span>
          </div>
        </div>

        {/* Barra de progreso interactiva */}
        {sincronizandoTodo && (
          <div className="bg-[#0f1712] border border-[#3ddc84]/40 rounded-xl p-4 space-y-2.5 animate-pulse">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3ddc84]">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {progresoTexto || 'Sincronizando con Google Sheets...'}
              </span>
              <span>{progresoPorcentaje}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#182a1f] rounded-full overflow-hidden border border-[#243d2c]">
              <div 
                className="h-full bg-gradient-to-r from-[#2bb46a] to-[#3ddc84] transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(5, progresoPorcentaje)}%` }}
              />
            </div>
          </div>
        )}

        {/* Mensaje de Resultado de Sincronización */}
        {resultadoSincronizacion && !sincronizandoTodo && (
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            resultadoSincronizacion.ok
              ? 'bg-[#3ddc84]/15 border-[#3ddc84]/40 text-[#3ddc84]'
              : 'bg-[#e63946]/15 border-[#e63946]/40 text-[#e63946]'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm">
              {resultadoSincronizacion.ok ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>{resultadoSincronizacion.message}</span>
            </div>

            {resultadoSincronizacion.detalles && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold text-white/90">
                {resultadoSincronizacion.detalles.jugadores !== undefined && (
                  <span className="bg-[#0f1712]/60 px-2 py-0.5 rounded-md border border-white/10">
                    👥 {resultadoSincronizacion.detalles.jugadores} Jugadores
                  </span>
                )}
                {resultadoSincronizacion.detalles.partidos !== undefined && (
                  <span className="bg-[#0f1712]/60 px-2 py-0.5 rounded-md border border-white/10">
                    🏆 {resultadoSincronizacion.detalles.partidos} Partidos
                  </span>
                )}
                {resultadoSincronizacion.detalles.convocados !== undefined && (
                  <span className="bg-[#0f1712]/60 px-2 py-0.5 rounded-md border border-white/10">
                    📋 {resultadoSincronizacion.detalles.convocados} Convocados
                  </span>
                )}
                {resultadoSincronizacion.detalles.incidencias !== undefined && (
                  <span className="bg-[#0f1712]/60 px-2 py-0.5 rounded-md border border-white/10">
                    ⚽ {resultadoSincronizacion.detalles.incidencias} Incidencias
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Botones de acción principales */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSincronizarTodoElHistorial}
            disabled={sincronizandoTodo}
            className="px-4 py-2.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs rounded-xl shadow-lg shadow-[#3ddc84]/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <CloudUpload className="w-4 h-4" />
            {sincronizandoTodo ? 'SINCRONIZANDO...' : 'SUBIR TODO EL HISTORIAL A GOOGLE SHEETS'}
          </button>

          <button
            type="button"
            onClick={handleDescargarTodoDeGoogleSheets}
            disabled={sincronizandoTodo}
            className="px-4 py-2.5 bg-[#0f1712] hover:bg-[#243d2c] text-white border border-[#243d2c] hover:border-[#3ddc84] text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <CloudDownload className="w-4 h-4 text-[#3ddc84]" />
            DESCARGAR DATOS DESDE SHEETS
          </button>
        </div>

        {/* Opción de auto-sincronización al conectar */}
        <div className="pt-2 border-t border-[#243d2c]/60 flex items-center gap-2.5">
          <input
            type="checkbox"
            id="autoSyncOnConnect"
            checked={autoSincronizarAlConectar}
            onChange={(e) => handleToggleAutoSync(e.target.checked)}
            className="w-4 h-4 rounded text-[#3ddc84] bg-[#0f1712] border-[#243d2c] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#3ddc84]"
          />
          <label htmlFor="autoSyncOnConnect" className="text-xs text-[#9aa89f] cursor-pointer select-none">
            Sincronizar automáticamente todos los datos al verificar una nueva URL de Google Apps Script.
          </label>
        </div>
      </div>

      {/* 2. Configuración de URL de Google Apps Script */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-[#3ddc84]" />
          <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
            Conexión con Google Sheets (Web App)
          </h2>
        </div>

        <p className="text-xs text-[#9aa89f] leading-relaxed">
          Ingresá la URL de implementación de tu Web App de Google Apps Script. Recordá que debe terminar en <code className="text-[#3ddc84]">/exec</code> y tener acceso configurado para <code className="text-[#3ddc84]">Cualquiera</code>.
        </p>

        <form onSubmit={handleGuardarUrl} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#9aa89f] uppercase mb-1">
              URL del Despliegue de Google Apps Script
            </label>
            <input
              type="url"
              value={urlAppScript}
              onChange={(e) => setUrlAppScript(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 bg-[#0f1712] border border-[#243d2c] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ddc84]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-[#0f1712] hover:bg-[#243d2c] text-white border border-[#243d2c] hover:border-[#3ddc84] text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Guardar URL
            </button>

            <button
              type="button"
              onClick={handleProbarPing}
              disabled={probando}
              className="px-4 py-2 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs rounded-xl shadow-md shadow-[#3ddc84]/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probando ? 'animate-spin' : ''}`} />
              {probando ? 'PROBANDO...' : 'PROBAR CONEXIÓN'}
            </button>

            {urlAppScript && (
              <button
                type="button"
                onClick={handleInitSheets}
                disabled={inicializando}
                className="px-4 py-2 bg-[#0f1712] hover:bg-[#243d2c] text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                {inicializando ? 'INICIALIZANDO...' : 'INICIALIZAR HOJAS'}
              </button>
            )}
          </div>
        </form>

        {resultadoPing && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              resultadoPing.ok
                ? 'bg-[#3ddc84]/15 border-[#3ddc84]/40 text-[#3ddc84]'
                : 'bg-[#e63946]/15 border-[#e63946]/40 text-[#e63946]'
            }`}>
              {resultadoPing.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="font-semibold">{resultadoPing.mensaje}</span>
            </div>

            {/* Sugerencia rápida si la URL termina en /dev */}
            {resultadoPing.diagnostic?.esDevUrl && resultadoPing.diagnostic.urlSugerida && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between gap-3">
                <span className="text-amber-200">
                  Detectamos que la URL termina en <code>/dev</code>.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (resultadoPing.diagnostic?.urlSugerida) {
                      setUrlAppScript(resultadoPing.diagnostic.urlSugerida);
                      StorageService.setAppsScriptUrl(resultadoPing.diagnostic.urlSugerida);
                      setResultadoPing(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#0f1712] font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Cambiar a /exec automáticamente
                </button>
              </div>
            )}

            {/* Panel de diagnóstico detallado cuando falla el ping */}
            {!resultadoPing.ok && (
              <div className="p-4 rounded-xl bg-[#0f1712] border border-[#e63946]/30 text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#243d2c]">
                  <span className="font-bold text-[#e63946] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Diagnóstico: ¿Por qué ocurre "Failed to fetch"?
                  </span>

                  {urlAppScript && (
                    <a
                      href={`${urlAppScript.trim()}${urlAppScript.includes('?') ? '&' : '?'}action=ping`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-[#182a1f] hover:bg-[#243d2c] text-white border border-[#243d2c] hover:border-[#3ddc84] rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>🔗</span> Abrir URL en nueva pestaña
                    </a>
                  )}
                </div>

                <p className="text-[#9aa89f] leading-relaxed text-[11px]">
                  El navegador muestra <em>"Failed to fetch"</em> debido a políticas de seguridad CORS cuando Google Apps Script bloquea o redirige la petición. Revisá estos puntos clave en tu script de Google:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#182a1f] border border-[#243d2c] space-y-1">
                    <span className="text-[#ffb703] font-bold text-[11px] block">
                      1. "Quién tiene acceso" = Cualquier usuario
                    </span>
                    <p className="text-[11px] text-[#9aa89f] leading-relaxed">
                      En Apps Script, andá a <strong>Implementar &gt; Administrar implementaciones &gt; Editar</strong> (icono lápiz). Verificá que <em>"Quién tiene acceso"</em> esté en <strong>"Cualquier usuario"</strong> (Anyone). Si dice "Solo yo", Google bloquea la conexión externa.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#182a1f] border border-[#243d2c] space-y-1">
                    <span className="text-[#ffb703] font-bold text-[11px] block">
                      2. La URL debe terminar en /exec
                    </span>
                    <p className="text-[11px] text-[#9aa89f] leading-relaxed">
                      La URL de prueba termina en <code>/dev</code> y no permite peticiones AJAX desde la web. Verificá que tu URL termine exactamente en <code>/exec</code>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#182a1f] border border-[#243d2c] space-y-1">
                    <span className="text-[#ffb703] font-bold text-[11px] block">
                      3. Crear "Nueva versión" al implementar
                    </span>
                    <p className="text-[11px] text-[#9aa89f] leading-relaxed">
                      Si pegaste o editaste el código en <code>Code.gs</code>, Apps Script no aplica los cambios hasta que hagas: <strong>Implementar &gt; Administrar implementaciones &gt; Editar &gt; Versión: "Nueva versión" &gt; Implementar</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#182a1f] border border-[#243d2c] space-y-1">
                    <span className="text-[#ffb703] font-bold text-[11px] block">
                      4. Cuenta Gmail personal vs Institucional
                    </span>
                    <p className="text-[11px] text-[#9aa89f] leading-relaxed">
                      Las cuentas corporativas o educativas de Google Workspace a menudo tienen bloqueada la opción de acceso anónimo externo. Si es tu caso, creá la planilla en una cuenta <code>@gmail.com</code> personal.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mensajeInit && (
          <div className="p-3 rounded-xl border border-blue-500/40 bg-blue-500/15 text-xs text-blue-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensajeInit}</span>
          </div>
        )}
      </div>

      {/* 2.1 Compartir con Amigos / Equipo & Contraseñas */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#3ddc84]" />
          <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
            Compartir con Amigos / Equipo & Contraseñas
          </h2>
        </div>

        <p className="text-xs text-[#9aa89f] leading-relaxed">
          ¿Querés que tus amigos, jugadores o el cuerpo técnico abran la app desde sus celulares o computadoras y vean exactamente los mismos datos de tu Google Sheets? Tenés dos formas muy fáciles de lograrlo:
        </p>

        {/* Opción A: Link compartible */}
        <div className="p-4 rounded-xl bg-[#0f1712] border border-[#243d2c] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#3ddc84] uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-4 h-4" />
              Opción A: Link de Invitación Directo (Conexión Automática)
            </span>
            {urlAppScript && (
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                Listo para enviar
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#9aa89f] leading-relaxed">
            Compartí este enlace por WhatsApp o mensaje. Cuando tu amigo lo abra en su celular, la aplicación <strong>vinculará automáticamente tu base de datos</strong> en su navegador sin que tenga que pegar ninguna URL rara:
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={getLinkCompartir()}
              className="flex-1 px-3 py-2 bg-[#182a1f] border border-[#243d2c] rounded-lg text-xs font-mono text-zinc-300 select-all outline-none"
            />
            <button
              type="button"
              onClick={handleCopiarLink}
              disabled={!urlAppScript}
              className="px-4 py-2 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {copiadoLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiadoLink ? '¡LINK COPIADO!' : 'COPIAR ENLACE'}
            </button>
          </div>
          {!urlAppScript && (
            <p className="text-[11px] text-amber-400">
              ⚠️ Primero ingresá y guardá tu URL de Google Apps Script arriba para generar el enlace con tu base de datos.
            </p>
          )}
        </div>

        {/* Opción B: Fijo en el código */}
        <div className="p-4 rounded-xl bg-[#0f1712] border border-[#243d2c] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#ffb703] uppercase tracking-wider flex items-center gap-1.5">
              <Link className="w-4 h-4" />
              Opción B: URL Fija en el Código (<code className="lowercase">src/config.ts</code>)
            </span>
          </div>

          <p className="text-[11px] text-[#9aa89f] leading-relaxed">
            Si querés que el link de GitHub Pages (el link limpio sin ningún parámetro) siempre apunte a tu Google Sheets para cualquier persona del mundo, podés pegar tu URL en el archivo <code className="text-[#3ddc84]">src/config.ts</code>:
          </p>

          <div className="relative">
            <pre className="p-3 bg-[#182a1f] border border-[#243d2c] rounded-lg text-[11px] font-mono text-[#3ddc84] overflow-x-auto">
              {`export const DEFAULT_APPS_SCRIPT_URL = '${urlAppScript ? urlAppScript.trim() : 'https://script.google.com/macros/s/.../exec'}';`}
            </pre>
            {urlAppScript && (
              <button
                type="button"
                onClick={handleCopiarSnippet}
                className="absolute top-2 right-2 px-2.5 py-1 bg-[#243d2c] hover:bg-[#3ddc84] text-white hover:text-[#0f1712] rounded text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiadoSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiadoSnippet ? 'Copiado' : 'Copiar línea'}
              </button>
            )}
          </div>
        </div>

        {/* Guía: Cómo cambiar las contraseñas */}
        <div className="p-4 rounded-xl bg-[#0f1712] border border-[#243d2c] space-y-3">
          <div className="flex items-center gap-1.5">
            <Key className="w-4 h-4 text-[#3ddc84]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              ¿Cómo poner tus propias contraseñas seguras?
            </span>
          </div>

          <p className="text-[11px] text-[#9aa89f] leading-relaxed">
            Tu archivo <code className="text-[#3ddc84]">Code.gs</code> en Google Apps Script valida las contraseñas en vivo contra las <strong>Propiedades de la secuencia de comandos (Script Properties)</strong> de tu proyecto de Google. Para cambiarlas por las contraseñas que vos elijas:
          </p>

          <ol className="list-decimal list-inside text-[11px] text-[#9aa89f] space-y-2 pl-1">
            <li>
              Abrí tu proyecto en <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-[#3ddc84] underline">Google Apps Script</a>.
            </li>
            <li>
              En el menú lateral izquierdo, hacé clic en el ícono del engranaje <strong>Configuración del proyecto (Project Settings)</strong>.
            </li>
            <li>
              Bajá hasta la sección <strong>"Propiedades de la secuencia de comandos"</strong> (Script Properties) y hacé clic en <strong>"Agregar propiedad"</strong>:
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div className="p-2 rounded bg-[#182a1f] border border-[#243d2c]">
                  <span className="text-[10px] font-mono text-[#3ddc84] font-bold block">PASSWORD_EDITOR</span>
                  <span className="text-[10px] text-zinc-400">Contraseña que usará el DT para crear partidos y cargar incidencias.</span>
                </div>
                <div className="p-2 rounded bg-[#182a1f] border border-[#243d2c]">
                  <span className="text-[10px] font-mono text-blue-400 font-bold block">PASSWORD_LECTOR</span>
                  <span className="text-[10px] text-zinc-400">Contraseña para tus amigos/hinchas para ver las estadísticas en vivo.</span>
                </div>
              </div>
            </li>
            <li>
              Hacé clic en <strong>Guardar propiedades</strong>. ¡Listo! A partir de ese momento la app validará exactamente esas contraseñas.
            </li>
          </ol>
        </div>
      </div>

      {/* 3. Cola de Sincronización Offline */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#ffb703]" />
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
              Cola de Sincronización Offline ({colaItems.length})
            </h2>
          </div>
          {colaItems.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleProcesarCola}
                disabled={sincronizando || !urlAppScript}
                className="px-3 py-1 bg-[#ffb703] hover:bg-[#e0a000] text-[#0f1712] font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${sincronizando ? 'animate-spin' : ''}`} />
                {sincronizando ? 'SINCRONIZANDO...' : 'ENVIAR COLA'}
              </button>
              <button
                onClick={handleLimpiarCola}
                className="px-3 py-1 bg-[#e63946]/20 hover:bg-[#e63946]/30 text-[#e63946] border border-[#e63946]/40 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              >
                VACIAR
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-[#9aa89f] leading-relaxed">
          Si registrás partidos o incidencias cuando estás en una cancha sin señal, las operaciones se encolan automáticamente aquí y se enviarán en cuanto vuelvas a tener conexión.
        </p>

        {colaItems.length === 0 ? (
          <div className="p-4 bg-[#0f1712] border border-[#243d2c] rounded-xl text-center text-xs text-[#9aa89f]">
            ✓ No hay operaciones pendientes en la cola. Todo está sincronizado localmente.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {colaItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-[#0f1712] border border-[#243d2c] rounded-lg text-xs flex items-center justify-between text-[#9aa89f]"
              >
                <div>
                  <span className="font-bold text-white uppercase mr-2">{item.accion}</span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                  Reintentos: {item.reintentos}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Copia de Seguridad Local (JSON) */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#3ddc84]" />
          <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
            Copia de Seguridad Local (JSON)
          </h2>
        </div>

        <p className="text-xs text-[#9aa89f] leading-relaxed">
          Descargá un archivo con todos los datos locales para guardarlo como respaldo en tu computadora o pasarlo a otro dispositivo.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleExportarBackup}
            className="px-4 py-2.5 bg-[#0f1712] hover:bg-[#243d2c] text-white border border-[#243d2c] hover:border-[#3ddc84] text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#3ddc84]" />
            DESCARGAR BACKUP (JSON)
          </button>

          <label className="px-4 py-2.5 bg-[#0f1712] hover:bg-[#243d2c] text-white border border-[#243d2c] hover:border-[#ffb703] text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-[#ffb703]" />
            RESTAURAR DESDE JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportarBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 5. Guía Rápida y Copiado del Código Code.gs */}
      <div className="bg-[#182a1f] border border-[#243d2c] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#3ddc84]" />
            <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
              Código de Google Apps Script (Code.gs)
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCopiarCodigo}
            className="px-3.5 py-1.5 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? '¡CÓDIGO COPIADO!' : 'COPIAR CÓDIGO ACTUALIZADO'}
          </button>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-xs text-[#9aa89f] leading-relaxed">
          <li>Creá una nueva planilla en blanco en Google Sheets llamada <strong>"Fútbol 11 - Los Halcones"</strong>.</li>
          <li>En el menú superior, andá a <strong>Extensiones ➔ Apps Script</strong>.</li>
          <li>Borrá el código existente y pegá el código copiado con el botón de arriba (o el archivo <code className="text-[#3ddc84]">apps-script/Code.gs</code>).</li>
          <li>Hacé clic en <strong>Implementar ➔ Nueva implementación</strong> (o <em>Administrar implementaciones &gt; Editar &gt; Nueva versión</em> si ya lo tenías).</li>
          <li>Elegí tipo <strong>Aplicación web</strong>, ejecutá como <em>"Yo"</em> y en "Quién tiene acceso" seleccioná <strong>"Cualquiera" (Anyone)</strong>.</li>
          <li>Copiá la URL resultante terminada en <code className="text-[#3ddc84]">/exec</code> y pegala en el campo de arriba. ¡Listo!</li>
        </ol>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setMostrarCodigo(!mostrarCodigo)}
            className="text-xs font-semibold text-[#3ddc84] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {mostrarCodigo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {mostrarCodigo ? 'Ocultar código de Code.gs' : 'Ver código fuente completo de Code.gs'}
          </button>

          {mostrarCodigo && (
            <div className="mt-3 relative">
              <pre className="p-4 bg-[#0a0f0c] border border-[#243d2c] rounded-xl text-[11px] font-mono text-zinc-300 max-h-96 overflow-y-auto select-all leading-relaxed">
                {APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
