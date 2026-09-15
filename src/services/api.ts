/**
 * @file api.ts
 * Wrapper para llamadas HTTPS a Google Apps Script Web App con reintentos y soporte offline.
 * Si no hay conexión o no hay URL configurada, opera con los datos locales (local-first).
 */

import { StorageService } from './storage';
import { Jugador, Partido, Convocado, RivalJugador, Incidencia, ItemColaSync, SesionAuth, RolUsuario, ClubConfig, AccionDeshacer } from '../types';

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  offline?: boolean;
}

export const ApiService = {
  /**
   * Ejecuta petición al Web App de Google Apps Script.
   */
  async request<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResponse<T>> {
    const url = StorageService.getAppsScriptUrl();
    const session = StorageService.getAuth();

    // Si no hay URL configurada, estamos en Modo Local / Demo
    if (!url) {
      return { ok: true, offline: true };
    }

    const bodyData = {
      action,
      rol: session?.rol || 'editor',
      token: session?.token,
      ...payload
    };

    try {
      // Usamos mode: 'cors' con Content-Type text/plain para evitar pre-flight OPTIONS de CORS en Apps Script
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(bodyData),
        redirect: 'follow'
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return json;
    } catch (err: any) {
      console.warn(`[ApiService] Error en acción ${action}:`, err.message);
      return { ok: false, error: err.message, offline: true };
    }
  },

  /**
   * Test de conectividad (ping) con diagnóstico detallado
   */
  async ping(targetUrl?: string): Promise<{
    ok: boolean;
    message: string;
    timestamp?: string;
    diagnostic?: {
      esDevUrl?: boolean;
      esSheetUrl?: boolean;
      esEditorUrl?: boolean;
      urlUsada?: string;
      urlSugerida?: string;
    };
  }> {
    let url = (targetUrl || StorageService.getAppsScriptUrl() || '').trim();
    if (!url) {
      return { ok: false, message: 'No hay URL configurada. Ingresá la URL de tu Web App de Google Apps Script.' };
    }

    // 1. Detectar si pegó la URL de la planilla de Google Sheets en lugar de la Web App
    if (url.includes('docs.google.com/spreadsheets')) {
      return {
        ok: false,
        message: 'Pegaste la URL de la planilla de Google Sheets en lugar de la Web App.',
        diagnostic: {
          esSheetUrl: true,
          urlUsada: url
        }
      };
    }

    // 2. Detectar si pegó el enlace del editor de código de Apps Script
    if (url.includes('script.google.com/home') || (url.includes('script.google.com') && url.includes('/edit'))) {
      return {
        ok: false,
        message: 'Pegaste el enlace del editor de código de Apps Script en lugar de la Web App desplegada.',
        diagnostic: {
          esEditorUrl: true,
          urlUsada: url
        }
      };
    }

    // 3. Detectar si termina en /dev (URL de prueba interna de Google que rechaza CORS anónimo)
    if (url.endsWith('/dev')) {
      const urlSugerida = url.slice(0, -4) + '/exec';
      return {
        ok: false,
        message: 'La URL termina en "/dev" (modo de prueba interno). Debe terminar en "/exec" para permitir la conexión desde la web.',
        diagnostic: {
          esDevUrl: true,
          urlUsada: url,
          urlSugerida
        }
      };
    }

    // Intentar primero con POST (Content-Type text/plain) que evita el pre-flight OPTIONS de CORS
    try {
      const resPost = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'ping' }),
        redirect: 'follow'
      });

      if (resPost.ok) {
        const json = await resPost.json();
        if (json.ok) {
          return {
            ok: true,
            message: 'Conexión exitosa con Google Apps Script y Google Sheets',
            timestamp: json.data?.timestamp
          };
        }
      }
    } catch {
      // Si falla POST, intentamos con GET
    }

    // Intentar con GET como fallback
    try {
      const getUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping`;
      const res = await fetch(getUrl, {
        method: 'GET',
        redirect: 'follow'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.ok) {
        return {
          ok: true,
          message: 'Conexión exitosa con Google Apps Script',
          timestamp: json.data?.timestamp
        };
      }
      return { ok: false, message: json.error || 'Error devuelto por la API' };
    } catch (err: any) {
      return {
        ok: false,
        message: 'No se pudo conectar: ' + err.message,
        diagnostic: {
          urlUsada: url
        }
      };
    }
  },

  /**
   * Alias de ping para pruebas de conexión
   */
  async testConexion(targetUrl?: string): Promise<{
    ok: boolean;
    message: string;
    timestamp?: string;
    diagnostic?: {
      esDevUrl?: boolean;
      esSheetUrl?: boolean;
      esEditorUrl?: boolean;
      urlUsada?: string;
      urlSugerida?: string;
    };
  }> {
    return ApiService.ping(targetUrl);
  },

  /**
   * Autenticación real contra Google Apps Script o fallback a modo demo
   */
  async login(password: string): Promise<{
    ok: boolean;
    session?: SesionAuth;
    error?: string;
    esModoDemo?: boolean;
  }> {
    const trimmedPass = password.trim();
    const url = StorageService.getAppsScriptUrl();

    // 1. Si NO hay URL de Apps Script configurada, estamos en Modo Demo Offline
    if (!url) {
      if (trimmedPass === 'dt1234' || trimmedPass.toLowerCase() === 'editor') {
        const sesion: SesionAuth = {
          rol: 'editor',
          nombreUsuario: 'Director Técnico (Demo)',
          token: 'demo-dt-' + Date.now(),
          expiraEn: Date.now() + 12 * 60 * 60 * 1000
        };
        StorageService.setAuth(sesion);
        return { ok: true, session: sesion, esModoDemo: true };
      } else if (trimmedPass === 'hincha11' || trimmedPass.toLowerCase() === 'lector') {
        const sesion: SesionAuth = {
          rol: 'lector',
          nombreUsuario: 'Aficionado / Lector (Demo)',
          token: 'demo-lector-' + Date.now(),
          expiraEn: Date.now() + 12 * 60 * 60 * 1000
        };
        StorageService.setAuth(sesion);
        return { ok: true, session: sesion, esModoDemo: true };
      }
      return {
        ok: false,
        error: 'Contraseña incorrecta para Modo Demo. Probá "dt1234" (Editor) o "hincha11" (Lector).'
      };
    }

    // 2. Hay URL configurada: verificar la contraseña en vivo con Google Apps Script
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'login',
          password: trimmedPass
        }),
        redirect: 'follow'
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.ok && json.data) {
        const rol: RolUsuario = json.data.rol === 'editor' ? 'editor' : 'lector';
        const sesion: SesionAuth = {
          rol,
          nombreUsuario: rol === 'editor' ? 'Director Técnico' : 'Aficionado / Lector',
          token: json.data.token || ('tok-' + Date.now()),
          expiraEn: json.data.expiraEn || (Date.now() + 12 * 60 * 60 * 1000)
        };
        StorageService.setAuth(sesion);
        return { ok: true, session: sesion, esModoDemo: false };
      } else {
        return {
          ok: false,
          error: json.error || 'Contraseña incorrecta según tu Google Apps Script.'
        };
      }
    } catch (err: any) {
      console.warn('[ApiService] Error al verificar login en Apps Script:', err.message);

      // Fallback si no hay internet o falla el script: permitir entrar si coincide con credenciales demo
      if (trimmedPass === 'dt1234' || trimmedPass.toLowerCase() === 'editor') {
        const sesion: SesionAuth = {
          rol: 'editor',
          nombreUsuario: 'Director Técnico (Offline)',
          token: 'offline-dt-' + Date.now(),
          expiraEn: Date.now() + 12 * 60 * 60 * 1000
        };
        StorageService.setAuth(sesion);
        return { ok: true, session: sesion, esModoDemo: true };
      } else if (trimmedPass === 'hincha11' || trimmedPass.toLowerCase() === 'lector') {
        const sesion: SesionAuth = {
          rol: 'lector',
          nombreUsuario: 'Aficionado (Offline)',
          token: 'offline-lector-' + Date.now(),
          expiraEn: Date.now() + 12 * 60 * 60 * 1000
        };
        StorageService.setAuth(sesion);
        return { ok: true, session: sesion, esModoDemo: true };
      }

      return {
        ok: false,
        error: 'No se pudo validar con tu Google Apps Script (' + err.message + '). Verificá la URL o tu conexión.'
      };
    }
  },

  /**
   * Intenta procesar las incidencias y cambios acumulados en la cola offline
   */
  async flushColaSync(): Promise<{ procesados: number; fallidos: number }> {
    const cola = StorageService.getColaSync();
    if (cola.length === 0) return { procesados: 0, fallidos: 0 };

    const url = StorageService.getAppsScriptUrl();
    if (!url || !navigator.onLine) {
      return { procesados: 0, fallidos: cola.length };
    }

    let procesados = 0;
    let fallidos = 0;
    const itemsPendientes: ItemColaSync[] = [];

    for (const item of cola) {
      try {
        const res = await ApiService.request(item.accion, item.payload);
        if (res.ok) {
          procesados++;
        } else {
          item.intentos += 1;
          if (item.intentos < 5) {
            itemsPendientes.push(item);
          }
          fallidos++;
        }
      } catch {
        item.intentos += 1;
        itemsPendientes.push(item);
        fallidos++;
      }
    }

    StorageService.actualizarColaSync(itemsPendientes);
    return { procesados, fallidos };
  },

  /**
   * Alias de flushColaSync
   */
  async procesarColaSync(): Promise<{ procesados: number; fallidos: number }> {
    return ApiService.flushColaSync();
  },

  /**
   * Inicializar hojas en Google Sheets automáticamente
   */
  async inicializarHojas(): Promise<ApiResponse<string>> {
    return ApiService.request<string>('inicializarHojas');
  },

  /**
   * Guardar o actualizar jugador en el backend con encolado offline
   */
  async guardarJugador(jugador: Jugador): Promise<ApiResponse<Jugador>> {
    StorageService.saveJugador(jugador);
    const res = await ApiService.request<Jugador>('guardarJugador', { jugador });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('guardarJugador', { jugador });
    }
    return { ok: true, data: jugador, offline: res.offline };
  },

  /**
   * Crear partido con sus convocados y rivales
   */
  async crearPartido(partido: Partido, convocados: Convocado[], rivales: RivalJugador[]): Promise<ApiResponse<{ id: string }>> {
    StorageService.savePartido(partido);
    
    // Guardar convocados en local
    const todosConv = StorageService.getConvocados().filter(c => c.partido_id !== partido.id);
    todosConv.push(...convocados);
    StorageService.saveConvocados(todosConv);

    // Guardar rivales en local
    const todosRiv = StorageService.getRivales().filter(r => r.partido_id !== partido.id);
    todosRiv.push(...rivales);
    StorageService.saveRivales(todosRiv);

    const res = await ApiService.request<{ id: string }>('crearPartido', { partido, convocados, rivales });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('crearPartido', { partido, convocados, rivales });
    }
    return { ok: true, data: { id: partido.id }, offline: res.offline };
  },

  /**
   * Guardar una incidencia con persistencia inmediata y encolado si no hay red
   */
  async guardarIncidencia(incidencia: Incidencia): Promise<ApiResponse<Incidencia>> {
    StorageService.addIncidencia(incidencia);
    const res = await ApiService.request<Incidencia>('guardarIncidencia', { incidencia });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('guardarIncidencia', { incidencia });
    }
    return { ok: true, data: incidencia, offline: res.offline };
  },

  /**
   * Eliminar una incidencia
   */
  async eliminarIncidencia(incidenciaId: string, partidoId: string): Promise<ApiResponse<string>> {
    StorageService.removeIncidencia(incidenciaId);
    const res = await ApiService.request<string>('eliminarIncidencia', { incidencia_id: incidenciaId, partido_id: partidoId });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('eliminarIncidencia', { incidencia_id: incidenciaId, partido_id: partidoId });
    }
    return { ok: true, data: 'Eliminada', offline: res.offline };
  },

  /**
   * Finalizar partido
   */
  async finalizarPartido(partidoId: string, agregado1T: number, agregado2T: number): Promise<ApiResponse<string>> {
    const partido = StorageService.getPartidoById(partidoId);
    if (partido) {
      // Recalcular el resultado final exacto desde las incidencias registradas
      const incs = StorageService.getIncidenciasByPartido(partidoId);
      let gPropio = 0;
      let gRival = 0;
      incs.forEach(inc => {
        if (inc.tipo === 'gol') {
          if (inc.equipo === 'propio') gPropio++;
          else gRival++;
        } else if (inc.tipo === 'autogol') {
          if (inc.equipo === 'propio') gRival++;
          else gPropio++;
        }
      });
      partido.resultado_propio = gPropio;
      partido.resultado_rival = gRival;
      partido.estado = 'finalizado';
      partido.agregado_1T = agregado1T;
      partido.agregado_2T = agregado2T;
      StorageService.savePartido(partido);
    }
    StorageService.clearPartidoEnVivo();

    const res = await ApiService.request<string>('finalizarPartido', {
      partido_id: partidoId,
      agregado_1T: agregado1T,
      agregado_2T: agregado2T
    });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('finalizarPartido', {
        partido_id: partidoId,
        agregado_1T: agregado1T,
        agregado_2T: agregado2T
      });
    }
    return { ok: true, data: 'Partido finalizado', offline: res.offline };
  },

  /**
   * Eliminar un partido tanto localmente como en el backend Google Sheets
   */
  async eliminarPartido(partidoId: string): Promise<ApiResponse<string>> {
    StorageService.eliminarPartido(partidoId);
    const res = await ApiService.request<string>('eliminarPartido', { partido_id: partidoId, id: partidoId });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('eliminarPartido', { partido_id: partidoId });
    }
    return { ok: true, data: 'Partido eliminado', offline: res.offline };
  },

  /**
   * Guardar la configuración del club (nombre, colores) en local y en Google Sheets
   */
  async guardarClubConfig(config: ClubConfig): Promise<ApiResponse<ClubConfig>> {
    StorageService.saveClubConfig(config);
    const res = await ApiService.request<ClubConfig>('guardarConfiguracion', { config, clubConfig: config });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('guardarConfiguracion', { config, clubConfig: config });
    }
    return { ok: true, data: config, offline: res.offline };
  },

  /**
   * Eliminar un torneo local y remotamente, eliminando en cascada todos sus partidos asociados
   */
  async eliminarTorneo(torneoId: string): Promise<ApiResponse<string>> {
    const torneo = StorageService.getTorneos().find(t => t.id === torneoId);
    const partidosDelTorneo = StorageService.getPartidos().filter(
      p => p.torneo_id === torneoId || (torneo && p.torneo_nombre === torneo.nombre)
    );

    // 1. Eliminar localmente en cascada con respaldo para Deshacer
    StorageService.eliminarTorneo(torneoId);

    // 2. Notificar la eliminación del torneo a Google Sheets
    const res = await ApiService.request<string>('eliminarTorneo', { torneo_id: torneoId, id: torneoId });
    if (!res.ok && res.offline) {
      StorageService.agregarAColaSync('eliminarTorneo', { torneo_id: torneoId });
    }

    // 3. Notificar la eliminación de cada partido de ese torneo
    for (const p of partidosDelTorneo) {
      const resP = await ApiService.request<string>('eliminarPartido', { partido_id: p.id, id: p.id }).catch(() => ({ ok: false, offline: true }));
      if (!resP.ok && resP.offline) {
        StorageService.agregarAColaSync('eliminarPartido', { partido_id: p.id });
      }
    }

    return { ok: true, data: 'Torneo y partidos eliminados', offline: res.offline };
  },

  /**
   * Restaurar acción de borrado en memoria (Undo de partido o torneo)
   */
  async restaurarAccionDeshacer(accion: AccionDeshacer): Promise<void> {
    // 1. Restaurar torneo si existe
    if (accion.datos.torneo) {
      const torneos = StorageService.getTorneos();
      if (!torneos.some(t => t.id === accion.datos.torneo!.id)) {
        torneos.push(accion.datos.torneo);
        StorageService.saveTorneos(torneos);
      }
    }

    // 2. Restaurar partidos
    const partidosActuales = StorageService.getPartidos();
    const nuevosPartidos = [...partidosActuales];
    for (const p of accion.datos.partidos) {
      if (!nuevosPartidos.some(x => x.id === p.id)) {
        nuevosPartidos.push(p);
      }
    }
    StorageService.savePartidos(nuevosPartidos);

    // 3. Restaurar convocados
    const convocadosActuales = StorageService.getConvocados();
    const nuevosConvocados = [...convocadosActuales];
    for (const c of accion.datos.convocados) {
      if (!nuevosConvocados.some(x => x.id === c.id)) {
        nuevosConvocados.push(c);
      }
    }
    StorageService.saveConvocados(nuevosConvocados);

    // 4. Restaurar rivales
    const rivalesActuales = StorageService.getRivales();
    const nuevosRivales = [...rivalesActuales];
    for (const r of accion.datos.rivales) {
      if (!nuevosRivales.some(x => x.id === r.id)) {
        nuevosRivales.push(r);
      }
    }
    StorageService.saveRivales(nuevosRivales);

    // 5. Restaurar incidencias
    const incidenciasActuales = StorageService.getIncidencias();
    const nuevasIncidencias = [...incidenciasActuales];
    for (const inc of accion.datos.incidencias) {
      if (!nuevasIncidencias.some(x => x.id === inc.id)) {
        nuevasIncidencias.push(inc);
      }
    }
    StorageService.saveIncidencias(nuevasIncidencias);

    // 6. Limpiar acciones de borrado de la cola de sync pendientes
    const idsPartidos = new Set(accion.datos.partidos.map(p => p.id));
    const cola = StorageService.getColaSync().filter(item => {
      if (item.accion === 'eliminarPartido' && item.payload?.partido_id && idsPartidos.has(item.payload.partido_id)) {
        return false;
      }
      if (item.accion === 'eliminarTorneo' && accion.datos.torneo && item.payload?.torneo_id === accion.datos.torneo.id) {
        return false;
      }
      return true;
    });
    StorageService.saveColaSync(cola);

    // 7. Limpiar memoria de deshacer
    StorageService.limpiarAccionDeshacer();

    // 8. Disparar eventos globales de actualización
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('futbol11-datos-actualizados'));
      window.dispatchEvent(new CustomEvent('futbol11-deshacer-actualizado'));
    }
  },

  /**
   * Sincroniza TODOS los datos vigentes en la aplicación hacia Google Sheets:
   * Plantel (jugadores), historial de partidos, convocados, rivales e incidencias.
   *
   * Utiliza primero la acción en bloque (sincronizarTodo) para máxima velocidad.
   * Si la versión de Apps Script desplegada es anterior y no soporta sincronizarTodo,
   * realiza automáticamente un fallback secuencial hoja por hoja.
   */
  async sincronizarTodoElHistorial(
    onProgreso?: (mensaje: string, porcentaje: number) => void
  ): Promise<{
    ok: boolean;
    message: string;
    detalles?: {
      jugadores: number;
      partidos: number;
      convocados: number;
      rivales: number;
      incidencias: number;
    };
    metodo?: 'bulk' | 'secuencial';
    error?: string;
  }> {
    const url = StorageService.getAppsScriptUrl();
    if (!url) {
      return {
        ok: false,
        message: 'No hay URL de Google Apps Script configurada.'
      };
    }

    const jugadores = StorageService.getPlantel();
    const partidos = StorageService.getPartidos();
    const convocados = StorageService.getConvocados();
    const rivales = StorageService.getRivales();
    const incidencias = StorageService.getIncidencias();
    const clubConfig = StorageService.getClubConfig();

    onProgreso?.('Preparando datos para sincronización...', 10);

    // 1. Intentar método en bloque ultra rápido (sincronizarTodo)
    try {
      onProgreso?.('Enviando paquete completo a Google Sheets...', 35);
      const resBulk = await ApiService.request('sincronizarTodo', {
        jugadores,
        partidos,
        convocados,
        rivales,
        incidencias,
        clubConfig,
        config: clubConfig
      });

      if (resBulk.ok && resBulk.data) {
        onProgreso?.('¡Sincronización completada exitosamente!', 100);
        return {
          ok: true,
          message: resBulk.data.mensaje || '¡Todos los datos fueron sincronizados en tu Google Spreadsheet!',
          detalles: {
            jugadores: resBulk.data.jugadores ?? jugadores.length,
            partidos: resBulk.data.partidos ?? partidos.length,
            convocados: resBulk.data.convocados ?? convocados.length,
            rivales: resBulk.data.rivales ?? rivales.length,
            incidencias: resBulk.data.incidencias ?? incidencias.length
          },
          metodo: 'bulk'
        };
      }

      // Si falló por error de permisos o red, pero no por acción no reconocida, registrarlo
      if (resBulk.error && !resBulk.error.includes('Acción no reconocida')) {
        return {
          ok: false,
          message: 'Error de Google Apps Script: ' + resBulk.error,
          error: resBulk.error
        };
      }
    } catch (e: any) {
      console.warn('[ApiService] Falló sincronizarTodo en bloque, intentando fallback secuencial:', e.message);
    }

    // 2. Fallback secuencial (compatibilidad con scripts antiguos)
    try {
      onProgreso?.('Inicializando estructura de hojas en Google Sheets...', 15);
      await ApiService.inicializarHojas();

      // Jugadores
      for (let i = 0; i < jugadores.length; i++) {
        const j = jugadores[i];
        const pct = 15 + Math.round(((i + 1) / Math.max(1, jugadores.length)) * 25);
        onProgreso?.(`Guardando jugador ${i + 1}/${jugadores.length}: ${j.nombre}...`, pct);
        await ApiService.request('guardarJugador', { jugador: j });
      }

      // Partidos con sus convocados y rivales
      for (let i = 0; i < partidos.length; i++) {
        const p = partidos[i];
        const partConv = convocados.filter(c => c.partido_id === p.id);
        const partRiv = rivales.filter(r => r.partido_id === p.id);
        const pct = 40 + Math.round(((i + 1) / Math.max(1, partidos.length)) * 30);
        onProgreso?.(`Guardando partido ${i + 1}/${partidos.length} (vs ${p.rival})...`, pct);
        await ApiService.request('crearPartido', { partido: p, convocados: partConv, rivales: partRiv });
      }

      // Incidencias
      for (let i = 0; i < incidencias.length; i++) {
        const inc = incidencias[i];
        const pct = 70 + Math.round(((i + 1) / Math.max(1, incidencias.length)) * 28);
        if (i % 3 === 0 || i === incidencias.length - 1) {
          onProgreso?.(`Guardando incidencia ${i + 1}/${incidencias.length}...`, pct);
        }
        await ApiService.request('guardarIncidencia', { incidencia: inc });
      }

      onProgreso?.('¡Sincronización completa finalizada!', 100);
      return {
        ok: true,
        message: '¡Historial y plantel sincronizados con éxito en Google Sheets!',
        detalles: {
          jugadores: jugadores.length,
          partidos: partidos.length,
          convocados: convocados.length,
          rivales: rivales.length,
          incidencias: incidencias.length
        },
        metodo: 'secuencial'
      };
    } catch (err: any) {
      return {
        ok: false,
        message: 'Error al sincronizar datos: ' + err.message,
        error: err.message
      };
    }
  },

  /**
   * Descarga todos los datos vigentes desde Google Sheets y los guarda localmente.
   * Cuenta con estrategia multi-fase y normalización completa:
   * 1. Intenta la acción rápida consolidada 'obtenerTodo'.
   * 2. Si el Apps Script desplegado es una versión anterior y no reconoce 'obtenerTodo'
   *    (ej: "Acción no reconocida: obtenerTodo"), ejecuta automáticamente la descarga
   *    mediante 'getPlantel', 'getHistorial' y 'getPartido', garantizando compatibilidad
   *    absoluta con cualquier versión de Apps Script en producción.
   */
  async descargarTodoDeGoogleSheets(
    onProgreso?: (mensaje: string, porcentaje: number) => void
  ): Promise<{
    ok: boolean;
    message: string;
    datos?: any;
  }> {
    const url = StorageService.getAppsScriptUrl();
    if (!url) {
      return {
        ok: false,
        message: 'No hay URL de Google Apps Script configurada.'
      };
    }

    onProgreso?.('Consultando datos en Google Sheets...', 15);

    // 1. Intentar endpoint consolidado 'obtenerTodo'
    try {
      const res = await ApiService.request('obtenerTodo');
      if (res.ok && res.data && (Array.isArray(res.data.plantel) || Array.isArray(res.data.partidos))) {
        onProgreso?.('Actualizando almacenamiento local...', 80);
        const data = res.data;

        if (Array.isArray(data.plantel) && data.plantel.length > 0) {
          const mapJ = new Map<string, any>();
          data.plantel.forEach((j: any) => {
            if (j && j.id && !mapJ.has(j.id)) mapJ.set(j.id, j);
          });
          const plantelNorm = Array.from(mapJ.values()).map(normalizarJugador);
          StorageService.savePlantel(plantelNorm);
        }
        if (Array.isArray(data.partidos)) {
          const mapP = new Map<string, any>();
          data.partidos.forEach((p: any) => {
            if (p && p.id && !mapP.has(p.id)) mapP.set(p.id, p);
          });
          const partidosNorm = Array.from(mapP.values()).map(normalizarPartido);
          StorageService.savePartidos(partidosNorm);

          // Restaurar torneos si vienen en los partidos
          restaurarTorneosDesdePartidos(partidosNorm);
        }
        if (Array.isArray(data.convocados)) {
          const mapC = new Map<string, any>();
          data.convocados.forEach((c: any) => {
            const key = c.id || `${c.partido_id}_${c.jugador_id}`;
            if (key && !mapC.has(key)) mapC.set(key, c);
          });
          StorageService.saveConvocados(Array.from(mapC.values()).map(normalizarConvocado));
        }
        if (Array.isArray(data.rivales)) {
          const mapR = new Map<string, any>();
          data.rivales.forEach((r: any) => {
            const key = r.id || `${r.partido_id}_${r.numero}`;
            if (key && !mapR.has(key)) mapR.set(key, r);
          });
          StorageService.saveRivales(Array.from(mapR.values()).map(normalizarRival));
        }
        if (Array.isArray(data.incidencias)) {
          const mapI = new Map<string, any>();
          data.incidencias.forEach((i: any) => {
            if (i && i.id && !mapI.has(i.id)) mapI.set(i.id, i);
          });
          StorageService.saveIncidencias(Array.from(mapI.values()).map(normalizarIncidencia));
        }
        if (data.configuracion && typeof data.configuracion === 'object' && data.configuracion.nombre) {
          StorageService.saveClubConfig({
            nombre: data.configuracion.nombre,
            colorPropio: data.configuracion.colorPropio || '#3ddc84',
            colorRival: data.configuracion.colorRival || '#e63946'
          });
        }

        try {
          localStorage.setItem('futbol11_datos_inicializados_v1', 'true');
        } catch {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('futbol11-datos-actualizados'));
        }

        onProgreso?.('¡Datos descargados con éxito!', 100);
        return {
          ok: true,
          message: 'Datos descargados y sincronizados en tu dispositivo.',
          datos: data
        };
      }
    } catch (err) {
      console.warn('[ApiService] Error al intentar obtenerTodo, ejecutando fallback:', err);
    }

    // 2. Fallback inteligente y resiliente: getPlantel + getHistorial + getPartido
    try {
      onProgreso?.('Descargando plantel de jugadores...', 30);
      const resPlantel = await ApiService.request('getPlantel');
      const jugadoresRaw: any[] = (resPlantel.ok && Array.isArray(resPlantel.data)) ? resPlantel.data : [];

      onProgreso?.('Descargando historial de partidos...', 50);
      const resHistorial = await ApiService.request('getHistorial');
      const partidosRaw: any[] = (resHistorial.ok && Array.isArray(resHistorial.data)) ? resHistorial.data : [];

      // Deduplicar partidos por ID antes de consultar sus detalles
      const mapPartidosRaw = new Map<string, any>();
      partidosRaw.forEach(p => {
        if (p && p.id && !mapPartidosRaw.has(String(p.id))) {
          mapPartidosRaw.set(String(p.id), p);
        }
      });
      const partidosUnicos = Array.from(mapPartidosRaw.values());

      const convocadosAcum: any[] = [];
      const rivalesAcum: any[] = [];
      const incidenciasAcum: any[] = [];

      if (partidosUnicos.length > 0) {
        onProgreso?.(`Descargando incidencias de ${partidosUnicos.length} partidos...`, 70);
        // Consultar los partidos en paralelo para velocidad
        const detallesPartidos = await Promise.all(
          partidosUnicos.map(p => ApiService.request<any>('getPartido', { partido_id: p.id }).catch(() => ({ ok: false, data: null })))
        );

        detallesPartidos.forEach((dpRes: any) => {
          if (dpRes && dpRes.ok && dpRes.data) {
            if (Array.isArray(dpRes.data.convocados)) {
              convocadosAcum.push(...dpRes.data.convocados);
            }
            if (Array.isArray(dpRes.data.rivales)) {
              rivalesAcum.push(...dpRes.data.rivales);
            }
            if (Array.isArray(dpRes.data.incidencias)) {
              incidenciasAcum.push(...dpRes.data.incidencias);
            }
          }
        });
      }

      // Deduplicar jugadores, partidos, convocados, rivales e incidencias
      const mapJ = new Map<string, any>();
      jugadoresRaw.forEach(j => {
        if (j && j.id && !mapJ.has(String(j.id))) mapJ.set(String(j.id), j);
      });
      const plantelNormalizado = Array.from(mapJ.values()).map(normalizarJugador);

      const partidosNormalizados = partidosUnicos.map(normalizarPartido);

      const mapC = new Map<string, any>();
      convocadosAcum.forEach(c => {
        const key = c.id || `${c.partido_id}_${c.jugador_id}`;
        if (key && !mapC.has(key)) mapC.set(key, c);
      });
      const convocadosNormalizados = Array.from(mapC.values()).map(normalizarConvocado);

      const mapR = new Map<string, any>();
      rivalesAcum.forEach(r => {
        const key = r.id || `${r.partido_id}_${r.numero}`;
        if (key && !mapR.has(key)) mapR.set(key, r);
      });
      const rivalesNormalizados = Array.from(mapR.values()).map(normalizarRival);

      const mapI = new Map<string, any>();
      incidenciasAcum.forEach(i => {
        if (i && i.id && !mapI.has(String(i.id))) mapI.set(String(i.id), i);
      });
      const incidenciasNormalizadas = Array.from(mapI.values()).map(normalizarIncidencia);

      onProgreso?.('Guardando datos descargados localmente...', 90);
      if (plantelNormalizado.length > 0) {
        StorageService.savePlantel(plantelNormalizado);
      }
      StorageService.savePartidos(partidosNormalizados);
      StorageService.saveConvocados(convocadosNormalizados);
      StorageService.saveRivales(rivalesNormalizados);
      StorageService.saveIncidencias(incidenciasNormalizadas);

      // Restaurar torneos
      restaurarTorneosDesdePartidos(partidosNormalizados);

      try {
        localStorage.setItem('futbol11_datos_inicializados_v1', 'true');
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('futbol11-datos-actualizados'));
      }

      onProgreso?.('¡Datos descargados con éxito!', 100);
      return {
        ok: true,
        message: `¡Sincronización exitosa! Se descargaron ${plantelNormalizado.length} jugadores, ${partidosNormalizados.length} partidos y ${incidenciasNormalizadas.length} incidencias.`,
        datos: {
          plantel: plantelNormalizado,
          partidos: partidosNormalizados,
          convocados: convocadosNormalizados,
          rivales: rivalesNormalizados,
          incidencias: incidenciasNormalizadas
        }
      };
    } catch (fallbackErr: any) {
      console.error('[ApiService] Error en descarga fallback de Sheets:', fallbackErr);
      return {
        ok: false,
        message: 'Error al descargar datos desde Google Sheets: ' + (fallbackErr.message || String(fallbackErr))
      };
    }
  }

};

// Helpers de normalización
function normalizarJugador(j: any): Jugador {
  return {
    id: String(j.id || ''),
    nombre: String(j.nombre || ''),
    numero: Number(j.numero) || 0,
    posicion: (j.posicion as any) || 'Mediocampista',
    activo: j.activo === true || j.activo === 'TRUE' || j.activo === 'true' || j.activo === 1,
    fecha_alta: j.fecha_alta ? String(j.fecha_alta).split('T')[0] : new Date().toISOString().split('T')[0]
  };
}

function normalizarPartido(p: any): Partido {
  return {
    id: String(p.id || ''),
    fecha: p.fecha ? String(p.fecha).split('T')[0] : '',
    rival: String(p.rival || 'Rival'),
    modo_rival: p.modo_rival === 'numero' ? 'numero' : 'nombre_numero',
    cancha: String(p.cancha || ''),
    condicion: p.condicion === 'visitante' ? 'visitante' : 'local',
    resultado_propio: Number(p.resultado_propio) || 0,
    resultado_rival: Number(p.resultado_rival) || 0,
    agregado_1T: Number(p.agregado_1T) || 0,
    agregado_2T: Number(p.agregado_2T) || 0,
    duracion_tiempo_min: Number(p.duracion_tiempo_min) || 40,
    estado: (p.estado as any) || 'finalizado',
    creado_por: String(p.creado_por || 'Director Técnico'),
    etiqueta: p.etiqueta ? String(p.etiqueta) : undefined,
    torneo_id: p.torneo_id ? String(p.torneo_id) : undefined,
    torneo_nombre: p.torneo_nombre ? String(p.torneo_nombre) : undefined
  };
}

function normalizarConvocado(c: any): Convocado {
  return {
    id: String(c.id || ''),
    partido_id: String(c.partido_id || ''),
    jugador_id: String(c.jugador_id || ''),
    titular: c.titular === true || c.titular === 'TRUE' || c.titular === 'true' || c.titular === 1,
    posicion_x: c.posicion_x !== undefined ? Number(c.posicion_x) : undefined,
    posicion_y: c.posicion_y !== undefined ? Number(c.posicion_y) : undefined,
    posicion_tactica: c.posicion_tactica ? String(c.posicion_tactica) : undefined,
    numero: c.numero !== undefined ? Number(c.numero) : undefined,
    posicion: c.posicion ? String(c.posicion) : undefined
  };
}

function normalizarRival(r: any): RivalJugador {
  return {
    id: String(r.id || ''),
    partido_id: String(r.partido_id || ''),
    numero: Number(r.numero) || 0,
    nombre: r.nombre ? String(r.nombre) : undefined
  };
}

function normalizarIncidencia(i: any): Incidencia {
  return {
    id: String(i.id || ''),
    partido_id: String(i.partido_id || ''),
    tipo: i.tipo as any,
    minuto: Number(i.minuto) || 0,
    segundo: Number(i.segundo) || 0,
    tiempo: Number(i.tiempo) === 2 ? 2 : 1,
    equipo: i.equipo === 'rival' ? 'rival' : 'propio',
    jugador_id: i.jugador_id ? String(i.jugador_id) : undefined,
    jugador_id_secundario: (i.jugador_id_secundario || i.jugador_secundario_id) ? String(i.jugador_id_secundario || i.jugador_secundario_id) : undefined,
    detalle: i.detalle ? String(i.detalle) : undefined
  };
}

function restaurarTorneosDesdePartidos(partidos: Partido[]) {
  try {
    const torneosExistentes = StorageService.getTorneos();
    let modificados = false;
    partidos.forEach(p => {
      if (p.torneo_id && !torneosExistentes.some(t => t.id === p.torneo_id)) {
        const nombreLower = (p.torneo_nombre || '').toLowerCase();
        let tipoTorneo: any = 'Apertura';
        if (nombreLower.includes('clausura')) tipoTorneo = 'Clausura';
        else if (nombreLower.includes('copa')) tipoTorneo = 'Copa';
        else if (nombreLower.includes('amistoso')) tipoTorneo = 'Amistoso';
        else if (nombreLower.includes('anual')) tipoTorneo = 'Anual';

        torneosExistentes.push({
          id: p.torneo_id,
          nombre: p.torneo_nombre || p.torneo_id,
          tipo: tipoTorneo,
          anio: p.fecha ? (Number(p.fecha.substring(0, 4)) || 2026) : 2026,
          estado: 'activo'
        });
        modificados = true;
      }
    });
    if (modificados) {
      StorageService.saveTorneos(torneosExistentes);
    }
  } catch {}
}
