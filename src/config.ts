/**
 * @file config.ts
 * Configuración global predeterminada de la aplicación.
 *
 * Si pegás tu URL de Google Apps Script en DEFAULT_APPS_SCRIPT_URL,
 * cualquier persona a la que le compartas el link de GitHub Pages
 * (amigos, jugadores, cuerpo técnico) se conectará automáticamente
 * a tu misma base de datos en Google Sheets desde cualquier dispositivo,
 * sin necesidad de configurar nada en sus celulares.
 */

export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLktSEI1FJOGH8FwkqxD2CkwhL-beDHy_uqTSFRSkFQplTf3eO4Dk_gxGIzKAIko-svQ/exec';

/**
 * Contraseñas predeterminadas para modo demostración / offline
 */
export const DEFAULT_DEMO_PASSWORDS = {
  editor: 'dt1234',
  lector: 'hincha11'
};
