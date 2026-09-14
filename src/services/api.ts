/**
 * @file api.ts
 * Wrapper para llamadas HTTPS a Google Apps Script Web App con reintentos y soporte offline.
 * Si no hay conexión o no hay URL configurada, opera con los datos locales (local-first).
 */

import { StorageService } from './storage';
import { Jugador, Partido, Convocado, RivalJugador, Incidencia, ItemColaSync } from '../types';

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

    onProgreso?.('Preparando datos para sincronización...', 10);

    // 1. Intentar método en bloque ultra rápido (sincronizarTodo)
    try {
      onProgreso?.('Enviando paquete completo a Google Sheets...', 35);
      const resBulk = await ApiService.request('sincronizarTodo', {
        jugadores,
        partidos,
        convocados,
        rivales,
        incidencias
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
   */
  async descargarTodoDeGoogleSheets(
    onProgreso?: (mensaje: string, porcentaje: number) => void
  ): Promise<{
    ok: boolean;
    message: string;
    datos?: any;
  }> {
    onProgreso?.('Consultando datos en Google Sheets...', 30);
    const res = await ApiService.request('obtenerTodo');
    if (res.ok && res.data) {
      onProgreso?.('Actualizando almacenamiento local...', 75);
      const data = res.data;
      if (Array.isArray(data.plantel) && data.plantel.length > 0) {
        StorageService.savePlantel(data.plantel);
      }
      if (Array.isArray(data.partidos) && data.partidos.length > 0) {
        StorageService.savePartidos(data.partidos);
      }
      if (Array.isArray(data.convocados) && data.convocados.length > 0) {
        StorageService.saveConvocados(data.convocados);
      }
      if (Array.isArray(data.rivales) && data.rivales.length > 0) {
        StorageService.saveRivales(data.rivales);
      }
      if (Array.isArray(data.incidencias) && data.incidencias.length > 0) {
        StorageService.saveIncidencias(data.incidencias);
      }
      onProgreso?.('¡Datos descargados con éxito!', 100);
      return {
        ok: true,
        message: 'Datos descargados y sincronizados en tu dispositivo.',
        datos: data
      };
    }
    return {
      ok: false,
      message: res.error || 'No se pudieron descargar los datos desde Google Sheets.'
    };
  }

};
