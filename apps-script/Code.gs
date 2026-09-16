/**
 * ======================================================================================
 * Google Apps Script - Backend API para Aplicación de Gestión de Partidos Fútbol 11
 * ======================================================================================
 * Desplegar como: "Web App" (Aplicación web)
 * Ejecutar como: "Yo" (tu cuenta de Google)
 * Quién tiene acceso: "Cualquier usuario" (permite requests desde GitHub Pages)
 *
 * Configuración de Script Properties (Propiedades de la secuencia de comandos):
 * - SHEET_ID: (Opcional si el script está vinculado al Sheet. Si no, ID del Google Sheet)
 * - PASSWORD_EDITOR: Contraseña para rol Editor (ej: dt1234)
 * - PASSWORD_LECTOR: Contraseña para rol Lector (ej: hincha11)
 * ======================================================================================
 */

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SHEET_ID');
  if (sheetId && sheetId.trim() !== '') {
    return SpreadsheetApp.openById(sheetId);
  }
  // Si está vinculado directamente al Sheet (Extensiones > Apps Script):
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    throw new Error('No se encontró el Spreadsheet. Configure la propiedad SHEET_ID en Propiedades de la secuencia de comandos.');
  }
}

/**
 * Helper para responder JSON con soporte CORS
 */
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manejo de peticiones GET (para verificar estado del servicio)
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  if (action === 'ping') {
    return jsonResponse_({
      ok: true,
      data: {
        status: 'online',
        app: 'Fútbol 11 Amateur API',
        timestamp: new Date().toISOString()
      }
    });
  }
  return jsonResponse_({ ok: false, error: 'Método GET no soportado para esta acción. Use POST.' });
}

