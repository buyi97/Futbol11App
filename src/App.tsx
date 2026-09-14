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

  // Inicialización de datos
  const cargarDatosLocales = useCallback(() => {
    // Si no hay jugadores en localStorage, cargar datos de demostración
    let pLocal = StorageService.getPlantel();
    if (pLocal.length === 0) {
      StorageService.savePlantel(MOCK_PLANTEL);
      pLocal = MOCK_PLANTEL;
    }

    let partidosLocal = StorageService.getPartidos();
    if (partidosLocal.length === 0) {
      StorageService.savePartidos(MOCK_PARTIDOS);
      partidosLocal = MOCK_PARTIDOS;
    }

    let convocadosLocal = StorageService.getConvocados();
    if (convocadosLocal.length === 0) {
      StorageService.saveConvocados(MOCK_CONVOCADOS);
      convocadosLocal = MOCK_CONVOCADOS;
    }

    let incidenciasLocal = StorageService.getIncidencias();
    if (incidenciasLocal.length === 0) {
      StorageService.saveIncidencias(MOCK_INCIDENCIAS);
      incidenciasLocal = MOCK_INCIDENCIAS;
    }

    setPlantel(pLocal);
    setPartidos(partidosLocal);
    setConvocados(convocadosLocal);
    setRivales(StorageService.getRivales());
    setIncidencias(incidenciasLocal);
    setColaCount(StorageService.getColaSync().length);
    setHayPartidoEnVivo(StorageService.getPartidoEnVivo() !== null);
  }, []);

  useEffect(() => {
    cargarDatosLocales();

    // Si hay Google Apps Script configurado y conexión a internet,
    // sincronizar automáticamente los datos reales al iniciar la app
    if (navigator.onLine && StorageService.getAppsScriptUrl()) {
      ApiService.descargarTodoDeGoogleSheets()
        .then((res) => {
          if (res.ok) {
            cargarDatosLocales();
          }
        })
        .catch(() => {});
    }

    // Sincronización automática periódica en segundo plano cada 30 segundos
    const syncInterval = setInterval(() => {
      if (navigator.onLine && StorageService.getAppsScriptUrl()) {
        ApiService.procesarColaSync().then(() => {
          setColaCount(StorageService.getColaSync().length);
        });
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [cargarDatosLocales]);

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
    <div className="min-h-screen bg-[#0a100d] text-zinc-100 flex flex-col font-sans selection:bg-[#3ddc84] selection:text-[#0f1712]">
      
      {/* Barra de Navegación Principal */}
      <Navbar
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        rol={sesion.rol}
        onLogout={handleLogout}
        colaSyncCount={colaCount}
        hayPartidoEnVivo={hayPartidoEnVivo}
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
          />
        )}

        {/* VISTA 2: PLANTEL PERMANENTE */}
        {vistaActual === 'plantel' && (
          <PlantelView
            jugadores={plantel}
            onActualizarJugadores={cargarDatosLocales}
            rol={sesion.rol}
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
            onVolver={() => setVistaActual('historial')}
          />
        )}

        {/* VISTA 7: ESTADÍSTICAS ACUMULADAS */}
        {vistaActual === 'estadisticas' && (
          <EstadisticasView
            jugadores={plantel}
            partidos={partidos}
            convocados={convocados}
            incidencias={incidencias}
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
        <span>{StorageService.getNombreEquipo()} • Gestión de Partidos Fútbol 11 Amateur • Arquitectura Local-First & Google Sheets</span>
      </footer>

    </div>
  );
}
