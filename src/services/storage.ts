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
  TipoTorneo,
  AccionDeshacer
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
  TORNEOS: 'futbol11_torneos',
  SEEDED: 'futbol11_datos_inicializados_v1',
  MEMORIA_DESHACER: 'futbol11_memoria_deshacer'
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
      if (!data) return JUGADORES_INICIALES;
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const map = new Map<string, Jugador>();
        parsed.forEach((j: any) => {
          if (j && j.id && !map.has(j.id)) {
            map.set(j.id, j);
          }
        });
        return Array.from(map.values());
      }
      return JUGADORES_INICIALES;
    } catch {
      return JUGADORES_INICIALES;
    }
  },

  getPlantel(): Jugador[] {
    return this.getJugadores();
  },

  saveJugadores(jugadores: Jugador[]): void {
    const map = new Map<string, Jugador>();
    jugadores.forEach(j => {
      if (j && j.id) {
        map.set(j.id, j);
      }
    });
    localStorage.setItem(KEYS.JUGADORES, JSON.stringify(Array.from(map.values())));
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
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const map = new Map<string, Partido>();
          parsed.forEach((p: any) => {
            if (p && p.id && typeof p.id === 'string' && !map.has(p.id)) {
              map.set(p.id, p);
            }
          });
          return Array.from(map.values());
        }
        return [];
      }
      // Solo inicializar con datos de prueba si nunca se ha inicializado la base local
      const seeded = localStorage.getItem(KEYS.SEEDED);
      if (!seeded) {
        localStorage.setItem(KEYS.SEEDED, 'true');
        this.savePartidos(PARTIDOS_INICIALES);
        return PARTIDOS_INICIALES;
      }
      return [];
    } catch {
      return [];
    }
  },

  getPartidoById(id: string): Partido | undefined {
    return this.getPartidos().find(p => p.id === id);
  },

  savePartidos(partidos: Partido[]): void {
    const map = new Map<string, Partido>();
    partidos.forEach(p => {
      if (p && p.id && typeof p.id === 'string') {
        map.set(p.id, p);
      }
    });
    const unicos = Array.from(map.values());
    localStorage.setItem(KEYS.PARTIDOS, JSON.stringify(unicos));
    localStorage.setItem(KEYS.SEEDED, 'true');
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

  eliminarPartido(id: string, guardarParaDeshacer: boolean = true): void {
    const partido = this.getPartidos().find(p => p.id === id);
    if (guardarParaDeshacer && partido) {
      const convs = this.getConvocados().filter(c => c.partido_id === id);
      const rivs = this.getRivales().filter(r => r.partido_id === id);
      const incs = this.getIncidencias().filter(i => i.partido_id === id);
      this.guardarAccionDeshacer({
        id: 'deshacer-' + Date.now(),
        tipo: 'partido',
        titulo: `Partido vs ${partido.rival}`,
        descripcion: `Marcador ${partido.resultado_propio} - ${partido.resultado_rival} (${partido.fecha})`,
        timestamp: Date.now(),
        datos: {
          partidos: [partido],
          convocados: convs,
          rivales: rivs,
          incidencias: incs
        }
      });
    }

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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('futbol11-datos-actualizados'));
    }
  },

  // --- Convocados ---
  getConvocados(): Convocado[] {
    try {
      const data = localStorage.getItem(KEYS.CONVOCADOS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const map = new Map<string, Convocado>();
          parsed.forEach((c: any) => {
            const key = c.id || `${c.partido_id}_${c.jugador_id}`;
            if (key && !map.has(key)) {
              map.set(key, c);
            }
          });
          return Array.from(map.values());
        }
        return [];
      }
      return CONVOCADOS_INICIALES;
    } catch {
      return CONVOCADOS_INICIALES;
    }
  },

  getConvocadosByPartido(partidoId: string): Convocado[] {
    return this.getConvocados().filter(c => c.partido_id === partidoId);
  },

  saveConvocados(convocados: Convocado[]): void {
    const map = new Map<string, Convocado>();
    convocados.forEach(c => {
      const key = c.id || `${c.partido_id}_${c.jugador_id}`;
      if (key) {
        map.set(key, c);
      }
    });
    localStorage.setItem(KEYS.CONVOCADOS, JSON.stringify(Array.from(map.values())));
  },

  // --- Rivales ---
  getRivales(): RivalJugador[] {
    try {
      const data = localStorage.getItem(KEYS.RIVALES);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const map = new Map<string, RivalJugador>();
          parsed.forEach((r: any) => {
            const key = r.id || `${r.partido_id}_${r.numero}`;
            if (key && !map.has(key)) {
              map.set(key, r);
            }
          });
          return Array.from(map.values());
        }
        return [];
      }
      return RIVALES_INICIALES;
    } catch {
      return RIVALES_INICIALES;
    }
  },

  getRivalesByPartido(partidoId: string): RivalJugador[] {
    return this.getRivales().filter(r => r.partido_id === partidoId);
  },

  saveRivales(rivales: RivalJugador[]): void {
    const map = new Map<string, RivalJugador>();
    rivales.forEach(r => {
      const key = r.id || `${r.partido_id}_${r.numero}`;
      if (key) {
        map.set(key, r);
      }
    });
    localStorage.setItem(KEYS.RIVALES, JSON.stringify(Array.from(map.values())));
  },

  // --- Incidencias ---
  getIncidencias(): Incidencia[] {
    try {
      const data = localStorage.getItem(KEYS.INCIDENCIAS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const map = new Map<string, Incidencia>();
          parsed.forEach((i: any) => {
            if (i && i.id && !map.has(i.id)) {
              map.set(i.id, i);
            }
          });
          return Array.from(map.values());
        }
        return [];
      }
      return INCIDENCIAS_INICIALES;
    } catch {
      return INCIDENCIAS_INICIALES;
    }
  },

  getIncidenciasByPartido(partidoId: string): Incidencia[] {
    return this.getIncidencias().filter(i => i.partido_id === partidoId);
  },

  saveIncidencias(incidencias: Incidencia[]): void {
    const map = new Map<string, Incidencia>();
    incidencias.forEach(i => {
      if (i && i.id) {
        map.set(i.id, i);
      }
    });
    localStorage.setItem(KEYS.INCIDENCIAS, JSON.stringify(Array.from(map.values())));
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

  saveColaSync(cola: ItemColaSync[]): void {
    this.actualizarColaSync(cola);
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
        subtitulo: parsed.subtitulo || DEFAULT_CLUB_CONFIG.subtitulo,
        formacionPredeterminada: parsed.formacionPredeterminada || '4-3-3',
        titularesPredeterminados: Array.isArray(parsed.titularesPredeterminados) ? parsed.titularesPredeterminados : [],
        slotsPredeterminados: Array.isArray(parsed.slotsPredeterminados) ? parsed.slotsPredeterminados : undefined
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('club-config-changed', { detail: updated }));
    }
    return updated;
  },

  getFormacionPredeterminada(): string {
    return this.getClubConfig().formacionPredeterminada || '4-3-3';
  },

  saveFormacionPredeterminada(formacion: string): void {
    this.saveClubConfig({ formacionPredeterminada: formacion });
  },

  getTitularesPredeterminados(): string[] {
    return this.getClubConfig().titularesPredeterminados || [];
  },

  saveTitularesPredeterminados(ids: string[]): void {
    this.saveClubConfig({ titularesPredeterminados: ids });
  },

  getSlotsPredeterminados(): (string | null)[] | undefined {
    return this.getClubConfig().slotsPredeterminados;
  },

  saveSlotsPredeterminados(slots: (string | null)[]): void {
    this.saveClubConfig({ slotsPredeterminados: slots });
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
      if (Array.isArray(parsed)) {
        const map = new Map<string, Torneo>();
        parsed.forEach(t => {
          if (t && t.id && !map.has(t.id)) {
            map.set(t.id, t);
          }
        });
        return Array.from(map.values());
      }
      return DEFAULT_TORNEOS;
    } catch {
      return DEFAULT_TORNEOS;
    }
  },

  saveTorneos(torneos: Torneo[]): void {
    const map = new Map<string, Torneo>();
    torneos.forEach(t => {
      if (t && t.id) {
        map.set(t.id, t);
      }
    });
    localStorage.setItem(KEYS.TORNEOS, JSON.stringify(Array.from(map.values())));
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

  eliminarTorneo(id: string, guardarParaDeshacer: boolean = true): void {
    const torneo = this.getTorneos().find(t => t.id === id);
    const todosPartidos = this.getPartidos();
    const partidosDelTorneo = todosPartidos.filter(p => p.torneo_id === id || (torneo && p.torneo_nombre === torneo.nombre));
    const idsPartidos = new Set(partidosDelTorneo.map(p => p.id));

    const convs = this.getConvocados().filter(c => idsPartidos.has(c.partido_id));
    const rivs = this.getRivales().filter(r => idsPartidos.has(r.partido_id));
    const incs = this.getIncidencias().filter(i => idsPartidos.has(i.partido_id));

    if (guardarParaDeshacer && torneo) {
      this.guardarAccionDeshacer({
        id: 'deshacer-' + Date.now(),
        tipo: 'torneo',
        titulo: `Torneo ${torneo.nombre}`,
        descripcion: `Eliminado con ${partidosDelTorneo.length} partidos asociados`,
        timestamp: Date.now(),
        datos: {
          torneo,
          partidos: partidosDelTorneo,
          convocados: convs,
          rivales: rivs,
          incidencias: incs
        }
      });
    }

    // Eliminar el torneo
    const listaTorneos = this.getTorneos().filter(t => t.id !== id);
    this.saveTorneos(listaTorneos);

    // Eliminar en cascada todos los partidos de ese torneo
    const partidosRestantes = todosPartidos.filter(p => !idsPartidos.has(p.id));
    this.savePartidos(partidosRestantes);

    const convocadosRestantes = this.getConvocados().filter(c => !idsPartidos.has(c.partido_id));
    this.saveConvocados(convocadosRestantes);

    const rivalesRestantes = this.getRivales().filter(r => !idsPartidos.has(r.partido_id));
    this.saveRivales(rivalesRestantes);

    const incidenciasRestantes = this.getIncidencias().filter(i => !idsPartidos.has(i.partido_id));
    this.saveIncidencias(incidenciasRestantes);

    const vivo = this.getPartidoEnVivo();
    if (vivo && idsPartidos.has(vivo.partido.id)) {
      this.clearPartidoEnVivo();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('futbol11-datos-actualizados'));
    }
  },

  // --- Memoria para Deshacer (Undo múltiple) ---
  getAccionesDeshacer(): AccionDeshacer[] {
    try {
      const data = localStorage.getItem(KEYS.MEMORIA_DESHACER);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
      return [];
    } catch {
      return [];
    }
  },

  getAccionDeshacer(): AccionDeshacer | null {
    const list = this.getAccionesDeshacer();
    return list.length > 0 ? list[0] : null;
  },

  guardarAccionDeshacer(accion: AccionDeshacer): void {
    try {
      const actuales = this.getAccionesDeshacer().filter(a => a.id !== accion.id);
      actuales.unshift(accion); // Más reciente primero
      localStorage.setItem(KEYS.MEMORIA_DESHACER, JSON.stringify(actuales));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('futbol11-deshacer-actualizado'));
      }
    } catch (e) {
      console.error('Error guardando acción para deshacer:', e);
    }
  },

  eliminarAccionDeshacer(id: string): void {
    try {
      const restantes = this.getAccionesDeshacer().filter(a => a.id !== id);
      localStorage.setItem(KEYS.MEMORIA_DESHACER, JSON.stringify(restantes));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('futbol11-deshacer-actualizado'));
      }
    } catch (e) {
      console.error('Error eliminando acción para deshacer:', e);
    }
  },

  limpiarAccionDeshacer(): void {
    localStorage.removeItem(KEYS.MEMORIA_DESHACER);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('futbol11-deshacer-actualizado'));
    }
  }
};