/**
 * Punto de entrada único para peticiones POST
 */
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = body.action;
    const props = PropertiesService.getScriptProperties();
    const passEditor = props.getProperty('PASSWORD_EDITOR') || 'dt1234';
    const passLector = props.getProperty('PASSWORD_LECTOR') || 'hincha11';

    // 0. Endpoint: PING / TEST CONEXIÓN
    if (action === 'ping') {
      return jsonResponse_({
        ok: true,
        data: {
          status: 'online',
          app: 'Fútbol 11 Amateur API',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 1. Endpoint: LOGIN
    if (action === 'login') {
      const password = (body.password || '').trim();
      if (password === passEditor) {
        return jsonResponse_({
          ok: true,
          data: {
            rol: 'editor',
            token: Utilities.getUuid(),
            expiraEn: Date.now() + 12 * 60 * 60 * 1000 // 12 horas
          }
        });
      } else if (password === passLector) {
        return jsonResponse_({
          ok: true,
          data: {
            rol: 'lector',
            token: Utilities.getUuid(),
            expiraEn: Date.now() + 12 * 60 * 60 * 1000 // 12 horas
          }
        });
      } else {
        return jsonResponse_({ ok: false, error: 'Contraseña incorrecta' });
      }
    }

    // Para cualquier otra acción, validar rol / token simple
    const rol = (body.rol || '').toLowerCase();
    const requiereEditor = [
      'guardarJugador',
      'crearPartido',
      'actualizarPartido',
      'eliminarPartido',
      'guardarIncidencia',
      'eliminarIncidencia',
      'finalizarPartido',
      'inicializarHojas',
      'sincronizarTodo',
      'sincronizarBaseCompleta',
      'guardarConfiguracion',
      'guardarClubConfig',
      'guardarTorneo',
      'eliminarTorneo'
    ].indexOf(action) !== -1;

    if (requiereEditor && rol !== 'editor') {
      return jsonResponse_({ ok: false, error: 'Permisos insuficientes. Se requiere rol Editor.' });
    }

    const ss = getSpreadsheet_();

    // 2. Endpoint: Inicializar Hojas y Encabezados
    if (action === 'inicializarHojas') {
      inicializarEstructura_(ss);
      return jsonResponse_({ ok: true, data: 'Hojas inicializadas con éxito incluyendo estructura de Torneos y Equipo' });
    }

    // 3. Endpoint: Plantel
    if (action === 'getPlantel') {
      const sheet = ss.getSheetByName('Jugadores');
      if (!sheet) return jsonResponse_({ ok: true, data: [] });
      const rows = getSheetObjects_(sheet);
      return jsonResponse_({ ok: true, data: rows });
    }

    if (action === 'guardarJugador') {
      const j = body.jugador;
      if (!j || !j.nombre) return jsonResponse_({ ok: false, error: 'Datos de jugador incompletos' });
      const sheet = getOrCreateSheet_(ss, 'Jugadores', ['id', 'nombre', 'numero', 'posicion', 'activo', 'fecha_alta']);
      const id = j.id || ('jug-' + Utilities.getUuid().substring(0, 8));
      const rowIdx = findRowIndexById_(sheet, id);
      const rowData = [
        id,
        j.nombre,
        j.numero !== undefined ? Number(j.numero) : '',
        j.posicion || 'Mediocampista',
        j.activo !== false ? 'TRUE' : 'FALSE',
        j.fecha_alta || Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd')
      ];

      if (rowIdx > 0) {
        sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
      return jsonResponse_({ ok: true, data: { ...j, id } });
    }

    // 4. Endpoint: Partidos
    if (action === 'getHistorial') {
      const sheet = ss.getSheetByName('Partidos');
      if (!sheet) return jsonResponse_({ ok: true, data: [] });
      const rows = getSheetObjects_(sheet);
      return jsonResponse_({ ok: true, data: rows });
    }

    if (action === 'crearPartido') {
      const p = body.partido;
      const convocados = body.convocados || [];
      const rivales = body.rivales || [];

      if (!p || !p.rival) return jsonResponse_({ ok: false, error: 'Datos de partido incompletos' });

      const sheetPartidos = getOrCreateSheet_(ss, 'Partidos', [
        'id', 'fecha', 'rival', 'modo_rival', 'cancha', 'condicion',
        'resultado_propio', 'resultado_rival', 'agregado_1T', 'agregado_2T',
        'duracion_tiempo_min', 'estado', 'creado_por', 'etiqueta', 'torneo_id', 'torneo_nombre', 'formacion_propia'
      ]);

      const partidoId = p.id || ('part-' + Utilities.getUuid().substring(0, 8));
      const partidoRow = [
        partidoId,
        p.fecha || Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd'),
        p.rival,
        p.modo_rival || 'numero',
        p.cancha || '',
        p.condicion || 'local',
        Number(p.resultado_propio) || 0,
        Number(p.resultado_rival) || 0,
        Number(p.agregado_1T) || 0,
        Number(p.agregado_2T) || 0,
        Number(p.duracion_tiempo_min) || 40,
        p.estado || 'en_curso',
        p.creado_por || 'Editor',
        p.etiqueta || '',
        p.torneo_id || 'torneo-amistoso',
        p.torneo_nombre || 'Amistoso',
        "'" + (p.formacion_propia || '4-3-3')
      ];
      sheetPartidos.appendRow(partidoRow);

      // Guardar Convocados
      if (convocados.length > 0) {
        const sheetConv = getOrCreateSheet_(ss, 'Convocados', ['id', 'partido_id', 'jugador_id', 'titular', 'numero', 'posicion_tactica', 'tactica_x', 'tactica_y']);
        convocados.forEach(c => {
          sheetConv.appendRow([
            c.id || Utilities.getUuid().substring(0, 8),
            partidoId,
            c.jugador_id,
            c.titular ? 'TRUE' : 'FALSE',
            c.numero !== undefined ? Number(c.numero) : '',
            c.posicion_tactica || '',
            c.tactica_x !== undefined ? Number(c.tactica_x) : '',
            c.tactica_y !== undefined ? Number(c.tactica_y) : ''
          ]);
        });
      }

      // Guardar Rivales
      if (rivales.length > 0) {
        const sheetRiv = getOrCreateSheet_(ss, 'RivalesPartido', ['id', 'partido_id', 'numero', 'nombre']);
        rivales.forEach(r => {
          sheetRiv.appendRow([
            r.id || Utilities.getUuid().substring(0, 8),
            partidoId,
            Number(r.numero) || 0,
            r.nombre || ''
          ]);
        });
      }

      return jsonResponse_({ ok: true, data: { id: partidoId } });
    }

    if (action === 'actualizarPartido') {
      const p = body.partido;
      if (!p || !p.id) return jsonResponse_({ ok: false, error: 'Falta partido o partido.id' });

      const sheetPartidos = getOrCreateSheet_(ss, 'Partidos', [
        'id', 'fecha', 'rival', 'modo_rival', 'cancha', 'condicion',
        'resultado_propio', 'resultado_rival', 'agregado_1T', 'agregado_2T',
        'duracion_tiempo_min', 'estado', 'creado_por', 'etiqueta', 'torneo_id', 'torneo_nombre', 'formacion_propia'
      ]);

      const rowIdx = findRowIndexById_(sheetPartidos, p.id);
      const rowData = [
        p.id,
        p.fecha || '',
        p.rival || '',
        p.modo_rival || 'numero',
        p.cancha || '',
        p.condicion || 'local',
        Number(p.resultado_propio) || 0,
        Number(p.resultado_rival) || 0,
        Number(p.agregado_1T) || 0,
        Number(p.agregado_2T) || 0,
        Number(p.duracion_tiempo_min) || 40,
        p.estado || 'finalizado',
        p.creado_por || 'Editor',
        p.etiqueta || '',
        p.torneo_id || 'torneo-amistoso',
        p.torneo_nombre || 'Amistoso',
        "'" + (p.formacion_propia || '4-3-3')
      ];

      if (rowIdx > 0) {
        sheetPartidos.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheetPartidos.appendRow(rowData);
      }

      // Si se envían convocados actualizados, sincronizarlos
      if (body.convocados && Array.isArray(body.convocados)) {
        const sheetConv = getOrCreateSheet_(ss, 'Convocados', ['id', 'partido_id', 'jugador_id', 'titular', 'numero', 'posicion_tactica', 'tactica_x', 'tactica_y']);
        deleteRowsByFieldValue_(sheetConv, 'partido_id', p.id);
        body.convocados.forEach(function(c) {
          sheetConv.appendRow([
            c.id || Utilities.getUuid().substring(0, 8),
            p.id,
            c.jugador_id,
            c.titular ? 'TRUE' : 'FALSE',
            c.numero !== undefined ? Number(c.numero) : '',
            c.posicion_tactica || '',
            c.tactica_x !== undefined ? Number(c.tactica_x) : '',
            c.tactica_y !== undefined ? Number(c.tactica_y) : ''
          ]);
        });
      }

      return jsonResponse_({ ok: true, data: 'Partido actualizado con éxito' });
    }

    if (action === 'getPartido') {
      const partidoId = body.partido_id;
      if (!partidoId) return jsonResponse_({ ok: false, error: 'Falta partido_id' });

      const sheetPartidos = ss.getSheetByName('Partidos');
      const sheetConv = ss.getSheetByName('Convocados');
      const sheetRiv = ss.getSheetByName('RivalesPartido');
      const sheetInc = ss.getSheetByName('Incidencias');

      const partidos = sheetPartidos ? getSheetObjects_(sheetPartidos) : [];
      const partido = partidos.find(item => item.id === partidoId);
      if (!partido) return jsonResponse_({ ok: false, error: 'Partido no encontrado' });

      const todosConvocados = sheetConv ? getSheetObjects_(sheetConv) : [];
      const convocados = todosConvocados.filter(c => c.partido_id === partidoId);

      const todosRivales = sheetRiv ? getSheetObjects_(sheetRiv) : [];
      const rivales = todosRivales.filter(r => r.partido_id === partidoId);

      const todasIncidencias = sheetInc ? getSheetObjects_(sheetInc) : [];
      const incidencias = todasIncidencias.filter(i => i.partido_id === partidoId);

      return jsonResponse_({
        ok: true,
        data: {
          partido,
          convocados,
          rivales,
          incidencias
        }
      });
    }

    // 5. Endpoint: Incidencias
    if (action === 'guardarIncidencia') {
      const inc = body.incidencia;
      if (!inc || !inc.partido_id || !inc.tipo) {
        return jsonResponse_({ ok: false, error: 'Incidencia inválida' });
      }

      const sheetInc = getOrCreateSheet_(ss, 'Incidencias', [
        'id', 'partido_id', 'tiempo', 'minuto', 'segundo', 'tipo',
        'equipo', 'jugador_id', 'jugador_id_secundario', 'detalle'
      ]);

      const incId = inc.id || ('inc-' + Utilities.getUuid().substring(0, 8));
      const rowData = [
        incId,
        inc.partido_id,
        Number(inc.tiempo) || 1,
        Number(inc.minuto) || 0,
        Number(inc.segundo) || 0,
        inc.tipo,
        inc.equipo || 'propio',
        inc.jugador_id || '',
        inc.jugador_id_secundario || '',
        inc.detalle || ''
      ];

      const rowIdx = findRowIndexById_(sheetInc, incId);
      if (rowIdx > 0) {
        sheetInc.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheetInc.appendRow(rowData);
      }

      // Si es un gol, actualizar tanteador en el partido
      actualizarMarcadorPartido_(ss, inc.partido_id);

      return jsonResponse_({ ok: true, data: { ...inc, id: incId } });
    }

    if (action === 'eliminarIncidencia') {
      const incId = body.incidencia_id;
      const partidoId = body.partido_id;
      const sheetInc = ss.getSheetByName('Incidencias');
      if (sheetInc && incId) {
        const rowIdx = findRowIndexById_(sheetInc, incId);
        if (rowIdx > 0) {
          sheetInc.deleteRow(rowIdx);
          if (partidoId) {
            actualizarMarcadorPartido_(ss, partidoId);
          }
          return jsonResponse_({ ok: true, data: 'Incidencia eliminada' });
        }
      }
      return jsonResponse_({ ok: false, error: 'No se encontró la incidencia' });
    }

    if (action === 'finalizarPartido') {
      const pId = body.partido_id;
      const sheetPartidos = ss.getSheetByName('Partidos');
      if (!sheetPartidos) return jsonResponse_({ ok: false, error: 'Hoja de partidos no encontrada' });

      const rowIdx = findRowIndexById_(sheetPartidos, pId);
      if (rowIdx > 0) {
        const headers = sheetPartidos.getRange(1, 1, 1, sheetPartidos.getLastColumn()).getValues()[0];
        const colEstado = headers.indexOf('estado') + 1;
        const colAg1 = headers.indexOf('agregado_1T') + 1;
        const colAg2 = headers.indexOf('agregado_2T') + 1;

        if (colEstado > 0) sheetPartidos.getRange(rowIdx, colEstado).setValue('finalizado');
        if (colAg1 > 0 && body.agregado_1T !== undefined) sheetPartidos.getRange(rowIdx, colAg1).setValue(body.agregado_1T);
        if (colAg2 > 0 && body.agregado_2T !== undefined) sheetPartidos.getRange(rowIdx, colAg2).setValue(body.agregado_2T);

        actualizarMarcadorPartido_(ss, pId);
        return jsonResponse_({ ok: true, data: 'Partido finalizado con éxito' });
      }
      return jsonResponse_({ ok: false, error: 'Partido no encontrado' });
    }

    // Endpoint: ELIMINAR PARTIDO
    if (action === 'eliminarPartido') {
      const pId = body.partido_id || body.id;
      if (!pId) return jsonResponse_({ ok: false, error: 'Falta partido_id' });

      const sheetPartidos = ss.getSheetByName('Partidos');
      if (sheetPartidos) deleteRowById_(sheetPartidos, pId);

      const sheetConv = ss.getSheetByName('Convocados');
      if (sheetConv) deleteRowsByFieldValue_(sheetConv, 'partido_id', pId);

      const sheetRiv = ss.getSheetByName('RivalesPartido');
      if (sheetRiv) deleteRowsByFieldValue_(sheetRiv, 'partido_id', pId);

      const sheetInc = ss.getSheetByName('Incidencias');
      if (sheetInc) deleteRowsByFieldValue_(sheetInc, 'partido_id', pId);

      return jsonResponse_({ ok: true, data: 'Partido y registros asociados eliminados' });
    }

    // Endpoint: GUARDAR CONFIGURACIÓN DEL CLUB (Nombre y colores)
    if (action === 'guardarConfiguracion' || action === 'guardarClubConfig') {
      const conf = body.config || body.clubConfig || {};
      const sheetConf = getOrCreateSheet_(ss, 'Config', ['clave', 'valor']);
      
      const configMap = {
        'nombre_equipo': conf.nombre || 'Los Halcones FC',
        'color_propio': conf.colorPropio || '#3ddc84',
        'color_rival': conf.colorRival || '#e63946',
        'ultima_actualizacion': new Date().toISOString()
      };

      Object.keys(configMap).forEach(function(clave) {
        const rowIdx = findRowIndexByKey_(sheetConf, clave);
        if (rowIdx > 0) {
          sheetConf.getRange(rowIdx, 2).setValue(configMap[clave]);
        } else {
          sheetConf.appendRow([clave, configMap[clave]]);
        }
      });

      return jsonResponse_({ ok: true, data: conf });
    }

    // Endpoint: ELIMINAR TORNEO
    if (action === 'eliminarTorneo') {
      const tId = body.torneo_id || body.id;
      if (!tId) return jsonResponse_({ ok: false, error: 'Falta torneo_id' });
      const sheetTorneos = ss.getSheetByName('Torneos');
      if (sheetTorneos) deleteRowById_(sheetTorneos, tId);
      return jsonResponse_({ ok: true, data: 'Torneo eliminado' });
    }

    // Endpoint: GUARDAR TORNEO
    if (action === 'guardarTorneo') {
      const t = body.torneo;
      if (!t || !t.id) return jsonResponse_({ ok: false, error: 'Falta torneo o torneo.id' });
      const sheetTorneos = getOrCreateSheet_(ss, 'Torneos', ['id', 'nombre', 'tipo', 'anio', 'estado', 'fechaInicio', 'fechaCierre', 'descripcion']);
      const rowData = [
        t.id,
        t.nombre || '',
        t.tipo || 'liga',
        t.anio || new Date().getFullYear(),
        t.estado || 'activo',
        t.fechaInicio || '',
        t.fechaCierre || '',
        t.descripcion || ''
      ];
      const rowIdx = findRowIndexById_(sheetTorneos, t.id);
      if (rowIdx > 0) {
        sheetTorneos.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheetTorneos.appendRow(rowData);
      }
      return jsonResponse_({ ok: true, data: t });
    }

    // Endpoint: OBTENER TORNEOS
    if (action === 'getTorneos') {
      const sheetTorneos = ss.getSheetByName('Torneos');
      return jsonResponse_({ ok: true, data: sheetTorneos ? getSheetObjects_(sheetTorneos) : [] });
    }

    // 6. Endpoint: SINCRONIZACIÓN COMPLETA (Batch / Lote de toda la base local)
    if (action === 'sincronizarTodo' || action === 'sincronizarBaseCompleta') {
      const jugadores = body.jugadores || body.plantel || [];
      const partidos = body.partidos || [];
      const convocados = body.convocados || [];
      const rivales = body.rivales || [];
      const incidencias = body.incidencias || [];
      const torneos = body.torneos || [];

      // Garantizar que existan todas las hojas con sus encabezados
      inicializarEstructura_(ss);

      // 1. Guardar Jugadores
      let countJug = 0;
      if (jugadores.length > 0) {
        const sheetJug = getOrCreateSheet_(ss, 'Jugadores', ['id', 'nombre', 'numero', 'posicion', 'activo', 'fecha_alta']);
        countJug = guardarLoteConId_(sheetJug, jugadores, function(j) {
          return [
            j.id || ('jug-' + Utilities.getUuid().substring(0, 8)),
            j.nombre || '',
            j.numero !== undefined ? Number(j.numero) : '',
            j.posicion || 'Mediocampista',
            j.activo !== false ? 'TRUE' : 'FALSE',
            j.fecha_alta || Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd')
          ];
        });
      }

      // 2. Guardar Partidos (con interceptor de borrado total / estado 0)
      let countPart = 0;
      const sheetPart = getOrCreateSheet_(ss, 'Partidos', [
        'id', 'fecha', 'rival', 'modo_rival', 'cancha', 'condicion',
        'resultado_propio', 'resultado_rival', 'agregado_1T', 'agregado_2T',
        'duracion_tiempo_min', 'estado', 'creado_por', 'etiqueta', 'torneo_id', 'torneo_nombre', 'formacion_propia'
      ]);

      if (Array.isArray(partidos) && partidos.length === 0) {
        // Si el array de partidos viene explícitamente vacío (se eliminó el último partido),
        // limpiamos las filas de datos para no fallar ni dejar partidos huérfanos
        const lastRow = sheetPart.getLastRow();
        const lastCol = sheetPart.getLastColumn();
        if (lastRow > 1 && lastCol > 0) {
          sheetPart.getRange(2, 1, lastRow - 1, lastCol).clearContent();
        }
      } else if (partidos.length > 0) {
        countPart = guardarLoteConId_(sheetPart, partidos, function(p) {
          return [
            p.id || ('part-' + Utilities.getUuid().substring(0, 8)),
            p.fecha || Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd'),
            p.rival || '',
            p.modo_rival || 'numero',
            p.cancha || '',
            p.condicion || 'local',
            Number(p.resultado_propio) || 0,
            Number(p.resultado_rival) || 0,
            Number(p.agregado_1T) || 0,
            Number(p.agregado_2T) || 0,
            Number(p.duracion_tiempo_min) || 40,
            p.estado || 'finalizado',
            p.creado_por || 'Editor',
            p.etiqueta || '',
            p.torneo_id || 'torneo-amistoso',
            p.torneo_nombre || 'Amistoso',
            "'" + (p.formacion_propia || '4-3-3')
          ];
        });
      }

      // 3. Guardar Convocados
      let countConv = 0;
      const sheetConv = getOrCreateSheet_(ss, 'Convocados', ['id', 'partido_id', 'jugador_id', 'titular', 'numero', 'posicion_tactica', 'tactica_x', 'tactica_y']);
      if (Array.isArray(convocados) && convocados.length === 0 && Array.isArray(partidos) && partidos.length === 0) {
        const lastRow = sheetConv.getLastRow();
        const lastCol = sheetConv.getLastColumn();
        if (lastRow > 1 && lastCol > 0) sheetConv.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      } else if (convocados.length > 0) {
        countConv = guardarLoteConId_(sheetConv, convocados, function(c) {
          return [
            c.id || Utilities.getUuid().substring(0, 8),
            c.partido_id || '',
            c.jugador_id || '',
            c.titular ? 'TRUE' : 'FALSE',
            c.numero !== undefined ? Number(c.numero) : '',
            c.posicion_tactica || '',
            c.tactica_x !== undefined ? Number(c.tactica_x) : '',
            c.tactica_y !== undefined ? Number(c.tactica_y) : ''
          ];
        });
      }

      // 4. Guardar Rivales
      let countRiv = 0;
      const sheetRiv = getOrCreateSheet_(ss, 'RivalesPartido', ['id', 'partido_id', 'numero', 'nombre']);
      if (Array.isArray(rivales) && rivales.length === 0 && Array.isArray(partidos) && partidos.length === 0) {
        const lastRow = sheetRiv.getLastRow();
        const lastCol = sheetRiv.getLastColumn();
        if (lastRow > 1 && lastCol > 0) sheetRiv.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      } else if (rivales.length > 0) {
        countRiv = guardarLoteConId_(sheetRiv, rivales, function(r) {
          return [
            r.id || Utilities.getUuid().substring(0, 8),
            r.partido_id || '',
            Number(r.numero) || 0,
            r.nombre || ''
          ];
        });
      }

      // 5. Guardar Incidencias
      let countInc = 0;
      const sheetInc = getOrCreateSheet_(ss, 'Incidencias', [
        'id', 'partido_id', 'tiempo', 'minuto', 'segundo', 'tipo',
        'equipo', 'jugador_id', 'jugador_id_secundario', 'detalle'
      ]);
      if (Array.isArray(incidencias) && incidencias.length === 0 && Array.isArray(partidos) && partidos.length === 0) {
        const lastRow = sheetInc.getLastRow();
        const lastCol = sheetInc.getLastColumn();
        if (lastRow > 1 && lastCol > 0) sheetInc.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      } else if (incidencias.length > 0) {
        countInc = guardarLoteConId_(sheetInc, incidencias, function(inc) {
          return [
            inc.id || Utilities.getUuid().substring(0, 8),
            inc.partido_id || '',
            Number(inc.tiempo) || 1,
            Number(inc.minuto) || 0,
            Number(inc.segundo) || 0,
            inc.tipo || '',
            inc.equipo || 'propio',
            inc.jugador_id || '',
            inc.jugador_id_secundario || '',
            inc.detalle || ''
          ];
        });

        // Actualizar marcadores de partidos que tengan incidencias
        partidos.forEach(function(p) {
          if (p.id) {
            actualizarMarcadorPartido_(ss, p.id);
          }
        });
      }

      // 6. Guardar Torneos
      let countTorneos = 0;
      if (torneos.length > 0) {
        const sheetTorneos = getOrCreateSheet_(ss, 'Torneos', ['id', 'nombre', 'tipo', 'anio', 'estado', 'fechaInicio', 'fechaCierre', 'descripcion']);
        countTorneos = guardarLoteConId_(sheetTorneos, torneos, function(t) {
          return [
            t.id || ('torneo-' + Utilities.getUuid().substring(0, 8)),
            t.nombre || '',
            t.tipo || 'liga',
            t.anio || new Date().getFullYear(),
            t.estado || 'activo',
            t.fechaInicio || t.fecha_creacion || '',
            t.fechaCierre || '',
            t.descripcion || ''
          ];
        });
      }

      // 7. Guardar Configuración si viene en el payload
      const conf = body.config || body.clubConfig;
      if (conf) {
        const sheetConf = getOrCreateSheet_(ss, 'Config', ['clave', 'valor']);
        const configMap = {
          'nombre_equipo': conf.nombre || 'Los Halcones FC',
          'color_propio': conf.colorPropio || '#3ddc84',
          'color_rival': conf.colorRival || '#e63946',
          'ultima_actualizacion': new Date().toISOString()
        };
        Object.keys(configMap).forEach(function(clave) {
          const rowIdx = findRowIndexByKey_(sheetConf, clave);
          if (rowIdx > 0) {
            sheetConf.getRange(rowIdx, 2).setValue(configMap[clave]);
          } else {
            sheetConf.appendRow([clave, configMap[clave]]);
          }
        });
      }

      return jsonResponse_({
        ok: true,
        data: {
          mensaje: '¡Sincronización completa guardada en Google Sheets!',
          jugadores: countJug,
          partidos: countPart,
          convocados: countConv,
          rivales: countRiv,
          incidencias: countInc,
          torneos: countTorneos,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 7. Endpoint: OBTENER TODOS LOS DATOS (Para restaurar/descargar desde Sheets)
    if (action === 'obtenerTodo') {
      const sheetJug = ss.getSheetByName('Jugadores');
      const sheetPart = ss.getSheetByName('Partidos');
      const sheetConv = ss.getSheetByName('Convocados');
      const sheetRiv = ss.getSheetByName('RivalesPartido');
      const sheetInc = ss.getSheetByName('Incidencias');
      const sheetTorneos = ss.getSheetByName('Torneos');
      const sheetConf = ss.getSheetByName('Config');

      let configObj = null;
      if (sheetConf) {
        const rowsConf = getSheetObjects_(sheetConf);
        const mapConf = {};
        rowsConf.forEach(function(r) {
          if (r.clave) mapConf[r.clave] = r.valor;
        });
        if (mapConf['nombre_equipo']) {
          configObj = {
            nombre: mapConf['nombre_equipo'],
            colorPropio: mapConf['color_propio'] || '#3ddc84',
            colorRival: mapConf['color_rival'] || '#e63946'
          };
        }
      }

      return jsonResponse_({
        ok: true,
        data: {
          plantel: sheetJug ? getSheetObjects_(sheetJug) : [],
          partidos: sheetPart ? getSheetObjects_(sheetPart) : [],
          convocados: sheetConv ? getSheetObjects_(sheetConv) : [],
          rivales: sheetRiv ? getSheetObjects_(sheetRiv) : [],
          incidencias: sheetInc ? getSheetObjects_(sheetInc) : [],
          torneos: sheetTorneos ? getSheetObjects_(sheetTorneos) : [],
          configuracion: configObj
        }
      });
    }

    return jsonResponse_({ ok: false, error: 'Acción no reconocida: ' + action });

  } catch (err) {
    return jsonResponse_({ ok: false, error: err.toString() });
  }
}

// --------------------------------------------------------------------------------------
// Helpers internos de Google Sheets
// --------------------------------------------------------------------------------------

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#243d2c').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // Asegurar que la fila 1 contenga siempre la totalidad de los encabezados oficiales actualizados
    const currentCols = sheet.getLastColumn();
    const existingHeaders = currentCols > 0 ? sheet.getRange(1, 1, 1, Math.max(currentCols, headers.length)).getValues()[0] : [];
    let needsUpdate = false;
    for (let i = 0; i < headers.length; i++) {
      if (!existingHeaders[i] || existingHeaders[i].toString().trim() !== headers[i]) {
        needsUpdate = true;
        break;
      }
    }
    if (needsUpdate || currentCols < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#243d2c').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function inicializarEstructura_(ss) {
  getOrCreateSheet_(ss, 'Jugadores', ['id', 'nombre', 'numero', 'posicion', 'activo', 'fecha_alta']);
  getOrCreateSheet_(ss, 'Partidos', [
    'id', 'fecha', 'rival', 'modo_rival', 'cancha', 'condicion',
    'resultado_propio', 'resultado_rival', 'agregado_1T', 'agregado_2T',
    'duracion_tiempo_min', 'estado', 'creado_por', 'etiqueta', 'torneo_id', 'torneo_nombre', 'formacion_propia'
  ]);
  getOrCreateSheet_(ss, 'Convocados', ['id', 'partido_id', 'jugador_id', 'titular', 'numero', 'posicion_tactica', 'tactica_x', 'tactica_y']);
  getOrCreateSheet_(ss, 'RivalesPartido', ['id', 'partido_id', 'numero', 'nombre']);
  getOrCreateSheet_(ss, 'Incidencias', [
    'id', 'partido_id', 'tiempo', 'minuto', 'segundo', 'tipo',
    'equipo', 'jugador_id', 'jugador_id_secundario', 'detalle'
  ]);
  const sheetTorneos = getOrCreateSheet_(ss, 'Torneos', ['id', 'nombre', 'tipo', 'anio', 'estado', 'fechaInicio', 'fechaCierre', 'descripcion']);
  getOrCreateSheet_(ss, 'Config', ['clave', 'valor']);

  // Asegurar que exista al menos el Torneo por defecto "Amistosos"
  if (sheetTorneos.getLastRow() <= 1) {
    sheetTorneos.appendRow([
      'torneo-amistoso',
      'Amistosos',
      'amistoso',
      new Date().getFullYear(),
      'activo',
      new Date().toISOString().split('T')[0],
      '',
      'Torneo predeterminado para partidos amistosos'
    ]);
  }
}

function getSheetObjects_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (typeof val === 'string' && val.indexOf("'") === 0) {
        val = val.substring(1);
      } else if (headers[j] === 'formacion_propia' && (val instanceof Date || (typeof val === 'string' && val.indexOf('2003') !== -1))) {
        val = '4-3-3';
      }
      obj[headers[j]] = val;
    }
    results.push(obj);
  }
  return results;
}

function findRowIndexById_(sheet, id) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return i + 1; // 1-indexed para getRange
    }
  }
  return -1;
}

function actualizarMarcadorPartido_(ss, partidoId) {
  const sheetInc = ss.getSheetByName('Incidencias');
  const sheetPartidos = ss.getSheetByName('Partidos');
  if (!sheetInc || !sheetPartidos) return;

  const incidencias = getSheetObjects_(sheetInc).filter(i => i.partido_id === partidoId);
  let golesPropios = 0;
  let golesRival = 0;

  incidencias.forEach(inc => {
    if (inc.tipo === 'gol') {
      if (inc.equipo === 'propio') golesPropios++;
      else if (inc.equipo === 'rival') golesRival++;
    } else if (inc.tipo === 'autogol') {
      // Autogol propio suma al rival; autogol del rival suma al propio
      if (inc.equipo === 'propio') golesRival++;
      else if (inc.equipo === 'rival') golesPropios++;
    }
  });

  const rowIdx = findRowIndexById_(sheetPartidos, partidoId);
  if (rowIdx > 0) {
    const headers = sheetPartidos.getRange(1, 1, 1, sheetPartidos.getLastColumn()).getValues()[0];
    const colPropio = headers.indexOf('resultado_propio') + 1;
    const colRival = headers.indexOf('resultado_rival') + 1;
    if (colPropio > 0) sheetPartidos.getRange(rowIdx, colPropio).setValue(golesPropios);
    if (colRival > 0) sheetPartidos.getRange(rowIdx, colRival).setValue(golesRival);
  }
}

/**
 * Guarda o actualiza un lote de filas de forma ultra eficiente en Google Sheets.
 * Si la hoja está vacía, inserta todo en un solo setValues().
 * Si ya hay filas, actualiza las existentes por ID y añade en lote las nuevas.
 */
function guardarLoteConId_(sheet, items, mapRowFn) {
  if (!items || items.length === 0) return 0;
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    // Hoja vacía (solo encabezado en fila 1)
    const rows = items.map(mapRowFn);
    if (rows.length > 0 && rows[0].length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    return rows.length;
  }

  // Si ya tiene filas existentes, mapear fila por ID (columna 1)
  const existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function(r) { return String(r[0]); });
  const idToRowMap = {};
  for (var i = 0; i < existingIds.length; i++) {
    if (existingIds[i]) {
      idToRowMap[existingIds[i]] = i + 2; // Fila real en la hoja (1-indexed)
    }
  }

  const toAppend = [];
  var actualizados = 0;

  items.forEach(function(item) {
    const row = mapRowFn(item);
    const id = String(row[0]);
    if (idToRowMap[id]) {
      sheet.getRange(idToRowMap[id], 1, 1, row.length).setValues([row]);
      actualizados++;
    } else {
      toAppend.push(row);
    }
  });

  if (toAppend.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
  }

  return actualizados + toAppend.length;
}

function findRowIndexByKey_(sheet, key) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(key)) {
      return i + 1;
    }
  }
  return -1;
}

function deleteRowById_(sheet, id) {
  const rowIdx = findRowIndexById_(sheet, id);
  if (rowIdx > 0) {
    sheet.deleteRow(rowIdx);
    return true;
  }
  return false;
}

function deleteRowsByFieldValue_(sheet, fieldName, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIdx = headers.indexOf(fieldName) + 1;
  if (colIdx <= 0) return 0;

  const values = sheet.getRange(1, colIdx, lastRow, 1).getValues();
  let deleted = 0;
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(value)) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }
  return deleted;
}
