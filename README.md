# Gestión de Partidos — Fútbol 11 Amateur

Aplicación web progresiva ("local-first") para la gestión integral de un equipo de fútbol 11 amateur. Permite administrar el plantel propio, convocar jugadores, registrar rivales, cronometrar partidos con control de tiempo agregado y cargar incidencias en vivo con una botonera táctil mobile-first pensada para el pulgar en cancha. Los datos se sincronizan con **Google Sheets** mediante **Google Apps Script** y la app puede ejecutarse al 100% en **GitHub Pages**.

---

## ⚽ Características Principales

1. **Plantel Permanente**: Alta, baja lógica y edición de jugadores con nombre, número, posición (Arquero, Defensor, Mediocampista, Delantero) y estado activo.
2. **Convocatoria & Rival**:
   - Convocatoria partido a partido con designación de titulares y suplentes.
   - Carga del rival con modo flexible: "Solo Número" o "Nombre + Número".
   - Duración de tiempo configurable (default 40' para ligas amateur).
3. **Partido en Vivo (Mobile-First)**:
   - Cronómetro deportivo gigante con inicio, pausa, reanudación y cambio al 2do tiempo.
   - Sugerencia de **tiempo agregado** (+1, +2, +3, +5 min o manual) al cumplirse el tiempo reglamentario.
   - Marcador en vivo (Goles y Autogoles actualizados automáticamente).
   - Botonera táctil de gran tamaño (>48px): ⚽ Goles / Autogoles, 🟨 Amarillas, 🟥 Rojas directas, 🟨🟨 Dobles amarillas, 🚫 Faltas, 🎯 Tiros, 🎯➡️ Tiros al arco, 🚩 Córners, y 🔄 Sustituciones (salida y entrada en 2 pasos).
   - Selector rápido de jugadores con buscador.
   - Línea de tiempo (timeline) con posibilidad de **deshacer o corregir** cualquier incidencia.
4. **Cálculo Automático de Minutos Jugados**:
   - Calcula exactamente los minutos disputados por cada convocado cruzando titularidad, sustituciones y pitazo final con tiempo agregado.
5. **Estadísticas Acumuladas**:
   - Tabla de jugadores: Partidos jugados, titularidades, minutos totales, goles, asistencias, tarjetas y promedio de minutos.
   - Rendimiento del equipo: Racha, efectividad de remates (Tiros vs Tiros al Arco vs Goles), promedio de goles a favor y en contra.
6. **Arquitectura Local-First (Offline-Ready)**:
   - Todas las incidencias se guardan de inmediato en `localStorage`.
   - Cola de sincronización en segundo plano con reintentos automáticos si se corta la señal en la cancha.
   - Si se recarga o cierra la pestaña, el partido en curso se restaura íntegro desde el borrador local.
7. **Control de Acceso por Contraseña**:
   - **Editor** (default: `dt1234`): Carga y edición de plantel, inicio de partidos, incidencias en vivo y finalización.
   - **Lector** (default: `hincha11`): Consulta de historial, planillas y estadísticas acumuladas.

---

## 📋 Estructura de Google Sheets

El sistema utiliza un único archivo de Google Spreadsheet con las siguientes hojas (tabs):

### 1. `Jugadores`
| id | nombre | numero | posicion | activo | fecha_alta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| jug-01 | Lucas Martínez | 10 | Mediocampista | TRUE | 2026-03-01 |

### 2. `Partidos`
| id | fecha | rival | modo_rival | cancha | condicion | resultado_propio | resultado_rival | agregado_1T | agregado_2T | duracion_tiempo_min | estado | creado_por |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| part-01 | 2026-09-12 | Dep. Central | nombre_numero | Cancha 3 | local | 3 | 1 | 2 | 3 | 40 | finalizado | dt1234 |

### 3. `Convocados`
| id | partido_id | jugador_id | titular |
| :--- | :--- | :--- | :--- |
| c-01 | part-01 | jug-01 | TRUE |

### 4. `RivalesPartido`
| id | partido_id | numero | nombre |
| :--- | :--- | :--- | :--- |
| r-01 | part-01 | 9 | Gómez |

### 5. `Incidencias`
| id | partido_id | tiempo | minuto | segundo | tipo | equipo | jugador_id | jugador_id_secundario | detalle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| inc-01 | part-01 | 1 | 24 | 15 | gol | propio | jug-01 | jug-07 | Gol de cabeza |

### 6. `Config`
| clave | valor |
| :--- | :--- |
| nombre_equipo | Los Halcones FC |

*(Las contraseñas no se guardan en el Sheet, sino en las Propiedades de la secuencia de comandos de Apps Script).*

---

## 🚀 Guía de Instalación y Despliegue

### Paso 1: Crear el Google Sheet
1. Entrá a [Google Sheets](https://sheets.new) y creá una planilla nueva (ej. *"Fútbol 11 Amateur - Base de Datos"*).
2. Podés dejarla vacía con una hoja: el script creará o verificará las hojas y encabezados automáticamente.

### Paso 2: Configurar Google Apps Script
1. Dentro de tu Google Sheet, andá al menú **Extensiones > Apps Script**.
2. Borrá el contenido por defecto de `Código.gs` y pegá el contenido íntegro del archivo `apps-script/Code.gs` provisto en este repositorio.
3. En el panel izquierdo de Apps Script, hacé clic en **Configuración del proyecto** (icono de engranaje ⚙️).
4. En la sección **Propiedades de la secuencia de comandos**, agregá:
   - `PASSWORD_EDITOR`: tu contraseña para el rol de edición (ej. `dt1234`).
   - `PASSWORD_LECTOR`: tu contraseña para el rol de lectura (ej. `hincha11`).
   - `SHEET_ID`: *(opcional si abriste Apps Script desde el Sheet; si lo creaste por fuera, colocá el ID de la URL del Sheet)*.
5. Guardá las propiedades.

### Paso 3: Desplegar la Web App (API REST)
1. En la esquina superior derecha de Apps Script, hacé clic en **Implementar > Nueva implementación**.
2. Hacé clic en el icono de engranaje ⚙️ de "Seleccionar tipo" y elegí **Aplicación web**.
3. Completá:
   - **Descripción**: `API Fútbol 11 v1`
   - **Ejecutar como**: `Yo (tu_email@gmail.com)`
   - **Quién tiene acceso**: `Cualquier usuario` *(indispensable para permitir llamadas CORS desde GitHub Pages o la app web)*.
4. Hacé clic en **Implementar**, otorgá los permisos de Google que te solicite, y **copiá la URL de la aplicación web** generada (termina en `/exec`).

### Paso 4: Configurar la URL en la Aplicación
1. Abrí la aplicación web en el navegador.
2. Andá a la pestaña **Configuración**.
3. Pegá la URL de tu Web App y hacé clic en **Probar Conexión (Ping)**.
4. Una vez conectada, podés hacer clic en **"Inicializar Hojas en Google Sheets"** para crear las 6 tablas con sus encabezados automáticamente.
5. También podés usar la app en **Modo Local (Demo)** sin configurar Google Sheets, ya que incluye persistencia completa en `localStorage` y datos de prueba.

### Paso 5: Desplegar en GitHub Pages
1. Subí este repositorio a tu cuenta de GitHub.
2. En GitHub, andá a **Settings > Pages**.
3. En **Source**, seleccioná la rama `main` (o `gh-pages` tras el build) y la carpeta `/root` o `/dist`.
4. ¡Listo! Tu app estará disponible en `https://<tu-usuario>.github.io/<tu-repo>/`.

---

## 🔒 Consideraciones de Seguridad y Robustez

- **Contraseñas**: Las contraseñas se almacenan en `PropertiesService` de Google Apps Script y nunca se exponen en el código frontend. Al iniciar sesión, la API devuelve un token temporal de 12 horas.
- **Sin pérdida de datos en cancha**: Cualquier gol, tarjeta o cambio queda guardado inmediatamente en el celular. Si la conexión 3G/4G se interrumpe, el icono de estado mostrará las incidencias pendientes y las sincronizará automáticamente apenas regrese la señal.
- **Acceso anónimo controlado**: La Web App está abierta a "Cualquier usuario" para resolver CORS en GitHub Pages, pero Apps Script valida la contraseña y el rol antes de permitir cualquier operación de escritura (`guardarJugador`, `crearPartido`, `guardarIncidencia`, etc.).
