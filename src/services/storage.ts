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
  ItemColaSync
} from '../types';
import {
  JUGADORES_INICIALES,
  PARTIDOS_INICIALES,
  CONVOCADOS_INICIALES,
  RIVALES_INICIALES,
  INCIDENCIAS_INICIALES
} from '../data/mockData';

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
  CONFIG: 'futbol11_config'
};

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
    return localStorage.getItem(KEYS.APPS_SCRIPT_URL) || '';
  },

  setAppsScriptUrl(url: string): void {
    localStorage.setItem(KEYS.APPS_SCRIPT_URL, url.trim());
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
  },

  resetToDefaultData(): void {
    localStorage.setItem(KEYS.JUGADORES, JSON.stringify(JUGADORES_INICIALES));
    localStorage.setItem(KEYS.PARTIDOS, JSON.stringify(PARTIDOS_INICIALES));
    localStorage.setItem(KEYS.CONVOCADOS, JSON.stringify(CONVOCADOS_INICIALES));
    localStorage.setItem(KEYS.RIVALES, JSON.stringify(RIVALES_INICIALES));
    localStorage.setItem(KEYS.INCIDENCIAS, JSON.stringify(INCIDENCIAS_INICIALES));
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
  }
};
