// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuracion de Playwright para el taller.
 *
 * Lo importante aqui: webServer levanta la Registraduria automaticamente
 * antes de correr las pruebas y la apaga al terminar. Sin esto, el estudiante
 * tendria que acordarse de arrancar el servicio a mano, y olvidarlo es la
 * causa numero uno de "las pruebas fallan y no se por que".
 */
module.exports = defineConfig({
  testDir: './tests',

  // Falla el build si alguien deja un test.only olvidado en un commit.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    // Captura evidencia solo cuando algo falla: util para diagnosticar en CI.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command:
      'java -jar ../registraduria/target/registraduria-1.0-SNAPSHOT.jar',
    url: 'http://localhost:8080/actuator/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
