/**
 * @file storage.ts
 * Gestor de persistencia Local-First utilizando localStorage.
 * Permite que la aplicación funcione 100% desconectada de la red,
 * manteniendo el borrador del partido en vivo, la cola de sincronización hacia Google Sheets,
 * y los datos cacheados del plantel e historial.
 */

import {
  Jugador,
  Partido,
  Convocado,
  RivalJugador,
  Incidencia,
  SesionAuth,
  ItemColaSync,
  ClubConfig,
  Torneo,
  TipoTorneo
} from '../types';
import {
  JUGADORES_INICIALES,
  PARTIDOS_INICIALES,
  CONVOCADOS_INICIALES,
  RIVALES_INICIALES,
  INCIDENCIAS_INICIALES
} from '../data/mockData';
import { DEFAULT_APPS_SCRIPT_URL } from '../config';

const KEYS = {
  AUTH: 'futbol11_auth_session',
  APPS_SCRIPT_URL: 'futbol11_apps_script_url',
  JUGADORES: 'futbol11_plantel',
  PARTIDOS: 'futbol11_partidos',
  CONVOCADOS: 'futbol11_convocados',
  RIVALES: 'futbol11_rivales',
  INCIDENCIAS: 'futbol11_incidencias',
  PARTIDO_EN_VIVO: 'futbol11_partido_en_vivo_draft',
  COLA_SYNC: 'futbol11_cola_sync',
  CONFIG: 'futbol11_config',
  CLUB_CONFIG: 'futbol11_club_config',
  TORNEOS: 'futbol11_torneos'
};

export const DEFAULT_CLUB_CONFIG: ClubConfig = {
  nombre: 'Los Halcones FC',
  colorPropio: '#3ddc84', // Verde tradicional
  colorRival: '#e63946',  // Rojo rival clásico
  subtitulo: 'Fútbol 11 Amateur'
};

export const DEFAULT_TORNEOS: Torneo[] = [
  {
    id: 'torneo-apertura-2026',
    nombre: 'Torneo Apertura 2026',
    tipo: 'Apertura',
    anio: 2026,
    estado: 'activo',
    fechaInicio: '2026-03-01',
    descripcion: 'Torneo oficial del primer semestre'
  },
  {
    id: 'torneo-clausura-2025',
    nombre: 'Torneo Clausura 2025',
    tipo: 'Clausura',
    anio: 2025,
    estado: 'cerrado',
    fechaInicio: '2025-08-01',
    fechaCierre: '2025-12-15',
    descripcion: 'Torneo anterior (Finalizado)'
  }
];

export interface PartidoEnVivoDraft {
  partido: Partido;
  convocados: Convocado[];
  rivales: RivalJugador[];
  incidencias: Incidencia[];
  timer: {
    tiempo: 1 | 2;
    segundosTotales: number; // segundos acumulados en el tiempo actual
    corriendo: boolean;
    ultimoTimestamp: number;
    agregado1T: number;
    agregado2T: number;
    medioTiempoAlcanzado: boolean;
  };
}

