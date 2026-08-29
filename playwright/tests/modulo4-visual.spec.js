// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * MODULO 4 — Regresion visual
 *
 * Detecta lo que ninguna asercion sobre el DOM ve.
 *
 * Una prueba E2E confirma que el boton EXISTE y que al pulsarlo pasa lo
 * correcto. No se entera de que el boton se salio del contenedor, de que el
 * texto quedo sobre una imagen y no se lee, o de que en movil el formulario
 * se desborda. Para el DOM todo sigue en su sitio; para la persona, la
 * pantalla esta rota.
 *
 * Como funciona: la primera ejecucion guarda una captura de referencia
 * (snapshot). Las siguientes comparan pixel a pixel contra ella y fallan si
 * la diferencia supera el umbral.
 *
 * COMO ACTUALIZAR las referencias cuando el cambio visual es intencional:
 *
 *     npm run visual:update
 *
 * ⚠️ El riesgo del patron: es comodo actualizar las referencias sin mirar el
 * diff, y ahi la prueba deja de proteger. Revise SIEMPRE la imagen de
 * diferencias antes de aceptar una actualizacion.
 *
 * Nota: las capturas dependen del sistema operativo y de las fuentes
 * instaladas. Por eso en CI conviene generarlas dentro del contenedor
 * oficial de Playwright, no en la maquina de cada quien.
 */
test.describe('Modulo 4 — Regresion visual', () => {

  test('01 - El formulario vacio se ve como se espera', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Registrar votante' })).toBeVisible();

    await expect(page).toHaveScreenshot('formulario-vacio.png', {
      fullPage: true,
      // Tolerancia pequeña: absorbe diferencias de antialiasing entre
      // maquinas sin dejar pasar un cambio de layout real.
      maxDiffPixelRatio: 0.02,
    });
  });

  test('02 - El mensaje de rechazo se ve como se espera', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Nombre completo').fill('Sara Gomez');
    await page.getByLabel('Número de documento').fill('777001');
    await page.getByLabel('Edad').fill('17');
    await page.getByRole('button', { name: 'Registrar votante' }).click();
    await expect(page.getByRole('heading', { name: 'Persona menor de edad' })).toBeVisible();

    // Solo el bloque de resultado: acotar la captura la vuelve mucho menos
    // fragil que fotografiar la pagina entera.
    await expect(page.getByRole('status')).toHaveScreenshot('resultado-rechazo.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('03 - El formulario es usable en pantalla de movil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Comprobacion objetiva antes de la visual: la pagina no debe permitir
    // desplazamiento horizontal. Es el sintoma numero uno de un layout roto
    // en movil, y se puede afirmar sin capturas.
    const desbordaHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(desbordaHorizontal).toBe(false);

    await expect(page).toHaveScreenshot('formulario-movil.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
