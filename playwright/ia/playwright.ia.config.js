// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuracion SOLO para el experimento E2 (sabotajes). No la use para
 * correr la suite normal: para eso esta playwright.config.js.
 *
 * Diferencias con la configuracion principal, y por que:
 *
 * - No hay webServer. La aplicacion la levanta ia/sabotaje.js en el puerto
 *   8081, detras de un proxy en el 8080 que introduce los sabotajes.
 *
 * - retries: 0. Con reintentos, una prueba que detecta un sabotaje en el
 *   primer intento y "pasa" en el segundo esconderia el hallazgo.
 *
 * - Sin trazas, capturas ni video: el experimento ejecuta la suite siete
 *   veces seguidas y no necesita evidencia de cada fallo, solo el resultado.
 *
 * - Tres proyectos:
 *     referencia -> modulos 1 y 2 del taller, escritos a mano
 *     ia         -> las pruebas que usted genero con IA. sabotaje.js lo
 *                   ejecuta una vez por cada subcarpeta de ia/generadas/,
 *                   pasando la carpeta en la variable IA_DIR.
 *     ejemplo    -> un archivo de muestra con defectos tipicos (ia/ejemplos/)
 */
const path = require('path');
module.exports = defineConfig({
  retries: 0,
  forbidOnly: true,
  reporter: [['json', { outputFile: process.env.IA_JSON || 'ia-resultados.json' }]],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'referencia',
      testDir: '../tests',
      testMatch: ['modulo1-e2e.spec.js', 'modulo2-pom.spec.js'],
    },
    {
      name: 'ia',
      testDir: process.env.IA_DIR ? path.resolve(process.env.IA_DIR) : './generadas',
      testMatch: '**/*.spec.{js,ts}',
    },
    {
      name: 'ejemplo',
      testDir: './ejemplos',
      testMatch: '*.spec.js',
    },
  ],
});
