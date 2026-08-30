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

  test('09 - La regla de edad imposible vive en DOS capas, y hay que probar las dos', async ({ page, request }) => {
    // Este es el caso que más se escapa en una suite E2E, y merece leerse
    // entero antes de copiarlo.
    //
    // El dominio distingue una edad IMPOSIBLE (menor que 0 o mayor que 120,
    // que devuelve INVALID_AGE) de una edad de MENOR (0 a 17, que devuelve
    // UNDERAGE). Son dos clases de equivalencia distintas.
    //
    // Pero el navegador aplica la MISMA regla antes de enviar. Consecuencia:
    // por la interfaz es imposible provocar un INVALID_AGE. Si solo se prueba
    // por la UI, se concluiría que la regla del servidor no existe o no hace
    // falta — y las dos conclusiones son falsas.

    // Capa 1 — el navegador detiene el caso y NO llama al servicio.
    let huboLlamada = false;
    page.on('request', (r) => {
      if (r.url().includes('/register') && r.method() === 'POST') huboLlamada = true;
    });

    await page.getByLabel('Nombre completo').fill('Edad Imposible');
    await page.getByLabel('Número de documento').fill(String((Date.now() % 1000000) + 9));
    await page.getByLabel('Edad').fill('150');
    await page.getByRole('button', { name: 'Registrar votante' }).click();

    await expect(page.getByText('La edad debe estar entre 0 y 120.')).toBeVisible();
    expect(huboLlamada, 'El navegador no debería haber llamado al servicio').toBe(false);

    // Capa 2 — la API sí es alcanzable sin pasar por el formulario, y ahí la
    // regla del servidor es lo único que protege el dato. Es exactamente lo
    // que hace el taller de pruebas de carga: golpear /register directamente.
    const respuesta = await request.post('/register', {
      data: { name: 'Edad Imposible', id: (Date.now() % 1000000) + 10, age: 150, gender: 'MALE', alive: true },
    });

    expect(respuesta.status()).toBe(200);
    expect((await respuesta.text()).trim()).toBe('INVALID_AGE');
  });
});
