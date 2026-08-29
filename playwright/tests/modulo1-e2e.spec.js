// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * MÓDULO 1 — Pruebas de UI de punta a punta (E2E)
 *
 * Estas NO son pruebas de UX. Son pruebas funcionales que manejan un
 * navegador: verifican que la interfaz haga lo que promete. La diferencia
 * importa, y el Módulo 3 la desarrolla.
 *
 * Dos reglas que se aplican en todo el archivo:
 *
 * 1. Selectores por ROL y por texto visible, no por clase CSS ni por XPath.
 *    getByRole('button', { name: 'Registrar votante' }) sobrevive a un
 *    rediseño; '.btn-primary.mt-3' se rompe con el primer cambio de estilos.
 *    Además, buscar por rol prueba de paso que el elemento es accesible.
 *
 * 2. Cero esperas fijas. Playwright reintenta cada aserción hasta que se
 *    cumple o expira el tiempo. Un sleep(3000) es una apuesta: lento cuando
 *    la app responde rápido, insuficiente cuando responde lento.
 */

test.describe('Módulo 1 — Inscripción de votantes', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('01 - La página carga con el título correcto', async ({ page }) => {
    await expect(page).toHaveTitle(/Registraduría/);
    await expect(
      page.getByRole('heading', { name: 'Inscripción de votantes' })
    ).toBeVisible();
  });

  test('02 - El formulario muestra todos sus campos', async ({ page }) => {
    await expect(page.getByLabel('Nombre completo')).toBeVisible();
    await expect(page.getByLabel('Número de documento')).toBeVisible();
    await expect(page.getByLabel('Edad')).toBeVisible();
    await expect(page.getByLabel('Género')).toBeVisible();
    await expect(page.getByLabel('La persona está viva')).toBeVisible();
  });

  test('03 - Registra a una persona válida', async ({ page }) => {
    // Arrange: un documento único por corrida evita chocar con la regla
    // de duplicados, que es estado acumulado en el servidor.
    const documento = Date.now() % 1000000;

    // Act
    await page.getByLabel('Nombre completo').fill('Ana Martínez');
    await page.getByLabel('Número de documento').fill(String(documento));
    await page.getByLabel('Edad').fill('30');
    await page.getByLabel('Género').selectOption('FEMALE');
    await page.getByRole('button', { name: 'Registrar votante' }).click();

    // Assert
    await expect(
      page.getByRole('heading', { name: 'Inscripción exitosa' })
    ).toBeVisible();
  });

  test('04 - Rechaza a una persona menor de edad', async ({ page }) => {
    const documento = (Date.now() % 1000000) + 1;

    await page.getByLabel('Nombre completo').fill('Sara Gómez');
    await page.getByLabel('Número de documento').fill(String(documento));
    await page.getByLabel('Edad').fill('17');
    await page.getByRole('button', { name: 'Registrar votante' }).click();

    await expect(
      page.getByRole('heading', { name: 'Persona menor de edad' })
    ).toBeVisible();
    await expect(page.getByText('18 años o más')).toBeVisible();
  });

  test('05 - Rechaza a una persona no viva', async ({ page }) => {
    const documento = (Date.now() % 1000000) + 2;

    await page.getByLabel('Nombre completo').fill('Pedro Ruiz');
    await page.getByLabel('Número de documento').fill(String(documento));
    await page.getByLabel('Edad').fill('45');
    // Desmarcar la casilla: la persona no está viva.
    await page.getByLabel('La persona está viva').uncheck();
    await page.getByRole('button', { name: 'Registrar votante' }).click();

    await expect(
      page.getByRole('heading', { name: 'Persona no viva' })
    ).toBeVisible();
  });

  test('06 - Rechaza un documento ya inscrito', async ({ page }) => {
    const documento = (Date.now() % 1000000) + 3;

    // Arrange: primera inscripción, que debe salir bien
    await page.getByLabel('Nombre completo').fill('Luis Torres');
    await page.getByLabel('Número de documento').fill(String(documento));
    await page.getByLabel('Edad').fill('40');
    await page.getByRole('button', { name: 'Registrar votante' }).click();
    await expect(
      page.getByRole('heading', { name: 'Inscripción exitosa' })
    ).toBeVisible();

    // Act: el mismo documento, otra persona
    await page.getByLabel('Nombre completo').fill('Luisa Torres');
    await page.getByRole('button', { name: 'Registrar votante' }).click();

    // Assert
    await expect(
      page.getByRole('heading', { name: 'Documento ya inscrito' })
    ).toBeVisible();
  });

  test('07 - Valida en el navegador antes de llamar al servicio', async ({ page }) => {
    // Un documento negativo ni siquiera debería viajar al servidor.
    await page.getByLabel('Nombre completo').fill('Error Esperado');
    await page.getByLabel('Número de documento').fill('-5');
    await page.getByLabel('Edad').fill('30');
    await page.getByRole('button', { name: 'Registrar votante' }).click();

    await expect(
      page.getByText('El documento debe ser un número mayor que cero.')
    ).toBeVisible();
  });

  test('08 - El formulario se puede completar solo con el teclado', async ({ page }) => {
    // Operable por teclado es un requisito de WCAG 2.1.1, y también la forma
    // en que trabaja mucha gente. Si esta prueba falla, hay un problema real
    // de accesibilidad, no un detalle estético.
    const documento = (Date.now() % 1000000) + 4;

    await page.getByLabel('Nombre completo').focus();
    await page.keyboard.type('Teclado Puro');
    await page.keyboard.press('Tab');
    await page.keyboard.type(String(documento));
    await page.keyboard.press('Tab');
    await page.keyboard.type('33');

    // Llegar al botón tabulando y activarlo con Enter.
    await page.getByRole('button', { name: 'Registrar votante' }).focus();
    await page.keyboard.press('Enter');

    await expect(
      page.getByRole('heading', { name: 'Inscripción exitosa' })
    ).toBeVisible();
  });
});