export const StorageService = {
  // --- Autenticación ---
  getAuth(): SesionAuth | null {
    try {
      const data = localStorage.getItem(KEYS.AUTH);
      if (!data) return null;
      const session: SesionAuth = JSON.parse(data);
      if (session.expiraEn && Date.now() > session.expiraEn) {
        localStorage.removeItem(KEYS.AUTH);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  setAuth(session: SesionAuth): void {
    localStorage.setItem(KEYS.AUTH, JSON.stringify(session));
  },

  clearAuth(): void {
    localStorage.removeItem(KEYS.AUTH);
  },

  // --- Apps Script URL ---
  getAppsScriptUrl(): string {
    // 1. Si viene como parámetro en la URL (?script=... o ?apps_script=...), guardarlo automáticamente
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const scriptParam = params.get('script') || params.get('apps_script');
        if (scriptParam && scriptParam.trim().startsWith('http')) {
          const trimmed = scriptParam.trim();
          localStorage.setItem(KEYS.APPS_SCRIPT_URL, trimmed);
          // Limpiar el parámetro de la barra de direcciones para estética y seguridad
          params.delete('script');
          params.delete('apps_script');
          const newSearch = params.toString();
          const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          return trimmed;
        }
      } catch {
        // Ignorar si el entorno no tiene window
      }
    }

    // 2. URL guardada en localStorage del dispositivo
    const local = localStorage.getItem(KEYS.APPS_SCRIPT_URL);
    if (local && local.trim() !== '') {
      return local.trim();
    }

    // 3. Variable de entorno VITE_APPS_SCRIPT_URL
    const envUrl = ((import.meta as any).env?.VITE_APPS_SCRIPT_URL as string) || '';
    if (envUrl && envUrl.trim() !== '') {
      return envUrl.trim();
    }

    // 4. URL predeterminada fijada en src/config.ts
    const defUrl = (DEFAULT_APPS_SCRIPT_URL as string) || '';
    if (defUrl && defUrl.trim() !== '') {
      return defUrl.trim();
    }

    return '';
  },

  setAppsScriptUrl(url: string): void {
    localStorage.setItem(KEYS.APPS_SCRIPT_URL, url.trim());
  },

  getDefaultAppsScriptUrl(): string {
    return ((DEFAULT_APPS_SCRIPT_URL as string) || '').trim();
  },

  isModoDemo(): boolean {
    return !StorageService.getAppsScriptUrl();
  },

  // --- Inicialización y carga de datos ---
  initDefaultDataIfEmpty(): void {
    if (!localStorage.getItem(KEYS.JUGADORES)) {
      localStorage.setItem(KEYS.JUGADORES, JSON.stringify(JUGADORES_INICIALES));
    }
    if (!localStorage.getItem(KEYS.PARTIDOS)) {
      localStorage.setItem(KEYS.PARTIDOS, JSON.stringify(PARTIDOS_INICIALES));
    }
    if (!localStorage.getItem(KEYS.CONVOCADOS)) {
      localStorage.setItem(KEYS.CONVOCADOS, JSON.stringify(CONVOCADOS_INICIALES));
    }
    if (!localStorage.getItem(KEYS.RIVALES)) {
      localStorage.setItem(KEYS.RIVALES, JSON.stringify(RIVALES_INICIALES));
    }
    if (!localStorage.getItem(KEYS.INCIDENCIAS)) {
      localStorage.setItem(KEYS.INCIDENCIAS, JSON.stringify(INCIDENCIAS_INICIALES));
    }
    if (!localStorage.getItem(KEYS.CLUB_CONFIG)) {
      localStorage.setItem(KEYS.CLUB_CONFIG, JSON.stringify(DEFAULT_CLUB_CONFIG));
    }
    if (!localStorage.getItem(KEYS.TORNEOS)) {
      localStorage.setItem(KEYS.TORNEOS, JSON.stringify(DEFAULT_TORNEOS));
    }
  },

  resetToDefaultData(): void {
    localStorage.setItem(KEYS.JUGADORES, JSON.stringify(JUGADORES_INICIALES));
    localStorage.setItem(KEYS.PARTIDOS, JSON.stringify(PARTIDOS_INICIALES));
    localStorage.setItem(KEYS.CONVOCADOS, JSON.stringify(CONVOCADOS_INICIALES));
    localStorage.setItem(KEYS.RIVALES, JSON.stringify(RIVALES_INICIALES));
    localStorage.setItem(KEYS.INCIDENCIAS, JSON.stringify(INCIDENCIAS_INICIALES));
    localStorage.setItem(KEYS.CLUB_CONFIG, JSON.stringify(DEFAULT_CLUB_CONFIG));
    localStorage.setItem(KEYS.TORNEOS, JSON.stringify(DEFAULT_TORNEOS));
    localStorage.removeItem(KEYS.PARTIDO_EN_VIVO);
    localStorage.setItem(KEYS.COLA_SYNC, JSON.stringify([]));
  },

  // --- Plantel ---
  getJugadores(): Jugador[] {
    try {
      const data = localStorage.getItem(KEYS.JUGADORES);
      return data ? JSON.parse(data) : JUGADORES_INICIALES;
    } catch {
      return JUGADORES_INICIALES;
    }
  },

  getPlantel(): Jugador[] {
    return this.getJugadores();
  },

  saveJugadores(jugadores: Jugador[]): void {
    localStorage.setItem(KEYS.JUGADORES, JSON.stringify(jugadores));
  },

  savePlantel(plantel: Jugador[]): void {
    this.saveJugadores(plantel);
  },

  saveJugador(jugador: Jugador): Jugador {
    const list = this.getJugadores();
    const index = list.findIndex(j => j.id === jugador.id);
    if (index >= 0) {
      list[index] = jugador;
    } else {
      list.push(jugador);
    }
    this.saveJugadores(list);
    return jugador;
  },

  // --- Partidos ---
  getPartidos(): Partido[] {
    try {
      const data = localStorage.getItem(KEYS.PARTIDOS);
      return data ? JSON.parse(data) : PARTIDOS_INICIALES;
    } catch {
      return PARTIDOS_INICIALES;
    }
  },

  getPartidoById(id: string): Partido | undefined {
    return this.getPartidos().find(p => p.id === id);
  },

  savePartidos(partidos: Partido[]): void {
    localStorage.setItem(KEYS.PARTIDOS, JSON.stringify(partidos));
  },

  savePartido(partido: Partido): void {
    const list = this.getPartidos();
    const index = list.findIndex(p => p.id === partido.id);
    if (index >= 0) {
      list[index] = partido;
    } else {
      list.unshift(partido);
    }
    this.savePartidos(list);
  },

  eliminarPartido(id: string): void {
    const list = this.getPartidos().filter(p => p.id !== id);
    this.savePartidos(list);

    // Eliminar convocados del partido
    const convocados = this.getConvocados().filter(c => c.partido_id !== id);
    this.saveConvocados(convocados);

    // Eliminar rivales del partido
    const rivales = this.getRivales().filter(r => r.partido_id !== id);
    this.saveRivales(rivales);

    // Eliminar incidencias del partido
    const incidencias = this.getIncidencias().filter(i => i.partido_id !== id);
    this.saveIncidencias(incidencias);

    // Si coincide con partido en vivo
    const vivo = this.getPartidoEnVivo();
    if (vivo && vivo.partido.id === id) {
      this.clearPartidoEnVivo();
    }
  },

  // --- Convocados ---
  getConvocados(): Convocado[] {
    try {
      const data = localStorage.getItem(KEYS.CONVOCADOS);
      return data ? JSON.parse(data) : CONVOCADOS_INICIALES;
    } catch {
      return CONVOCADOS_INICIALES;
    }
  },

  getConvocadosByPartido(partidoId: string): Convocado[] {
    return this.getConvocados().filter(c => c.partido_id === partidoId);
  },

  saveConvocados(convocados: Convocado[]): void {
    localStorage.setItem(KEYS.CONVOCADOS, JSON.stringify(convocados));
  },

  // --- Rivales ---
  getRivales(): RivalJugador[] {
    try {
      const data = localStorage.getItem(KEYS.RIVALES);
      return data ? JSON.parse(data) : RIVALES_INICIALES;
    } catch {
      return RIVALES_INICIALES;
    }
  },

  getRivalesByPartido(partidoId: string): RivalJugador[] {
    return this.getRivales().filter(r => r.partido_id === partidoId);
  },

  saveRivales(rivales: RivalJugador[]): void {
    localStorage.setItem(KEYS.RIVALES, JSON.stringify(rivales));
  },

  // --- Incidencias ---
  getIncidencias(): Incidencia[] {
    try {
      const data = localStorage.getItem(KEYS.INCIDENCIAS);
      return data ? JSON.parse(data) : INCIDENCIAS_INICIALES;
    } catch {
      return INCIDENCIAS_INICIALES;
    }
  },

  getIncidenciasByPartido(partidoId: string): Incidencia[] {
    return this.getIncidencias().filter(i => i.partido_id === partidoId);
  },

  saveIncidencias(incidencias: Incidencia[]): void {
    localStorage.setItem(KEYS.INCIDENCIAS, JSON.stringify(incidencias));
  },

  addIncidencia(inc: Incidencia): void {
    const list = this.getIncidencias();
    list.push(inc);
    this.saveIncidencias(list);
  },

  removeIncidencia(id: string): void {
    const list = this.getIncidencias().filter(i => i.id !== id);
    this.saveIncidencias(list);
  },

  // --- Partido en Vivo (Borrador Activo) ---
  getPartidoEnVivo(): PartidoEnVivoDraft | null {
    try {
      const data = localStorage.getItem(KEYS.PARTIDO_EN_VIVO);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  savePartidoEnVivo(draft: PartidoEnVivoDraft): void {
    localStorage.setItem(KEYS.PARTIDO_EN_VIVO, JSON.stringify(draft));
  },

  clearPartidoEnVivo(): void {
    localStorage.removeItem(KEYS.PARTIDO_EN_VIVO);
  },

  // --- Cola de Sincronización Offline ---
  getColaSync(): ItemColaSync[] {
    try {
      const data = localStorage.getItem(KEYS.COLA_SYNC);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  agregarAColaSync(accion: ItemColaSync['accion'], payload: any): void {
    const cola = this.getColaSync();
    cola.push({
      id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      accion,
      payload,
      timestamp: Date.now(),
      intentos: 0
    });
    localStorage.setItem(KEYS.COLA_SYNC, JSON.stringify(cola));
  },

  removerDeColaSync(id: string): void {
    const cola = this.getColaSync().filter(item => item.id !== id);
    localStorage.setItem(KEYS.COLA_SYNC, JSON.stringify(cola));
  },

  actualizarColaSync(cola: ItemColaSync[]): void {
    localStorage.setItem(KEYS.COLA_SYNC, JSON.stringify(cola));
  },

  limpiarColaSync(): void {
    localStorage.setItem(KEYS.COLA_SYNC, JSON.stringify([]));
  },

  // --- Identidad del Club y Colores ---
  getClubConfig(): ClubConfig {
    try {
      const data = localStorage.getItem(KEYS.CLUB_CONFIG);
      if (!data) return DEFAULT_CLUB_CONFIG;
      const parsed = JSON.parse(data);
      return {
        nombre: parsed.nombre || DEFAULT_CLUB_CONFIG.nombre,
        colorPropio: parsed.colorPropio || DEFAULT_CLUB_CONFIG.colorPropio,
        colorRival: parsed.colorRival || DEFAULT_CLUB_CONFIG.colorRival,
        subtitulo: parsed.subtitulo || DEFAULT_CLUB_CONFIG.subtitulo
      };
    } catch {
      return DEFAULT_CLUB_CONFIG;
    }
  },

  saveClubConfig(config: Partial<ClubConfig>): ClubConfig {
    const actual = this.getClubConfig();
    const updated: ClubConfig = {
      ...actual,
      ...config
    };
    localStorage.setItem(KEYS.CLUB_CONFIG, JSON.stringify(updated));
    return updated;
  },

  getNombreEquipo(): string {
    return this.getClubConfig().nombre || 'Los Halcones FC';
  },

  getColorPropio(): string {
    return this.getClubConfig().colorPropio || '#3ddc84';
  },

  getColorRival(): string {
    return this.getClubConfig().colorRival || '#e63946';
  },

  getColores(): { propio: string; rival: string } {
    const conf = this.getClubConfig();
    return {
      propio: conf.colorPropio || '#3ddc84',
      rival: conf.colorRival || '#e63946'
    };
  },

  // --- Gestión de Torneos y Temporadas ---
  getTorneos(): Torneo[] {
    try {
      const data = localStorage.getItem(KEYS.TORNEOS);
      if (data === null) return DEFAULT_TORNEOS;
      const parsed: Torneo[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : DEFAULT_TORNEOS;
    } catch {
      return DEFAULT_TORNEOS;
    }
  },

  saveTorneos(torneos: Torneo[]): void {
    localStorage.setItem(KEYS.TORNEOS, JSON.stringify(torneos));
  },

  getTorneoActivo(): Torneo | null {
    const torneos = this.getTorneos();
    return torneos.find(t => t.estado === 'activo') || null;
  },

  iniciarTorneo(
    tipo: TipoTorneo,
    anio: number,
    nombrePersonalizado?: string,
    descripcion?: string,
    marcarComoActivo: boolean = true
  ): Torneo {
    const torneos = this.getTorneos();
    const nombre = nombrePersonalizado?.trim() || `Torneo ${tipo} ${anio}`;
    const id = 'torneo-' + tipo.toLowerCase() + '-' + anio + '-' + Date.now().toString(36).slice(-4);

    // Si se marca como activo, los demás torneos activos se pueden cerrar o mantener según se elija
    const list = marcarComoActivo 
      ? torneos.map(t => (t.estado === 'activo' ? { ...t, estado: 'cerrado' as const } : t))
      : [...torneos];

    const nuevoTorneo: Torneo = {
      id,
      nombre,
      tipo,
      anio,
      estado: marcarComoActivo ? 'activo' : 'cerrado',
      fechaInicio: new Date().toISOString().split('T')[0],
      descripcion: descripcion?.trim() || undefined
    };

    list.unshift(nuevoTorneo);
    this.saveTorneos(list);
    return nuevoTorneo;
  },

  cerrarTorneo(id: string): void {
    const list = this.getTorneos().map(t => {
      if (t.id === id) {
        return {
          ...t,
          estado: 'cerrado' as const,
          fechaCierre: new Date().toISOString().split('T')[0]
        };
      }
      return t;
    });
    this.saveTorneos(list);
  },

  reabrirTorneo(id: string): void {
    // Al reabrir, cerramos los otros para que solo haya uno activo
    const list = this.getTorneos().map(t => {
      if (t.id === id) {
        return {
          ...t,
          estado: 'activo' as const,
          fechaCierre: undefined
        };
      }
      return {
        ...t,
        estado: 'cerrado' as const
      };
    });
    this.saveTorneos(list);
  },

  eliminarTorneo(id: string): void {
    const list = this.getTorneos().filter(t => t.id !== id);
    this.saveTorneos(list);
  }
};
