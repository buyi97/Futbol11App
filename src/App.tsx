/**
 * @file App.tsx
 * Componente principal de la aplicación Gestión de Partidos — Fútbol 11 Amateur.
 * Controla la autenticación, vistas, estado local-first y sincronización.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, VistaActual } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { PlantelView } from './components/PlantelView';
import { NuevoPartidoView } from './components/NuevoPartidoView';
import { PartidoVivoView } from './components/PartidoVivoView';
import { HistorialView } from './components/HistorialView';
import { PartidoDetalleView } from './components/PartidoDetalleView';
import { EstadisticasView } from './components/EstadisticasView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { FloatingUndoNotification } from './components/FloatingUndoNotification';

import { StorageService } from './services/storage';
import { ApiService } from './services/api';
import { Partido, Jugador, Convocado, RivalJugador, Incidencia, SesionAuth } from './types';
import { MOCK_PLANTEL, MOCK_PARTIDOS, MOCK_CONVOCADOS, MOCK_INCIDENCIAS } from './data/mockData';

export default function App() {
  // Autenticación
  const [sesion, setSesion] = useState<SesionAuth | null>(() => StorageService.getAuth());
  
  // Navegación
  const [vistaActual, setVistaActual] = useState<VistaActual>('inicio');
  const [partidoSeleccionadoId, setPartidoSeleccionadoId] = useState<string | null>(null);

  // Datos globales
  const [plantel, setPlantel] = useState<Jugador[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [convocados, setConvocados] = useState<Convocado[]>([]);
  const [rivales, setRivales] = useState<RivalJugador[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  // Estado de sincronización
  const [colaCount, setColaCount] = useState<number>(0);
  const [hayPartidoEnVivo, setHayPartidoEnVivo] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [syncToastType, setSyncToastType] = useState<'success' | 'info' | 'error'>('info');
  const [nombreEquipo, setNombreEquipo] = useState<string>(() => StorageService.getNombreEquipo());
  const [colorPropio, setColorPropio] = useState<string>(() => StorageService.getColorPropio());

  // Inicialización de datos
  const cargarDatosLocales = useCallback(() => {
    // Si no hay jugadores en localStorage y no se ha inicializado, cargar datos iniciales
    let pLocal = StorageService.getPlantel() || [];
    if (pLocal.length === 0 && !localStorage.getItem('futbol11_datos_inicializados_v1')) {
      StorageService.savePlantel(MOCK_PLANTEL);
      pLocal = MOCK_PLANTEL;
    }

    const partidosLocal = StorageService.getPartidos() || [];
    const mapP = new Map<string, Partido>();
    partidosLocal.forEach(p => {
      if (p && p.id && !mapP.has(p.id)) mapP.set(p.id, p);
    });
    const partidosUnicos = Array.from(mapP.values());

    const convocadosLocal = StorageService.getConvocados() || [];
    const rivalesLocal = StorageService.getRivales() || [];
    const incidenciasLocal = StorageService.getIncidencias() || [];

    setPlantel(pLocal || []);
    setPartidos(partidosUnicos);
    setConvocados(convocadosLocal);
    setRivales(rivalesLocal);
    setIncidencias(incidenciasLocal);
    setColaCount(StorageService.getColaSync()?.length || 0);
    setHayPartidoEnVivo(StorageService.getPartidoEnVivo() !== null);
    setNombreEquipo(StorageService.getNombreEquipo());
    setColorPropio(StorageService.getColorPropio());
  }, []);

  useEffect(() => {
    const handleClubConfigChange = () => {
      setNombreEquipo(StorageService.getNombreEquipo());
      setColorPropio(StorageService.getColorPropio());
    };
    window.addEventListener('club-config-changed', handleClubConfigChange);
    return () => window.removeEventListener('club-config-changed', handleClubConfigChange);
  }, []);

  useEffect(() => {
    const handleDatosActualizados = () => {
      cargarDatosLocales();
    };
    window.addEventListener('futbol11-datos-actualizados', handleDatosActualizados);
    return () => window.removeEventListener('futbol11-datos-actualizados', handleDatosActualizados);
  }, [cargarDatosLocales]);

  // Si se borra un partido que estaba abierto en vista detalle, volver al historial
  useEffect(() => {
    if (partidoSeleccionadoId && !partidos.some(p => p.id === partidoSeleccionadoId)) {
      setPartidoSeleccionadoId(null);
      if (vistaActual === 'partido-detalle') {
        setVistaActual('historial');
      }
    }
  }, [partidos, partidoSeleccionadoId, vistaActual]);

  // Si el usuario es LECTOR, no permitir acceso a configuración y redirigir al inicio
  useEffect(() => {
    if (sesion && sesion.rol === 'lector' && vistaActual === 'configuracion') {
      setVistaActual('inicio');
    }
  }, [sesion, vistaActual]);

  // Sincronización explícita o automática desde Google Sheets
  const sincronizarDesdeSheets = useCallback(async (silencioso = false) => {
    if (!navigator.onLine) {
      if (!silencioso) {
        setSyncToastMessage('Sin conexión a internet');
        setSyncToastType('error');
        setTimeout(() => setSyncToastMessage(null), 3500);
      }
      return;
    }
    const url = StorageService.getAppsScriptUrl();
    if (!url) return;

    setIsSyncingSheets(true);
    if (!silencioso) {
      setSyncToastMessage('Sincronizando con Google Sheets...');
      setSyncToastType('info');
    }

    try {
      const res = await ApiService.descargarTodoDeGoogleSheets((msg) => {
        if (!silencioso) setSyncToastMessage(msg);
      });
      if (res.ok) {
        cargarDatosLocales();
        setSyncToastMessage('¡Sincronizado con Google Sheets!');
        setSyncToastType('success');
        setTimeout(() => setSyncToastMessage(null), 3000);
      } else {
        if (!silencioso) {
          setSyncToastMessage(res.message || 'No se pudo sincronizar');
          setSyncToastType('error');
          setTimeout(() => setSyncToastMessage(null), 4000);
        }
      }
    } catch (err: any) {
      if (!silencioso) {
        setSyncToastMessage('Error al sincronizar con Sheets: ' + (err.message || String(err)));
        setSyncToastType('error');
        setTimeout(() => setSyncToastMessage(null), 4000);
      }
    } finally {
      setIsSyncingSheets(false);
    }
  }, [cargarDatosLocales]);

  useEffect(() => {
    cargarDatosLocales();

    // Sincronizar automáticamente DESDE Google Sheets al ingresar cualquier LECTOR o EDITOR
    if (navigator.onLine && StorageService.getAppsScriptUrl()) {
      sincronizarDesdeSheets(true);
    }

    // Sincronización periódica en segundo plano cada 30 segundos
    const syncInterval = setInterval(() => {
      if (navigator.onLine && StorageService.getAppsScriptUrl()) {
        ApiService.procesarColaSync().then(() => {
          setColaCount(StorageService.getColaSync().length);
        });
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [cargarDatosLocales, sincronizarDesdeSheets]);

  // Manejo de Logout
  const handleLogout = () => {
    StorageService.clearAuth();
    setSesion(null);
  };

  // Si no está autenticado, mostrar pantalla de login
  if (!sesion) {
    return (
      <LoginView 
        onLoginExitoso={(s) => {
          setSesion(s);
          cargarDatosLocales();
          // Sincronización inmediata al entrar al sistema
          sincronizarDesdeSheets(false);
        }} 
      />
    );
  }

  // Manejo de Selección de Partido para ver detalle
  const handleSeleccionarPartido = (id: string) => {
    setPartidoSeleccionadoId(id);
    setVistaActual('partido-detalle');
  };

  // Partido seleccionado objeto
  const partidoSeleccionado = partidos.find(p => p.id === partidoSeleccionadoId);
  const convocadosDelPartido = convocados.filter(c => c.partido_id === partidoSeleccionadoId);
  const rivalesDelPartido = rivales.filter(r => r.partido_id === partidoSeleccionadoId);
  const incidenciasDelPartido = incidencias.filter(i => i.partido_id === partidoSeleccionadoId);

  return (
    <div className="min-h-screen bg-[#0a100d] text-zinc-100 flex flex-col font-sans selection:bg-[#3ddc84] selection:text-[#0f1712] relative">
      
      {/* Toast Notificación de Sincronización con Google Sheets */}
      {syncToastMessage && (
        <div 
          className="fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border text-xs font-semibold animate-in slide-in-from-top-3 duration-300"
          style={{
            backgroundColor: syncToastType === 'success' ? '#182a1f' : syncToastType === 'error' ? '#2d1418' : '#14221c',
            borderColor: syncToastType === 'success' ? '#3ddc84' : syncToastType === 'error' ? '#e63946' : '#2bb46a',
            color: syncToastType === 'success' ? '#3ddc84' : syncToastType === 'error' ? '#ff6b6b' : '#a7f3d0'
          }}
        >
          {isSyncingSheets ? (
            <span className="inline-block animate-spin">⭮</span>
          ) : syncToastType === 'success' ? (
            <span>✓</span>
          ) : syncToastType === 'error' ? (
            <span>⚠</span>
          ) : (
            <span>ℹ</span>
          )}
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Barra de Navegación Principal */}
      <Navbar
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        rol={sesion.rol}
        onLogout={handleLogout}
        colaSyncCount={colaCount}
        hayPartidoEnVivo={hayPartidoEnVivo}
        nombreEquipo={nombreEquipo}
        colorPropio={colorPropio}
        isOnline={navigator.onLine}
        isSyncing={isSyncingSheets}
        isSyncingSheets={isSyncingSheets}
        onSincronizarAhora={() => {
          ApiService.procesarColaSync().then(() => {
            setColaCount(StorageService.getColaSync().length);
          });
          sincronizarDesdeSheets(false);
        }}
        onSincronizarDesdeSheets={() => sincronizarDesdeSheets(false)}
      />

      {/* Contenido Dinámico de las Vistas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 py-3 sm:px-6 sm:py-6 lg:p-8">
        
        {/* VISTA 1: DASHBOARD / INICIO */}
        {vistaActual === 'inicio' && (
          <DashboardView
            setVistaActual={setVistaActual}
            rol={sesion.rol}
            partidos={partidos}
            jugadores={plantel}
            incidencias={incidencias}
            onSeleccionarPartido={handleSeleccionarPartido}
            nombreEquipo={nombreEquipo}
            colorPropio={colorPropio}
          />
        )}

        {/* VISTA 2: PLANTEL PERMANENTE */}
        {vistaActual === 'plantel' && (
          <PlantelView
            jugadores={plantel}
            onActualizarJugadores={cargarDatosLocales}
            rol={sesion.rol}
            nombreEquipo={nombreEquipo}
            colorPropio={colorPropio}
          />
        )}

        {/* VISTA 3: NUEVO PARTIDO */}
        {vistaActual === 'nuevo-partido' && (
          <NuevoPartidoView
            jugadores={plantel}
            onIniciarPartido={() => {
              cargarDatosLocales();
              setVistaActual('partido-vivo');
            }}
            onCancelar={() => setVistaActual('inicio')}
          />
        )}

        {/* VISTA 4: PARTIDO EN VIVO (CRONÓMETRO + INCIDENCIAS) */}
        {vistaActual === 'partido-vivo' && (
          <PartidoVivoView
            jugadores={plantel}
            onPartidoFinalizado={(partidoId) => {
              cargarDatosLocales();
              handleSeleccionarPartido(partidoId);
            }}
            onVolver={() => setVistaActual('inicio')}
            nombreEquipo={nombreEquipo}
            colorPropio={colorPropio}
          />
        )}

        {/* VISTA 5: HISTORIAL DE PARTIDOS */}
        {vistaActual === 'historial' && (
          <HistorialView
            partidos={partidos}
            plantel={plantel}
            rol={sesion.rol}
            onSeleccionarPartido={handleSeleccionarPartido}
            onIrAPartidoVivo={() => setVistaActual('partido-vivo')}
            onPartidoCreado={(id) => {
              cargarDatosLocales();
              handleSeleccionarPartido(id);
            }}
            hayPartidoEnVivo={hayPartidoEnVivo}
            nombreEquipo={nombreEquipo}
            colorPropio={colorPropio}
          />
        )}

        {/* VISTA 6: DETALLE / PLANILLA DE UN PARTIDO */}
        {vistaActual === 'partido-detalle' && partidoSeleccionado && (
          <PartidoDetalleView
            partido={partidoSeleccionado}
            convocados={convocadosDelPartido}
            rivales={rivalesDelPartido}
            incidencias={incidenciasDelPartido}
            jugadores={plantel}
            rol={sesion.rol}
            onActualizarPartido={cargarDatosLocales}
            onEliminarPartido={() => {
              cargarDatosLocales();
              setPartidoSeleccionadoId(null);
              setVistaActual('historial');
            }}
            onVolver={() => setVistaActual('historial')}
            nombreEquipo={StorageService.getNombreEquipo()}
            colorPropio={StorageService.getColorPropio()}
          />
        )}

        {/* VISTA 7: ESTADÍSTICAS ACUMULADAS */}
        {vistaActual === 'estadisticas' && (
          <EstadisticasView
            jugadores={plantel}
            partidos={partidos}
            convocados={convocados}
            incidencias={incidencias}
            nombreEquipo={nombreEquipo}
            colorPropio={colorPropio}
          />
        )}

        {/* VISTA 8: CONFIGURACIÓN & GOOGLE SHEETS */}
        {vistaActual === 'configuracion' && (
          <ConfiguracionView
            rol={sesion.rol}
            onDatosActualizados={cargarDatosLocales}
          />
        )}

      </main>

      {/* Footer minimalista */}
      <footer className="border-t border-[#243d2c]/60 py-4 px-6 text-center text-xs text-zinc-500">
        <span>{nombreEquipo} • Gestión de Partidos Fútbol 11 Amateur • Arquitectura Local-First & Google Sheets</span>
      </footer>

      {/* Botón flotante para Deshacer acciones de borrado en memoria */}
      <FloatingUndoNotification onRestaurado={cargarDatosLocales} />

    </div>
  );
}
