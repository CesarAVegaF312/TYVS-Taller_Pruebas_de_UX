// @ts-check
const { test } = require('@playwright/test');
const { RegistroPage } = require('../pages/RegistroPage');

/**
 * MODULO 2 — Page Object Model
 *
 * Compare estas pruebas con las del modulo 1: dicen lo MISMO, pero se leen
 * como reglas de negocio en vez de como secuencias de clics. Ese es el punto
 * del patron: separar QUE se prueba de COMO se interactua con la pantalla.
 */
test.describe('Modulo 2 — Reglas de inscripcion (con POM)', () => {

  let registro;

  test.beforeEach(async ({ page }) => {
    registro = new RegistroPage(page);
    await registro.abrir();
  });

  test('01 - Una persona adulta y viva queda inscrita', async () => {
    await registro.inscribir({ documento: RegistroPage.documentoUnico(), edad: 30 });
    await registro.esperarResultado('Inscripción exitosa');
  });

  test('02 - Una persona de 17 anios es rechazada', async () => {
    await registro.inscribir({ documento: RegistroPage.documentoUnico(), edad: 17 });
    await registro.esperarResultado('Persona menor de edad');
  });

  test('03 - Una persona de 18 anios queda inscrita (valor limite)', async () => {
    await registro.inscribir({ documento: RegistroPage.documentoUnico(), edad: 18 });
    await registro.esperarResultado('Inscripción exitosa');
  });

  test('04 - Una persona no viva es rechazada', async () => {
    await registro.inscribir({ documento: RegistroPage.documentoUnico(), edad: 40, vivo: false });
    await registro.esperarResultado('Persona no viva');
  });

  test('05 - Un documento repetido es rechazado', async () => {
    const doc = RegistroPage.documentoUnico();

    await registro.inscribir({ documento: doc, nombre: 'Primera Vez' });
    await registro.esperarResultado('Inscripción exitosa');

    await registro.inscribir({ documento: doc, nombre: 'Segunda Vez' });
    await registro.esperarResultado('Documento ya inscrito');
  });
});
